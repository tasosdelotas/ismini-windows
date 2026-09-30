import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { Agent } from '../agent.js';
import { MAX_IMAGE_BYTES, modelSupportsVision, validateImageAttachment } from '../image-input.js';
import { MemoryStore } from '../memory.js';
import { SessionStore } from '../sessions.js';

const repo = resolve('.');

test('disabled tools cannot be invoked outside the model tool list', async () => {
  const agent = new Agent({
    baseUrl: 'http://localhost:1234/v1',
    enabledTools: ['read'],
  });
  assert.equal(
    await agent._executeTool('exec', { command: 'touch /tmp/ismini-disabled-tool-test' }),
    'Error: tool is disabled: exec',
  );
});

test('image attachments are restricted to supported formats and a safe size', () => {
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2esAAAAASUVORK5CYII=';
  assert.deepEqual(validateImageAttachment({ name: 'sample.png', dataUrl }), { name: 'sample.png', dataUrl });
  assert.equal(validateImageAttachment(undefined), null);
  assert.throws(() => validateImageAttachment({ dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }), /attach a JPEG/);
  const oversizedData = Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64');
  assert.throws(() => validateImageAttachment({ dataUrl: `data:image/png;base64,${oversizedData}` }), /too large/);
});

test('LM Studio model metadata identifies vision-capable models', () => {
  assert.equal(modelSupportsVision({ type: 'vlm', capabilities: ['tool_use'] }), true);
  assert.equal(modelSupportsVision({ type: 'llm', capabilities: ['tool_use'] }), false);
  assert.equal(modelSupportsVision({ capabilities: ['tool_use'] }), null);
  assert.equal(modelSupportsVision(null), null);
});

test('vision prompt removes legacy refusals from preserved user configs', () => {
  const legacy = 'You lack vision and cannot process image files (.jpg, .png, .webp, .svg, etc.); politely ask for a text description instead and never call read on image files.';
  const caveat = 'When the user attaches an image, analyze its visible content when the current model supports image input. If the model cannot process the image, say so plainly and suggest a vision-capable model; never pretend to have inspected it.';
  const agent = new Agent({
    baseUrl: 'http://localhost:1234/v1',
    systemPrompt: `Assistant instructions. ${legacy} ${caveat}`,
  });
  assert.doesNotMatch(agent._fullSystemPrompt, /You lack vision/);
  assert.doesNotMatch(agent._fullSystemPrompt, /suggest a vision-capable model/);
  const configuredPrompt = JSON.parse(readFileSync(join(repo, 'config.json'), 'utf8')).agent.systemPrompt;
  assert.doesNotMatch(configuredPrompt, /You lack vision/);
  assert.doesNotMatch(configuredPrompt, /suggest a vision-capable model/);
});

test('vision-capable chat requests tell the model to inspect attached image content', async () => {
  const agent = new Agent({ baseUrl: 'http://localhost:1234/v1' });
  agent.supportsVision = true;
  const content = [
    { type: 'text', text: 'Describe this image' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,aGVsbG8=' } },
  ];
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'A picture.' } }] }),
    };
  };
  try {
    await agent._callLM([{ role: 'user', content }], { stream: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(requestBody.messages.find((message) => message.role === 'user').content, content);
  assert.match(requestBody.messages[0].content, /LM Studio reports the loaded model supports vision|inspect it and answer about what is actually visible/i);
  assert.doesNotMatch(requestBody.messages[0].content, /suggest a vision-capable model/);
});

test('known text-only models are told not to guess about attached images', async () => {
  const agent = new Agent({ baseUrl: 'http://localhost:1234/v1' });
  agent.supportsVision = false;
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Use a vision model.' } }] }) };
  };
  try {
    await agent._callLM([{
      role: 'user',
      content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,aGVsbG8=' } }],
    }], { stream: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(requestBody.messages[0].content, /does not support image input/);
});

test('agent does not accumulate duplicate system prompts across turns', async () => {
  const ui = {
    showWarning() {},
    showError() {},
    showModelMessage() {},
    showToolOutput() {},
    _c(_color, text) { return text; },
  };
  const agent = new Agent({ baseUrl: 'http://localhost:1234/v1', ui });
  agent._callLM = async () => ({ choices: [{ message: { content: 'done' } }] });

  const originalWrite = process.stdout.write;
  process.stdout.write = () => true;
  try {
    await agent.run('first');
    await agent.run('second');
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.equal(
    agent.messages.filter((message) => message.role === 'system' && message.content === agent._fullSystemPrompt).length,
    1,
  );
});

test('tool calls without provider IDs keep matching IDs in history and results', async () => {
  const ui = {
    showWarning() {},
    showError() {},
    showModelMessage() {},
    showToolOutput() {},
    _c(_color, text) { return text; },
  };
  const agent = new Agent({
    baseUrl: 'http://localhost:1234/v1',
    enabledTools: ['read'],
    ui,
  });
  let responseCount = 0;
  agent._callLM = async () => {
    responseCount++;
    return responseCount === 1
      ? { choices: [{ message: { tool_calls: [{ function: { name: 'read', arguments: '{}' } }] } }] }
      : { choices: [{ message: { content: 'done' } }] };
  };
  agent._executeTool = async () => 'read result';

  const originalWrite = process.stdout.write;
  process.stdout.write = () => true;
  try {
    await agent.run('read something');
  } finally {
    process.stdout.write = originalWrite;
  }

  const assistant = agent.messages.find((message) => message.role === 'assistant' && message.tool_calls);
  const toolResult = agent.messages.find((message) => message.role === 'tool');
  assert.ok(assistant.tool_calls[0].id);
  assert.equal(toolResult.tool_call_id, assistant.tool_calls[0].id);
});

test('malformed sessions are backed up before the store continues', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ismini-sessions-'));
  try {
    const file = join(dir, 'sessions.json');
    const original = JSON.stringify({ activeId: null, sessions: 'not-an-array' });
    writeFileSync(file, original);

    const store = new SessionStore(dir);

    assert.equal(store.data.sessions.length, 0);
    const backup = readdir(dir).find((name) => name.startsWith('sessions.json.corrupt-'));
    assert.ok(backup);
    assert.equal(readFileSync(join(dir, backup), 'utf8'), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('valid sessions still load and save normally', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ismini-sessions-'));
  try {
    const store = new SessionStore(dir);
    const session = store.create();
    store.saveActive([{ role: 'user', content: 'hello' }]);
    assert.deepEqual(new SessionStore(dir).getActive().messages, [{ role: 'user', content: 'hello' }]);
    assert.equal(session.id, store.getActive().id);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('image messages survive local session save and restore', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ismini-image-session-'));
  const content = [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,aGVsbG8=' } },
  ];
  try {
    const store = new SessionStore(dir);
    store.create();
    store.saveActive([{ role: 'user', content }]);
    assert.deepEqual(new SessionStore(dir).getActive().messages[0].content, content);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('malformed memory records are backed up instead of being silently discarded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ismini-memory-'));
  try {
    const file = join(dir, 'memory.json');
    const original = JSON.stringify({ memories: [{ id: 'broken' }] });
    writeFileSync(file, original);

    const errors = [];
    const originalError = console.error;
    console.error = (message) => errors.push(String(message));
    let store;
    try {
      store = new MemoryStore(dir);
    } finally {
      console.error = originalError;
    }

    assert.equal(store.data.memories.length, 0);
    const backup = readdir(dir).find((name) => name.startsWith('memory.json.corrupt-'));
    assert.ok(backup);
    assert.equal(readFileSync(join(dir, backup), 'utf8'), original);
    assert.match(errors[0], /preserved the original/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('valid memory data still persists, searches, and deletes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ismini-memory-'));
  try {
    const store = new MemoryStore(dir);
    const memory = store.add('Prefers concise answers', 'preference');
    assert.equal(new MemoryStore(dir).search('concise')[0].id, memory.id);
    const longText = 'Prefers concise answers'.repeat(20);
    const longMemory = store.add(longText);
    assert.equal(longMemory.text.length, 300);
    assert.equal(store.add(longText).id, longMemory.id);
    assert.equal(store.search('', -1).length, 1);
    assert.equal(store.delete(memory.id), true);
    assert.equal(store.delete(longMemory.id), true);
    assert.equal(store.search('concise').length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Inno Setup includes runtime dependencies and removes personal data on uninstall', () => {
  const iss = readFileSync(join(repo, 'ismini.iss'), 'utf8');
  assert.match(iss, /^#define AppVersion "6\.0\.4"$/m);
  assert.match(iss, /^SetupIconFile=icons\\ismini-installer\.ico$/m);
  assert.match(iss, /Source: "memory\.js"; DestDir: "\{app\}"/);
  for (const file of ['agent.js', 'sessions.js', 'memory.js', 'image-input.js', 'web.js', 'package.json']) {
    assert.ok(existsSync(join(repo, file)), `missing installer source ${file}`);
    assert.match(iss, new RegExp(`Source: "${file.replace('.', '\\.')}"`));
  }
  for (const store of ['sessions.json', 'memory.json']) {
    assert.match(iss, new RegExp(`Name: "\\{app\\}\\\\${store.replace('.', '\\.')}\\.tmp"`));
    assert.match(iss, new RegExp(`Name: "\\{app\\}\\\\${store.replace('.', '\\.')}\\.corrupt-\\*"`));
  }
  assert.match(iss, /function PrepareToInstall/);
  assert.match(iss, /stop-ismini\.ps1/);
  assert.match(iss, /waituntilterminated/i);
});

test('release metadata versions stay aligned', () => {
  const packageJson = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  const iss = readFileSync(join(repo, 'ismini.iss'), 'utf8');
  assert.equal(packageJson.version, '6.0.4');
  assert.match(iss, new RegExp(`#define AppVersion "${packageJson.version}"`));
  assert.match(readFileSync(join(repo, 'README.md'), 'utf8'), /Releases\/latest/i);
  assert.ok(existsSync(join(repo, 'LICENSE.txt')));
  assert.match(readFileSync(join(repo, 'README.md'), 'utf8'), /License\]\(LICENSE\.txt\)/);
  assert.match(readFileSync(join(repo, 'CHANGELOG.md'), 'utf8'), /^## v6\.0\.4$/m);
});

test('launcher checks its server with built-in Node fetch, not curl', () => {
  const launcher = readFileSync(join(repo, 'ismini.bat'), 'utf8');
  assert.match(launcher, /node -e "fetch\('%URL%'/i);
  assert.doesNotMatch(launcher, /\bcurl\b/i);
});

test('web fetch and web search identify the Windows platform consistently', () => {
  assert.match(readFileSync(join(repo, 'tools', 'web-fetch.js'), 'utf8'), /Windows NT 10\.0/);
  assert.match(readFileSync(join(repo, 'tools', 'web-search.js'), 'utf8'), /Windows NT 10\.0/);
});

test('browser inline scripts parse, and live/resync use the actual rendered state', () => {
  const html = readFileSync(join(repo, 'web', 'index.html'), 'utf8');
  let scripts = 0;
  for (const [index, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    if (!match[1].trim()) continue;
    new vm.Script(match[1], { filename: `web/index.html inline script ${index + 1}` });
    scripts++;
  }
  assert.ok(scripts > 0);
  assert.match(html, /chat\.querySelectorAll\("\.msg\.model \.bubble"\)/);
  assert.match(html, /modelBubbles\[modelBubbles\.length - 1\]/);
  assert.match(html, /reply\.querySelector\("\.who"\)\?\.remove\(\)/);
  assert.match(html, /reply\.querySelector\("\.timestamp"\)\?\.remove\(\)/);
  const resync = html.match(/async function resync\(\)\s*\{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(resync);
  assert.match(resync, /setBusy\(j\.busy === true\)/);
  assert.match(readFileSync(join(repo, 'web.js'), 'utf8'), /sendJson\(res, 200, \{ messages, busy \}\)/);
  assert.match(html, /id="imageBtn"/);
  assert.match(html, /Ismini v__ISMINI_VERSION__/);
  assert.match(readFileSync(join(repo, 'web.js'), 'utf8'), /\.replaceAll\('__ISMINI_VERSION__', APP_VERSION\)/);
  assert.match(html, /image_url: \{ url: image\.dataUrl \}/);
  assert.match(readFileSync(join(repo, 'web.js'), 'utf8'), /validateImageAttachment\(payload\?\.image\)/);
});

function readdir(dir) { return readdirSync(dir); }
