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

- Scenes are data, not code: `{ name, start, end }`. A helper `active(t, s)` decides membership; overlap only in the 0.3–0.6s handoff.
- Per-object progress = `at(t, scene)`; per-object delayed entrance = `at(t, {start: scene.start + delay, end: scene.end})`.
- A scene "claims" its space: the previous scene's EXIT completes before (or during the first 40% of) the next scene's ENTER — never after.

## 3. SVG recipes (the corpus's own techniques)

- **Flow current**: `stroke-dasharray: 5 5` + `@keyframes conv { to { stroke-dashoffset: -20; } }`, layered paths at 1.6s/2.1s/2.6s for organic speed.
- **Heat state**: gradient stop offset bound to a control or timeline: `stopEl.setAttribute('offset', pct + '%')`.
- **Draw-on**: set `pathLength="1"` AND `stroke-dasharray="1"`, then `stroke-dashoffset = 1 - progress`. Forgetting the dasharray is silent: the line shows fully drawn at t=0 (`qa.mjs` reports it as `dead-dash`).
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

## 7. Interaction layer (widgets, not video)

- State changes respond in ≤0.2s; the changed property animates, everything else holds.
- Filtering/sorting/toggling/math happen in JS, not in a new prompt round-trip.
- Controls are pre-styled platform elements when available (range, button) — override only width when needed.
- Every user-visible number rounds before display; slider `step` set.

## 8. Self-check before delivering animated code

Run `node scripts/qa.mjs <file.html>` — it automates all of these:
1. `seek(0)`, `seek(DURATION)` and clamped `seek(-1)`/`seek(D+5)` render complete frames.
2. No timer APIs; no unseeded randomness.
3. Every infinite CSS loop stops under reduced motion.
4. Same `t` revisited out of order → identical frame.
5. The Critique Pass (SKILL.md §9) has been run against the contact sheet (vision) or the per-frame report (text-only).
