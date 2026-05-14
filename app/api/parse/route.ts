// app/api/parse/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        let combinedText = "";

        // เรียกใช้อาวุธใหม่
        const PDFParser = require("pdf2json");

        for (const file of files) {
            if (file.name.endsWith('.txt')) {
                const text = await file.text();
                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${text}\n`;
            }
            else if (file.name.endsWith('.pdf')) {
                const buffer = Buffer.from(await file.arrayBuffer());

                // ให้ pdf2json ทำงานแบบอ่านเฉพาะข้อความ (โหมด 1)
                const pdfText = await new Promise<string>((resolve, reject) => {
                    const pdfParser = new PDFParser(null, 1);

                    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                    pdfParser.on("pdfParser_dataReady", () => {
                        resolve(pdfParser.getRawTextContent());
                    });

                    pdfParser.parseBuffer(buffer);
                });

                combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${pdfText}\n`;
            }
        }

        return NextResponse.json({ text: combinedText });
    } catch (error: any) {
        // ดัก Error ให้โชว์ชัดๆ ไม่เป็นตัว n อีกต่อไป
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}