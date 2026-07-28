# Visual review guidance

Review the rendered artifact set against its reconciled fact base, shared
ledger, set plan, and browser evidence. This rubric is independent of authoring
guidance: it tells a critic what to assess, not how an author should compose.
An optional installed visual-explainer capability may assist, but review must
remain possible from bundled evidence and rules alone.

## Review the whole set

Inspect the complete set before assigning artifact findings. Verify:

- **First viewport:** each artifact establishes purpose, project state, and the
  primary reader question without scrolling.
- **Hierarchy:** the most important outcome or relationship is dominant, with
  secondary detail grouped and ordered consistently.
- **Representation choice:** the selected medium makes the evidence easier to
  understand than plain prose would.
- **Legibility:** text, labels, status cues, tables, and connectors remain
  readable at every required viewport.
- **Medium fit:** the hub orients and links, the system visual preserves
  relationships, the deck paces a narrative, and optional artifacts add a
  distinct source-backed perspective.
- **Cohesion:** terminology, status labels, numbers, color meaning, and visual
  language match the shared ledger and one another.
- **Coverage and redundancy:** planned sources and reader questions are covered
  once at the right depth; optional artifacts do not repeat the hub or deck
  without a justified purpose.
- **Interaction:** navigation, links, keyboard controls, reduced motion, table
  overflow, and diagram pan or zoom work without hiding content.

## Artifact-scoped findings

Every finding identifies an artifact ID, the failed rubric area, evidence, and
a concrete correction. Distinguish factual or ledger conflicts from visual
judgment. Never infer a fact that is absent from the retained sources.

Use severity proportionally:

- Critical: unsafe, fabricated, or materially false output.
- Important: the artifact cannot answer its primary question or loses required
  topology, content, or legibility.
- Medium: meaningful visual or cohesion weakness that does not invalidate the
  set.
- Minor: localized polish issue.

## Disposition

Return exactly one provider-neutral disposition:

- `pass` when the full set clears the rubric with no required correction.
- `correct` when bounded artifact-scoped changes can clear the rubric.
- `fail` when evidence is missing, the plan or ledger is internally invalid, or
  correction would require unsupported facts or a different artifact set.

Do not award `pass` from source code inspection alone. Base visual findings on
the retained browser evidence available to the review request.
