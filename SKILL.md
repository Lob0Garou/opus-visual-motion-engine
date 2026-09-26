---
name: opus-visual-motion-engine
description: >
  Build motion graphics, showreels, brand/product/explainer videos, kinetic type,
  landing pages, dashboards, mockups, diagrams and data viz as single-file HTML:
  real brand material, a named direction, deterministic seek(t) timing, designed
  cut-to-cut handoffs, a composed score, render QA and MP4 export. Use to make,
  animate, render or review a video, animation, UI or visual. Triggers: video,
  vídeo, animação, showreel, motion graphic, explainer, landing page, dashboard,
  mockup, diagram.
---

# Opus Visual Motion Engine

A disciplined pipeline for visual deliverables: **gather → plan → build from the template → render → QA → fix → score → export**. Quality comes from gates applied before and after rendering, not from taste. Follow the steps in order. Do not skip a step because the task "looks simple".

Paths below are relative to this skill's directory (the `skill_resources` base you were given). Call it `$SKILL`.

## 0. Read first (unconditional)

Before writing any code, read the references that match the deliverable. They are authoritative for their topic:

| Deliverable | Read |
|---|---|
| any video, motion graphic, explainer, product video, showreel, brand reel | `references/reel-craft.md` (the quality bar), `references/video-generation.md`, `references/motion-design.md`, `references/javascript-animation.md` |
| kinetic typography / type-led piece | the video set above + `references/typography.md` |
| landing page, dashboard, mockup, UI | `references/visual-design.md`, `references/typography.md` |
| diagram, schematic, data viz | `references/visual-design.md` §4 |
| framing / camera decisions | `references/cinematography.md` |
| durations and easings | `references/animation-primitives.md` |
| music, voice or sound design | SKILL.md §10 + `references/reel-craft.md` §8 |

Worked examples live in `examples/`. For any timed piece read `examples/brand-reel.md` and open `examples/brand-reel.html` (the reference reel: 7 scenes, 6 designed handoffs, one persistent world, a HUD and a score, passing QA with 0 WARN). For the rest, read the example closest to the brief.

## 1. Gather, then plan (write it out)

**Gather first (video and UI).** Before any plan, search for the subject's own material: the official logo as SVG paths, brand hex values, the product's real UI, real numbers with their qualifiers, the subject's own tagline, any existing motion identity (`reel-craft.md` §1). Look in the user's folders and repos. Write what you found, with file paths, under `## Sources` in the plan; write "none found" when that is true. Never redraw an official mark. Label illustrative data as illustrative and generate it with a script so the numbers agree with each other.

Write the plan in your reply (or in a `PLAN.md` next to the output) **before** creating the HTML. A plan that exists only in your head does not count.

**UI / page**
1. **Primary message**: one sentence. What must the viewer understand in 3 seconds?
2. **Named direction**: a name, 4–6 named hex tokens with assigned meanings, typefaces with roles, form treatment. Take it from the Sources first; otherwise derive it from the subject's industry, materials and vernacular. A toy store and a fintech dashboard never share a direction.
3. **Hierarchy**: tag every block PRIMARY / SECONDARY / TERTIARY. Only PRIMARY gets the one bold gesture.
4. **Section progression**: one line per section, giving its job and how it hands off to the next.
5. **Pre-render math**: text width ≈ `chars × 0.55 × font-size` (sans) or `× 0.5` (serif); box width = `max(title_chars × 8, subtitle_chars × 7) + 24` at 14px; row fit = Σwidths + gaps ≤ container. Trace every connector against every box. If it crosses one, route an L-shaped path.

**Video / motion graphic**
1. **Core message**: one sentence. If it needs two, there are two videos.
2. **Concept** (`reel-craft.md` §2): the *thesis* line (the subject's own words when possible, split across beats as one running sentence); the *device* (one persistent object from the subject's world that carries the piece: a clock, a route, a chart); the two *registers* (problem vs answer: palette, key, texture) and the object the switch passes through.
3. **Worlds** (`reel-craft.md` §3): the systems shown more than once, built once, with fixed geometry constants, named camera poses, and which scenes use them. Quantities on screen are derived from one model every frame.
4. **Beats**: 3–7. Each beat answers "what does the viewer now know?"
5. **Scene card per beat**: start/end (s), composition, camera, type sizes, the ONE primary technique (for a reel no two scenes share it: `reel-craft.md` §5), primitives (2–4), settle-hold. Use the template in `references/motion-design.md` §2.
6. **Signature moment**: name the ONE frame where the mechanism is *shown*, not labeled. It is usually where the registers switch. If the story only works with its captions, redesign the beat.
7. **Handoff table** (`reel-craft.md` §4): one row per cut: `t`, type (`match | push | iris | morph | collapse | cut | dip`), the object that carries the frame, and the velocity through the cut. Scenes tile the timeline; none ends in an empty frame unless its handoff is a declared `dip`.
8. **Sound plan**: tempo (default 120 BPM, cuts on beats), sections per register, and one hit per visual event. Supplied music → §10 data sync; none → a `score` cue sheet (§10).
9. **Global timeline**: absolute timestamps, scenes back to back. Set `DURATION` to the true end (10–20s by default; 30–45s only with narration).

A scene without a card, or a cut without a handoff row, does not belong in the video.

## 2. Build from the template (video)

Copy `assets/composition-template.html` next to the deliverable and fill the EDIT blocks. Do not rewrite the ENGINE blocks. They already provide:
- a 1920×1080 `#stage` (change `STAGE_W/H` for 1080×1920 or 1080×1080), fitted to any window;
- the capture/export contract: `window.DURATION`, `window.seek(t)`, `window.render(t)`, `window.SCENES`, `window.HANDOFFS` (QA captures every scene and every cut from them);
- time helpers `at()`, `tw(t, t0, dur, ease)`, `ease.*` (cubic, quad, quart, expo, back, sine, steps), `lerp`, `nudge` (slow-fast-slow group move), `hash01` (quantized-time jitter), `mulberry32` (seeded PRNG);
- scene helpers `cut()` (hard cut, the default: scenes hand over, they do not fade) and `layer()` (a fade-out, only for a `dip`), and `camera(el, s, fx, fy, ax, ay, blur)` for a `.world` wrapper;
- audio helpers `audioAt(t, "rms"|"low")`, `since(t, list)`, `hit(t, list, dur)` that read `window.AUDIO` (§10) and return 0 without it;
- a `<script type="application/json" id="score">` cue sheet block for `scripts/score.mjs`;
- a glyph preload so web-font subsets are loaded before the first capture;
- a preview player (space, ←/→, Home/End) that turns off automatically under capture and reduced motion;
- color tokens in the required 3 layers (light, `prefers-color-scheme` guarded, `[data-theme]`).

The template's own demo is a two-scene piece joined by a `push` handoff: study it before writing the first scene.

For pages, write a normal single-file HTML following §6.

## 3. Deterministic time (video)

- `render(t)` is the only state driver. Every position, opacity, size, number and dashoffset is computed from `t` in seconds. `seek(x)` renders the identical frame no matter what was rendered before it.
- `t` is in **seconds**. Clamp `t` to `[0, DURATION]`, never to `[0, 1]`: clamping seconds to 0..1 silently freezes the whole timeline.
- **Forbidden:** `setTimeout`, `setInterval`, CSS animations/transitions as the timeline, unseeded `Math.random()`, `Date.now()` in state. `requestAnimationFrame` may only advance the playback clock and call `render(clock)`. The template already does this.
- Randomness: generate at build time from `mulberry32(seed)`, or hash quantized time (`hash01(Math.floor(t * 24) * 13 + i)`) for jitter. Never `Math.random()` inside `render`.
- SVG draw-on needs all three: `pathLength="1"`, `stroke-dasharray="1"`, and `stroke-dashoffset` from 1 to 0, written by `render(t)`. Without a dasharray the line appears fully drawn from frame 0. Under GSAP never tween normalized dash values (it rounds px to 0/1): tween a real length.
- Pixels, not only state, must be reproducible: drift fine textures by whole pixels (`Math.round`), and write `transform: "none"` once a transform tween has settled. Sub-pixel texture offsets and lingering identity transforms rasterize differently depending on the previous frame (`reel-craft.md` §9).
- `inline-block` word spans swallow trailing spaces. Put spacing in `margin-right` or a flex `gap`.

## 4. Motion grammar

Five moves, each with one job. If a motion is none of these, delete it.

- **ENTER**: one orchestrated sequence per page or scene, in reading order, siblings staggered 60–120ms. Fade-up on every section is the AI tell. Vary the entrance per scene (slam, snap, waterfall, mask rise, typewriter clip).
- **EMPHASIS**: one element at a time: a scale swell (≤1.2), a glow, a pulse on a beat, or a color change that carries meaning.
- **TRANSITION**: a state change. The changed part moves; everything else holds still. 0.2–0.6s. Derived visuals move in the same frame as their cause.
- **CAMERA**: a stage- or world-level scale/translate, at most one move per scene plus the handoff legs, never during a text read. The camera may BE the transition: accelerate into an object on the way out, decelerate out of it on the way in.
- **HANDOFF** (scene boundary): the frame passes from scene N to N+1 through something that moves (match, push, iris, morph, collapse; a hard cut on a hit for a category change). Scenes tile the timeline. "Exit to an empty frame, then enter" reads as a slideshow and is allowed only as a declared `dip`. No element survives mid-state across a boundary except the object that carries the handoff.

Transitions carry meaning: hard cut = category change, match/morph = same thing continuing or changing, push/pan = traversal, iris = entering a new world. Never a default crossfade everywhere. Durations and easings are in `references/animation-primitives.md`. Neighbors that move together get different durations or an offset. After a group arrives, it holds still long enough to be read before it leaves (settle-hold, `reel-craft.md` §6).

## 5. Stack decision

| Situation | Stack |
|---|---|
| page micro-motion | CSS transitions on `transform`/`opacity`, 0.2–0.6s; loops ≤2s inside `@media (prefers-reduced-motion: no-preference)` |
| video / motion graphic / kinetic type / reel | template + vanilla `render(t)` (default) |
| >6 staggered tracks or SVG morph orchestration | GSAP UMD pinned, ONE paused master timeline, `seek(t)` → `tl.seek(t)` (read `javascript-animation.md` §6 first) |
| charts | inline SVG (default) or Chart.js UMD with `animation:false`, hex colors (canvas cannot read CSS vars) |
| generative art | p5.js with `randomSeed`/`noiseSeed` |
| 3D, only when 3D is the message | Three.js UMD pinned; camera scripted in `render(t)` |

Use the simplest stack that reaches the outcome. External scripts must be exact pinned versions from cdnjs.cloudflare.com or cdn.jsdelivr.net. Inline everything else. Fonts may come from Google Fonts. Every font gets a real fallback stack.

## 6. Technical floor (non-negotiable)

1. Single `.html` with CSS and JS inline, under 16 MB, images/data as `data:` URIs.
2. Colors as `:root` tokens; dark layer under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and repeated under `:root[data-theme="dark"]`; explicit `body` background. A video that carries its own light→dark story keeps the layers and says so in a comment.
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
| gradients as decoration, purple gradients, glassmorphism | flat fills; one gradient max, only for a continuous physical property (light, heat); textures (grids, hatches) are patterns, not gradients |
| tracked ALL-CAPS eyebrows, middle-dot meta strings, "→" on links | sentence case; delete labels that repeat the content |
| Inter / system font by default | typefaces chosen for this subject, with a fallback stack |
| a single word accented in a headline | allowed ONLY when the accent color is a semantic token used for the same meaning elsewhere in the piece (e.g. rust = demand/peak) |
| generic hero: headline + subtitle + CTA + screenshot | open with the most characteristic thing in the subject's world |
| everything centered, same grid rhythm every section | an alignment system per section; vary the rhythm |
| everything animating at once, 300ms everywhere | the duration map + stagger (§4) |
| every scene fades out to empty and the next fades in | designed handoffs (§4) |
| placeholder logo, invented metrics, lorem copy | the Sources (§1); illustrative data labeled |

Two exceptions, each written into the plan: a palette documented in the brand's own files is never a tell (cite the file), and a diegetic HUD that reports live state (timecode, scene index, the story's clock) is not template chrome (`reel-craft.md` §7; mark it `data-qa-hud`).

Spend boldness in one place, then remove one accessory.

## 8. Render + QA (mandatory before delivering)

Run the automated QA. It renders the file headless and writes evidence plus a verdict. It needs Node ≥18. The first run in a fresh copy of the skill needs `npm install` in `$SKILL/scripts` (skip it if `scripts/node_modules` exists).

```bash
node "$SKILL/scripts/qa.mjs" path/to/deliverable.html
```

In DSH on Windows, run it with the `pwsh` tool using the same command. Options: `--step 0.25` (a finer grid for fast scenes), `--out <dir>`, `--mode page|video`, `--at 5.4,9.1` (the signature moment and sync points).

**Video mode** (auto when `DURATION` + `seek` exist) captures a frame every step and checks: forbidden APIs, determinism on out-of-order revisits, a frozen timeline, dead air, near-empty spans, an unsettled end frame, text collisions and clipping (measured on glyph ink, after masks and `clip-path`), text over other graphics, contrast, minimum type size, draw-ons that never draw (`dead-dash`) or snap (`dash-snap`), every cut (`handoffs.png`: last frame before / first frame after; `empty-handoff`, `scene-gap`, `handoff-jump` for a `match`/`iris`/`morph` that does not match), reduced-motion loops, console/page errors, and template tells on visible elements.
**Page mode** renders desktop 1440, mobile 390 and dark scheme, and checks the same layout rules plus mobile horizontal overflow.

Outputs land in `qa-<name>/`: `report.md` (verdict, findings, handoff table), `report.json` (per-frame ink coverage and change, per-cut metrics), `contact-sheet.png`, `moments.png` (each scene's entry, middle and end from `window.SCENES`), `handoffs.png`, `key_000..100.png`, and `frames/`.

Markers (each silences only what it names, for that subtree):
- `data-qa-allow-overlap`: deliberate layering (a title over footage). Glyph-ink measurement already allows tightly stacked display lines; do not use it to silence an accidental collision.
- `.world` / `data-qa-camera`: text inside a camera wrapper whose transform is not identity may leave the frame (push-through, fly-through). At rest it must sit inside the frame.
- `data-qa-hud`: a diegetic HUD (contrast and size still checked).
- `data-qa-ignore`: decorative text that is not content (an outlined ghost word, glitch copies).
- A `font` WARN means the first-choice family did not load and the text is in a fallback. Fix it before judging layout, because every width is wrong.

Exit code 0 = no FAIL. **FAIL is blocking.** Every WARN is either fixed or justified in one line in your critique.

## 9. Critique loop

1. **If your model can read images:** open `contact-sheet.png`, `moments.png` and `handoffs.png`, then any `key_*.png` that looks wrong. Judge the pixels, not your intentions.
2. **If your model is text-only:** use `report.md` plus `report.json`. `coverage` < 0.015 means the frame reads empty. A `diff` of 0 across a scene means nothing moves. A spike in `diff` marks a cut. The handoff table gives each cut's change and the lowest ink around it. Cross-check every scene card's timestamps against these numbers.
3. Answer each question with a concrete observation, not "✓":
   - **Sources**: which real assets and numbers are on screen? What is illustrative, and is it labeled?
   - **Concept**: is the thesis readable as one sentence across scenes? Is the device on screen from the first 2 s to the signature moment?
   - **Composition**: at each key frame, where does the eye land first? Is that the message?
   - **Hierarchy**: is PRIMARY unmistakable? Is there exactly one moving thing that matters per frame?
   - **Mechanism**: does the signature moment *show* the idea with the captions removed?
   - **Handoffs**: does every cut carry the frame through its declared object, with no empty frame?
   - **Continuity**: is nothing mid-state at a boundary except the carrier? Do worlds persist identically across their scenes?
   - **Timing**: are offsets present, no default durations, every formation settled before it leaves, and reading time ≥1.2s per 8 words?
   - **Typography / contrast / density**: sizes per plan, ≤5 competing elements per frame?
   - **Sound**: does every visual hit have a sound and every sound a visual reason? Loudness −14 LUFS, true peak ≤ −1 dBTP?
   - **Narrative**: could a viewer repeat the core message after one watch?
4. Fix → re-run `qa.mjs` → re-critique. Repeat until QA passes and the critique has no open item.
5. Final question, answered honestly: **"Does this look intentionally designed, or merely generated?"** If "generated": name what is generic, revise the plan (§1), and rebuild. A first render is almost never the deliverable. Expect 2–3 generations.

## 10. Sound (every video ships with it)

**No music supplied → compose it.** Write the cue sheet into the composition's `<script type="application/json" id="score">` block, using the same timestamps as `render(t)` (sections per register, one hit per visual event; format in `scripts/score.mjs` and `reel-craft.md` §8), then:

```bash
node "$SKILL/scripts/score.mjs" composition.html --out score.m4a     # deterministic score + SFX, mastered to −14 LUFS
```

It prints the measured loudness and true peak; `--stems` also writes music and SFX separately. Verify the grid with `audio-data.mjs score.m4a` (the printed BPM matches the cue sheet).

**Music or voice supplied → turn it into data.** Never guess timing by ear:

```bash
node "$SKILL/scripts/audio-data.mjs" music.mp3 --inject composition.html   # writes window.AUDIO into the HTML
```

- `AUDIO.beats` (an evenly spaced grid at the estimated tempo), `AUDIO.onsets` (hits, notes, syllables), and per-frame `AUDIO.rms` / `AUDIO.low` (0..1; `low` is the <150 Hz kick/bass band).
- Drive motion with the template helpers: `hit(t, AUDIO.beats, 0.2)` for a beat pulse (EMPHASIS), `audioAt(t, "low")` for kick-reactive scale, `since(t, AUDIO.onsets)` for per-hit reveals. Put scene cuts on beats: pick scene starts from `AUDIO.beats`.
- Sync is frame-exact by construction: a pulse lands on the first frame at or after its beat (≤1 frame, ≤33 ms at 30 fps). If the audio starts later than t=0, pass `--offset <s>`.
- Levels are checked before anyone listens. Clipped samples (counted per channel) exit 1. A sample peak above −1 dBFS warns, because AAC encoding will clip it. Loudness outside −18..−12 LUFS is reported (platforms normalize to about −14).
- `--bpm` overrides the tempo estimate. Estimates can land on half or double tempo, and the tempo is detected only for music with clear hits.

Either way, mux the same file at export with `--audio`.

## 11. Export (when a video file is wanted)

```bash
node "$SKILL/scripts/export.mjs" path/to/composition.html --out out.mp4 --fps 30 --audio score.m4a
```

It seeks every frame at a fixed dt and pipes the frames to ffmpeg. The output format follows the extension (`.mp4` H.264 yuv420p faststart, `.webm` VP9, `.gif` palette). Options: `--audio track` (muxed, `-shortest`), `--from/--to`, `--crf`. Without ffmpeg it writes a PNG sequence and prints the assemble command. Verify the reported frame count and duration.

## 12. Delivery

Deliver: the HTML (and the MP4 if requested), the plan (with Sources and the handoff table), the QA verdict line, and the critique answers. List the assets used and where they came from, and which data is illustrative. State plainly what was **not** verified (e.g. "not listened to on speakers", "Firefox not tested"). Never claim a check you did not run.

## 13. Side effects and rights

- **Files:** `qa.mjs` writes only `qa-<name>/` next to the HTML; `export.mjs` writes the output file (or a `-frames/` folder); `score.mjs` writes the audio file (and `.music.wav`/`.sfx.wav` with `--stems`); `audio-data.mjs --inject` rewrites one `<script id="audio-data">` block in the HTML.
- **Network:** none from the scripts, which run a local headless Chromium and ffmpeg. The composition itself may load pinned CDN libraries or fonts when it opens. The first setup runs `npm install` and `npx playwright install chromium` (about 150 MB).
- **Audio:** composed and processed offline; nothing plays out loud.
- **Rights:** fonts must be licensed for embedding (OFL / Google Fonts are safe). Music, voice, footage and logos must be the user's own or cleared; a score from `score.mjs` is original. Say which assets you used, and where they came from, in the delivery.
