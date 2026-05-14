// app/api/parse/route.ts
import { NextResponse } from 'next/server';

// 💡 วิชามารขั้นสุด: สร้างตัวแปร DOMMatrix ปลอมหลอก pdf-parse ให้ทำงานต่อได้!
if (typeof global.DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor(init: any) { return init || [1, 0, 0, 1, 0, 0]; }
    };
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        let combinedText = "";

        const pdfParse = require('pdf-parse');

        for (const file of files) {
            if (file.name.endsWith('.txt')) {
                const text = await file.text();
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${text}\n`;
            } else if (file.name.endsWith('.pdf')) {
                const buffer = Buffer.from(await file.arrayBuffer());
                // ตอนนี้ pdfParse จะไม่พังแล้ว เพราะเราเสก DOMMatrix ปลอมมารอรับหน้าไว้แล้ว!
                const pdfData = await pdfParse(buffer);
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${pdfData.text}\n`;
            }
        }

        return NextResponse.json({ text: combinedText });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}