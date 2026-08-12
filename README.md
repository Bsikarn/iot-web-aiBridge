# Ai Bridge — Control Center

A stealth hardware-software integration allowing users to capture images from a calculator-embedded ESP32 camera, process them via a Next.js command center (HQ), and receive AI-generated answers rendered into high-contrast 250x122px LANDSCAPE Base64 PNG E-Ink display pages. Built with a modern **Flat Design System** on canvas background (`#F3F4F6`) featuring pure solid color blocks (`#FFFFFF`, `#3B82F6`, `#10B981`, `#F59E0B`), zero artificial depth (`shadow-none`), geometric **Outfit** typography, vector SVG iconography (no text emojis), front-end PIN access protection, and drag-and-drop Knowledge Base document uploads. A personal project for Sikarn Pattarasirimongkol, focusing on Full-stack and IoT AI integration.

## Tech Stack

### Languages
- TypeScript
- Python (Raspberry Pi W Zero)

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
- Discord Webhook CDN (Free Image Hosting & History)

### Tools & Libraries
- OpenRouter SDK (Gemini, GPT, Claude, DeepSeek, Llama, etc.)

## Active Features

- **Flat Design Dashboard** — Solid color blocks with 8px rounded cards, flat inputs/textareas, scale hover interaction details, clean primary blue action buttons, concise branding title ("AI BRIDGE"), and zero text emojis (all UI elements use SVG vector icons).
- **Dashboard Access PIN Lock Modal** — Front-end PIN security lock (`NEXT_PUBLIC_DASHBOARD_PIN`, fallback `"1234"`) featuring a full-screen dark overlay, masked password input with alphanumeric support, error feedback, pointer-events & scroll locking when unauthenticated, and `sessionStorage` unlock persistence. All hardware API routes remain unaffected.
- **Drag-and-Drop KB Upload Modal** — Interactive file upload modal for Knowledge Base slots with SVG dropzone icon, fallback file picker, strict `.txt` and `.md` file type enforcement (PDF support removed), validation toast alerts, file details preview (File Name, File Size, File Type), and instant text extraction into KB state.
- **Secure Wi-Fi Management UI** — Shows network SSID and password status badges (`Password Saved` / `Open Network`). Allows inputting a new password to overwrite existing settings while completely hiding raw passwords.
- **Authorization Guard & Same-Origin Web Access** — API routes (`/api/ask`, `/api/settings`, `/api/wifi-settings`) enforce strict authorization allowing both hardware board requests (via `x-board-key`) and Same-Origin Web Dashboard requests cleanly without 401 blocks.
- **10 System Prompts Management** — Unified dashboard managing 10 customizable prompt slots (`prompt_index` 1 to 10).
- **10 AI Model Slots** — Unified dashboard managing 10 configurable AI model slots (`ai_index` 1 to 10).
- **Hardware Wi-Fi Management & Sync** — `/api/wifi-settings` API and dashboard UI for managing priority-ordered Wi-Fi networks (SSID, Password, Enterprise Username, Priority ranking) pulled by Raspberry Pi hardware.
- **Universal Multi-Language E-Ink Engine** — Converts AI answers (Thai, English, Numbers & Formatted Math Formulas) into 250x122px landscape high-contrast monochrome Base64 PNG pages using 16px-18px Sarabun TTF font without clipping lines or missing glyphs.
- **Hardware Slot Auto-Discovery** — `/api/settings` provides full command, model, and Wi-Fi slot mappings for hardware displays.
- **3 Knowledge Base Contexts** — Supports multiple `.txt` and `.md` document uploads per slot, extracting and appending context with strict XML context wrapping (`<knowledge_base>` and `<user_input>`).
- **Vercel Global Config Integration** — Blazing fast global storage for configurations, Wi-Fi profiles, and active AI settings.
- **Discord Webhook Image Storage** — Forwards captured images to Discord CDN for free persistent image hosting and history logs.

## Directory Structure

```text
.
├── app
│   ├── api
│   │   ├── ask
│   │   │   └── route.ts ⚠️
│   │   ├── parse
│   │   │   └── route.ts
│   │   ├── settings
│   │   │   └── route.ts ⚠️
│   │   └── wifi-settings
│   │       └── route.ts ⚠️
│   ├── favicon.ico
│   ├── globals.css ⚠️
│   ├── layout.tsx ⚠️
│   └── page.tsx ⚠️
├── docs
│   └── private
│       ├── knowledge_Stealth_AI_Calculator.md ⚠️
│       └── setup_Stealth_AI_Calculator.md ⚠️
├── lib
│   ├── auth.ts ⚠️
│   ├── discord.ts
│   ├── edge-config.ts ⚠️
│   └── pagination-engine.ts ⚠️
├── public
│   └── fonts
│       ├── NotoSansThai-Regular.ttf
│       └── Sarabun-Regular.ttf ⚠️
├── .env ⚠️
├── .env.local ⚠️
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.mjs
├── next.config.ts
├── package-lock.json ⚠️
├── package.json ⚠️
├── postcss.config.mjs
├── README.md ⚠️
└── tsconfig.json
```

## Environment Variables

```env
BOARD_SECRET_KEY=
NEXT_PUBLIC_BOARD_SECRET_KEY=
NEXT_PUBLIC_DASHBOARD_PIN=
OPENROUTER_API_KEY=
DISCORD_WEBHOOK_URL=
GLOBAL_CONFIG= (or EDGE_CONFIG=)
GLOBAL_CONFIG_ID= (or EDGE_CONFIG_ID=)
VERCEL_API_TOKEN= (or GLOBAL_CONFIG_TOKEN=)
```
