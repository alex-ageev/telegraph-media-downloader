/**
 * Telegraph Media Downloader – Export article to Markdown as a ZIP package.
 * ZIP contains article.md and media/ with images; Markdown references local media/ paths.
 */

import JSZip from 'jszip';
import { fetchAndParseArticle, sanitizeFilename, extractArticleMedia } from './parser';
import type { ParsedArticle } from './parser';
import type { ExportMarkdownResult } from './types';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getImageExtension(url: string, contentType?: string): string {
  const mime = contentType ? contentType.split(';')[0].trim().toLowerCase() : '';
  if (MIME_EXT[mime]) return MIME_EXT[mime];
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg)(\?|$)/.test(lower)) return '.jpg';
  if (/\.png(\?|$)/.test(lower)) return '.png';
  if (/\.webp(\?|$)/.test(lower)) return '.webp';
  return '.jpg';
}

/**
 * Build Markdown content with local media paths (media/image-1.jpg, etc.).
 * imageIndexByUrl maps original URL -> 1-based index for media filename.
 */
function buildMarkdownWithLocalMedia(
  article: ParsedArticle,
  imageIndexByUrl: Map<string, number>,
  extensionByIndex: Map<number, string>
): string {
  const lines: string[] = [];
  lines.push(`# ${article.title.trim()}`);
  lines.push('');

  for (const block of article.blocks) {
    switch (block.type) {
      case 'heading': {
        const prefix = '#'.repeat(Math.min(block.level + 1, 6));
        lines.push(`${prefix} ${block.text.trim()}`);
        lines.push('');
        break;
      }
      case 'paragraph': {
        const md = block.content
          .map((c) =>
            c.type === 'text' ? c.value : c.type === 'link' ? `[${c.text || c.href}](${c.href})` : ''
          )
          .join('')
          .trim();
        if (md) {
          lines.push(md);
          lines.push('');
        }
        break;
      }
      case 'list':
        if (block.ordered) {
          block.items.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
        } else {
          block.items.forEach((item) => lines.push(`- ${item}`));
        }
        lines.push('');
        break;
      case 'image': {
        const idx = imageIndexByUrl.get(block.src);
        if (idx !== undefined) {
          const ext = extensionByIndex.get(idx) ?? '.jpg';
          lines.push(`![image](media/image-${idx}${ext})`);
        }
        lines.push('');
        break;
      }
      case 'caption':
        if (block.text.trim()) {
          lines.push(`> *${block.text.trim()}*`);
          lines.push('');
        }
        break;
      case 'link':
        lines.push(`[${block.text.trim() || block.href}](${block.href})`);
        lines.push('');
        break;
      case 'title':
        break;
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export async function exportArticleToMarkdown(pageUrl: string): Promise<ExportMarkdownResult> {
  const url = (pageUrl || '').trim();
  if (!url || (!url.includes('telegra.ph') && !url.includes('graph.org'))) {
    return { status: 'error', error: 'Invalid Telegraph URL' };
  }

  const article = await fetchAndParseArticle(url);
  if (!article) {
    return { status: 'error', error: 'Could not load article' };
  }

  const imageUrls = extractArticleMedia(article);
  const imageIndexByUrl = new Map<string, number>();
  const extensionByIndex = new Map<number, string>();
  let index = 1;
  for (const src of imageUrls) {
    imageIndexByUrl.set(src, index);
    index++;
  }

  const zip = new JSZip();
  const mediaFolder = zip.folder('media');
  if (!mediaFolder) {
    return { status: 'error', error: 'Failed to create media folder' };
  }

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const num = i + 1;
    try {
      const res = await fetch(imageUrl, { credentials: 'omit', mode: 'cors' });
      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength === 0) continue;
      const contentType = res.headers.get('content-type') ?? '';
      const ext = getImageExtension(imageUrl, contentType);
      extensionByIndex.set(num, ext);
      mediaFolder.file(`image-${num}${ext}`, arrayBuffer, { binary: true });
    } catch {
      extensionByIndex.set(num, '.jpg');
    }
  }

  const markdownContent = buildMarkdownWithLocalMedia(article, imageIndexByUrl, extensionByIndex);
  zip.file('article.md', markdownContent, { binary: false });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const baseName = sanitizeFilename(article.title, 60);
  const filename = `${baseName}.zip`;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read ZIP'));
    reader.readAsDataURL(zipBlob);
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
