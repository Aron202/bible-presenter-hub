import { findBook, getVerses, type Translation } from "./src/lib/bible";

// Copy of smartImport from src/lib/blocks.ts
export function newId() { return Math.random().toString(36).slice(2, 10); }
const REFERENCE = /\b((?:[1-5]\s*)?[A-Za-zÅÄÖåäöÉé]{2,}(?:\s+[A-Za-zÅÄÖåäöÉé]{2,})?)\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;

export function findReferences(line: string) {
  const out = [];
  REFERENCE.lastIndex = 0;
  let match;
  while ((match = REFERENCE.exec(line))) {
    const from = Number(match[3]);
    out.push({
      raw: match[0],
      book: match[1].trim(),
      chapter: Number(match[2]),
      from,
      to: match[4] ? Number(match[4]) : from,
      index: match.index,
    });
  }
  return out;
}

export function smartImport(text: string, translation: Translation | undefined) {
  const blocks = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  console.log(`DEBUG: smartImport processing ${lines.length} lines`);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
        console.log("DEBUG: skipping empty line");
        continue;
    }

    const refs = findReferences(line).filter(
      (r) => !!findBook(translation, r.book) && getVerses(translation, r.book, r.chapter, r.from, r.to).length > 0,
    );

    console.log(`DEBUG: line "${line}", valid refs: ${refs.length}`);

    if (refs.length === 0) {
      console.log(`DEBUG: pushing headline for "${line}"`);
      blocks.push({ id: newId(), type: "headline", text: line });
      continue;
    }

    const leading = line.slice(0, refs[0].index);
    const prefix = leading.replace(/\s+/g, " ").replace(/^[\s\-–:•*,.]+|[\s\-–:•*,.]+$/g, "").trim();
    if (prefix.length > 2) {
        console.log(`DEBUG: pushing prefix headline "${prefix}"`);
        blocks.push({ id: newId(), type: "headline", text: prefix });
    }

    for (const ref of refs) {
      const book = findBook(translation, ref.book);
      console.log(`DEBUG: pushing verse block for ${book.name} ${ref.chapter}:${ref.from}`);
      blocks.push({
        id: newId(),
        type: "verse",
        book: book.name,
        chapter: ref.chapter,
        from: ref.from,
        to: ref.to,
        translationId: translation.id,
      });
    }
  }
  return blocks;
}

const mockTranslation: Translation = {
  id: "test",
  name: "Test Bible",
  books: [
    {
      name: "Johannes",
      chapters: [
        {
          chapter: 3,
          verses: [
            { verse: 16, text: "Ty så älskade Gud världen..." }
          ]
        }
      ]
    }
  ]
};

const input = `Johannes 3:16
"Ty så älskade Gud världen..."`;

const blocks = smartImport(input, mockTranslation);
console.log("Result:");
console.log(JSON.stringify(blocks, null, 2));
