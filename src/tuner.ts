/**
 * A small floating settings panel for the wallpaper.
 *
 * Plain DOM on purpose: the panel is appended to `document.body` so the
 * conversation column cannot clip it, and the plugin bundle should not need a
 * second UI framework just for a gear button.
 */
import { DEFAULT_SETTINGS, SHARK_KINDS, type Settings } from "./settings";

export interface TunerHandle {
  el: HTMLElement;
  /** Keep the panel anchored to the conversation column's rect. */
  place(rect: DOMRect): void;
  /** Push the current settings back into the controls. */
  sync(settings: Settings): void;
  destroy(): void;
}

interface TunerOptions {
  get(): Settings;
  set(next: Settings): void;
}

const PANEL_WIDTH = 268;
const ACCENT = "#33c8cc";
const SPECIES_LABELS: Record<string, string> = {
  classic: "经典",
  hammerhead: "锤头",
  zebra: "斑马",
  tiger: "虎鲨",
  greathammer: "大锤头",
  mako: "灰鲭",
  thresher: "长尾",
  nurse: "护士",
};

function row(label: string, control: HTMLElement) {
  const el = document.createElement("label");
  el.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0;font-size:12px;color:#c9d4e6;";
  const span = document.createElement("span");
  span.textContent = label;
  span.style.cssText = "flex:0 0 92px;opacity:.8;";
  el.append(span, control);
  return el;
}

function slider(value: number, min: number, max: number, step: number, onInput: (v: number) => void) {
  const el = document.createElement("input");
  el.type = "range";
  el.min = String(min);
  el.max = String(max);
  el.step = String(step);
  el.value = String(value);
  el.style.cssText = `flex:1;min-width:0;accent-color:${ACCENT};`;
  el.addEventListener("input", () => onInput(Number(el.value)));
  return el;
}

function select(options: { value: string; label: string }[], value: string, onChange: (v: string) => void) {
  const el = document.createElement("select");
  el.style.cssText = [
    "flex:1",
    "min-width:0",
    "background:#131a28",
    "color:#dce6f7",
    "border:1px solid #2b3549",
    "border-radius:6px",
    "padding:3px 6px",
    "font-size:12px",
  ].join(";");
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    el.append(o);
  }
  el.value = value;
  el.addEventListener("change", () => onChange(el.value));
  return el;
}

function checkbox(checked: boolean, onChange: (v: boolean) => void) {
  const el = document.createElement("input");
  el.type = "checkbox";
  el.checked = checked;
  el.style.cssText = `accent-color:${ACCENT};`;
  el.addEventListener("change", () => onChange(el.checked));
  return el;
}

export function createTuner(options: TunerOptions): TunerHandle {
  const commit = (patch: Partial<Settings>) => options.set({ ...options.get(), ...patch });

  const wrap = document.createElement("div");
  wrap.setAttribute("data-dsh-ascii-sharks-tuner", "");
  // A fixed-size box holding just the button; the panel is positioned against it
  // absolutely so opening the panel never shifts the button out from under the
  // pointer the user just grabbed.
  wrap.style.cssText =
    "position:fixed;z-index:2147483000;pointer-events:none;width:34px;height:34px;";

  // Matches the composer's send button (34px, pill radius, solid accent fill) so
  // the entry point reads as part of the app instead of a faint decoration.
  const gear = document.createElement("button");
  gear.type = "button";
  gear.title = "ASCII Sharks";
  gear.setAttribute("aria-label", "ASCII Sharks 壁纸设置");
  gear.style.cssText = [
    "pointer-events:auto",
    "width:34px",
    "height:34px",
    "padding:0",
    "border-radius:999px",
    "border:none",
    "background:rgb(122,170,255)",
    "display:grid",
    "place-items:center",
    "line-height:1",
    "cursor:pointer",
    "touch-action:none",
    "user-select:none",
    "transition:filter .18s ease,transform .18s ease",
    "box-shadow:0 2px 10px rgba(0,0,0,.28)",
  ].join(";");

  const sharkIcon = document.createElement("span");
  sharkIcon.textContent = "🦈";
  sharkIcon.style.cssText = "font-size:18px;line-height:1;";

  const closeIcon = document.createElement("span");
  closeIcon.textContent = "✕";
  closeIcon.style.cssText = "font-size:16px;line-height:1;color:#fff;";

  gear.append(sharkIcon);

  const panel = document.createElement("div");
  panel.style.cssText = [
    "pointer-events:auto",
    "display:none",
    "position:absolute",
    "top:calc(100% + 8px)",
    "right:0",
    // border-box so the declared width is the width that ends up on screen;
    // otherwise padding and border push the panel past the viewport edge.
    "box-sizing:border-box",
    `width:${PANEL_WIDTH}px`,
    "padding:12px 14px 14px",
    "border-radius:12px",
    "border:1px solid rgba(255,255,255,.12)",
    "background:rgba(9,13,22,.92)",
    "backdrop-filter:blur(14px)",
    "box-shadow:0 12px 34px rgba(0,0,0,.45)",
    "color:#dbe6f8",
    "font:12px/1.4 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
    "max-height:min(70vh,560px)",
    "overflow:auto",
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "ASCII Sharks";
  title.style.cssText = "font-size:13px;font-weight:600;letter-spacing:.02em;margin-bottom:2px;";
  const hint = document.createElement("div");
  hint.textContent = "鲨鱼与鱼群壁纸 · 设置即时生效";
  hint.style.cssText = "font-size:11px;opacity:.5;margin-bottom:8px;";
  panel.append(title, hint);

  const initial = options.get();
  const opacityInput = slider(initial.opacity, 0.05, 1, 0.01, (v) => commit({ opacity: v }));
  const heroInput = slider(initial.heroOpacity, 0.05, 1, 0.01, (v) => commit({ heroOpacity: v }));
  const cellInput = slider(initial.cellSize, 0, 24, 1, (v) => commit({ cellSize: v }));
  const sharkInput = slider(initial.sharkCount, 0, 6, 1, (v) => commit({ sharkCount: v }));
  const densityInput = slider(initial.fishDensity, 0.2, 2.5, 0.1, (v) => commit({ fishDensity: v }));
  const gridInput = slider(initial.grid, 0, 0.2, 0.005, (v) => commit({ grid: v }));

  const themeInput = select(
    [
      { value: "auto", label: "跟随应用" },
      { value: "dark", label: "深色墨水" },
      { value: "light", label: "浅色墨水" },
    ],
    initial.theme,
    (v) => commit({ theme: v as Settings["theme"] }),
  );

  const kindInput = select(
    SHARK_KINDS.map((k) => ({ value: k, label: SPECIES_LABELS[k] ?? k })),
    initial.sharks[0] ?? "classic",
    (v) => commit({ sharks: [v as Settings["sharks"][number]] }),
  );

  const splashInput = checkbox(initial.interactive, (v) => commit({ interactive: v }));

  panel.append(
    row("不透明度", opacityInput),
    row("首屏强度", heroInput),
    row("字符大小", cellInput),
    row("鲨鱼数量", sharkInput),
    row("鱼群密度", densityInput),
    row("网格强度", gridInput),
    row("配色", themeInput),
    row("鲨鱼种类", kindInput),
    row("点击波纹", splashInput),
  );

  const note = document.createElement("div");
  note.textContent = "字符大小 0 = 随窗口宽度自适应";
  note.style.cssText = "font-size:11px;opacity:.42;margin-top:6px;";
  panel.append(note);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "恢复默认";
  reset.style.cssText = [
    "margin-top:10px",
    "width:100%",
    "padding:6px 0",
    "border-radius:8px",
    "border:1px solid rgba(255,255,255,.14)",
    "background:rgba(255,255,255,.06)",
    "color:#dbe6f8",
    "font-size:12px",
    "cursor:pointer",
  ].join(";");
  reset.addEventListener("click", () => options.set({ ...DEFAULT_SETTINGS }));
  panel.append(reset);

  let open = false;
  const setOpen = (next: boolean) => {
    open = next;
    panel.style.display = next ? "block" : "none";
    gear.replaceChildren(next ? closeIcon : sharkIcon);
    gear.setAttribute("aria-expanded", next ? "true" : "false");
    if (next) fitPanel();
  };

  /* ------------------------------------------------------------------ drag */
  // The button is dragged around the viewport and its position is remembered.
  // A press only counts as a drag after the pointer travels a few pixels, so a
  // plain click still toggles the panel.
  const BTN = 34;
  const EDGE = 8;
  const DRAG_SLOP = 4;
  let pos: { x: number; y: number } | null = null;
  let drag: { id: number; dx: number; dy: number; startX: number; startY: number; moved: boolean } | null = null;
  let suppressClick = false;

  const clampX = (x: number) => Math.min(Math.max(EDGE, x), Math.max(EDGE, window.innerWidth - BTN - EDGE));
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), Math.max(EDGE, window.innerHeight - BTN - EDGE));

  const applyPos = () => {
    if (!pos) return;
    wrap.style.left = `${pos.x}px`;
    wrap.style.top = `${pos.y}px`;
    wrap.style.right = "auto";
    wrap.style.bottom = "auto";
  };

  // Keep the panel inside the viewport: it opens below the button and flips
  // above it when the space underneath is not enough but the space above is.
  function fitPanel() {
    if (!pos) return;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
    panel.style.width = `${width}px`;
    // Align the panel's right edge with the button's, then clamp it into the
    // viewport. Doing the maths in viewport coordinates avoids the case where
    // aligning to either edge of the 34px wrapper still runs off screen.
    const left = Math.min(Math.max(EDGE, pos.x + BTN - width), window.innerWidth - EDGE - width);
    panel.style.left = `${left - pos.x}px`;
    panel.style.right = "auto";

    const below = window.innerHeight - (pos.y + BTN) - EDGE;
    const above = pos.y - EDGE;
    // Measured after display:block, so the panel's natural height is known.
    const natural = panel.scrollHeight || 0;
    const flip = natural > below && above > below;
    panel.style.top = flip ? "auto" : "calc(100% + 8px)";
    panel.style.bottom = flip ? "calc(100% + 8px)" : "auto";
    const room = (flip ? above : below) - 8;
    panel.style.maxHeight = `${Math.min(Math.max(180, room), Math.round(window.innerHeight * 0.7))}px`;
  }

  gear.setAttribute("aria-expanded", "false");
  gear.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setOpen(!open);
  });
  gear.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = wrap.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    gear.setPointerCapture(event.pointerId);
  });
  gear.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) {
      const travel = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
      if (travel < DRAG_SLOP) return;
      drag.moved = true;
      gear.style.cursor = "grabbing";
      gear.style.transition = "none";
    }
    pos = { x: clampX(event.clientX - drag.dx), y: clampY(event.clientY - drag.dy) };
    applyPos();
    // The panel rides along as a child, but it still has to re-decide whether it
    // opens above or below the button as the button moves past mid-screen.
    if (open) fitPanel();
  });
  const endDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    gear.style.cursor = "pointer";
    gear.style.transition = "filter .18s ease,transform .18s ease";
    if (gear.hasPointerCapture(event.pointerId)) gear.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressClick = true;
      options.set({ ...options.get(), buttonPos: pos });
      if (open) fitPanel();
    }
  };
  gear.addEventListener("pointerup", endDrag);
  gear.addEventListener("pointercancel", endDrag);
  gear.addEventListener("mouseenter", () => {
    gear.style.filter = "brightness(1.08)";
  });
  gear.addEventListener("mouseleave", () => {
    gear.style.filter = "";
  });
  wrap.append(gear, panel);

  // Restore a remembered position, or fall back to the bottom-right corner.
  const stored = options.get().buttonPos;
  if (stored) {
    pos = { x: clampX(stored.x), y: clampY(stored.y) };
    applyPos();
  }

  return {
    el: wrap,
    place(rect: DOMRect) {
      if (!pos) {
        // Default anchor: just above the composer, aligned to the column's right
        // edge. Recomputed on resize so the fallback stays put.
        pos = {
          x: clampX(window.innerWidth - Math.max(12, window.innerWidth - rect.right + 16) - BTN),
          y: clampY(window.innerHeight - 96 - BTN),
        };
        applyPos();
      } else {
        // A remembered spot may be off-screen after a resize or monitor change.
        const x = clampX(pos.x);
        const y = clampY(pos.y);
        if (x !== pos.x || y !== pos.y) {
          pos = { x, y };
          applyPos();
        }
      }
      if (open) fitPanel();
    },
    sync(s: Settings) {
      if (s.buttonPos && (!pos || s.buttonPos.x !== pos.x || s.buttonPos.y !== pos.y)) {
        pos = { x: clampX(s.buttonPos.x), y: clampY(s.buttonPos.y) };
        applyPos();
        if (open) fitPanel();
      }
      opacityInput.value = String(s.opacity);
      heroInput.value = String(s.heroOpacity);
      cellInput.value = String(s.cellSize);
      sharkInput.value = String(s.sharkCount);
      densityInput.value = String(s.fishDensity);
      gridInput.value = String(s.grid);
      themeInput.value = s.theme;
      kindInput.value = s.sharks[0] ?? "classic";
      splashInput.checked = s.interactive;
    },
    destroy() {
      wrap.remove();
    },
  };
}
