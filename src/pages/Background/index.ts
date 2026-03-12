/**
 * Telegraph Media Downloader – Background service worker.
 * Handles: Download Media (ZIP), Export as PDF, Export as Markdown.
 */

import type { ExtensionMessage, DownloadZipResult, ExportPdfResult, ExportMarkdownResult } from '../../types';
import { runDownloadZip } from '../../mediaDownloader';
import { exportArticleToPdf } from '../../pdfExporter';
import { exportArticleToMarkdown } from '../../markdownExporter';

type BackgroundResponse = DownloadZipResult | ExportPdfResult | ExportMarkdownResult;

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (r: BackgroundResponse) => void
  ) => {
    if (message.type === 'downloadTelegraphZip') {
      runDownloadZip(message.url)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ status: 'error', error: String(err) }));
      return true;
    }
    if (message.type === 'exportPdf') {
      exportArticleToPdf(message.url)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ status: 'error', error: String(err) }));
      return true;
    }
    if (message.type === 'exportMarkdown') {
      exportArticleToMarkdown(message.url)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ status: 'error', error: String(err) }));
      return true;
    }
    return false;
  }
);
