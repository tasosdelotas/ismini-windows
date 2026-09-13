<p align="center">
  <img src="web/favicon-256.png" alt="ismini" width="96" height="96">
</p>

# ismini — Minimal Local Agent Runtime

A stripped-down local agent runtime. No gateway, no plugins, no cloud, no dependencies. Just a local agent with a minimal web UI that talks to LM Studio and runs tools on your machine.

## What it does

- Sends your messages to LM Studio (local LLM server) — **auto-detects whichever model is loaded** every turn, so you can hot-swap models mid-session and the limits adapt
- Automatically uses tools: read / write / edit / delete files, exec shell commands, web search + fetch
- One live session per run — history lives in memory and dies with the process
- Context window enforcement (default 64k, capped to the loaded model's real context) — approximate via char/token ratios
- **Safe truncation**: the kept window is always anchored at a user message, so long sessions never send a malformed conversation (prevents chat-template 500s on some LLMs)
- Streaming output — typewriter effect as text arrives
- **Pause & Redirect** — mid-loop, hit Pause to interrupt the agent, type a suggestion, and it picks up from where it left off with your correction
- Minimal local web UI — a clean browser chat at `http://127.0.0.1:8787`: no login, no accounts, binds to localhost only
- Connection health check on every request (handles LM Studio restarts mid-session)
- Loop guards: repetition stripping, empty-output hard-stop, per-response and per-run timeouts
- Model-agnostic — works with whatever model is loaded in LM Studio (auto-detected every turn)
- Web tools fully local — DuckDuckGo HTML search + direct fetch + local HTML→text parsing (no third-party readers)

## Requirements

- **Windows 10/11**
- **Node.js 18+** (included in Windows installer)
- **LM Studio** running with a model loaded

## Windows Installer

Download the latest installer from [releases]

The installer:
- Downloads Node.js directly (no Windows installer prompt)
- Creates desktop and Start Menu shortcuts
- Sets up automatic uninstaller

**Uninstall**: Use Windows Settings → Apps, or run `uninstall.bat` in the app folder. Removes everything including config files.

## Memory

**No conversation persistence.** The conversation lives only in memory — **New chat** clears it, and stopping the server ends it. The model does not remember previous runs.

## Controls

| Control | What it does |
|---------|--------------|
| **New chat** button | Clear the conversation (start fresh) |
| **Pause** button | Interrupt the agent mid-loop — type a suggestion to redirect it |
| `Ctrl+C` on the server | Stop ismini |

That's it — the web UI is intentionally minimal.

## Tools

| Tool | Description |
|------|-------------|
| `read` | Read file contents (`path`) |
| `write` | Write/overwrite a file (`path`, `content`) |
| `edit` | Find-and-replace in a file (`path`, `oldText`, `newText`) — replaces ALL occurrences (warns if >5 matches) |
| `delete` | Delete a file (`path`) |
| `exec` | Run shell commands (`command`) — runs as the current user. Dangerous commands (format, diskpart, shutdown, etc.) are blocked |
| `web_search` | Search DuckDuckGo (`query`) — top 3 results fetched locally (in parallel) with extracted text |
| `web_fetch` | Fetch and read a URL (`url`) — local HTML→text parsing; JS shells and anti-bot walls are reported honestly instead of silently failing |

## Admin (elevated commands)

By default, ismini runs commands as your **normal user**. If you need elevated privileges:

> **Right-click the ismini desktop icon → "Run as administrator"**

That's it. All commands will then run with admin privileges for that session.

Note: even with admin, ismini still blocks destructive patterns (`format C:`, `diskpart`, `shutdown /s`, `bcdedit`, etc.).

## Architecture

- `web.js` — Web UI server: local HTTP + SSE streaming, model auto-detection, per-turn health check (binds 127.0.0.1 only)
- `web/index.html` — Browser chat client
- `agent.js` — Core agent loop: prompt → LM Studio → tools → repeat (with streaming), context truncation, loop guards, exec safety
- `tools/web-search.js` — DuckDuckGo HTML parsing + local content fetch (parallel, 25s cap each)
- `tools/web-fetch.js` — Direct fetch + local HTML→text (no third-party readers)
- `config.json` — Configuration (model endpoint, agent, tools)
- `ismini.bat` — Launcher that also opens your browser
- `uninstall.bat` — Stops the hidden server and removes the app

## Why does this exist?

You want a local agent that:

- Talks to your local LLM (LM Studio)
- Can read/write files and run commands
- Has no gateway daemon, no plugins, no cloud — one small web UI, zero dependencies
- Zero npm/external package dependencies — only Node.js built-ins
- Web tools are fully local: DuckDuckGo HTML for search + direct fetch with local HTML→text parsing (no third-party readers)
  - This means web tool output depends on the target sites being reachable
  - For fully offline operation, disable web tools via config: `"tools": { "enabled": ["read", "write", "edit", "exec"] }`
- No cloud dependency — all data stays local

## Design

- One session per run: the whole conversation lives in memory (`agent.messages`) and dies with the process — no IDs, no files, nothing to clean up
- **New chat** clears it mid-run; restart the server for a fresh start
- Context window enforced on every API call — truncated window always anchored at a user message (chat-template safe)
- Model auto-detection every turn — hot-swap models in LM Studio mid-session and limits adapt
- Connection health check before every request
- Zero dependencies — only Node.js built-ins (tested on Node 22)

## Author & License

Developed by **Tasos Delotas** — [tasosdelotas@gmail.com](mailto:tasosdelotas@gmail.com)

Licensed under the [MIT License](LICENSE).
