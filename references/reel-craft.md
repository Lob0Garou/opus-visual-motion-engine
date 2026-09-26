# Reference: Reel Craft (the quality bar for any timed piece)

Read BEFORE planning any video, motion graphic, showreel, brand reel, sizzle or explainer. This file turns a correct composition into a designed one. Every rule has a check; `examples/brand-reel.html` implements all of them and passes `qa.mjs` with 0 FAIL / 0 WARN.

The difference between "generated" and "designed" motion is rarely a technique. It is: real material instead of placeholders, one idea carried by a device, cuts that hand the frame over instead of emptying it, a world that persists across scenes, and sound.

## 1. Ground truth first (before the plan)

Search for the subject's own material and use it. Record every source in the plan under `## Sources`.

| Look for | Where | Use it as |
|---|---|---|
| official logo (SVG paths, not a screenshot) | the user's repos (`public/`, `assets/`, `*logo*.svg`, `*monogram*`), brand folders | the mark in the film, geometry copied verbatim; never redraw or approximate it |
| brand hex values | the logo SVG `fill`s, CSS tokens, tailwind config | the palette (it beats any "tell" rule: cite the file) |
| the product's real UI | screenshots, the app's source (charts, tooltips, tables) | the visual vocabulary of the scenes (the real tooltip, the real chart types, real labels) |
| real numbers | case studies, README, CV, dashboards | the proof beat; copy the exact figure and its qualifier ("observed", "pilot of 4 stores") |
| the subject's own sentence | site hero, tagline, pitch | the thesis line (§2) |
| an existing motion identity | intros, Remotion/After Effects files, brand guides | how the mark moves (echo it, don't contradict it) |

- If a search finds nothing, say so in the plan and design from the subject's world, not from a style default.
- Illustrative data (fake names, a demo schedule) is labeled illustrative in the plan and the delivery, and must be **internally consistent**: generate it with a small script (an optimizer, a seeded generator) so the numbers on screen agree with each other.
- Metrics keep their honesty qualifiers. "+0.86 p.p. observed in a 4-store pilot" is not "+0.86 p.p. guaranteed".

## 2. Concept: one sentence, one device, two registers

Write these three lines in the plan before any scene card:

1. **Thesis**: one sentence, ideally the subject's own words, split across beats as a running sentence. Example: "O PICO / NÃO ESPERA." (scene 1) → "A ESCALA / SE AJUSTAR." (scene 2) → answered by "AJUSTA / ANTES DO PICO." (scene 4). The viewer reads one argument, not seven captions.
2. **Device**: one persistent object or metaphor that carries the whole piece and belongs to the subject's world. A store clock running 10:00 → 20:00; a route; a counter; a single chart that stays on screen and changes state. The device appears in the first 2 s and pays off at the signature moment.
3. **Registers**: problem and answer look different, and the switch IS the signature moment. Dark ink → paper; minor key → major key; chaos (glitch, gap) → order (grid, coverage). One switch per piece, never a fade: the switch passes through an object (the logo's ring, a door, a screen).

Plant the brand mark as a character before the end card. In the reference reel the "engine" of scene 3 is the Q ring of the logo; the camera flies through it into the paper world; scene 7 then builds the full monogram. The end card pays off something the viewer already met.

## 3. A persistent world

When several beats show the same system, build it ONCE and move the camera, not the content.

- One DOM world (chart, map, plan, UI) with fixed geometry constants, reused by every scene that shows it. Scenes 1, 2 and 4 of the reference reel are the same `#world`; scene 4 re-themes it (a CSS class) instead of rebuilding it.
- One camera per world: `camera(el, s, fx, fy, ax, ay, blur)` places world point F on stage point A at scale s (T = A − s·F). Poses are data (`POSE = { id, peak, push }`); scenes interpolate between named poses.
- Derived state: everything that depicts a quantity is computed every frame from the same model. In the reference reel the coverage histogram is recomputed from the live positions of the shift bars, so when the bars slide the columns rise in the same frame and the gap blocks shrink by themselves. Never tween a chart and its cause separately.

Check: the plan lists the worlds and which scenes use each; the code has one builder per world.

## 4. Cuts are handoffs

A cut transfers the frame from one scene to the next through something that moves. "Scene ends → frame empties → next scene fades in" reads as a slideshow; `qa.mjs` reports it as `empty-handoff`, and gaps between SCENES as `scene-gap`.

Scenes tile the timeline (end of one = start of the next). Every cut has a row in the plan's **handoff table** and in `window.HANDOFFS`:

| type | what carries the frame | the two frames either side of the cut |
|---|---|---|
| `match` | the same object at the same place, size and colour | nearly identical (`qa` warns above 35 % changed pixels) |
| `push` | the camera accelerates into an object (ease-in), the next scene starts from depth and decelerates (ease-out); blur peaks at the cut | different content, continuous velocity |
| `iris` | an object's interior grows until it is the next background (a ring, a lens, a screen) | nearly identical |
| `morph` | one object changes state (a number becomes a tile, a bar becomes a column) | nearly identical |
| `collapse` | everything converges into one object that seeds the next scene (the proof collapses into a tile; 42 tiles implode into the logo) | same object, new context |
| `cut` | a hard cut for a category change, ideally on a hit (a glitch, a tear, a beat) | different |
| `dip` | a deliberate pause through an empty frame — the only type allowed to pass through empty | empty between |

Speed ramp through a cut: the outgoing move accelerates (`ease.in` / `quartIn`) and lands mid-motion on the cut; the incoming move starts at speed and settles (`ease.expoOut`). The eye reads one continuous move.

Check: `handoffs.png` shows the last frame before and the first frame after each cut; `report.md` lists diff and ink per cut.

## 5. Range without noise (technique budget)

For a reel or showcase, each scene has one primary technique and no two scenes share it. Name it on the scene card:

kinetic slam (scale 1.8→1 + blur, quart/quint out, impact shake) · directional snap (x slide + horizontal `feGaussianBlur` streak coupled to the ease) · word waterfall (binary opacity, rise + counter-rotation) · mask rise (line in an `overflow:hidden` mask) · typewriter clip (`clip-path` with `steps(n)`) · stroke draw · data-derived chart · RGB glitch (quantized `hash01` jitter, ghost copies, clean resolve) · iris through an object · slow-fast-slow group move (`nudge`) · count-up with scale · grid assemble with light wave · particle burst (seeded ballistic) · logo assemble.

Headline entrances: no two identical in one piece. Everything else follows `motion-design.md` (purpose, one emphasis at a time).

## 6. Frame anatomy

- Three layers in every frame: background life (a slow drifting dot grid or blueprint grid, a breathing glow, an outlined ghost word from the subject), the message, and foreground accents (labels, tags, readouts).
- One headline anchor zone per register (top-left in the reference reel), so the eye knows where to read; data sits bottom-right of it on the diagonal.
- Display type is huge and tight: 120–260 px, heavy, leading 0.9, tracking −0.035em; one accent word per headline in the semantic accent colour.
- Nothing is static for more than ~0.5 s except the final hold; ambient loops are subordinate and slow.
- **Settle-hold**: after a group arrives it holds still long enough to be read before it leaves: ≥ 0.4 s for a shape formation, the reading time for text (≥ 1.2 s / 8 words). A formation that is still arriving when its exit starts was never seen.
- End card: the mark, the name, one line; chrome fades out so the last frame is clean and settled.

## 7. Diegetic HUD (optional chrome that reports state)

A reel may carry a thin HUD: registration corner marks, timecode (`TC hh:mm:ss:ff` from t), scene index + name (slot-machine roll on each cut), the story's device (the store clock following the curve's leading dot), a progress rail with chapter ticks. Rules: every element reports live state (a static label is template chrome, not HUD); mark the container `data-qa-hud` (still checked for contrast and size, not counted as an AI tell); it switches register with the piece; it gets out of the way of the signature transition (the reference HUD cuts out while the camera flies through the Q and returns in ink) and of the end card.

## 8. Sound is part of the deliverable

A reel without sound is unfinished. When no music is supplied, compose it with `scripts/score.mjs` from a cue sheet embedded in the composition (`<script type="application/json" id="score">`): the same timestamps as `render(t)`.

- Tempo first: 120 BPM → a beat every 0.5 s; put cuts on beats or half-bars. Scene durations are multiples of the beat where possible.
- Sections follow the registers: problem in a minor key (`groove`), the engine as a `build` (no kick, rising arpeggio, riser), the answer as a `drive` in the relative major, a `resolve` chord on the logo.
- A hit on every visual event: `impact` on a slam, `whoosh` peaking on a push, `glitch` on the tear, `click` per node, `pop` on a snap, `ticks` under a count-up, `chime` on the resolved state.
- Loudness: −14 LUFS integrated, true peak ≤ −1 dBTP (the script masters and re-measures). Export with `export.mjs --audio`.

## 9. Determinism traps that only show in frames

- **Sub-pixel texture drift**: a fine texture (dot grid, hairline grid) translated by fractional pixels rasterizes differently depending on the previous frame (compositor tile reuse). Drift textures by whole pixels: `Math.round(...)`.
- **Settled transforms**: an identity transform left on an element (`translateY(0px) rotate(0deg)`) keeps it on its own layer and its text anti-aliasing then depends on history. When a tween completes, write `transform: "none"`.
- **Lazy font subsets**: web fonts load per unicode range when a glyph first renders; a `●` or `✓` appearing at 3.5 s changes pixels after capture started. The template's contract block preloads every family × weight with every character on the stage.
- **Normalized dashes under GSAP**: `pathLength="1"` dash values tweened by GSAP are rounded to whole px (0 or 1), so the draw snaps. In vanilla `render(t)` write the attribute yourself; under GSAP tween a real length. `qa.mjs` reports `dash-snap`.
- **GSAP `fromTo` renders at build time**: a later `fromTo` whose from-state is visible (a pulse ring from `opacity: .9`) shows at t = 0. Use `immediateRender: false` or vanilla `render(t)`.

## 10. Verification specific to reels

Run `qa.mjs` with the signature moment and every handoff in view (`--at` for the signature, `window.HANDOFFS` for cuts). Then, from the report or the images:

1. `handoffs.png`: does each cut carry the frame through its declared object?
2. `moments.png` entry/mid/end per scene: is the device visible, is the headline in its zone, does every formation settle before it leaves?
3. Partial progress: a draw, a count or a formation sampled at 25/50/75 % of its tween must show an intermediate state (`dash-snap` automates the draw case).
4. `report.json` coverage: no frame under 1.5 % ink after 0.5 s except a declared `dip`.
5. Listen through the cue sheet: every visual hit has a sound, every sound has a visual reason.
