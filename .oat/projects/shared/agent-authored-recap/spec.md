---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
oat_template: false
---

# Specification: agent-authored-recap

## Phase Guardrails (Specification)

This document states what must be true, not how it is built. Mechanism choices live in `design.md`.

## Problem Statement

The implementation-tail project recap requires adaptive portfolio planning, five injected provider seams (author, fact critic, browser session, visual critic, set planner), multi-artifact expansion, and publish/durability machinery before it can produce one HTML page. On a normally configured host the tail either blocks on capability that is not present or records a capability-probe skip, so the ordinary lifecycle produces no recap at all; the 2026-08-31 execution program closed on 2026-09-09 with `recap: not run` in every ledger row. Backlog item `BL-260907-replace-the-default-project` (GitHub #230) asks for one dependable, agent-authored HTML recap with browser-based visual verification, keeping the advanced Explainer Kit available through its explicit workflow.

## Goals

### Primary Goals

- A normally configured host produces one standalone, navigable HTML recap for a project without custom provider modules, and the archive command accepts it unchanged.
- The same flow produces the program recap for the 2026-08-31 execution program, and its run identity and outcome land in the program ledger.
- A `generate` decision is satisfied only by a usable artifact; failure is visible and decided, never a silent closeout warning.

### Secondary Goals

- The duplicated program-close caller in the two wave skills collapses onto the one flow.
- The retired seam machinery leaves the default path without touching the advanced kit.

## Non-Goals

- Rewriting the advanced Explainer Kit core, its recipes, publish/durability machinery, or its golden-conformance tests.
- A new CLI command for recap generation (deferred idea; skill scripts only).
- Publishing recaps to S3 or any external surface.
- Changing the fact-base schema or the manifest contract.
- The recon rework, which runs as its own project.

## Requirements

### Functional Requirements

- **FR1 — Allowlisted fact bundle.** The flow assembles a fact base only from approved artifacts of the project (summary, implementation record, orchestration log, plan, discovery, spec, design where present) or, for a program recap, the reconciled execution-program artifact plus every wave's summary and completion record. The bundle conforms to `explainer-kit.fact-base/v1` (canonical JSON, derived Markdown) and records input hashes so an unchanged input set is detected as fresh and never re-authored.
- **FR2 — Agent-authored single artifact.** The host agent authors one standalone HTML page from the bundle, carrying the recipe's required narrative sections: for a project, original request, key agent decisions, as-built architecture, implementation record, validation evidence, outcome; for a program, program overview, wave map, per-wave outcomes, convention evolution, aggregate numbers, follow-up ledger. No custom author, critic, or visual-critic module is required.
- **FR3 — Browser ladder.** Visual verification uses the first available rung: the host agent's own browser capability, then the kit's bundled Playwright probe, then browser-free checks. The rung used, the artifact path, and the screenshot paths (narrow, medium, wide) are retained in a small result record.
- **FR4 — Browser-free checks always run.** Regardless of rung: the page parses, every required section is present, and every claim in the page traces to the fact bundle by subject and value (token membership is not sufficient).
- **FR5 — Manifest kept; package rule replaced.** The run writes an `explainer-kit.manifest/v1` manifest whose keys, recipe id, and outcome enum are unchanged, and the archive command's package rule is replaced (no backward compatibility) so that exactly the new small run package is required and nothing else; the archive validator's manifest-key check is untouched and its package-coverage rule and tests change in lockstep with the flow. Outcome semantics are rewritten on the existing enum: a verified usable artifact, a usable but visually unverified artifact (`built-needs-review`, with the reason), or `failed`; the terminal-outcome guard keeps its shape, keeps `built-durable` satisfied, and never treats `failed` or `incomplete` as a satisfied generation.
- **FR6 — Generate, retry, or skip.** A `generate` decision is satisfied only by a usable artifact. On failure the flow preserves a sanitized actionable cause and requires an explicit retry or an explicit skip; the decision is persisted so a resumed completion honors it and never re-prompts or re-authors silently. An authored artifact is never discarded.
- **FR7 — One flow, two recipes.** Project and program recaps share one generate flow selected by recipe; the program-close callers in `oat-wave-program` and `oat-wave-execute` reference it instead of duplicating it.
- **FR8 — Lifecycle consumers route on the new semantics.** `oat-project-complete`'s recap gate and export path, `oat-project-summary`'s outcome mapping, and the two wave skills read the result record and outcome vocabulary; no lifecycle skill references a retired seam or the capability probe.
- **FR9 — The program recap ships.** The last phase generates the recap for the 2026-08-31 execution program from the reconciled program artifact and the seven wave records, and records the run identity and outcome in the program ledger.

### Non-Functional Requirements

- **NFR1 — Fresh-host proof.** A test exercises successful generation on a fresh host with no custom modules and no browser, and reproduction-grade negative controls for authoring failure and browser failure, proving each failure stays visible while an accepted control still produces the recap.
- **NFR2 — Weaker-anywhere, enumerated.** Nothing the archive validator or the terminal-outcome guard rejects today becomes accepted except the two deliberate changes the design enumerates: the archive accepts the new small run package, and it stops accepting the legacy package shape (both pinned red-then-green).
- **NFR3 — Browser-less hosts complete.** Completion never blocks on a missing browser; the outcome is recorded as needing review.
- **NFR4 — Bundled-asset discipline.** One `metadata.version` bump per changed skill, the lockstep public-package bump, and the skill, smoke, lint, and format tiers green; the advanced kit's core-version parity smoke test keeps passing.
- **NFR5 — Necessity.** Every persisted artifact this project adds names its consumer (an agent acting on a named instruction, a human reading a named surface, or code at a named call site); no record is written for a deferred reader, and no record duplicates one an existing consumer already reads.

## Constraints

- The archive command's manifest-key validation is not modified; its package-coverage rule, the loader that reads it, and the recap fixture tests change in the same phase as the record script, with no legacy branch.
- A missing or too-old Explainer Kit core is a hard prerequisite failure (`failed`, with the install command as the cause), never a silent skip.
- Bundled skills stay provider-neutral; the host-browser rung is detected at run time, never configured.
- Fact bundles contain nothing outside the project or program record.

## Dependencies

- Explainer Kit core ≥ 2.1.0 (installed at user scope) for the fact-base schema, cohesion checker, HTML checks, PNG inspection, and browser probe; the tracked-run finalizer (`finalize-tracked-run.mjs`) as a read-only producer of `built-durable`.
- `BL-260907-replace-the-default-project` (source item); `BL-260902-make-autonomous-project-recap` (shipped; superseded at the same seams) and `BL-260904-add-recap-seam-config-keys` (`wont_do`) need no further reconciliation.
- The wave-7 close's archived wrapper records and exported summaries under `.oat/repo/reference/project-summaries/` for FR9.

## High-Level Design (Proposed)

The OAT explainer adapter skill gains a `generate` flow made of three small scripts (bundle, verify, record) around one authoring step performed by the host agent, with the browser ladder resolved at run time; the four lifecycle consumers call that flow. Details in `design.md`.

## Success Metrics

- The program recap for the execution program exists, passes the browser-free checks, and its manifest is accepted by the archive validator's parser.
- Zero references to the seam probe or the five seams remain in lifecycle skills.
- The fresh-host test and its negative controls pass with `Cached: 0`.

## Requirement Index

| ID   | Summary                                    | Source                                |
| ---- | ------------------------------------------ | ------------------------------------- |
| FR1  | Allowlisted fact bundle, hashed            | Discovery decisions 1–2; item AC 2    |
| FR2  | Agent-authored single artifact             | Item AC 2; recipe required narratives |
| FR3  | Browser ladder with retained evidence      | Discovery Q1; item AC 3               |
| FR4  | Browser-free checks always run             | Triage amendment (browser-less hosts) |
| FR5  | Manifest kept; outcome semantics rewritten | Discovery Q2; triage amendment        |
| FR6  | Generate / retry / skip                    | Item AC 4                             |
| FR7  | One flow, two recipes                      | Discovery Option A; triage amendment  |
| FR8  | Lifecycle consumers updated                | Triage amendment (migration scope)    |
| FR9  | Program recap ships                        | Operator decision 2026-09-09          |
| NFR1 | Fresh-host proof with negative controls    | Item AC 5                             |
| NFR2 | Weaker-anywhere                            | Repository convention                 |
| NFR3 | Browser-less hosts complete                | Operator decision 2026-09-08          |
| NFR4 | Bundled-asset discipline                   | `AGENTS.md`                           |
| NFR5 | Necessity (no duplicate records)           | Operator decision 2026-09-09          |

## Open Questions

- None carried to design; the discovery open questions are answered in `design.md`.

## Assumptions

- The kit's fact-base schema and cohesion checker are usable as libraries without the set planner (verified: `checkArtifactCohesion` and the schema are standalone exports).
- CLI-side couplings are exactly: the archive package-coverage rule and its tests (changed by design), and the review-skill contract tests that pin the recap-gate prose of `oat-project-complete` and `oat-project-autonomous` (updated with the prose).

## Risks

- Prose quality without a critic seam — mitigated by the subject-bound claim check and the required-section check.
- Host-browser detection is new — mitigated by proving the browser-free path first.
- Outcome-vocabulary drift across four consumers — mitigated by one shared contract test.

## References

- `.oat/repo/pjm/backlog/items/BL-260907-replace-the-default-project.md`
- `discovery.md`
