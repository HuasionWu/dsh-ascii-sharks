/**
 * Wallpaper settings: defaults, sanitising, and localStorage persistence.
 *
 * The tuner panel and the React component both go through this module, so the
 * on-disk shape and the in-memory shape never drift apart.
 */
import type { ThemeName } from "./theme";
import type { SharkKind, SharkSpec } from "./world";

export const SHARK_KINDS: SharkKind[] = [
  "classic",
  "hammerhead",
  "zebra",
  "tiger",
  "greathammer",
  "mako",
  "thresher",
  "nurse",
];

export interface Settings {
  /** 0 – 1: how strongly the tank shows through normal conversation. */
  opacity: number;
  /** 0 – 1: strength on the empty "new session" hero, where there is no text. */
  heroOpacity: number;
  /** CSS px per character cell; 0 follows the window width. */
  cellSize: number;
  /** Number of sharks, 0 – 6. */
  sharkCount: number;
  /** Which species to use, cycled in order. */
  sharks: SharkKind[];
  /** "auto" follows the app's own light/dark surface. */
  theme: ThemeName | "auto";
  /** Custom backdrop behind the tank; "" keeps it transparent. */
  backdrop: string;
  /** Grid stroke alpha, 0 – 0.3. */
  grid: number;
  /** Fish per 100 000 px² of tank; the world scales it by area. */
  fishDensity: number;
  /** Single accent colour for shark shimmer; "" keeps the built-in list. */
  accent: string;
  /** Splash ripples on click. */
  interactive: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  opacity: 0.55,
  heroOpacity: 1,
  cellSize: 0,
  sharkCount: 4,
  sharks: ["classic", "classic", "classic", "classic"],
  theme: "auto",
  backdrop: "",
  grid: 0.055,
  fishDensity: 1,
  accent: "",
  interactive: true,
};

const STORAGE_KEY = "dsh-ascii-sharks/settings/v1";

const clampNum = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Coerce whatever came out of storage (or the tuner) into a valid Settings. */
export function normalizeSettings(input: Partial<Settings> | null | undefined): Settings {
  const raw = input ?? {};
  const kinds = Array.isArray(raw.sharks)
    ? raw.sharks.filter((k): k is SharkKind => SHARK_KINDS.indexOf(k as SharkKind) >= 0)
    : [];
  const theme = raw.theme === "light" || raw.theme === "dark" ? raw.theme : "auto";
  return {
    opacity: clampNum(raw.opacity, 0, 1, DEFAULT_SETTINGS.opacity),
    heroOpacity: clampNum(raw.heroOpacity, 0, 1, DEFAULT_SETTINGS.heroOpacity),
    cellSize: Math.round(clampNum(raw.cellSize, 0, 40, DEFAULT_SETTINGS.cellSize)),
    sharkCount: Math.round(clampNum(raw.sharkCount, 0, 6, DEFAULT_SETTINGS.sharkCount)),
    sharks: kinds.length ? kinds.slice(0, 6) : DEFAULT_SETTINGS.sharks.slice(),
    theme,
    backdrop: typeof raw.backdrop === "string" ? raw.backdrop : DEFAULT_SETTINGS.backdrop,
    grid: clampNum(raw.grid, 0, 0.3, DEFAULT_SETTINGS.grid),
    fishDensity: clampNum(raw.fishDensity, 0.2, 3, DEFAULT_SETTINGS.fishDensity),
    accent: typeof raw.accent === "string" ? raw.accent : DEFAULT_SETTINGS.accent,
    interactive: raw.interactive !== false,
  };
}

export function readSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw));
  } catch {
    /* private mode, disabled storage, or corrupt JSON: fall back to defaults */
  }
  return normalizeSettings(null);
}

export function writeSettings(settings: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: the session still honours the change */
  }
}

/**
 * Build the shark roster. Sizes step down from the first entry so the biggest
 * shark sets the scale and the rest read as smaller, deeper animals.
 */
export function sharkSpecs(settings: Settings): SharkSpec[] {
  const kinds = settings.sharks.length ? settings.sharks : DEFAULT_SETTINGS.sharks;
  const count = Math.min(settings.sharkCount, kinds.length);
  const out: SharkSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ kind: kinds[i % kinds.length], size: Math.max(0.55, 1 - i * 0.12) });
  }
  return out;
}
