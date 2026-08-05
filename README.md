# Sermon Sync Pro

Build a modern, single-page React web application (using Tailwind CSS, Lucide icons, and shadcn/ui components) designed for a church media director to build sermon presentations and export them directly to ProPresenter. Default to a sleek, dark-mode UI.

### 1. Bible Library File Importer (.txt format):

- Add a file upload section where the user can upload plain .txt Bible files structured like this:

  ==================================================

    FÖRSTA MOSEBOKEN - KAPITEL 1

  ==================================================

  1 I begynnelsen skapade Gud...

- The app must parse these files locally (storing them in LocalStorage/IndexedDB):

  - Extract the Book Name and Chapter from the header blocks.

  - Parse each line starting with a digit and a space (e.g., "1 I begynnelsen...") to separate the verse number from the text.

### 2. The Smart Import Feature (Email / Text Parser):

- Provide a large text area where the user can paste an entire email or sermon outline.

- Automatically scan the text for Bible references (e.g., "Johannes 3:16-18" or "Joh 3:16").

- When a reference is found, look up the text in the local uploaded Bible library and generate a "Bible Verse Block".

- All other non-scripture lines should automatically convert into "Headline Blocks".

- Allow the user to review, reorder, and edit all blocks in a clean builder interface before exporting.

### 3. The Builder:

- A dynamic block manager supporting two block types:

  - **Headline Block:** Editable text input for sermon points.

  - **Bible Verse Block:** Selects book, chapter, verses, and translation from the local text library.

### 4. ProPresenter Export Engine (CRITICAL):

- Include a primary button labeled "Export to ProPresenter" (Do NOT mention the number 6 in the user interface).

- When clicked, compile the blocks and download a valid `.pro6` XML file named `Sermon.pro6` to ensure full dual-text-box layout compatibility.

- **XML Structure & Layout:**

  - Generate a valid `<RVPresentationDocument>` containing an `<RVDisplayCycle>`.

  - Every Scripture slide must contain EXACTLY two `<RVTextElement>` nodes:

    1. Element 1: Main verse text (centered, larger font).

    2. Element 2: Verse reference + translation (smaller font, bottom-aligned text box).

- **RTF & Base64 Encoding (SWEDISH CHARACTER FIX):**

  - ProPresenter XML requires text to be stored as Base64-encoded RTF inside the `RTFData64` property.

  - You MUST write a helper function that generates valid RTF syntax.

  - **Crucial Rule:** To prevent Swedish characters (Å, Ä, Ö, å, ä, ö) from breaking during import, the helper function must convert non-ASCII characters into their proper RTF Unicode escape sequences (e.g., converting 'ä' to `\u228?`).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/69edba66-ea63-456d-b6dd-b32f1372b304).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
