import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// ตั้งค่า OpenRouter ให้พร้อมรบ
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "", // ป้องกันกรณีลืมตั้งค่า Env
  defaultHeaders: {
    "HTTP-Referer": "https://aicalculate-iot.vercel.app/",
    "X-Title": "AI Calculate IOT HQ",
  }
});

export async function POST(req: Request) {
  // ตั้งค่า Supabase Client ภายในฟังก์ชันเพื่อป้องกัน Error ตอน Build (Static Analysis)
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

    // 1. ตรวจสอบไฟล์ภาพ
    if (!image) {
      return new NextResponse("Error: No image received", { status: 400 });
    }

    // 2. ดึงค่า Config จากฐานข้อมูล (Prisma)
    const config = await prisma.slot.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return new NextResponse("Error: Slot configuration not found", { status: 500 });
    }

    // 3. เลือกโมเดล
    const models = config.models as Record<string, string>;
    const targetModel = models[provider] || "openrouter/free";

    // 4. จัดการรูปภาพ
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    // --- NEW: อัปโหลดรูปขึ้น Supabase Storage ---
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('stealth-snaps')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError.message);
      // ไม่ Return Error ทันที เผื่ออยากให้ AI ยังตอบได้แม้บันทึกภาพไม่สำเร็จ
    }

    // ดึง Public URL ของภาพ
    const { data: publicUrlData } = supabase.storage
      .from('stealth-snaps')
      .getPublicUrl(filename);
    
    const publicUrl = publicUrlData.publicUrl;
    // ------------------------------------------

    // 5. ประกอบคำสั่ง (System Prompt + Knowledge Base)
    const knowledgeBase = config.context ? `[KNOWLEDGE BASE]:\n${config.context}\n\n` : "";
    const instruction = `[USER INSTRUCTION]:\n${config.prompt}`;
    const fullPrompt = `${knowledgeBase}${instruction}`;

    console.log(`[COMMAND] Slot: ${config.slotIndex + 1} | AI: ${provider} | Model: ${targetModel}`);

    // 6. ส่งคำสั่งไปที่ OpenRouter
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

    // --- NEW: บันทึก History ลงฐานข้อมูลผ่าน Prisma ---
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
    // ------------------------------------------------

    return new NextResponse(aiResult, { status: 200 });

  } catch (error: any) {
    console.error("Critical API Error:", error.message);
    return new NextResponse(`AI Error: ${error.message}`, { status: 500 });
  }
}