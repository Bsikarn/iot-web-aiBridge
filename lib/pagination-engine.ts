import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont, loadImage } from 'canvas';
import { PNG } from 'pngjs';
import katex from 'katex';

export interface RenderedPagePayload {
  success: boolean;
  total_pages: number;
  pages: string[];
}

// Hardware Display Specifications (Waveshare 2.13-inch E-Ink Landscape)
const PAGE_WIDTH = 250;  // Landscape Width
const PAGE_HEIGHT = 122; // Landscape Height
const PADDING = 4;       // Border Padding
const MAX_Y = PAGE_HEIGHT - 2; // Usable Height
const START_Y = 4;       // Maximized content area (starts directly at top)

// Register Universal Sarabun TTF font covering Thai, English, Numbers & Math symbols
let isFontRegistered = false;
function ensureFontRegistered() {
  if (isFontRegistered) return;
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      registerFont(fontPath, { family: 'Sarabun' });
      isFontRegistered = true;
    }
  } catch (err) {
    console.error("Failed to register Sarabun font:", err);
  }
}

export interface RenderMathResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Thai Word Segmentation Preprocessor using native JavaScript Intl.Segmenter.
 * Inserts zero-width spaces (\u200b) between Thai words to allow clean, dictionary-accurate line wrapping.
 */
function formatThaiText(text: string): string {
  if (!text) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
      let result = '';
      for (const { segment, isWordLike } of segmenter.segment(text)) {
        result += segment + (isWordLike ? '\u200b' : '');
      }
      return result;
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * Convert Markdown text (bold **, italic *, headings #) into clean HTML elements.
 */
function convertMarkdownToHtml(markdownText: string): string {
  if (!markdownText) return '';

  let html = markdownText
    // Convert bold **text** or __text__ to <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Convert italic *text* or _text_ to <em>text</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Convert headings
    .replace(/^###\s+(.*$)/gim, '<h4 style="font-weight:bold; font-size:13px; margin:2px 0;">$1</h4>')
    .replace(/^##\s+(.*$)/gim, '<h3 style="font-weight:bold; font-size:14px; margin:2px 0;">$1</h3>')
    .replace(/^#\s+(.*$)/gim, '<h2 style="font-weight:bold; font-size:15px; margin:2px 0;">$1</h2>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return html;
}

/**
 * Render clean HTML content into a 250x122px PNG image buffer using Cloud HTML-to-Image API.
 */
export async function renderHtmlToImageBuffer(htmlContent: string): Promise<Buffer | null> {
  const userId = process.env.HCTI_USER_ID || process.env.HTMLCSSTOIMAGE_USER_ID;
  const apiKey = process.env.HCTI_API_KEY || process.env.HTMLCSSTOIMAGE_API_KEY;
  const apiUrl = process.env.HTML_TO_IMAGE_API_URL || 'https://hcti.io/v1/image';

  if (!userId || !apiKey) {
    return null;
  }

  try {
    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: htmlContent,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        viewport_width: PAGE_WIDTH,
        viewport_height: PAGE_HEIGHT,
        device_scale_factor: 1,
        output: 'png'
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Cloud HTML-to-Image API returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const imageUrl = data.url || data.image_url;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;

    const arrayBuf = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("Cloud HTML-to-Image API exception:", err);
    return null;
  }
}

/**
 * Fetch rendered LaTeX math formula PNG image buffer from CodeCogs API.
 */
export async function fetchCodeCogsMathBuffer(latexCode: string): Promise<RenderMathResult | null> {
  try {
    const cleanLatex = latexCode.trim();
    if (!cleanLatex) return null;

    const url = `https://latex.codecogs.com/png.latex?\\dpi{150}\\bg{white}%20${encodeURIComponent(cleanLatex)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`CodeCogs API HTTP ${res.status} for formula:`, cleanLatex);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength < 50) {
      return null;
    }

    const img = await loadImage(buffer);
    return {
      buffer,
      width: img.width,
      height: img.height
    };
  } catch (err) {
    console.error("CodeCogs API fetch exception for LaTeX:", latexCode, err);
    return null;
  }
}

/**
 * Pure JS Serverless-Safe KaTeX Math Formatter fallback.
 */
function renderKaTeXToReadableMath(rawLatex: string, displayMode = false): string {
  try {
    katex.renderToString(rawLatex, { displayMode, throwOnError: false });

    let text = rawLatex
      .replace(/\\(?:mathcal|mathbb|boldsymbol|mathrm|mathbf|mathit|mathfrak|text)\{([^}]+)\}/g, '$1')
      .replace(/\\(?:mathcal|mathbb|boldsymbol|mathrm|mathbf|mathit|mathfrak|text)\s+([a-zA-Z0-9])/g, '$1')
      .replace(/\\int\\limits_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
      .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
      .replace(/\\int_([^\s\^]+)\^([^\s\\]+)/g, '∫[$1→$2]')
      .replace(/\\int\s+([^\s\\]+)/g, '∫ $1')
      .replace(/\\int/g, '∫')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\^\{([^}]+)\}/g, '^$1')
      .replace(/_\{([^}]+)\}/g, '_$1')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\div/g, '÷')
      .replace(/\\le|\\leq/g, '≤')
      .replace(/\\ge|\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\epsilon/g, 'ε')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\Sigma/g, 'Σ')
      .replace(/\\Omega/g, 'Ω')
      .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '∑[$1→$2]')
      .replace(/\\sum/g, '∑')
      .replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, '∏[$1→$2]')
      .replace(/\\prod/g, '∏')
      .replace(/\\lim_\{([^}]+)\}/g, 'lim[$1]')
      .replace(/\\left|\\right/g, '')
      .replace(/[\{\}]/g, '')
      .replace(/\\/g, '')
      .replace(/\s+/g, ' ');

    return text.trim();
  } catch (err) {
    return rawLatex.replace(/\\/g, '').trim();
  }
}

interface RenderElement {
  type: 'text' | 'header' | 'bullet' | 'math';
  content?: string;
  font?: string;
  height: number;
  mathBuffer?: Buffer;
  mathWidth?: number;
  mathHeight?: number;
  isBlockMath?: boolean;
}

// Wrap text string into lines that fit within maxPixelWidth (238px) using canvas font metrics
function wrapTextToLines(ctx: any, text: string, fontStr: string, maxPixelWidth = 238): string[] {
  ctx.font = fontStr;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width <= maxPixelWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Universal Cloud HTML-to-Image E-Ink Rendering Engine (LANDSCAPE 250x122px)
 * Renders AI answers into high-contrast 250x122px PNG E-Ink pages using Cloud API with Canvas fallback.
 */
export async function renderEInkPages(rawText: string): Promise<RenderedPagePayload> {
  ensureFontRegistered();

  if (!rawText || rawText.trim() === '') {
    return createEmptyPagePayload("No answer");
  }

  // Check if Cloud HTML-to-Image API is configured and attempt cloud rendering
  const userId = process.env.HCTI_USER_ID || process.env.HTMLCSSTOIMAGE_USER_ID;
  const apiKey = process.env.HCTI_API_KEY || process.env.HTMLCSSTOIMAGE_API_KEY;

  if (userId && apiKey) {
    const formattedRawText = formatThaiText(rawText);
    const styledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
    * { box-sizing: border-box !important; margin: 0; padding: 0; }
    html, body {
      width: 250px !important;
      max-width: 250px !important;
      height: 122px !important;
      max-height: 122px !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Sarabun', sans-serif !important;
      font-size: 13px !important;
      line-height: 1.35 !important;
      overflow: hidden !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
    }
    .content-container {
      width: 250px !important;
      max-width: 250px !important;
      height: 122px !important;
      max-height: 122px !important;
      margin: 0 !important;
      padding: 2px 4px !important;
      box-sizing: border-box !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
      overflow: hidden !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .content {
      font-size: 13px !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
      overflow: hidden !important;
    }
  </style>
</head>
<body>
  <div class="content-container">
    <div class="content">
      ${convertMarkdownToHtml(formattedRawText)}
    </div>
  </div>
</body>
</html>`;

    const cloudBuffer = await renderHtmlToImageBuffer(styledHtml);
    if (cloudBuffer) {
      const png = PNG.sync.read(cloudBuffer);
      for (let i = 0; i < png.data.length; i += 4) {
        const alpha = png.data[i + 3];
        if (alpha === 0) {
          png.data[i] = 255;
          png.data[i + 1] = 255;
          png.data[i + 2] = 255;
          png.data[i + 3] = 255;
        } else {
          const avg = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
          const val = avg <= 200 ? 0 : 255;
          png.data[i] = val;
          png.data[i + 1] = val;
          png.data[i + 2] = val;
          png.data[i + 3] = 255;
        }
      }
      const binarized = PNG.sync.write(png);
      return {
        success: true,
        total_pages: 1,
        pages: [`data:image/png;base64,${binarized.toString('base64')}`]
      };
    }
  }

  // Create temporary canvas for text measurement
  const dummyCanvas = createCanvas(PAGE_WIDTH, PAGE_HEIGHT);
  const dCtx = dummyCanvas.getContext('2d');

  // Universal font stack covering Thai, English, Numbers & Math symbols
  const bodyFont = '16px "Sarabun", "Segoe UI", Arial, sans-serif';
  const header1Font = 'bold 18px "Sarabun", "Segoe UI", Arial, sans-serif';
  const header2Font = 'bold 17px "Sarabun", "Segoe UI", Arial, sans-serif';
  const mathFont = 'bold 16px "Sarabun", "Segoe UI", Arial, sans-serif';

  const elements: RenderElement[] = [];

  // Parse LaTeX math blocks ($$...$$, \[...\], \begin{equation}...\end{equation}) and inline math ($...$, \(...\))
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\begin\{equation\}[\s\S]*?\\end\{equation\}|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
  const textParts = rawText.split(mathRegex);

  for (const part of textParts) {
    if (!part) continue;

    if (
      (part.startsWith('$$') && part.endsWith('$$')) ||
      (part.startsWith('\\[') && part.endsWith('\\]')) ||
      (part.startsWith('\\begin{equation}') && part.endsWith('\\end{equation}'))
    ) {
      let mathCode = '';
      if (part.startsWith('$$')) mathCode = part.slice(2, -2).trim();
      else if (part.startsWith('\\[')) mathCode = part.slice(2, -2).trim();
      else mathCode = part.replace(/^\\begin\{equation\}/, '').replace(/\\end\{equation\}$/, '').trim();

      const mathRes = await fetchCodeCogsMathBuffer(mathCode);
      if (mathRes) {
        let drawW = mathRes.width;
        let drawH = mathRes.height;
        const maxW = 240;
        if (drawW > maxW) {
          const ratio = maxW / drawW;
          drawW = maxW;
          drawH = Math.round(drawH * ratio);
        }
        elements.push({
          type: 'math',
          height: Math.max(16, Math.min(65, drawH + 4)),
          mathBuffer: mathRes.buffer,
          mathWidth: drawW,
          mathHeight: drawH,
          isBlockMath: true
        });
      } else {
        const formattedMath = renderKaTeXToReadableMath(mathCode, true);
        const wrapped = wrapTextToLines(dCtx, formattedMath, mathFont, 240);
        for (const wLine of wrapped) {
          elements.push({ type: 'text', content: wLine, height: 20, font: mathFont });
        }
      }
    } else if (
      (part.startsWith('$') && part.endsWith('$')) ||
      (part.startsWith('\\(') && part.endsWith('\\)'))
    ) {
      const mathCode = part.startsWith('$') ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
      const mathRes = await fetchCodeCogsMathBuffer(mathCode);

      if (mathRes) {
        let drawW = mathRes.width;
        let drawH = mathRes.height;
        const maxW = 240;
        if (drawW > maxW) {
          const ratio = maxW / drawW;
          drawW = maxW;
          drawH = Math.round(drawH * ratio);
        }
        elements.push({
          type: 'math',
          height: Math.max(16, Math.min(50, drawH + 4)),
          mathBuffer: mathRes.buffer,
          mathWidth: drawW,
          mathHeight: drawH,
          isBlockMath: false
        });
      } else {
        const formattedMath = renderKaTeXToReadableMath(mathCode, false);
        const wrapped = wrapTextToLines(dCtx, formattedMath, bodyFont, 240);
        for (const wLine of wrapped) {
          elements.push({ type: 'text', content: wLine, height: 19, font: bodyFont });
        }
      }
    } else {
      // Standard Markdown / Plain text lines
      const rawLines = part.split('\n');
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Sanitize raw ** markdown asterisks for plain text canvas rendering
        const cleanLine = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');

        if (cleanLine.startsWith('# ')) {
          const wrapped = wrapTextToLines(dCtx, cleanLine.replace(/^#\s+/, ''), header1Font, 240);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 22, font: header1Font });
          }
        } else if (cleanLine.startsWith('## ') || cleanLine.startsWith('### ')) {
          const wrapped = wrapTextToLines(dCtx, cleanLine.replace(/^#{2,3}\s+/, ''), header2Font, 240);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 21, font: header2Font });
          }
        } else if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ') || cleanLine.startsWith('• ')) {
          const wrapped = wrapTextToLines(dCtx, '• ' + cleanLine.replace(/^[-*•]\s+/, ''), bodyFont, 240);
          for (const wLine of wrapped) {
            elements.push({ type: 'bullet', content: wLine, height: 19, font: bodyFont });
          }
        } else {
          const wrapped = wrapTextToLines(dCtx, cleanLine, bodyFont, 240);
          for (const wLine of wrapped) {
            elements.push({ type: 'text', content: wLine, height: 19, font: bodyFont });
          }
        }
      }
    }
  }

  // Paginate elements into 122px landscape pages without clipping elements in half
  const pageElementsList: RenderElement[][] = [];
  let currentPageElements: RenderElement[] = [];
  let currentY = START_Y;

  for (const elem of elements) {
    if (currentY + elem.height > MAX_Y && currentPageElements.length > 0) {
      pageElementsList.push(currentPageElements);
      currentPageElements = [];
      currentY = START_Y;
    }
    currentPageElements.push(elem);
    currentY += elem.height + 2;
  }

  if (currentPageElements.length > 0) {
    pageElementsList.push(currentPageElements);
  }

  const totalPages = pageElementsList.length || 1;
  const pagesBase64: string[] = [];

  // Render each landscape page using node-canvas with composite CodeCogs math graphics
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const canvas = createCanvas(PAGE_WIDTH, PAGE_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Solid white background #ffffff
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    // Default black stroke and fill
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    const pElements = pageElementsList[pIdx] || [];
    let yPos = START_Y;

    for (const elem of pElements) {
      if (elem.type === 'math' && elem.mathBuffer) {
        try {
          const img = await loadImage(elem.mathBuffer);
          const drawW = elem.mathWidth || img.width;
          const drawH = elem.mathHeight || img.height;

          let xPos = PADDING;
          if (elem.isBlockMath) {
            xPos = Math.max(PADDING, Math.round((PAGE_WIDTH - drawW) / 2));
          }

          ctx.drawImage(img, xPos, yPos + 2, drawW, drawH);
        } catch (imgErr) {
          console.error("Failed to load CodeCogs math image onto canvas:", imgErr);
        }
        yPos += elem.height + 2;
      } else {
        ctx.font = elem.font || bodyFont;
        if (elem.type === 'header') {
          ctx.fillText(elem.content || '', PADDING, yPos + 14);
          ctx.beginPath();
          ctx.moveTo(PADDING, yPos + 17);
          ctx.lineTo(PADDING + ctx.measureText(elem.content || '').width, yPos + 17);
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillText(elem.content || '', PADDING, yPos + 13);
        }
        yPos += elem.height + 2;
      }
    }

    // Convert Canvas to PNG Buffer and apply 1-bit monochrome binarization
    const canvasBuffer = canvas.toBuffer('image/png');
    const png = PNG.sync.read(canvasBuffer);

    for (let i = 0; i < png.data.length; i += 4) {
      const alpha = png.data[i + 3];
      if (alpha === 0) {
        png.data[i] = 255;
        png.data[i + 1] = 255;
        png.data[i + 2] = 255;
        png.data[i + 3] = 255;
      } else {
        const avg = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
        const val = avg <= 200 ? 0 : 255;
        png.data[i] = val;
        png.data[i + 1] = val;
        png.data[i + 2] = val;
        png.data[i + 3] = 255;
      }
    }

    const binarizedBuffer = PNG.sync.write(png);
    pagesBase64.push(`data:image/png;base64,${binarizedBuffer.toString('base64')}`);
  }

  return {
    success: true,
    total_pages: totalPages,
    pages: pagesBase64
  };
}

function createEmptyPagePayload(message: string): RenderedPagePayload {
  ensureFontRegistered();
  const canvas = createCanvas(PAGE_WIDTH, PAGE_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.font = '16px "Sarabun", "Segoe UI", Arial, sans-serif';
  ctx.fillText(message, PADDING, START_Y + 14);

  const canvasBuffer = canvas.toBuffer('image/png');
  const png = PNG.sync.read(canvasBuffer);

  for (let i = 0; i < png.data.length; i += 4) {
    const alpha = png.data[i + 3];
    if (alpha === 0) {
      png.data[i] = 255;
      png.data[i + 1] = 255;
      png.data[i + 2] = 255;
      png.data[i + 3] = 255;
    } else {
      const avg = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
      const val = avg <= 200 ? 0 : 255;
      png.data[i] = val;
      png.data[i + 1] = val;
      png.data[i + 2] = val;
      png.data[i + 3] = 255;
    }
  }

  const binarizedBuffer = PNG.sync.write(png);
  return {
    success: true,
    total_pages: 1,
    pages: [`data:image/png;base64,${binarizedBuffer.toString('base64')}`]
  };
}
