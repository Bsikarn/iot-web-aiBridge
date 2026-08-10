import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAISettings, updateAISettings, HistoryRecord, DEFAULT_AI_SETTING } from '@/lib/edge-config';
import { uploadToDiscordWebhook } from '@/lib/discord';
import { renderEInkPages } from '@/lib/pagination-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": "https://aicalculate-iot.vercel.app/",
    "X-Title": "Ai Bridge",
  }
});

export async function POST(req: Request) {
  try {
    let mode = 'normal';
    let aiIndexRaw = '1';
    let promptIndexRaw = '1';
    let kbIndexRaw = '1';
    let imageFile: File | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      mode = (formData.get('mode') as string) || 'normal';
      aiIndexRaw = (formData.get('ai_index') as string) || (formData.get('ai_provider') as string) || '1';
      promptIndexRaw = (formData.get('prompt_index') as string) || '1';
      kbIndexRaw = (formData.get('kb_index') as string) || '1';
      imageFile = formData.get('image') as File | null;
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      mode = body.mode || 'normal';
      aiIndexRaw = String(body.ai_index || body.ai_provider || '1');
      promptIndexRaw = String(body.prompt_index || '1');
      kbIndexRaw = String(body.kb_index || '1');
    }

    // Load active settings from Vercel Global/Edge Config
    const settings = await getAISettings();

    // Parse and clamp AI Model index (1 to 10)
    let parsedAiIndex = parseInt(aiIndexRaw, 10);
    if (isNaN(parsedAiIndex)) {
      // Legacy provider string fallback mapping
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

    let imageUrl = "";
    let base64DataUrl = "";

    if (mode === 'reuse') {
      const history = settings.history || [];
      if (history.length === 0) {
        return NextResponse.json({ error: "No historical record available to reuse" }, { status: 400 });
      }
      imageUrl = history[0].imageUrl;
      base64DataUrl = imageUrl;
    } else {
      if (!imageFile) {
        return NextResponse.json({ error: "No image file provided in multipart payload" }, { status: 400 });
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const mimeType = imageFile.type || "image/jpeg";
      const base64Image = Buffer.from(arrayBuffer).toString("base64");
      base64DataUrl = `data:${mimeType};base64,${base64Image}`;

      // Upload image to Discord Webhook and get Discord CDN URL
      try {
        imageUrl = await uploadToDiscordWebhook(
          arrayBuffer,
          imageFile.name || `snap-${Date.now()}.jpg`,
          mimeType
        );
      } catch (uploadError: any) {
        console.error("Discord Webhook upload error:", uploadError);
        imageUrl = base64DataUrl;
      }
    }

    // Enforce Structured Context Wrapping using XML tags and System Instructions
    const systemInstruction = `System Directive: Analyze the attached image and answer the user query concisely. You MUST strictly rely on the information provided inside <knowledge_base> tags to answer the question or solve the problem whenever applicable. Format mathematical equations clearly using LaTeX delimiters ($...$ or $$...$$).`;

    const kbSection = activeKb.trim()
      ? `<knowledge_base>\n${activeKb.trim()}\n</knowledge_base>`
      : `<knowledge_base>\nNo additional context provided.\n</knowledge_base>`;

    const userInputSection = `<user_input>\n[Prompt #${promptNum}]: ${activePrompt.trim()}\n</user_input>`;

    const fullPromptText = `${systemInstruction}\n\n${kbSection}\n\n${userInputSection}`;

    // Send payload to selected AI Model via OpenRouter
    const imagePayloadUrl = base64DataUrl || imageUrl;
    const response = await openrouter.chat.completions.create({
      model: activeModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPromptText },
            {
              type: "image_url",
              image_url: { url: imagePayloadUrl }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const aiReply = response.choices[0]?.message?.content || "AI did not return any response.";

    // Render AI text answer to 122x250 Base64 PNG E-Ink pages using pagination engine
    const einkResult = renderEInkPages(aiReply);

    // Record interaction in history (Max 3 records)
    const newRecord: HistoryRecord = {
      timestamp: new Date().toISOString(),
      provider: `Model #${aiNum}`,
      model: activeModel,
      promptIndex: promptNum,
      kbIndex: kbNum,
      aiResponse: aiReply,
      imageUrl: imageUrl || base64DataUrl
    };

    const updatedHistory = [newRecord, ...(settings.history || [])].slice(0, 3);
    await updateAISettings({
      ...settings,
      history: updatedHistory
    });

    // Return JSON payload to IoT calculator including Base64 PNG E-Ink pages
    return NextResponse.json({
      success: true,
      reply: aiReply,
      active_prompt: activePrompt,
      active_model: activeModel,
      active_kb: activeKb ? `KB #${kbNum} (${activeKb.length} chars)` : `KB #${kbNum} (Empty)`,
      image_url: imageUrl,
      total_pages: einkResult.total_pages,
      pages: einkResult.pages
    }, { status: 200 });

  } catch (error: any) {
    console.error("API /api/ask Critical Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "An error occurred while processing the AI request"
    }, { status: 500 });
  }
}