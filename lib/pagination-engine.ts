import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont } from 'canvas';
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
const PADDING = 6;       // Border Padding
const MAX_Y = PAGE_HEIGHT - PADDING; // 116px Usable Height
const START_Y = 20;      // Leave top space for header badge [1/N]

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

/**
 * Pure JS Serverless-Safe KaTeX Math Parser & Formatter.
 * Parses LaTeX equations (e.g. \mathcal{L}\{f(t)\} = \int_0^\infty f(t)e^{-st}\,dt)
 * into clean, human-readable visual mathematical typography without filesystem lookups.
 */
function renderKaTeXToReadableMath(rawLatex: string, displayMode = false): string {
  try {
    // 1. Validate syntax via pure JS KaTeX
    katex.renderToString(rawLatex, { displayMode, throwOnError: false });

    // 2. Format LaTeX symbols into clean visual typography
    let text = rawLatex
      // Sanitize font macro wrappers: \mathcal{X}, \mathbb{X}, \boldsymbol{X}, \mathrm{X}, \mathbf{X}, \mathit{X}, \mathfrak{X}, \text{X}
      .replace(/\\(?:mathcal|mathbb|boldsymbol|mathrm|mathbf|mathit|mathfrak|text)\{([^}]+)\}/g, '$1')
      .replace(/\\(?:mathcal|mathbb|boldsymbol|mathrm|mathbf|mathit|mathfrak|text)\s+([a-zA-Z0-9])/g, '$1')
      // Format Integrals, Limits, Powers, Fractions
      .replace(/\\int\\limits_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
      .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
      .replace(/\\int_([^\s\^]+)\^([^\s\\]+)/g, '∫[$1→$2]')
      .replace(/\\int\s+([^\s\\]+)/g, '∫ $1')
      .replace(/\\int/g, '∫')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\^\{([^}]+)\}/g, '^$1')
      .replace(/_\{([^}]+)\}/g, '_$1')
      // Operators & Relations
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\div/g, '÷')
      .replace(/\\le|\\leq/g, '≤')
      .replace(/\\ge|\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      // Greek Symbols
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
      // Summations, Products & Limits
      .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '∑[$1→$2]')
      .replace(/\\sum/g, '∑')
      .replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, '∏[$1→$2]')
      .replace(/\\prod/g, '∏')
      .replace(/\\lim_\{([^}]+)\}/g, 'lim[$1]')
      // Clean braces, delimiters, spaces
      .replace(/\\left|\\right/g, '')
      .replace(/[\{\}]/g, '')
      .replace(/\\/g, '')
      .replace(/\s+/g, ' ');

    return text.trim();
  } catch (err) {
    console.warn("KaTeX parse warning for latex:", rawLatex, err);
    return rawLatex.replace(/\\/g, '').trim();
  }
}

interface RenderElement {
  type: 'text' | 'header' | 'bullet' | 'math';
  content: string;
  height: number;
  font: string;
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
 * Universal Pure-JS Serverless-Safe E-Ink Engine (LANDSCAPE 250x122px)
 * Uses pure JS KaTeX parsing & universal Sarabun TTF font covering Thai, English, Numbers & Math symbols.
 */
export function renderEInkPages(rawText: string): RenderedPagePayload {
  ensureFontRegistered();

  if (!rawText || rawText.trim() === '') {
    return createEmptyPagePayload("No answer");
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

  // Parse LaTeX math blocks ($$...$$ or \[...\]) and inline math ($...$ or \(...\))
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
  const textParts = rawText.split(mathRegex);

  for (const part of textParts) {
    if (!part) continue;

    if (
      (part.startsWith('$$') && part.endsWith('$$')) ||
      (part.startsWith('\\[') && part.endsWith('\\]'))
    ) {
      const mathCode = part.startsWith('$$') ? part.slice(2, -2).trim() : part.slice(2, -2).trim();
      const formattedMath = renderKaTeXToReadableMath(mathCode, true);
      const wrapped = wrapTextToLines(dCtx, formattedMath, mathFont, 235);
      for (const wLine of wrapped) {
        elements.push({ type: 'math', content: wLine, height: 20, font: mathFont });
      }
    } else if (
      (part.startsWith('$') && part.endsWith('$')) ||
      (part.startsWith('\\(') && part.endsWith('\\)'))
    ) {
      const mathCode = part.startsWith('$') ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
      const formattedMath = renderKaTeXToReadableMath(mathCode, false);
      const wrapped = wrapTextToLines(dCtx, formattedMath, bodyFont, 235);
      for (const wLine of wrapped) {
        elements.push({ type: 'math', content: wLine, height: 19, font: bodyFont });
      }
    } else {
      // Standard Markdown / Plain text lines
      const rawLines = part.split('\n');
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('# ')) {
          const wrapped = wrapTextToLines(dCtx, trimmed.replace(/^#\s+/, ''), header1Font, 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 22, font: header1Font });
          }
        } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
          const wrapped = wrapTextToLines(dCtx, trimmed.replace(/^#{2,3}\s+/, ''), header2Font, 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 21, font: header2Font });
          }
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const wrapped = wrapTextToLines(dCtx, '• ' + trimmed.replace(/^[-*•]\s+/, ''), bodyFont, 235);
          for (const wLine of wrapped) {
            elements.push({ type: 'bullet', content: wLine, height: 19, font: bodyFont });
          }
        } else {
          const wrapped = wrapTextToLines(dCtx, trimmed, bodyFont, 235);
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

  // Render each landscape page using node-canvas with registered universal Sarabun TTF font
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
    ctx.moveTo(PADDING, 14);
    ctx.lineTo(PAGE_WIDTH - PADDING, 14);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 12px "Sarabun", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`[${pIdx + 1}/${totalPages}]`, PAGE_WIDTH - PADDING, 11);
    ctx.textAlign = 'left';

    const pElements = pageElementsList[pIdx] || [];
    let yPos = START_Y;

    for (const elem of pElements) {
      ctx.font = elem.font;
      if (elem.type === 'header') {
        ctx.fillText(elem.content, PADDING, yPos + 14);
        ctx.beginPath();
        ctx.moveTo(PADDING, yPos + 17);
        ctx.lineTo(PADDING + ctx.measureText(elem.content).width, yPos + 17);
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillText(elem.content, PADDING, yPos + 13);
      }
      yPos += elem.height + 2;
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

  ctx.font = 'bold 12px "Sarabun", "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('[1/1]', PAGE_WIDTH - PADDING, 11);

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
