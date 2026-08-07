import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  CaseUpper,
  FoldVertical,
  Palette,
  Plus,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FONT_FAMILIES,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  createTextBox,
  createTheme,
  loadActiveThemeId,
  loadThemes,
  saveActiveThemeId,
  saveThemes,
  type SlideTheme,
  type TextAlign,
  type ThemeTextBox,
  type VerticalAlign,
} from "@/lib/themes";

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  box: ThemeTextBox;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ThemeEditor() {
  const [themes, setThemes] = useState<SlideTheme[]>([]);
  const [activeId, setActiveId] = useState("");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [newName, setNewName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [scale, setScale] = useState(0.3);

  const hydrated = useRef(false);

  useEffect(() => {
    const loaded = loadThemes();
    setThemes(loaded);
    setActiveId(loadActiveThemeId() ?? loaded[0]?.id ?? "");
    setSelectedBoxId(loaded[0]?.boxes[0]?.id ?? "");
    hydrated.current = true;
  }, []);

  // Autosave so edits survive leaving the Settings tab.
  useEffect(() => {
    if (!hydrated.current || themes.length === 0) return;
    saveThemes(themes);
  }, [themes]);

  useEffect(() => {
    if (!hydrated.current || !activeId) return;
    saveActiveThemeId(activeId);
  }, [activeId]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / SLIDE_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [themes.length]);

  const theme = useMemo(() => themes.find((t) => t.id === activeId), [themes, activeId]);
  const box = theme?.boxes.find((b) => b.id === selectedBoxId) ?? theme?.boxes[0];

  const updateTheme = (patch: Partial<SlideTheme>) =>
    setThemes((prev) => prev.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));

  const updateBox = (patch: Partial<ThemeTextBox>) => {
    if (!box) return;
    setThemes((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, boxes: t.boxes.map((b) => (b.id === box.id ? { ...b, ...patch } : b)) }
          : t,
      ),
    );
  };

  const persist = () => {
    if (!theme) return;
    const stamped = themes.map((t) =>
      t.id === activeId ? { ...t, updatedAt: new Date().toISOString() } : t,
    );
    setThemes(stamped);
    saveThemes(stamped);
    toast.success(`“${theme.name}” saved`, {
      description: "Layout and typography stored for export.",
    });
  };

  const addTheme = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Give the theme a name first.");
      return;
    }
    const created = createTheme(name);
    const next = [...themes, created];
    setThemes(next);
    saveThemes(next);
    setActiveId(created.id);
    setSelectedBoxId(created.boxes[0]!.id);
    setNewName("");
  };

  const deleteTheme = () => {
    if (themes.length <= 1) {
      toast.error("Keep at least one theme.");
      return;
    }
    const next = themes.filter((t) => t.id !== activeId);
    setThemes(next);
    saveThemes(next);
    setActiveId(next[0]!.id);
    setSelectedBoxId(next[0]!.boxes[0]?.id ?? "");
  };

  const addBox = () => {
    if (!theme) return;
    const created = createTextBox(theme.boxes.length);
    updateTheme({ boxes: [...theme.boxes, created] });
    setSelectedBoxId(created.id);
  };

  const removeBox = (id: string) => {
    if (!theme) return;
    updateTheme({ boxes: theme.boxes.filter((b) => b.id !== id) });
  };

  const onPointerDown = (
    event: React.PointerEvent,
    target: ThemeTextBox,
    mode: DragState["mode"],
  ) => {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedBoxId(target.id);
    dragRef.current = {
      id: target.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      box: target,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !scale) return;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    setThemes((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;
        return {
          ...t,
          boxes: t.boxes.map((b) => {
            if (b.id !== drag.id) return b;
            if (drag.mode === "move") {
              return {
                ...b,
                x: Math.round(clamp(drag.box.x + dx, 0, SLIDE_WIDTH - b.width)),
                y: Math.round(clamp(drag.box.y + dy, 0, SLIDE_HEIGHT - b.height)),
              };
            }
            return {
              ...b,
              width: Math.round(clamp(drag.box.width + dx, 80, SLIDE_WIDTH - b.x)),
              height: Math.round(clamp(drag.box.height + dy, 60, SLIDE_HEIGHT - b.y)),
            };
          }),
        };
      }),
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  if (!theme) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      {/* Control panel */}
      <div className="space-y-5">
        <section className="border-border bg-card space-y-3 rounded-2xl border p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <Palette className="text-primary size-4" /> Themes
          </h3>
          <div className="space-y-1.5">
            <Label>Active theme</Label>
            <Select
              value={activeId}
              onValueChange={(value) => {
                setActiveId(value);
                setSelectedBoxId(themes.find((t) => t.id === value)?.boxes[0]?.id ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theme-name">Theme name</Label>
            <Input
              id="theme-name"
              value={theme.name}
              onChange={(e) => updateTheme({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Background color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Background color"
                className="border-border bg-background size-9 shrink-0 cursor-pointer rounded-md border"
                value={theme.backgroundColor}
                onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
              />
              <Input
                value={theme.backgroundColor}
                onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={persist}>
              <Save className="size-4" /> Save theme
            </Button>
            <Button variant="outline" onClick={deleteTheme} aria-label="Delete theme">
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New theme name"
            />
            <Button variant="secondary" onClick={addTheme}>
              <Plus className="size-4" /> New
            </Button>
          </div>
        </section>

        <section className="border-border bg-card space-y-3 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <Type className="text-primary size-4" /> Text boxes
            </h3>
            <Button variant="outline" size="sm" onClick={addBox}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="space-y-1.5">
            {theme.boxes.map((b) => (
              <div
                key={b.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  b.id === box?.id ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  onClick={() => setSelectedBoxId(b.id)}
                >
                  {b.name}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${b.name}`}
                  onClick={() => removeBox(b.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {box && (
          <section className="border-border bg-card space-y-4 rounded-2xl border p-5">
            <h3 className="text-sm font-semibold tracking-wide uppercase">Typography</h3>

            <div className="space-y-1.5">
              <Label>Box name</Label>
              <Input value={box.name} onChange={(e) => updateBox({ name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label className="capitalize">{key}</Label>
                  <Input
                    type="number"
                    value={box[key]}
                    onChange={(e) => updateBox({ [key]: Number(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Font family</Label>
              <Select
                value={box.fontFamily}
                onValueChange={(value) => updateBox({ fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Font size</Label>
                <Input
                  type="number"
                  value={box.fontSize}
                  onChange={(e) => updateBox({ fontSize: Number(e.target.value) || 12 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Font color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label="Font color"
                    className="border-border bg-background size-9 shrink-0 cursor-pointer rounded-md border"
                    value={box.color}
                    onChange={(e) => updateBox({ color: e.target.value })}
                  />
                  <Input value={box.color} onChange={(e) => updateBox({ color: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Horizontal alignment</Label>
              <div className="flex gap-1.5">
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([value, Icon]) => (
                  <Toggle
                    key={value}
                    variant="outline"
                    aria-label={`Align ${value}`}
                    pressed={box.align === value}
                    onPressedChange={() => updateBox({ align: value as TextAlign })}
                  >
                    <Icon className="size-4" />
                  </Toggle>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Vertical alignment</Label>
              <div className="flex gap-1.5">
                {(
                  [
                    ["top", ArrowUpToLine],
                    ["middle", FoldVertical],
                    ["bottom", ArrowDownToLine],
                  ] as const
                ).map(([value, Icon]) => (
                  <Toggle
                    key={value}
                    variant="outline"
                    aria-label={`Vertical ${value}`}
                    pressed={box.verticalAlign === value}
                    onPressedChange={() => updateBox({ verticalAlign: value as VerticalAlign })}
                  >
                    <Icon className="size-4" />
                  </Toggle>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5">
              <Toggle
                variant="outline"
                aria-label="Uppercase"
                pressed={box.uppercase}
                onPressedChange={(pressed) => updateBox({ uppercase: pressed })}
              >
                <CaseUpper className="size-4" /> Uppercase
              </Toggle>
              <Toggle
                variant="outline"
                aria-label="Bold"
                pressed={box.bold}
                onPressedChange={(pressed) => updateBox({ bold: pressed })}
              >
                <span className="font-bold">B</span> Bold
              </Toggle>
            </div>

            <div className="space-y-2">
              <Label>Letter spacing · {box.letterSpacing}px</Label>
              <Slider
                min={-10}
                max={40}
                step={1}
                value={[box.letterSpacing]}
                onValueChange={([value]) => updateBox({ letterSpacing: value ?? 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Line height · {box.lineHeight.toFixed(2)}</Label>
              <Slider
                min={0.8}
                max={2.5}
                step={0.05}
                value={[box.lineHeight]}
                onValueChange={([value]) => updateBox({ lineHeight: value ?? 1.2 })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Preview text</Label>
              <Input
                value={box.sampleText}
                onChange={(e) => updateBox({ sampleText: e.target.value })}
              />
            </div>
          </section>
        )}
      </div>

      {/* Live canvas */}
      <div className="space-y-3">
        <div
          ref={canvasRef}
          className="border-border relative w-full overflow-hidden rounded-2xl border select-none"
          style={{ aspectRatio: "16 / 9", backgroundColor: theme.backgroundColor }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerDown={() => setSelectedBoxId("")}
        >
          {theme.boxes.map((b) => {
            const selected = b.id === box?.id;
            return (
              <div
                key={b.id}
                onPointerDown={(event) => onPointerDown(event, b, "move")}
                className={`absolute cursor-move border ${
                  selected ? "border-primary" : "border-white/25 border-dashed"
                }`}
                style={{
                  left: `${(b.x / SLIDE_WIDTH) * 100}%`,
                  top: `${(b.y / SLIDE_HEIGHT) * 100}%`,
                  width: `${(b.width / SLIDE_WIDTH) * 100}%`,
                  height: `${(b.height / SLIDE_HEIGHT) * 100}%`,
                }}
              >
                <div
                  className="flex h-full w-full overflow-hidden"
                  style={{
                    alignItems:
                      b.verticalAlign === "top"
                        ? "flex-start"
                        : b.verticalAlign === "bottom"
                          ? "flex-end"
                          : "center",
                    justifyContent:
                      b.align === "left" ? "flex-start" : b.align === "right" ? "flex-end" : "center",
                  }}
                >
                  <span
                    style={{
                      color: b.color,
                      fontFamily: b.fontFamily,
                      fontSize: `${b.fontSize * scale}px`,
                      fontWeight: b.bold ? 700 : 400,
                      letterSpacing: `${b.letterSpacing * scale}px`,
                      lineHeight: b.lineHeight,
                      textAlign: b.align,
                      textTransform: b.uppercase ? "uppercase" : "none",
                      width: "100%",
                    }}
                  >
                    {b.sampleText}
                  </span>
                </div>
                {selected && (
                  <span
                    role="presentation"
                    onPointerDown={(event) => onPointerDown(event, b, "resize")}
                    className="bg-primary absolute -right-1.5 -bottom-1.5 size-3 cursor-se-resize rounded-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          Drag a text box to move it, drag the corner handle to resize. Coordinates are stored in
          1920×1080 slide space and reused when exporting.
        </p>
      </div>
    </div>
  );
}
