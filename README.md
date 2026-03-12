# Telegraph Media Downloader – Export Media, PDF & Markdown

Export Telegraph articles (telegra.ph / graph.org) in one click: download all media as a ZIP, export as PDF with images and captions, or export as Markdown with a media folder.

This Chrome extension lets you **save full Telegraph articles** in three ways:

- **Download Media** — All images, videos, and GIFs in one ZIP file.
- **Export as PDF** — Single PDF with article text, embedded images (compressed), and **captions** (small gray centered text) with clear spacing between images and text.
- **Export as Markdown** — ZIP containing `article.md` and a `media/` folder with images; Markdown uses local paths and includes **captions** (blockquote + italic).

No login, no setup — open a Telegraph page, click the extension, choose an option.

---

## Features

### Download Media (ZIP)

- Detects and downloads **all media** from the page: images, videos, GIFs.
- Saves into a single ZIP with sanitized filenames (e.g. `my-article.zip`).
- Works with **telegra.ph** and **graph.org** (and external image URLs when present).

### Export as PDF

- **Single PDF file** (e.g. `my-article.pdf`) — not inside a ZIP.
- Article structure: title, headings, paragraphs, **images in order**.
- **Captions** from `<figcaption>`: small, gray, centered below each image.
- **Spacing**: clear gaps between images, captions, and text.
- Images are compressed (max width ~1200px, JPEG quality ~75%) to keep file size reasonable.
- Videos and GIF-as-video are **not** included (static images only).

### Export as Markdown (ZIP)

- **ZIP package** (e.g. `my-article.zip`) containing:
  - `article.md` — article in Markdown with local image links.
  - `media/` — folder with downloaded images (`image-1.jpg`, `image-2.png`, …).
- **Captions** are included as blockquote + italic (e.g. `> *Big Ben*`).
- Images are referenced as `![image](media/image-1.jpg)` so the Markdown works offline.
- Same order as the article; videos and GIF-as-video are skipped.

### Supported sites

- **telegra.ph**
- **graph.org**
- **api.telegra.ph**
- **teletype.in**

---

## Installation

### 1. Build the extension

```bash
npm install
npm run build
```

The extension is compiled into `build/`. A distributable ZIP is created in `zip/` (e.g. `telegraph-media-downloader-1.0.0.zip`).

### 2. Load in Chrome

1. Open **chrome://extensions/**.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the **`build`** folder (or the folder from the unzipped release).

Works in Chrome, Edge, Brave, Arc, and other Chromium-based browsers.

---

## Usage

1. Open a **Telegraph article** in your browser:
   - `https://telegra.ph/...`
   - `https://graph.org/...`
2. Click the **extension icon** in the toolbar.
3. Choose one of the three actions:
   - **Download Media** — ZIP with all images, videos, and GIFs.
   - **Export as PDF** — single PDF with text, images, and captions.
   - **Export as Markdown** — ZIP with `article.md` and `media/` folder.

If the current tab is not a Telegraph page, the popup will ask you to open one first.

---

## File naming

All exports use the **article title** (sanitized for filenames):

- `my-article.zip` (Download Media)
- `my-article.pdf` (Export as PDF)
- `my-article.zip` (Export as Markdown — contains `article.md` + `media/`)

---

## Development

```bash
npm install
npm run build
```

- **Build output:** `build/`
- **Release ZIP:** `zip/telegraph-media-downloader-<version>.zip`

```bash
npm start
```

Runs development mode (if configured).

---

## Permissions

- **Domains:** `telegra.ph`, `graph.org`, `api.telegra.ph`, `teletype.in`, `<all_urls>` — to load article content and media (including external image CDNs).
- **downloads** — to save ZIP and PDF files.
- **activeTab** — to detect the current tab URL.
- **scripting** — for extension behavior.

---

## License

MIT

If you find this project useful, consider starring the repository on GitHub.
