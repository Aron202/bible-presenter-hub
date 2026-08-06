import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, GripVertical, Trash2, Type as TypeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findBook, getVerses, type Translation } from "@/lib/bible";
import { referenceLabel, type Block } from "@/lib/blocks";
import { cn } from "@/lib/utils";

type Props = {
  block: Block;
  index: number;
  library: Translation[];
  onChange: (block: Block) => void;
  onRemove: () => void;
};

export function BlockCard({ block, index, library, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const translation =
    block.type === "verse"
      ? (library.find((t) => t.id === block.translationId) ?? library[0])
      : undefined;

  const book = block.type === "verse" ? findBook(translation, block.book) : undefined;

  const chapters = book?.chapters ?? [];
  const chapter = chapters.find((c) => c.chapter === (block.type === "verse" ? block.chapter : 0));
  const verses = chapter?.verses ?? [];

  const preview = useMemo(() => {
    if (block.type !== "verse") return [];
    return getVerses(translation, block.book, block.chapter, block.from, block.to);
  }, [block, translation]);

  const isVerse = block.type === "verse";

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-colors",
        isVerse
          ? "border-verse/40 bg-verse-soft/25 hover:border-verse"
          : "border-headline/40 bg-headline-soft/25 hover:border-headline",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
          aria-label="Drag to reorder block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-md text-xs font-semibold">
          {index + 1}
        </span>
        <span
          className={cn(
            "flex items-center gap-2 text-xs font-semibold tracking-wide uppercase",
            isVerse ? "text-verse-foreground" : "text-headline-foreground",
          )}
        >
          {isVerse ? <BookOpen className="size-4" /> : <TypeIcon className="size-4" />}
          {isVerse ? "Bibelvers" : "Rubrik"}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto"
          onClick={onRemove}
          aria-label="Delete block"
        >
          <Trash2 className="text-destructive size-4" />
        </Button>
      </div>

      {block.type === "headline" ? (
        <Textarea
          className="mt-3 min-h-16 resize-y text-base"
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Sermon point…"
        />
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-muted-foreground text-xs">Bok</Label>
              <Select
                value={book?.name ?? ""}
                onValueChange={(value) => {
                  const next = findBook(translation, value);
                  const firstChapter = next?.chapters[0];
                  onChange({
                    ...block,
                    book: value,
                    chapter: firstChapter?.chapter ?? 1,
                    from: firstChapter?.verses[0]?.verse ?? 1,
                    to: firstChapter?.verses[0]?.verse ?? 1,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bok" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(translation?.books ?? []).map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Kapitel</Label>
              <Select
                value={String(block.chapter)}
                onValueChange={(value) => {
                  const nextChapter = Number(value);
                  const first =
                    chapters.find((c) => c.chapter === nextChapter)?.verses[0]?.verse ?? 1;
                  onChange({ ...block, chapter: nextChapter, from: first, to: first });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kap" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {chapters.map((c) => (
                    <SelectItem key={c.chapter} value={String(c.chapter)}>
                      {c.chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Från vers</Label>
              <Select
                value={String(block.from)}
                onValueChange={(value) => {
                  const from = Number(value);
                  onChange({ ...block, from, to: Math.max(from, block.to) });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vers" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {verses.map((v) => (
                    <SelectItem key={v.verse} value={String(v.verse)}>
                      {v.verse}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Till vers</Label>
              <Select
                value={String(block.to)}
                onValueChange={(value) => onChange({ ...block, to: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vers" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {verses
                    .filter((v) => v.verse >= block.from)
                    .map((v) => (
                      <SelectItem key={v.verse} value={String(v.verse)}>
                        {v.verse}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Översättning</Label>
            <Select
              value={translation?.id ?? ""}
              onValueChange={(value) => onChange({ ...block, translationId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Översättning" />
              </SelectTrigger>
              <SelectContent>
                {library.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground mb-1 text-xs font-medium">
              {referenceLabel(block, translation?.name)}
              {preview.length > 1 && ` · ${preview.length} slides`}
            </p>
            {preview.length ? (
              <p className="text-foreground leading-relaxed">
                {preview.map((v) => (
                  <span key={v.verse}>
                    <sup className="text-[0.6em] font-semibold">{v.verse}</sup>
                    {v.text}{" "}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-destructive">Verses not found in the imported library.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
