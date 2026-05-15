# Stealth AI Calculator (HQ)
A "Stealth" hardware-software integration that allows users to capture images from a calculator-embedded camera, process them via a web-based command center (HQ), and receive AI-generated answers based on custom knowledge bases. A personal project for Sikarn Pattarasirimongkol, focusing on IoT and AI integration.

## Tech Stack
### Languages
- TypeScript
- C++ (Arduino/PlatformIO - ESP32)

### Frontend
- Next.js 14 (App Router)
- React
- Tailwind CSS

### Backend & Database
- Node.js API Routes
- Prisma ORM
- PostgreSQL (Supabase)

### Tools
- OpenRouter SDK (Gemini, GPT-4, Claude)
- pdf2json (PDF parsing)

## Active Features
- **3-Slot Configuration** — Three independent presets allowing different System Prompts and AI Models.
- **Advanced Knowledge Base** — Supports uploading multiple `.txt` and `.pdf` files, automatically parsing and appending text to the AI context.
- **Vision-Language Integration** — AI models analyze the hardware-sent image in direct context with uploaded documents.
- **Persistence** — All slot configurations and active states are stored in PostgreSQL via Prisma.

## Directory Structure
```text
.
├── app
│   ├── api
│   │   ├── ask
│   │   │   └── route.ts
│   │   ├── parse
│   │   │   └── route.ts
│   │   └── settings
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── docs
│   └── private
│       ├── knowledge_Stealth_AI_Calculator.md
│       └── setup_Stealth_AI_Calculator.md
├── lib
│   ├── prisma.ts
│   └── store.ts
├── prisma
│   └── schema.prisma
├── public
├── .env ⚠️
├── next.config.mjs
├── package.json
└── tsconfig.json
```

## Environment Variables
```env
OPENROUTER_API_KEY=
DATABASE_URL=
DIRECT_URL=
```
