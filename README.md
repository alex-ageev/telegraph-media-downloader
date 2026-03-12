# Download Telegram Telegraph / telegra.ph / graph.org Media — Chrome Extension

![Screenshot](screenshot.png)

**Download any Telegram Telegraph (telegra.ph or graph.org) article media in one click.** Add the Chrome extension, open the page, and it downloads the full pack of photos, videos and GIFs as a ZIP — no copy-paste, no extra steps.

Search-friendly: *Telegraph download, telegra.ph download, graph.org download, Telegram photos download, Telegraph to ZIP, save Telegraph media.*

---

## What it does

- **One-click download** — Open a Telegraph article (telegra.ph or graph.org) in Chrome, click the extension, click the button. You get a ZIP with all images and videos from that page.
- **Works with Telegram links** — Telegraph is Telegram’s publishing platform; links from Telegram channels often open on telegra.ph or graph.org. This extension works on both.

## Installation

1. **Download the extension** — **[Direct download: telegraph-media-downloader-1.0.0.zip](https://github.com/alex-ageev/telegraph-media-downloader/raw/main/zip/telegraph-media-downloader-1.0.0.zip)** (build folder zipped in `zip/`). Unzip it on your computer.
2. Open the **Extensions** page in your browser: go to `chrome://extensions/` (Chrome, Edge, Arc, Brave, etc.).
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left) and select the folder you just unzipped. The extension is installed.

## Usage

1. Open the Telegraph article you want to download (a telegra.ph or graph.org link).
2. Click the extension icon in the toolbar.
3. Click **Download as ZIP**. All photos, videos and GIFs from that page are saved into one ZIP file.

If the current tab is not a Telegraph page, the popup will ask you to open one first.

## Development (for maintainers)

To create the direct-download ZIP: run `npm install`, then `npm run build`. The build outputs to `build/` and zips it into `zip/telegraph-media-downloader-1.0.0.zip`. Commit the `zip/` folder so the Installation link above works (replace `YOUR_USERNAME` and `YOUR_REPO` with your repo).

- `npm run build` — production build (output in `build/`, build zipped in `zip/`).
- `npm start` — dev server (if configured).

## Permissions

- **telegra.ph**, **graph.org**, **api.telegra.ph**, **teletype.in** — to load article content and media.
- **downloads** — to save the ZIP file.

## License

MIT
