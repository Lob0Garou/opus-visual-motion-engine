---
name: opus-visual-motion-engine
description: >
  Build motion graphics, animated/explainer/product videos, kinetic typography,
  landing pages, dashboards, mockups, diagrams and data viz as single-file HTML
  with a named visual direction, deterministic seek(t) timing, automated render
  QA and MP4 export. Use for any request to make, animate, render or review a
  video, animation, motion graphic, UI or visual. Triggers: video, vídeo,
  animação, motion graphic, explainer, kinetic type, landing page, hero,
  dashboard, mockup, diagram.
---

# Opus Visual Motion Engine

A disciplined pipeline for visual deliverables: **plan → build from the template → render → QA → fix → export**. Quality comes from gates applied before and after rendering, not from taste. Follow the steps in order. Do not skip a step because the task "looks simple".

Paths below are relative to this skill's directory (the `skill_resources` base you were given). Call it `$SKILL`.

## 0. Read first (unconditional)

Before writing any code, read the references that match the deliverable. They are authoritative for their topic:

| Deliverable | Read |
|---|---|
| video, motion graphic, explainer, product video | `references/video-generation.md`, `references/motion-design.md`, `references/javascript-animation.md` |
| kinetic typography / type-led piece | the video set above + `references/typography.md` |
| landing page, dashboard, mockup, UI | `references/visual-design.md`, `references/typography.md` |
| diagram, schematic, data viz | `references/visual-design.md` §4 |
| framing / camera decisions | `references/cinematography.md` |
| durations and easings | `references/animation-primitives.md` |
| music or voice to sync | SKILL.md §10 + `references/video-generation.md` §6 |

Worked examples live in `examples/*.md`. Read the one closest to the brief.

## 1. Plan before code (write it out)

Write the plan in your reply (or in a `PLAN.md` next to the output) **before** creating the HTML. A plan that exists only in your head does not count.

**UI / page**
1. **Primary message**: one sentence. What must the viewer understand in 3 seconds?
2. **Named direction**: a name, 4–6 named hex tokens with assigned meanings, typefaces with roles, form treatment. Derive it from the subject's industry, materials and vernacular. A toy store and a fintech dashboard never share a direction.
3. **Hierarchy**: tag every block PRIMARY / SECONDARY / TERTIARY. Only PRIMARY gets the one bold gesture.
4. **Section progression**: one line per section, giving its job and how it hands off to the next.
5. **Pre-render math**: text width ≈ `chars × 0.55 × font-size` (sans) or `× 0.5` (serif); box width = `max(title_chars × 8, subtitle_chars × 7) + 24` at 14px; row fit = Σwidths + gaps ≤ container. Trace every connector against every box. If it crosses one, route an L-shaped path.

**Video / motion graphic**
1. **Core message**: one sentence. If it needs two, there are two videos.
2. **Beats**: 3–7. Each beat answers "what does the viewer now know?"
3. **Scene card per beat**: start/end (s), composition, camera, type sizes, primitives (2–4), exit. Use the template in `references/motion-design.md` §2.
4. **Signature moment**: name the ONE frame where the mechanism is *shown*, not labeled (e.g. noise filtered into signal). If the story only works with its captions, redesign the beat.
5. **Global timeline**: absolute timestamps. A scene's EXIT completes before the next scene claims the space. Set `DURATION` to the true end (10–20s by default; 30–45s only with narration).

A scene without a card does not belong in the video.

## 2. Build from the template (video)

Copy `assets/composition-template.html` next to the deliverable and fill the EDIT blocks. Do not rewrite the ENGINE blocks. They already provide:
- a 1920×1080 `#stage` (change `STAGE_W/H` for 1080×1920 or 1080×1080), fitted to any window;
- `window.DURATION`, `window.seek(t)`, `window.render(t)`, `window.SCENES`: the capture/export contract (QA captures every scene from `SCENES`);
- `at()`, `ease.*`, `lerp`, `mulberry32` (seeded PRNG), and `layer()` for scene visibility plus EXIT;
- audio helpers `audioAt(t, "rms"|"low")`, `since(t, list)`, `hit(t, list, dur)` that read `window.AUDIO` (§10) and return 0 without it;
- a preview player (space, ←/→, Home/End) that turns off automatically under capture and reduced motion;
- color tokens in the required 3 layers (light, `prefers-color-scheme` guarded, `[data-theme]`).

For pages, write a normal single-file HTML following §6.

## 3. Deterministic time (video)

- `render(t)` is the only state driver. Every position, opacity, size, number and dashoffset is computed from `t` in seconds. `seek(x)` renders the identical frame no matter what was rendered before it.
- `t` is in **seconds**. Clamp `t` to `[0, DURATION]`, never to `[0, 1]`: clamping seconds to 0..1 silently freezes the whole timeline.
- **Forbidden:** `setTimeout`, `setInterval`, CSS animations/transitions as the timeline, unseeded `Math.random()`, `Date.now()` in state. `requestAnimationFrame` may only advance the playback clock and call `render(clock)`. The template already does this.
- Randomness: generate at build time from `mulberry32(seed)`, never inside `render`.
- SVG draw-on needs all three: `pathLength="1"`, `stroke-dasharray="1"`, and `stroke-dashoffset` from 1 to 0. Without a dasharray the line appears fully drawn from frame 0.
- `inline-block` word spans swallow trailing spaces. Put spacing in `margin-right`.

## 4. Motion grammar

Five moves, each with one job. If a motion is none of these, delete it.

- **ENTER**: one orchestrated sequence per page or scene, in reading order, siblings staggered 60–120ms. Fade-up on every section is the AI tell.
- **EMPHASIS**: one element at a time: a scale swell (≤1.2), a glow, or a color change that carries meaning.
- **TRANSITION**: a state change. The changed part moves; everything else holds still. 0.2–0.6s.
- **CAMERA**: a stage-level scale/translate, at most once per scene, 0.8–1.2s, never during a text read.
- **EXIT**: 0.3–0.5s, fully complete. No element survives mid-state across a scene boundary, except a deliberate continuity anchor that persists identically or **morphs** (the same object changing state, which is the strongest transition available).

Transitions carry meaning: hard cut = category change, morph = same thing changing, pan = traversal. Never a default crossfade everywhere. Durations and easings are in `references/animation-primitives.md`. Neighbors that move together get different durations or an offset.

## 5. Stack decision

| Situation | Stack |
|---|---|
| page micro-motion | CSS transitions on `transform`/`opacity`, 0.2–0.6s; loops ≤2s inside `@media (prefers-reduced-motion: no-preference)` |
| video / motion graphic / kinetic type | template + vanilla `render(t)` (default) |
| >6 staggered tracks or SVG morph orchestration | GSAP UMD pinned, ONE paused master timeline, `seek(t)` → `tl.seek(t)` |
| charts | inline SVG (default) or Chart.js UMD with `animation:false`, hex colors (canvas cannot read CSS vars) |
| generative art | p5.js with `randomSeed`/`noiseSeed` |
| 3D, only when 3D is the message | Three.js UMD pinned; camera scripted in `render(t)` |

Use the simplest stack that reaches the outcome. External scripts must be exact pinned versions from cdnjs.cloudflare.com or cdn.jsdelivr.net. Inline everything else. Every font gets a real fallback stack.

## 6. Technical floor (non-negotiable)

1. Single `.html` with CSS and JS inline, under 16 MB, images/data as `data:` URIs.
2. Colors as `:root` tokens; dark layer under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and repeated under `:root[data-theme="dark"]`; explicit `body` background.
3. `meta viewport` with `viewport-fit=cover`; `env(safe-area-inset-*)` padding; `height:100%` on html/body, never `100vh`; wide blocks scroll inside their own `overflow-x:auto`; grids use `minmax(0,1fr)`.
4. Displayed computed numbers pass through `Math.round`, `toFixed` or `Intl.NumberFormat`. Count-ups land exactly on the final value.
5. Accessibility: contrast ≥4.5:1 (≥3:1 for ≥24px text), visible focus, `prefers-reduced-motion` respected (the template shows the settled end frame).
6. Readable type: in a 1080p video frame no text below 20px (H/54). On mobile pages, no body text below 14px.
7. Browser storage never holds timeline state. Where storage is used at all, wrap it in try/catch.

## 7. Avoid generic AI design

Where the brief leaves freedom, never spend it on these defaults (`qa.mjs` flags several of them automatically):

| Tell | Fix |
|---|---|
| cream `#F4F1EA`-ish + serif display + terracotta `#D97757`-ish accent | a palette taken from the subject's own materials |
| near-black + one acid accent, used regardless of subject | allowed only when the direction justifies it in writing |
| identical rounded cards, one radius everywhere, the same soft shadow | radius tokens by hierarchy; card only bounded objects |
| gradients as decoration, purple gradients, glassmorphism | flat fills; one gradient max, only for a continuous physical property |
| tracked ALL-CAPS eyebrows, middle-dot meta strings, "→" on links | sentence case; delete labels that repeat the content |
| Inter / system font by default | typefaces chosen for this subject, with a fallback stack |
| a single word accented in a headline | allowed ONLY when the accent color is a semantic token used for the same meaning elsewhere in the piece (e.g. coral = noise) |
| generic hero: headline + subtitle + CTA + screenshot | open with the most characteristic thing in the subject's world |
| everything centered, same grid rhythm every section | an alignment system per section; vary the rhythm |
| everything animating at once, 300ms everywhere | the duration map + stagger (§4) |

Spend boldness in one place, then remove one accessory.

## 8. Render + QA (mandatory before delivering)

Run the automated QA. It renders the file headless and writes evidence plus a verdict. It needs Node ≥18. The first run in a fresh copy of the skill needs `npm install` in `$SKILL/scripts` (skip it if `scripts/node_modules` exists).

```bash
node "$SKILL/scripts/qa.mjs" path/to/deliverable.html
```

In DSH on Windows, run it with the `pwsh` tool using the same command. Options: `--step 0.25` (a finer grid for fast scenes), `--out <dir>`, `--mode page|video`.

**Video mode** (auto when `DURATION` + `seek` exist) captures a frame every step and checks: forbidden APIs, determinism on out-of-order revisits, a frozen timeline, dead air, near-empty spans, an unsettled end frame, text collisions, text over other graphics, clipping, contrast, minimum type size, dash-offset lines that never draw, reduced-motion loops, console/page errors, and template tells.
**Page mode** renders desktop 1440, mobile 390 and dark scheme, and checks the same layout rules plus mobile horizontal overflow.

Outputs land in `qa-<name>/`: `report.md` (verdict and findings), `report.json` (per-frame ink coverage and change), `contact-sheet.png` (every frame on one image), `moments.png` (each scene's entry, middle and end, taken from `window.SCENES`), `key_000..100.png`, and `frames/`.

- Pass the signature moment and any sync point explicitly: `--at 5.4,9.1`.
- Deliberate layering (kinetic type stacked on purpose, a title over footage) goes inside an element with `data-qa-allow-overlap`. That skips the collision and text-over-graphics checks for that subtree only. Never use it to silence an accidental collision.
- A `font` WARN means the first-choice family did not load and the text is in a fallback. Fix it before judging layout, because every width is wrong.

Exit code 0 = no FAIL. **FAIL is blocking.** Every WARN is either fixed or justified in one line in your critique.

## 9. Critique loop

1. **If your model can read images:** open `contact-sheet.png`, then any `key_*.png` that looks wrong. Judge the pixels, not your intentions.
2. **If your model is text-only:** use `report.md` plus the per-frame table in `report.json`. `coverage` < 0.015 means the frame reads empty. A `diff` of 0 across a scene means nothing moves. A spike in `diff` marks a cut. Cross-check every scene card's timestamps against these numbers.
3. Answer each question with a concrete observation, not "✓":
   - **Composition**: at each key frame, where does the eye land first? Is that the message?
   - **Hierarchy**: is PRIMARY unmistakable? Is there exactly one moving thing that matters per frame?
   - **Mechanism**: does the signature moment *show* the idea with the captions removed?
   - **Continuity**: are all handoffs clean, with nothing mid-state at a boundary and anchors identical or morphing?
   - **Timing**: are offsets present, no default durations, and reading time ≥1.2s per 8 words?
   - **Typography / contrast / density**: sizes per plan, ≤5 competing elements per frame, readable in dark mode?
   - **Narrative**: could a viewer repeat the core message after one watch?
4. Fix → re-run `qa.mjs` → re-critique. Repeat until QA passes and the critique has no open item.
5. Final question, answered honestly: **"Does this look intentionally designed, or merely generated?"** If "generated": name what is generic, revise the plan (§1), and rebuild. A first render is almost never the deliverable. Expect 2–3 generations.

## 10. Audio sync (when there is music or voice)

Never guess timing by ear. Turn the audio into data, and let `render(t)` read it:

```bash
node "$SKILL/scripts/audio-data.mjs" music.mp3 --inject composition.html   # writes window.AUDIO into the HTML
```

- `AUDIO.beats` (an evenly spaced grid at the estimated tempo), `AUDIO.onsets` (hits, notes, syllables), and per-frame `AUDIO.rms` / `AUDIO.low` (0..1; `low` is the <150 Hz kick/bass band).
- Drive motion with the template helpers: `hit(t, AUDIO.beats, 0.2)` for a beat pulse (EMPHASIS), `audioAt(t, "low")` for kick-reactive scale, `since(t, AUDIO.onsets)` for per-hit reveals. Put scene cuts on beats: pick scene starts from `AUDIO.beats`.
- Sync is frame-exact by construction: a pulse lands on the first frame at or after its beat (≤1 frame, ≤33 ms at 30 fps). If the audio starts later than t=0, pass `--offset <s>`.
- Levels are checked before anyone listens. Clipped samples exit 1. A sample peak above −1 dBFS warns, because AAC encoding will clip it. Loudness outside −18..−12 LUFS is reported (platforms normalize to about −14).
- `--bpm` overrides the tempo estimate. Check the printed BPM against the track's known tempo. Estimates can land on half or double tempo, and the tempo is detected only for music with clear hits.
- Mux the same file at export with `--audio`.

## 11. Export (when a video file is wanted)

```bash
node "$SKILL/scripts/export.mjs" path/to/composition.html --out out.mp4 --fps 30
```

It seeks every frame at a fixed dt and pipes the frames to ffmpeg. The output format follows the extension (`.mp4` H.264 yuv420p faststart, `.webm` VP9, `.gif` palette). Options: `--audio track.mp3` (muxed, `-shortest`), `--from/--to`, `--crf`. Without ffmpeg it writes a PNG sequence and prints the assemble command. Verify the reported frame count and duration.

## 12. Delivery

Deliver: the HTML (and the MP4 if requested), the plan, the QA verdict line, and the critique answers. State plainly what was **not** verified (e.g. "no audio", "Firefox not tested"). Never claim a check you did not run.

## 13. Side effects and rights

- **Files:** `qa.mjs` writes only `qa-<name>/` next to the HTML; `export.mjs` writes the output file (or a `-frames/` folder); `audio-data.mjs --inject` rewrites one `<script id="audio-data">` block in the HTML.
- **Network:** none from the scripts, which run a local headless Chromium. The composition itself may load pinned CDN libraries or fonts when it opens. The first setup runs `npm install` and `npx playwright install chromium` (about 150 MB).
- **Audio:** processed offline with ffmpeg; nothing plays out loud.
- **Rights:** fonts must be licensed for embedding (OFL / Google Fonts are safe). Music, voice, footage and logos must be the user's own or cleared. Say which assets you used, and where they came from, in the delivery.

