/**
 * Canonical Swedish bible book order plus short-name aliases so references
 * like "Apg", "1 Kor" or "Höga V" resolve to the right book.
 */

export type CanonicalBook = { order: number; name: string; aliases: string[] };

const RAW: [string, string[]][] = [
  ["Första Moseboken", ["1 Mos", "1 Mosebok", "Gen", "1M"]],
  ["Andra Moseboken", ["2 Mos", "2 Mosebok", "Ex", "2M"]],
  ["Tredje Moseboken", ["3 Mos", "3 Mosebok", "Lev", "3M"]],
  ["Fjärde Moseboken", ["4 Mos", "4 Mosebok", "Num", "4M"]],
  ["Femte Moseboken", ["5 Mos", "5 Mosebok", "Deut", "5M"]],
  ["Josua", ["Jos"]],
  ["Domarboken", ["Dom", "Domar"]],
  ["Rut", ["Ruth"]],
  ["Första Samuelsboken", ["1 Sam", "1 Samuelsbok"]],
  ["Andra Samuelsboken", ["2 Sam", "2 Samuelsbok"]],
  ["Första Kungaboken", ["1 Kung", "1 Kon"]],
  ["Andra Kungaboken", ["2 Kung", "2 Kon"]],
  ["Första Krönikeboken", ["1 Krön", "1 Kron"]],
  ["Andra Krönikeboken", ["2 Krön", "2 Kron"]],
  ["Esra", ["Esr"]],
  ["Nehemja", ["Neh"]],
  ["Ester", ["Est"]],
  ["Job", ["Jb"]],
  ["Psaltaren", ["Ps", "Psalm", "Psalmerna"]],
  ["Ordspråksboken", ["Ords", "Ordsp", "Ordspråken"]],
  ["Predikaren", ["Pred"]],
  ["Höga Visan", ["HV", "Höga V", "Höga"]],
  ["Jesaja", ["Jes"]],
  ["Jeremia", ["Jer"]],
  ["Klagovisorna", ["Klag"]],
  ["Hesekiel", ["Hes", "Ez"]],
  ["Daniel", ["Dan"]],
  ["Hosea", ["Hos"]],
  ["Joel", ["Jl"]],
  ["Amos", ["Am"]],
  ["Obadja", ["Ob", "Obad"]],
  ["Jona", ["Jon"]],
  ["Mika", ["Mik"]],
  ["Nahum", ["Nah"]],
  ["Habackuk", ["Hab"]],
  ["Sefanja", ["Sef"]],
  ["Haggai", ["Hagg"]],
  ["Sakarja", ["Sak"]],
  ["Malaki", ["Mal"]],
  ["Matteusevangeliet", ["Matt", "Mt", "Matteus"]],
  ["Markusevangeliet", ["Mark", "Mk", "Markus"]],
  ["Lukasevangeliet", ["Luk", "Lk", "Lukas"]],
  ["Johannesevangeliet", ["Joh", "Jh", "Johannes", "Johannes Evangelium", "Johannes evangelium"]],
  ["Apostlagärningarna", ["Apg", "Act", "Apostla"]],
  ["Romarbrevet", ["Rom", "Rm"]],
  ["Första Korinthierbrevet", ["1 Kor", "1 Korinthierbrev", "1 Korintierbrevet"]],
  ["Andra Korinthierbrevet", ["2 Kor", "2 Korinthierbrev", "2 Korintierbrevet"]],
  ["Galaterbrevet", ["Gal"]],
  ["Efesierbrevet", ["Ef", "Efes"]],
  ["Filipperbrevet", ["Fil", "Flp"]],
  ["Kolosserbrevet", ["Kol"]],
  ["Första Thessalonikerbrevet", ["1 Thess", "1 Tess", "1 Th"]],
  ["Andra Thessalonikerbrevet", ["2 Thess", "2 Tess", "2 Th"]],
  ["Första Timotheosbrevet", ["1 Tim", "1 Timoteusbrevet"]],
  ["Andra Timotheosbrevet", ["2 Tim", "2 Timoteusbrevet"]],
  ["Titusbrevet", ["Tit"]],
  ["Filemonbrevet", ["Filem", "Fm", "Filemon"]],
  ["Hebreerbrevet", ["Hebr", "Heb"]],
  ["Jakobsbrevet", ["Jak", "Jk"]],
  ["Första Petrusbrevet", ["1 Petr", "1 Pet"]],
  ["Andra Petrusbrevet", ["2 Petr", "2 Pet"]],
  ["Första Johannesbrevet", ["1 Joh", "1 Johannesbrev"]],
  ["Andra Johannesbrevet", ["2 Joh", "2 Johannesbrev"]],
  ["Tredje Johannesbrevet", ["3 Joh", "3 Johannesbrev"]],
  ["Judasbrevet", ["Jud", "Judas"]],
  ["Uppenbarelseboken", ["Upp", "Openb", "Uppenbarelsen", "Apok"]],
];

const ORDINAL_WORDS: [RegExp, string][] = [
  [/^första/, "1"],
  [/^andra/, "2"],
  [/^tredje/, "3"],
  [/^fjärde/, "4"],
  [/^femte/, "5"],
];

/** "1 Mos." -> "1mos", "Första Moseboken" -> "1moseboken" */
export function bookKey(value: string): string {
  let key = value
    .normalize("NFKC")
    .toLocaleLowerCase("sv-SE")
    .replace(/[^a-zà-ÿ0-9]+/gi, "");
  for (const [pattern, digit] of ORDINAL_WORDS) {
    if (pattern.test(key)) {
      key = key.replace(pattern, digit);
      break;
    }
  }
  return key;
}

export const CANONICAL_BOOKS: CanonicalBook[] = RAW.map(([name, aliases], i) => ({
  order: i,
  name,
  aliases,
}));

const EXACT = new Map<string, number>();
for (const book of CANONICAL_BOOKS) {
  EXACT.set(bookKey(book.name), book.order);
  for (const alias of book.aliases) {
    const key = bookKey(alias);
    if (!EXACT.has(key)) EXACT.set(key, book.order);
  }
}

/** Resolves any spelling/abbreviation to the canonical book order index. */
export function canonicalOrder(name: string): number | undefined {
  const key = bookKey(name);
  if (!key) return undefined;
  const exact = EXACT.get(key);
  if (exact !== undefined) return exact;

  const prefixed = [...EXACT.entries()].filter(([candidate]) => candidate.startsWith(key));
  if (prefixed.length && key.length >= 2) {
    return prefixed.sort((a, b) => a[1] - b[1] || a[0].length - b[0].length)[0]![1];
  }
  const contained = [...EXACT.entries()].filter(([candidate]) => candidate.includes(key));
  if (contained.length && key.length >= 3) {
    return contained.sort((a, b) => a[1] - b[1] || a[0].length - b[0].length)[0]![1];
  }
  return undefined;
}

/** Sorts library books into canonical bible order (unknown books last, A-Z). */
export function sortByCanon<T extends { name: string }>(books: T[]): T[] {
  return [...books].sort((a, b) => {
    const ao = canonicalOrder(a.name) ?? 999;
    const bo = canonicalOrder(b.name) ?? 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "sv");
  });
}
