import { findBook, getVerses, type Translation } from "./bible";

export type Block =
  | { id: string; type: "headline"; text: string }
  | {
      id: string;
      type: "verse";
      book: string;
      chapter: number;
      from: number;
      to: number;
      translationId: string;
    };

export const newId = () => Math.random().toString(36).slice(2, 10);

// Matches "Johannes 3:16-18", "Joh 3:16", "1 Mos 1:1-3", "Ps. 23:1"
const REFERENCE =
  /\b((?:[1-5]\s*)?[A-Za-zÅÄÖåäöÉé]{2,}(?:\s+[A-Za-zÅÄÖåäöÉé]{2,})?)\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;

export type ParsedReference = {
  raw: string;
  book: string;
  chapter: number;
  from: number;
  to: number;
  index: number;
};

export function findReferences(line: string): ParsedReference[] {
  const out: ParsedReference[] = [];
  REFERENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REFERENCE.exec(line))) {
    const from = Number(match[3]!);
    out.push({
      raw: match[0],
      book: match[1]!.trim(),
      chapter: Number(match[2]!),
      from,
      to: match[4] ? Number(match[4]) : from,
      index: match.index,
    });
  }
  return out;
}


export function smartImport(text: string, translation: Translation | undefined): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const refs = findReferences(line).filter(
      (r) => !!findBook(translation, r.book) && getVerses(translation, r.book, r.chapter, r.from, r.to).length > 0,
    );

    if (refs.length === 0) {
      blocks.push({ id: newId(), type: "headline", text: line });
      continue;
    }

    // If the reference leads the line, the rest is the quoted verse text itself:
    // don't turn it into a headline. Only prose *before* the first reference
    // becomes a headline.
    const leading = line.slice(0, refs[0]!.index);
    const prefix = leading.replace(/\s+/g, " ").replace(/^[\s\-–:•*,.]+|[\s\-–:•*,.]+$/g, "").trim();
    if (prefix.length > 2) blocks.push({ id: newId(), type: "headline", text: prefix });


    for (const ref of refs) {
      const book = findBook(translation, ref.book)!;
      blocks.push({
        id: newId(),
        type: "verse",
        book: book.name,
        chapter: ref.chapter,
        from: ref.from,
        to: ref.to,
        translationId: translation!.id,
      });
    }
  }
  return blocks;
}

export function referenceLabel(block: Extract<Block, { type: "verse" }>, translationName?: string) {
  const range = block.to > block.from ? `${block.from}-${block.to}` : `${block.from}`;
  const ref = `${block.book} ${block.chapter}:${range}`;
  return translationName ? `${ref} (${translationName})` : ref;
}
