# Example: landing page

## Brief

"Build a landing page for **Tiller**, a soil-sensor product for small vineyards. Audience: vineyard managers, ages 40–60, on tablets in the field. Primary job: book a demo."

## Plan (Pre-code planning, SKILL.md §1)

1. **Primary visual message**: "the vineyard tells you when to water — before the vine wilts."
2. **Named direction** — "Field Ledger": paper `#F6F4EE` is the LEDGER page (not cream-brutalism: paired with a saturated field-green and ink-black, high structure); ink `#141613`; leaf `#3E6B35` (healthy); stress `#B4552D` (water stress); type: display serif ("Source Serif 4", fallback Georgia) for the field-notebook voice, sans body (system), tabular numerals for readings.
3. **Hierarchy** — PRIMARY: the live soil-moisture reading (an inline animated gauge — the one orchestrated moment); SECONDARY: the 3-step "how it works" band with a real sensor photo per step; TERTIARY: specs, FAQ, footer.
4. **Progression**: hero with live reading → the moment (wilting threshold line crossing) → install in 3 steps → pricing → FAQ → CTA band.
5. **Pre-render math**: reading numerals 72px mono `chars×0.6×72`; hero H1 ≤12 words at 64px ⇒ max 640px line (fits 1200px container); CTA button text "Book a field demo" (active voice; same name on all buttons).

Motion budget: ONE page-load sequence (hero reading counts up and the threshold line draws), then everything static. No hover animation on cards (the AI tell); hover = underline only.

## Implementation notes

- Single HTML; tokens on `:root` incl. dark variant; reading colors are ramp-dark on light fills.
- The gauge is SVG: arc `stroke-dashoffset` driven by a 0.8s count-up on load; threshold tick is a fixed dashed line.
- Grid: `minmax(0, 1fr)`; step band asymmetric 2:1; every image has explicit width/height (no CLS); `overflow-x:auto` on the spec table.
- Copy: "Save changes"-style CTAs; errors ("Sensor offline — last reading 2h ago") directional, not apologetic.

## Critique pass (design-level, simulated render trace)

- Composition ✓ eye lands on the reading (highest contrast element, top-third).
- Hierarchy ✓ one accent per section; stress color appears ONLY on the threshold line.
- Contrast ✓ leaf `#3E6B35` on paper = 5.2:1 (passes); stress on paper 4.9:1.
- Spacing ✓ rem rhythm; nothing touching.
- Typography ✓ serif display + sans body distinct; no single-word accenting in H1.
- Motion ✓ exactly one orchestrated moment; ambient none.
- Density ✓ hero has 4 elements (reading, threshold, vine sketch, CTA).
- Responsiveness ✓ tablet-first: gauge scales, spec table scrolls internally.
- Verdict before fix: "generated" (the 3-step band initially used 01/02/03 markers + same-radius cards = SaaS-kit tell). Fix applied: steps became a numbered LEDGER list (real sequence → numbering legitimate) with irregular photo sizes echoing notebook snapshots.
- Final verdict: **intentionally designed**.
