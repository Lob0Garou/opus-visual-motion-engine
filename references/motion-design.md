# Reference: Motion Design

Read BEFORE any animation code. Authoritative for the motion grammar, scene structure, and the behavioral rule. For code-level recipes see `javascript-animation.md`; for timing tables see `animation-primitives.md`.

## 1. Purpose law

- Animation communicates state, hierarchy, or narrative. If it communicates none of those, delete it.
- Un-triggered motion is rationed: a single orchestrated moment per page (one page-load sequence or one reveal) beats scattered effects. Fade-up on every section + hover on every card reads as AI-generated.
- Motion must show BEHAVIOR — convection current, rotation, flow, growth — "not just move for the sake of moving."
- Motion that answers a user action (open, expand, confirm) is always welcome when it shows what changed: the changed part moves, the rest holds still.

## 2. Scene structure (motion graphic / video)

A scene card for every beat (see SKILL.md §1, video plan):

```
beat:   "the flood"
start:  4.0s   end: 6.5s   (2.5s)
composition: dots flood from left into a container; container fills bottom-up
camera: slight push-in (scale 1.0 → 1.06)
type:   count-up "2,300 liters" at right, 48px, enters 4.3s
technique: data-derived fill (the one primary technique of this scene)
settle-hold: container full and still 5.6 → 6.1s
handoff out: 6.5s morph — the full container becomes the next scene's bar
primitives: staggered slide-in + opacity, dashoffset flow, scale push
```

- 3–7 beats. One idea per beat. The viewer must be able to repeat the message after one watch.
- Transitions carry meaning: a hard cut = category change; a match or morph = the same object continuing or changing state; a push/pan = traversal of space; an iris = entering a new world. Never a default crossfade everywhere.
- Scenes tile the timeline and every boundary is a designed handoff with a carrier object (`reel-craft.md` §4). An exit to an empty frame is a declared `dip`, not the default.
- Timeline is absolute: no relative "after the previous one"; every object anchors to a timestamp.

## 3. Motion grammar detail

- **ENTER** (page/scene start): one orchestrated sequence. Elements enter in reading order; siblings stagger 60–120ms [X]; the PRIMARY element moves last and settles longest.
- **EMPHASIS**: pulse scale 0.8↔1.2, glow opacity 0.3↔0.6, or a dashoffset "energy" run; ≤1 emphasized element at a time; loops ≤2s.
- **TRANSITION**: user-triggered state changes 0.2–0.6s; property = what actually changed (width for expansion, opacity for arrival, stroke-dashoffset for flow).
- **CAMERA**: container-level transform (pan/zoom) following the story; one move per scene plus the handoff legs; 0.8–1.3s. Use to reveal detail or to carry a cut (accelerate in, decelerate out), never to decorate.
- **HANDOFF**: the scene boundary. The carrier object (the same object, the camera's target, a ring that becomes the background, a group that collapses into a seed) passes the frame on; everything else swaps on the cut. No element survives mid-state across a boundary except the carrier.
- **EXIT**: 0.3–0.5s, only inside a scene (a label leaving) or for a declared `dip`; exit fully.

## 4. Continuous/ambient loops

- Ambient loops (flow, flicker, glow) run inside `@media (prefers-reduced-motion: no-preference)` only, must be transform/opacity (or stroke-dashoffset for line flow), seamless at the loop point, and layered with varied durations (e.g. 1.6s / 2.1s / 2.6s) so the motion never looks mechanical.
- Ambient loops are subordinate: they must not compete with the ENTER moment or the user's task.

## 5. Anti-patterns

- Everything animating at once; identical durations on neighbors; fade-up on everything; bounce on everything; loops >2s that never resolve; entrances that block interaction; motion during layout (animate transform/opacity, not top/left/width/height).
- The slideshow: every scene fades out to an empty frame and the next fades in. Hand the frame over instead.
- A formation that is still arriving when its exit starts: hold it still ≥0.4s (text: reading time) before it leaves.
- Decoration in disguise: "subtle parallax", random floating particles, gradient shimmer with no meaning — all default decoration. Delete.
- Physics engines or heavy libraries for what CSS already does. No library for a 2s loop.

## 6. Determinism & the critique loop

- The composition is a pure function of time: `render(t)`. Every object's state derives from `t`. No setTimeout/setInterval; no CSS-driven core timeline.
- After the final render: walk the timeline at fixed steps (every 0.5s or 10% of DURATION) and ask — is anything dead, anything cramped, any element in mid-state at a boundary? Then run the Critique Pass (SKILL.md §9).
- Run `scripts/qa.mjs` — it walks the timeline at fixed steps, writes the contact sheet and flags dead air, empty spans, collisions and unsettled ends. Critique the actual frames (or the per-frame report if text-only).
