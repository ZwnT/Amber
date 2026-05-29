# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Agent Behavior Constraints (CRITICAL)

- **Communication Style**: Maintain extremely high technical density. Do NOT output any pleasantries, basic concept explanations, or soft-skill/growth-related fluff. Evaluate code and architectural decisions based entirely on hard technical metrics (performance, memory management, protocol adherence).
- **Tool Usage Strategy**: When modifying code, prioritize using your built-in tools (e.g., replacing text or writing to files directly) rather than just printing large Markdown code blocks for the user to copy. 
- **Error Resolution**: If a terminal command (e.g., `npm run build` or `pytest`) fails, analyze the `stderr` and attempt to fix the codebase and retry automatically before pausing to ask for human intervention.
- **Language**: Respond to user prompts in Chinese, but keep code, variables, and commit messages strictly in English.

## Project Overview

Amber (琥珀) is a digital life simulation system — a desktop Electron app that wraps a Next.js frontend and a Python FastAPI backend into an AI companion with persistent personality, emotion, and memory.

## Running the Project

Three components must run simultaneously. **Critical**: `ELECTRON_RUN_AS_NODE` must be unset before starting Electron — Claude Code's environment sets this variable, which causes Electron to skip Chromium initialization and breaks all Electron APIs.

```powershell
# Node.js v22 is required for Electron 36 (installed portable at %USERPROFILE%\node22\)
$env:PATH = "$env:USERPROFILE\node22\node-v22.16.0-win-x64;$env:PATH"

# Terminal 1 — Python backend (port 8000)
cd Amber/amber-engine
python main.py

# Terminal 2 — Next.js dev server (port 3000)
cd Amber/main_ui
npm run dev

# Terminal 3 — Electron desktop window
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$electron = "Amber\main_ui\node_modules\electron\dist\electron.exe"
Set-Location "Amber\main_ui"
& $electron "Amber\main_ui"
```

Do NOT use `npm run electron:dev` — it inherits `ELECTRON_RUN_AS_NODE=1` from the shell and will fail.

## Architecture

```
Amber/
├── amber-engine/        # Python FastAPI backend
│   ├── main.py          # 1500-line monolith: all routes, LLM logic, QQ relay, Janitor
│   ├── database.py      # SQLAlchemy ORM: Persona, Message, PersonaCorpus tables
│   └── config.py        # Paths; detects PyInstaller packaging vs dev
└── main_ui/             # Next.js 16 + Electron 36 desktop app
    ├── app/page.tsx      # Main orchestrator: all state, polling, API calls
    ├── components/amber/ # Domain components (chat, persona list, memory, relay, etc.)
    ├── components/ui/    # shadcn/ui primitives (Radix UI based)
    ├── electron-main.js  # Electron main process: spawns backend, creates BrowserWindow
    ├── preload.js        # IPC bridge for window min/max/close
    └── next.config.mjs   # output:'export' and assetPrefix:'./' only in production
```

### Data Flow

The frontend polls the backend every 3–5 seconds. In dev mode, Electron loads `http://localhost:3000`. In production, it loads from the bundled `out/index.html`.

```
page.tsx  →  fetch http://127.0.0.1:8000/api/*  →  FastAPI  →  SQLite
```

### Backend Core (`amber-engine/main.py`)

**Chat processing** (`handle_chat_internal`): save message → RAG recall from `persona_corpus` (scored by character overlap, 1000-char cap) → build dynamic system prompt (emotion % injected) → `AsyncOpenAI` with exponential backoff retry (2s/4s/6s) → parse mood JSON delta from response → update emotion axes → save reply.

**Emotion system**: Three axes on `Persona` — `happiness`, `anger`, `anxiety` (0–100). Each LLM response includes `{"happiness": Δ, "anger": Δ, "anxiety": Δ}` which updates the axes (clamped to [0,100]).

**Janitor** (`janitor_loop`): asyncio background task, default 5-minute cycle. Performs emotion annealing (happiness→50, anger/anxiety→0), memory incubation (LLM distills recent chat into `persona_corpus`), and weight-based corpus pruning. Pinned entries are immune. Controllable via `POST /api/system/janitor-test-mode`.

**QQ Bot Relay** (`QQBotRelay` class): wraps `botpy` SDK, supports QQ channels, groups, and C2C. Each persona can have its own bot credentials. Deduplicates messages by ID. Reconnects with exponential backoff.

### Frontend State (`app/page.tsx`)

Single `"use client"` component managing all app state. Key polling loops:
- Personas list: on mount + after mutations
- Chat history: on persona select + polling
- System status (emotion axes, stability): periodic polling

## Database Schema

Three SQLite tables in `amber-engine/data/amber_memory.db`:
- **personas** — persona profiles with emotion axes, bot credentials, override settings
- **messages** — chat history with weight, filter flag, pin flag
- **persona_corpus** — long-term memory fragments with weight and pin flag

Schema migrations run on startup via `ADD COLUMN IF NOT EXISTS` checks.

## Packaging

Production build requires three steps:

```bash
# 1. Compile Python backend with PyInstaller
cd amber-engine
pyinstaller --onedir --name amber_core main.py
# Output: amber-engine/dist/amber_core/amber_core.exe

# 2. Build Next.js static export
cd main_ui
npm run build
# Output: main_ui/out/  (uses output:'export' + assetPrefix:'./')

# 3. Package with electron-builder
npm run dist
# Output: main_ui/dist/Amber Setup x.x.x.exe (NSIS installer)
```

`electron-builder` bundles `out/**/*` + `amber_core/` (as extraResource) into an NSIS installer. In packaged mode, `electron-main.js` loads `out/index.html` and spawns `amber_core.exe` instead of calling `python main.py`.

## Key Configuration

- Backend API base URL is hardcoded in `app/page.tsx`: `const API_BASE_URL = "http://127.0.0.1:8000"`
- LLM API key and base URL are stored per-session in frontend settings (not in `.env`)
- `next.config.mjs` applies `output:'export'` and `assetPrefix:'./'` only when `NODE_ENV=production` — do not add these to dev mode or React hydration will fail
- Install path must not contain Chinese characters (breaks PyInstaller/Electron on Windows)
