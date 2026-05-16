// app/api/ask/route.ts
import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": "https://aicalculate-iot.vercel.app/",
    "X-Title": "AI Calculate IOT HQ",
  }
});

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse("Error: Supabase credentials are missing", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const mode = formData.get('mode') as string;
    const promptIndex = (formData.get('prompt_index') as string) || "1";
    const image = formData.get('image') as File | null;
    const provider = (formData.get('ai_provider') as string) || 'gemini';

    if (mode !== 'reuse' && !image) {
      return new NextResponse("Error: No image received", { status: 400 });
    }

    const config = await prisma.slot.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return new NextResponse("Error: Slot configuration not found", { status: 500 });
    }

    // 🔓 ปลดล็อคแล้ว: ใช้โมเดลตามที่นายตั้งค่าไว้ในหน้าเว็บเป๊ะๆ
    const models = config.models as Record<string, string>;
    const targetModel = models[provider];

    if (!targetModel) {
      return new NextResponse(`Error: No model selected for provider ${provider}`, { status: 400 });
    }

    let publicUrl = "";
    let base64Image = "";
    let mimeType = "image/jpeg";
    let imageUrlPayload: any = {};

    if (mode === 'reuse') {
      const currentHistory = config.history ? JSON.parse(config.history) : [];
      if (currentHistory.length === 0) {
        return new NextResponse("Error: No history available to reuse", { status: 400 });
      }
      publicUrl = currentHistory[currentHistory.length - 1].imageUrl;
      imageUrlPayload = { url: publicUrl };
    } else {
      const arrayBuffer = await image!.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString("base64");
      mimeType = image!.type || "image/jpeg";

      // --- อัปโหลดรูปขึ้น Supabase Storage ---
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('stealth-snaps')
        .upload(filename, arrayBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError.message);
        return new NextResponse(`Storage Error: ${uploadError.message}`, { status: 500 });
      }

      const { data: publicUrlData } = supabase.storage
        .from('stealth-snaps')
        .getPublicUrl(filename);

      publicUrl = publicUrlData.publicUrl;
      imageUrlPayload = { url: `data:${mimeType};base64,${base64Image}` };
    }

    // --- ส่งให้ AI ---
    const promptKey = `prompt${promptIndex}` as keyof typeof config;
    const selectedPrompt = config[promptKey] as string || "";

    const knowledgeBase = config.context ? `[KNOWLEDGE BASE]:\n${config.context}\n\n` : "";
    const instruction = `[USER INSTRUCTION]:\n${selectedPrompt}`;
    const fullPrompt = `${knowledgeBase}${instruction}`;

    const response = await openrouter.chat.completions.create({
      model: targetModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            {
              type: "image_url",
              image_url: imageUrlPayload
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    const aiResult = response.choices[0]?.message?.content || "AI did not return a response.";

    // บันทึกประวัติ
    const currentHistory = config.history ? JSON.parse(config.history) : [];
    currentHistory.push({
      timestamp: new Date().toISOString(),
      imageUrl: publicUrl,
      aiResponse: aiResult,
      provider: provider
    });

    await prisma.slot.update({
      where: { id: config.id },
      data: { history: JSON.stringify(currentHistory) }
    });

    return new NextResponse(aiResult, { status: 200 });

  } catch (error: any) {
    console.error("Critical API Error:", error.message);
    return new NextResponse(`API Error: ${error.message}`, { status: 500 });
  }
}