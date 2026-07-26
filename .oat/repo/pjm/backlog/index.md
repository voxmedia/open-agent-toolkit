# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- Provider-sync follow-up: the config-bug project now fails closed on symlinked
  provider ancestry; `BL-260724-support-provider-directory` tracks safe,
  manifest-aware adoption when a provider collection directory aliases its
  exact canonical OAT collection.
- Model-selection guidance and dispatch mechanics are now separate shipped
  contracts. `subagent-orchestration` owns durable task classes, dated provider
  selection references, and refresh policy; `oat-dispatch-subagents` owns
  launch controls and records. Directional utility installation keeps dispatch
  dependent on guidance without preventing guidance-only use. The previously
  open legacy-record compatibility concern was resolved with explicit baseline
  and enriched Record fixtures.
- Final-gate freshness is split into an incremental path: first ship the
  high-priority narrow optimization that preserves a gate across unchanged-delta
  base updates (`BL-260719-avoid-final-gate-reruns`), then evaluate the
  lower-priority broader policy only if usage evidence shows CI, Bugbot, and
  lifecycle self-review leave meaningful gaps
  (`BL-260719-evaluate-broader-final-gate`).
- Workflow-integrity (high, evidence-backed 2026-07-18): lifecycle text that
  names another skill as an execution step needs a mandatory-load clause —
  the wave-skills-promotion closeout showed "dispatch X" degrading to
  outcome-from-memory, silently skipping newer skill steps
  (`BL-260718-mandatory-skill-load-clause` — Mandatory skill-load clause for
  lifecycle steps that name skills).
- Upstream wave-program feedback now tracks generated-runbook command
  validation, sync producer-version warnings, and the remaining full-surface
  gate budget/recursive-dispatch hazards. Current main already fixes sync
  `--scope` placement drift through local option parsing plus doctor detection,
  and clearly rejects resolver calls that combine exact-candidate flags with
  `--preferred`.
- Generated-artifact gate hygiene shipped the narrow fix: project-log writes
  moved out of child-owned worktree windows, every append site got a commit
  owner (including `oat gate review`), and project-start preflights auto-commit
  a manifest-only dirty tree. General sync-ownership classification was
  designed, reviewed three times, and cut — `BL-260725-classify-general-sync-owned`
  (Classify general sync-owned dirt in project-start preflight) is parked at low
  priority and carries the design traps, since prompting is the correct answer
  for every case the classifier existed to handle.
- Wave-workflow follow-ups now track the grouped CLI-family and stable-artifact
  contract work, a tested TypeScript bootstrap-group rewrite, and removal of
  the temporary reviews-row watch after one more clean W6 gate. The proposed
  tracked-config guard is archived as `wont_do`: dependency hygiene in the
  consuming repo addresses the stale-local-CLI root cause.
- CLI update awareness is shipped at `0.1.62`: eligible ordinary commands use
  passive cached npm `latest` metadata, while `init`, `tools install`, and
  `tools update` guard against installing older bundled tool versions from an
  outdated CLI. Automation-safe suppression and a persistent user opt-out keep
  non-human workflows silent.
- Project log (feedback-driven): v1 has shipped the `oat project log` append,
  check, synthesize, and roll-up helpers plus core structural appends.
  `BL-260713-root-agent-judgment-logging` remains the planned fast-follow:
  root-agent role guidance takes over judgment-entry logging while subagents
  report observations to the root.
- Build reliability: concurrent CLI invocations race on in-place `packages/cli/assets` regeneration (five incidents on 2026-07-12, including one silent bundle corruption). `BL-260712-serialize-cli-asset-bundling` — Serialize CLI asset bundling with atomic staging — tracks atomic staging plus a portable lock; increasingly urgent as multi-agent workflows make concurrent invocations in one worktree routine.
- Gate review provenance, declared project corroboration, final/range producer aggregation, and opt-in phase review setup are complete. Their current user-facing contracts live in the workflow-gate, project-review, and project-artifact documentation.
- Review lifecycle bookkeeping now preserves distinct append-ordered events,
  advances them monotonically by artifact identity, and routes from the latest
  matching event. Resolver selection guidance separates preferred and
  exact-candidate branches, and gate timeout envelopes expose additive
  late-completion and zero-output diagnostics.
- Dispatch matrix normalization consolidation, pass-scoped Cursor catalog caching, and the Dispatch Report V1 schema/formatter are shipped.
- The live workflow smoke fixture is complete: deterministic root verification, an opt-in authenticated runner, root-owned phase-agent topology, safe recovery/cleanup, public runbooks, and a canonical Codex packet passing 10/10 assertions.
- Reusable dispatch contracts are split between a provider-neutral utility engine and a project lifecycle adapter. Analytical callers can use bounded reconnaissance without importing project phase/task/gate policy; a separate root-owned exact-launch broker remains optional backlog work for specialized nesting.
- Reusable pinned reconnaissance is now tracked in
  `BL-260719-add-pinned-recon-agents`: define read-only, non-recursive recon
  roles that `oat-dispatch-subagents` can select by task-class floor for review
  and non-review orchestration without recursively reusing full reviewers.
- GPT-5.6 live Task/subagent slug eligibility remains an active recheck: structured controls exposed no Task events, so the current Cursor candidates remain configured but unvalidated. Re-run after a qualifying client rollout or Cursor support evidence, with a 2026-08-08 review-by date.
- Bounded `oat-reviewer` reconnaissance is shipped: broad reviews can use
  cheaper/faster, read-only evidence lanes while the primary reviewer retains
  source validation, synthesis, severity, and final findings.
- The `codex-family-subagents` dispatch UX split is complete: human-facing guidance and the reusable Dispatch Report V1 schema/formatter shipped through `dispatch-schema-matrix-infrastructure`.
- Structured post-implementation sequencing is shipped, allowing summary, documentation, and PR preparation to run before or after final approval according to configuration.
- High-priority gate reliability has shipped scope-aware hard budgets,
  transcript liveness evidence, and correlated timeout recovery; the remaining
  activity-aware backlog scope is adaptive idle-kill, early artifact-template
  creation, and distinct idle-kill versus hard-cap outcomes. Medium-priority
  workflow maintenance tracks project-scoped gate overrides.
- High-priority review-efficiency work now tracks skipping redundant reviewer dispatches after narrowly classified, deterministically validated bookkeeping-only fixes in both direct/subagent and gate-originated review flows.

<!-- OAT BACKLOG-INDEX -->

| ID                                       | Title                                                                  | Status | Priority | Scope   | Estimate |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                       | open   | high     | feature | M        |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                              | open   | high     | feature | L        |
| BL-260720-add-oat-project-complete-auto  | Add oat-project-complete-auto companion skill for autonomous closeouts | open   | high     | task    | M        |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches         | open   | high     | feature | M        |
| BL-260718-harden-full-surface-gate       | Harden full-surface gate reviews against budget and recursive dispatch | open   | high     | feature | M        |
| BL-260718-mandatory-skill-load-clause    | Mandatory skill-load clause for lifecycle steps that name skills       | open   | high     | task    | S        |
| BL-260712-serialize-cli-asset-bundling   | Serialize CLI asset bundling with atomic staging                       | open   | high     | task    | S        |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                    | open   | high     | feature | M        |
| BL-260718-warn-when-oat-sync-uses        | Warn when oat sync uses a different producing CLI version              | open   | high     | feature | S        |
| BL-260718-add-generated-runbook          | Add generated-runbook verification command pass                        | open   | medium   | feature | M        |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                     | open   | medium   | feature | M        |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract             | open   | medium   | feature | M        |
| BL-260714-executable-backstops           | Executable backstops for contract claims — authoring guidance          | open   | medium   | task    | S        |
| BL-260718-fix-oat-docs-generate-index    | Fix oat docs generate-index cwd-relative defaults in monorepos         | open   | medium   | task    |          |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs      | open   | medium   | feature | L        |
| BL-260712-per-project-override           | Per-project override to disable configured external gates              | open   | medium   | feature | M        |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command          | open   | medium   | feature | M        |
| BL-260713-root-agent-judgment-logging    | Root-agent judgment logging responsibility for project log             | open   | medium   | feature | S        |
| BL-260718-support-fumadocs-in-oat-docs   | Support Fumadocs in oat docs nav sync (currently MkDocs-only)          | open   | medium   | task    |          |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync            | open   | medium   | feature | M        |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                          | open   | medium   | task    | S        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                             | open   | medium   | task    | S        |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight            | open   | low      | task    | M        |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization | open   | low      | feature | M        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
