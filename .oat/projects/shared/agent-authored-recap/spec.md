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
- A person invokes the core skill on any inputs (an OAT project, a directory or list of documents, or a supplied fact base) on a fresh host and gets one verified page, and the plan skill's project explainer produces a run through the same flow.

### Secondary Goals

- The duplicated program-close caller in the two wave skills collapses onto the one flow.
- The callback-driven orchestration is retired from both the core and the adapter, and nothing in the repository references it afterwards.

## Non-Goals

- Provider-module seams of any kind on any path, and any replacement for the retired durability/S3-publish path (amended 2026-09-09: the callback orchestration and the durability/publish path are retired, not kept; the archive export is the durable copy).
- A new CLI command for recap generation (deferred idea; skill scripts only).
- Publishing recaps to S3 or any external surface.
- Changing the fact-base schema. (The manifest moves to `explainer-kit.manifest/v2` under the 2026-09-09 amendment; the keys the retired durability path needed are dropped, nothing else changes.)
- The recon rework, which runs as its own project.

## Requirements

### Functional Requirements

- **FR1 — Allowlisted fact bundle.** The flow assembles a fact base only from approved artifacts of the project (summary, implementation record, project log, orchestration log, plan, discovery, spec, design where present) or, for a program recap, the reconciled execution-program artifact plus every wave's summary and completion record. The bundle conforms to `explainer-kit.fact-base/v1` (canonical JSON, derived Markdown) and records input hashes so an unchanged input set is detected as fresh and never re-authored.
- **FR2 — Agent-authored single artifact.** The host agent authors one standalone HTML page from the bundle, carrying the recipe's required narrative sections: for a project, original request, key agent decisions, as-built architecture, implementation record, validation evidence, outcome; for a program, program overview, wave map, per-wave outcomes, convention evolution, aggregate numbers, follow-up ledger. No custom author, critic, or visual-critic module is required.
- **FR3 — Browser ladder.** Visual verification uses the first available rung: the host agent's own browser capability (capture and inspect; a screenshot alone is not verification), then the kit's bundled Playwright probe (its layout findings are the verdict), then browser-free checks. The rung used, the artifact path, and the screenshot paths (narrow, medium, wide) are retained in a small result record.
- **FR4 — Browser-free checks always run.** Regardless of rung: the page parses, every required section is present, and every number, date, and status the page states traces to the fact bundle by subject and value (token membership is not sufficient; narrative wording is the author's responsibility under the brief, not a machine check).
- **FR5 — Manifest v2; package rule replaced.** The run writes an `explainer-kit.manifest/v2` manifest (the v1 keys minus the retired durability fields, plus `mode`; recipe id and the outcome enum `built`, `built-needs-review`, `failed`, `incomplete`), and the archive command's package rule is replaced (no backward compatibility) so that exactly the new small run package is required and nothing else; the archive validator pins v2 and rejects every other `schemaVersion`; the terminal-outcome guard is rewritten so `generate` is satisfied only by `built` or `built-needs-review`.
- **FR6 — Generate, retry, or skip.** A `generate` decision is satisfied only by a usable artifact. On failure the flow preserves a sanitized actionable cause and requires an explicit retry or an explicit skip; the decision is persisted so a resumed completion honors it and never re-prompts or re-authors silently. An authored artifact is never discarded.
- **FR7 — One flow, two recipes.** Project and program recaps share one generate flow selected by recipe; the program-close callers in `oat-wave-program` and `oat-wave-execute` reference it instead of duplicating it.
- **FR8 — Lifecycle consumers route on the new semantics.** `oat-project-complete`'s recap gate and export path, `oat-project-summary`'s outcome mapping, and the two wave skills read the result record and outcome vocabulary; no lifecycle skill references a retired seam or the capability probe.
- **FR9 — The program recap ships.** The last phase generates the recap for the 2026-08-31 execution program from the reconciled program artifact and the seven wave records, and records the run identity and outcome in the program ledger.
- **FR10 — Any-input invocation.** A person invoking the core `explainer-kit` skill supplies an OAT project directory, a directory or list of documents, or a fact base, chooses the recipe and the output root, and gets the same flow: fact bundle, agent authoring against the recipe's brief, browser-free checks, the browser ladder, and the run package. Interactive invocation confirms scope and shows the fact base before authoring; unattended lifecycle invocation never prompts.
- **FR11 — Project explainer at plan approval.** `oat-project-plan`'s project-explainer step runs the flow with the `project-explainer` recipe over the approved plan artifacts when the persisted `oat_project_explainer` decision is `generate`; the intent record and its resolver are unchanged, the outcome and run path are reported, and an explainer failure never rolls back the committed plan.
- **FR12 — Seam retirement.** The core's callback orchestration and provider seams, the adapter's callback path and seam probe, their contracts, references, docs, and the tests that exercise only them are removed; the retained libraries, the durability/publish path, and their tests stay green; no file in the repository references a retired module, symbol, or contract.

### Non-Functional Requirements

- **NFR1 — Fresh-host proof.** A test exercises successful generation on a fresh host with no custom modules and no browser, and reproduction-grade negative controls for authoring failure and browser failure, proving each failure stays visible while an accepted control still produces the recap.
- **NFR2 — Weaker-anywhere, enumerated.** Nothing the archive validator or the terminal-outcome guard rejects today becomes accepted except the acceptance changes `design.md` § Migration Plan enumerates, which is the one authoritative list (today: the v2 package accepted; the v1 shape and every other `schemaVersion` rejected; `skip/failed_attempt` accepted only with a failed or incomplete manifest; the retired package files and evidence chains no longer required; `built` replacing the two durability outcomes), each pinned by its own red-then-green negative control.
- **NFR3 — Browser-less hosts complete.** Completion never blocks on a missing browser; the outcome is recorded as needing review.
- **NFR4 — Bundled-asset discipline.** One `metadata.version` bump per changed skill, the lockstep public-package bump, and the skill, smoke, lint, and format tiers green; the advanced kit's core-version parity smoke test keeps passing.
- **NFR5 — Necessity.** Every persisted artifact this project adds names its consumer (an agent acting on a named instruction, a human reading a named surface, or code at a named call site); no record is written for a deferred reader, and no record duplicates one an existing consumer already reads.

## Constraints

- The archive command's manifest-key validation is not modified; its package-coverage rule, the loader that reads it, and the recap fixture tests change in the same phase as the record script, with no legacy branch.
- A missing or too-old Explainer Kit core is a hard prerequisite failure (`failed`, with the install command as the cause), never a silent skip.
- Bundled skills stay provider-neutral; the host-browser rung is detected at run time, never configured.
- Fact bundles contain nothing outside the project or program record.

## Dependencies

- The archive command's export under `.oat/repo/reference/` (the durable copy of a recap; `finalize-tracked-run.mjs` and `built-durable` are retired).
- `BL-260907-replace-the-default-project` (source item); `BL-260902-make-autonomous-project-recap` (shipped; superseded at the same seams) and `BL-260904-add-recap-seam-config-keys` (`wont_do`) need no further reconciliation.
- The wave-7 close's archived wrapper records and exported summaries under `.oat/repo/reference/project-summaries/` for FR9.

## High-Level Design (Proposed)

The OAT explainer adapter skill gains a `generate` flow made of three small scripts (bundle, verify, record) around one authoring step performed by the host agent, with the browser ladder resolved at run time; the four lifecycle consumers call that flow. Details in `design.md`.

## Success Metrics

- The program recap for the execution program exists, passes the browser-free checks, and its manifest is accepted by the archive validator's parser.
- Zero references to the seam probe or the five seams remain in lifecycle skills.
- The fresh-host test and its negative controls pass with `Cached: 0`.
- A person runs the core skill on a directory of documents on a fresh host and gets one verified page; the project explainer produces a run through the flow.
- Zero references to the retired seams, contracts, or modules remain in the repository (code, tests, skills, docs).

## Requirement Index

| ID                 | Summary                                  | Source                                | Planned Tasks                                                                                                                                                                      |
| ------------------ | ---------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1                | Allowlisted fact bundle, hashed          | Discovery decisions 1–2; item AC 2    | p01-t05, p01-t14                                                                                                                                                                   |
| FR2                | Agent-authored single artifact           | Item AC 2; recipe required narratives | p01-t07, p02-t03                                                                                                                                                                   |
| FR3                | Browser ladder with retained evidence    | Discovery Q1; item AC 3               | p02-t01, p02-t02                                                                                                                                                                   |
| FR4                | Browser-free checks always run           | Triage amendment (browser-less hosts) | p01-t05, p01-t07                                                                                                                                                                   |
| FR5                | Manifest v2; outcome semantics rewritten | Discovery Q2; triage amendment        | p01-t04, p01-t08, p01-t06, p01-t10                                                                                                                                                 |
| FR6                | Generate / retry / skip                  | Item AC 4                             | p01-t10, p03-t02, p03-t03                                                                                                                                                          |
| FR7                | One flow, two recipes                    | Discovery Option A; triage amendment  | p03-t01, p03-t04                                                                                                                                                                   |
| FR8                | Lifecycle consumers updated              | Triage amendment (migration scope)    | p03-t01, p03-t02, p03-t03, p03-t04, p03-t05                                                                                                                                        |
| FR9                | Program recap ships                      | Operator decision 2026-09-09          | p05-t01                                                                                                                                                                            |
| \1p01-t05, p04-t01 |
| FR11               | Project explainer at plan approval       | Discovery amendment 2026-09-09        | p03-t04, p04-t02                                                                                                                                                                   |
| FR12               | Seam retirement                          | Discovery amendment 2026-09-09        | p01-t11, p01-t12, p01-t01, p01-t02, p01-t03, p01-t04, p01-t13, p01-t14, p01-t08, p01-t15, p01-t16, p01-t17, p03-t01, p03-t02, p03-t03, p03-t04, p03-t05, p03-t06, p03-t07, p03-t08 |
| NFR1               | Fresh-host proof with negative controls  | Item AC 5                             | p02-t04                                                                                                                                                                            |
| NFR2               | Weaker-anywhere                          | Repository convention                 | p01-t04, p01-t08, p01-t10                                                                                                                                                          |
| NFR3               | Browser-less hosts complete              | Operator decision 2026-09-08          | p01-t07, p02-t02                                                                                                                                                                   |
| NFR4               | Bundled-asset discipline                 | `AGENTS.md`                           | p01-t17, p03-t05, p03-t08                                                                                                                                                          |
| NFR5               | Necessity (no duplicate records)         | Operator decision 2026-09-09          | p01-t06, p04-t01                                                                                                                                                                   |

## Open Questions

- None carried to design; the discovery open questions are answered in `design.md`.

## Assumptions

- The kit's fact-base schema and cohesion checker are usable as libraries without the set planner (verified: `checkArtifactCohesion` and the schema are standalone exports).
- CLI-side couplings are exactly: the archive package-coverage rule, its loaders of core modules, and its tests (changed by design), the review-skill contract tests that pin the recap-gate prose of `oat-project-complete` and `oat-project-autonomous` (updated with the prose), and the autonomy gate-inventory prompt-site table (recomputed with the prose).

## Risks

- Prose quality without a critic seam — mitigated by the subject-bound claim check and the required-section check.
- Host-browser detection is new — mitigated by proving the browser-free path first.
- Outcome-vocabulary drift across four consumers — mitigated by one shared contract test.

## References

- `.oat/repo/pjm/backlog/items/BL-260907-replace-the-default-project.md`
- `discovery.md`
