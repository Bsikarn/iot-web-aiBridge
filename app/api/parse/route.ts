import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[]; 
    let combinedText = "";
    const PDFParser = require("pdf2json");
    
    for (const file of files) {
      if (file.name.endsWith('.txt')) {
        combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${await file.text()}\n`;
      } else if (file.name.endsWith('.pdf')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdfText = await new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser(null, 1);
          pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
          pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
          pdfParser.parseBuffer(buffer);
        });
        combinedText += `\n--- [DOCUMENT: ${file.name}] ---\n${pdfText}\n`;
      }
    }
    
    return NextResponse.json({ text: combinedText });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}