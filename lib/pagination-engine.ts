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

// Initialize MathJax TeX-to-SVG Adapter
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const htmlDoc = mathjax.document('', {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: 'none' })
});

// Convert LaTeX string into an SVG string element using MathJax
function convertLatexToSvg(latexStr: string, isBlock = false): { svgInner: string; width: number; height: number } {
  try {
    const node = htmlDoc.convert(latexStr, { display: isBlock });
    const fullSvgHtml = adaptor.innerHTML(node);
    
    // Extract width and height from MathJax SVG attributes
    const widthMatch = fullSvgHtml.match(/width="([^"]+)"/);
    const heightMatch = fullSvgHtml.match(/height="([^"]+)"/);
    
    let widthEx = 10;
    let heightEx = 10;
    
    if (widthMatch) {
      const val = parseFloat(widthMatch[1]);
      if (!isNaN(val)) widthEx = Math.max(8, val * 8); // Scale ex to approx pixels
    }
    if (heightMatch) {
      const val = parseFloat(heightMatch[1]);
      if (!isNaN(val)) heightEx = Math.max(8, val * 8);
    }
    
    // Extract inner content of <svg>...</svg>
    const innerMatch = fullSvgHtml.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const svgInner = innerMatch ? innerMatch[1] : fullSvgHtml;
    
    return {
      svgInner,
      width: Math.min(240, widthEx),
      height: Math.min(60, heightEx)
    };
  } catch (err) {
    console.error("MathJax conversion error:", err);
    return { svgInner: `<text fill="#000">${escapeXml(latexStr)}</text>`, width: 100, height: 12 };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface RenderElement {
  type: 'text' | 'header' | 'bullet' | 'math';
  content: string;
  mathSvg?: { svgInner: string; width: number; height: number };
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
 * Universal Visual Math Equations & Markdown E-Ink Engine (LANDSCAPE 250x122px)
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
      const mathSvg = convertLatexToSvg(mathCode, true);
      elements.push({
        type: 'math',
        content: mathCode,
        mathSvg,
        height: Math.max(16, mathSvg.height)
      });
    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const mathCode = part.slice(2, -2).trim();
      const mathSvg = convertLatexToSvg(mathCode, true);
      elements.push({
        type: 'math',
        content: mathCode,
        mathSvg,
        height: Math.max(16, mathSvg.height)
      });
    } else if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\(') && part.endsWith('\\)'))) {
      const mathCode = part.startsWith('$') ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
      const mathSvg = convertLatexToSvg(mathCode, false);
      elements.push({
        type: 'math',
        content: mathCode,
        mathSvg,
        height: Math.max(14, mathSvg.height)
      });
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

  // Render each landscape page SVG -> PNG -> 1-Bit Monochrome Base64
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pElements = pageElementsList[pIdx] || [];
    let yPos = START_Y;
    let svgContent = '';

    for (const elem of pElements) {
      if (elem.type === 'header') {
        svgContent += `<text x="${PADDING}" y="${yPos + 9}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">${escapeXml(elem.content)}</text>`;
        svgContent += `<line x1="${PADDING}" y1="${yPos + 12}" x2="${PADDING + elem.content.length * 6}" y2="${yPos + 12}" stroke="#000000" stroke-width="1"/>`;
      } else if (elem.type === 'math' && elem.mathSvg) {
        // Embed MathJax TeX SVG graphics at exact (x, y) offset
        const scale = elem.mathSvg.height > 40 ? 0.75 : 0.9;
        svgContent += `<g transform="translate(${PADDING}, ${yPos}) scale(${scale})">${elem.mathSvg.svgInner}</g>`;
      } else {
        svgContent += `<text x="${PADDING}" y="${yPos + 8}" font-family="Arial, sans-serif" font-size="9" fill="#000000">${escapeXml(elem.content)}</text>`;
      }
      yPos += elem.height + 2;
    }

    // Build page composite SVG
    const pageSvg = `<svg width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>
      <line x1="${PADDING}" y1="12" x2="${PAGE_WIDTH - PADDING}" y2="12" stroke="#000000" stroke-width="1"/>
      <text x="${PAGE_WIDTH - PADDING}" y="10" font-family="Arial, sans-serif" font-size="8" font-weight="bold" text-anchor="end" fill="#000000">[${pIdx + 1}/${totalPages}]</text>
      ${svgContent}
    </svg>`;

    // Rasterize SVG -> PNG -> 1-Bit Monochrome
    const base64Png = rasterizeSvgToMonochromeBase64(pageSvg);
    pagesBase64.push(base64Png);
  }

  return {
    success: true,
    total_pages: totalPages,
    pages: pagesBase64
  };
}

// Convert composite Page SVG to 1-Bit High-Contrast Monochrome Base64 PNG
function rasterizeSvgToMonochromeBase64(svgString: string): string {
  try {
    const resvg = new Resvg(svgString, {
      fitTo: { mode: 'width', value: PAGE_WIDTH },
      background: '#ffffff'
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Binarize pixels to pure black (#000000) and pure white (#ffffff)
    const png = PNG.sync.read(pngBuffer);
    for (let i = 0; i < png.data.length; i += 4) {
      const avg = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
      const val = avg <= 200 ? 0 : 255;
      png.data[i] = val;
      png.data[i + 1] = val;
      png.data[i + 2] = val;
      png.data[i + 3] = 255;
    }

    const binarizedBuffer = PNG.sync.write(png);
    return `data:image/png;base64,${binarizedBuffer.toString('base64')}`;
  } catch (err) {
    console.error("Resvg SVG rasterization error:", err);
    return createEmptyPagePayload("Rasterization Error").pages[0];
  }
}

function createEmptyPagePayload(message: string): RenderedPagePayload {
  const svg = `<svg width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>
    <text x="10" y="30" font-family="Arial, sans-serif" font-size="10" fill="#000000">${escapeXml(message)}</text>
    <text x="240" y="10" font-family="Arial, sans-serif" font-size="8" text-anchor="end" fill="#000000">[1/1]</text>
  </svg>`;
  return {
    success: true,
    total_pages: 1,
    pages: [rasterizeSvgToMonochromeBase64(svg)]
  };
}
