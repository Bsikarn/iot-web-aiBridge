# Ai Bridge

A stealth hardware-software integration allowing users to capture images from a calculator-embedded ESP32 camera, process them via a Next.js command center (HQ), and receive AI-generated answers rendered into high-contrast 250x122px LANDSCAPE Base64 PNG E-Ink display pages. Includes full Wi-Fi profile management and hardware network sync protocol. A personal project for Sikarn Pattarasirimongkol, focusing on Full-stack and IoT AI integration.

## Tech Stack

### Languages
- TypeScript
- Python (Raspberry Pi W Zero)

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS

### Backend & Storage
- Next.js API Routes (Serverless Functions)
- Universal Node Canvas & Sarabun TTF E-Ink Base64 PNG Engine (`canvas` + `pngjs` + `Sarabun-Regular.ttf`)
- Hardware Wi-Fi Management & Sync Protocol (`/api/wifi-settings`)
- Vercel Global/Edge Config (`@vercel/edge-config`)
- Discord Webhook CDN (Free Image Hosting & History)

### Tools
- OpenRouter SDK (Gemini, GPT, Claude, DeepSeek, Llama, etc.)
- pdf2json (Document PDF/TXT Parsing)

## Active Features

- **10 System Prompts Management** — Unified dashboard managing 10 customizable prompt slots (`prompt_index` 1 to 10).
- **10 AI Model Slots** — Unified dashboard managing 10 configurable AI model slots (`ai_index` 1 to 10).
- **Hardware Wi-Fi Management & Sync** — `/api/wifi-settings` API and dashboard UI for managing priority-ordered Wi-Fi networks (SSID, Password, Enterprise Username, Priority ranking) pulled by Raspberry Pi hardware.
- **Universal Multi-Language E-Ink Engine** — Converts AI answers (Thai, English, Numbers & Formatted Math Formulas) into 250x122px landscape high-contrast monochrome Base64 PNG pages using 16px-18px Sarabun TTF font without clipping lines or missing glyphs.
- **Hardware Slot Auto-Discovery** — `/api/settings` provides full command, model, and Wi-Fi slot mappings for hardware displays.
- **3 Knowledge Base Contexts** — Supports multiple `.txt` and `.pdf` document uploads per slot, extracting and appending context with strict XML context wrapping (`<knowledge_base>` and `<user_input>`).
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
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx ⚠️
├── docs
│   └── private
│       ├── knowledge_Stealth_AI_Calculator.md
│       └── setup_Stealth_AI_Calculator.md
├── lib
│   ├── discord.ts
│   ├── edge-config.ts ⚠️
│   └── pagination-engine.ts ⚠️
├── public
│   └── fonts
│       └── Sarabun-Regular.ttf ⚠️
├── .env ⚠️
├── .env.local ⚠️
├── next.config.mjs
├── package.json ⚠️
└── tsconfig.json
```

## Environment Variables

```env
OPENROUTER_API_KEY=
DISCORD_WEBHOOK_URL=
GLOBAL_CONFIG= (or EDGE_CONFIG=)
GLOBAL_CONFIG_ID= (or EDGE_CONFIG_ID=)
VERCEL_API_TOKEN= (or GLOBAL_CONFIG_TOKEN=)
```
