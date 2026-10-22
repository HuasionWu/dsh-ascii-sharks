/**
 * Colour palettes for the wallpaper.
 *
 * The upstream demo paints an opaque black canvas, which is wrong for a
 * wallpaper: it would hide whatever the host app already painted behind the
 * conversation column. Everything here is therefore built around a transparent
 * canvas — only ink is drawn — with an optional solid backdrop for people who
 * want the tank to be its own room.
 */

export type ThemeName = "dark" | "light";

export interface Palette {
  id: ThemeName;
  /** null → leave the canvas transparent so the app background shows through. */
  background: string | null;
  /** Grid stroke, alpha included. */
  grid: string;
  /** Dot colour classes: blue, green, red, pale, then the cyan wake. */
  dots: [number, number, number][];
  /** Shimmer colours that re-roll across a shark's hide. */
  accents: string[];
  /** Base rgb of the fish dashes. */
  fish: [number, number, number];
  /** Heat colours for a kill: hot, cooling. */
  heat: [string, string];
  /** 1 paints dark ink on dark water, -1 inverts it for light themes. */
  ink: 1 | -1;
  /** Multiplier on shark skin brightness. */
  skin: number;
}

/** Upstream's palette: a dim tank seen at night. */
export const DARK_PALETTE: Palette = {
  id: "dark",
  background: null,
  grid: "rgba(255,255,255,0.055)",
  dots: [
    [48, 52, 235],
    [52, 205, 60],
    [228, 50, 44],
    [190, 212, 255],
    [110, 230, 255],
  ],
  accents: ["#e0892c", "#e03a32", "#b44ae0", "#33c8cc", "#3cb54a", "#3150e8", "#d9c14a"],
  fish: [230, 238, 255],
  heat: ["rgba(255,120,60,", "rgba(220,40,40,"],
  ink: 1,
  skin: 1,
};

/** Same water, lit from above: ink is dark, the page stays pale. */
export const LIGHT_PALETTE: Palette = {
  id: "light",
  background: null,
  grid: "rgba(20,30,60,0.075)",
  dots: [
    [44, 62, 190],
    [24, 140, 62],
    [196, 44, 40],
    [60, 78, 118],
    [12, 128, 150],
  ],
  accents: ["#b4630f", "#b42a22", "#7a2fa0", "#128a8c", "#2a8a3a", "#2436b0", "#9a8410"],
  fish: [40, 52, 78],
  heat: ["rgba(196,80,30,", "rgba(180,30,30,"],
  ink: -1,
  skin: 1,
};

export interface PaletteOptions {
  theme?: ThemeName;
  /** null / "" → transparent; otherwise a CSS colour. */
  backdrop?: string | null;
  /** 0 – 0.3; overrides the palette's grid alpha. */
  gridAlpha?: number;
  /** 0.3 – 2; overrides the palette's skin brightness. */
  skin?: number;
  /** Single colour replacing the built-in accent list, or "". */
  accent?: string;
}

function withAlpha(rgba: string, alpha: number) {
  const m = /^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/.exec(rgba);
  if (!m) return rgba;
  return `rgba(${m[1]},${m[2]},${m[3]},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function paletteFor(options: PaletteOptions = {}): Palette {
  const base = options.theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  const palette: Palette = { ...base, dots: base.dots.slice() as Palette["dots"] };
  if (options.gridAlpha !== undefined) palette.grid = withAlpha(base.grid, options.gridAlpha);
  if (options.skin !== undefined) palette.skin = options.skin;
  if (options.accent) palette.accents = [options.accent];
  if (options.backdrop !== undefined) palette.background = options.backdrop || null;
  return palette;
}

/**
 * Read the app's own background and decide which way the ink should run.
 * Sampled from the nearest ancestor that actually paints something, so a
 * transparent body (the common case in a themed shell) still resolves.
 */
export function detectTheme(): ThemeName {
  const parse = (value: string) => {
    const m = /^rgba?\(([^)]+)\)$/.exec(value.trim());
    if (!m) return null;
    const parts = m[1].split(/[,/]/).map((p) => parseFloat(p));
    if (parts.length < 3) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  let el: Element | null = document.body;
  while (el) {
    const bg = parse(getComputedStyle(el).backgroundColor);
    if (bg && bg.a > 0.2) {
      const luma = (0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b) / 255;
      return luma > 0.5 ? "light" : "dark";
    }
    el = el.parentElement;
  }
  return "dark";
}
