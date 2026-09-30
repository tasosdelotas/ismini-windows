<p align="center">
  <img src="web/favicon-256.png" alt="ismini" width="96" height="96">
</p>

<p align="center">
  <img src="2.jpeg" alt="ismini in action" width="480">
</p>

# ismini — your personal AI agent, 100% on your own PC

ismini is a small, friendly AI assistant that runs on your computer. It chats with you in your browser, and can read and write files, run commands, and search the web — all powered by a local AI model (LM Studio). Chat history and configuration are stored locally. If you use web search or fetch a page, your search query or page request is sent to DuckDuckGo or that website. Browser speech recognition may also use the browser vendor's service, depending on your browser.

## What it can do

- 💬 **Chat with an AI** in your browser — the AI is a model you run locally in LM Studio
- 📄 **Read, write, edit, and delete files** on your PC
- ⚙️ **Run shell commands** (run as admin for elevated privileges)
- 🔎 **Search the web** and read web pages
- ⏸️ **Pause & redirect** — stop it mid-task and tell it what to do instead
- 🖱️ **File & folder buttons** — click 📄 or 📁 and pick a file from your desktop; its path goes into the chat
- 🎙️ **Dictation** — click the mic and speak your message; speech-to-text via Web Speech API
- 🔊 **Text-to-Speech (TTS)** — ismini reads its replies aloud; pick your preferred voice
- 🎧 **Live Chat** — continuous voice conversation: speak, ismini listens, responds with voice, and immediately listens again
- 📋 **Sessions** — switch between your current and up to 3 archived conversations
- 🎨 **Three themes** — **Papyrus** (an ancient scroll), **Stars** (a twinkling night sky), or **Marble** (black marble) — pick one in the header and ismini remembers your choice
- 🏛️ **Greek meander border** — a classic thunder-pattern frames the left and right edges of the interface

## What you need

- **Windows 10/11** (x64)
- **Node.js 18 or newer**, installed and available on `PATH` (not included in the installer)
- **LM Studio** with a model loaded — download from [lmstudio.ai](https://lmstudio.ai/)
- A **modern browser** (Edge recommended for the best TTS voices, Chrome also works)

## Setup (1 minute)

1. Download the latest **ismini installer** from the [Releases page](https://github.com/tasosdelotas/ismini-windows/releases/latest)
2. Run it and click through the installer
3. An **ismini** icon appears on your desktop. Click it to start.

## Using it

1. Make sure **LM Studio is open** with a model loaded (any model works — ismini detects it automatically)
2. Click the **ismini desktop icon**
3. Your browser opens at `http://127.0.0.1:8787` — just start chatting

**Useful buttons:**

| Button | What it does |
|--------|--------------|
| **New chat** | Archive current session and start fresh |
| **Sessions** | Dropdown to switch between current + 3 archived sessions |
| **📄 / 📁** | Pick a file or folder — its path is inserted into the chat |
| **Pause** | Stop the agent mid-task and redirect it |
| **🎙 Mic** | Toggle dictation — speak your message instead of typing |
| **TTS / Muted** | Toggle text-to-speech — ismini reads replies aloud |
| **Voice select** | Choose which voice ismini speaks with |
| **Live** | Toggle continuous voice conversation mode |
| **Papyrus / Stars / Marble** | Switch the look — ancient scroll, night sky, or black marble |

### Dictation (Speech-to-Text)

Click the **🎙** mic button in the input area. Your microphone activates (red = off, green blinking = listening). Speak your message and it appears as text in the input box. Click the mic again to stop. Works with Chrome and Edge.

### Text-to-Speech (TTS)

Click the **TTS** button to enable. ismini will read its replies aloud using your browser's speech synthesis. Use the voice dropdown to pick a different voice. Click **Muted** to turn it off.

### Live Chat

Click the **Live** button to start a continuous voice conversation. ismini will:
1. Listen to you (mic opens)
2. Think and respond
3. Speak the reply aloud (TTS)
4. Immediately listen again

The Live button shows: **red** (off), **green blinking** (active), **purple** (speaking). Click again to stop.

### Sessions

ismini keeps your current session plus up to 3 archived ones. Click **New chat** to archive the current and start fresh. Click **Sessions** to see the list and switch back to any archived conversation. Sessions are labeled by date and time.

### Memory

ismini can save stable, non-sensitive facts and preferences in a local `memory.json` file. Ask it to remember something; it can search those memories in later conversations and remove them when asked. Never store passwords, API keys, tokens, or other credentials. Memory and session data stay in the app folder and are excluded from the installer source files.

## Admin (elevated commands)

By default, ismini runs commands as your **normal user**. If you need elevated privileges:

> **Right-click the ismini desktop icon → "Run as administrator"**

That's it. All commands will then run with admin privileges for that session.

Note: even with admin, ismini still blocks destructive patterns (`format C:`, `diskpart`, `shutdown /s`, `bcdedit`, etc.).

## Uninstall

Use **Windows Settings → Apps → Ismini Agent → Uninstall**, or run `uninstall.bat` in the app folder. Removes everything including config files. Your LM Studio and your files are untouched.

## Publish a release

From the repository folder, double-click `Publish-to-GitHub.bat` to open an interactive publishing window, or run `powershell -NoProfile -ExecutionPolicy Bypass -File .\publish.ps1` in PowerShell. Publishing requires Git, GitHub CLI (`gh`) signed in, and Inno Setup 6; Node.js is required to run the installed app, not to build the installer. The script prompts for a higher version, builds `Output\ismini-installer-<version>.exe`, asks for confirmation and a commit message, then pushes the commit and tag and uploads the installer to a GitHub Release. The app version in `package.json` and `ismini.iss` must match. Keep `sessions.json` and `memory.json` private; do not add them to a release.

## How it works (the short version)

- One small web server (`web.js`) + one agent loop (`agent.js`) + a browser chat page, with local session and long-term memory stores
- Talks to LM Studio's local API — whatever model you have loaded, it uses
- Zero npm packages
- All visuals are local files (papyrus, starfield, marble, meander border, the Cinzel font) — no CDNs, no internet needed for the UI
- Binds to `127.0.0.1` only — nobody else on the network can reach it
- Dictation, TTS, and Live Chat use the browser's built-in Web Speech API — no extra services

## Author & License

Developed by **Tasos Delotas** — [tasosdelotas@gmail.com](mailto:tasosdelotas@gmail.com)

Licensed under the [MIT License](LICENSE.txt).
