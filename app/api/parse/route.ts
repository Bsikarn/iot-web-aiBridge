// app/api/parse/route.ts
import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[]; // รับมาหลายไฟล์
        let combinedText = "";

        for (const file of files) {
            if (file.name.endsWith('.txt')) {
                // ถ้าเป็นไฟล์ TXT อ่านตรงๆ ได้เลย
                const text = await file.text();
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${text}\n`;
            } else if (file.name.endsWith('.pdf')) {
                // ถ้าเป็นไฟล์ PDF ใช้ pdf-parse ช่วยแกะ
                const buffer = Buffer.from(await file.arrayBuffer());
                const pdfData = await pdfParse(buffer);
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${pdfData.text}\n`;
            }
        }

        // ส่งข้อความที่มัดรวมแล้วกลับไปให้หน้าเว็บ
        return NextResponse.json({ text: combinedText });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}