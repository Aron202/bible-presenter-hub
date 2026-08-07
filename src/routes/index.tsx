import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Download, FileText, Library, Plus, Settings, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { newId, smartImport, type Block } from "@/lib/blocks";
import { buildPro6, defaultFileName, downloadPro6, type SlideGroup } from "@/lib/propresenter";

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
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === active.id);
      const to = prev.findIndex((b) => b.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const addBlock = (type: Block["type"]) =>
    setBlocks((prev) => [
      ...prev,
      type === "headline"
        ? { id: newId(), type: "headline", text: "" }
        : {
            id: newId(),
            type: "verse",
            book: library[0]?.books[0]?.name ?? "",
            chapter: library[0]?.books[0]?.chapters[0]?.chapter ?? 1,
            from: library[0]?.books[0]?.chapters[0]?.verses[0]?.verse ?? 1,
            to: library[0]?.books[0]?.chapters[0]?.verses[0]?.verse ?? 1,
            translationId: library[0]?.id ?? "",
          },
    ]);

  const exportPresentation = () => {
    if (!blocks.length) {
      toast.error("Add at least one block before exporting.");
      return;
    }

    // Each block becomes its own group; verse blocks get one slide per verse.
    const groups: SlideGroup[] = blocks.map((block) => {
      if (block.type === "headline") {
        return {
          name: block.text.slice(0, 40) || "Rubrik",
          slides: [{ kind: "headline", text: block.text }],
        };
      }
      const translation = library.find((t) => t.id === block.translationId) ?? library[0];
      const verses = getVerses(translation, block.book, block.chapter, block.from, block.to);
      const suffix = translation?.name ? ` (${translation.name})` : "";
      return {
        name: `${block.book} ${block.chapter}:${block.from}${
          block.to > block.from ? `-${block.to}` : ""
        }`,
        slides: verses.map((verse) => ({
          kind: "verse" as const,
          verseNumber: verse.verse,
          text: verse.text,
          label: `${block.book} ${block.chapter}:${verse.verse}${suffix}`,
        })),
      };
    });

    const name = fileName.trim() || defaultFileName();
    downloadPro6(buildPro6(groups), `${name.replace(/\.pro6$/i, "")}.pro6`);
    toast.success(`${name} downloaded`, {
      description: "Drag the file into your ProPresenter playlist.",
    });
  };

  const verseCount = countVerses(library);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/60 bg-card/40 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-5">
          <div className="bg-primary/15 text-primary flex size-10 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Sermon Slide Studio</h1>
            <p className="text-muted-foreground text-sm">
              Scripture library, smart import, and presentation export in one place.
            </p>
          </div>
          <Button className="ml-auto" size="lg" onClick={exportPresentation}>
            <Download className="size-4" />
            Export to ProPresenter
          </Button>
        </div>
      </header>

      <Tabs defaultValue="builder" className="mx-auto max-w-6xl px-6 py-8">
        <TabsList>
          <TabsTrigger value="builder" className="gap-1.5">
            <FileText className="size-4" /> Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <section className="border-border bg-card rounded-2xl border p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                <FileText className="text-primary size-4" /> Smart import
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Paste an email or outline. References like “Johannes 3:16-18” become verse blocks.
              </p>
              <Textarea
                className="mt-4 min-h-48"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder={"Guds kärlek\nJohannes 3:16-18\nVårt svar i tro\nApg 2:38"}
              />
              <Button className="mt-3 w-full" onClick={runSmartImport}>
                <Sparkles className="size-4" />
                Generate blocks
              </Button>
            </section>

            <section className="border-border bg-card rounded-2xl border p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                <Download className="text-primary size-4" /> Export
              </h2>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="filename">File name</Label>
                <Input
                  id="filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={defaultFileName()}
                />
                <p className="text-muted-foreground text-xs">
                  Leave empty to use “{defaultFileName()}”.
                </p>
              </div>
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
              <div className="border-border rounded-2xl border border-dashed p-12 text-center">
                <p className="font-medium">Your sermon is empty</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Use smart import or add blocks manually to start building.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {blocks.map((block, index) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        index={index}
                        library={library}
                        onChange={(next) => updateBlock(block.id, next)}
                        onRemove={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {blocks.length > 0 && (
              <Button size="lg" className="w-full" onClick={exportPresentation}>
                <Download className="size-4" />
                Export to ProPresenter
              </Button>
            )}
          </section>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 max-w-2xl space-y-6">
          <section className="border-border bg-card rounded-2xl border p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <Library className="text-primary size-4" /> Bible library
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
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
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="size-4" />
                Upload .txt files
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {library.length === 0 ? (
                <p className="border-border text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                  No translations stored yet.
                </p>
              ) : (
                library.map((t) => (
                  <div
                    key={t.id}
                    className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">{t.books.length} books</span>
                  </div>
                ))
              )}
              {verseCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {verseCount.toLocaleString("sv-SE")} verses indexed locally.
                </p>
              )}
            </div>
          </section>

          <section className="border-border bg-card rounded-2xl border p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Slide theme editor</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Design the structural template used when exporting slides. Verses use “Standard
              Bibel”, headlines use “Standard Rubrik”.
            </p>
            <div className="mt-5">
              <ThemeEditor />
            </div>
          </section>

        </TabsContent>
      </Tabs>
    </div>
  );
}
