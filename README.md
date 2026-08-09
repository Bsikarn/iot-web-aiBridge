# Stealth AI Calculator (HQ)

A stealth hardware-software integration allowing users to capture images from a calculator-embedded ESP32 camera, process them via a Next.js command center (HQ), and receive AI-generated answers with custom prompts and knowledge bases. A personal project for Sikarn Pattarasirimongkol, focusing on Full-stack and IoT AI integration.

## Tech Stack

### Languages
- TypeScript
- C++ (Arduino/PlatformIO - ESP32)

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS

### Backend & Storage
- Next.js API Routes (Serverless Functions)
- Vercel Edge Config (`@vercel/edge-config`)
- Discord Webhook CDN (Free Image Hosting & History)

### Tools
- OpenRouter SDK (Gemini, GPT, Claude, DeepSeek, Llama, etc.)
- pdf2json (Document PDF/TXT Parsing)

## Active Features

- **10 System Prompts Management** — Unified dashboard managing 10 customizable prompt slots (`prompt_index` 1 to 10).
- **10 AI Model Slots** — Unified dashboard managing 10 configurable AI model slots (`ai_index` 1 to 10).
- **3 Knowledge Base Contexts** — Supports multiple `.txt` and `.pdf` document uploads per slot, extracting and appending context.
- **Vercel Edge Config Integration** — Blazing fast global storage for configurations and active AI settings.
- **Discord Webhook Image Storage** — Forwards captured images to Discord CDN for free persistent image hosting and history logs.
- **Unified Answer History** — Displays the latest 3 AI responses, active model details, and Discord CDN image previews.

## Directory Structure

```text
.
├── app
│   ├── api
│   │   ├── ask
│   │   │   └── route.ts ⚠️
│   │   ├── parse
│   │   │   └── route.ts
│   │   └── settings
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
│   └── edge-config.ts
├── public
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
EDGE_CONFIG=
EDGE_CONFIG_ID=
VERCEL_API_TOKEN=
```
