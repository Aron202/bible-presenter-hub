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
  "Helvetica",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
];

const STORAGE_KEY = "sermon-slide-themes";

export const newThemeId = () =>
  `theme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const newBoxId = () => `box-${Math.random().toString(36).slice(2, 9)}`;

export function createTextBox(index = 0): ThemeTextBox {
  return {
    id: newBoxId(),
    name: `Text box ${index + 1}`,
    x: 160,
    y: 160 + index * 120,
    width: SLIDE_WIDTH - 320,
    height: 320,
    fontFamily: "Helvetica",
    fontSize: 84,
    color: "#ffffff",
    bold: false,
    align: "center",
    verticalAlign: "middle",
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.2,
    sampleText: "Detta är kärleken: inte att vi har älskat Gud",
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

export const DEFAULT_THEMES: SlideTheme[] = [
  {
    id: "standard-bibel",
    name: "Standard Bibel",
    backgroundColor: "#05070d",
    boxes: [
      {
        ...createTextBox(0),
        id: "bibel-scripture",
        name: "Scripture",
        x: 140,
        y: 80,
        width: SLIDE_WIDTH - 280,
        height: SLIDE_HEIGHT - 300,
      },
      {
        ...createTextBox(1),
        id: "bibel-reference",
        name: "Reference",
        x: 140,
        y: SLIDE_HEIGHT - 200,
        width: SLIDE_WIDTH - 280,
        height: 140,
        fontSize: 44,
        verticalAlign: "bottom",
        sampleText: "Apg 2:38 (Svenska Folkbibeln)",
      },
    ],
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "standard-rubrik",
    name: "Standard Rubrik",
    backgroundColor: "#05070d",
    boxes: [
      {
        ...createTextBox(0),
        id: "rubrik-headline",
        name: "Headline",
        x: 120,
        y: 0,
        width: SLIDE_WIDTH - 240,
        height: SLIDE_HEIGHT,
        fontSize: 110,
        bold: true,
        uppercase: true,
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
    if (!raw) return DEFAULT_THEMES;
    const parsed = JSON.parse(raw) as SlideTheme[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_THEMES;
    return parsed;
  } catch {
    return DEFAULT_THEMES;
  }
}

export function saveThemes(themes: SlideTheme[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}
