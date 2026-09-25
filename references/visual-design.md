# Reference: Visual Design

Read FIRST for landing pages, dashboards, mockups, or any multi-section UI. This file is authoritative for composition, hierarchy, color, and the anti-template checklist.

## 1. Direction, not decoration

- Name the direction before code: palette, typefaces, form treatment. Derive it from the subject's industry, materials, and vernacular — distinctive choices come from the subject, not from a style database.
- The hero opens with the most characteristic thing in the subject's world (headline, image, animation, live demo, interactive moment). "Big number + small label + stats + gradient accent" is the default treatment — use it only when it is genuinely the best option.
- Visual structure is information: outlines, borders, numbering, eyebrows, dividers, labels must encode meaning. Numbered markers (01/02/03) only when the content truly is a sequence.

## 2. Palette

- 4–6 named hex values. One dominant surface color, one ink color, 1–3 accents with assigned meanings.
- Color encodes meaning, not sequence: elements of the same category share one color; gray for neutral/structural/inert; warm ramps for heat/energy, cool for cold/calm.
- 2–3 colors per view, not 6+. More colors = more noise.
- Text on colored fills: darkest (or lightest, in dark mode) stop of the SAME ramp — never plain black or generic gray.
- When a block has title + subtitle on a colored fill, use two different stops of that ramp; the weight difference alone is not enough.
- Semantic colors (success/warning/danger/info) are reserved for their meaning; prefer neutral ramps for categories.
- Dark-mode mental test: "if the background were near-black, would every text element still be readable?" — if any element fails, replace hardcoded colors with tokens.

## 3. Spacing & form

- rem for vertical rhythm (1 / 1.5 / 2rem), px for component-internal gaps (8 / 12 / 16px).
- Borders default to hairline (0.5px). Cards: surface background + 0.5px border + radius token + 1rem/1.25rem padding.
- Radius tokens by hierarchy (e.g. 8px elements, 12px cards, 16px large surfaces). Single-sided accent borders get radius 0.
- One featured element may take a 2px accent border + small badge — the single exception to the hairline rule.
- Grids: `minmax(0, 1fr)` to clamp min-content; wide tables/code scroll in their own `overflow-x: auto` container.
- Metric cards (summary numbers) are muted surfaces, no border: 13px label above, 24px/500 number below; grid of 2–4 with 12px gap.
- Bounded objects (contact card, receipt, chat thread, phone screen) get ONE raised card; explanatory content flows without a card; full-bleed content (dashboard, data table) needs no wrapper.

## 4. Diagrams & schematics

- Compute before placing: `rect_width = max(title_chars × 8, subtitle_chars × 7) + 24` (add 30–50% for formulas/unicode); 60px between boxes, 24px inner padding, 12px text-to-edge, 10px arrowhead-to-box.
- Max 4–5 nodes per diagram. 6+ components → one sparse overview + one diagram per sub-flow, with prose between. Never promise a diagram you do not deliver.
- Box subtitles ≤5 words; details go in prose or interaction, not the box.
- One SVG per deliverable unit; a wrong diagram is replaced, never appended after.
- Arrows: trace every line against every box before writing it; crossings become L-shaped detours. No arrow labels in cramped space; stop lines at component edges (compute the stop coordinate).
- Cycles are never drawn as rings — convey the loop with a return arrow or restructure as a step-through (one panel per stage).
- Containment diagrams: outer container = lightest fill + 0.5px stroke + rx 20–24; inner regions = next shade, different ramp when semantically distinct; 20px inner padding; max 2–3 nesting levels.
- Intuition diagrams ("how does X work"): draw the mechanism, not a diagram ABOUT it. The spatial arrangement carries the meaning; labels annotate. It should still work with labels removed. Simplify shapes to ~6 path segments max; a flame is three triangles. Overlap shapes freely for depth; never let a stroke cross text (place labels in quiet regions with leader lines, one side of the canvas, ≥140px margin).
- Prefer interactive: if the real system has a control, give the diagram that control (slider, toggle) wired to real state.
- viewBox calibration: keep the coordinate system 1:1 with rendered pixels; if the host container is a known width (e.g. 680px), do NOT shrink the viewBox to hug content — center the content instead, or your font metrics change scale.

## 5. Copy in design

- Words exist to make the thing easier to understand and use — design content, not decoration.
- User's perspective, plain language ("manage notifications", not "webhook config"); active voice; CTA states the action ("Save changes", not "Submit").
- One name per action across the whole flow (button "Publish" → toast "Published").
- Failure/empty states explain what happened and what to do next — no apology, no vagueness; an empty screen is an invitation to act.
- Sentence case; entity/function names in `code style`, not bold; bold only for headings/labels.

## 6. Anti-template calibration (run before shipping)

Self-check against these generated-design clusters; where the brief pins a direction, follow the brief — where it leaves freedom, do NOT spend it on these defaults:

1. cream background near `#F4F1EA` + high-contrast serif display + terracotta accent near `#D97757`;
2. near-black background + single bright acid-green/vermilion accent;
3. broadsheet layout: hairline rules, zero radius, dense newspaper columns;
4. SaaS-card kit: identical rounded cards, one radius everywhere, same soft shadow `rgba(0,0,0,.1)`, gradient washes as decoration;
5. template chrome: tracked-out ALL-CAPS eyebrows, middle-dot meta strings, "WORD — fragment" labels, near-black `#0B0B0B` as black, monospace for small data labels, "→" on links/buttons.

Plus: excessive centered layouts, purple gradients, uniform rounded corners, Inter-everywhere, fade-up on every section, hover on every card. Each is legitimate when the brief asks for it — the tell is that they appear REGARDLESS of subject. Fix = replace the default with a choice anchored in the subject's vernacular, and write down what you changed and why.

## 7. Restraint

- Spend boldness in one place: one memorable element per view; everything else quiet and disciplined. Then remove one accessory (Chanel rule) — one decoration that does not serve the brief.
- Quality floor without announcing it: responsive to mobile, visible keyboard focus, reduced motion respected, accessible contrast, harmonious palette.
- Polish pass = refine what exists, do not add more. If the instinct says "add a shape/filter", ask instead: "how can what is already here become more of a piece?"
- Render and check: `node scripts/qa.mjs page.html` (desktop 1440 + mobile 390 + dark). Read the report; open the screenshots if you can read images.
