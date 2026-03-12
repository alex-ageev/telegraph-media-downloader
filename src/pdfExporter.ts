/**
 * Telegraph Media Downloader – Export article to PDF (single file).
 * Images compressed (max 1200px, JPEG ~75%); captions as small gray centered text; spacing between images and text.
 */

import { jsPDF } from 'jspdf';
import { fetchAndParseArticle, sanitizeFilename } from './parser';
import type { ExportPdfResult } from './types';

const MARGIN = 40;
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 6;
const TITLE_FONT_SIZE = 18;
const HEADING_FONT_SIZE = 14;
const BODY_FONT_SIZE = 11;
const CAPTION_FONT_SIZE = 9;
const CAPTION_GRAY = 100; // 0–255 for setTextColor
const SPACE_AFTER_IMAGE = 4;
const SPACE_AFTER_CAPTION = 10;
const SPACE_AFTER_PARAGRAPH = 6;
const SPACE_AFTER_HEADING = 6;
const IMAGE_MAX_HEIGHT_MM = 180;
const IMAGE_MAX_WIDTH_PX = 1200;
const JPEG_QUALITY = 0.75;
const PX_TO_MM = 25.4 / 72;

/**
 * Fetch image, resize to max 1200px width, convert to JPEG at medium quality.
 * Falls back to embedding original image if canvas/compression fails (e.g. in some worker contexts).
 */
async function fetchAndCompressImageForPdf(
  url: string,
  contentWidthMm: number,
  maxHeightMm: number
): Promise<{ w: number; h: number; dataUrl: string } | null> {
  try {
    const res = await fetch(url, { credentials: 'omit', mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const imgW = bitmap.width;
    const imgH = bitmap.height;
    bitmap.close();

    let dataUrl: string;
    let outW: number;
    let outH: number;

    try {
      const scale = Math.min(1, IMAGE_MAX_WIDTH_PX / imgW);
      const newW = Math.round(imgW * scale);
      const newH = Math.round(imgH * scale);
      const canvas = new OffscreenCanvas(newW, newH);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      const bitmap2 = await createImageBitmap(blob);
      ctx.drawImage(bitmap2, 0, 0, imgW, imgH, 0, 0, newW, newH);
      bitmap2.close();
      const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(jpegBlob);
      });
      outW = newW;
      outH = newH;
    } catch {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });
      outW = imgW;
      outH = imgH;
    }

    let wMm = outW * PX_TO_MM;
    let hMm = outH * PX_TO_MM;
    const fitScale = Math.min(contentWidthMm / wMm, maxHeightMm / hMm, 1);
    wMm *= fitScale;
    hMm *= fitScale;
    return { w: wMm, h: hMm, dataUrl };
  } catch {
    return null;
  }
}

export async function exportArticleToPdf(pageUrl: string): Promise<ExportPdfResult> {
  const url = (pageUrl || '').trim();
  if (!url || (!url.includes('telegra.ph') && !url.includes('graph.org'))) {
    return { status: 'error', error: 'Invalid Telegraph URL' };
  }

  const article = await fetchAndParseArticle(url);
  if (!article) {
    return { status: 'error', error: 'Could not load article' };
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;
  const blocks = article.blocks;

  function checkNewPage(needed: number) {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // Title (centered)
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(article.title, CONTENT_WIDTH);
  const titleHeight = titleLines.length * LINE_HEIGHT * 1.4;
  checkNewPage(titleHeight);
  for (let i = 0; i < titleLines.length; i++) {
    doc.text(titleLines[i], PAGE_WIDTH / 2, y + LINE_HEIGHT * 1.4 * (i + 0.5), { align: 'center' });
  }
  y += titleHeight + 12;

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        checkNewPage(HEADING_FONT_SIZE + SPACE_AFTER_HEADING);
        doc.setFontSize(HEADING_FONT_SIZE);
        doc.setFont('helvetica', 'bold');
        const level = Math.min(block.level, 4);
        const hLines = doc.splitTextToSize(block.text, CONTENT_WIDTH);
        for (const line of hLines) {
          checkNewPage(LINE_HEIGHT);
          doc.text(line, MARGIN, y);
          y += LINE_HEIGHT;
        }
        y += SPACE_AFTER_HEADING;
        break;
      }
      case 'paragraph': {
        checkNewPage(LINE_HEIGHT + SPACE_AFTER_PARAGRAPH);
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setFont('helvetica', 'normal');
        const fullText = block.content
          .map((c) => (c.type === 'text' ? c.value : c.type === 'link' ? `${c.text} (${c.href})` : ''))
          .join('');
        if (fullText) {
          doc.setTextColor(0, 0, 0);
          const pLines = doc.splitTextToSize(fullText, CONTENT_WIDTH);
          for (const line of pLines) {
            checkNewPage(LINE_HEIGHT);
            doc.text(line, MARGIN, y);
            y += LINE_HEIGHT;
          }
        }
        y += SPACE_AFTER_PARAGRAPH;
        break;
      }
      case 'list': {
        checkNewPage(LINE_HEIGHT * (block.items.length + 1) + SPACE_AFTER_PARAGRAPH);
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        for (let i = 0; i < block.items.length; i++) {
          const prefix = block.ordered ? `${i + 1}. ` : '• ';
          const itemLines = doc.splitTextToSize(prefix + block.items[i], CONTENT_WIDTH);
          for (const line of itemLines) {
            checkNewPage(LINE_HEIGHT);
            doc.text(line, MARGIN, y);
            y += LINE_HEIGHT;
          }
        }
        y += SPACE_AFTER_PARAGRAPH;
        break;
      }
      case 'image': {
        const dims = await fetchAndCompressImageForPdf(
          block.src,
          CONTENT_WIDTH,
          IMAGE_MAX_HEIGHT_MM
        );
        if (!dims) continue;
        const { w, h, dataUrl } = dims;
        checkNewPage(h + SPACE_AFTER_IMAGE + LINE_HEIGHT);
        try {
          const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(dataUrl, format, MARGIN, y, w, h);
        } catch {
          // Skip if jsPDF fails
        }
        y += h + SPACE_AFTER_IMAGE;
        break;
      }
      case 'caption': {
        const capLineHeight = 4;
        checkNewPage(capLineHeight + SPACE_AFTER_CAPTION);
        y += 2;
        doc.setFontSize(CAPTION_FONT_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(CAPTION_GRAY, CAPTION_GRAY, CAPTION_GRAY);
        const capLines = doc.splitTextToSize(block.text, CONTENT_WIDTH);
        for (const line of capLines) {
          checkNewPage(capLineHeight);
          doc.text(line, PAGE_WIDTH / 2, y + capLineHeight * 0.7, { align: 'center' });
          y += capLineHeight;
        }
        doc.setTextColor(0, 0, 0);
        y += SPACE_AFTER_CAPTION;
        break;
      }
      case 'link':
      case 'title':
        if (block.type === 'link') {
          doc.setFontSize(BODY_FONT_SIZE);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          const linkText = block.text ? `${block.text} (${block.href})` : block.href;
          const linkLines = doc.splitTextToSize(linkText, CONTENT_WIDTH);
          for (const line of linkLines) {
            checkNewPage(LINE_HEIGHT);
            doc.text(line, MARGIN, y);
            y += LINE_HEIGHT;
          }
          y += SPACE_AFTER_PARAGRAPH;
        }
        break;
    }
  }

  const pdfBlob = doc.output('blob');
  const baseName = sanitizeFilename(article.title, 60);
  const filename = `${baseName}.pdf`;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read PDF'));
    reader.readAsDataURL(pdfBlob);
  });

  await new Promise<void>((resolve, reject) => {
    chrome.downloads.download(
      { url: dataUrl, filename, saveAs: true },
      (id) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError?.message));
        else resolve();
      }
    );
  });

  return { status: 'success', filename };
}
