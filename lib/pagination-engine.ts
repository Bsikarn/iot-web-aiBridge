import { PNG } from 'pngjs';
import { Resvg } from '@resvg/resvg-js';

// Use require for MathJax CommonJS modules with correct internal paths
/* eslint-disable @typescript-eslint/no-require-imports */
const { mathjax } = require('mathjax-full/js/mathjax');
const { TeX } = require('mathjax-full/js/input/tex');
const { SVG } = require('mathjax-full/js/output/svg');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages');
/* eslint-enable @typescript-eslint/no-require-imports */

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

// 5x7 Bitmap Font Data for System-Font Independent Crisp Text Rendering
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
  '•': [0x00, 0x1c, 0x1c, 0x1c, 0x00]
};

// Canvas Page Wrapper around pngjs PNG buffer (250x122 Landscape)
class PageCanvas {
  public png: PNG;

  constructor() {
    this.png = new PNG({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
    // Fill 100% solid white background (255, 255, 255, 255)
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
    const fontData = BITMAP_FONT[char] || BITMAP_FONT['?'] || BITMAP_FONT[' '];
    if (!fontData) return 6;
    for (let col = 0; col < 5; col++) {
      const bits = fontData[col] || 0;
      for (let row = 0; row < 7; row++) {
        if ((bits >> row) & 1) {
          this.setPixel(x + col, y + row);
        }
      }
    }
    return 6;
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

  drawMathPng(mathPng: PNG, startX: number, startY: number) {
    for (let y = 0; y < mathPng.height; y++) {
      for (let x = 0; x < mathPng.width; x++) {
        const targetX = startX + x;
        const targetY = startY + y;
        if (targetX >= PAGE_WIDTH || targetY >= PAGE_HEIGHT) continue;

        const srcIdx = (mathPng.width * y + x) << 2;
        const r = mathPng.data[srcIdx];
        const g = mathPng.data[srcIdx + 1];
        const b = mathPng.data[srcIdx + 2];
        const a = mathPng.data[srcIdx + 3];

        if (a > 0 && (r + g + b) / 3 <= 200) {
          this.setPixel(targetX, targetY, true);
        }
      }
    }
  }

  toBase64Png(): string {
    const buffer = PNG.sync.write(this.png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}

// Initialize MathJax TeX-to-SVG Adapter
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const htmlDoc = mathjax.document('', {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: 'none' })
});

// Convert all font-relative ex/em units and currentColor into explicit px and solid #000000 hex colors
function convertExEmToPxAndInlineColors(svgStr: string): string {
  return svgStr
    .replace(/width="([0-9.]+)ex"/gi, (_, val) => `width="${Math.max(10, Math.round(parseFloat(val) * 8))}px"`)
    .replace(/height="([0-9.]+)ex"/gi, (_, val) => `height="${Math.max(10, Math.round(parseFloat(val) * 8))}px"`)
    .replace(/width="([0-9.]+)em"/gi, (_, val) => `width="${Math.max(10, Math.round(parseFloat(val) * 16))}px"`)
    .replace(/height="([0-9.]+)em"/gi, (_, val) => `height="${Math.max(10, Math.round(parseFloat(val) * 16))}px"`)
    .replace(/style="([^"]*)"/gi, (_, styleVal) => {
      const fixedStyle = styleVal
        .replace(/([0-9.]+)ex/gi, (_: string, v: string) => `${Math.round(parseFloat(v) * 8)}px`)
        .replace(/([0-9.]+)em/gi, (_: string, v: string) => `${Math.round(parseFloat(v) * 16)}px`);
      return `style="${fixedStyle}"`;
    })
    .replace(/fill="currentColor"/gi, 'fill="#000000"')
    .replace(/stroke="currentColor"/gi, 'stroke="#000000"')
    .replace(/currentColor/gi, '#000000');
}

// Convert LaTeX string into an SVG string element using MathJax and rasterize to PNG
function renderMathJaxToPng(latexStr: string, isBlock = false): { png: PNG; width: number; height: number } | null {
  try {
    const node = htmlDoc.convert(latexStr, { display: isBlock });
    let fullSvgHtml = adaptor.innerHTML(node);

    // Convert font-relative ex/em units to explicit pixel values
    fullSvgHtml = convertExEmToPxAndInlineColors(fullSvgHtml);

    // Extract width and height in px
    const widthMatch = fullSvgHtml.match(/width="([0-9.]+)px"/i);
    const heightMatch = fullSvgHtml.match(/height="([0-9.]+)px"/i);

    let wPx = widthMatch ? Math.ceil(parseFloat(widthMatch[1])) : 120;
    let hPx = heightMatch ? Math.ceil(parseFloat(heightMatch[1])) : 24;

    wPx = Math.max(10, Math.min(240, wPx));
    hPx = Math.max(10, Math.min(60, hPx));

    // Construct full self-contained SVG with explicit solid white root background and explicit px dimensions
    const completeSvg = `<svg width="${wPx}" height="${hPx}" viewBox="0 0 ${wPx} ${hPx}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${wPx}" height="${hPx}" fill="#ffffff" />
      <g color="#000000" fill="#000000" stroke="#000000">${fullSvgHtml}</g>
    </svg>`;

    const resvg = new Resvg(completeSvg, {
      fitTo: { mode: 'width', value: wPx },
      background: '#ffffff'
    });

    const pngBuffer = resvg.render().asPng();
    const png = PNG.sync.read(pngBuffer);

    return { png, width: wPx, height: hPx };
  } catch (err) {
    console.error("renderMathJaxToPng error:", err);
    return null;
  }
}

interface RenderElement {
  type: 'text' | 'header' | 'bullet' | 'math';
  content: string;
  mathPng?: { png: PNG; width: number; height: number };
  height: number;
}

// Wrap text string into lines that fit within 240px width (~38-40 chars max per line)
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
 * Universal Visual Math Equations & System-Font Independent E-Ink Engine (LANDSCAPE 250x122px)
 * Converts AI answers (Markdown + MathJax TeX SVG) into 250x122 Base64 PNG images.
 */
export function renderEInkPages(rawText: string): RenderedPagePayload {
  if (!rawText || rawText.trim() === '') {
    return createEmptyPagePayload("No answer");
  }

  const elements: RenderElement[] = [];

  // Parse LaTeX math blocks ($$...$$ or \[...\]) and inline math ($...$ or \(...\))
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
  const textParts = rawText.split(mathRegex);

  for (const part of textParts) {
    if (!part) continue;

    if (part.startsWith('$$') && part.endsWith('$$')) {
      const mathCode = part.slice(2, -2).trim();
      const mathResult = renderMathJaxToPng(mathCode, true);
      if (mathResult) {
        elements.push({
          type: 'math',
          content: mathCode,
          mathPng: mathResult,
          height: Math.max(16, mathResult.height)
        });
      } else {
        const wrapped = wrapTextToLines(mathCode, 36);
        for (const wLine of wrapped) {
          elements.push({ type: 'text', content: wLine, height: 11 });
        }
      }
    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const mathCode = part.slice(2, -2).trim();
      const mathResult = renderMathJaxToPng(mathCode, true);
      if (mathResult) {
        elements.push({
          type: 'math',
          content: mathCode,
          mathPng: mathResult,
          height: Math.max(16, mathResult.height)
        });
      } else {
        const wrapped = wrapTextToLines(mathCode, 36);
        for (const wLine of wrapped) {
          elements.push({ type: 'text', content: wLine, height: 11 });
        }
      }
    } else if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\(') && part.endsWith('\\)'))) {
      const mathCode = part.startsWith('$') ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
      const mathResult = renderMathJaxToPng(mathCode, false);
      if (mathResult) {
        elements.push({
          type: 'math',
          content: mathCode,
          mathPng: mathResult,
          height: Math.max(14, mathResult.height)
        });
      } else {
        const wrapped = wrapTextToLines(mathCode, 36);
        for (const wLine of wrapped) {
          elements.push({ type: 'text', content: wLine, height: 11 });
        }
      }
    } else {
      // Standard Markdown / Plain text lines
      const rawLines = part.split('\n');
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('# ')) {
          const wrapped = wrapTextToLines(trimmed.replace(/^#\s+/, ''), 30);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 14 });
          }
        } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
          const wrapped = wrapTextToLines(trimmed.replace(/^#{2,3}\s+/, ''), 34);
          for (const wLine of wrapped) {
            elements.push({ type: 'header', content: wLine, height: 12 });
          }
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const wrapped = wrapTextToLines('• ' + trimmed.replace(/^[-*•]\s+/, ''), 38);
          for (const wLine of wrapped) {
            elements.push({ type: 'bullet', content: wLine, height: 11 });
          }
        } else {
          const wrapped = wrapTextToLines(trimmed, 38);
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
    currentY += elem.height + 2;
  }

  if (currentPageElements.length > 0) {
    pageElementsList.push(currentPageElements);
  }

  const totalPages = pageElementsList.length || 1;
  const pagesBase64: string[] = [];

  // Render each landscape page using hybrid system-font independent bitmap canvas + MathJax math PNGs
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pageCanvas = new PageCanvas();
    const pElements = pageElementsList[pIdx] || [];
    let yPos = START_Y;

    for (const elem of pElements) {
      if (elem.type === 'header') {
        pageCanvas.drawString(elem.content, PADDING, yPos);
        pageCanvas.drawHorizontalLine(PADDING, PADDING + elem.content.length * 6, yPos + 9);
      } else if (elem.type === 'math' && elem.mathPng) {
        pageCanvas.drawMathPng(elem.mathPng.png, PADDING, yPos);
      } else {
        pageCanvas.drawString(elem.content, PADDING, yPos);
      }
      yPos += elem.height + 2;
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

function createEmptyPagePayload(message: string): RenderedPagePayload {
  const pageCanvas = new PageCanvas();
  pageCanvas.drawString(message, PADDING, START_Y);
  pageCanvas.drawHeaderBadge(1, 1);
  return {
    success: true,
    total_pages: 1,
    pages: [pageCanvas.toBase64Png()]
  };
}
