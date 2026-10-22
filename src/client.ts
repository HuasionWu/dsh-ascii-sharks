/**
 * DSH web client half of the ASCII Sharks wallpaper.
 *
 * The host serves this file as a lazily-loaded browser module. Running it only
 * registers a factory; the factory body is the plugin, and it runs on first
 * import. The plugin registers one invisible anchor into a conversation slot,
 * and the anchor's effect mounts a full-bleed canvas behind the conversation
 * column, so the tank is wallpaper rather than a widget in the message flow.
 */
import { WallpaperEngine } from "./engine";
import { detectTheme } from "./theme";
import {
  normalizeSettings,
  readSettings,
  sharkSpecs,
  writeSettings,
  type Settings,
} from "./settings";
import { createTuner } from "./tuner";

/**
 * The module loader hands each bundle a `require` that resolves platform
 * modules (React among them); the bundle carries no runtime dependency of its
 * own, so the type is declared here rather than pulled from `@types/node`.
 */
declare const require: (id: string) => unknown;

interface SlotsApi {
  inject(name: string, factory: () => unknown): void;
  register(options: { name: string; id: string; order?: number }, component: unknown): unknown;
}

interface PluginContext {
  slots: SlotsApi;
}

/**
 * Find the element that owns the conversation column's background.
 *
 * The layout paints `_centerCol` (and its children) with the app background, so
 * a wallpaper must live *inside* that subtree and paint below its siblings. The
 * anchor's ancestors are walked until the element that contains the centre
 * column is found; the tallest ancestor that still covers the column is the one
 * that owns its pixels.
 */
function findBackdropHost(node: Element): HTMLElement | null {
  const column = node.closest('[class*="_centerCol"]');
  if (column) {
    const columnRect = column.getBoundingClientRect();
    if (columnRect.height > 80) {
      // Walk up from the anchor and take the *first* element that already
      // fills the column: that is the conversation root, which owns the
      // column's background. Going any higher would paint the tank across the
      // sidebar as well.
      let el: HTMLElement | null = node.parentElement;
      while (el && el !== document.body) {
        if (el === column) break;
        if (column.contains(el)) {
          if (el.getBoundingClientRect().height >= columnRect.height * 0.8) return el;
        } else if (el.contains(column)) {
          break;
        }
        el = el.parentElement;
      }
    }
    // No sized wrapper between the anchor and the column: the column itself is
    // the surface that paints the background, so mount straight into it.
    return column as HTMLElement;
  }
  // Unknown layout (a fork, a future shell): fall back to the outermost
  // ancestor that actually paints a background.
  let opaque: HTMLElement | null = null;
  let el: HTMLElement | null = node.parentElement;
  while (el && el !== document.body) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") opaque = el;
    el = el.parentElement;
  }
  return opaque;
}

/** Compose the palette options the engine wants from the stored settings. */
function paletteOptions(settings: Settings) {
  return {
    theme: settings.theme === "auto" ? detectTheme() : settings.theme,
    backdrop: settings.backdrop,
    gridAlpha: settings.grid,
    accent: settings.accent,
  };
}

/**
 * True while the New Session hero owns the composer — the empty-state screen
 * where the wallpaper can run at full strength because no text sits on it.
 */
function heroActive(probe: Element | null): boolean {
  if (!probe || !probe.closest) return true;
  try {
    return probe.closest('[class*="_composerHero"]') !== null;
  } catch {
    return true;
  }
}

function applySettings(engine: WallpaperEngine, settings: Settings) {
  engine.setPalette(paletteOptions(settings));
  engine.setCellSize(settings.cellSize);
  engine.setDensity(settings.fishDensity);
  engine.setSharks(sharkSpecs(settings));
  engine.setInteractive(settings.interactive);
}

function apply(ctx: PluginContext) {
  const react = require("react") as typeof import("react");
  const { useEffect, useRef } = react;

  function SharkBackdrop() {
    const anchor = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      const node = anchor.current;
      if (!node) return;
      const host = findBackdropHost(node);
      if (!host) return;

      const canvas = document.createElement("canvas");
      canvas.setAttribute("data-dsh-ascii-sharks", "");
      canvas.setAttribute("aria-hidden", "true");
      Object.assign(canvas.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: "-1",
        pointerEvents: "none",
        opacity: "0",
      });

      const prevPosition = host.style.position;
      const prevIsolation = host.style.isolation;
      // A negative-z child only paints above the host's own background when the
      // host creates its own stacking context.
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.style.isolation = "isolate";
      host.insertBefore(canvas, host.firstChild);

      let settings = readSettings();
      // Fade between full strength on the empty hero and a whisper behind a
      // transcript, instead of snapping when the first message arrives.
      let painted = -1;
      let opacity = settings.opacity;
      const engine = new WallpaperEngine(canvas, {
        sharks: sharkSpecs(settings),
        palette: paletteOptions(settings),
        cellSize: settings.cellSize,
        density: settings.fishDensity,
        interactive: settings.interactive,
        onFrame: (dt) => {
          const target = heroActive(node) ? settings.heroOpacity : settings.opacity;
          opacity += (target - opacity) * Math.min(1, dt * 3);
          const rounded = Math.round(opacity * 100) / 100;
          if (rounded !== painted) {
            painted = rounded;
            canvas.style.opacity = String(rounded);
          }
        },
      });

      let syncFrame = 0;
      let lastKey = "";
      // Keep the layer glued to the column: the conversation body scrolls, and
      // an absolutely positioned layer would ride along with it.
      const sync = () => {
        const rect = host.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        tuner.place(rect);
        const key = `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)},${Math.round(rect.height)}`;
        if (key === lastKey) return;
        lastKey = key;
        canvas.style.left = `${Math.round(rect.left)}px`;
        canvas.style.top = `${Math.round(rect.top)}px`;
        canvas.style.width = `${Math.round(rect.width)}px`;
        canvas.style.height = `${Math.round(rect.height)}px`;
      };
      const loop = () => {
        sync();
        syncFrame = requestAnimationFrame(loop);
      };

      const tuner = createTuner({
        get: () => settings,
        set: (next) => {
          settings = normalizeSettings(next);
          applySettings(engine, settings);
          writeSettings(settings);
          tuner.sync(settings);
        },
      });
      document.body.appendChild(tuner.el);
      tuner.sync(settings);
      canvas.style.opacity = String(settings.opacity);
      sync();
      syncFrame = requestAnimationFrame(loop);

      return () => {
        engine.destroy();
        cancelAnimationFrame(syncFrame);
        tuner.destroy();
        canvas.remove();
        host.style.isolation = prevIsolation;
        host.style.position = prevPosition;
      };
    }, []);

    return react.createElement("span", {
      ref: anchor,
      "data-dsh-ascii-sharks-anchor": "",
      style: { display: "none" },
    });
  }

  ctx.slots.inject("conversation.input.dock", () =>
    ctx.slots.register(
      { name: "conversation.input.dock", id: "ascii-sharks", order: 30 },
      SharkBackdrop,
    ),
  );
}

export { apply };
export const inject = ["slots"];
