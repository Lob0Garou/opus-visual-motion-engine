# Reference: Video Generation (brief → frames → export)

Read for explainers, product videos, kinetic typography, or any timed piece. This file owns the pipeline. NOTE on provenance: the leaked corpus contains NO video pipeline — what follows is the portable reconstruction ([X] by default) built on the corpus's verified rules (behavioral motion, deterministic time, single-file delivery, asset constraints). [X]-items are listed in PROVENANCE.

## 1. Brief → beats (the only correct order)

1. Core message in one sentence. If it takes two sentences, there are two videos.
2. Beats: 3–7; each answers "what does the viewer now know?"
3. Beat cards (duration, composition, camera, type, exit, primitives) — see `motion-design.md` §2 template.
4. Global timeline with absolute timestamps; sum = DURATION (10–20s default; 30–45s only with narration).
5. THEN code. No scene is coded before the full timeline exists.

## 2. The file contract

Single self-contained HTML:
- `window.DURATION` (number), `window.seek(t)`, `render(t)` as the only state driver.
- Stage div `#stage` sized to a fixed aspect (1920×1080 CSS px logical, scaled to viewport with `transform: scale()`) so frames are reproducible at any size.
- All colors as `:root` tokens (dark-mode variant defined); all type from the loaded family with real fallback.
- Zero timer APIs. Zero unseeded randomness. Capture-friendly: `seek(2.5)` after reload produces the exact frame.

## 3. Scene implementation order

1. Static frames first: lay out every scene at its settled state; verify composition per frame (SKILL.md §1 math: text widths, box fit).
2. Wire transitions: exit(N) → enter(N+1) handoffs; continuity anchors persist.
3. Add enter choreography (stagger, draws, count-ups).
4. Add ambient loops last (flow, glow) — subordinate, ≤2s, reduced-motion guarded.
5. Then capture and critique.

## 4. Frame capture + QA

Use the shipped tool — do not hand-roll a capture script:

```bash
node scripts/qa.mjs composition.html               # grid every 0.5s
node scripts/qa.mjs composition.html --step 0.25   # fast scenes
```

It sizes the viewport to `#stage`, seeks every step, waits two paints, and writes `contact-sheet.png`, `key_000..100.png`, `frames/`, `report.md`, `report.json`. Read `report.md` first; open the contact sheet if you can read images. Fix, re-run.

## 5. Export to video

```bash
node scripts/export.mjs composition.html --out out.mp4 --fps 30 [--audio music.mp3]
```

- Frame-exact: seeks every 1/fps, pipes PNGs to ffmpeg (H.264 yuv420p `+faststart`; `.webm` → VP9; `.gif` → palette). Stage sides must be even for H.264.
- Check the printed `nb_frames` = `DURATION × fps + 1` and `duration` ≈ `DURATION`.
- No ffmpeg: it writes a PNG sequence and prints the assemble command.
- No browser at all: the deterministic HTML IS the deliverable — say so and state what was not rendered.

## 6. Narration / audio

- The corpus has no audio doctrine [P:L1156 is only a tone library]; this section is [X], with the data-driven pattern adapted from HyperFrames' community skill `prod-by-claude` (Apache-2.0).
- Audio never plays inside `render(t)` (playback is not frame-deterministic). Its *timing* comes in as data instead: `node scripts/audio-data.mjs music.mp3 --inject composition.html` writes `window.AUDIO` (beats, onsets, per-frame rms/low, levels).
- Plan with the data. Once the track is known, take scene starts from `AUDIO.beats`, put the signature moment on a strong onset, and write those timestamps into the scene cards.
- Reactive motion stays inside the grammar: a beat pulse is EMPHASIS (one element), and a kick-driven scale is ambient. Neither replaces ENTER/EXIT choreography.
- Check levels before delivery (the script reports clipping, peak, LUFS), then mux the same file with `export.mjs --audio`.

## 7. Delivery checklist

- [ ] Core message repeatable after one watch
- [ ] `seek()` + `DURATION` exposed; no timers; seeded randomness
- [ ] Every scene card matches the rendered scene
- [ ] Handoffs clean; no mid-state across cuts
- [ ] Critique Pass answered "intentionally designed"
- [ ] `qa.mjs` exit 0; every WARN fixed or justified
- [ ] Export run (frame count/duration checked) or explicitly declared not applicable
