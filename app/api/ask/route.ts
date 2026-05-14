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

    // ดึงค่าจาก Slot ที่เลือกอยู่บนเว็บ
    const config = presetsStore.data[presetsStore.activeSlot];
    const targetModel = config.models[provider];

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    const response = await openrouter.chat.completions.create({
      model: targetModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${config.context}\n\n${config.prompt}` },
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