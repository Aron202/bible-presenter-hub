import { referenceLabel, type Block } from "./blocks";

/** Escapes a string into RTF-safe syntax, converting non-ASCII to \uNNN? escapes. */
export function escapeRtf(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0)!;
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

export function buildRtf(
  text: string,
  opts: { fontSize: number; bold?: boolean; color?: string } = { fontSize: 90 },
): string {
  const halfPoints = Math.round(opts.fontSize * 2);
  return (
    "{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0" +
    "{\\fonttbl{\\f0\\fnil\\fcharset0 Helvetica;}}" +
    "{\\colortbl;\\red255\\green255\\blue255;}" +
    `\\pard\\qc\\f0\\cf1\\fs${halfPoints}${opts.bold ? "\\b" : ""}\\outl0\\strokewidth0 ` +
    escapeRtf(text) +
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

type TextElementOptions = {
  text: string;
  fontSize: number;
  bold?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  verticalAlign: 0 | 1 | 2; // 0 top, 1 middle, 2 bottom
  name: string;
};

function textElement(opts: TextElementOptions, uuid: string) {
  const rtf = buildRtf(opts.text, { fontSize: opts.fontSize, bold: opts.bold });
  const data = toBase64(rtf);
  const shape = `{${opts.x} ${opts.y} 0}{${opts.width} ${opts.height}}`;
  return `        <RVTextElement displayName="${xmlEscape(opts.name)}" UUID="${uuid}" typeID="0" displayDelay="0" locked="false" persistent="0" fromTemplate="false" opacity="1" source="" bezelRadius="0" rotation="0" drawingFill="false" drawingShadow="false" drawingStroke="false" fillColor="0 0 0 0" adjustsHeightToFit="false" verticalAlignment="${opts.verticalAlign}" revealType="0" position="${shape}" RTFData="${data}" RTFData64="${data}">
          <_-D-_serializedShapeElement>
            <RVRect3D rvXMLIvarName="origin">${shape}</RVRect3D>
            <shapeKey>0</shapeKey>
          </_-D-_serializedShapeElement>
        </RVTextElement>`;
}

function uuid(seed: number, part: number) {
  const hex = (n: number) => n.toString(16).padStart(4, "0").toUpperCase();
  return `4C6F7665-${hex(seed)}-4B6C-${hex(part)}-${hex(seed)}${hex(part)}${hex(seed + part)}`;
}

function slide(index: number, elements: string[], label: string) {
  return `    <RVDisplaySlide backgroundColor="0 0 0 1" enabled="true" highlightColor="0 0 0 0" hotKey="" label="${xmlEscape(label)}" notes="" slideType="1" sort_index="${index}" UUID="${uuid(index, 1)}" drawingBackgroundColor="false" chordChartPath="" serialization-array-index="${index}">
      <array rvXMLIvarName="cues"></array>
      <array rvXMLIvarName="displayElements">
${elements.join("\n")}
      </array>
    </RVDisplaySlide>`;
}

export function buildPro6(blocks: Block[], translationName: string): string {
  const slides: string[] = [];

  blocks.forEach((block, i) => {
    if (block.type === "headline") {
      slides.push(
        slide(
          i,
          [
            textElement(
              {
                text: block.text,
                fontSize: 110,
                bold: true,
                x: 120,
                y: 0,
                width: SLIDE_W - 240,
                height: SLIDE_H,
                verticalAlign: 1,
                name: "Headline",
              },
              uuid(i, 2),
            ),
          ],
          block.text.slice(0, 40) || "Headline",
        ),
      );
      return;
    }

    const label = referenceLabel(block, translationName);
    slides.push(
      slide(
        i,
        [
          textElement(
            {
              text: block.verseText ?? "",
              fontSize: 84,
              x: 140,
              y: 80,
              width: SLIDE_W - 280,
              height: SLIDE_H - 300,
              verticalAlign: 1,
              name: "Scripture",
            },
            uuid(i, 2),
          ),
          textElement(
            {
              text: label,
              fontSize: 44,
              x: 140,
              y: SLIDE_H - 200,
              width: SLIDE_W - 280,
              height: 140,
              verticalAlign: 2,
              name: "Reference",
            },
            uuid(i, 3),
          ),
        ],
        label,
      ),
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<RVPresentationDocument height="${SLIDE_H}" width="${SLIDE_W}" versionNumber="600" docType="0" creatorCode="1349676880" lastDateUsed="${new Date().toISOString()}" usedCount="0" category="Sermon" resourcesDirectory="" backgroundColor="0 0 0 1" drawingBackgroundColor="false" notes="" artist="" author="" album="" CCLIDisplay="false" CCLIArtistCredits="" CCLISongTitle="Sermon" CCLIPublisher="" CCLICopyrightInfo="" CCLILicenseNumber="" chordChartPath="" os="1" buildNumber="6016">
  <RVTimeline timeOffset="0" duration="0" selectedMediaTrackIndex="0" loop="false" rvXMLIvarName="timeline">
    <array rvXMLIvarName="timeCues"></array>
    <array rvXMLIvarName="mediaTracks"></array>
  </RVTimeline>
  <array rvXMLIvarName="groups">
    <RVSlideGrouping name="Sermon" uuid="${uuid(999, 9)}" color="0 0 0 0" serialization-array-index="0">
      <array rvXMLIvarName="slides">
${slides.join("\n")}
      </array>
    </RVSlideGrouping>
  </array>
  <array rvXMLIvarName="arrangements"></array>
  <RVDisplayCycle timeOffset="0" duration="0" selectedMediaTrackIndex="0" loop="false" rvXMLIvarName="displayCycle">
    <array rvXMLIvarName="timeCues"></array>
    <array rvXMLIvarName="mediaTracks"></array>
  </RVDisplayCycle>
</RVPresentationDocument>`;
}

export function downloadPro6(xml: string, filename = "Sermon.pro6") {
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
