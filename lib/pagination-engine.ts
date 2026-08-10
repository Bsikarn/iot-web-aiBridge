import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont } from 'canvas';
import { PNG } from 'pngjs';

export interface RenderedPagePayload {
  success: boolean;
  total_pages: number;
  pages: string[];
}

// Hardware Display Specifications (Waveshare 2.13-inch E-Ink Landscape)
const PAGE_WIDTH = 250;  // Landscape Width
const PAGE_HEIGHT = 122; // Landscape Height
const PADDING = 5;       // Border Padding
const MAX_Y = PAGE_HEIGHT - PADDING; // 117px Usable Height
const START_Y = 16;      // Leave top space for header badge [1/N]

// Register Noto Sans Thai TTF font buffer with node-canvas
let isFontRegistered = false;
function ensureFontRegistered() {
  if (isFontRegistered) return;
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      registerFont(fontPath, { family: 'Noto Sans Thai' });
      isFontRegistered = true;
    }
  } catch (err) {
    console.error("Failed to register Thai font:", err);
  }
}

// Format LaTeX math expressions into human-readable math symbols
function formatLatexToReadableMath(rawLatex: string): string {
  try {
    let text = rawLatex
      .replace(/\\int\\limits_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
      .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
      .replace(/\\int\s+([^\s\\]+)/g, '∫ $1')
      .replace(/\\int/g, '∫')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '*')
      .replace(/\\div/g, '/')
      .replace(/\\le|\\leq/g, '≤')
      .replace(/\\ge|\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '∑[$1→$2]')
      .replace(/\\sum/g, '∑')
      .replace(/\\lim_\{([^}]+)\}/g, 'lim[$1]')
      .replace(/\\left|\\right/g, '')
      .replace(/[\{\}]/g, '')
      .replace(/\s+/g, ' ');
    return text.trim();
  } catch {
    return rawLatex;
  }
}

interface RenderElement {
  type: 'text' | 'header' | 'bullet' | 'math';
  content: string;
  height: number;
}

// Wrap text string into lines that fit within 240px width using canvas font metrics
function wrapTextToLines(ctx: any, text: string, maxPixelWidth = 240): string[] {
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
 * Node Canvas Thai Font & Formatted Math E-Ink Engine (LANDSCAPE 250x122px)
 * Converts AI answers (Thai/English Markdown + LaTeX Math) into 250x122 Base64 PNG images.
 */
export function renderEInkPages(rawText: string): RenderedPagePayload {
  ensureFontRegistered();

  if (!rawText || rawText.trim() === '') {
    return createEmptyPagePayload("No answer");
  }

  // Create temporary canvas for text measurement
  const dummyCanvas = createCanvas(PAGE_WIDTH, PAGE_HEIGHT);
  const dCtx = dummyCanvas.getContext('2d');
  dCtx.font = '10px "Noto Sans Thai", sans-serif';

  const elements: RenderElement[] = [];

  // Parse LaTeX math blocks ($$...$$ or \[...\]) and inline math ($...$ or \(...\))
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
  const textParts = rawText.split(mathRegex);

  for (const part of textParts) {
    if (!part) continue;

    if (part.startsWith('$$') && part.endsWith('$$')) {
      const mathCode = part.slice(2, -2).trim();
      const formattedMath = formatLatexToReadableMath(mathCode);
      const wrapped = wrapTextToLines(dCtx, '[MATH] ' + formattedMath, 235);
      for (const wLine of wrapped) {
        elements.push({ type: 'math', content: wLine, height: 12 });
      }
    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const mathCode = part.slice(2, -2).trim();
      const formattedMath = formatLatexToReadableMath(mathCode);
      const wrapped = wrapTextToLines(dCtx, '[MATH] ' + formattedMath, 235);
      for (const wLine of wrapped) {
        elements.push({ type: 'math', content: wLine, height: 12 });
      }
    } else if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\(') && part.endsWith('\\)'))) {
      const mathCode = part.startsWith('$') ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
      const formattedMath = formatLatexToReadableMath(mathCode);
      const wrapped = wrapTextToLines(dCtx, formattedMath, 235);
      for (const wLine of wrapped) {
        elements.push({ type: 'math', content: wLine, height: 11 });
      }
    } else {
      // Standard Markdown / Plain text lines
      const rawLines = part.split('\n');
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('# ')) {
          dCtx.font = 'bold 12px "Noto Sans Thai", sans-serif';
          const wrapped = wrapTextToLines(dCtx, trimmed.replace(/^#\s+/, ''), 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 14 });
          }
          dCtx.font = '10px "Noto Sans Thai", sans-serif';
        } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
          dCtx.font = 'bold 11px "Noto Sans Thai", sans-serif';
          const wrapped = wrapTextToLines(dCtx, trimmed.replace(/^#{2,3}\s+/, ''), 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 13 });
          }
          dCtx.font = '10px "Noto Sans Thai", sans-serif';
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const wrapped = wrapTextToLines(dCtx, '• ' + trimmed.replace(/^[-*•]\s+/, ''), 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'bullet', content: wLine, height: 11 });
          }
        } else {
          const wrapped = wrapTextToLines(dCtx, trimmed, 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'text', content: wLine, height: 11 });
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
    currentY += elem.height + 1;
  }

  if (currentPageElements.length > 0) {
    pageElementsList.push(currentPageElements);
  }

  const totalPages = pageElementsList.length || 1;
  const pagesBase64: string[] = [];

  // Render each landscape page using node-canvas with registered Thai TTF font
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const canvas = createCanvas(PAGE_WIDTH, PAGE_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Solid white background #ffffff
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    // Default black stroke and fill
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    // Header divider line and badge [1/N]
    ctx.beginPath();
    ctx.moveTo(PADDING, 12);
    ctx.lineTo(PAGE_WIDTH - PADDING, 12);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 9px "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`[${pIdx + 1}/${totalPages}]`, PAGE_WIDTH - PADDING, 10);
    ctx.textAlign = 'left';

    const pElements = pageElementsList[pIdx] || [];
    let yPos = START_Y;

    for (const elem of pElements) {
      if (elem.type === 'header') {
        ctx.font = 'bold 11px "Noto Sans Thai", sans-serif';
        ctx.fillText(elem.content, PADDING, yPos + 9);
        ctx.beginPath();
        ctx.moveTo(PADDING, yPos + 11);
        ctx.lineTo(PADDING + ctx.measureText(elem.content).width, yPos + 11);
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.font = '10px "Noto Sans Thai", sans-serif';
        ctx.fillText(elem.content, PADDING, yPos + 8);
      }
      yPos += elem.height + 1;
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
  ctx.font = '10px "Noto Sans Thai", sans-serif';
  ctx.fillText(message, PADDING, START_Y + 8);

  ctx.font = 'bold 9px "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('[1/1]', PAGE_WIDTH - PADDING, 10);

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
