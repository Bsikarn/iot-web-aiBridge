import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { presetsStore } from '@/lib/store';

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
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const provider = (formData.get('ai_provider') as string) || 'gemini';

    // 1. ตรวจสอบไฟล์ภาพ
    if (!image) {
      return new NextResponse("Error: No image received", { status: 400 });
    }

    // 2. ดึงค่า Config (ระวังเรื่อง Serverless Memory)
    // หมายเหตุ: บน Vercel ค่า activeSlot จะกลับเป็น 0 เสมอถ้าไม่มี Database 
    // แนะนำให้นายไปแก้ค่า Default ใน lib/store.ts ให้เป็นตัวที่อยากใช้จริงๆ ด้วย
    const slotIdx = presetsStore.activeSlot ?? 0;
    const config = presetsStore.data[slotIdx];

    if (!config) {
      return new NextResponse("Error: Slot configuration not found", { status: 500 });
    }

    // 3. เลือกโมเดล
    const targetModel = config.models[provider];

    // 4. จัดการรูปภาพ
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    // 5. ประกอบคำสั่ง (System Prompt + Knowledge Base)
    // แยกส่วนเนื้อหาจากไฟล์ และคำสั่งสั่งงานให้ AI เข้าใจง่ายขึ้น
    const knowledgeBase = config.context ? `[KNOWLEDGE BASE]:\n${config.context}\n\n` : "";
    const instruction = `[USER INSTRUCTION]:\n${config.prompt}`;
    const fullPrompt = `${knowledgeBase}${instruction}`;

    console.log(`[COMMAND] Slot: ${slotIdx + 1} | AI: ${provider} | Model: ${targetModel}`);

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
      // ปรับแต่งให้ AI ตอบกระชับ เหมาะกับจอเครื่องคิดเลข
      max_tokens: 500,
    });

    const aiResult = response.choices[0]?.message?.content || "AI did not return a response.";

    return new NextResponse(aiResult, { status: 200 });

  } catch (error: any) {
    console.error("Critical API Error:", error.message);
    // ส่ง Error กลับไปแบบบรรทัดเดียวเพื่อให้เครื่องคิดเลขแสดงผลได้
    return new NextResponse(`AI Error: ${error.message}`, { status: 500 });
  }
}