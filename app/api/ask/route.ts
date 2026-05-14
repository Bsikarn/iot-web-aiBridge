// app/api/ask/route.ts
import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { presetsStore } from '@/lib/store';

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://aicalculate-iot.vercel.app/",
    "X-Title": "AI Calculate IOT",
  }
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const provider = (formData.get('ai_provider') as string) || 'gemini';

    if (!image) return new NextResponse("No image", { status: 400 });

    // ดึงค่าทั้งหมดจาก Slot ที่เลือกไว้หน้าเว็บ
    const config = presetsStore.data[presetsStore.activeSlot];

    // ถอนวิชามาร! กลับมาใช้โมเดลของจริงที่ตั้งไว้ในเว็บ
    const targetModel = config.models[provider];

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    // รวม "บริบทจากไฟล์" เข้ากับ "คำสั่งหลัก"
    const systemPrompt = `[KNOWLEDGE BASE]:\n${config.context}\n\n[INSTRUCTION]:\n${config.prompt}`;

    console.log(`[API] AI: ${provider} | Model: ${targetModel} | Context Length: ${config.context.length}`);

    const response = await openrouter.chat.completions.create({
      model: targetModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: `data:${image.type};base64,${base64Image}` } }
          ],
        },
      ],
    });

    return new NextResponse(response.choices[0].message.content || "", { status: 200 });
  } catch (error: any) {
    return new NextResponse(`AI Error: ${error.message}`, { status: 500 });
  }
}