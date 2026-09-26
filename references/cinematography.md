# Reference: Cinematography (frame discipline for code-rendered video)

Read when the deliverable is a video with intentional framing, or any piece where "the shot" matters. NOTE: the source corpus does not contain a camera/storyboard doctrine — the framing rules below are ported from the composition and label-placement doctrine of the leaked design modules; every value without a corpus source is [X] and listed as such in PROVENANCE.

## 1. Every frame has a composition

- One focal point per frame. If two elements compete, separate them in time, not in space.
- The message element occupies the geometric anchor (center or rule-of-thirds point); supporting elements hold the margins.
- Whitespace is a camera decision: a 60% full frame reads deliberate; a 95% full frame reads generated. When in doubt, remove an element.

## 2. "Camera" in a DOM/SVG world

The camera is a container transform. Three legal moves:

1. **Push-in / pull-out**: `scale` on the stage container, 1.0 → 1.05–1.15, 0.8–1.2s, ease-in-out [X]. Purpose: focus or reveal context.
2. **Pan**: translate the stage so a new region occupies the frame; used to walk a diagram left-to-right or top-to-bottom.
3. **Reframe**: resize/reposition a bounded element to become the next scene's stage (e.g. a metric card grows into the next panel's canvas).
4. **Push-through** (a cut): accelerate into an object (ease-in, blur rising) so the cut lands mid-move; the next scene starts at speed on a matching pose and decelerates (expo-out). The eye reads one move across the cut.
5. **Fly-through / iris** (a register switch): scale into an object's interior until it fills the frame and becomes the next background (a logo ring's core, a lens, a screen).

Forbidden: random drift, parallax with no narrative reason, rotating the stage (readability dies), camera moves during a text read.

## 3. Shot grammar for beats

- Establishing frame: wide, calm, 1–2s; carries the setting or the question.
- Detail frame: zoomed, short (0.5–1s), carries the exact number/word that proves the point.
- Return frame: back to wide before the exit, so the exit does not feel like an interruption.
- Never open AND close on the same framing unless it is a loop piece.

## 4. Continuity rules

- An object persisting across scenes keeps its exact position/scale across the cut (or morphs deliberately). Compute both sides of the cut from one named pose constant.
- Cut on motion: a cut placed mid-move hides itself; a cut between two still frames announces itself. Put cuts on beats.
- Text never enters faster than 150ms and stays readable ≥1.2s per 8 words [X].
- The exit of scene N and the enter of scene N+1 share at most one moving element; everything else swaps.
- Color continuity: scene accents belong to one palette; a hue change signals a semantic change, never an arbitrary variation.

## 5. Typography as camera subject

- Kinetic type: one word or one number per beat; the type IS the shot (scale from 0.6→1 with blur→sharp is a reveal [X]).
- Numbers count up in ≤0.8s and settle exactly; never leave a count-up mid-flight across a scene cut.
- Two type sizes per frame maximum (at 1080p e.g. 128px display + 34px label; floor 20px); more = the frame has no subject.

## 6. Critique questions for framing

- Could you screenshot any single frame and know the message of that moment?
- Is there exactly one thing moving that matters in each frame?
- Would a slow viewer be able to read every text?
- Does the camera ever move without narrative purpose? (If yes: remove the move.)
