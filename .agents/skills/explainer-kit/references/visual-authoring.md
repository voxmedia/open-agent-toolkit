# Visual authoring guidance

Use this reference with the reconciled fact base, shared set plan, selected
theme, and the artifact-specific brief. It is sufficient for an unattended
author. An optional installed visual-explainer capability may improve the
composition, but the run must not depend on it.

## Choose the representation

Choose the visual form that makes the reader's question easiest to answer:

- Use a hub for orientation, current state, key decisions, and links into the
  rest of the set.
- Use a system visual for boundaries, relationships, direction, ownership, or
  flow. Preserve branches, fan-in, and cycles; reject or reroute a topology the
  selected renderer cannot represent.
- Use a deck for a paced beginning-to-end narrative with one idea per frame.
- Use a table for repeated facts with comparable columns, not for prose.
- Use cards for independent summaries and lanes for parallel work.

Do not turn every fact into a chart. Prefer structured text when shape or
position adds no meaning.

## Establish hierarchy

Make the first viewport answer what this is, why it matters, and where the work
stands. Use one dominant title, a short framing statement, and the most useful
visual or status summary before secondary detail. Keep headings descriptive,
group related items, and use size, spacing, and contrast consistently.

Assign intentional typography roles to the title, framing statement, section
headings, labels, body copy, evidence, and annotations. Use weight, scale,
measure, and contrast to clarify those roles rather than making every text block
equally loud. Keep the role system consistent across artifacts without forcing
every medium into the same composition.

Use the shared terminology, status labels, and numbers exactly. Never create a
shorter synonym that changes meaning. Keep source-backed uncertainty visible as
`needs confirmation`.

## Compose to the evidence

Treat composition and density as editorial choices. Group facts that belong
together, give the main claim enough emphasis, and let supporting evidence
recede without becoming hard to find. Restructure crowded content instead of
shrinking it, and remove decorative filler instead of stretching sparse
material.

Seek medium leverage: a visual artifact should make a relationship, comparison,
sequence, or decision easier to understand than prose alone. Vary the treatment
to fit the evidence and avoid template repetition across sections, cards, or
slides. Shared visual language should create cross-artifact cohesion, not a set
of cloned layouts.

## Hubs and responsive navigation

- Lead with the project outcome and current state, then expose architecture,
  decisions, validation, and next steps.
- Link every artifact in the planned set using descriptive labels.
- Keep navigation compact and keyboard reachable. On narrow screens, collapse
  a side rail into horizontal, wrapping, or disclosure navigation.
- Avoid fixed widths. Let text wrap, put wide tables and diagrams in bounded
  scroll containers, and ensure the document itself does not overflow.
- Keep the primary reading order useful without JavaScript.

## Diagrams and system visuals

- Preserve diagram semantics: topology, direction, ownership, state, and edge
  meaning must survive the visual treatment.
- Encode relationships with position and connectors, not color alone.
- Label nodes with concrete nouns and edges with actions or data movement.
- Make direction explicit and include a legend only when the encoding needs it.
- Preserve graph semantics. Never serialize branches, fan-in, or cycles into a
  false linear sequence.
- For each non-linear `graphSemantics` input, emit one element with the exact
  `data-direction`. Emit every node exactly once with `data-node`,
  `data-node-label`, `data-node-shape`, and `data-node-explicit`; emit every
  edge exactly once with `data-from`, `data-to`, `data-edge-kind`, and
  `data-edge-label`. Use the frozen tuple values verbatim with canonical HTML
  attribute escaping, including `data-edge-label=""` for an unlabeled edge.
- Give the canvas an accessible name and description. Keep labels readable at
  the required viewport widths and provide bounded pan or zoom for large maps.
- Fit the frame to the content so the meaningful topology is prominent rather
  than stranded in unused canvas.
- Use the same component names and status vocabulary as the hub and deck.

## Decks

- Give each slide one claim, decision, or transition.
- Open with the outcome and audience question; close with current state and next
  action.
- Prefer short headings, diagrams, lists, and comparisons over paragraphs.
- Keep critical content inside one viewport, with overflow available as a
  safety valve rather than the default reading experience.
- Support keyboard controls, visible position, reduced motion, print, and a
  readable no-script flow.

## Tables

- Use a clear header row and comparable values in each column.
- Put units in headings, align numbers consistently, and preserve exact values
  from the shared ledger.
- Keep cells concise. Move explanations below the table or into a linked deep
  dive.
- Wrap or scroll wide tables without clipping their final column.

## Composition check before return

Confirm the artifact:

1. answers its planned reader question in the first viewport;
2. uses the planned medium and visual intent;
3. follows the shared ledger without terminology, status, or number drift;
4. includes only source-grounded claims and planned links;
5. remains legible and navigable on desktop, tablet, and mobile; and
6. returns complete content for the recipe-selected authoring path.
