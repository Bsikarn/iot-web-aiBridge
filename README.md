# 🧠 Embedded AI Hardware for Visual Problem Solving

An end-to-end, low-power Embedded IoT system and Serverless Web Platform designed for visual question answering and mathematical problem solving. A personal project for Sikarn Pattarasirimongkol, a Full-stack Developer focusing on IoT, Software Engineering, and AI integration. The system integrates a portable **Raspberry Pi Zero** hardware unit equipped with a camera and a **2.13" E-Paper Display (EPD)**, communicating with a **Next.js Serverless API** backend powered by **OpenRouter LLMs** with **Prompt Caching** and a **1-bit Canvas Pagination Engine**.
hardware coding git : https://github.com/Bsikarn/iot-board-aiBridge

---

## 🏗️ System Architecture

```text
[ Raspberry Pi Zero W ]
├── OV5647 Camera Module (rpicam-still)
├── Waveshare 2.13" E-Ink (SPI / 250x122 1-bit Partial Refresh)
└── 3-Button Tactile Keypad (U: Up, D: Down, E: Confirm/Back)
│
▼ (HTTPS Multipart POST / JSON)
[ Next.js Serverless Backend (Vercel) ]
├── /api/ask              --> AI Vision Router & LaTeX Canvas Pagination
├── /api/settings         --> 10 Prompts, 3 KBs, 10 Model Mappings
├── /api/wifi-settings    --> Bi-directional Wi-Fi Profile Sync
└── /api/parse            --> Document (.pdf, .txt) Text Extractor
│
▼
[ Cloud Services & LLM Layer ]
├── OpenRouter API        --> Claude 3.5 Sonnet, GPT-4o, Gemini 2.5 (with Ephemeral Prompt Caching)
├── Vercel Storage        --> Persistent Configuration (ai_setting)
└── Discord Webhook CDN   --> Serverless Snapshot Storage & Audit Log
```

---

## 🛠️ Tech Stack

### Languages
- TypeScript
- Python (Raspberry Pi W Zero client)

### Frontend & Design System
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- **Flat Design System**: Pure White `#FFFFFF`, Canvas `#F3F4F6`, Primary Blue `#3B82F6`, Emerald `#10B981`, Amber `#F59E0B`, Zero Box Shadows (`shadow-none`), Scale Hover Transformations (`hover:scale-105`), clean SVG vector icons (no text emojis), **Outfit** typography.

### Backend & Storage
- Next.js API Routes (Serverless Functions)
- Authorization Guard (`x-board-key` header & Same-Origin Web Dashboard via `lib/auth.ts`)
- Universal Node Canvas & Sarabun TTF E-Ink Base64 PNG Engine (`canvas` + `pngjs` + `Sarabun-Regular.ttf`)
- Hardware Wi-Fi Management & Sync Protocol (`/api/wifi-settings`)
- Vercel Global/Edge Config (`@vercel/edge-config`)
- Discord Webhook CDN (Free Image Hosting & Snapshot Audit Log)

### Tools & Libraries
- OpenRouter Native HTTP Fetch API (Claude 3.5, GPT-4o, Gemini 2.5, DeepSeek) with Ephemeral Prompt Caching
- Cloud HTML-to-Image API (`HCTI` / `HTMLCSSTOIMAGE`) & CodeCogs LaTeX API for generating high-contrast 250x122px PNG E-Ink pages with bulletproof fallbacks

---

## ⚡ Active Features

- **Upstash Redis Task Queue & Polling Architecture (`/api/ask` & `/api/status`)** — Powered by `@upstash/redis`, `/api/ask` initializes tasks in Redis, returns `HTTP 202 Accepted` with a unique `task_id`, and delegates processing to background workers via Next.js `after()` and `@vercel/functions` `waitUntil()`. Hardware and web clients poll `GET /api/status?task_id=<id>` for completion, eliminating HTTP request timeouts during long-reasoning AI queries with automatic 15-minute Redis TTL expiry (and graceful memory fallback).
- **Multi-Image Processing (Up to 4 Sequential Images)** — `/api/ask` supports receiving and extracting up to 4 sequential image uploads (`images`, `image_1` through `image_4`, or `image_urls`). Uploads each image to Discord CDN and constructs a sequential multimodal payload for OpenRouter LLMs to synthesize multi-page problem snapshots into a unified solution.
- **Knowledge Base Fallback Logic & Max Execution Timeout (300s)** — Configured `export const maxDuration = 300;` on `/api/ask` for seamless deep-reasoning execution (DeepSeek R1, OpenAI o1). Updated system instructions so that Knowledge Base (`<knowledge_base>`) serves as the primary prioritized source, but automatically falls back to general AI domain reasoning if context is missing—never refusing an answer.
- **Anthropic & OpenRouter Prompt Caching (`cache_control: ephemeral`)** — Integrates native Anthropic and OpenRouter Prompt Caching on System Instructions and Knowledge Base (`<knowledge_base>`) content blocks. Reduces input token costs by up to **90%** and significantly lowers response latency during repeated queries.
- **Flat Design Dashboard** — Solid color blocks with 8px rounded cards, flat inputs/textareas, scale hover interaction details, clean primary blue action buttons, concise branding title ("AI BRIDGE"), and zero text emojis (all UI elements use SVG vector icons).
- **Strict Word Breaking & Thai Character Wrapping** — Enforces `word-break: break-all !important; overflow-wrap: break-word !important; overflow: hidden !important;` within the 250x122px HTML rendering template. Combined with `Intl.Segmenter` zero-width space insertion, Thai script and long strings are strictly forced to wrap character-by-character at the 250px boundary without horizontal overflow.
- **Dashboard Access PIN Lock Modal** — Front-end PIN security lock (`NEXT_PUBLIC_DASHBOARD_PIN`, fallback `"1234"`) featuring a full-screen dark overlay, masked password input with alphanumeric support, error feedback, pointer-events & scroll locking when unauthenticated, and `sessionStorage` unlock persistence. All hardware API routes remain unaffected.
- **Drag-and-Drop KB Upload Modal** — Interactive file upload modal for Knowledge Base slots with SVG dropzone icon, fallback file picker, strict `.txt` and `.md` file type enforcement (PDF support removed), validation toast alerts, file details preview (File Name, File Size, File Type), and instant text extraction into KB state.
- **Secure Wi-Fi Management UI** — Shows network SSID and password status badges (`Password Saved` / `Open Network`). Allows inputting a new password to overwrite existing settings while completely hiding raw passwords.
- **Authorization Guard & Same-Origin Web Access** — API routes (`/api/ask`, `/api/settings`, `/api/wifi-settings`) enforce strict authorization allowing both hardware board requests (via `x-board-key`) and Same-Origin Web Dashboard requests cleanly without 401 blocks.
- **10 System Prompts Management** — Unified dashboard managing 10 customizable prompt slots (`prompt_index` 1 to 10).
- **10 AI Model Slots** — Unified dashboard managing 10 configurable AI model slots (`ai_index` 1 to 10).
- **Hardware Wi-Fi Management & Sync** — `/api/wifi-settings` API and dashboard UI for managing priority-ordered Wi-Fi networks (SSID, Password, Enterprise Username, Priority ranking) pulled by Raspberry Pi hardware.
- **Universal Multi-Language E-Ink Engine** — Converts AI answers (Thai, English, Numbers & Formatted Math Formulas) into 250x122px landscape high-contrast monochrome Base64 PNG pages using 16px-18px Sarabun TTF font without clipping lines or missing glyphs.
- **Hardware Slot & AI Model Auto-Discovery** — `/api/settings` provides full command, model (`models: [{ index, name }]`), and Wi-Fi slot mappings for hardware displays.
- **3 Knowledge Base Contexts** — Supports multiple `.txt` and `.md` document uploads per slot, extracting and appending context with strict XML context wrapping (`<knowledge_base>` and `<user_input>`).
- **Vercel Global Config Integration** — Blazing fast global storage for configurations, Wi-Fi profiles, and active AI settings.
- **Discord Webhook Image Storage** — Forwards captured images to Discord CDN for free persistent image hosting and history logs.

## Directory Structure

```text
aical-hq/
├── app/
│   ├── api/
│   │   ├── ask/
│   │   │   └── route.ts          ⚠️ [CORE API] AI vision router, prompt caching & e-ink pagination
│   │   ├── parse/
│   │   │   └── route.ts          ⚠️ Document text extractor (.txt, .md)
│   │   ├── settings/
│   │   │   └── route.ts          ⚠️ GET/POST configuration & 10 AI models mapping
│   │   └── wifi-settings/
│   │       └── route.ts          ⚠️ Bi-directional Wi-Fi profile sync
│   ├── favicon.ico
│   ├── globals.css               ⚠️ Flat Design System CSS, Outfit typography & crisp borders
│   ├── layout.tsx
│   └── page.tsx                  ⚠️ Unified Control Center Dashboard (UI)
├── docs/
│   └── private/                  ⚠️ Internal documentation (Thai)
├── lib/
│   ├── auth.ts                   ⚠️ Authorization guard (x-board-key & same-origin check)
│   ├── discord.ts                ⚠️ Discord Webhook image hosting & audit logger
│   ├── edge-config.ts            ⚠️ Vercel Global/Edge Config data access layer
│   └── pagination-engine.ts      ⚠️ 250x122px 1-bit E-Ink Canvas & Cloud HTML-to-Image engine
├── public/
│   └── fonts/
│       ├── NotoSansThai-Regular.ttf
│       └── Sarabun-Regular.ttf   ⚠️ Universal Sarabun font covering Thai, English & Math symbols
├── .env.local                    ⚠️ Environment variables & dashboard PIN
├── next.config.mjs               ⚠️ Next.js server external packages config
├── package.json
├── README.md                     ⚠️ Public project documentation (English)
└── tsconfig.json
```

---

## 🔐 Environment Variables

```env
BOARD_SECRET_KEY=your_board_secret_key
NEXT_PUBLIC_BOARD_SECRET_KEY=your_board_secret_key
NEXT_PUBLIC_DASHBOARD_PIN=1234
OPENROUTER_API_KEY=your_openrouter_api_key
DISCORD_WEBHOOK_URL=your_discord_webhook_url
GLOBAL_CONFIG=your_vercel_global_config_connection_string
GLOBAL_CONFIG_ID=your_global_config_id
VERCEL_API_TOKEN=your_vercel_api_token
HCTI_USER_ID=your_hcti_user_id (optional)
HCTI_API_KEY=your_hcti_api_key (optional)
```
