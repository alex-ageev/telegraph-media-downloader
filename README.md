# Telegraph Media Downloader – Download Images & Videos from telegra.ph / graph.org

![Screenshot](screenshot.png)

**Download images, videos, and GIFs from Telegram Telegraph articles
(telegra.ph or graph.org) in one click.**

This Chrome extension lets you **download all media from a Telegraph
article as a ZIP file**. Open a page, click the extension, and instantly
save the full gallery --- no copy-paste, no manual downloads.

Works perfectly for **Telegram Telegraph posts shared in Telegram
channels**.

------------------------------------------------------------------------

## SEO keywords

Telegraph downloader, telegra.ph downloader, graph.org downloader,
download Telegraph images, download Telegraph photos, Telegram Telegraph
downloader, save Telegraph media, Telegraph media downloader, download
Telegraph article images, Telegraph to ZIP.

------------------------------------------------------------------------

# Features

### One-click Telegraph media download

Open any **Telegraph article** (`telegra.ph` or `graph.org`), click the
extension, and download **all images, videos and GIFs as a ZIP file**.

### 🖼 Download full Telegraph galleries

Automatically detects and downloads **all media from the page** --- no
need to save images manually.

### Works with Telegram links

Many **Telegram channels publish long posts via Telegraph**. This
extension works with those links instantly.

### Fast and simple

No login, no setup, no copy-paste --- just click and download.

------------------------------------------------------------------------

# Supported websites

The extension works with Telegraph-based publishing platforms:

-   **telegra.ph**
-   **graph.org**
-   **api.telegra.ph**
-   **teletype.in**

These platforms are commonly used for **Telegram articles, image
galleries, and long posts**.

------------------------------------------------------------------------

# Installation

### 1️⃣ Download the extension

Download the latest build:

**[Download
telegraph-media-downloader-1.0.0.zip](https://github.com/alex-ageev/telegraph-media-downloader/raw/main/zip/telegraph-media-downloader-1.0.0.zip)**

Unzip the archive on your computer.

------------------------------------------------------------------------

### 2️⃣ Install the extension

1.  Open your browser extension page:

    chrome://extensions/

Works with:

-   Chrome\
-   Edge\
-   Brave\
-   Arc\
-   Chromium browsers

2.  Enable **Developer mode** (top-right).

3.  Click **Load unpacked**.

4.  Select the **unzipped extension folder**.

The extension is now installed.

------------------------------------------------------------------------

# Usage

1.  Open a **Telegraph article**:

    https://telegra.ph/...
    https://graph.org/...

2.  Click the **extension icon** in your browser toolbar.

3.  Click **Download as ZIP**.

The extension will automatically download:

-   all **images**
-   all **videos**
-   all **GIFs**

from the page into **one ZIP archive**.

If the current tab is not a Telegraph page, the popup will ask you to
open one first.

------------------------------------------------------------------------

# Example use cases

This extension is useful for:

-   downloading **Telegram Telegraph galleries**
-   saving **Telegraph articles with images**
-   archiving **Telegram channel media**
-   downloading **telegra.ph photo collections**
-   backing up **graph.org posts**

------------------------------------------------------------------------

# Development (for maintainers)

To create the direct-download ZIP:

    npm install
    npm run build

The build will:

-   compile the extension into `build/`
-   generate the ZIP archive in `zip/`

Example output:

    build/
    zip/telegraph-media-downloader-1.0.0.zip

### Commands

    npm run build

Production build.

    npm start

Development mode (if configured).

------------------------------------------------------------------------

# Permissions

The extension requires the following permissions:

**Domains**

-   `telegra.ph`
-   `graph.org`
-   `api.telegra.ph`
-   `teletype.in`

Used to load Telegraph article content and media.

**downloads**

Allows saving the generated ZIP file to the user's computer.

------------------------------------------------------------------------

# License

MIT

⭐ If you find this project useful, consider **starring the repository
on GitHub**.