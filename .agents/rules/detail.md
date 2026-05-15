---
trigger: always_on
---

# Project Blueprint: Stealth AI Calculator (HQ)
**Version:** 2.0 (Full-Stack & Database Ready)
**Objective:** A "Stealth" hardware-software integration that allows users to capture images from a calculator-embedded camera, process them via a web-based command center (HQ), and receive AI-generated answers based on custom knowledge bases.

## 1. System Architecture
### A. Hardware (The Agent)
- **Controller:** ESP32-CAM (AI-Thinker form factor)
- **Camera:** OV2640 Sensor
- **Firmware:** C++ (Arduino/PlatformIO)
- **Functionality:** - Captures JPEG images.
    - Manages UI states (Normal Calculator Mode vs. AI Mode).
    - Communicates with the Web HQ via HTTPS POST (Multipart Form Data).
    - Receives and displays AI text responses on a small display.

### B. Web HQ (The Brain)
- **Framework:** Next.js 14+ (App Router)
- **Backend API:** Node.js / TypeScript
- **Database:** PostgreSQL (Hosted on Supabase/Neon)
- **ORM:** Prisma
- **AI Integration:** OpenRouter SDK (Aggregating Gemini, GPT-4, Claude 3.5, etc.)
- **Deployment:** Vercel

## 2. Core Features
- **3-Slot Configuration:** Three independent presets allowing different System Prompts and AI Models (e.g., Slot 1 for Engineering, Slot 2 for Language).
- **Advanced Knowledge Base:** - Supports multiple `.txt` and `.pdf` file uploads per slot.
    - Automated PDF text extraction using server-side parsers (`pdf2json`).
    - Appends context rather than overwriting, allowing for a large aggregate knowledge base.
- **Vision-Language Integration:** AI models analyze the hardware-sent image in direct context with the uploaded documents.
- **Persistence:** All settings, prompts, and knowledge base contexts are stored in PostgreSQL via Prisma.

## 3. Data Flow (Snap & Ask)
1. **Trigger:** User presses the 'Snap' button on the calculator.
2. **Capture:** ESP32-CAM takes a photo and prepares a `multipart/form-data` request containing the image binary and selected AI provider.
3. **API Processing (`/api/ask`):**
    - The server retrieves the active slot configuration and knowledge base context from PostgreSQL.
    - The server combines the **System Prompt**, **Knowledge Base Text**, and **Hardware Image**.
    - A request is sent to **OpenRouter**.
4. **Response:** The AI response is streamed/returned back to the ESP32 and displayed to the user.

## 4. Current API Endpoints
- `POST /api/ask`: Main endpoint for hardware to submit images and get AI answers.
- `POST /api/parse`: Endpoint for the Web UI to handle multiple PDF/TXT file uploads and text extraction.
- `GET/POST /api/settings`: Handles CRUD operations for Slot configurations and active states.

## 5. Technical Challenges Resolved
- **Turbopack Compatibility:** Fixed build errors by using `require` for legacy CommonJS libraries.
- **Serverless Environments:** Mocked `DOMMatrix` for PDF parsing on Node.js environments lacking browser APIs.
- **Memory Management:** Implemented stream-based/chunked uploads on ESP32 to prevent RAM crashes during image transmission.

## 6. Next Steps for AI Agent
- Finalize the Prisma schema and migrate to Supabase.
- Implement a persistent "Chat History" table in PostgreSQL to enable long-term conversation memory.
- Refine the UI for better document management (File lists, selective deletion).