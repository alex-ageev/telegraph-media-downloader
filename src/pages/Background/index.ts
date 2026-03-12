import JSZip from 'jszip';
import type { DownloadZipResult, ExtensionMessage } from '../../types';

/** Telegraph API content node (simplified). */
interface TelegraphNode {
  tag?: string;
  attrs?: { src?: string; href?: string };
  children?: (TelegraphNode | string)[];
}

function isMediaUrl(s: string): boolean {
  const lower = s.toLowerCase();
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  );
}

function normalizeUrl(src: string, pageOrigin: string): string {
  let s = src.trim();
  if (s.startsWith('//')) s = 'https:' + s;
  else if (s.startsWith('/')) s = pageOrigin + s;
  return s;
}

/**
 * Extract media URLs from Telegraph API content nodes (recursive).
 */
function extractUrlsFromNodes(nodes: (TelegraphNode | string)[] | undefined, pageOrigin: string, out: Set<string>): void {
  if (!nodes || !Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (typeof node === 'string') continue;
    const tag = node.tag?.toLowerCase();
    const attrs = node.attrs;
    if (tag === 'img' && attrs?.src && isMediaUrl(normalizeUrl(attrs.src, pageOrigin))) {
      out.add(normalizeUrl(attrs.src, pageOrigin));
    }
    if (tag === 'video' && attrs?.src && isMediaUrl(normalizeUrl(attrs.src, pageOrigin))) {
      out.add(normalizeUrl(attrs.src, pageOrigin));
    }
    if (tag === 'source' && attrs?.src && isMediaUrl(normalizeUrl(attrs.src, pageOrigin))) {
      out.add(normalizeUrl(attrs.src, pageOrigin));
    }
    if (tag === 'a' && attrs?.href) {
      const href = normalizeUrl(attrs.href, pageOrigin);
      if (isMediaUrl(href) && (href.includes('/file/') || /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)(\?|$)/i.test(href))) {
        out.add(href);
      }
    }
    extractUrlsFromNodes(node.children, pageOrigin, out);
  }
}

/**
 * Extract page path from a Telegraph URL (telegra.ph or graph.org).
 */
function getPagePath(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Fetch media URLs via Telegraph API (works for graph.org and telegra.ph; gets full content including teletype.in images).
 */
async function fetchMediaUrlsFromApi(pagePath: string, pageOrigin: string): Promise<string[]> {
  const apiUrl = `https://api.telegra.ph/getPage/${encodeURIComponent(pagePath)}?return_content=true`;
  const res = await fetch(apiUrl, { credentials: 'omit' });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data?.ok || !data?.result?.content) return [];
  const out = new Set<string>();
  extractUrlsFromNodes(data.result.content, pageOrigin, out);
  return Array.from(out);
}

/**
 * Extract media URLs from raw HTML (fallback for pages that embed telegra.ph/graph.org images in HTML).
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

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (r: DownloadZipResult) => void) => {
    if (message.type === 'downloadTelegraphZip') {
      runDownloadZip(message.url)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ status: 'error', error: String(err) }));
      return true;
    }
  }
);

async function runDownloadZip(pageUrl: string): Promise<DownloadZipResult> {
  const url = (pageUrl || '').trim();
  const isTelegraph = url.includes('telegra.ph') || url.includes('graph.org');
  if (!url || !isTelegraph) {
    return { status: 'error', error: 'Invalid Telegraph URL (use telegra.ph or graph.org)' };
  }

  let origin = 'https://telegra.ph';
  try {
    origin = new URL(url).origin;
  } catch {
    // keep default
  }

  const path = getPagePath(url);
  let mediaUrls: string[] = [];

  if (path) {
    mediaUrls = await fetchMediaUrlsFromApi(path, origin);
  }

  if (mediaUrls.length === 0) {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) {
      return { status: 'error', error: `Page failed: ${res.status}` };
    }
    const html = await res.text();
    mediaUrls = extractMediaUrlsFromHtml(html, origin);
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
  const slug = url
    .replace(/^https?:\/\/(?:telegra\.ph|graph\.org)\//, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50) || 'telegraph-media';
  const zipFilename = `${slug}_media.zip`;

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
