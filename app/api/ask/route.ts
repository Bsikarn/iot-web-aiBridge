import { NextResponse } from 'next/server';
import { getAISettings, updateAISettings, HistoryRecord, DEFAULT_MODEL_SLOTS } from '@/lib/edge-config';
import { uploadToDiscordWebhook } from '@/lib/discord';
import { renderEInkPages } from '@/lib/pagination-engine';
import { isAuthorizedBoardRequest } from '@/lib/auth';
import { setTaskState } from '@/lib/redis';
import { waitUntil } from '@vercel/functions';
import { createCanvas, loadImage } from 'canvas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    // Secret Header Authorization Check (x-board-key) / Same-Origin Check
    if (!isAuthorizedBoardRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized API Access", status: 401 },
        { status: 401 }
      );
    }

    let mode = 'normal';
    let aiIndexRaw = '1';
    let promptIndexRaw = '1';
    let kbIndexRaw = '1';
    let rawImageFiles: { arrayBuffer: ArrayBuffer; name: string; type: string }[] = [];
    let jsonImageUrls: string[] = [];

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      mode = (formData.get('mode') as string) || 'normal';
      aiIndexRaw = (formData.get('ai_index') as string) || (formData.get('ai_provider') as string) || (formData.get('model_index') as string) || '1';
      promptIndexRaw = (formData.get('prompt_index') as string) || '1';
      kbIndexRaw = (formData.get('kb_index') as string) || '1';

      // Priority 1: Extract images strictly by exact keys image_1 through image_12
      const keyFiles: File[] = [];
      for (let i = 1; i <= 12; i++) {
        const fileObj = formData.get(`image_${i}`);
        if (fileObj instanceof File && fileObj.size > 0) {
          keyFiles.push(fileObj);
        }
      }

      const rawFilesList: File[] = [];

      if (keyFiles.length > 0) {
        rawFilesList.push(...keyFiles);
      } else {
        // Priority 2: formData.getAll('images') or single fallback 'image'
        const allImages = formData.getAll('images').filter((item): item is File => item instanceof File && item.size > 0);
        if (allImages.length > 0) {
          rawFilesList.push(...allImages);
        } else {
          const fallbackImg = formData.get('image');
          if (fallbackImg instanceof File && fallbackImg.size > 0) {
            rawFilesList.push(fallbackImg);
          }
        }
      }

      // Deduplicate identical images by checking name, size, and mime type
      const seenFiles = new Set<string>();
      const uniqueFiles: File[] = [];

      for (const file of rawFilesList) {
        const fileKey = `${file.name}_${file.size}_${file.type}`;
        if (!seenFiles.has(fileKey)) {
          seenFiles.add(fileKey);
          uniqueFiles.push(file);
        }
      }

      const targetFiles = uniqueFiles.slice(0, 12);

      // Convert File objects to ArrayBuffer early before returning 202 response
      for (const file of targetFiles) {
        const buf = await file.arrayBuffer();
        rawImageFiles.push({
          arrayBuffer: buf,
          name: file.name || `snap-${Date.now()}.jpg`,
          type: file.type || 'image/jpeg'
        });
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      mode = body.mode || 'normal';
      aiIndexRaw = String(body.ai_index || body.ai_provider || body.model_index || '1');
      promptIndexRaw = String(body.prompt_index || '1');
      kbIndexRaw = String(body.kb_index || '1');

      if (Array.isArray(body.image_urls)) {
        jsonImageUrls = Array.from(new Set(body.image_urls as string[])).slice(0, 12);
      } else if (body.image_url || body.image) {
        jsonImageUrls = [body.image_url || body.image];
      }
    }

    if (mode !== 'reuse' && rawImageFiles.length === 0 && jsonImageUrls.length === 0) {
      return NextResponse.json({ error: "No image file provided in payload" }, { status: 400 });
    }

    // Generate unique Task ID and store initial state in Upstash Redis (TTL 15 mins)
    const taskId = crypto.randomUUID();
    await setTaskState(taskId, { task_id: taskId, status: 'processing', step: 'received', createdAt: Date.now() }, 900);

    const runBackgroundTask = async () => {
      try {
        // Load active settings from Vercel Global/Edge Config
        const settings = await getAISettings();

        // Parse and clamp AI Model slot index (1 to 10)
        let parsedAiIndex = parseInt(aiIndexRaw, 10);
        if (isNaN(parsedAiIndex)) {
          const lower = aiIndexRaw.toLowerCase();
          if (lower.includes('gpt')) parsedAiIndex = 2;
          else if (lower.includes('claude')) parsedAiIndex = 3;
          else parsedAiIndex = 1;
        }

        const aiNum = Math.max(1, Math.min(10, parsedAiIndex));
        const promptNum = Math.max(1, Math.min(10, parseInt(promptIndexRaw, 10) || 1));
        const kbNum = Math.max(1, Math.min(3, parseInt(kbIndexRaw, 10) || 1));

        const activePrompt = settings.prompts[promptNum - 1] || "";
        const activeKb = settings.kbs[kbNum - 1] || "";

        // Model Slot Configuration (Slot Name, Primary Model, Optional Secondary Model)
        const slot = settings.model_slots?.[aiNum - 1] || DEFAULT_MODEL_SLOTS[aiNum - 1] || DEFAULT_MODEL_SLOTS[0];
        const modelPrimary = slot.model_primary?.trim() || settings.models?.[aiNum - 1] || "google/gemini-2.5-flash";
        const modelSecondary = slot.model_secondary?.trim() || "";
        const slotName = slot.name?.trim() || `Model Slot #${aiNum}`;

        let stitchedImageUrl = "";

        // Step 1: Image Grid Stitching (Full-Resolution 3-Column Grid)
        if (mode === 'reuse') {
          const history = settings.history || [];
          if (history.length === 0) {
            await setTaskState(taskId, { status: "failed", step: "failed", error: "No historical record available to reuse" }, 900);
            return;
          }
          stitchedImageUrl = history[0].imageUrl || "";
        } else if (rawImageFiles.length > 0) {
          // Load each image into Canvas Image
          const loadedImages = await Promise.all(
            rawImageFiles.map(img => loadImage(Buffer.from(img.arrayBuffer)))
          );

          const numImages = loadedImages.length;
          let gridBuffer: Buffer;

          if (numImages === 1) {
            const singleCanvas = createCanvas(loadedImages[0].width, loadedImages[0].height);
            const ctx = singleCanvas.getContext('2d');
            ctx.drawImage(loadedImages[0], 0, 0);
            gridBuffer = singleCanvas.toBuffer('image/jpeg', { quality: 0.9 });
          } else {
            // Fixed 3 Columns Grid Stitching (100% Full Native Resolution)
            const COLS = 3;
            const ROWS = Math.ceil(numImages / COLS);
            const singleW = Math.max(...loadedImages.map(img => img.width));
            const singleH = Math.max(...loadedImages.map(img => img.height));
            const gridWidth = singleW * Math.min(numImages, COLS);
            const gridHeight = singleH * ROWS;

            const gridCanvas = createCanvas(gridWidth, gridHeight);
            const ctx = gridCanvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, gridWidth, gridHeight);

            for (let i = 0; i < numImages; i++) {
              const col = i % COLS;
              const row = Math.floor(i / COLS);
              const x = col * singleW;
              const y = row * singleH;

              ctx.drawImage(loadedImages[i], x, y, singleW, singleH);

              // 2px dark separation border between sub-images (NO text overlay)
              ctx.strokeStyle = '#111827';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, singleW, singleH);
            }

            gridBuffer = gridCanvas.toBuffer('image/jpeg', { quality: 0.9 });
          }

          // Update task progress: grid_done
          await setTaskState(taskId, { status: "processing", step: "grid_done" }, 900);

          try {
            const uploadedUrl = await uploadToDiscordWebhook(
              gridBuffer,
              `grid-${Date.now()}.jpg`,
              'image/jpeg'
            );
            stitchedImageUrl = uploadedUrl || `data:image/jpeg;base64,${gridBuffer.toString("base64")}`;
          } catch (uploadError: any) {
            console.error("Discord Webhook upload error for grid image:", uploadError);
            stitchedImageUrl = `data:image/jpeg;base64,${gridBuffer.toString("base64")}`;
          }
        } else {
          stitchedImageUrl = jsonImageUrls[0] || "";
          await setTaskState(taskId, { status: "processing", step: "grid_done" }, 900);
        }

        // Step 2: OpenRouter AI Execution (Parallel Dual-LLM if configured)
        await setTaskState(taskId, { status: "processing", step: "ai_processing" }, 900);

        const systemInstruction = `System Directive: Analyze the attached image and solve the problem concisely. Use the information inside <knowledge_base> as the PRIMARY and prioritized source of truth. However, if the question or image content is NOT fully covered in the knowledge base, you MUST seamlessly fall back to your general reasoning, broad knowledge, and advanced domain expertise to solve, compute, and answer the problem completely. Never refuse or say 'not found in knowledge base'.

CRITICAL FORMATTING INSTRUCTIONS FOR E-INK HARDWARE DISPLAY:
1. STRICTLY FORBID MATH DELIMITERS FOR SINGLE VARIABLES: Never wrap single variables, letters, numbers, coefficients, or simple terms in dollar signs (do NOT write $x$, $y$, $n$, $a$, or $1$). Always write single variables and plain text identifiers as regular plain text characters (write x, y, n, a normally without any $ or $$ symbols).
2. WRITE STANDARD CLEAN LATEX: Write standard, clean LaTeX without using obscure font macro wrappers like \\mathcal, \\bb, \\mathbb, \\boldsymbol, or custom packages.
3. UNIFORM TYPOGRAPHY: Use standard regular-weight plain text and markdown formatting so all text renders cleanly at a uniform weight on the monochrome E-Ink hardware screen. Only use LaTeX math wrappers ($...$ or $$...$$) for complex multi-term equations.`;

        const kbText = activeKb.trim() ? activeKb.trim() : "No additional context provided.";
        const userPromptText = `[Prompt #${promptNum}]: ${activePrompt.trim()}`;
        const openRouterApiKey = process.env.OPENROUTER_API_KEY || "";

        const userContentBlocks: any[] = [
          {
            type: "text",
            text: `<knowledge_base>\n${kbText}\n</knowledge_base>`,
            cache_control: { type: "ephemeral" }
          },
          {
            type: "text",
            text: `<user_input>\n${userPromptText}\n</user_input>`
          },
          {
            type: "image_url",
            image_url: { url: stitchedImageUrl }
          }
        ];

        const callAI = async (targetModel: string): Promise<string> => {
          const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://aicalculate-iot.vercel.app/",
              "X-Title": "Ai Bridge"
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [
                {
                  role: "system",
                  content: [
                    {
                      type: "text",
                      text: systemInstruction,
                      cache_control: { type: "ephemeral" }
                    }
                  ]
                },
                {
                  role: "user",
                  content: userContentBlocks
                }
              ],
              stream: false
            })
          });

          if (!openRouterRes.ok) {
            const errBody = await openRouterRes.text();
            throw new Error(`OpenRouter API Error for ${targetModel} (${openRouterRes.status}): ${errBody}`);
          }

          const openRouterData = await openRouterRes.json();
          return openRouterData.choices?.[0]?.message?.content || "AI did not return any response.";
        };

        let reply1 = "";
        let reply2 = "";

        if (modelSecondary) {
          // Parallel Dual-LLM Execution
          const [r1, r2] = await Promise.all([
            callAI(modelPrimary),
            callAI(modelSecondary)
          ]);
          reply1 = r1;
          reply2 = r2;
        } else {
          reply1 = await callAI(modelPrimary);
        }

        // Step 3: Sequential 250x122 Canvas Pagination
        const einkResult1 = await renderEInkPages(reply1);
        let allPages = [...einkResult1.pages];
        let fullReplyText = reply1;

        if (reply2) {
          const reply2Formatted = `### [Model 2: ${modelSecondary}]\n${reply2}`;
          const einkResult2 = await renderEInkPages(reply2Formatted);
          allPages = [...allPages, ...einkResult2.pages];
          fullReplyText = `[Model 1: ${modelPrimary}]\n${reply1}\n\n[Model 2: ${modelSecondary}]\n${reply2}`;
        }

        // Record interaction in history (Max 3 records)
        const newRecord: HistoryRecord = {
          timestamp: new Date().toISOString(),
          provider: slotName,
          model: modelSecondary ? `${modelPrimary} + ${modelSecondary}` : modelPrimary,
          promptIndex: promptNum,
          kbIndex: kbNum,
          aiResponse: fullReplyText,
          imageUrl: stitchedImageUrl
        };

        const updatedHistory = [newRecord, ...(settings.history || [])].slice(0, 3);
        await updateAISettings({
          ...settings,
          history: updatedHistory
        });

        const activeKbStr = activeKb ? `KB #${kbNum} (${activeKb.length} chars)` : `KB #${kbNum} (Empty)`;

        // Step 4: Final Redis Update to completed
        await setTaskState(taskId, {
          status: "completed",
          step: "completed",
          completedAt: Date.now(),
          reply: fullReplyText,
          active_prompt: activePrompt,
          active_model: slotName,
          active_kb: activeKbStr,
          image_url: stitchedImageUrl,
          image_urls: [stitchedImageUrl],
          total_images: rawImageFiles.length || jsonImageUrls.length || 1,
          total_pages: allPages.length,
          pages: allPages
        }, 900);

      } catch (bgError: any) {
        console.error(`Task ${taskId} Background Error:`, bgError);
        await setTaskState(taskId, {
          status: "failed",
          step: "failed",
          error: bgError.message || "An error occurred during AI processing"
        }, 900);
      }
    };

    // Schedule background task execution via single waitUntil call
    waitUntil(runBackgroundTask());

    // IMMEDIATELY Return HTTP 202 Accepted with task_id in <1 second
    return NextResponse.json({
      task_id: taskId,
      status: "processing"
    }, { status: 202 });

  } catch (error: any) {
    console.error("API /api/ask Critical Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "An error occurred while initializing the task"
    }, { status: 500 });
  }
}