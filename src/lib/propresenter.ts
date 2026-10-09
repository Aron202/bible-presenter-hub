import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type SlideTheme,
  type TextAlign,
  type ThemeTextBox,
  type VerticalAlign,
} from "./themes";

/** Escapes a string into RTF-safe syntax, converting non-ASCII to \uNNN? escapes. */
export function escapeRtf(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (char === "\\" || char === "{" || char === "}") out += `\\${char}`;
    else if (char === "\n") out += "\\line ";
    else if (code < 128) out += char;
    else if (code <= 0xffff) out += `\\u${code > 32767 ? code - 65536 : code}?`;
    else {
      // surrogate pair for astral characters
      const v = code - 0x10000;
      const hi = 0xd800 + (v >> 10) - 65536;
      const lo = 0xdc00 + (v & 0x3ff) - 65536;
      out += `\\u${hi}?\\u${lo}?`;
    }
  }
  return out;
}

export type RtfRun = { text: string; fontSize: number; bold?: boolean; superscript?: boolean };

export type RtfStyle = {
  fontFamily?: string;
  align?: TextAlign;
  /** CSS hex color, e.g. #ffffff */
  color?: string;
  /** Extra letter spacing in twips (ProPresenter theme uses ~60 for body, ~100 for refs). */
  letterSpacingTwips?: number;
};

const ALIGN_RTF: Record<TextAlign, string> = {
  left: "\\ql",
  center: "\\qc",
  right: "\\qr",
};

function parseHexColor(color: string | undefined): { r: number; g: number; b: number } {
  const fallback = { r: 255, g: 255, b: 255 };
  if (!color) return fallback;
  const hex = color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: Number.parseInt(hex[0]! + hex[0]!, 16),
      g: Number.parseInt(hex[1]! + hex[1]!, 16),
      b: Number.parseInt(hex[2]! + hex[2]!, 16),
    };
  }
  return fallback;
}

/** Pick an RTF font family class that ProPresenter resolves reliably. */
function rtfFontClass(fontFamily: string): string {
  const name = fontFamily.toLowerCase();
  if (name.includes("courier") || name.includes("mono")) return "\\fmodern";
  if (
    name.includes("georgia") ||
    name.includes("times") ||
    name.includes("garamond") ||
    name.includes("serif")
  ) {
    return "\\froman";
  }
  if (name.includes("helvetica") || name.includes("arial") || name.includes("verdana")) {
    return "\\fswiss";
  }
  return "\\fnil";
}

/**
 * Builds RTF matching the style baked into ProPresenter 7 .protheme exports:
 * fonttbl + colortbl + \\pard alignment + optional kerning/expnd.
 */
export function buildRtf(runs: RtfRun[], style: RtfStyle = {}): string {
  const fontFamily = style.fontFamily?.trim() || "Helvetica";
  const align = ALIGN_RTF[style.align ?? "center"];
  const { r, g, b } = parseHexColor(style.color);
  const spacing =
    style.letterSpacingTwips && style.letterSpacingTwips > 0
      ? `\\kerning1\\expnd${Math.round(style.letterSpacingTwips / 5)}\\expndtw${Math.round(
          style.letterSpacingTwips,
        )}`
      : "";

  const body = runs
    .map((run) => {
      const halfPoints = Math.round(run.fontSize * 2);
      const prefix = `\\f0\\cf1\\fs${halfPoints}${run.bold ? "\\b" : "\\b0"}${
        run.superscript ? "\\super" : "\\nosupersub"
      }${spacing} `;
      return `{${prefix}${escapeRtf(run.text)}}`;
    })
    .join("");

  return (
    "{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0" +
    `{\\fonttbl{\\f0${rtfFontClass(fontFamily)}\\fcharset0 ${fontFamily};}}` +
    `{\\colortbl;\\red${r}\\green${g}\\blue${b};}` +
    `\\pard${align}\\outl0\\strokewidth0 ` +
    body +
    "}"
  );
}

export function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === "function") return btoa(binary);
  return "";
}

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const VERSE_THEME = "Standard Bibel";
export const HEADLINE_THEME = "Standard Rubrik";

const VERTICAL_ALIGN: Record<VerticalAlign, 0 | 1 | 2> = {
  top: 0,
  middle: 1,
  bottom: 2,
};

type TextElementOptions = {
  runs: RtfRun[];
  plain: string;
  box: Pick<ThemeTextBox, "x" | "y" | "width" | "height" | "verticalAlign" | "name">;
  style: RtfStyle;
};

function textElement(opts: TextElementOptions, uuid: string) {
  const rtfData = toBase64(buildRtf(opts.runs, opts.style));
  const plainTextData = toBase64(opts.plain);
  const { x, y, width, height, verticalAlign, name } = opts.box;
  const rect = `{${x} ${y} 0 ${width} ${height}}`;
  return `          <RVTextElement displayName="${xmlEscape(name)}" UUID="${uuid}" typeID="0" displayDelay="0" locked="false" persistent="0" fromTemplate="true" opacity="1" source="" bezelRadius="0" rotation="0" drawingFill="false" drawingShadow="false" drawingStroke="false" fillColor="0 0 0 0" adjustsHeightToFit="false" verticalAlignment="${VERTICAL_ALIGN[verticalAlign]}" revealType="0">
            <RVRect3D rvXMLIvarName="position">${rect}</RVRect3D>
            <shadow rvXMLIvarName="shadow">0|0 0 0 0.3333333333333333|{4, -4}</shadow>
            <dictionary rvXMLIvarName="stroke">
              <NSColor rvXMLDictionaryKey="RVShapeElementStrokeColorKey">0 0 0 1</NSColor>
              <NSNumber rvXMLDictionaryKey="RVShapeElementStrokeWidthKey" hint="double">0</NSNumber>
            </dictionary>
            <NSString rvXMLIvarName="PlainText">${plainTextData}</NSString>
            <NSString rvXMLIvarName="RTFData">${rtfData}</NSString>
          </RVTextElement>`;
}

function uuid(seed: number, part: number) {
  const hex = (n: number) => (n % 0x10000).toString(16).padStart(4, "0").toUpperCase();
  return `4C6F7665-${hex(seed)}-4B6C-${hex(part)}-${hex(seed)}${hex(part)}${hex(seed + part)}`;
}

function cssToProColor(color: string | undefined): string {
  const { r, g, b } = parseHexColor(color ?? "#000000");
  // ProPresenter uses 0–1 floats in RGB + alpha
  const channel = (n: number) => {
    const value = n / 255;
    if (value === 0 || value === 1) return String(value);
    return value.toFixed(6).replace(/\.?0+$/, "");
  };
  return `${channel(r)} ${channel(g)} ${channel(b)} 1`;
}

function slide(
  index: number,
  elements: string[],
  label: string,
  themeName: string,
  backgroundColor: string,
) {
  return `        <RVDisplaySlide backgroundColor="${cssToProColor(
    backgroundColor,
  )}" enabled="true" highlightColor="0 0 0 0" hotKey="" label="${xmlEscape(
    label,
  )}" notes="${xmlEscape(themeName)}" UUID="${uuid(
    index,
    1,
  )}" drawingBackgroundColor="true" chordChartPath="" socialItemCount="1">
          <array rvXMLIvarName="cues"></array>
          <array rvXMLIvarName="displayElements">
${elements.join("\n")}
          </array>
        </RVDisplaySlide>`;
}

export type SlideInput =
  | { kind: "headline"; text: string }
  | { kind: "verse"; verseNumber: number; text: string; label: string };

export type SlideGroup = { name: string; slides: SlideInput[] };

export type Pro6ThemeOptions = {
  verseTheme?: SlideTheme;
  headlineTheme?: SlideTheme;
};

/** "Predikan 06-08-2026" */
export function defaultFileName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Predikan ${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function findBox(theme: SlideTheme | undefined, names: string[]): ThemeTextBox | undefined {
  if (!theme) return undefined;
  const lowered = names.map((n) => n.toLowerCase());
  return (
    theme.boxes.find((b) => lowered.includes(b.name.toLowerCase())) ??
    theme.boxes[0]
  );
}

function boxStyle(box: ThemeTextBox | undefined, fallback: RtfStyle): RtfStyle {
  if (!box) return fallback;
  return {
    fontFamily: box.fontFamily || fallback.fontFamily,
    align: box.align ?? fallback.align,
    color: box.color || fallback.color,
    letterSpacingTwips: box.letterSpacing > 0 ? Math.round(box.letterSpacing * 20) : fallback.letterSpacingTwips,
  };
}

function applyCase(text: string, uppercase: boolean | undefined) {
  return uppercase ? text.toLocaleUpperCase("sv-SE") : text;
}

/** Fallback geometry reverse-engineered from the ProPresenter 7 BibelTest.protheme (16:9). */
const FALLBACK_SCRIPTURE: ThemeTextBox = {
  id: "fallback-scripture",
  name: "Scripture",
  x: 142,
  y: 147,
  width: 1654,
  height: 690,
  fontFamily: "Georgia",
  fontSize: 90,
  color: "#ffffff",
  bold: false,
  align: "left",
  verticalAlign: "top",
  uppercase: false,
  letterSpacing: 3,
  lineHeight: 1.15,
  sampleText: "",
};

const FALLBACK_REFERENCE: ThemeTextBox = {
  id: "fallback-reference",
  name: "Reference",
  x: 158,
  y: 808,
  width: 1122,
  height: 168,
  fontFamily: "Georgia",
  fontSize: 46,
  color: "#ffffff",
  bold: false,
  align: "left",
  verticalAlign: "top",
  uppercase: false,
  letterSpacing: 5,
  lineHeight: 1.1,
  sampleText: "",
};

const FALLBACK_HEADLINE: ThemeTextBox = {
  id: "fallback-headline",
  name: "Headline",
  x: 142,
  y: 147,
  width: 1654,
  height: 786,
  fontFamily: "Georgia",
  fontSize: 96,
  color: "#ffffff",
  bold: true,
  align: "left",
  verticalAlign: "middle",
  uppercase: false,
  letterSpacing: 2,
  lineHeight: 1.15,
  sampleText: "",
};

function renderSlide(input: SlideInput, index: number, options: Pro6ThemeOptions = {}): string {
  if (input.kind === "headline") {
    const box = findBox(options.headlineTheme, ["Headline", "Rubrik"]) ?? FALLBACK_HEADLINE;
    const text = applyCase(input.text, box.uppercase);
    return slide(
      index,
      [
        textElement(
          {
            runs: [{ text, fontSize: box.fontSize, bold: box.bold }],
            plain: text,
            box,
            style: boxStyle(box, { fontFamily: "Georgia", align: "left", color: "#ffffff" }),
          },
          uuid(index, 2),
        ),
      ],
      input.text.slice(0, 40) || "Rubrik",
      options.headlineTheme?.name ?? HEADLINE_THEME,
      options.headlineTheme?.backgroundColor ?? "#000000",
    );
  }

  const scripture = findBox(options.verseTheme, ["Scripture", "Verse", "Bibelvers"]) ?? FALLBACK_SCRIPTURE;
  const reference = findBox(options.verseTheme, ["Reference", "Referens"]) ?? FALLBACK_REFERENCE;
  const verseText = applyCase(input.text, scripture.uppercase);
  const label = applyCase(input.label, reference.uppercase);
  // Superscript ~half the body size, matching the attached slide look.
  const superSize = Math.max(24, Math.round(scripture.fontSize * 0.45));
  const plain = `${input.verseNumber}${verseText}`;

  return slide(
    index,
    [
      textElement(
        {
          runs: [
            { text: String(input.verseNumber), fontSize: superSize, superscript: true },
            { text: verseText, fontSize: scripture.fontSize, bold: scripture.bold },
          ],
          plain,
          box: scripture,
          style: boxStyle(scripture, {
            fontFamily: "Georgia",
            align: "left",
            color: "#ffffff",
            letterSpacingTwips: 60,
          }),
        },
        uuid(index, 2),
      ),
      textElement(
        {
          runs: [{ text: label, fontSize: reference.fontSize, bold: reference.bold }],
          plain: label,
          box: reference,
          style: boxStyle(reference, {
            fontFamily: "Georgia",
            align: "left",
            color: "#ffffff",
            letterSpacingTwips: 100,
          }),
        },
        uuid(index, 3),
      ),
    ],
    input.label,
    options.verseTheme?.name ?? VERSE_THEME,
    options.verseTheme?.backgroundColor ?? "#000000",
  );
}

export function buildPro6(groups: SlideGroup[], options: Pro6ThemeOptions = {}): string {
  let slideIndex = 0;

  const groupXml = groups
    .filter((group) => group.slides.length > 0)
    .map((group, groupIndex) => {
      const kind = group.slides[0]!.kind;
      // pastel blue for scripture groups, pastel purple for headline groups
      const color = kind === "verse" ? "0.65 0.8 1 1" : "0.78 0.68 1 1";
      const slides = group.slides.map((input) => renderSlide(input, slideIndex++, options));
      return `    <RVSlideGrouping name="${xmlEscape(group.name)}" uuid="${uuid(
        700 + groupIndex,
        3,
      )}" color="${color}" serialization-array-index="${groupIndex}">
      <array rvXMLIvarName="slides">
${slides.join("\n")}
      </array>
    </RVSlideGrouping>`;
    })
    .join("\n");

  // No <RVTransition> nodes anywhere: ProPresenter then uses its own default
  // transition, speed and build delay for every slide.
  return `<?xml version="1.0" encoding="utf-8"?>
<RVPresentationDocument height="${SLIDE_HEIGHT}" width="${SLIDE_WIDTH}" versionNumber="600" docType="0" creatorCode="1349676848" lastDateUsed="${new Date().toISOString()}" usedCount="0" category="Presentation" resourcesDirectory="" backgroundColor="0 0 0 1" drawingBackgroundColor="true" notes="" CCLIDisplay="false" chordChartPath="" os="1" buildNumber="6016" selectedArrangementID="">
  <array rvXMLIvarName="groups">
${groupXml}
  </array>
  <array rvXMLIvarName="arrangements"></array>
  <RVDisplayCycle timeOffset="0" duration="0" selectedMediaTrackIndex="0" loop="false" rvXMLIvarName="displayCycle">
    <array rvXMLIvarName="timeCues"></array>
    <array rvXMLIvarName="mediaTracks"></array>
  </RVDisplayCycle>
</RVPresentationDocument>`;
}

export function downloadPro6(xml: string, filename = `${defaultFileName()}.pro6`) {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
