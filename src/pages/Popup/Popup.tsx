import React, { useEffect, useState } from 'react';
import { getCurrentTelegraphTab } from '../../../utils/chrome-api';
import type { DownloadZipResult } from '../../types';
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

  const handleDownload = async () => {
    const url = currentTabUrl?.trim();
    if (!url) {
      setStatus('error');
      setMessage('Open a Telegraph article first (telegra.ph or graph.org), then try again.');
      return;
    }

    setLoading(true);
    setStatus(null);
    setMessage('Finding photos, videos & GIFs...');

    try {
      const response = await new Promise<DownloadZipResult | undefined>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'downloadTelegraphZip', url },
          (res: DownloadZipResult | undefined) => resolve(res ?? { status: 'error', error: 'No response' })
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

  const isOnTelegraphPage = !!currentTabUrl;

  return (
    <div className="tmd-root">
      <div className="tmd-head">
        <h1 className="tmd-title">Telegraph Media Downloader</h1>
        <p className="tmd-desc">
          Download all photos, videos & GIFs from this article as a ZIP. Works on Telegraph (Telegram’s publishing platform) at telegra.ph and graph.org.
        </p>
      </div>

      {!isOnTelegraphPage && (
        <div className="tmd-notice">
          Open a Telegraph article (telegra.ph or graph.org) in this tab, then click the extension again.
        </div>
      )}

      <button
        type="button"
        className="tmd-btn"
        onClick={handleDownload}
        disabled={loading || !isOnTelegraphPage}
      >
        {loading ? (
          <span className="tmd-btn-label">Downloading…</span>
        ) : (
          <span className="tmd-btn-label">Download as ZIP</span>
        )}
      </button>

      {message && (
        <div className={`tmd-msg tmd-msg--${status ?? 'info'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
};

export default Popup;
