# Example: brand reel (the reference piece)

Files: `brand-reel.html` (executable; `qa.mjs` → PASS, 0 FAIL / 0 WARN, no overlap waivers). It is the vanilla `render(t)` port of a 15 s showreel first produced by Claude Opus 5.5 with HyperFrames and judged by the author far above what other models and harnesses produced from the same brief. Read it before planning any reel; copy its patterns, not its content.

## Brief

"Create a 15-second dynamic motion graphics video about Escala que Converte that shows how good a motion designer you are, as if it were your showreel for a CV. Go all in." (pt-BR)

## Sources (the ground-truth pass, reel-craft §1)

- Official mark: `eqc-monogram.svg` in the product repo → E and C paths, the Q ring (r 116, stroke 64) and the rust tail, copied verbatim; palette cream `#FAF7F2`, forest `#173F35`, ink `#1B1B18`, rust `#B4551F`.
- Product UI: the "Cockpit de cobertura" screenshot → hourly chart with a demand curve, a capacity line, a tooltip "20h · fluxo 51 · status quente · GAP DETECTADO".
- Case numbers: +0.86 p.p. average conversion, observed in a 4-store pilot, without hiring; method used in 40+ stores across 3 regions.
- Thesis from the site hero: "O pico não espera a escala se ajustar."
- Existing motion identity: a Remotion logo intro where E and C separate and recompose around the Q; the rust tail is the signature → echoed in scene 7.
- Illustrative (labeled as such): five names on the schedule (four come from the real cockpit); the before/after shifts were solved by a small optimizer against the drawn demand curve, so the coverage columns on screen follow from the bars.

## Plan

1. **Core message**: the peak doesn't wait for the schedule — EQC moves the same team to where the flow is, +0.86 p.p. without hiring.
2. **Concept**: thesis split across scenes ("O PICO / NÃO ESPERA." → "A ESCALA / SE AJUSTAR." → "AJUSTA / ANTES DO PICO."); device = the store clock 10:00 → 20:00 riding the flow curve's leading dot; registers = ink (problem, A minor) → paper (answer, C major), switched by flying through the Q ring of the logo.
3. **Direction**: "Blueprint da escala" — the monogram palette; rust-hi `#E0763A` for rust on dark; Archivo Black (display) + JetBrains Mono (data, HUD); dot grid on dark, blueprint grid on paper.
4. **World**: one chart world (hours 10–22 on x, demand curve, coverage histogram, gap blocks, a 5-row shift Gantt, alert pill, readout) used by scenes 1, 2 and 4; camera poses `id`, `peak`, `push`.
5. **Signature moment**: t ≈ 6.3–7.0 s, the camera flies through the cream core of the Q and the whole piece turns to paper.

| scene | t (s) | technique (one each) | beat |
|---|---|---|---|
| pico | 0–2.5 | stroke/clip draw + kinetic slam + directional snap | the day runs 10h→20h, the dot parks on the peak, "O PICO" slams (shake), "NÃO ESPERA." snaps in with a streak |
| escala | 2.5–5 | word waterfall + data-derived chart + RGB glitch | shifts cascade in, coverage rises, the peak is under-staffed ("SOBRA" at 16h, "GAP DETECTADO"), the alarm tears the frame |
| motor | 5–7 | constellation → iris | four sources (fluxo, vendas, escala, ponto) pop on 16ths, packets ride into the core; the core is the Q; fly-through to paper |
| redistribui | 7–9 | print-in scan + nudge group move with live-derived coverage | the same chart on paper; the shifts slide to the solved schedule, the gap closes, "✓ PICO COBERTO" |
| prova | 9–11.5 | count-up with scale + slam + marker | +0,86 p.p. arrives from depth, "SEM CONTRATAR NINGUÉM.", headcount 5 → 5 |
| lojas | 11.5–13 | tile split + grid assemble + light wave | the proof becomes one tile → 4 pilot stores → 42 stores in 3 regions |
| marca | 13–15 | logo assemble | stores implode, the Q draws, E and C whip in, the rust tail lands last; clean end card |

## Handoff table (reel-craft §4)

| cut | type | carried by |
|---|---|---|
| 2.5 | match | the 20h peak: the camera accelerates into it (ease-in, blur rising); scene 2 starts on the same pose and whips back (expo-out) |
| 5.0 | cut | signal tear on a glitch hit: category change, problem → engine |
| 7.0 | iris | the Q ring's cream core becomes the paper background |
| 9.0 | push | the camera pushes through the peak; "+0,86" arrives from depth with blur |
| 11.5 | collapse | the proof collapses into one store tile, which splits into the pilot stores |
| 13.0 | collapse | 42 tiles implode to the centre; the monogram assembles out of the burst |

## Sound (cue sheet inside the HTML)

120 BPM, downbeat at 1.0 s. intro (clock ticks + drone + riser) → groove in A minor (i–VI–i–VII) → stutter into the tear → build (rising pentatonic, riser, snare roll) → drive in C major (I–IV–V) → resolve chord on the tail landing at 13.56 s. 28 hits aligned to visual events (impact on the slam, whoosh peaking on each push, glitch on the tear, clicks on the four nodes, ticks under the count-up, chime on "PICO COBERTO"). `score.mjs` → −14.1 LUFS, −1.0 dBTP; `audio-data.mjs` re-detects 119.6 BPM, i.e. the score sits on the grid the cuts use.

## QA and critique

`node scripts/qa.mjs examples/brand-reel.html --at 1.9,6.8` → **PASS** (0 FAIL · 0 WARN · 1 INFO: frame 0 is almost empty by design, the day starts drawing at 0.08 s).

| cut | diff across | min ink ±0.25 s |
|---|---|---|
| 2.5 match | 25 % | 25 % |
| 5 cut | 44 % | 13 % |
| 7 iris | 15 % | 2.5 % (the cream frame itself) |
| 9 push | 75 % | 39 % |
| 11.5 collapse | 36 % | 30 % |
| 13 collapse | 23 % | 23 % |

- Composition: every frame has a focal point in the headline zone or on the peak; data sits on the diagonal.
- Mechanism: with captions removed, the bars sliding and the gap closing still tell the story (the columns are derived from the bars).
- Continuity: no cut passes through an empty frame; the world persists across scenes 1, 2 and 4.
- Timing: cuts on the beat grid; every formation settles ≥ 0.4 s before it leaves; reading time respected for each headline.
- Verdict: intentionally designed.

## Defects this piece surfaced (each became a rule or a QA check)

| defect | where | now |
|---|---|---|
| pulse rings visible at t = 0 (GSAP `fromTo` renders its from-state at build time) | HyperFrames original | reel-craft §9; vanilla `render(t)` has no build-time render |
| draw-on snapping 0→1 (GSAP rounds px values of `pathLength="1"` dashes) | original | `qa.mjs` `dash-snap`; javascript-animation §6 |
| store tiles still in flight when the implosion started (0.2 s settled) | original | reel-craft §6 settle-hold |
| decorative ghost word failing contrast | original | outlined ghost + `data-qa-ignore` |
| "+0,86" colliding with its label on font boxes, not on ink | port | `qa.mjs` measures glyph ink; no waiver needed |
| HUD cream-on-cream while the cream iris swept under it | port | HUD cuts out through the signature transition |
| revisit ≠ first visit at 4.5 s: sub-pixel dot-grid drift, then a settled identity transform on a headline word | port | reel-craft §9: whole-pixel drift, `transform: none` when settled |
| `●`/`✓` glyphs loading late from a font subset | port | template preloads every glyph on the stage |
| `audio-data.mjs` reporting clipping on a −1 dBTP stereo master (counted on the +3 dB mono downmix) | toolchain | fixed: clipping counted on native channels |
