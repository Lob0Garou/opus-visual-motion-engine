# Reference: Animation Primitives (timing & easing table)

Read when choosing durations/easings for any animation, or when building the per-scene card. The corpus-anchored values come first; every [X] value is a working default committed in the plan — keep it consistent once chosen.

## 1. Easing vocabulary (pick by intent)

| Intent | Easing | Corpus source |
|---|---|---|
| arrive / settle | ease-out | [S:slack-gif-creator] easing lib |
| leave / accelerate / fall | linear / ease-in | [S] |
| morph between states | ease-in-out | [S:visualize.md] flicker uses it |
| playful landing | bounce-out | [S:slack-gif-creator] |
| overshoot charm | back-out | [S:slack-gif-creator] |
| elastic arrival | elastic-out | [S:slack-gif-creator] (hero reveals only) |

Implementation (pure function of t):

```js
const easeOut = t => 1 - Math.pow(1 - t, 3);          // [X] cubic
const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;  // [X]
const backOut = (t, s=1.7) => 1 + (s+1)*Math.pow(t-1, 3) + s*Math.pow(t-1, 2); // [X]
const bounceOut = t => { const n=7.5625, d=2.75;    // [X] standard quartic bounce
  if (t < 1/d) return n*t*t;
  if (t < 2/d) return n*(t-=1.5/d)*t + .75;
  if (t < 2.5/d) return n*(t-=2.25/d)*t + .9375;
  return n*(t-=2.625/d)*t + .984375; };
const clamp01 = t => Math.min(Math.max(t, 0), 1);
const pulse = (t, freq) => 1 + 0.2 * Math.sin(2*Math.PI*freq*t); // scale 0.8..1.2 family
```

## 2. Duration map (corpus-anchored)

| Motion | Duration | Source |
|---|---|---|
| micro state change | 0.2s | [S:visualize.md] toggle/background transitions |
| standard transition | 0.3–0.5s | [X] consistent range |
| hover/press response | ≤0.2s | [S:visualize.md] `.2s` button states |
| flicker pair (organic) | 0.6s + 0.8s, offset 0.15s | [S:visualize.md:L495-496] |
| flow loop (layered) | 1.6s / 2.1s / 2.6s | [S:visualize.md:L531-533] |
| ambient glow | 3s | [S:visualize.md:L497] |
| loop ceiling (any loop) | ≤2s | [S:visualize.md:L467] |
| ENTER stagger | 60–120ms between siblings | [X] |
| EXIT | 0.3–0.5s | [X] |
| camera push | 0.8–1.2s | [X] |
| count-up | ≤0.8s | [X] |

## 3. Primitives (each = one visual verb)

- **slide-in**: `translateY(12px→0)` + `opacity 0→1`, ease-out [X] — for ENTER; offset per sibling.
- **grow-in**: `scale 0.8→1` + opacity, transform-origin at the element's visual anchor.
- **flow**: SVG path `stroke-dasharray: 5 5; animation: conv Ns linear infinite` with `@keyframes conv { to { stroke-dashoffset: -20; } }` — reads as current/heat/cable [S:visualize.md].
- **pulse**: scale or opacity oscillation 0.8↔1.2 / 0.3↔0.6 [S:slack-gif-creator, visualize.md].
- **flicker**: alternating `opacity .82` at 0.6/0.8s ease-in-out on odd/even children [S:visualize.md].
- **count-up**: number interpolation over ≤0.8s with rounded display.
- **particle burst**: seeded angles, velocity + per-frame gravity, alpha fade-out [S:slack-gif-creator].
- **dash reveal**: `stroke-dashoffset` from path-length → 0 (draws a line) [X].
- **push-in**: stage `scale 1→1.06` ease-in-out 1s [X].

## 4. Composition rules

- Two objects moving together get DIFFERENT durations or an offset; equal-duration neighbors read mechanical.
- One emphasized element at a time; ambient loops subordinate to the ENTER moment.
- Animate `transform`/`opacity` only (plus `stroke-dashoffset` for line flow); never top/left/width/height.
- All CSS loops inside `@media (prefers-reduced-motion: no-preference)`.
- If the animation cannot state its purpose in one clause ("shows water heating"), delete it.
