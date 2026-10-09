export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";

export type ThemeTextBox = {
  id: string;
  name: string;
  /** Coordinates in 1920x1080 slide space. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  align: TextAlign;
  verticalAlign: VerticalAlign;
  uppercase: boolean;
  /** Extra tracking in CSS px; export maps ~3 → 60 twips (ProPresenter BibelTest). */
  letterSpacing: number;
  lineHeight: number;
  sampleText: string;
};

export type SlideTheme = {
  id: string;
  name: string;
  backgroundColor: string;
  boxes: ThemeTextBox[];
  updatedAt: string;
};

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

export const FONT_FAMILIES = [
  "Georgia",
  "Times New Roman",
  "Helvetica",
  "Arial",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
];

/** Bump when default theme geometry/fonts change so localStorage picks up new presets. */
const STORAGE_KEY = "sermon-slide-themes.v2";

export const newThemeId = () =>
  `theme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const newBoxId = () => `box-${Math.random().toString(36).slice(2, 9)}`;

export function createTextBox(index = 0): ThemeTextBox {
  return {
    id: newBoxId(),
    name: `Text box ${index + 1}`,
    x: 142,
    y: 160 + index * 120,
    width: SLIDE_WIDTH - 284,
    height: 320,
    fontFamily: "Georgia",
    fontSize: 90,
    color: "#ffffff",
    bold: false,
    align: "left",
    verticalAlign: "top",
    uppercase: false,
    letterSpacing: 3,
    lineHeight: 1.15,
    sampleText: "Så älskade Gud världen att han utgav sin enfödde Son",
  };
}

export function createTheme(name: string): SlideTheme {
  return {
    id: newThemeId(),
    name,
    backgroundColor: "#000000",
    boxes: [createTextBox(0)],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Defaults reverse-engineered from the attached ProPresenter 7 `BibelTest.protheme`
 * (Georgia, left-aligned, 1920×1080) to match the screenshot look in 16:9.
 */
export const DEFAULT_THEMES: SlideTheme[] = [
  {
    id: "standard-bibel",
    name: "Standard Bibel",
    backgroundColor: "#000000",
    boxes: [
      {
        ...createTextBox(0),
        id: "bibel-scripture",
        name: "Scripture",
        x: 142,
        y: 147,
        width: 1654,
        height: 690,
        fontFamily: "Georgia",
        fontSize: 90,
        align: "left",
        verticalAlign: "top",
        letterSpacing: 3,
        lineHeight: 1.15,
        sampleText:
          "¹⁶Så älskade Gud världen att han utgav sin enfödde Son, för att var och en som tror på honom inte ska gå förlorad utan ha evigt liv.",
      },
      {
        ...createTextBox(1),
        id: "bibel-reference",
        name: "Reference",
        x: 158,
        y: 808,
        width: 1122,
        height: 168,
        fontFamily: "Georgia",
        fontSize: 46,
        align: "left",
        verticalAlign: "top",
        letterSpacing: 5,
        lineHeight: 1.1,
        sampleText: "Johannesevangeliet 3:16 (SFB)",
      },
    ],
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "standard-rubrik",
    name: "Standard Rubrik",
    backgroundColor: "#000000",
    boxes: [
      {
        ...createTextBox(0),
        id: "rubrik-headline",
        name: "Headline",
        x: 142,
        y: 147,
        width: 1654,
        height: 786,
        fontFamily: "Georgia",
        fontSize: 96,
        bold: true,
        align: "left",
        verticalAlign: "middle",
        uppercase: false,
        letterSpacing: 2,
        sampleText: "Guds kärlek",
      },
    ],
    updatedAt: new Date(0).toISOString(),
  },
];

export function loadThemes(): SlideTheme[] {
  if (typeof localStorage === "undefined") return DEFAULT_THEMES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_THEMES);
    const parsed = JSON.parse(raw) as SlideTheme[];
    if (!Array.isArray(parsed) || parsed.length === 0) return structuredClone(DEFAULT_THEMES);
    return parsed;
  } catch {
    return structuredClone(DEFAULT_THEMES);
  }
}

export function saveThemes(themes: SlideTheme[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

const ACTIVE_KEY = "sermon-slide-active-theme.v2";

export function loadActiveThemeId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveThemeId(id: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function findThemeByName(themes: SlideTheme[], name: string): SlideTheme | undefined {
  const key = name.toLowerCase();
  return themes.find((t) => t.name.toLowerCase() === key);
}
