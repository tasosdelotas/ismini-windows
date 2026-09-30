import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { Agent } from '../agent.js';
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
  assert.match(iss, /^#define AppVersion "5\.0\.1"$/m);
  assert.match(iss, /Source: "memory\.js"; DestDir: "\{app\}"/);
  for (const file of ['agent.js', 'sessions.js', 'memory.js', 'web.js', 'package.json']) {
    assert.ok(existsSync(join(repo, file)), `missing installer source ${file}`);
    assert.match(iss, new RegExp(`Source: "${file.replace('.', '\\.')}"`));
  }
  for (const store of ['sessions.json', 'memory.json']) {
    assert.match(iss, new RegExp(`Name: "\\{app\\}\\\\${store.replace('.', '\\.')}\\.tmp"`));
    assert.match(iss, new RegExp(`Name: "\\{app\\}\\\\${store.replace('.', '\\.')}\\.corrupt-\\*"`));
  }
});

test('release metadata versions stay aligned', () => {
  const packageJson = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  const iss = readFileSync(join(repo, 'ismini.iss'), 'utf8');
  assert.equal(packageJson.version, '5.0.1');
  assert.match(iss, new RegExp(`#define AppVersion "${packageJson.version}"`));
  assert.match(readFileSync(join(repo, 'README.md'), 'utf8'), /Releases\/latest/i);
  assert.ok(existsSync(join(repo, 'LICENSE.txt')));
  assert.match(readFileSync(join(repo, 'README.md'), 'utf8'), /License\]\(LICENSE\.txt\)/);
  assert.match(readFileSync(join(repo, 'CHANGELOG.md'), 'utf8'), /^## v5\.0\.1$/m);
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
});

function readdir(dir) { return readdirSync(dir); }
