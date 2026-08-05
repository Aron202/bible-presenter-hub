import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findBook, getVerses, type Translation } from "@/lib/bible";
import { referenceLabel, type Block } from "@/lib/blocks";

type Props = {
  block: Block;
  index: number;
  total: number;
  library: Translation[];
  onChange: (block: Block) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
};

export function BlockCard({
  block,
  index,
  total,
  library,
  onChange,
  onRemove,
  onMove,
}: Props) {
  const translation =
    block.type === "verse"
      ? (library.find((t) => t.id === block.translationId) ?? library[0])
      : undefined;

  const book = block.type === "verse" ? findBook(translation, block.book) : undefined;

  const preview = useMemo(() => {
    if (block.type !== "verse") return [];
    return getVerses(translation, block.book, block.chapter, block.from, block.to);
  }, [block, translation]);

  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
          {block.type === "verse" ? (
            <BookOpen className="size-4" />
          ) : (
            <TypeIcon className="size-4" />
          )}
          {block.type === "verse" ? "Bible verse" : "Headline"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move block up"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move block down"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Delete block">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
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
          <div className="grid gap-2 sm:grid-cols-5">
            <Select
              value={book?.name ?? ""}
              onValueChange={(value) => onChange({ ...block, book: value })}
            >
              <SelectTrigger className="sm:col-span-2">
                <SelectValue placeholder="Book" />
              </SelectTrigger>
              <SelectContent>
                {(translation?.books ?? []).map((b) => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={block.chapter}
              onChange={(e) => onChange({ ...block, chapter: Number(e.target.value) })}
              aria-label="Chapter"
            />
            <Input
              type="number"
              min={1}
              value={block.from}
              onChange={(e) => onChange({ ...block, from: Number(e.target.value) })}
              aria-label="First verse"
            />
            <Input
              type="number"
              min={1}
              value={block.to}
              onChange={(e) => onChange({ ...block, to: Number(e.target.value) })}
              aria-label="Last verse"
            />
          </div>
          <Select
            value={translation?.id ?? ""}
            onValueChange={(value) => onChange({ ...block, translationId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Translation" />
            </SelectTrigger>
            <SelectContent>
              {library.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {referenceLabel(block, translation?.name)}
            </p>
            {preview.length ? (
              <p className="leading-relaxed text-foreground">
                {preview.map((v) => `${v.verse} ${v.text}`).join(" ")}
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
