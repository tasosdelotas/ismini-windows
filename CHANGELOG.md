# Changelog

All notable changes to ismini (Windows) are documented here.

## v5.0.1

### Added
- 🧠 **Local long-term memory** — `memory.json` store with `memory_add`, `memory_search`, and `memory_delete` tools, enabled by default.
- Memory guidance discourages storing passwords, API keys, tokens, and other credentials.
- Publishing builds the versioned Windows installer and uploads it with the GitHub Release.

### Changed
- Session, transcript, and status APIs expose only user-visible messages; internal loop-control prompts are excluded from displayed and saved chat history.
- Malformed session files are preserved as `.corrupt-*` backups instead of being replaced silently.
- Malformed memory files are backed up and reported before the app starts with empty memory.

### Fixed
- Bundled `memory.js` in the Inno Setup installer and remove local memory data/backups on uninstall.
- Launcher server checks use Node.js `fetch` instead of requiring `curl`, and report a failed startup instead of opening the browser as if the server were ready.
- Enforced the configured tool allowlist when executing tool calls and kept assistant/tool IDs paired when a provider omits a call ID.
- Prevented system-prompt copies from accumulating in the in-memory conversation after each user turn.
- Transcript resync now retains the server's busy state; Live mode now selects the rendered assistant bubble for TTS.
- Ignore temporary and corrupt session/memory files so personal data is not swept into a publish commit.
- Updated web-fetch's user-agent to identify the Windows build consistently with web search.

## v4.0.0

### Added
- 🏛️ **Greek meander border** — classic thunder-pattern frames the left and right edges of the interface (fixed, stays in place while scrolling)
- 🖼️ **ismini 3D banner** — 3D rendered logo in the header
- ✨ **"Cogito, ergo sum"** — welcome screen greeting
- 🌗 **Faded meander edges** — calmer (25% alpha) Greek meander border on the dark themes (Stars, Marble) and Papyrus, replacing the harsh full-strength gold. New `/meander-faded.png` endpoint + asset.

### Changed
- **Elevated commands** — removed all `sudo` references (Windows has no sudo). ismini runs as your normal user; to run elevated commands, launch it as administrator. The `/api/sudo` endpoints, the `sudo` exec argument, and the Linux sudo-handling code are gone.

### Fixed
- **web_search** — switched to a POST to DuckDuckGo (dodges CAPTCHA) and cleaned up title/entity parsing + error handling
- **web_fetch** — cleaner HTML→text extraction (better `htmlToText` / `looksLikeShell`)
- **Pause** — abort check at the top of the run loop so `pause()` exits immediately instead of finishing the in-flight turn
- **Session switch** — `enabledTools` now resets when loading a saved session, so a tool disabled by a failure in one session doesn't stay disabled in the next
- **`delete` tool** — relative paths now resolve from the user's home directory (matching read/write/edit) instead of being passed raw to `unlinkSync`
- **web_search user-agent** — now identifies as Windows (was sending a Linux UA from a Windows build)
- **Installer** — `package.json` and `README.md` are now bundled (both were missing from the `[Files]` section, so the installed app failed to start and the Start Menu "README" shortcut pointed at a missing file)
- **Restored `package.json`** (`"type": "module"`) — was missing after an accidental deletion; without it Node treated `.js` as CommonJS and the app failed to start
- **Pause button behavior** — fixed pause/redirect flow
- **Blank area at bottom** — removed footer gradient that was painting over the theme background (present since v2)
- **File & folder picker** — now works on Windows via PowerShell `System.Windows.Forms` (was Linux-only `zenity`/`kdialog`, broken on Windows)
- **Launcher** — requires Node.js on `PATH`; Node.js is not bundled with the installer
- **300s timeout** — now aborts the in-flight model stream (previously the request kept running in the background, and late output could bleed into the next turn)
- **Non-streaming JSON response** — now displayed in the UI (previously invisible until transcript reload)
- **STT / Live mode** — `no-speech` errors no longer stop microphone listening while Live mode is active
- **Edit tool** — rejects empty `oldText` (previously could insert text between every character in a file)
- **Uninstall** — `uninstall.bat` now only kills node processes belonging to this install (previously could terminate unrelated Node servers)
- **Installer upgrades** — preserve an existing `config.json` and exclude private session history from the installer
- **Uninstaller** — stop the app and child processes, remove shortcuts, and clean up session data
- **Launcher** — require Node.js 18 or newer and report incompatible or missing runtimes
- **Local web API** — reject cross-origin requests, prevent overlapping turns/new chats, and return HTTP 413 for oversized requests
- **Web tools** — cap downloaded response bodies to 2 MB
- **Session recovery** — preserve malformed session data in a backup instead of silently discarding it
- **Agent** — clear completed model response timers and perform edit replacements even when more than five matches are found
- **Privacy and prerequisites** — document Node.js, web-request, and browser speech-recognition requirements and data flows accurately

## v3.0.0 (2026-08)

### Added
- 🎙️ **Dictation** — speech-to-text via Web Speech API
- 🔊 **Text-to-Speech (TTS)** — ismini reads replies aloud with voice selection
- 🎧 **Live Chat** — continuous voice conversation mode
- 🧠 **Memory** — persistent facts across sessions
- 📋 **Sessions** — current + 3 archived conversations
- 🎨 **Three themes** — Papyrus, Stars, Marble
- Admin mode (run as administrator for elevated commands)

### Changed
- Single in-memory session (session IDs removed)
- Web tools: soft nudge instead of permanent tool removal
- System prompt trimmed for efficiency

### Fixed
- Web tools no longer vanish mid-session
- exec blocks curl/wget (use web_search/web_fetch instead)
- Connection health check verifies model is loaded
- Tool path resolution from ismini's own directory
- Edit tool: replace ALL occurrences + warns on >5 matches
- Session restore and persistence safety

## v2.x

### Added
- Three themes (Papyrus, Stars, Marble)
- File picker button
- Web search & fetch tools

## v1.0.0

- Initial release — ismini for Windows 10/11
