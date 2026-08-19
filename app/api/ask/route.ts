import { NextResponse } from 'next/server';
import { getAISettings, updateAISettings, HistoryRecord, DEFAULT_AI_SETTING } from '@/lib/edge-config';
import { uploadToDiscordWebhook } from '@/lib/discord';
import { renderEInkPages } from '@/lib/pagination-engine';
import { isAuthorizedBoardRequest } from '@/lib/auth';
import { setTaskState } from '@/lib/redis';
import { after } from 'next/server';
import { waitUntil } from '@vercel/functions';

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
      aiIndexRaw = (formData.get('ai_index') as string) || (formData.get('ai_provider') as string) || '1';
      promptIndexRaw = (formData.get('prompt_index') as string) || '1';
      kbIndexRaw = (formData.get('kb_index') as string) || '1';

      // Check formData.getAll('images') first
      const imagesArray = formData.getAll('images').filter((item): item is File => item instanceof File);
      
      // Also check individual keys image_1, image_2, image_3, image_4 or fallback image
      const individualImages = [
        formData.get('image_1') || formData.get('image'),
        formData.get('image_2'),
        formData.get('image_3'),
        formData.get('image_4')
      ].filter((item): item is File => item instanceof File);

      const targetFiles = imagesArray.length > 0 ? imagesArray.slice(0, 4) : individualImages.slice(0, 4);

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
      aiIndexRaw = String(body.ai_index || body.ai_provider || '1');
      promptIndexRaw = String(body.prompt_index || '1');
      kbIndexRaw = String(body.kb_index || '1');

      if (Array.isArray(body.image_urls)) {
        jsonImageUrls = body.image_urls.slice(0, 4);
      } else if (body.image_url || body.image) {
        jsonImageUrls = [body.image_url || body.image];
      }
    }

    if (mode !== 'reuse' && rawImageFiles.length === 0 && jsonImageUrls.length === 0) {
      return NextResponse.json({ error: "No image file provided in payload" }, { status: 400 });
    }

    // Generate unique Task ID and store initial state in Upstash Redis (TTL 15 mins)
    const taskId = crypto.randomUUID();
    await setTaskState(taskId, { task_id: taskId, status: 'processing', createdAt: Date.now() }, 900);

    const runBackgroundTask = async () => {
      try {
        // Load active settings from Vercel Global/Edge Config
        const settings = await getAISettings();

        // Parse and clamp AI Model index (1 to 10)
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
        const activeModel = settings.models[aiNum - 1] || DEFAULT_AI_SETTING.models[aiNum - 1] || "google/gemini-2.5-flash";

        let imageUrls: string[] = [];

        if (mode === 'reuse') {
          const history = settings.history || [];
          if (history.length === 0) {
            await setTaskState(taskId, { status: "failed", error: "No historical record available to reuse" }, 900);
            return;
          }
          imageUrls = [history[0].imageUrl];
        } else if (rawImageFiles.length > 0) {
          for (let i = 0; i < rawImageFiles.length; i++) {
            const img = rawImageFiles[i];
            const base64DataUrl = `data:${img.type};base64,${Buffer.from(img.arrayBuffer).toString("base64")}`;

            try {
              const uploadedUrl = await uploadToDiscordWebhook(
                img.arrayBuffer,
                img.name || `snap-${Date.now()}-${i + 1}.jpg`,
                img.type
              );
              imageUrls.push(uploadedUrl || base64DataUrl);
            } catch (uploadError: any) {
              console.error(`Discord Webhook upload error for image ${i + 1}:`, uploadError);
              imageUrls.push(base64DataUrl);
            }
          }
        } else {
          imageUrls = jsonImageUrls;
        }

        // Multi-Image System Instruction & Context Wrapping
        const systemInstruction = `System Directive: Analyze the attached sequential image(s) (Pages 1 through 4) and synthesize the information across all images to produce a single concise, comprehensive solution. Use the information inside <knowledge_base> as the PRIMARY and prioritized source of truth. However, if the question or image content is NOT fully covered in the knowledge base, you MUST seamlessly fall back to your general reasoning, broad knowledge, and advanced domain expertise to solve, compute, and answer the problem completely. Never refuse or say 'not found in knowledge base'.

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
          }
        ];

        imageUrls.forEach((url) => {
          userContentBlocks.push({
            type: "image_url",
            image_url: { url: url }
          });
        });

        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aicalculate-iot.vercel.app/",
            "X-Title": "Ai Bridge"
          },
          body: JSON.stringify({
            model: activeModel,
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
            max_tokens: 500
          })
        });

        if (!openRouterRes.ok) {
          const errBody = await openRouterRes.text();
          throw new Error(`OpenRouter API Error (${openRouterRes.status}): ${errBody}`);
        }

        const openRouterData = await openRouterRes.json();
        const aiReply = openRouterData.choices?.[0]?.message?.content || "AI did not return any response.";

        // Render AI text answer to 122x250 Base64 PNG E-Ink pages using pagination engine
        const einkResult = await renderEInkPages(aiReply);
        const primaryImageUrl = imageUrls[0] || "";

        // Record interaction in history (Max 3 records)
        const newRecord: HistoryRecord = {
          timestamp: new Date().toISOString(),
          provider: `Model #${aiNum}`,
          model: activeModel,
          promptIndex: promptNum,
          kbIndex: kbNum,
          aiResponse: aiReply,
          imageUrl: primaryImageUrl
        };

        const updatedHistory = [newRecord, ...(settings.history || [])].slice(0, 3);
        await updateAISettings({
          ...settings,
          history: updatedHistory
        });

        const activeKbStr = activeKb ? `KB #${kbNum} (${activeKb.length} chars)` : `KB #${kbNum} (Empty)`;

        // Update task state in Redis to completed
        await setTaskState(taskId, {
          status: "completed",
          completedAt: Date.now(),
          reply: aiReply,
          active_prompt: activePrompt,
          active_model: activeModel,
          active_kb: activeKbStr,
          image_url: primaryImageUrl,
          image_urls: imageUrls,
          total_images: imageUrls.length,
          total_pages: einkResult.total_pages,
          pages: einkResult.pages
        }, 900);

      } catch (bgError: any) {
        console.error(`Task ${taskId} Background Error:`, bgError);
        await setTaskState(taskId, {
          status: "failed",
          error: bgError.message || "An error occurred during AI processing"
        }, 900);
      }
    };

    // Schedule background task execution via Next.js after() and @vercel/functions waitUntil()
    after(runBackgroundTask);
    waitUntil(runBackgroundTask());

    // IMMEDIATELY Return HTTP 202 Accepted with task_id
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