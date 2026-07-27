---
id: BL-260727-close-the-explainer-kit-visual
title: Close the Explainer Kit visual authoring capability gap
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - explainer-kit
  - diagrams
  - recipes
assignee: null
created: 2026-07-27T04:19:56.434Z
updated: 2026-07-27T04:19:56.434Z
associated_issues: []
external_plans: []
---

## Description

Two related gaps reduce Explainer Kit's visual breadth relative to the upstream visual-explainer it adapted. First, the inline fenced-diagram renderer positions nodes sequentially by index, so any non-linear graph — a branch, a fan-in, or a cycle — is silently flattened into a single chain. It misrepresents the source rather than degrading visibly: a fence declaring a two-way branch renders as a linear pipeline with no warning. Mermaid was deliberately banned to keep the core free of CDN dependencies, but its layout intelligence was never replaced. Second, upstream exposes workflows OAT does not reach from any bundled recipe: diff review, plan review, fact-check, dashboards, complex table rendering, and richer slide compositions. The diagram and deck shells exist and recipe/v2 expansion profiles can now select them, but only when an author opts in, so the capability is present and undiscoverable.

## Acceptance Criteria

- The inline fenced-diagram renderer either lays out non-linear graphs
  faithfully or refuses to misrepresent them, emitting a warning that names the
  unsupported construct. Silent flattening of a declared branch into a chain is
  the specific behavior to eliminate.
- A regression fixture declares a branch, a fan-in, and a cycle, and asserts the
  rendered output preserves each — the current renderer must fail it.
- A recorded decision states whether bundled recipes expand toward the upstream
  workflows OAT does not reach (diff review, plan review, fact-check,
  dashboards, richer compositions), or whether those stay author-opted, with
  reasoning either way.
- If expansion is chosen, at least one bundled recipe selects the diagram and
  deck shells by default so the capability is discoverable without an author
  knowing to ask for it.

## Notes

Evidence from the `explainer-authoring-redesign` recap run (2026-07-26): when
the agent composed SVG directly on the artistic path, branching and cyclic
diagrams rendered correctly and legibly at 1200x720 with working zoom, pan, and
legend. The capability gap is therefore in the inline renderer's layout logic,
not in the shell or the theme. That suggests two viable fixes — real layout
logic for the inline renderer, or routing non-linear fences to the artistic path
by policy — and the decision between them belongs to this item.
