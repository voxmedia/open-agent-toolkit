# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- Portable references now have a second chapter. The
  `portable-agent-references` project (successor to
  `BL-260827-make-packaged-skill-references`) generalized the ratchet across the
  whole user-default skill _and_ agent surface and drained live debt to zero,
  but its final review surfaced one direction it does not cover:
  `BL-260829-unified-agent-provider-root`. Skills reading canonical agent
  definitions still use bare `.agents/agents/<name>.md` paths, which the ratchet
  cannot see at all. Deferral was judged acceptable — nothing breaks while
  `.agents/agents/` exists at project scope — but the failure is silent, fires
  only after a dispatch rejection, and nothing prevents new instances. It
  carries real design questions (loaded-tier eligibility, and whether a shared
  root regresses independent per-dependency binding), so it is sized L and
  wants a design pass rather than a patch.
- The first of three user-scope tool-pack closeout follow-ups is closed:
  `BL-260827-make-packaged-skill-references` delivered portable cross-skill
  links and their ratchet in PR #226. The two remaining bounded features stay
  separate: `BL-260827-correct-scope-and-adoption` owns PJM adoption and
  diagnostic correctness edges, while `BL-260827-clean-up-tool-pack-lifecycle`
  owns lifecycle/config consistency findings.
- User-scope tool distribution is now a high-priority cross-pack initiative:
  `BL-260818-make-the-project-management` covers every tool pack, including
  `project-management`, while keeping PJM operational data repo-owned. The
  immediate path uses the regular OAT CLI and direct-install lifecycle to reduce
  repeated installation and checked-in tool-copy update churn; native plugin
  packaging is deferred.
- Provider transcript corroboration (2026-08-26) is tracked in
  `BL-260826-populate-native-subagent`, linked to GitHub issue #211. Codex and
  Claude can populate the existing optional runtime-observation layer from
  sanitized metadata, while Cursor remains `not-reported`; this work does not
  replace materialized roles or any pre-launch dispatch control.
- GitHub issue triage (2026-08-19) added three high-priority lifecycle
  reliability records: `BL-260820-bind-each-gate-review` (Bind each gate review
  disposition to its exact received ledger event) from #194,
  `BL-260820-track-pr-closeout-evidence` (Track PR-closeout evidence freshness
  against the current head) from #201, and
  `BL-260820-emit-source-qualified` (Emit source-qualified provenance envelopes
  for review and gate receipts) from #202. The same pass linked #197 to the
  existing activity-aware timeout record and #200 to the existing bounded
  review-cycle override record; those two items predate this session.
- Skills-corpus verification (2026-08-18) resolved eight reported leads into
  three medium-priority workstreams: `BL-260819-repair-verified-bundled-skill`
  (Repair verified bundled skill contract drift) groups four confirmed bundled
  skill inconsistencies into one release-shaped fix;
  `BL-260819-refresh-codex-skill-model` (Refresh codex-skill model routing and
  repository-check policy) corrects repo-only Codex guidance; and
  `BL-260819-classify-canonical-skills-by` (Classify canonical skills by
  distribution, lifecycle, and tenant scope) prevents canonical-directory
  counts from being mistaken for the public bundle. The audit refuted the
  reported MIT/shadcn provenance concern, so no licensing item was added.
- Explainer publication hardening (explainer-improvements-v2, CLI `0.2.31`
  pending merge) closed a credential-bearing publication-root bypass with
  version-agnostic gates and made protected-mode publication durably
  verifiable; the six `BL-260817-*` items carry its deliberate residue (v1
  removal, authenticated protected-mode verification, CI browser and
  version-drift decisions, reader-side assets override).
  `BL-260712-serialize-cli-asset-bundling` closed: bundling now publishes by
  atomic staged rename.
- Project retrospectives now ship in CLI `0.2.30` as a post-approval-only
  lifecycle capability. The retro artifact separates repo-local promotions
  from upstream feedback in machine-scannable registers; generation, apply,
  and filing remain consent-aware through interactive gates or explicit
  `workflow.retro` configuration.
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
- Build reliability: the 2026-07-12 concurrent-bundling race class (five incidents, one silent bundle corruption) is closed — `BL-260712-serialize-cli-asset-bundling` shipped atomic staged-rename publishing in explainer-improvements-v2. The residual reader-side rename window is `BL-260817-let-resolveassetsroot-honor`.
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
- Explainer Kit golden visual recovery is complete. The packaged notices,
  adaptive recap set, independent browser-backed critic, exact non-linear
  topology, commit-pinned backlinks, initiative catalogs, authenticated resume,
  and trusted Chromium evidence all ship in CLI `0.2.27`. The four recovery
  successors and umbrella are archived; only
  `BL-260728-additional-visual-workflows` remains open for lower-priority diff,
  plan, fact-check, dashboard, complex-table, and richer-composition work.
- The broader high-priority review redesign is tracked separately in
  `BL-260729-implement-reviewplan-first`: enforce artifact-only intake,
  metadata-only change mapping, an explicit ReviewPlan, selective evidence
  lanes, economically justified delegation, bounded deadlines, and a narrower
  primary replay boundary. PR #185 diagnostics and PR #186 guarded narrowing
  are prerequisites, not substitutes for this work.

<!-- OAT BACKLOG-INDEX -->

| ID                                       | Title                                                                                                 | Status | Priority | Scope   | Estimate |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                                                      | open   | high     | feature | M        |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                                                             | open   | high     | feature | L        |
| BL-260720-add-oat-project-complete-auto  | Add oat-project-complete-auto companion skill for autonomous closeouts                                | open   | high     | task    | M        |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches                                        | open   | high     | feature | M        |
| BL-260820-bind-each-gate-review          | Bind each gate review disposition to its exact received ledger event                                  | open   | high     | task    | M        |
| BL-260820-emit-source-qualified          | Emit source-qualified provenance envelopes for review and gate receipts                               | open   | high     | feature | M        |
| BL-260806-fail-closed-when-configured    | Fail closed when configured closeout snapshot is absent                                               | open   | high     | task    | M        |
| BL-260826-gate-targets-must-not-yield    | Gate targets must not yield on background work in headless mode                                       | open   | high     | task    | M        |
| BL-260718-harden-full-surface-gate       | Harden full-surface gate reviews against budget and recursive dispatch                                | open   | high     | feature | M        |
| BL-260729-implement-reviewplan-first     | Implement ReviewPlan-first reviewer workflow                                                          | open   | high     | feature | L        |
| BL-260727-make-explainer-run-durability  | Make explainer run durability survive ephemeral environments                                          | open   | high     | task    | M        |
| BL-260718-mandatory-skill-load-clause    | Mandatory skill-load clause for lifecycle steps that name skills                                      | open   | high     | task    | S        |
| BL-260826-populate-native-subagent       | Populate native subagent runtime identity from provider transcript metadata                           | open   | high     | feature | M        |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                                                   | open   | high     | feature | M        |
| BL-260820-track-pr-closeout-evidence     | Track PR-closeout evidence freshness against the current head                                         | open   | high     | feature | L        |
| BL-260829-unified-agent-provider-root    | Unified AGENT_PROVIDER_ROOT binding for portable skill and agent references                           | open   | high     | task    | L        |
| BL-260718-add-generated-runbook          | Add generated-runbook verification command pass                                                       | open   | medium   | feature | M        |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                                                    | open   | medium   | feature | M        |
| BL-260819-classify-canonical-skills-by   | Classify canonical skills by distribution, lifecycle, and tenant scope                                | open   | medium   | feature | M        |
| BL-260827-clean-up-tool-pack-lifecycle   | Clean up tool-pack lifecycle and config contracts                                                     | open   | medium   | feature | S        |
| BL-260827-correct-scope-and-adoption     | Correct scope and adoption diagnostics                                                                | open   | medium   | feature | M        |
| BL-260817-decide-and-pin-the-system      | Decide and pin the system-Chromium requirement introduced by test:skills on the merge path            | open   | medium   | task    | S        |
| BL-260826-deterministic-smoke-tier-leaks | Deterministic smoke tier leaks worktrees on interrupted runs                                          | open   | medium   | task    | S        |
| BL-260818-distinguish-operator-directed  | Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap            | open   | medium   | task    | M        |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract                                            | open   | medium   | feature | M        |
| BL-260817-drop-explainer-kit-publish     | Drop explainer-kit publish-request/v1 in a future minor                                               | open   | medium   | task    | S        |
| BL-260714-executable-backstops           | Executable backstops for contract claims — authoring guidance                                         | open   | medium   | task    | S        |
| BL-260818-extend-guarded-prose-contract  | Extend guarded-prose contract tests to docs-app mirrors                                               | open   | medium   | task    | S        |
| BL-260827-fail-closed-on-partial-or      | Fail closed on partial or metadata-only OAT_ASSETS_DIR bundles                                        | open   | medium   | task    | S        |
| BL-260718-fix-oat-docs-generate-index    | Fix oat docs generate-index cwd-relative defaults in monorepos                                        | open   | medium   | task    |          |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs                                     | open   | medium   | feature | L        |
| BL-260712-per-project-override           | Per-project override to disable configured external gates                                             | open   | medium   | feature | M        |
| BL-260827-refresh-provider-codex-md      | Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags | open   | medium   | task    | S        |
| BL-260819-repair-verified-bundled-skill  | Repair verified bundled skill contract drift                                                          | open   | medium   | task    | M        |
| BL-260818-require-repo-wide-call-site    | Require repo-wide call-site sweeps for cross-cutting options in phase-implementer guidance            | open   | medium   | task    | S        |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command                                         | open   | medium   | feature | M        |
| BL-260713-root-agent-judgment-logging    | Root-agent judgment logging responsibility for project log                                            | open   | medium   | feature | S        |
| BL-260817-run-the-rc-explainer-end       | Run the RC explainer end-to-end test in CI with a provisioned browser                                 | open   | medium   | task    | M        |
| BL-260827-span-based-prose-guards        | Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests   | open   | medium   | task    | S        |
| BL-260718-support-fumadocs-in-oat-docs   | Support Fumadocs in oat docs nav sync (currently MkDocs-only)                                         | open   | medium   | task    |          |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync                                           | open   | medium   | feature | M        |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                                                         | open   | medium   | task    | S        |
| BL-260726-validate-structured-output     | Validate structured-output contract in gate skill commands                                            | open   | medium   | task    |          |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                                                            | open   | medium   | task    | S        |
| BL-260817-verify-protected-mode-public   | Verify protected-mode public URLs with an authenticated end-to-end GET                                | open   | medium   | task    | M        |
| BL-260826-warn-on-silent-oatversion      | Warn on silent oatVersion restamps outside sync                                                       | open   | medium   | task    | S        |
| BL-260728-additional-visual-workflows    | Additional visual workflows                                                                           | open   | low      | feature | L        |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight                                           | open   | low      | task    | M        |
| BL-260826-decide-whether-test-only-paths | Decide whether test-only paths under packages/cli/src count as publishable                            | open   | low      | task    | S        |
| BL-260826-emit-the-dispatch-stamp-from   | Emit the dispatch stamp from the dispatch-ceiling resolver                                            | open   | low      | task    | XS       |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization                                | open   | low      | feature | M        |
| BL-260827-harden-the-codex-skill-below   | Harden the codex-skill below-floor guard against paraphrase and anaphora                              | open   | low      | task    | XS       |
| BL-260827-override-aware-remedy-text     | Override-aware remedy text in assets-root fail-closed errors                                          | open   | low      | task    | XS       |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
