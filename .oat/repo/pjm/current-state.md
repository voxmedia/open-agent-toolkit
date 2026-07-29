# OAT Current State

This file is the active operating picture and lives under `pjm/` (the
operational layer), not `reference/`. To reduce cross-worktree conflicts, keep
edits append-mostly and scoped to the section you own; avoid rewriting whole
sections another branch may also touch.

## Canonical References

<!-- List durable repo references, source-of-truth docs, dashboards, or processes here.
Decisions live in reference/decisions/ (one file per record); link them rather than
copying their content here. -->

- [Workflow Gates](../../../apps/oat-docs/docs/cli-utilities/workflow-gates.md)
  defines gate invocation provenance, declared-project corroboration, and the
  mandatory configured implementation exit-gate closeout boundary.
- [Project Reviews](../../../apps/oat-docs/docs/workflows/projects/reviews.md)
  defines phase review gates and producer aggregation behavior.
- [Dispatch Policy](../../../apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md)
  defines candidate ladders, named ceilings, and exact task dispatch.
- [Orchestration Model](../../../apps/oat-docs/docs/workflows/projects/orchestration-model.md)
  defines root-owned phase implementation, independent review, and optional
  isolated nesting.
- [Smoke Testing](../../../apps/oat-docs/docs/contributing/smoke-testing.md)
  defines deterministic verification and opt-in live-provider operator runs.
- [Project Log](../../../apps/oat-docs/docs/cli-utilities/project-log.md)
  defines append-only project observations, validated CLI mutations, and
  roll-up-before-archive behavior.

## What's Implemented

<!-- Summarize shipped capabilities and important repo conventions here. -->

- CLI `0.2.20` narrows lifecycle and gate re-reviews by default from a
  lineage-qualified prior reviewed head; `false` is the explicit full-scope
  opt-out. Review artifacts and the tracked Reviews ledger preserve validated
  full-SHA provenance across archival, clones, and worktrees. Missing,
  conflicting, non-existent, or non-ancestor provenance fails open to full
  scope, and every re-review reports its resolved range plus
  empty/bookkeeping-only/substantive classification without using that
  classification to skip review.
- CLI `0.2.15` separates repository installation state from effective runtime
  availability: shared `.oat/config.json#tools` now reconciles only
  project-scoped canonical assets across install, update, and remove, while
  `oat tools has <pack>` reports current project-plus-user availability for
  workflow routing. Provider sync also validates destination ancestry during
  planning, whole-plan preflight, and immediately before each mutation,
  refusing symlinked or non-directory parents without changing canonical
  content, external targets, or manifest ownership.
- CLI `0.2.14` splits portable model-selection guidance from dispatch
  mechanics. The user-invocable `subagent-orchestration` skill owns five task
  classes, provider-specific dated selection matrices, evidence refresh, and
  Opus-first Claude routing; internal `oat-dispatch-subagents` owns live-catalog
  intersection, authorized launch routes, liveness, recovery, and additive
  dispatch records. Utility subset installation is directional: selecting
  dispatch includes guidance, while guidance remains independently installable.
  Active lifecycle consumers load principles, one provider selection reference,
  and matching mechanics in order.
- CLI `0.2.10` ships the public Explainer Kit family: a config-blind
  `explainer-kit` core and OAT lifecycle adapter with versioned fact-base,
  author, theme, manifest, durability, archive, and publish contracts. Four
  curated styles replace the palette/profile matrix as the default front door;
  unattended runs require one provider-neutral author seam; complete immutable
  byte coverage supports safe recap export. A packaged Stoa Wave 6 recap,
  private-wrapper migration, live S3/CDN smoke, cross-machine visual gate, and
  zero-finding final review all passed.
- CLI `0.2.4` enables task-class-aware reviewer-local reconnaissance for broad
  reviews. Read-only, non-recursive evidence lanes keep `recon` authority while
  independent model-class floors distinguish deterministic checks from
  silent-miss-prone interpretation and stronger bounded analysis. The primary
  reviewer retains source validation, synthesis, severity, validation
  decisions, and final findings; unsatisfied floors preserve the same review
  coverage inline without downgrading. Review artifacts carry compact
  orchestration evidence, while root project workflows own the single
  structural `project-log.md` reference.
- CLI `0.2.3` makes the configured `oat-project-implement` exit gate an
  independent, resumable closeout boundary after final verification and
  lifecycle review but before approval-aware sequencing, final HiLL,
  completion, or success output. Durable launch/receive provenance,
  implementation-basis freshness, explicit no-gate and policy dispositions,
  and fail-closed reconciliation prevent missing, ambiguous, stale, or manual
  review evidence from satisfying the boundary. JSON-mode gate child output is
  routed to stderr so stdout remains exactly one structured result envelope.
- Wave-orchestration skills promoted from stoa (PR #158, release `0.2.0`):
  `oat-wave-execute` 1.5.0 and `oat-wave-program` 1.1.0 in the workflow pack
  with genericized rule text and bundled assets, a mini-wave validation
  fixture, and a W6 handoff runbook. Fresh installs now preserve nested
  skill-script execute bits (`copyDirectory` mode fix), and
  `oat project validate-plan` documents the singleton-group rule with the
  ungrouped-phase alternative. Stoa Wave 6 completed on the packaged skills
  and supplied the first-consumer recap/archive acceptance for the promoted
  Explainer Kit revision.
- CLI `0.1.76` makes Cursor skills native-read from project and user
  `.agents/skills` roots while retaining `.cursor/skills` as an explicit
  Cursor-only extension and migration surface. Interactive `init` and `status`
  require an adopt-or-keep decision per local skill, keep-local choices persist
  in scope-owned sync config, legacy user `knownStrays` migrate safely to
  `~/.oat/sync/config.json`, and obsolete managed views are removed only when
  verified clean.
- CLI `0.1.73` adds an optional append-only `project-log.md` with
  create-on-first-append behavior, explicit scaffold controls, validated
  append/check/synthesize/rollup commands, and automatic structural entries at
  implementation, gate-review, and completion boundaries. Project summary
  roll-up preserves every observation, promotes reusable judgments through new
  referencing `general` entries, and blocks archive when a populated log cannot
  reach durable summary and ledger surfaces.
- CLI `0.1.72` hardens headless gate execution with scope/target-aware timeout
  precedence, immutable runtime/model route inputs, checkout-local executable
  routing, strict route receipts, and current-child provider/model provenance.
  Gate liveness and terminal envelopes now distinguish process state,
  stdout/stderr idleness, and bounded provider transcript activity evidence.
  Deterministic subprocess coverage and real Claude/Cursor lanes verify
  completion safety without weakening fail-closed artifact correlation.
- CLI `0.1.66` preserves append-ordered, artifact-identified review events
  across local and remote lifecycle flows, routes from the latest matching
  event, and documents mutually exclusive preferred versus exact-candidate
  resolver selection. Cross-runtime phase-gate prompts distinguish additional
  gate reviews from built-in reviews, and project completion supports both
  pre-merge and post-merge ordering.
- Gate timeout handling re-scans for a unique run-correlated review artifact
  before failing. Recovered ordinary envelopes add `lateCompletion`, while
  unrecovered timeouts report `noOutputProduced`; existing status, handoff,
  threshold, attempt-accounting, and target-selection semantics remain intact.
- The CLI passively reports newer stable npm releases during eligible ordinary
  commands. Before `init`, `tools install`, or `tools update` mutates bundled
  tools, a known newer CLI triggers a default-no freshness guard explaining
  that the running CLI can only install its older bundled versions. Acceptance
  updates the exact CLI version and requires a shell-aware rerun. Daily
  best-effort checks and three-day same-version notice cadence are cached under
  `~/.oat`; automation and opted-out invocations remain silent.
- CLI `0.1.65` hardens project scaffolding against unresolved OAT placeholders,
  permits non-TDD plan task bodies when lifecycle invariants remain intact, and
  improves operational workflows: targetless tool updates suggest the explicit
  all-tools command, closed backlog items require real outcomes, decision
  creation accepts every substantive section, `oat backlog new` owns atomic
  item creation, project doctor detects known-stale command grammar, and
  noninteractive gate targets start with closed stdin.
- Gate reviews now declare and corroborate their project, bind an immutable
  configured invocation record to the review artifact, and fail closed on
  correlation or provenance mismatch.
- Final and contiguous-range reviews aggregate in-scope producer provenance
  without treating one latest stamp as the aggregate identity.
- Plan, quick-start, import-plan, and spec-driven plan paths can offer opt-in,
  non-pausing phase review gates when a qualifying target is available.
- Managed dispatch uses ordered provider candidate ladders with project/phase
  named maximum ceilings; Codex variants materialize by configuration ownership,
  while Claude and Cursor receive exact selected model values at invocation.
- Root-owned phase-agent execution is the default: one phase implementer owns
  direct sequential task execution, while the root independently owns review
  and bounded fix routing. Codex depth 1 is sufficient for this topology; depth
  2 is required only when optional nested work is selected.
- Exact native Codex `agent_type` dispatch is primary for phase implementers,
  reviewers, and optional workers. Launcher-owned configured invocation remains
  separate from runtime producer identity, and pinned fallback is allowed only
  after explicit pre-start role-selection rejection.
- Dispatch matrix normalization and provenance-rich traversal are shared across
  layered configuration, sparse project state, config adoption, and doctor.
- Dispatch Report V1 provides deterministic machine and human output while
  keeping policy, ceiling, requested candidate, exact selection, configured
  gate invocation, and observed runtime identity distinct. The legacy
  `Dispatch:` line is derived from that report.
- Config adoption and doctor share pass-scoped Cursor validation: each distinct
  candidate receives one Task probe and broad catalog retrieval is memoized for
  the command pass without treating catalog presence as eligibility evidence.
- Artifact writers now share a self-contained hygiene contract: planning embeds
  a repository-documented, file-scoped write/fix command when available, while
  runtime roles, lifecycle skills, and gate-review prompts use bounded fallback
  discovery and warn once without failing when no command can be found.
- Plan authoring now checks merged effective dispatch ladders before offering
  adoption and treats project ceiling selection as a separate decision; an
  unresolved project matrix no longer implies that ladder configuration is
  missing.
- Cursor GPT-5.6 verification now has a strict structured evidence schema,
  exact Task correlation, control-gated candidate execution, and private-only
  raw identifiers. The current headless client exposed no Task events, so the
  controls were inconclusive and the configured recommendation remains
  explicitly unvalidated.
- Reusable OAT subagent dispatch is split into a provider-neutral utility
  engine and a project lifecycle adapter. The engine owns capability,
  authorization, catalog, route/model/effort selection, launch evidence, and
  recovery; the adapter adds project, phase/task, gate, write-boundary,
  commit, and worktree semantics without duplicating provider mechanics.
- The live workflow smoke surface provides a disposable three-phase fixture,
  deterministic and authenticated runner paths, failure-preserving evidence,
  canonical report assertions, and safe cleanup. The retained Codex
  implementation packet passes 10/10 assertions; normal root verification
  includes direct smoke lint, formatting, and 123 tests.
- `oat-repo-improve` now owns external-plan generation across repo audits,
  maintainability reviews, backlog reviews, backlog directories, and individual
  backlog items. It composes broad reconnaissance with the reusable dispatch
  engine, writes only durable external plans, maintains backlog reverse links,
  and leaves OAT project import optional.

## What's Next

<!-- Track near-term follow-up work, known gaps, and active handoff context here.
Track concrete items in pjm/backlog/ and sequencing in pjm/roadmap.md; keep this
section to a short narrative pointer. -->

Run the documented post-ship Claude, Cursor IDE, Cursor CLI, cross-harness, and
interactive smoke matrix when operator capacity allows. Active backlog work
also covers adaptive idle-kill and early-artifact semantics beyond the shipped
gate liveness evidence, a per-project external-gate override,
trimming the largest implementation reference, rechecking Cursor GPT-5.6
eligibility by 2026-08-08, optional root-owned exact dispatch, root-agent
judgment logging for project observations, and avoiding redundant
bookkeeping-only re-reviews. `BL-260719-add-pinned-recon-agents` tracks a
reusable pinned recon-role contract for review and non-review orchestration if
observed value justifies the additional provider role matrix.
