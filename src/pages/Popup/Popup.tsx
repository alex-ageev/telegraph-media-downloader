import React, { useEffect, useState } from 'react';
import { getCurrentTelegraphTab } from '../../../utils/chrome-api';
import type { DownloadZipResult, ExportPdfResult, ExportMarkdownResult } from '../../types';
import './Popup.css';

type PopupStatus = 'success' | 'error' | 'warning' | null;

const Popup: React.FC = () => {
  const [currentTabUrl, setCurrentTabUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PopupStatus>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const tab = await getCurrentTelegraphTab();
      setCurrentTabUrl(tab?.url ?? null);
    }
    init();
  }, []);

  const isOnTelegraphPage = !!currentTabUrl;

  function clearMessage() {
    setStatus(null);
    setMessage('');
  }

  const handleDownloadMedia = async () => {
    const url = currentTabUrl?.trim();
    if (!url) {
      setStatus('error');
      setMessage('Open a Telegraph article first (telegra.ph or graph.org), then try again.');
      return;
    }
    setLoading(true);
    clearMessage();
    setMessage('Finding photos, videos & GIFs...');
    try {
      const response = await new Promise<DownloadZipResult | undefined>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'downloadTelegraphZip', url },
          (res: DownloadZipResult | undefined) =>
            resolve(res ?? { status: 'error', error: 'No response' })
        );
      });
      setLoading(false);
      if (!response) {
        setStatus('error');
        setMessage('Download failed.');
        return;
      }
      if (response.status === 'success') {
        setStatus('success');
        setMessage(`Downloaded ${response.count} item(s) into ZIP.`);
      } else if (response.status === 'no_media' || response.status === 'no_images') {
        setStatus('warning');
        setMessage('No photos, videos or GIFs on this page.');
      } else {
        setStatus('error');
        setMessage(response.error ?? 'Download failed.');
      }
    } catch (err) {
      setLoading(false);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleExportPdf = async () => {
    const url = currentTabUrl?.trim();
    if (!url) {
      setStatus('error');
      setMessage('Open a Telegraph article first (telegra.ph or graph.org), then try again.');
      return;
    }
    setLoading(true);
    clearMessage();
    setMessage('Exporting as PDF...');
    try {
      const response = await new Promise<ExportPdfResult | undefined>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'exportPdf', url },
          (res: ExportPdfResult | undefined) =>
            resolve(res ?? { status: 'error', error: 'No response' })
        );
      });
      setLoading(false);
      if (!response) {
        setStatus('error');
        setMessage('Export failed.');
        return;
      }
      if (response.status === 'success') {
        setStatus('success');
        setMessage(`Saved as ${response.filename}`);
      } else {
        setStatus('error');
        setMessage(response.error ?? 'Export failed.');
      }
    } catch (err) {
      setLoading(false);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleExportMarkdown = async () => {
    const url = currentTabUrl?.trim();
    if (!url) {
      setStatus('error');
      setMessage('Open a Telegraph article first (telegra.ph or graph.org), then try again.');
      return;
    }
    setLoading(true);
    clearMessage();
    setMessage('Exporting as Markdown...');
    try {
      const response = await new Promise<ExportMarkdownResult | undefined>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'exportMarkdown', url },
          (res: ExportMarkdownResult | undefined) =>
            resolve(res ?? { status: 'error', error: 'No response' })
        );
      });
      setLoading(false);
      if (!response) {
        setStatus('error');
        setMessage('Export failed.');
        return;
      }
      if (response.status === 'success') {
        setStatus('success');
        setMessage(`Saved as ${response.filename}`);
      } else {
        setStatus('error');
        setMessage(response.error ?? 'Export failed.');
      }
    } catch (err) {
      setLoading(false);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const disabled = loading || !isOnTelegraphPage;

  return (
    <div className="tmd-root">
      <header className="tmd-header">
        <h1 className="tmd-title">Telegraph Media Downloader</h1>
        <p className="tmd-desc">
          Export media, PDF & Markdown.
        </p>
      </header>
      <div className="tmd-divider" aria-hidden="true" />

      {!isOnTelegraphPage && (
        <div className="tmd-notice">
          Open a Telegraph article (telegra.ph or graph.org) in this tab, then click the extension again.
        </div>
      )}

      <div className="tmd-buttons">
        <button
          type="button"
          className="tmd-btn"
          onClick={handleDownloadMedia}
          disabled={disabled}
        >
          <span className="tmd-btn-label">
            {loading ? 'Working…' : 'Download Media'}
          </span>
        </button>
        <button
          type="button"
          className="tmd-btn tmd-btn--secondary"
          onClick={handleExportPdf}
          disabled={disabled}
        >
          <span className="tmd-btn-label">Export as PDF</span>
        </button>
        <button
          type="button"
          className="tmd-btn tmd-btn--secondary"
          onClick={handleExportMarkdown}
          disabled={disabled}
        >
          <span className="tmd-btn-label">Export as Markdown</span>
        </button>
      </div>

      {message && (
        <div className={`tmd-msg tmd-msg--${status ?? 'info'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
};

export default Popup;
