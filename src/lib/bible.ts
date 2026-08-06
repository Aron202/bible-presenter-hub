export type Chapter = { chapter: number; verses: { verse: number; text: string }[] };
export type Book = { name: string; chapters: Chapter[] };
export type Translation = { id: string; name: string; books: Book[] };

const STORAGE_KEY = "sermon.bible.library.v1";

export function loadLibrary(): Translation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Translation[]) : [];
  } catch {
    return [];
  }
}

export function saveLibrary(library: Translation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

const HEADER_LINE = /^=+$/;
const CHAPTER_HEADER = /^(.*?)\s*[-–]\s*(?:KAPITEL|KAP\.?|CHAPTER)\s*(\d+)\s*$/i;
const VERSE_LINE = /^(\d{1,3})\s+(.*)$/;

/**
 * Parses a plain .txt bible file structured with "=====" separators and
 * "BOOK NAME - KAPITEL 1" headers, followed by "1 verse text" lines.
 */
export function parseBibleText(raw: string): Book[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const books = new Map<string, Map<number, { verse: number; text: string }[]>>();

  let currentBook: string | null = null;
  let currentChapter: number | null = null;
  let lastVerse: { verse: number; text: string } | null = null;

  const push = (book: string, chapter: number, v: { verse: number; text: string }) => {
    if (!books.has(book)) books.set(book, new Map());
    const chapters = books.get(book)!;
    if (!chapters.has(chapter)) chapters.set(chapter, []);
    chapters.get(chapter)!.push(v);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || HEADER_LINE.test(line)) continue;

    const header = line.match(CHAPTER_HEADER);
    if (header) {
      currentBook = titleCase(header[1]!.trim());
      currentChapter = Number(header[2]!);
      lastVerse = null;
      continue;
    }

    const verse = line.match(VERSE_LINE);
    if (verse && currentBook && currentChapter) {
      lastVerse = { verse: Number(verse[1]!), text: verse[2]!.trim() };
      push(currentBook, currentChapter, lastVerse);
      continue;
    }

    // continuation line of the previous verse
    if (lastVerse) lastVerse.text = `${lastVerse.text} ${line}`.trim();
  }

  return [...books.entries()].map(([name, chapters]) => ({
    name,
    chapters: [...chapters.entries()]
      .map(([chapter, verses]) => ({ chapter, verses: verses.sort((a, b) => a.verse - b.verse) }))
      .sort((a, b) => a.chapter - b.chapter),
  }));
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("sv-SE")
    .split(/\s+/)
    .map((word) => word.charAt(0).toLocaleUpperCase("sv-SE") + word.slice(1))
    .join(" ");
}

export function mergeBooks(existing: Book[], incoming: Book[]): Book[] {
  const map = new Map(existing.map((b) => [normalize(b.name), { ...b, chapters: [...b.chapters] }]));
  for (const book of incoming) {
    const key = normalize(book.name);
    const target = map.get(key);
    if (!target) {
      map.set(key, { ...book, chapters: [...book.chapters] });
      continue;
    }
    const chapters = new Map(target.chapters.map((c) => [c.chapter, c]));
    for (const chapter of book.chapters) chapters.set(chapter.chapter, chapter);
    target.chapters = [...chapters.values()].sort((a, b) => a.chapter - b.chapter);
  }
  return sortByCanon([...map.values()]);
}

export function normalize(value: string) {
  return value.toLocaleLowerCase("sv-SE").replace(/[.\s]/g, "");
}

export function findBook(translation: Translation | undefined, name: string): Book | undefined {
  if (!translation) return undefined;
  const key = bookKey(name);
  if (!key) return undefined;

  // 1. exact key match against the stored book names
  const direct = translation.books.find((b) => bookKey(b.name) === key);
  if (direct) return direct;

  // 2. resolve short names ("Apg", "1 Kor", "Höga V") through the canon
  const order = canonicalOrder(name);
  if (order !== undefined) {
    const canonical = translation.books.find((b) => canonicalOrder(b.name) === order);
    if (canonical) return canonical;
  }

  // 3. loose fallbacks on the stored names
  return (
    translation.books.find((b) => bookKey(b.name).startsWith(key) && key.length >= 2) ??
    translation.books.find((b) => bookKey(b.name).includes(key) && key.length >= 3)
  );
}


export function getVerses(
  translation: Translation | undefined,
  bookName: string,
  chapter: number,
  from: number,
  to: number,
): { verse: number; text: string }[] {
  const book = findBook(translation, bookName);
  const chap = book?.chapters.find((c) => c.chapter === chapter);
  if (!chap) return [];
  return chap.verses.filter((v) => v.verse >= from && v.verse <= to);
}

export function countVerses(library: Translation[]) {
  return library.reduce(
    (sum, t) =>
      sum + t.books.reduce((s, b) => s + b.chapters.reduce((c, ch) => c + ch.verses.length, 0), 0),
    0,
  );
}
