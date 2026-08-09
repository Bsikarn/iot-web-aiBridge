import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[]; 
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    let combinedText = "";
    const PDFParser = require("pdf2json");

    for (const file of files) {
      const fileName = file.name || "uploaded_document";
      if (fileName.toLowerCase().endsWith('.txt')) {
        const textContent = await file.text();
        combinedText += `\n--- [DOCUMENT: ${fileName}] ---\n${textContent}\n`;
      } else if (fileName.toLowerCase().endsWith('.pdf')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdfText = await new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser(null, 1);
          pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError || "PDF parsing failed"));
          pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
          pdfParser.parseBuffer(buffer);
        });
        combinedText += `\n--- [DOCUMENT: ${fileName}] ---\n${pdfText}\n`;
      }
    }

    return NextResponse.json({ success: true, text: combinedText });
  } catch (error: any) {
    console.error("POST /api/parse Error:", error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}