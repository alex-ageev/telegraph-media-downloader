/**
 * Telegraph Media Downloader – Download all media (images, videos, GIFs) as ZIP.
 */

import JSZip from 'jszip';
import {
  getPagePath,
  getPageOrigin,
  fetchTelegraphPage,
  extractAllMediaUrlsFromNodes,
  sanitizeFilename,
  normalizeUrl,
} from './parser';
import type { DownloadZipResult } from './types';

function isMediaUrl(s: string): boolean {
  const lower = s.toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

/**
 * Extract media URLs from raw HTML (fallback when API has no content).
 */
function extractMediaUrlsFromHtml(html: string, pageOrigin: string): string[] {
  const urls = new Set<string>();
  let m: RegExpExecArray | null;
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((m = imgRegex.exec(html)) !== null) {
    const u = normalizeUrl(m[1], pageOrigin);
    if (isMediaUrl(u)) urls.add(u);
  }
  const videoRegex = /<video[^>]+src=["']([^"']+)["']/gi;
  while ((m = videoRegex.exec(html)) !== null) {
    const u = normalizeUrl(m[1], pageOrigin);
    if (isMediaUrl(u)) urls.add(u);
  }
  const sourceRegex = /<source[^>]+src=["']([^"']+)["']/gi;
  while ((m = sourceRegex.exec(html)) !== null) {
    const u = normalizeUrl(m[1], pageOrigin);
    if (isMediaUrl(u)) urls.add(u);
  }
  const hrefRegex = /href=["'](https:\/\/(?:telegra\.ph|graph\.org)\/file\/[^"']+)["']/gi;
  while ((m = hrefRegex.exec(html)) !== null) {
    urls.add(m[1].trim());
  }
  return Array.from(urls);
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
};

function getFileName(index: number, url: string, contentType?: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').pop() || `media_${index + 1}`;
    const hasExt = /\.[a-zA-Z0-9]+$/.test(base);
    if (hasExt) return base;
    const mime = contentType ? contentType.split(';')[0].trim().toLowerCase() : '';
    const ext = MIME_EXT[mime] ?? '.jpg';
    return `${base || `media_${index + 1}`}${ext}`;
  } catch {
    return `media_${index + 1}.jpg`;
  }
}

export async function runDownloadZip(pageUrl: string): Promise<DownloadZipResult> {
  const url = (pageUrl || '').trim();
  const isTelegraph = url.includes('telegra.ph') || url.includes('graph.org');
  if (!url || !isTelegraph) {
    return { status: 'error', error: 'Invalid Telegraph URL (use telegra.ph or graph.org)' };
  }

  const origin = getPageOrigin(url);
  const page = await fetchTelegraphPage(url);
  let mediaUrls: string[] = [];
  let articleTitle = 'telegraph-media';

  if (page) {
    articleTitle = page.title;
    mediaUrls = extractAllMediaUrlsFromNodes(page.content, origin);
  }

  if (mediaUrls.length === 0) {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) {
      return { status: 'error', error: `Page failed: ${res.status}` };
    }
    const html = await res.text();
    mediaUrls = extractMediaUrlsFromHtml(html, origin);
    const path = getPagePath(url);
    if (path) articleTitle = path.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || articleTitle;
  }

  if (mediaUrls.length === 0) {
    return { status: 'no_media', count: 0 };
  }

  const zip = new JSZip();
  let downloaded = 0;
  const usedNames = new Set<string>();

  for (let i = 0; i < mediaUrls.length; i++) {
    const mediaUrl = mediaUrls[i];
    try {
      const mediaRes = await fetch(mediaUrl, { credentials: 'omit' });
      if (!mediaRes.ok) continue;
      const blob = await mediaRes.blob();
      const contentType = mediaRes.headers.get('content-type') ?? '';
      let name = getFileName(i, mediaUrl, contentType);
      while (usedNames.has(name)) {
        const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
        const base = name.slice(0, name.length - ext.length);
        name = `${base}_${usedNames.size}${ext}`;
      }
      usedNames.add(name);
      zip.file(name, blob, { binary: true });
      downloaded++;
    } catch {
      // skip failed file
    }
  }

  if (downloaded === 0) {
    return { status: 'error', error: 'Could not download any media' };
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const baseName = sanitizeFilename(articleTitle, 60);
  const zipFilename = `${baseName}.zip`;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read ZIP blob'));
    reader.readAsDataURL(zipBlob);
  });

  await new Promise<void>((resolve, reject) => {
    chrome.downloads.download(
      { url: dataUrl, filename: zipFilename, saveAs: true },
      (id) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError?.message));
        else resolve();
      }
    );
  });

  return { status: 'success', count: downloaded, total: mediaUrls.length };
}
