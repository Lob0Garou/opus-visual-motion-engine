# Example: product video

## Brief

"20-second launch video for **Ledgerline** — invoicing that reconciles itself. Show: invoice in → reconciliation → money settled. No voiceover; type + UI states carry it."

## Plan

1. **Core message**: "You send the invoice. Ledgerline finishes the job."
2. **Beats**: b1 (0–3s) invoice card enters, line items type on; b2 (3–8s) the reconciliation: green ticks cascade over each line as amounts match (the signature moment); b3 (8–13s) bank feed slides in from the right, rows merge into the invoice — a MORPH, not a cut; b4 (13–18s) total counts up, "Settled." stamps in with back-out overshoot [X]; b5 (18–20s) lockup + CTA card settles.
3. **Timeline** (absolute): 0/3/8/13/18/20; handoffs 0.4s; the tick cascade at 3–6s is the one orchestrated moment; ambient none.
4. **Direction**: "Treasury Glass-free" — white `#FFFFFF` surfaces, ink `#0F1215`, matched-green `#0E7C4A` (only green), warning-amber `#B7791F` for the single unmatched row in b2 (one deliberate exception makes the cascade believable), mono for amounts. NO glassmorphism (shadowless cards, 0.5px borders).

## Implementation notes

- UI-state motion only: transforms of real interface elements (cards, rows, ticks) — the "screenshot of a product" is built as the product, not as a video of one.
- The b3 merge is a FLIP morph [X]: capture A/B rects, invert-transform, play — 0.6s ease-in-out.
- Count-up 0.8s; stamp lands with `backOut(t, 1.7)` 0.35s [X]; row cascade stagger 70ms [X].
- Deterministic: seed drives the ONE synthetic bank-row jitter; `render(t)` owns everything; seek/ DURATION exported; capture at 0/25/50/75/100% + the cascade window (3.0–6.0s at 0.5s steps) for the critique.

## Critique pass

- Narrative ✓ message repeatable: invoice → matched → merged → settled.
- Continuity ✓ the invoice card persists across all beats at a fixed anchor (top-left 25%, 8%); the bank feed exits fully before the stamp.
- Density ✓ max 5 elements per frame; unmatched row removed at 5.6s (after its role).
- Timing ✓ cascade ≠ count-up ≠ stamp durations; nothing same-duration.
- Motion ✓ ticks = state change (TRANSITION); stamp = EMPHASIS; no decoration.
- Performance ✓ transform/opacity only; 60fps budget at 1920×1080.
- Verdict: **intentionally designed** (first plan opened on a centered logo hero — replaced by the product UI itself per "open with the most characteristic thing").
