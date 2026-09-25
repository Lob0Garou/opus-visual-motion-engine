# Reference: Typography

Read when type carries the design (landing pages, kinetic type, editorial layouts). Authoritative for scale, weights, pairing, and typographic anti-patterns.

## 1. Scale and weights (by medium — pick the row for the deliverable)

| Medium | Scale | Weights |
|---|---|---|
| inline widget / diagram / dense app UI | h1 22px, h2 18px, h3 16px (all 500); body 16px/400, line-height 1.7 | 400 + 500 only; 600/700 read heavy against quiet UI |
| landing page / editorial | display 48–96px (clamp() to viewport), h2 28–40px, body 17–19px/1.6 | 400 + 500/600; display weight is a direction decision |
| video frame 1920×1080 | display 96–160px, label 30–40px, floor 20px (H/54); vertical 1080×1920 uses the same px | display may go heavy (700–900) when type IS the image; labels 400 |

- Two font sizes per frame in video work (display + label). Two families maximum per project; when two, make them clearly distinct.
- Whatever the row, write the chosen scale into the plan and keep it — the tell is inconsistency, not a number.
- Line length <80 characters; serif body gets slightly more line-height than sans.
- Headings and key labels in medium (500); body in 400; the hierarchy comes from size + position first, weight second.

## 2. Choosing typefaces

- Choose deliberately for THIS subject — not the default family reached for on every project. A children's book site and a financial dashboard must not share a display face.
- Type used as a visual element (huge word, masked headline, count-up number) is part of the composition, not a delivery vehicle: give it scale, position, and motion intent.
- Web font discipline: load from the platform's allowed font host only; ALWAYS ship a real fallback stack (`"Showcase Sans", "Inter", system-ui, sans-serif`); test the fallback.

## 3. Typographic anti-patterns (each is a generated-page tell)

1. Accenting a single word/phrase in a headline (italic/bold/different color) — the commonest tell of a generated page. Exception: the accent uses a semantic color token that means the same thing everywhere else in the piece (coral = noise in the headline AND in the noise visuals). Decoration-only accents stay banned.
2. ALL CAPS for labels (tracked-out eyebrows above every heading).
3. Unnecessary typographic labels above content that already explains itself.
4. Title Case or ALL CAPS in diagram labels/buttons — sentence case always, including SVG text.
5. Mid-sentence bolding for emphasis; entity/function names belong in `code style`, not bold.
6. Monospace for small data labels as a default aesthetic (use it when data IS code, not as style).
7. Same family/weight/size for title and subtitle on a colored fill — they need different stops/tones, not just different weight.

## 4. Numeric typography

- Every displayed computed number is rounded (`Math.round()`, `.toFixed(n)`, `Intl.NumberFormat`); sliders emit stepped values (`step="1"` or `0.1`).
- Currency: negative values are `-$5M`, never `$-5M` — sign before symbol via a formatter.
- Counts in integer, percentages 1–2 decimals, currency via `toLocaleString()`.

## 5. Copy discipline in interfaces

- Plain verbs, sentence case, no filler; each written element does exactly one job.
- Errors are directional, not moody: what happened + what to do, in the interface's voice, no apology.
- CTA = the action it performs, active voice, stable name across the flow.

## 6. Kinetic type quick rules

- One idea per beat; the moving word is the beat's subject.
- Reveal = transform + opacity only (scale 0.6→1, blur→sharp [X], slide with ease-out).
- The word settles FULLY before the next beat's element enters; never crossfade mid-morph.
- Reading time floor: ~1.2s per 8 words on screen [X]; longer text = more time or less text.
