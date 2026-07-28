---
id: DR-260726-explainer-authoring-is-two
title: Explainer authoring is two-path with a caller-owned author seam
date: 2026-07-26
status: accepted
legacy_id: null
---

# Explainer authoring is two-path with a caller-owned author seam

## Context

A prior Explainer Kit revision abstracted authoring into fixed slots so that every recap filled the same shapes. The output was structurally thin, and tightening the schemas to force richness made it worse: the schema described shapes, not quality, so an author satisfying it exactly still produced a formulaic page. The failure was locating editorial expectations in machine contracts.

## Decision

Authoring is chosen per artifact between two paths. The narrative path treats Markdown as actual renderer input, so tables, GFM-alert callouts, fenced timelines, and fenced diagrams render as structure rather than flattening to prose. The artistic path has the executing agent compose HTML from hash-pinned shells. Recipe policy selects the path via expansion profiles; the author does not. Editorial expectations live in author briefs as prose, while schemas define only machine boundaries — prose carries quality, schemas carry identity. No content generator ships in the core or the OAT adapter; the executing agent is the author, reached through a caller-owned seam.

## Consequences

Guideline misses degrade to warnings while safety and provenance remain hard errors, so a floor gap reports rather than fails closed. Output richness cannot be asserted by unit test, because whether an agent writes well is not unit-testable; it is verified by rendered example instead. A caller that supplies a thin author still gets thin output, and that residual risk is accepted deliberately: bundling a generator to close it would recreate the slot-filling rigidity this decision replaced.
