import { AsciiRenderer } from "./renderer";
import { paletteFor, type PaletteOptions } from "./theme";
import { World, type SharkSpec } from "./world";

const STEP = 1 / 60;
const MAX_STEPS = 4;

export interface EngineOptions {
  sharks?: SharkSpec[];
  palette?: PaletteOptions;
  /** CSS px per cell; 0 derives it from the canvas width. */
  cellSize?: number;
  /** Population multiplier on top of the area-based fish count. */
  density?: number;
  /** Click ripples. Off leaves the tank purely decorative. */
  interactive?: boolean;
  /**
   * Called once per rendered frame with the elapsed seconds. The host uses it
   * to fade the layer in and out as the conversation goes from empty to busy.
   */
  onFrame?: (dt: number) => void;
}

/**
 * Wires World + AsciiRenderer to a canvas: fixed-timestep loop, resize,
 * pointer input, pausing off-screen, and prefers-reduced-motion.
 *
 * Every visual knob is settable after construction so a settings panel can
 * drive it live without tearing the ecosystem down.
 */
export class WallpaperEngine {
  private world: World;
  private renderer: AsciiRenderer;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private visible = true;
  private interactive: boolean;
  private onFrame?: (dt: number) => void;
  private reducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    options: EngineOptions = {},
  ) {
    this.interactive = options.interactive !== false;
    this.onFrame = options.onFrame;
    this.world = new World(options.sharks, undefined, options.density ?? 1);
    this.renderer = new AsciiRenderer(canvas, paletteFor(options.palette));
    if (options.cellSize) this.renderer.setCellSize(options.cellSize);
    this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);

    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    document.addEventListener("visibilitychange", this.onMotionPreference);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("blur", this.onPointerLeave);

    this.resize();
    // Canvas text can't trigger a webfont load; once the mono face is in, redraw.
    document.fonts?.load(`600 16px ${getComputedStyle(canvas).fontFamily}`).then(() => {
      if (!this.disposed && this.still()) this.drawStill();
    });
    this.schedule();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    document.removeEventListener("visibilitychange", this.onMotionPreference);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("blur", this.onPointerLeave);
  }

  setPalette(options: PaletteOptions) {
    this.renderer.setPalette(paletteFor(options));
    this.renderer.redraw();
  }

  setCellSize(px: number) {
    if (this.renderer.currentCellSize === px) return;
    this.renderer.setCellSize(px);
    this.resize();
  }

  setDensity(density: number) {
    this.world.setDensity(density);
    this.resize();
  }

  setSharks(specs: SharkSpec[]) {
    this.world.setSharks(specs);
    this.resize();
  }

  setInteractive(on: boolean) {
    this.interactive = on;
    if (!on) this.world.pointer.active = false;
  }

  /** True when the engine is deliberately showing one static frame. */
  private still() {
    return this.reducedMotion.matches || document.hidden;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(rect.width, rect.height, dpr);
    this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
    if (this.still()) this.drawStill();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || !this.visible || this.still()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.world.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.onFrame?.(dt);
    this.renderer.render(this.world, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Reduced motion: let the ecosystem settle, then show a single frame. */
  private drawStill() {
    if (this.world.time < 4) {
      for (let i = 0; i < 240; i++) this.world.step(STEP);
    }
    this.renderer.render(this.world, STEP);
  }

  private onMotionPreference = () => {
    if (this.still()) {
      cancelAnimationFrame(this.raf);
      this.drawStill();
    } else {
      this.schedule();
    }
  };

  private toLocal(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    return { x, y, inside };
  }

  private onPointerMove = (e: PointerEvent) => {
    const { x, y, inside } = this.toLocal(e);
    const p = this.world.pointer;
    p.x = x;
    p.y = y;
    p.active = inside && e.pointerType !== "touch" && this.interactive;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.interactive) return;
    const { x, y, inside } = this.toLocal(e);
    if (inside && !this.reducedMotion.matches) this.world.splash(x, y);
  };

  private onPointerLeave = () => {
    this.world.pointer.active = false;
  };
}
