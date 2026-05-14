// app/api/parse/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        let combinedText = "";

        // 💡 วิชามารหลบ Turbopack: เปลี่ยนมาใช้ require แบบดั้งเดิมแทน import
        const pdfParse = require('pdf-parse');

        for (const file of files) {
            if (file.name.endsWith('.txt')) {
                const text = await file.text();
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${text}\n`;
            } else if (file.name.endsWith('.pdf')) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const pdfData = await pdfParse(buffer);
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${pdfData.text}\n`;
            }
        }

        return NextResponse.json({ text: combinedText });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}