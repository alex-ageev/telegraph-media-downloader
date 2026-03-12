/**
 * Telegraph Media Downloader – Article parser (API-based).
 * Extracts article content from Telegraph API getPage response.
 */

export interface TelegraphNode {
  tag?: string;
  attrs?: { src?: string; href?: string };
  children?: (TelegraphNode | string)[];
}

/** Inline content inside a paragraph (text or link). */
export type InlineContent =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; text: string };

export type ArticleBlock =
  | { type: 'title'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; content: InlineContent[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'caption'; text: string }
  | { type: 'link'; href: string; text: string };

export interface ParsedArticle {
  title: string;
  blocks: ArticleBlock[];
}

export interface TelegraphApiPage {
  ok: boolean;
  result?: {
    title?: string;
    content?: (TelegraphNode | string)[];
  };
}

const TELEGRAPH_API = 'https://api.telegra.ph';

function isMediaUrl(s: string): boolean {
  const lower = s.toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

export function normalizeUrl(src: string, pageOrigin: string): string {
  let s = src.trim();
  if (s.startsWith('//')) s = 'https:' + s;
  else if (s.startsWith('/')) s = pageOrigin + s;
  return s;
}

/**
 * Get page path from a Telegraph URL (telegra.ph or graph.org).
 */
export function getPagePath(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Get page origin from URL (e.g. https://telegra.ph).
 */
export function getPageOrigin(pageUrl: string): string {
  try {
    return new URL(pageUrl).origin;
  } catch {
    return 'https://telegra.ph';
  }
}

/**
 * Recursively collect text from node children (no tags, just concatenated text).
 */
function getTextFromChildren(nodes: (TelegraphNode | string)[] | undefined): string {
  if (!nodes || !Array.isArray(nodes)) return '';
  return nodes
    .map((n) => (typeof n === 'string' ? n : getTextFromChildren(n.children)))
    .join('')
    .trim();
}

/**
 * Parse paragraph/link children into inline content (text and link segments).
 */
function getInlineContentFromChildren(
  nodes: (TelegraphNode | string)[] | undefined,
  pageOrigin: string
): InlineContent[] {
  const out: InlineContent[] = [];
  if (!nodes || !Array.isArray(nodes)) return out;
  for (const n of nodes) {
    if (typeof n === 'string') {
      if (n.trim()) out.push({ type: 'text', value: n });
      continue;
    }
    const tag = (n.tag || '').toLowerCase();
    const attrs = n.attrs || {};
    if (tag === 'a' && attrs.href) {
      const href = normalizeUrl(attrs.href, pageOrigin);
      const text = getTextFromChildren(n.children);
      out.push({ type: 'link', href, text: text || href });
    } else {
      const text = getTextFromChildren(n.children);
      if (text) out.push({ type: 'text', value: text });
    }
  }
  return out;
}

/** Collect list item texts from ul/ol children (li elements). */
function getListItemsFromChildren(nodes: (TelegraphNode | string)[] | undefined): string[] {
  const items: string[] = [];
  if (!nodes || !Array.isArray(nodes)) return items;
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    if ((n.tag || '').toLowerCase() === 'li') {
      const text = getTextFromChildren(n.children);
      if (text) items.push(text);
    }
  }
  return items;
}

/** Video file extensions – exclude from image exports. */
const VIDEO_EXT = /\.(mp4|webm|mov|ogv)(\?|$)/i;

/**
 * Check if URL is likely a static image (not video).
 * Includes external image URLs (e.g. images.openai.com) with or without file extension.
 * Excludes video extensions and .gif; <video>/<source> are never emitted.
 */
export function isStaticImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!isMediaUrl(url)) return false;
  if (VIDEO_EXT.test(lower)) return false;
  if (lower.endsWith('.gif') || lower.includes('.gif?')) return false;
  return true;
}

/**
 * Parse Telegraph API content nodes into a flat list of blocks.
 * - Skips <video> and <source> (no video/GIF-as-video in PDF/MD).
 * - Only emits 'image' for <img> (static images).
 */
export function parseContentToBlocks(
  nodes: (TelegraphNode | string)[] | undefined,
  pageOrigin: string
): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  if (!nodes || !Array.isArray(nodes)) return blocks;

  for (const node of nodes) {
    if (typeof node === 'string') continue;
    const tag = (node.tag || '').toLowerCase();
    const attrs = node.attrs || {};
    const children = node.children;

    switch (tag) {
      case 'h1':
        blocks.push({ type: 'heading', level: 1, text: getTextFromChildren(children) });
        break;
      case 'h2':
        blocks.push({ type: 'heading', level: 2, text: getTextFromChildren(children) });
        break;
      case 'h3':
        blocks.push({ type: 'heading', level: 3, text: getTextFromChildren(children) });
        break;
      case 'h4':
        blocks.push({ type: 'heading', level: 4, text: getTextFromChildren(children) });
        break;
      case 'p': {
        const content = getInlineContentFromChildren(children, pageOrigin);
        if (content.length) blocks.push({ type: 'paragraph', content });
        break;
      }
      case 'ul': {
        const items = getListItemsFromChildren(children);
        if (items.length) blocks.push({ type: 'list', ordered: false, items });
        break;
      }
      case 'ol': {
        const items = getListItemsFromChildren(children);
        if (items.length) blocks.push({ type: 'list', ordered: true, items });
        break;
      }
      case 'img':
        if (attrs.src && isStaticImageUrl(normalizeUrl(attrs.src, pageOrigin))) {
          blocks.push({
            type: 'image',
            src: normalizeUrl(attrs.src, pageOrigin),
            alt: undefined,
          });
        }
        break;
      case 'a':
        if (attrs.href) {
          const href = normalizeUrl(attrs.href, pageOrigin);
          const text = getTextFromChildren(children);
          if (isStaticImageUrl(href)) {
            blocks.push({ type: 'image', src: href, alt: undefined });
          } else {
            blocks.push({ type: 'link', href, text: text || href });
          }
        }
        break;
      case 'figcaption': {
        const text = getTextFromChildren(children);
        if (text) blocks.push({ type: 'caption', text });
        break;
      }
      case 'video':
      case 'source':
        // Skip video and source elements (no video/GIF in PDF/Markdown).
        break;
      default:
        // Recursively parse unknown block-level containers (e.g. figure, div).
        if (children?.length) {
          blocks.push(...parseContentToBlocks(children, pageOrigin));
        }
        break;
    }
  }

  return blocks;
}

/**
 * Extract article media (image URLs) from parsed article in document order.
 * Scans blocks for <img> sources; skips video/GIF-as-video (only static images in blocks).
 * Use for Markdown/PDF ZIP packages that need ordered image list.
 */
export function extractArticleMedia(article: ParsedArticle): string[] {
  return article.blocks
    .filter((b): b is Extract<typeof b, { type: 'image' }> => b.type === 'image')
    .map((b) => b.src);
}

/**
 * Fetch article from Telegraph API and return parsed structure.
 */
export async function fetchAndParseArticle(pageUrl: string): Promise<ParsedArticle | null> {
  const path = getPagePath(pageUrl);
  if (!path) return null;

  const origin = getPageOrigin(pageUrl);
  const apiUrl = `${TELEGRAPH_API}/getPage/${encodeURIComponent(path)}?return_content=true`;
  const res = await fetch(apiUrl, { credentials: 'omit' });
  if (!res.ok) return null;

  const data: TelegraphApiPage = await res.json();
  if (!data?.ok || !data?.result) return null;

  const title = data.result.title ?? 'Untitled';
  const blocks = parseContentToBlocks(data.result.content, origin);

  return { title, blocks };
}

/**
 * Extract all media URLs from API content (images, video, source, file links).
 * Used for "Download Media" ZIP; not for PDF/Markdown (those use blocks with static images only).
 */
export function extractAllMediaUrlsFromNodes(
  nodes: (TelegraphNode | string)[] | undefined,
  pageOrigin: string
): string[] {
  const out = new Set<string>();
  if (!nodes || !Array.isArray(nodes)) return [];

  function walk(n: (TelegraphNode | string)[] | undefined) {
    if (!n) return;
    for (const node of n) {
      if (typeof node === 'string') continue;
      const tag = (node.tag || '').toLowerCase();
      const attrs = node.attrs || {};
      if (tag === 'img' && attrs.src && isMediaUrl(normalizeUrl(attrs.src, pageOrigin))) {
        out.add(normalizeUrl(attrs.src, pageOrigin));
      }
      if (tag === 'video' && attrs.src && isMediaUrl(normalizeUrl(attrs.src, pageOrigin))) {
        out.add(normalizeUrl(attrs.src, pageOrigin));
      }
      if (tag === 'source' && attrs.src && isMediaUrl(normalizeUrl(attrs.src, pageOrigin))) {
        out.add(normalizeUrl(attrs.src, pageOrigin));
      }
      if (tag === 'a' && attrs.href) {
        const href = normalizeUrl(attrs.href, pageOrigin);
        if (
          isMediaUrl(href) &&
          (href.includes('/file/') || /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)(\?|$)/i.test(href))
        ) {
          out.add(href);
        }
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return Array.from(out);
}

/**
 * Fetch raw page from API (title + content). Use for both parsing and media URL extraction.
 */
export async function fetchTelegraphPage(
  pageUrl: string
): Promise<{ title: string; content: (TelegraphNode | string)[] } | null> {
  const path = getPagePath(pageUrl);
  if (!path) return null;
  const origin = getPageOrigin(pageUrl);
  const apiUrl = `${TELEGRAPH_API}/getPage/${encodeURIComponent(path)}?return_content=true`;
  const res = await fetch(apiUrl, { credentials: 'omit' });
  if (!res.ok) return null;
  const data: TelegraphApiPage = await res.json();
  if (!data?.ok || !data?.result?.content) return null;
  const title = data.result.title ?? 'Untitled';
  return { title, content: data.result.content };
}

/**
 * Sanitize a string for use in filenames (alphanumeric, dash, underscore).
 */
export function sanitizeFilename(name: string, maxLength: number = 80): string {
  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
  return sanitized || 'telegraph-article';
}
