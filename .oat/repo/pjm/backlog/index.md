# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- 2026-09-06: wave 1 of the execution program closed `BL-260718-fix-oat-docs-generate-index`,
  `BL-260827-fail-closed-on-partial-or`, `BL-260827-override-aware-remedy-text`, and
  `BL-260902-add-an-exclusion-mechanism` (CLI 0.2.56) and filed three `BL-260906-*`
  follow-ups from deferred review findings; the docs half of
  `BL-260906-guard-packed-asset-directories` shipped with the wave.
- 2026-09-04: `BL-260901-make-terminal-project-status` and
  `BL-260904-diagnose-canonical-skills` now carry external plans in the
  execution program (W5 and W6).
- 2026-09-04: issue #258 became `BL-260904-honor-metadata-version` (planned,
  W6) and `BL-260904-migrate-bundled-skills-from` (bulk migration after the
  program).
- 2026-09-03: the program-intake triage completed post-merge (PR #253);
  three `BL-260903-*` residue items from PR #255 now carry external plans
  scheduled as W6, and `BL-260904-stabilize-the-collection` records a CI
  flake in the collection-detach path pending reproduction.
- 2026-09-02 program-intake triage
  ([record](../triage/2026-09-02-program-intake-triage.md)) created twelve
  `BL-260902-*` items from GitHub issues #199, #209/#210/#251, #213, #214,
  #230, #232, #234, #237, #238, #239, #250, and #252, and linked #205, #206,
  #207, #228, and #233 to their existing owners. Three are
  `review-gate-integrity` children; `BL-260902-decide-test-only-freshness`
  and the #251 criterion are decision-gated and excluded from planning.
- `BL-260831-retire-archived-synced-project` is complete in the staged CLI
  `0.2.51` release unit: successful synced archival retires active record and
  discovery identity while preserving completed-ref reachability, configured
  durability, legacy migration, and idempotent recovery.
- External planning now distinguishes plan readiness from execution readiness:
  well-scoped items remain eligible for dated, current-main-pinned plans while
  hard dependencies keep execution explicitly blocked. The missing
  `oat-repo-improve` skill and template enforcement is tracked in
  `BL-260830-distinguish-external-plan`.
- `BL-260830-migrate-the-legacy-pjm` completed the repository's administrative
  reference-layout cleanup: all 23 legacy decisions were migrated, 13 residual
  work records and five product-decision records received canonical backlog
  identities, six terminal records were folded into completed history, and the
  parallel legacy PJM tree was removed. Source `oat pjm doctor` now passes every
  check.
- Portable canonical skill-to-agent reads shipped in PR #242 as CLI `0.2.47`.
  The archived `BL-260829-unified-agent-provider-root` established the
  dependency-owned local `${AGENT_PROVIDER_ROOT}`, exact same-scope canonical
  identity, seven migrated live reads, and the executable-agent ratchet. The
  active `tool-pack-scope-provider-truthfulness` project consumes that contract
  without reopening provider-root implementation.
- All four user-scope tool-pack closeout follow-ups are closed:
  `BL-260827-make-packaged-skill-references` delivered portable cross-skill
  links and their ratchet in PR #226, and the lifecycle/config cleanup merged
  in PR #240 with released CLI `0.2.46`, and provider-root portability shipped
  in PR #242. `BL-260827-correct-scope-and-adoption` completed the remaining
  bounded PJM migration, provider-aware reachability, shared-owner attribution,
  and fault-tolerant inventory diagnostics in the staged CLI `0.2.49` release
  unit; the broader scope/provider state model remains active separately.
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
- Explainer publication hardening (explainer-improvements-v2, merged as PR #196
  and released in CLI `0.2.31`) closed a credential-bearing publication-root
  bypass with version-agnostic gates and made protected-mode publication
  durably verifiable. Four `BL-260817-*` items carry its remaining deliberate
  residue: v1 removal, authenticated protected-mode verification, and the CI
  browser provisioning decisions.
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
  exact canonical OAT collection. It is now high priority because the alias
  should be the default low-churn mode until unmanaged divergence requires
  per-entry fallback.
- Project-level OAT guidance is now a high-priority companion to user-scope
  tool-pack installation: `BL-260828-add-project-level-oat-guidance` covers the
  init/install notice, explicit AGENTS.md prompt, and shared idempotent
  guidance ownership.
- The urgent follow-up from GitHub issue #228 is tracked in
  `BL-260829-make-tool-pack-scope-selection`: picker annotations must reflect
  verified placement rather than declared intent, explicit user-scope
  selections must not materialize as project + user, and user-scope agent
  materialization must be evaluated across the provider x scope x content-type
  matrix. It also requires clear unavailable-agent/restart notices and
  provenance-preserving native-dispatch fallbacks, while linking the adjacent
  lifecycle, scope/adoption, provider-sync, AGENTS.md, and native-subagent
  boundaries without absorbing their ownership.
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
- Review-loop bookkeeping is now the urgent reliability priority:
  `BL-260711-skip-re-review-for-bookkeeping` expands the existing reporting-only
  classification into a semantic, auditable disposition for direct reviews and
  blocking gates, without consuming another attempt or mislabeling the original
  review as passed.
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
- Build reliability: the 2026-07-12 concurrent-bundling race class (five incidents, one silent bundle corruption) is closed — `BL-260712-serialize-cli-asset-bundling` shipped atomic staged-rename publishing in explainer-improvements-v2. CLI `0.2.35` subsequently closed the residual reader-side rename window through `BL-260817-let-resolveassetsroot-honor`.
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

| ID                                       | Title                                                                                                 | Status | Priority | Scope      | Estimate |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | -------- | ---------- | -------- |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                                                   | open   | urgent   | feature    | L        |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                                                      | open   | high     | feature    | M        |
| BL-260830-add-oat-config-unset-command   | Add oat config unset command                                                                          | open   | high     | feature    | S        |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                                                             | open   | high     | feature    | L        |
| BL-260720-add-oat-project-complete-auto  | Add oat-project-complete-auto companion skill for autonomous closeouts                                | open   | high     | task       | M        |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches                                        | open   | high     | feature    | M        |
| BL-260820-bind-each-gate-review          | Bind each gate review disposition to its exact received ledger event                                  | open   | high     | task       | M        |
| BL-260830-clarify-quick-mode-resume      | Clarify quick-mode resume routing from oat-project-plan                                               | open   | high     | feature    | S        |
| BL-260830-distinguish-external-plan      | Distinguish external-plan readiness from execution readiness                                          | open   | high     | task       | M        |
| BL-260820-emit-source-qualified          | Emit source-qualified provenance envelopes for review and gate receipts                               | open   | high     | feature    | M        |
| BL-260806-fail-closed-when-configured    | Fail closed when configured closeout snapshot is absent                                               | open   | high     | task       | M        |
| BL-260718-harden-full-surface-gate       | Harden full-surface gate reviews against budget and recursive dispatch                                | open   | high     | feature    | M        |
| BL-260729-implement-reviewplan-first     | Implement ReviewPlan-first reviewer workflow                                                          | open   | high     | feature    | L        |
| BL-260902-make-autonomous-project-recap  | Make autonomous project recap capability-aware and non-blocking                                       | open   | high     | task       | M        |
| BL-260727-make-explainer-run-durability  | Make explainer run durability survive ephemeral environments                                          | open   | high     | task       | M        |
| BL-260901-make-terminal-project-status   | Make terminal project status agree with completed revision plans                                      | open   | high     | task       | S        |
| BL-260829-order-phase-bookkeeping-before | Order phase bookkeeping before per-phase review dispatch                                              | open   | high     | task       | M        |
| BL-260902-recover-committed-review       | Recover committed review artifacts from post-selection gate failures                                  | open   | high     | task       | M        |
| BL-260902-retry-gate-project-log         | Retry gate project-log finalization across transient Git index locks                                  | open   | high     | task       | M        |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync                                           | open   | high     | feature    | M        |
| BL-260820-track-pr-closeout-evidence     | Track PR-closeout evidence freshness against the current head                                         | open   | high     | feature    | L        |
| BL-260902-validate-every-shipped-skill   | Validate every shipped skill-to-script reference against its pack manifest                            | open   | high     | task       | M        |
| BL-260901-add-corrective-revision        | Add corrective-revision transition after review exhaustion                                            | open   | medium   | feature    | M        |
| BL-260718-add-generated-runbook          | Add generated-runbook verification command pass                                                       | open   | medium   | feature    | M        |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                                                    | open   | medium   | feature    | M        |
| BL-260830-add-remote-review-respond      | Add remote review respond and summarize skill set                                                     | open   | medium   | feature    | L        |
| BL-260830-add-strict-yaml-validation     | Add strict YAML validation to oat skill validation                                                    | open   | medium   | task       | S        |
| BL-260902-append-only-lifecycle-history  | Append-only lifecycle history after completion                                                        | open   | medium   | feature    | M        |
| BL-260830-cli-flag-help-p2-p3-cleanup    | CLI flag/help P2-P3 cleanup                                                                           | open   | medium   | task       | M        |
| BL-260819-classify-canonical-skills-by   | Classify canonical skills by distribution, lifecycle, and tenant scope                                | open   | medium   | feature    | M        |
| BL-260830-complete-control-plane-backed  | Complete control-plane-backed lifecycle reads                                                         | open   | medium   | initiative | M        |
| BL-260817-decide-and-pin-the-system      | Decide and pin the system-Chromium requirement introduced by test:skills on the merge path            | open   | medium   | task       | S        |
| BL-260830-decide-generic-oat-ownership   | Decide generic OAT ownership of Jira backlog refinement                                               | open   | medium   | idea       | L        |
| BL-260902-decide-test-only-freshness     | Decide test-only freshness exception for the implement exit gate                                      | open   | medium   | idea       | S        |
| BL-260902-defer-activeproject-clearing   | Defer activeProject clearing on shared and local archive completions                                  | open   | medium   | task       | S        |
| BL-260818-distinguish-operator-directed  | Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap            | open   | medium   | task       | M        |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract                                            | open   | medium   | feature    | M        |
| BL-260817-drop-explainer-kit-publish     | Drop explainer-kit publish-request/v1 in a future minor                                               | open   | medium   | task       | S        |
| BL-260902-file-deferred-repository       | File deferred repository follow-ups from a passing receive                                            | open   | medium   | feature    | M        |
| BL-260906-fix-sync-apply-branch          | Fix sync apply branch precedence when a rejected collection leaves zero planned operations            | open   | medium   | task       | S        |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs                                     | open   | medium   | feature    | L        |
| BL-260906-guard-packed-asset-directories | Guard packed asset directories and document the OAT_ASSETS_DIR contract                               | open   | medium   | task       | S        |
| BL-260904-honor-metadata-version         | Honor metadata.version as the canonical skill version                                                 | open   | medium   | feature    | M        |
| BL-260830-integrate-recon-across         | Integrate recon across analysis and research workflows                                                | open   | medium   | feature    | L        |
| BL-260830-integrate-recon-with-oat       | Integrate recon with OAT discovery and quick start                                                    | open   | medium   | feature    | M        |
| BL-260902-keep-pjm-init-provider         | Keep instruction-sync pointer files out of documentation content trees                                | open   | medium   | task       | M        |
| BL-260830-live-dogfood-oat-brainstorm    | Live dogfood oat-brainstorm destination and fold-back safety                                          | open   | medium   | task       | M        |
| BL-260902-make-consolidated-project      | Make consolidated-project retirement checks semantic                                                  | open   | medium   | task       | M        |
| BL-260830-make-documentation-aware       | Make documentation-aware discovery prerequisites configurable                                         | open   | medium   | feature    | M        |
| BL-260906-make-the-dispatch-stamp        | Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions  | open   | medium   | task       | S        |
| BL-260830-persist-instruction-sync       | Persist instruction sync strategy in config and init                                                  | open   | medium   | feature    | M        |
| BL-260906-persist-status-native-skill    | Persist status native-skill adoption by setting manifestChanged                                       | open   | medium   | task       | S        |
| BL-260903-populate-provider-reachability | Populate provider reachability evidence across pack and lifecycle surfaces                            | open   | medium   | feature    | M        |
| BL-260830-re-evaluate-same-target-gate   | Re-evaluate same-target gate execution                                                                | open   | medium   | idea       | L        |
| BL-260827-refresh-provider-codex-md      | Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags | open   | medium   | task       | S        |
| BL-260906-repair-the-stray-fence-in-oat  | Repair the stray fence in oat-project-review-provide and tighten the fence rule repo-wide             | open   | medium   | task       | S        |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command                                         | open   | medium   | feature    | M        |
| BL-260713-root-agent-judgment-logging    | Root-agent judgment logging responsibility for project log                                            | open   | medium   | feature    | S        |
| BL-260817-run-the-rc-explainer-end       | Run the RC explainer end-to-end test in CI with a provisioned browser                                 | open   | medium   | task       | M        |
| BL-260827-span-based-prose-guards        | Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests   | open   | medium   | task       | S        |
| BL-260718-support-fumadocs-in-oat-docs   | Support Fumadocs in oat docs nav sync (currently MkDocs-only)                                         | open   | medium   | task       |          |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                                                         | open   | medium   | task       | S        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                                                            | open   | medium   | task       | S        |
| BL-260817-verify-protected-mode-public   | Verify protected-mode public URLs with an authenticated end-to-end GET                                | open   | medium   | task       | M        |
| BL-260830-wire-bounded-durable-reference | Wire bounded durable-reference reads into lifecycle skills                                            | open   | medium   | feature    | M        |
| BL-260830-wire-provide-remote-skills     | Wire provide-remote skills to the review-remote helper CLI                                            | open   | medium   | feature    | L        |
| BL-260903-pr-final-archives-reviews      | pr-final archives reviews before a late final review exists                                           | open   | medium   | task       | S        |
| BL-260830-add-per-claude-md-adoption-opt | Add per-CLAUDE.md adoption opt-out for instruction sync                                               | open   | low      | feature    | M        |
| BL-260904-add-recap-seam-config-keys     | Add recap seam config keys                                                                            | open   | low      | task       | S        |
| BL-260728-additional-visual-workflows    | Additional visual workflows                                                                           | open   | low      | feature    | L        |
| BL-260830-benchmark-listprojects-before  | Benchmark listProjects before approving a summary fast path                                           | open   | low      | idea       | M        |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight                                           | open   | low      | task       | M        |
| BL-260903-close-claude-runtime-lineage   | Close Claude runtime lineage depth and unverified provider shapes                                     | open   | low      | task       | S        |
| BL-260903-close-manual-only-agents-md    | Close manual-only AGENTS.md refresh loop                                                              | open   | low      | task       | M        |
| BL-260901-consolidate-terminal-remote    | Consolidate terminal remote-ref advertisement parsing                                                 | open   | low      | task       | M        |
| BL-260906-cover-skill-test-files-under   | Cover skill test files under .agents/skills in pnpm check and lint-staged                             | open   | low      | task       | XS       |
| BL-260830-decide-whether-oat-owns        | Decide whether OAT owns dependency intelligence                                                       | open   | low      | idea       | L        |
| BL-260826-decide-whether-test-only-paths | Decide whether test-only paths under packages/cli/src count as publishable                            | open   | low      | task       | S        |
| BL-260904-diagnose-canonical-skills      | Diagnose canonical skills missing from a provider view at resolution time                             | open   | low      | task       | S        |
| BL-260906-docs-index-follow-ups-from     | Docs-index follow-ups from wave 1 reviews                                                             | open   | low      | task       | S        |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization                                | open   | low      | feature    | M        |
| BL-260906-extend-check-skill-bumps       | Extend check:skill-bumps to canonical agent files                                                     | open   | low      | task       | XS       |
| BL-260906-give-project-state-frontmatter | Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                              | open   | low      | task       | S        |
| BL-260906-make-the-phase-implementer     | Make the phase-implementer sweep contract test negation-aware                                         | open   | low      | task       | S        |
| BL-260830-memory-subsystem-ownership     | Memory subsystem ownership decision for OAT                                                           | open   | low      | idea       | XL       |
| BL-260904-migrate-bundled-skills-from    | Migrate bundled skills from top-level version to metadata.version                                     | open   | low      | task       | M        |
| BL-260903-preserve-proto-named-config    | Preserve **proto**-named config keys through jsonc parsing                                            | open   | low      | task       | S        |
| BL-260906-project-journal-reservation    | Project journal reservation state into the smoke evidence bundle                                      | open   | low      | task       | S        |
| BL-260906-reconcile-the-oat-doctor       | Reconcile the oat-doctor example table with its inventory sentence                                    | open   | low      | task       | XS       |
| BL-260906-report-errno-for-asset-root    | Report errno for asset root stat failures and reset the statRedirects test seam                       | open   | low      | task       | XS       |
| BL-260903-retire-deprecated-pack         | Retire deprecated pack placement and dead evidence diagnostics                                        | open   | low      | task       | M        |
| BL-260906-run-scripts-worktree-init-test | Run scripts/worktree/init.test.mjs under a repository gate                                            | open   | low      | task       | XS       |
| BL-260906-scope-the-restamp-only-sync    | Scope the restamp-only sync body suppression per scope under --scope all                              | open   | low      | task       | XS       |
| BL-260904-stabilize-the-collection       | Stabilize the collection-detach engine integration test                                               | open   | low      | task       | S        |
| BL-260903-verify-the-packs-inventory     | Verify the packs:inventory path-redaction claim in troubleshooting docs                               | open   | low      | task       | XS       |
| BL-260903-project-document-should-prompt | project-document should prompt a re-run when review fixes change a shipped contract                   | open   | low      | task       | S        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
