<div align="center">

# ASCII Sharks

</div>

---

English | [中文](README.md)

**Sharks and schooling fish, drawn in ASCII, swimming behind your conversation column.**

`dsh-ascii-sharks` v0.1.4 · [HuasionWu/dsh-ascii-sharks](https://github.com/HuasionWu/dsh-ascii-sharks)
· ported from [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks)

![Dark theme: sharks and fish cruising behind the conversation column](docs/dark.png)

## What it is

`dsh-ascii-sharks` plugs the [ascii-sharks](https://github.com/stackedlol/ascii-sharks)
canvas animation in behind DeepSeek Harness's conversation column (`_centerCol`):
four sharks patrol with schools of sardines, anchovies and silversides riding the
current. The fish scatter when a shark comes through and regroup afterwards, while
the dot grid twinkles with the light on the surface. It is a wallpaper, not a widget
in the message stream — it takes no layout, no clicks, and no focus.

- **Transparent layer**: the canvas paints ink only; the host's own background
  shows through, so both themes work.
- **Zero runtime dependencies**: React comes from the host, the package ships a
  single prebuilt `lib/client.js`.
- **Fades for the hero**: full strength on the empty new-session screen, easing
  down to "barely there" once the conversation starts.
- **Tunable**: the blue 🦈 button (same size and colour as the send button) opens
  a settings panel; changes apply instantly and persist to `localStorage`.
- **Draggable**: press and drag the 🦈 anywhere, release, and it stays there;
  dragging past the edge pulls it back on screen, and the spot survives a restart.

## Install

```bash
dsh plugin --profile desktop add dsh-ascii-sharks
```

Or from source:

```bash
git clone https://github.com/HuasionWu/dsh-ascii-sharks.git
cd dsh-ascii-sharks
npm install
npm run build
dsh plugin --profile desktop add .
```

> The `desktop` profile is owned exclusively by the Electron app, so the CLI
> cannot modify it. If you hit
> `profile "desktop" is managed exclusively by the Electron application`,
> add the plugin from the in-app marketplace instead, or use another profile
> (e.g. `dsh plugin --profile web add .`).

Restart `dsh web` after installing and open any conversation to see the
background. The settings panel lives at the bottom-right of the conversation area.

| Light theme | Hero strength | Settings panel |
| --- | --- | --- |
| ![Light](docs/light.png) | ![Hero](docs/hero.png) | ![Panel](docs/panel.png) |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| 不透明度 / Opacity | `0.55` | Wallpaper strength during a conversation |
| 首屏强度 / Hero opacity | `1` | Strength on the empty new-session screen |
| 字符大小 / Cell size | `0` | `0` = follow the column width (8–13px) |
| 鲨鱼数量 / Shark count | `4` | 1–8 sharks, each smaller than the last |
| 鱼群密度 / Fish density | `1` | Multiplier on the area-based fish count (0.2–2) |
| 网格强度 / Grid alpha | `0.055` | Opacity of the dot grid |
| 配色 / Palette | Follow app | Dark / light / auto-detected from the host surface |
| 鲨鱼种类 / Species | Classic | Classic, hammerhead, zebra, tiger, great hammerhead, mako, thresher, nurse |
| 点击波纹 / Click ripples | On | Clicking the background splashes and scatters the school |

Settings live in `localStorage["dsh-ascii-sharks/settings/v1"]`; clear it to
restore the defaults.

## Species

All eight upstream outlines are kept, each with its own fins, width and tint:

`classic` · `hammerhead` · `zebra` · `tiger` · `greathammer` · `mako` ·
`thresher` · `nurse`

## Development

```bash
npm install
npm run check     # tsc --noEmit + bundle
npm run harness   # http://127.0.0.1:8931/harness/index.html
```

`harness/index.html` is a fake DSH shell: it stubs `window.__ModuleLoader__`,
`require` and `ctx.slots`, loads the real `lib/client.js`, then mounts the
component into the conversation column the way the host does. Two query params:

- `?theme=light` — light shell, to exercise automatic theme detection;
- `?hero=1` — hide the transcript, to exercise hero strength.

The build output `lib/client.js` must be committed: the host loads it directly and
does not run a build on install.

### Layout

```
src/
  math.ts       vectors, noise and divergence-free current
  species.ts    swimming parameters for the five small fish
  world.ts      spatial-hash boids, shark skeletons, predation and respawn
  renderer.ts   ASCII rasterisation: outline, fins, stripes, dots, wake
  engine.ts     fixed-step loop, sizing, pointer, visibility, reduced motion
  theme.ts      dark/light palettes and theme detection
  settings.ts   settings model, persistence and shark roster
  tuner.ts      plain-DOM settings panel
  client.ts     DSH client entry: slot registration, host lookup, mounting
index.js        host entry (no host logic, just the Loader entry)
cordis.patch.yml  plugin registration patch
```

## Differences from upstream

- The canvas is transparent (upstream paints an opaque black backdrop), colours
  come from a palette, and a light theme was added.
- The engine no longer owns its own sizing or lifecycle; the wallpaper host makes
  it follow the conversation column.
- Added the settings model, the settings panel and the DSH packaging.

See [NOTICE](NOTICE) for original attribution and the list of changes.

## License

[MIT](LICENSE) — upstream `ascii-sharks` ships no licence file; attribution and
the list of modifications are kept here as-is.
