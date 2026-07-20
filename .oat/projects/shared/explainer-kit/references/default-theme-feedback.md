# Explainer-Kit Default Theme Feedback — operator-directed (2026-07-20)

From the stoa-side orchestrator, relaying an operator quality judgment on the
v1 kit's SHIPPED THEME DEFAULTS. This is product feedback about what ships in
the package, not a request for consumer-side workarounds.

## The judgment

The operator reviewed all 15 bundled palette × profile combos rendered with
identical specimen content (side-by-side gallery, real tokens from the
installed 0.2.6 package). Verdict: none is good enough to be a proud default
— "honestly all of these kind of suck." `neutral-clean` is merely okay.

The decisive evidence: the operator's pre-v1 work kit (oat-explainer-kit
0.4.1) produced decks whose built-in style the operator considers the bar —
"a much better clean/corporate vibe." **The v1 theme extraction regressed
the built-in visual quality relative to 0.4.1's house style.** The bundled
palettes read timid: gray-on-gray accents, no chroma carrying emphasis, no
opinionated typographic hierarchy.

## Reference artifacts (copied alongside this file)

1. `work-deck-reference.html` — 0.4.1-era deck ("Identity data-syncing —
   bird's-eye deck", white-canvas variant). THE quality bar.
2. `work-deck-reference-2.html` — same family, `#f4f6f9` canvas variant
   with glossary patterns.

Study beyond colors: panel elevation treatment, hairline borders, tinted
accent washes (6-10% alpha), chip/callout patterns, table styling, serif
display + system sans + mono grammar, restraint.

## Extracted token sets worth shipping as first-class palettes

**"corporate" (light) — from the 0.4.1 reference:**
canvas #ffffff · panel #f7f8fa · elevated #eef0f4 · border #d8dde3 /
soft #e9ecf0 · ink #1a1f29 / dim #4a5568 / muted #8b94a3 ·
accent #1b4f8a / bright #2f6fce / wash rgba(27,79,138,.08) /
edge rgba(27,79,138,.35) · warn #d97706 (wash .06) · code-bg #f4f6f9 ·
serif: ui-serif/"Source Serif Pro"/Georgia · sans: system stack · mono.
(Variant canvas #f4f6f9 with #ffffff panels per reference 2.)

**"navy" (dark) — the operator's other approved style (stoa program +
W6 recap decks, live at
https://dy4vzrzaexuy5.cloudfront.net/explainers/stoa-wave-6-recap-2026-07/index.html):**
canvas #0e1420 · panel #161d2b · elevated #1e2635 · border #2a3547 /
soft #222c3c · ink #e7ecf3 / dim #aeb9c8 / muted #748196 ·
accent #5a97dd / bright #77abec / wash rgba(90,151,221,.12) /
edge rgba(90,151,221,.42) · warn #e3a54e · same type grammar.

These two are the same design language in light and dark — they would make
one excellent two-mode default bundle (or two palettes) far stronger than
any current bundled option.

## Design principles the current palettes violate (generalize, don't just

copy tokens)

1. Accents must carry real chroma — a gray accent (#374151) cannot do
   emphasis work; every current palette's accent is too timid.
2. Emphasis surfaces (why-it-matters strips, callouts) need dedicated warm
   contrast (amber family), not a status color doing double duty.
3. Washes over fills: low-alpha accent tints for highlighted regions beat
   flat panel swaps.
4. Typographic hierarchy is part of the theme: serif display + sans body +
   mono eyebrows is the proven grammar; profiles should vary it, not
   flatten it.
5. Defaults are the product: most runs (especially unattended lifecycle
   recaps) ship whatever the default renders — see the companion defect
   report (`w6-recap-defects-handoff-2026-07-20.md`) on unattended runs
   falling through to `neutral-clean` silently.

## Asks

- Treat default-theme quality as a v1.x product item: replace or
  substantially upgrade the bundled palettes, with the two token sets above
  as candidate first-class palettes (suggested names: `corporate`, `navy`).
- Add a manifest warning when an unattended run falls through to shipped
  defaults with no configured theme (companion to the authoring-seam
  defect).
- The operator can supply rendered-side-by-side comparisons on request; the
  15-combo gallery used for this review is reproducible from the installed
  package tokens.

## FINAL operator ruling on the default lineup (2026-07-20)

Replace the 5-palette × 3-profile matrix with FOUR curated, named styles —
each designed as a whole (color + type + density + motion together):

1. **Clean/Neutral** — the minimal light family. What `neutral-clean` wants
   to be, executed with conviction: real hierarchy, not gray-on-gray. The
   tinted-canvas variant (`#f4f6f9` canvas / white panels, see
   `work-deck-reference-2.html`) belongs here as its softer expression.
2. **Business/Corporate** — the 0.4.1 work style. Deep-blue accent
   (`#1b4f8a`/`#2f6fce`), serif display grammar, tinted accent washes.
   Tokens in this doc; rendered references: `work-deck-reference.html`,
   `corporate-palette-demo.html` (real content).
3. **Navy/Ocean** — the dark editorial style. Tokens in this doc; live
   reference at the W6 recap URL.
4. **Dark/Edgy** — mono-forward, terminal-sensibility dark style. Rendered
   reference supplied: `dark-edgy-reference.html` ("Honeypot Engagement —
   an engineer's tour"). Tokens: canvas #0d1117 · panel #161b22 · elevated
   #1c232c · border #2a323d / soft #1f2731 · code-well #0a0e14 (darker than
   canvas — signature move) · ink #d9e0e8 / dim #8b96a7 / muted #6b7689 ·
   accent #7ddce0 (cyan) / bright #a8eeef / dim rgba(125,220,224,.18) /
   edge .55 / GLOW .35 — deliberately hotter alphas than the other styles ·
   warn #f0b878 (wash .06) · mono led by JetBrains Mono; same serif/sans
   grammar. The current `technical` profile's no-motion discipline is a
   good ingredient to fold in.

Design implication this encodes: the palette×profile MATRIX is the wrong
product shape for defaults. Fifteen uncurated combinations guarantee
mediocrity; four curated styles is what 0.4.1 implicitly had and v1 lost.
Profiles may survive as a documented advanced axis, but the front door is
named styles.
