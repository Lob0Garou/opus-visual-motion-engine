# Example: kinetic typography

## Brief

"12-second kinetic type piece for a podcast trailer: 'Nobody plans to become a legend.'" Voiceover lands on the title word at t=6s.

## Plan

1. **Core message**: legend status is a byproduct, not a plan.
2. **Beats**: b1 (0–2.8s) "Nobody plans" — words enter bottom-up, settle; b2 (2.8–5.2s) "to become" — the words swap order once (the plan is unstable); b3 (5.2–8.4s) "a legend." — single word "legend." scales 0.6→1 with blur→sharp [X], lands exactly at 6.0s; b4 (8.4–12s) whisper line "they just kept showing up." + handle.
3. **Timeline**: absolute; word-level keyframes; the 6.0s landing is the audio sync point (documented separately).
4. **Direction**: "Marquee" — ink `#101214` surface, warm white `#F5F2EA` type (contrast 13:1), one vermilion `#D6491F` reserved for the period of "legend."; display: 800-weight grotesk [X] (kinetic type tolerates a heavier weight than UI rules — it IS the image; committed in PROVENANCE as [X]).
5. **Tell check**: ink surface + a single vermilion accent is tell cluster 2 (SKILL.md §7). It is kept because the brief is a trailer title card (the type IS the shot) and the accent is used exactly once, on the period of "legend.", which is the punchline. Write this justification into the plan whenever a tell survives.

## Implementation notes

- One text layer per word group; all transforms computed in `render(t)`; blur is a filter transition on transform/opacity events only (not per-frame).
- The word-swap in b2 is a position swap with ease-in-out 0.5s — reads as "plans change".
- No camera move (type is the shot); zero ambient loops; exit = opacity hold to black dip 0.4s [X].

## Critique pass

- Motion ✓ every move is ENTER/EMPHASIS; the scale-landing on "legend." is the single EMPHASIS.
- Timing ✓ stagger 80ms [X]; no equal-duration neighbors (0.5s swap vs 0.7s landing).
- Continuity ✓ baseline locked across swaps; no mid-state at cuts.
- Typography ✓ 2 sizes/frame (display 140px [X], whisper 28px); sentence case; the vermilion period is the only accent — a typographic joke, not a single-word accent (the accent is punctuation, permitted as the one bold gesture).
- Verdict: **intentionally designed** (the first plan had a gradient wash on the title — deleted per §7 gradient-as-decoration).
