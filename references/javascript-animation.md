# Reference: JavaScript Animation (deterministic engine + recipes)

Read BEFORE writing any animated JavaScript. Authoritative for the `render(t)` engine, scene scheduling, SVG/canvas recipes, and library discipline.

## 1. The deterministic engine (mandatory shape)

Start from `assets/composition-template.html` — it contains this engine plus stage fitting, player and tokens. The sketch below only shows the shape.

```html
<script>
const DURATION = 12;                                  // seconds, from the timeline
const scenes = [
  { name: "hook",    start: 0.0, end: 2.5 },
  { name: "problem", start: 2.5, end: 5.5 },
  { name: "proof",   start: 5.5, end: 9.0 },
  { name: "close",   start: 9.0, end: 12.0 },
];
function easeOut(t){ t=Math.min(Math.max(t,0),1); return 1-Math.pow(1-t,3); }
function at(t, s){ return easeOut((t - s.start) / (s.end - s.start)); } // 0→1 inside a scene

function render(t){
  for (const s of scenes) if (t >= s.start && t < s.end) window.__scene = s.name;
  // derive EVERY element state from t — no setTimeout, no setInterval, no CSS timeline
  el.style.opacity = at(t, scenes[0]) * 0.9 + 0.1;
  el.style.transform = `translateY(${12 * (1 - at(t, scenes[0]))}px)`;
}
window.seek = (t) => render(Math.min(Math.max(t, 0), DURATION));
window.DURATION = DURATION;
</script>
```

Rules:
- One `render(t)` per file; every state derives from `t`; identical `t` = identical frame (also with a seeded RNG for particle work).
- No `setTimeout`/`setInterval`; CSS `@keyframes` allowed ONLY for ambient loops wrapped in `@media (prefers-reduced-motion: no-preference)` — and never in a piece that will be exported (CSS loops do not follow `seek`).
- `requestAnimationFrame` may only advance a playback clock and call `render(clock)`; `seek()` must stop that clock (otherwise capture frames get overwritten).
- Expose `window.seek(t)` + `window.DURATION` — this is what makes frame capture and export possible.
- Numbers displayed go through rounding helpers; particle systems use `randomSeed(seed)`-style determinism.

## 2. Scene scheduling

- Scenes are data, not code: `SCENES = { name: [start, end] }`, back to back (they tile the timeline). `cut(el, t, start, end)` shows a scene inside its window; `HANDOFFS = [{ t, type, via }]` names what carries each cut.
- Per-object progress = `tw(t, t0, dur, ease.x)`; the eased value drives every property of that object.
- The last frame of scene N and the first frame of scene N+1 share the carrier object at the same pose (position, scale, colour): compute both from the same named constant (`const PUSH = { s, fx, fy, ax, ay }`), never from two hand-typed numbers.
- Persistent worlds (a chart that appears in several scenes) are ONE DOM subtree shown in all their windows; re-theme with a class instead of rebuilding.

## 3. SVG recipes (the corpus's own techniques)

- **Flow current**: `stroke-dasharray: 5 5` + `@keyframes conv { to { stroke-dashoffset: -20; } }`, layered paths at 1.6s/2.1s/2.6s for organic speed.
- **Heat state**: gradient stop offset bound to a control or timeline: `stopEl.setAttribute('offset', pct + '%')`.
- **Draw-on**: set `pathLength="1"` AND `stroke-dasharray="1"`, then write `stroke-dashoffset = 1 - progress` from `render(t)`. Forgetting the dasharray is silent: the line shows fully drawn at t=0 (`qa.mjs` reports it as `dead-dash`). Under GSAP use real lengths instead (§6).
- **Reveal a curve with a leading dot**: clip the path with a `<clipPath>` rect whose width follows progress, and place the dot at `(x, y(x))` computed from the same spline. With uniformly spaced x, a Catmull-Rom spline has linear x(t), so y at the reveal edge is exact (see `examples/brand-reel.html` `vAt()`).
- **Alive micro-motion**: odd/even children flicker at different durations (`.6s`/`.8s ease-in-out`, offset `.15s`).
- **Click-throughs**: nodes wrapped in `<g class="node" onclick="sendPrompt-or-callback">` with hover dim.

## 4. Canvas recipes

- Chart.js: hex colors only (canvas cannot resolve CSS variables); wrapper `<div style="position:relative; height:300px">` + `responsive:true, maintainAspectRatio:false`; height ONLY on the wrapper (horizontal bars: `bars × 40 + 80` px); pad scale ranges ~10% beyond data for bubble/scatter; `scales.x.ticks.autoSkip:false, maxRotation:45` when ≤12 categories must all show; disable default legend, build a custom HTML legend with values.
- Canvas + deterministic time: drive `Chart.update('none')` from `render(t)` only when a displayed value changes; keep the chart's own animations off (`options.animation = false`) so `seek()` is exact.

## 5. Three.js / WebGL discipline (when truly needed)

- UMD build pinned, loaded before the inline script; check the pinned version's API surface (old builds lack newer geometries/controls — e.g. r128 has no OrbitControls and no CapsuleGeometry: use Cylinder/SphereGeometry).
- Camera moves are scripted transforms of the camera in `render(t)`; no user-facing physics.
- Prefer DOM/SVG unless 3D is the message.

## 6. GSAP discipline (when the choreography justifies it)

- Load pinned UMD from an allowed CDN; build ONE master timeline; register scenes as labels; expose `window.seek(t) { tl.pause().seek(t * tl.duration() / DURATION); }`-equivalent so frame capture stays exact; `gsap.ticker` off during capture.
- GSAP is allowed when: (a) timeline has >6 staggered tracks, or (b) SVG morph/draw orchestration is the point. Otherwise vanilla `render(t)` wins (fewer moving parts, deterministic by construction).
- Traps that only show in frames:
  - CSS values in px are rounded: a `strokeDashoffset` tween from 1 to 0 on a `pathLength="1"` path snaps (0 or 1). Tween a real length (`getTotalLength()`, or `2πr` for a circle), or a proxy object whose `onUpdate` writes the attribute (`qa.mjs` `dash-snap`).
  - `fromTo` applies its from-state when the tween is created (`immediateRender`): a pulse ring whose from-state is visible shows at t = 0. Add `immediateRender: false` to any `fromTo` that starts after 0 with a visible from-state.
  - Easing names: `power1` = quad, `power2` = cubic, `power3` = quart, `power4` = quint. When porting, map by degree, not by the number.

## 7. Camera, derived state and pixel determinism (video)

```js
// one camera per .world: world point F lands on stage point A at scale s  →  T = A − s·F
camera(world, s, fx, fy, ax, ay, blur);
const POSE = { id: [1, 960, 540, 960, 540], peak: [1.55, 1560, 340, 1180, 470] };
const mix = (A, B, p) => A.map((v, i) => lerp(v, B[i], p));
// scene 1 accelerates INTO the peak; scene 2 starts on the same pose and decelerates out (speed ramp through the cut)
const pose = t < 2.5 ? mix(POSE.id, POSE.peak, tw(t, 1.2, 1.3, ease.in)) : mix(POSE.peak, POSE.id, tw(t, 2.5, 0.9, ease.expoOut));
camera($("world"), ...pose, t < 2.5 ? 5 * tw(t, 2.2, 0.3, ease.in) : 5 * (1 - tw(t, 2.5, 0.28)));
```

- Derived state: compute quantities from the same model every frame (coverage per hour from the live bar positions; a gap from demand minus coverage). Never animate a chart and its cause with two separate tweens.
- Directional motion blur: an SVG `<feGaussianBlur stdDeviation="X 0">` whose X follows the same ease as the move (`40 * (1 - p)`), sharp at the settle.
- Glitch: offsets from `hash01(Math.floor(t * 24) * 13 + layer)` times a decaying envelope; the quantization IS the digital texture; clamp to exact rest when the envelope ends.
- Pixels must be reproducible, not only state: drift fine textures (dot grids, hairlines) by whole pixels (`Math.round`); write `transform = "none"` once a transform tween is done (a lingering identity transform keeps text on its own layer and its anti-aliasing depends on history); the template preloads every glyph on the stage so a late web-font subset (`●`, `✓`, accents) cannot change a frame after capture started.

## 8. Interaction layer (widgets, not video)

- State changes respond in ≤0.2s; the changed property animates, everything else holds.
- Filtering/sorting/toggling/math happen in JS, not in a new prompt round-trip.
- Controls are pre-styled platform elements when available (range, button) — override only width when needed.
- Every user-visible number rounds before display; slider `step` set.

## 9. Self-check before delivering animated code

Run `node scripts/qa.mjs <file.html>` — it automates all of these:
1. `seek(0)`, `seek(DURATION)` and clamped `seek(-1)`/`seek(D+5)` render complete frames.
2. No timer APIs; no unseeded randomness.
3. Every infinite CSS loop stops under reduced motion.
4. Same `t` revisited out of order → identical frame.
5. The Critique Pass (SKILL.md §9) has been run against the contact sheet (vision) or the per-frame report (text-only).
