/** Message sent from popup to background */
export interface DownloadTelegraphZipMessage {
  type: 'downloadTelegraphZip';
  url: string;
}

export interface ExportPdfMessage {
  type: 'exportPdf';
  url: string;
}

export interface ExportMarkdownMessage {
  type: 'exportMarkdown';
  url: string;
}

export type ExtensionMessage =
  | DownloadTelegraphZipMessage
  | ExportPdfMessage
  | ExportMarkdownMessage;

/** Response from background after processing download */
export type DownloadZipResult =
  | { status: 'success'; count: number; total: number }
  | { status: 'no_media'; count: 0 }
  | { status: 'no_images'; count: 0 }
  | { status: 'error'; error: string };

/** Response from background after PDF export */
export type ExportPdfResult =
  | { status: 'success'; filename: string }
  | { status: 'error'; error: string };

/** Response from background after Markdown export */
export type ExportMarkdownResult =
  | { status: 'success'; filename: string }
  | { status: 'error'; error: string };
