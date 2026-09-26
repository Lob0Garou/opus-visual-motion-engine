# opus-visual-motion-engine

An agent skill that gives any coding model a disciplined pipeline for **motion graphics, code-rendered video, kinetic typography, landing pages and diagrams**: plan → build from a template → render → automated QA → fix → export to MP4.

It was built by reverse-engineering *why* frontier models produce good visuals. The answer is mostly not taste. It is gates: a mandatory read-before-code step, a closed list of "AI-design tells", layout math done before rendering, a strict technical envelope, and a render-and-critique loop. This skill packages those gates, plus the tooling a model needs to check its own work even when it cannot see images.

> Not affiliated with or endorsed by Anthropic. "Opus" refers to the model whose public system prompt and public skills were studied; see [PROVENANCE.md](PROVENANCE.md) for the source of every rule.

## What's inside

| Path | What it does |
|---|---|
| `SKILL.md` | the pipeline the agent follows (plan, deterministic time, motion grammar, anti-template table, technical floor, QA, critique, export) |
| `references/` | 7 topic references: motion design, JS animation, timing and easing, typography, visual design, cinematography, video pipeline |
| `assets/composition-template.html` | a correct starting point: 1920×1080 stage fitted to any window, `seek(t)`/`DURATION` contract, seeded PRNG, easing helpers, a preview player that turns off during capture, dark-mode tokens |
| `scripts/qa.mjs` | headless render + automated critique; writes a contact sheet, key frames, `report.md` and `report.json`; exits 1 on any FAIL |
| `scripts/export.mjs` | frame-exact export via ffmpeg to `.mp4` / `.webm` / `.gif`, with optional `--audio` |
| `scripts/audio-data.mjs` | turns music or voice into `window.AUDIO` (beat grid, onsets, per-frame loudness, kick band), so motion syncs to sound frame-exactly; checks clipping, peak and LUFS |
| `examples/` | worked briefs and plans (landing page, product video, kinetic type, motion graphic) |

### What `qa.mjs` catches

**Video mode** (when the page exposes `window.DURATION` + `window.seek`):
- frozen timeline, dead air and near-empty frames
- non-determinism (frames revisited out of order must match)
- unsettled end frame
- text collisions, text over other graphics, and clipping
- contrast and minimum type size
- SVG lines whose draw-on never happens (`stroke-dashoffset` without `stroke-dasharray`)
- timer APIs, reduced-motion loops, console errors
- AI-template tells: Inter everywhere, tracked ALL-CAPS eyebrows, decorative gradients, uniform radius, SaaS-card shadows, cream + terracotta palette

It also captures every scene's entry, middle and end from `window.SCENES` (plus `--at` times) into `moments.png`, and warns when a font did not load. Deliberate layering is whitelisted with `data-qa-allow-overlap`.

**Page mode:** renders desktop 1440, mobile 390 and dark scheme, and checks the same layout rules plus mobile horizontal overflow.

It is built for **text-only models** too. Besides the contact-sheet image, `report.json` carries per-frame ink coverage and change, so a model without vision can still reason about what is on screen.

It was validated by mutation testing: 8 known bug classes were injected into the template, and all 8 were caught.

## Install

Requirements: Node ≥ 18, ffmpeg on PATH (only for export).

```bash
# DeepSeek Harness (user skills root)
git clone https://github.com/Lob0Garou/opus-visual-motion-engine ~/.dsh/skills/opus-visual-motion-engine
cd ~/.dsh/skills/opus-visual-motion-engine/scripts && npm install && npx playwright install chromium
```

Other harnesses load the same folder: `~/.claude/skills/` (Claude Code), `~/.agents/skills/`, or your harness's skills directory. The skill name is `opus-visual-motion-engine`.

Start a **new session** after installing. Some harnesses inject the updated skill catalog into sessions that are already running.

## Use

Ask for the deliverable and name the skill:

> using the opus-visual-motion-engine skill: create a 15-second motion graphics showreel about …

The agent writes a `PLAN.md` (beats, scene cards, a signature moment, an absolute timeline), builds `composition.html` from the template, and runs:

```bash
node scripts/qa.mjs composition.html            # repeat until exit 0
node scripts/export.mjs composition.html --out out.mp4 --fps 30
```

## Benchmark

Same 9,226-character prompt (a 15-second showreel), same harness (DeepSeek Harness), same model (`deepseek-v4.1-flash`), run on 2026-09-25. The baseline run used the HyperFrames skill suite, which the harness picked automatically (8 skills loaded).

| | HyperFrames suite | this skill | change |
|---|---|---|---|
| wall time (agent turns) | 98.7 min (84.2 + 14.5 after one approval) | **27.6 min** | −72% |
| LLM calls / steps | 147 | **68** | −54% |
| uncached input tokens | 1.65 M | **0.33 M** | −80% |
| output tokens | 286 k | **169 k** | −41% |
| total tokens incl. cache reads | 21.2 M | **8.7 M** | −59% |
| context compactions | 6 | 2 | |
| automated QA runs | 0 | 22 (final: PASS, 0 FAIL / 0 WARN) | |
| output | 3840×2160 @ 60 fps with audio, 54 MB | 1920×1080 @ 30 fps, no audio (audio cue sheet only), 4.6 MB | |

Caveats:
- This is one run per arm, not a statistical benchmark.
- The outputs do not have the same spec. The baseline rendered 4K60 with audio, which costs more render time.
- Token counts come from the harness's own session logs (`usage` per assistant message).

## Changelog

- **v1.1**
  - Audio sync: `audio-data.mjs` plus template helpers `audioAt`, `since` and `hit`.
  - Per-scene QA captures (`window.SCENES`, `--at`).
  - `data-qa-allow-overlap`.
  - Font-load check.
  - Side effects and rights section.
  - Ideas adapted from HyperFrames' community skill [`prod-by-claude`](https://github.com/heygen-com/hyperframes-community-skills/tree/master/skills/prod-by-claude) (Apache-2.0); the code here is original.
- **v1.0**: initial release.

## License

MIT for the code and text in this repository. Short quotations of third-party sources in `PROVENANCE.md` remain their owners' and are cited for attribution.
