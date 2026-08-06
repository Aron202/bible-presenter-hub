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

export function buildRtf(runs: RtfRun[]): string {
  const body = runs
    .map((run) => {
      const halfPoints = Math.round(run.fontSize * 2);
      const prefix = `\\f0\\cf1\\fs${halfPoints}${run.bold ? "\\b" : "\\b0"}${
        run.superscript ? "\\super" : "\\nosupersub"
      } `;
      return `{${prefix}${escapeRtf(run.text)}}`;
    })
    .join("");
  return (
    "{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0" +
    "{\\fonttbl{\\f0\\fnil\\fcharset0 Helvetica;}}" +
    "{\\colortbl;\\red255\\green255\\blue255;}" +
    "\\pard\\qc\\outl0\\strokewidth0 " +
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

const SLIDE_W = 1920;
const SLIDE_H = 1080;

export const VERSE_THEME = "Standard Bibel";
export const HEADLINE_THEME = "Standard Rubrik";

type TextElementOptions = {
  runs: RtfRun[];
  plain: string;
  x: number;
  y: number;
  width: number;
  height: number;
  verticalAlign: 0 | 1 | 2; // 0 top, 1 middle, 2 bottom
  name: string;
};

function textElement(opts: TextElementOptions, uuid: string) {
  const rtfData = toBase64(buildRtf(opts.runs));
  const plainTextData = toBase64(opts.plain);
  const rect = `{${opts.x} ${opts.y} 0 ${opts.width} ${opts.height}}`;
  return `          <RVTextElement displayName="${xmlEscape(opts.name)}" UUID="${uuid}" typeID="0" displayDelay="0" locked="false" persistent="0" fromTemplate="true" opacity="1" source="" bezelRadius="0" rotation="0" drawingFill="false" drawingShadow="false" drawingStroke="false" fillColor="0 0 0 0" adjustsHeightToFit="false" verticalAlignment="${opts.verticalAlign}" revealType="0">
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

function slide(index: number, elements: string[], label: string, theme: string) {
  return `        <RVDisplaySlide backgroundColor="0 0 0 1" enabled="true" highlightColor="0 0 0 0" hotKey="" label="${xmlEscape(
    label,
  )}" notes="${xmlEscape(theme)}" UUID="${uuid(
    index,
    1,
  )}" drawingBackgroundColor="false" chordChartPath="" socialItemCount="1">
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

/** "Predikan 06-08-2026" */
export function defaultFileName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Predikan ${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function renderSlide(input: SlideInput, index: number): string {
  if (input.kind === "headline") {
    return slide(
      index,
      [
        textElement(
          {
            runs: [{ text: input.text, fontSize: 110, bold: true }],
            plain: input.text,
            x: 120,
            y: 0,
            width: SLIDE_W - 240,
            height: SLIDE_H,
            verticalAlign: 1,
            name: "Headline",
          },
          uuid(index, 2),
        ),
      ],
      input.text.slice(0, 40) || "Rubrik",
      HEADLINE_THEME,
    );
  }

  const plain = `${input.verseNumber}${input.text}`;
  return slide(
    index,
    [
      textElement(
        {
          runs: [
            { text: String(input.verseNumber), fontSize: 40, superscript: true },
            { text: input.text, fontSize: 84 },
          ],
          plain,
          x: 140,
          y: 80,
          width: SLIDE_W - 280,
          height: SLIDE_H - 300,
          verticalAlign: 1,
          name: "Scripture",
        },
        uuid(index, 2),
      ),
      textElement(
        {
          runs: [{ text: input.label, fontSize: 44 }],
          plain: input.label,
          x: 140,
          y: SLIDE_H - 200,
          width: SLIDE_W - 280,
          height: 140,
          verticalAlign: 2,
          name: "Reference",
        },
        uuid(index, 3),
      ),
    ],
    input.label,
    VERSE_THEME,
  );
}

export function buildPro6(groups: SlideGroup[]): string {
  let slideIndex = 0;

  const groupXml = groups
    .filter((group) => group.slides.length > 0)
    .map((group, groupIndex) => {
      const kind = group.slides[0]!.kind;
      // pastel blue for scripture groups, pastel purple for headline groups
      const color = kind === "verse" ? "0.65 0.8 1 1" : "0.78 0.68 1 1";
      const slides = group.slides.map((input) => renderSlide(input, slideIndex++));
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
<RVPresentationDocument height="${SLIDE_H}" width="${SLIDE_W}" versionNumber="600" docType="0" creatorCode="1349676848" lastDateUsed="${new Date().toISOString()}" usedCount="0" category="Presentation" resourcesDirectory="" backgroundColor="0 0 0 1" drawingBackgroundColor="false" notes="" CCLIDisplay="false" chordChartPath="" os="1" buildNumber="6016" selectedArrangementID="">
  <array rvXMLIvarName="groups">
${groupXml}
  </array>
  <array rvXMLIvarName="arrangements"></array>
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
