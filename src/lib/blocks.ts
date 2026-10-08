import { findBook, getVerses, type Translation } from "./bible";
import { canonicalOrder } from "./books";

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

// Matches "Johannes 3:16-18", "Joh 3:16", "1 Mos 1:1-3", "Ps. 23:1",
// and multi-word books like "Första Moseboken 1:1" / "Höga Visan 1:1".
const REFERENCE =
  /\b((?:[1-5]\s*)?[A-Za-zÅÄÖåäöÉé]{2,}(?:\s+[A-Za-zÅÄÖåäöÉé]{2,}){0,2})\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;

export type ParsedReference = {
  raw: string;
  book: string;
  chapter: number;
  from: number;
  to: number;
  index: number;
};

/**
 * When the regex greedily pulls in a leading word ("Se Johannes", "Läs Johannes"),
 * peel left-hand tokens until the remaining book name resolves in the Swedish canon.
 */
function resolveBookCapture(captured: string, rawMatch: string, matchIndex: number) {
  const parts = captured.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { book: captured.trim(), raw: rawMatch, index: matchIndex };
  }

  for (let start = 0; start < parts.length; start += 1) {
    const candidate = parts.slice(start).join(" ");
    if (canonicalOrder(candidate) === undefined) continue;

    if (start === 0) {
      return { book: candidate, raw: rawMatch, index: matchIndex };
    }

    // Find where the kept book name begins inside the original match.
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bookAt = rawMatch.search(new RegExp(`(?:^|\\s)${escaped}(?=\\s|\\.|$)`, "i"));
    if (bookAt < 0) {
      return { book: candidate, raw: rawMatch, index: matchIndex };
    }
    const offset = rawMatch[bookAt]!.match(/\s/) ? bookAt + 1 : bookAt;
    return {
      book: candidate,
      raw: rawMatch.slice(offset),
      index: matchIndex + offset,
    };
  }

  return { book: captured.trim(), raw: rawMatch, index: matchIndex };
}

export function findReferences(line: string): ParsedReference[] {
  const out: ParsedReference[] = [];
  REFERENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REFERENCE.exec(line))) {
    const from = Number(match[3]!);
    const resolved = resolveBookCapture(match[1]!, match[0], match.index);
    out.push({
      raw: resolved.raw,
      book: resolved.book,
      chapter: Number(match[2]!),
      from,
      to: match[4] ? Number(match[4]) : from,
      index: resolved.index,
    });
  }
  return out;
}


export function smartImport(text: string, translation: Translation | undefined): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const comparable = (value: string) =>
    value
      .normalize("NFKC")
      .toLocaleLowerCase("sv-SE")
      .replace(/^[\s\u00a0"'“”„«»‘’]+|[\s\u00a0"'“”„«»‘’]+$/g, "")
      .replace(/[^a-zåäö0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const matchesLibraryText = (candidate: string, refs: ParsedReference[]) => {
    const pasted = comparable(candidate);
    const expected = comparable(
      refs
        .flatMap((ref) => getVerses(translation, ref.book, ref.chapter, ref.from, ref.to))
        .map((verse) => verse.text)
        .join(" "),
    );
    return pasted.length >= 12 && expected.length >= 12 &&
      (pasted === expected || pasted.includes(expected) || expected.includes(pasted));
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]?.trim() ?? "";
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
    // Skip tiny connector words ("Se", "Läs", "See") that only cue a reference.
    if (prefix.length > 2 && !/^(se|see|läs|las|read|text)$/i.test(prefix)) {
      blocks.push({ id: newId(), type: "headline", text: prefix });
    }


    for (const ref of refs) {
      const book = findBook(translation, ref.book);
      if (!book || !translation) continue;
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

    const lastRef = refs[refs.length - 1]!;
    const trailing = line
      .slice(lastRef.index + lastRef.raw.length)
      .replace(/^[\s\-–:•*,.]+/, "")
      .trim();
    if (trailing.length > 2 && !matchesLibraryText(trailing, refs)) {
      blocks.push({ id: newId(), type: "headline", text: trailing });
    }

    const textOutsideReference = line.replace(REFERENCE, "").trim();
    if (!textOutsideReference) {
      let nextIndex = lineIndex + 1;
      while (nextIndex < lines.length && !(lines[nextIndex]?.trim())) nextIndex += 1;
      const nextLine = lines[nextIndex]?.trim() ?? "";
      if (nextLine && matchesLibraryText(nextLine, refs)) lineIndex = nextIndex;
    }
  }
  return blocks;
}

export function referenceLabel(block: Extract<Block, { type: "verse" }>, translationName?: string) {
  const range = block.to > block.from ? `${block.from}-${block.to}` : `${block.from}`;
  const ref = `${block.book} ${block.chapter}:${range}`;
  return translationName ? `${ref} (${translationName})` : ref;
}
