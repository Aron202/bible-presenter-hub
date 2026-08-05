import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  Library,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlockCard } from "@/components/BlockCard";
import {
  countVerses,
  getVerses,
  loadLibrary,
  mergeBooks,
  parseBibleText,
  saveLibrary,
  type Translation,
} from "@/lib/bible";
import { newId, referenceLabel, smartImport, type Block } from "@/lib/blocks";
import { buildPro6, downloadPro6, type SlideInput } from "@/lib/propresenter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sermon Slide Studio — Build & Export Church Presentations" },
      {
        name: "description",
        content:
          "Import Bible text files, paste a sermon email, and export polished scripture slides straight to ProPresenter.",
      },
      { property: "og:title", content: "Sermon Slide Studio" },
      {
        property: "og:description",
        content:
          "Turn sermon outlines and scripture references into presentation-ready slides in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const [library, setLibrary] = useState<Translation[]>([]);
  const [translationName, setTranslationName] = useState("Svenska Folkbibeln");
  const [pasted, setPasted] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  const persist = (next: Translation[]) => {
    setLibrary(next);
    saveLibrary(next);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const id = translationName.trim().toLowerCase().replace(/\s+/g, "-") || "bible";
    let books = library.find((t) => t.id === id)?.books ?? [];
    let parsedBooks = 0;

    for (const file of Array.from(files)) {
      const text = await file.text();
      const incoming = parseBibleText(text);
      parsedBooks += incoming.length;
      books = mergeBooks(books, incoming);
    }

    const next = [
      ...library.filter((t) => t.id !== id),
      { id, name: translationName.trim() || "Bible", books },
    ];
    persist(next);
    toast.success(`Imported ${parsedBooks} book section(s)`, {
      description: `${books.length} books stored locally under “${translationName}”.`,
    });
  };

  const runSmartImport = () => {
    if (!pasted.trim()) return;
    if (!library.length) {
      toast.error("Import a Bible text file first so references can be looked up.");
      return;
    }
    const created = smartImport(pasted, library[0]);
    setBlocks((prev) => [...prev, ...created]);
    toast.success(`Created ${created.length} blocks`, {
      description: `${created.filter((b) => b.type === "verse").length} scripture blocks detected.`,
    });
    setPasted("");
  };

  const updateBlock = (id: string, block: Block) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? block : b)));

  const moveBlock = (index: number, direction: -1 | 1) =>
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const addBlock = (type: Block["type"]) =>
    setBlocks((prev) => [
      ...prev,
      type === "headline"
        ? { id: newId(), type: "headline", text: "" }
        : {
            id: newId(),
            type: "verse",
            book: library[0]?.books[0]?.name ?? "",
            chapter: 1,
            from: 1,
            to: 1,
            translationId: library[0]?.id ?? "",
          },
    ]);

  const exportPresentation = () => {
    if (!blocks.length) {
      toast.error("Add at least one block before exporting.");
      return;
    }
    const inputs: SlideInput[] = blocks.map((block) => {
      if (block.type === "headline") return { kind: "headline", text: block.text };
      const translation = library.find((t) => t.id === block.translationId) ?? library[0];
      const verses = getVerses(translation, block.book, block.chapter, block.from, block.to);
      return {
        kind: "verse",
        text: verses.map((v) => `${v.verse} ${v.text}`).join(" "),
        label: referenceLabel(block, translation?.name),
      };
    });
    downloadPro6(buildPro6(inputs));
    toast.success("Sermon.pro6 downloaded", {
      description: "Drag the file into your ProPresenter playlist.",
    });
  };

  const verseCount = countVerses(library);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Sermon Slide Studio</h1>
            <p className="text-sm text-muted-foreground">
              Scripture library, smart import, and presentation export in one place.
            </p>
          </div>
          <Button className="ml-auto" size="lg" onClick={exportPresentation}>
            <Download className="size-4" />
            Export to ProPresenter
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <Library className="size-4 text-primary" /> Bible library
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload plain .txt Bible files. Everything stays on this device.
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="translation">Translation name</Label>
                <Input
                  id="translation"
                  value={translationName}
                  onChange={(e) => setTranslationName(e.target.value)}
                />
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".txt,text/plain"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button variant="secondary" className="w-full" onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" />
                Upload .txt files
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {library.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No translations stored yet.
                </p>
              ) : (
                library.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">{t.books.length} books</span>
                  </div>
                ))
              )}
              {verseCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {verseCount.toLocaleString("sv-SE")} verses indexed locally.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <FileText className="size-4 text-primary" /> Smart import
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste an email or outline. References like “Johannes 3:16-18” become verse blocks.
            </p>
            <Textarea
              className="mt-4 min-h-48"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Guds kärlek\nJohannes 3:16-18\nVårt svar i tro\nRom 5:1"}
            />
            <Button className="mt-3 w-full" onClick={runSmartImport}>
              <Sparkles className="size-4" />
              Generate blocks
            </Button>
          </section>
        </div>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              Builder · {blocks.length} blocks
            </h2>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addBlock("headline")}>
                <Plus className="size-4" /> Headline
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("verse")}>
                <Plus className="size-4" /> Verse
              </Button>
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-medium">Your sermon is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use smart import or add blocks manually to start building.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  library={library}
                  onChange={(next) => updateBlock(block.id, next)}
                  onRemove={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                  onMove={(direction) => moveBlock(index, direction)}
                />
              ))}
            </div>
          )}

          {blocks.length > 0 && (
            <Button size="lg" className="w-full" onClick={exportPresentation}>
              <Download className="size-4" />
              Export to ProPresenter
            </Button>
          )}
        </section>
      </main>
    </div>
  );
}
