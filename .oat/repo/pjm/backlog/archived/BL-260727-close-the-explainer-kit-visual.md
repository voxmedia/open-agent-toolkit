---
id: BL-260727-close-the-explainer-kit-visual
title: Close the Explainer Kit visual authoring capability gap
status: closed
priority: medium
scope: feature
scope_estimate: XL
labels:
  - explainer-kit
  - diagrams
  - recipes
assignee: null
created: 2026-07-27T04:19:56.434Z
updated: '2026-07-29T21:56:56Z'
associated_issues: []
external_plans: []
---

## Description

Four related gaps reduce Explainer Kit's breadth relative to the upstream visual-explainer it adapted. First, the inline fenced-diagram renderer positions nodes sequentially by index, so any non-linear graph — a branch, a fan-in, or a cycle — is silently flattened into a single chain. It misrepresents the source rather than degrading visibly: a fence declaring a two-way branch renders as a linear pipeline with no warning. Mermaid was deliberately banned to keep the core free of CDN dependencies, but its layout intelligence was never replaced. Second, upstream exposes workflows OAT does not reach from any bundled recipe: diff review, plan review, fact-check, dashboards, complex table rendering, and richer slide compositions. The diagram and deck shells exist and recipe/v2 expansion profiles can now select them, but only when an author opts in, so the capability is present and undiscoverable.

Third, source-document backlinks were lost. Upstream resolved a project's lifecycle documents into durable repository URLs and placed them in both the hub and the deck, so a reader could open `spec.md` or `plan.md` from the artifact. The current fact base hands the author `sources[].locator` values that are machine-local absolute paths (`/Users/<name>/orca/workspaces/...`), which are unusable as links, and nothing resolves them against the repository remote and ref. The briefs gesture at the intent — deep-dive says "link claims back to durable sources when available," project-recap says turn references "into real links rather than bare numbers" — without supplying linkable material, so an author following them faithfully still produces an artifact with no path back to the record.

Fourth, the per-initiative `catalog.json` is gone. Upstream emitted a machine-readable index of every artifact in a set, with title, type, and URL. The kit produces a `manifest.json` for publish bookkeeping, but nothing consumable as a site-level catalog.

## Ordered Successor Outcomes

This XL item remains the umbrella for five independently verifiable outcomes:

1. P0 — [Unattended visual author and critic](BL-260728-unattended-visual-author-critic.md)
   is in the current project's critical path.
2. P0 — [Cohesive adaptive recap set](BL-260728-cohesive-adaptive-recap-set.md)
   is in the current project's critical path.
3. P1 — [Non-linear diagram routing](BL-260728-non-linear-diagram-routing.md)
   is in the current project's critical path.
4. P1 — [Durable backlinks catalog](BL-260728-durable-backlinks-catalog.md)
   is in the current project's critical path.
5. P2 — [Additional visual workflows](BL-260728-additional-visual-workflows.md)
   is explicitly outside the current project's critical path.

## Acceptance Criteria

- The inline fenced-diagram renderer detects unsupported non-linear topology
  before layout and may reject or reroute it to the artistic composer. It must
  never silently flatten a declared branch, fan-in, or cycle into a chain.
- Regression fixtures declare a branch, a fan-in, and a cycle and assert each
  is preserved by the selected artistic route or rejected explicitly; they do
  not require the inline renderer itself to preserve unsupported topology.
- A recorded decision states whether bundled recipes expand toward the upstream
  workflows OAT does not reach (diff review, plan review, fact-check,
  dashboards, richer compositions), or whether those stay author-opted, with
  reasoning either way.
- If expansion is chosen, at least one bundled recipe selects the diagram and
  deck shells by default so the capability is discoverable without an author
  knowing to ask for it.
- The fact base exposes a resolved, durable URL for every file source alongside
  its local locator, derived from the repository remote and a ref that survives
  branch deletion. A machine-local path is never the only address an author is
  given for a source.
- A bundled recipe emits source backlinks without the author hand-writing them,
  and a test asserts a generated hub links to at least one lifecycle document.
- A recorded decision states whether the kit re-emits a per-set `catalog.json`
  or treats `manifest.json` plus the hub as sufficient.

## Notes

Evidence from the `explainer-authoring-redesign` recap run (2026-07-26): when
the agent composed SVG directly on the artistic path, branching and cyclic
diagrams rendered correctly and legibly at 1200x720 with working zoom, pan, and
legend. The capability gap is therefore in the inline renderer's layout logic,
not in the shell or the theme. That suggests two viable fixes — real layout
logic for the inline renderer, or routing non-linear fences to the artistic path
by policy — and the decision between them belongs to this item.

Evidence for the backlink and catalog gaps (2026-07-27): the upstream
`identity-store-split` set still published in the bucket links its deck to five
GitHub documents and three Google Docs and ships `catalog.json`, while the
`in5-game-cms` recap generated by the current kit shipped with zero anchors in
its deck until they were hand-authored. Hand-authoring them also surfaced a
durability trap worth resolving here: links built against a PR head branch
(`cursor/in5-game-cms-b838`) break once that branch is deleted after merge, so
the resolved URL should pin a ref that outlives the branch.
