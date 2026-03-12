/** Message sent from popup to background */
export interface DownloadTelegraphZipMessage {
  type: 'downloadTelegraphZip';
  url: string;
}

export type ExtensionMessage = DownloadTelegraphZipMessage;

/** Response from background after processing download */
export type DownloadZipResult =
  | { status: 'success'; count: number; total: number }
  | { status: 'no_media'; count: 0 }
  | { status: 'no_images'; count: 0 }
  | { status: 'error'; error: string };
