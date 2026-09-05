import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[]; 
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    let combinedText = "";

    for (const file of files) {
      const fileName = file.name || "uploaded_document";
      const lowerName = fileName.toLowerCase();
      
      if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        const textContent = await file.text();
        combinedText += `\n--- [DOCUMENT: ${fileName}] ---\n${textContent}\n`;
      } else {
        return NextResponse.json(
          { error: `Unsupported file format: ${fileName}. Only .txt and .md files are allowed.` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, text: combinedText });
  } catch (error: any) {
    console.error("POST /api/parse Error:", error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}