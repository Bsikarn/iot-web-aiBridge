import { PNG } from 'pngjs';

export interface RenderedPagePayload {
  success: boolean;
  total_pages: number;
  pages: string[];
}

// Fixed Hardware Dimensions for Waveshare 2.13-inch E-Ink Display in LANDSCAPE mode
const PAGE_WIDTH = 250;  // Landscape Width
const PAGE_HEIGHT = 122; // Landscape Height
const PADDING = 5;       // Border Padding on all sides
const CONTENT_WIDTH = PAGE_WIDTH - PADDING * 2; // 240px Usable Width
const MAX_Y = PAGE_HEIGHT - PADDING; // 117px Usable Height
const START_Y = 16;      // Leave top space for header badge [1/N]

// 5x7 Bitmap Font Data for ASCII and Math Symbols
// Each 5x7 character is encoded as 5 column bytes (7 bits used per column)
const BITMAP_FONT: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5f, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7f, 0x14, 0x7f, 0x14],
  '$': [0x24, 0x2a, 0x7f, 0x2a, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  "'": [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1c, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1c, 0x00],
  '*': [0x14, 0x08, 0x3e, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3e],
  'A': [0x7e, 0x11, 0x11, 0x11, 0x7e],
  'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
  'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
  'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
  'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
  'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
  'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
  'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
  'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
  'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
  'V': [0x1f, 0x20, 0x40, 0x20, 0x1f],
  'W': [0x7f, 0x20, 0x18, 0x20, 0x7f],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '[': [0x00, 0x7f, 0x41, 0x41, 0x00],
  '\\': [0x02, 0x04, 0x08, 0x10, 0x20],
  ']': [0x00, 0x41, 0x41, 0x7f, 0x00],
  '^': [0x04, 0x02, 0x01, 0x02, 0x04],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  '`': [0x00, 0x01, 0x02, 0x04, 0x00],
  'a': [0x20, 0x54, 0x54, 0x54, 0x78],
  'b': [0x7f, 0x48, 0x44, 0x44, 0x38],
  'c': [0x38, 0x44, 0x44, 0x44, 0x20],
  'd': [0x38, 0x44, 0x44, 0x48, 0x7f],
  'e': [0x38, 0x54, 0x54, 0x54, 0x18],
  'f': [0x08, 0x7e, 0x09, 0x01, 0x02],
  'g': [0x0c, 0x52, 0x52, 0x52, 0x3e],
  'h': [0x7f, 0x08, 0x04, 0x04, 0x78],
  'i': [0x00, 0x44, 0x7d, 0x40, 0x00],
  'j': [0x20, 0x40, 0x44, 0x3d, 0x00],
  'k': [0x7f, 0x10, 0x28, 0x44, 0x00],
  'l': [0x00, 0x41, 0x7f, 0x40, 0x00],
  'm': [0x7c, 0x04, 0x18, 0x04, 0x78],
  'n': [0x7c, 0x08, 0x04, 0x04, 0x78],
  'o': [0x38, 0x44, 0x44, 0x44, 0x38],
  'p': [0x7c, 0x14, 0x14, 0x14, 0x08],
  'q': [0x08, 0x14, 0x14, 0x18, 0x7c],
  'r': [0x7c, 0x08, 0x04, 0x04, 0x08],
  's': [0x48, 0x54, 0x54, 0x54, 0x24],
  't': [0x04, 0x3e, 0x44, 0x24, 0x08],
  'u': [0x3c, 0x40, 0x40, 0x20, 0x7c],
  'v': [0x1c, 0x20, 0x40, 0x20, 0x1c],
  'w': [0x3c, 0x40, 0x30, 0x40, 0x3c],
  'x': [0x44, 0x28, 0x10, 0x28, 0x44],
  'y': [0x0c, 0x50, 0x50, 0x50, 0x3c],
  'z': [0x44, 0x64, 0x54, 0x4c, 0x44],
  '{': [0x00, 0x08, 0x36, 0x41, 0x00],
  '|': [0x00, 0x00, 0x7f, 0x00, 0x00],
  '}': [0x00, 0x41, 0x36, 0x08, 0x00],
  '~': [0x02, 0x01, 0x02, 0x04, 0x02],
  '•': [0x00, 0x1c, 0x1c, 0x1c, 0x00],
  '√': [0x18, 0x20, 0x40, 0x3f, 0x01],
  '±': [0x08, 0x3e, 0x08, 0x14, 0x14],
  '≠': [0x14, 0x3e, 0x14, 0x22, 0x14],
  '≤': [0x08, 0x14, 0x22, 0x55, 0x55],
  '≥': [0x55, 0x55, 0x22, 0x14, 0x08],
  '∞': [0x24, 0x5a, 0x24, 0x5a, 0x24],
  'π': [0x02, 0x7f, 0x02, 0x7f, 0x02],
  'θ': [0x3e, 0x41, 0x5d, 0x41, 0x3e],
  'α': [0x24, 0x49, 0x49, 0x36, 0x00],
  'β': [0x7f, 0x49, 0x49, 0x36, 0x14],
  '∑': [0x41, 0x63, 0x55, 0x49, 0x41],
  '∫': [0x20, 0x41, 0x7f, 0x41, 0x02]
};

// Canvas Page Wrapper around pngjs PNG buffer (250x122 Landscape)
class PageCanvas {
  public png: PNG;

  constructor() {
    this.png = new PNG({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
    // Fill white background (255, 255, 255, 255)
    for (let i = 0; i < this.png.data.length; i += 4) {
      this.png.data[i] = 255;
      this.png.data[i + 1] = 255;
      this.png.data[i + 2] = 255;
      this.png.data[i + 3] = 255;
    }
  }

  setPixel(x: number, y: number, isBlack = true) {
    if (x < 0 || x >= PAGE_WIDTH || y < 0 || y >= PAGE_HEIGHT) return;
    const idx = (PAGE_WIDTH * Math.floor(y) + Math.floor(x)) << 2;
    const val = isBlack ? 0 : 255;
    this.png.data[idx] = val;
    this.png.data[idx + 1] = val;
    this.png.data[idx + 2] = val;
    this.png.data[idx + 3] = 255;
  }

  drawHorizontalLine(x1: number, x2: number, y: number) {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(PAGE_WIDTH - 1, Math.max(x1, x2));
    for (let x = minX; x <= maxX; x++) {
      this.setPixel(x, y);
    }
  }

  drawChar(char: string, x: number, y: number): number {
    const fontData = BITMAP_FONT[char] || BITMAP_FONT['?'];
    for (let col = 0; col < 5; col++) {
      const bits = fontData[col] || 0;
      for (let row = 0; row < 7; row++) {
        if ((bits >> row) & 1) {
          this.setPixel(x + col, y + row);
        }
      }
    }
    return 6; // Width + 1px spacing
  }

  drawString(str: string, x: number, y: number): number {
    let currentX = x;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      currentX += this.drawChar(ch, currentX, y);
    }
    return currentX - x;
  }

  drawHeaderBadge(pageNum: number, totalPages: number) {
    const badgeStr = `[${pageNum}/${totalPages}]`;
    const badgeWidth = badgeStr.length * 6;
    const startX = PAGE_WIDTH - PADDING - badgeWidth;
    this.drawString(badgeStr, startX, 4);
    this.drawHorizontalLine(PADDING, PAGE_WIDTH - PADDING, 12);
  }

  toBase64Png(): string {
    const buffer = PNG.sync.write(this.png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}

// Convert LaTeX expressions into clean readable text/math symbols
function cleanLatexMath(rawLatex: string): string {
  try {
    let text = rawLatex
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
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
      .replace(/\\sum/g, '∑')
      .replace(/\\int/g, '∫')
      .replace(/\\left|\\right/g, '')
      .replace(/[\{\}]/g, '');
    return text.trim();
  } catch {
    return rawLatex;
  }
}

interface RenderBlock {
  type: 'text' | 'header' | 'bullet' | 'math';
  content: string;
  height: number;
}

// Wrap text string into lines that fit within 240px width (~38-40 chars max per line for 6px chars)
function wrapTextToLines(text: string, maxCharsPerLine = 38): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxCharsPerLine) {
        // Break long single word
        let remaining = word;
        while (remaining.length > maxCharsPerLine) {
          lines.push(remaining.slice(0, maxCharsPerLine));
          remaining = remaining.slice(maxCharsPerLine);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Main E-Ink Page Pagination Engine (LANDSCAPE MODE: 250x122 px)
 * Converts Markdown + LaTeX text into 250x122 1-bit high-contrast Base64 PNG images.
 */
export function renderEInkPages(rawText: string): RenderedPagePayload {
  if (!rawText || rawText.trim() === '') {
    const page = new PageCanvas();
    page.drawString("No answer", PADDING, START_Y);
    page.drawHeaderBadge(1, 1);
    return {
      success: true,
      total_pages: 1,
      pages: [page.toBase64Png()]
    };
  }

  // Pre-process LaTeX Math delimiters ($...$, $$...$$, \(...\), \[...\])
  let processedText = rawText
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => ` [MATH: ${cleanLatexMath(math)}] `)
    .replace(/\\\[([\s\S]*?)\\]/g, (_, math) => ` [MATH: ${cleanLatexMath(math)}] `)
    .replace(/\$([\s\S]*?)\$/g, (_, math) => ` ${cleanLatexMath(math)} `)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => ` ${cleanLatexMath(math)} `);

  const rawLines = processedText.split('\n');
  const blocks: RenderBlock[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# ')) {
      const wrapped = wrapTextToLines(trimmed.replace(/^#\s+/, ''), 34);
      for (const wLine of wrapped) {
        blocks.push({ type: 'header', content: wLine, height: 12 });
      }
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const wrapped = wrapTextToLines(trimmed.replace(/^#{2,3}\s+/, ''), 36);
      for (const wLine of wrapped) {
        blocks.push({ type: 'header', content: wLine, height: 11 });
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const wrapped = wrapTextToLines('• ' + trimmed.replace(/^[-*•]\s+/, ''), 38);
      for (const wLine of wrapped) {
        blocks.push({ type: 'bullet', content: wLine, height: 10 });
      }
    } else if (trimmed.startsWith('[MATH:')) {
      const mathText = trimmed.replace(/^\[MATH:\s*/, '').replace(/\]$/, '');
      const wrapped = wrapTextToLines(mathText, 36);
      for (const wLine of wrapped) {
        blocks.push({ type: 'math', content: wLine, height: 13 });
      }
    } else {
      const wrapped = wrapTextToLines(trimmed, 38);
      for (const wLine of wrapped) {
        blocks.push({ type: 'text', content: wLine, height: 10 });
      }
    }
  }

  // Paginate blocks into 122px landscape pages without clipping lines in half
  const pageBlocksList: RenderBlock[][] = [];
  let currentPageBlocks: RenderBlock[] = [];
  let currentY = START_Y;

  for (const block of blocks) {
    if (currentY + block.height > MAX_Y && currentPageBlocks.length > 0) {
      pageBlocksList.push(currentPageBlocks);
      currentPageBlocks = [];
      currentY = START_Y;
    }
    currentPageBlocks.push(block);
    currentY += block.height + 2; // Block height + spacing
  }

  if (currentPageBlocks.length > 0) {
    pageBlocksList.push(currentPageBlocks);
  }

  const totalPages = pageBlocksList.length || 1;
  const pagesBase64: string[] = [];

  // Render each landscape page to 250x122 1-bit high contrast PNG
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pageCanvas = new PageCanvas();
    const pBlocks = pageBlocksList[pIdx] || [];
    let yPos = START_Y;

    for (const block of pBlocks) {
      if (block.type === 'header') {
        pageCanvas.drawString(block.content, PADDING, yPos);
        pageCanvas.drawHorizontalLine(PADDING, PADDING + block.content.length * 6, yPos + 8);
      } else if (block.type === 'math') {
        pageCanvas.drawString(block.content, PADDING, yPos);
      } else {
        pageCanvas.drawString(block.content, PADDING, yPos);
      }
      yPos += block.height + 2;
    }

    pageCanvas.drawHeaderBadge(pIdx + 1, totalPages);
    pagesBase64.push(pageCanvas.toBase64Png());
  }

  return {
    success: true,
    total_pages: totalPages,
    pages: pagesBase64
  };
}
