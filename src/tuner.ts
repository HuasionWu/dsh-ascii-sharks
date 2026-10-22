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
/**
 * Side-view shark facing right: pointed snout, tall triangular dorsal fin and a
 * crescent tail. Drawn as one filled path so it stays legible at 20px, where an
 * emoji or a many-part drawing turns to mush.
 */
const SHARK_GLYPH =
  "M23.4 12C20.6 10.7 17.8 10 15 9.8L12.8 4.6C11.8 7 11.2 8.8 10.8 9.7" +
  "C9.4 9.8 8 9.9 6.6 10.1L2.2 6.2L4.6 12L2.2 17.8L6.6 13.9C8.6 14.1 10.4 14.2 11.9 14.3" +
  "L10 17.4L13 14.5C16.2 14.3 20 13.4 23.4 12Z";
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
  wrap.style.cssText = "position:fixed;z-index:2147483000;pointer-events:none;";

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
    "transition:filter .18s ease,transform .18s ease",
    "box-shadow:0 2px 10px rgba(0,0,0,.28)",
  ].join(";");

  const sharkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sharkIcon.setAttribute("viewBox", "0 0 25 24");
  sharkIcon.setAttribute("width", "20");
  sharkIcon.setAttribute("height", "20");
  sharkIcon.setAttribute("fill", "#fff");
  sharkIcon.setAttribute("aria-hidden", "true");
  const sharkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  sharkPath.setAttribute("d", SHARK_GLYPH);
  sharkIcon.append(sharkPath);

  const closeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  closeIcon.setAttribute("viewBox", "0 0 16 16");
  closeIcon.setAttribute("width", "15");
  closeIcon.setAttribute("height", "15");
  closeIcon.setAttribute("fill", "none");
  closeIcon.setAttribute("aria-hidden", "true");
  const closePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  closePath.setAttribute("d", "M4 4l8 8M12 4l-8 8");
  closePath.setAttribute("stroke", "#fff");
  closePath.setAttribute("stroke-width", "1.9");
  closePath.setAttribute("stroke-linecap", "round");
  closeIcon.append(closePath);

  gear.append(sharkIcon);

  const panel = document.createElement("div");
  panel.style.cssText = [
    "pointer-events:auto",
    "display:none",
    "margin-top:8px",
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
  };
  gear.setAttribute("aria-expanded", "false");
  gear.addEventListener("click", () => setOpen(!open));
  gear.addEventListener("mouseenter", () => {
    gear.style.filter = "brightness(1.08)";
  });
  gear.addEventListener("mouseleave", () => {
    gear.style.filter = "";
  });
  wrap.append(gear, panel);

  return {
    el: wrap,
    place(rect: DOMRect) {
      const right = Math.max(12, window.innerWidth - rect.right + 16);
      wrap.style.right = `${right}px`;
      wrap.style.left = "auto";
      wrap.style.top = "auto";
      wrap.style.bottom = "96px";
      if (open) {
        // Keep the panel on screen when the column is narrow.
        const room = window.innerWidth - right - 16;
        panel.style.width = `${Math.max(200, Math.min(PANEL_WIDTH, room))}px`;
      }
    },
    sync(s: Settings) {
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
