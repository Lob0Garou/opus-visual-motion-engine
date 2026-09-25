# Example: motion graphic (the executed example)

Files: `motion-graphic.html` (executed and capture-tested during the skill's research phase).

## Brief

"Make a 14-second motion graphic about the value of filtering telemetry: noisy events → one insight." Fictional product: Flowstate.

## Plan (Pre-code planning, SKILL.md §1 — video)

1. **Core message**: "Signal, not noise."
2. **Beats**:
   - b1 HOOK — "Your product talks all day." (serif, word-by-word)
   - b2 FLOOD — coral dots flood a container: every click/scroll/error
   - b3 SIGNAL — camera pushes in; teal line rises; count-up 12,403 insights/day
   - b4 CLOSE — lockup "Signal, not noise." + rule draws + handle
3. **Beat cards** (duration / composition / camera / type / exit / primitives):

| beat | t | composition | camera | type | exit | primitives |
|---|---|---|---|---|---|---|
| hook | 0–2.6s | headline centered, wide | static | serif 108px, stagger 90ms | fade 0.45s | slide-in + opacity |
| flood | 2.6–6.2s | container rect draws, 64 dots flood from left edge | static | mono caption "step 01 …" | dots vanish at cut | container dash-draw, dot stagger 45ms |
| signal | 6.2–10.2s | rising polyline 6 nodes + count-up top-left | push-in 1→1.05 over 2s | mono 92px tabular count | hold | line draw (ease-in-out 2.2s), node pop stagger 0.38s, count-up 1.1s |
| close | 10.2–14s | lockup centered | static | serif 128px lockup | none (end frame settled) | rise-in 0.9s, rule dash-draw 0.9s, handle fade |

4. **Timeline** (absolute): hook 0–2.6 · flood 2.6–6.2 · signal 6.2–10.2 · close 10.2–14. Handoffs: 0.45s exit overlaps next enter.
5. **Direction**: "Editorial Instrument" — paper `#FAFAF7`/ink `#191C1F`; coral `#E8593C` = noise, teal `#0E7C6B` = signal (color encodes meaning); Georgia display + system sans + mono numerals.

## Implementation

- `render(t)` pure function; seeded `mulberry32(20240601)` for dot scatter; no timers; `window.seek` + `window.DURATION` exported.
- Dots recede to opacity 0 at s3 (they survive as ghosts conceptually but visually clear the frame — continuity via the container rect persisting until cut).
- Last 0.3s of the timeline is at-rest (100% frame is complete — capture target).
- All colors tokens with dark-mode variant; stage 1920×1080 scaled to viewport.

## Critique pass (filled after Playwright capture)

- Composition ✓ eye lands on the active scene's subject each beat (headline → bin flood → count-up+line → lockup).
- Hierarchy ✓ one accent per scene: coral "all" in the hook (narrative color handoff to the flood), teal line/number in s3, teal italic in the lockup.
- Contrast ✓ ink on paper 14.9:1; teal on paper 5.4:1; coral accent decorative-only on 108px display text.
- Spacing ✓ rem/px rhythm; nothing touching; generous lockup whitespace.
- Typography ✓ Georgia display + system sans + mono numerals; sentence case; no ALL-CAPS eyebrow.
- Motion ✓ every move is ENTER/TRANSITION/EXIT with purpose; no ambient loops needed.
- Timing ✓ stagger 90ms (hook words) / 45ms (dots) / 0.38s (nodes); nothing same-duration.
- Continuity ✓ signal exits 0.55s BEFORE close claims the space (fixed after first capture showed collision); no mid-state at t=14.
- Narrative ✓ "noise floods in → filtered → signal rises → 'Signal, not noise.'" repeats the core message.
- Density ✓ max 5 competing elements per frame after fixes.
- Responsiveness ✓ stage scales to viewport; fixed 1920×1080 logical frame keeps captures reproducible.
- Performance ✓ transform/opacity/stroke-dashoffset only; no timers; seeded RNG.

**Bugs found by the real frames and fixed** (3 generations): frozen timeline (`clamp01` applied to seconds), collapsed word spacing, missing signal EXIT (scene collision), under-sized count-up composition, flood not filling the bin. (Research-phase log, not shipped with the skill.)

**Verdict:** **intentionally designed** (after 3 generations; the first capture was not shippable — which is exactly why §9 exists).

## Known defects found later by `scripts/qa.mjs` (kept unfixed on purpose — a teaching case)

Running `node scripts/qa.mjs examples/motion-graphic.html` reports **FAIL**. The critique above passed a human read of the frames, and these still got through:

- `dead-dash` on `polyline#rise` and `line#rule`: they animate `stroke-dashoffset` without `stroke-dasharray`, so the line and the rule are fully drawn from frame 0 (the count still reads "0" while the line is complete; the lockup rule crosses the fading chart around t=10.5s). Fix: add `stroke-dasharray="1"` next to `pathLength="1"`.
- `tokens`: the dark layer is a bare `:root` override, without the `:not([data-theme="light"])` guard or the `[data-theme="dark"]` layer.
- The "stage scales to viewport" claim is false: `#stage` is a fixed 1920×1080 box, cropped in smaller windows. `assets/composition-template.html` has the real fit.
- The table's "mono 92px" is stale (the code uses 150px).

Lesson: the Critique Pass is necessary but not sufficient. Run the automated QA every time. Start new work from `assets/composition-template.html`, not from this file.

