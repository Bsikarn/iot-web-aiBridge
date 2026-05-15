// app/api/ask/route.ts
import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// ตั้งค่า OpenRouter ให้พร้อมรบ
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
    const image = formData.get('image') as File;
    const provider = (formData.get('ai_provider') as string) || 'gemini';

    if (!image) {
      return new NextResponse("Error: No image received", { status: 400 });
    }

    const config = await prisma.slot.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return new NextResponse("Error: Slot configuration not found", { status: 500 });
    }

    const models = config.models as Record<string, string>;
    const targetModel = models[provider] || "openrouter/free";

    // 💡 สร้าง Buffer ตรงนี้เลย จะได้ใช้ทั้งส่งให้ AI และส่งเข้า Supabase
    const arrayBuffer = await image.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const base64Image = fileBuffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    // --- อัปโหลดรูปขึ้น Supabase Storage ---
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    // 💡 แก้ไขแล้ว: โยน 'fileBuffer' เข้าไปแทน 'image' เพื่อแก้ปัญหา fetch failed บน Node.js
    const { error: uploadError } = await supabase.storage
      .from('stealth-snaps')
      .upload(filename, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    // 🚨 เปิดการแจ้งเตือน Error! ถ้าอัปโหลดพัง ต้องเด้งบอก ESP32 ทันที จะได้แก้ถูกจุด
    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError.message);
      return new NextResponse(`Storage Error: ${uploadError.message}`, { status: 500 });
    }

    // ดึง Public URL ของภาพ
    const { data: publicUrlData } = supabase.storage
      .from('stealth-snaps')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;
    // ------------------------------------------

    const knowledgeBase = config.context ? `[KNOWLEDGE BASE]:\n${config.context}\n\n` : "";
    const instruction = `[USER INSTRUCTION]:\n${config.prompt}`;
    const fullPrompt = `${knowledgeBase}${instruction}`;

    console.log(`[COMMAND] Slot: ${config.slotIndex + 1} | AI: ${provider} | Model: ${targetModel}`);

    const response = await openrouter.chat.completions.create({
      model: targetModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    const aiResult = response.choices[0]?.message?.content || "AI did not return a response.";

    // --- บันทึก History ลงฐานข้อมูลผ่าน Prisma ---
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