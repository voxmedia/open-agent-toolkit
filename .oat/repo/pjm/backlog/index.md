# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- 2026-10-03: The [approved issue triage](../triage/2026-10-02-untriaged-issues.md) captures nine new items and refines bookkeeping-only recovery for GitHub #339–#341 and #343–#349. Policy interviews and an Opus 5.5 medium second opinion are complete; items are ready for planning, with focused technical design retained in their acceptance criteria. The receipt and archive defects are separate slices linked to the broader provenance-envelope and exact-path commit owners.

- 2026-10-02: the `backlog-wave-4` project (lockstep 0.3.16) closed eleven
  items: `BL-261001-fail-closed-when-bundle-assets` and
  `BL-260906-report-errno-for-asset-root` (build assets);
  `BL-260718-harden-full-surface-gate` (30-minute artifact gate default and
  duplicate-gate rejection); `BL-261001-run-a-complexity-review-when`,
  `BL-260927-persist-quick-start-prompt`, and
  `BL-260713-root-agent-judgment-logging` (review-loop skills);
  `BL-260720-add-oat-project-complete-auto` and
  `BL-260908-tighten-the-pr-final-ledger` (completion); and
  `BL-261001-downgrade-claims-that-thorough`,
  `BL-261001-resolve-the-summary-template`, and
  `BL-261001-route-quick-mode-plan` (small fixes).
  `BL-260908-retire-the-top-level-skill` closed as won't-do, superseded by
  `BL-260908-remove-the-top-level-skill`.
  `BL-260909-restamp-a-stale-copy-strategy` shipped everything except the
  compatibility-bridge retirement and stays open for it;
  `BL-260711-add-activity-aware-gate` left the wave at the plan-gate
  escalation and now records the Codex activity-attribution precondition;
  `BL-260818-distinguish-operator-directed` was rewritten to exclude the
  shipped complexity slice. Follow-ups filed:
  `BL-261002-gitignore-project-review`,
  `BL-261002-port-the-complexity-review`,
  `BL-261002-route-validated-archive`,
  `BL-261002-serialize-stale-gate-claim`,
  `BL-261002-teach-check-skill-bumps`, and
  `BL-261002-wire-the-complexity-review`. Amending `DR-260720` (autonomous
  closeout) to the shipped `workflow.autonomousComplete` design is an open
  operator question.

- 2026-10-01: **BL-260911-make-docs-bootstrap-a-front: Make docs bootstrap a
  front door for existing docs and support the docs-directory convention**
  remains open. Its [Markdown slice](../../reference/project-summaries/20261002-markdown-docs-bootstrap.md)
  passed fourteen tasks and current independent final review; closeout outputs
  are complete. Main #338 is integrated and renewed review/gate evidence passed; both Low
  artifact-alignment findings are addressed. Final approval and lifecycle are complete. Package drift, approval classes,
  pntr automation and external-repository acceptance remain outside the slice.

- 2026-10-01: the `backlog-wave-3` project (lockstep 0.3.11) closed thirteen
  items: `BL-260927-expose-a-scoped-template` (template resolver);
  `BL-260718-support-fumadocs-in-oat-docs` (Fumadocs nav sync);
  `BL-261001-make-recon-s-packet-validator` and
  `BL-261001-recover-recon-lanes-after` (recon publication and Codex
  recovery); `BL-261001-recompute-oat-project-next-s` and
  `BL-260902-decide-test-only-freshness` (lifecycle closeout);
  `BL-260928-keep-instructions-sync-force`,
  `BL-260909-give-the-dispatch-record` (validate-only, per
  `DR-260927-dispatch-record-validates`),
  `BL-260826-decide-whether-test-only-paths`,
  `BL-260830-add-strict-yaml-validation`,
  `BL-260928-route-quick-mode-discovery`, and
  `BL-260903-verify-the-packs-inventory` (small fixes); and
  `BL-260829-order-phase-bookkeeping-before`, verified by the p01 and p02
  reviews running at their Step 7a bookkeeping commits without a ledger
  finding. The wave filed six follow-ups:
  `BL-261001-run-a-complexity-review-when`,
  `BL-261001-fail-closed-when-bundle-assets`,
  `BL-261001-resolve-the-summary-template`,
  `BL-261001-route-quick-mode-plan`, `BL-261001-record-mixed-native-and-cli`,
  and `BL-261001-make-recon-controller-setup`. The control-plane recommender
  and the state dashboard still suggest completion without running the new
  closeout check; they rely on `oat project complete-state` refusing a
  configured closeout whose snapshot is missing.
  `BL-260806-fail-closed-when-configured` closed after this project's own
  configured-plus-absent closeout trace was recorded (14 items archived in
  total). The exit gate deferred `BL-261001-escape-directive-like` and
  `BL-261001-list-thorough-review-omissions`.
- 2026-10-01: after Wave 3's p03 hit the review cap and an operator-requested
  complexity review ended the loop, the operator asked that every exhausted
  review or gate budget automatically run a complexity review and present it
  with the gate's reasons. `BL-261001-run-a-complexity-review-when` (high) is
  the first slice; `BL-260818-distinguish-operator-directed` gains the
  complexity-review input and a fourth disposition, **simplify**.
- 2026-09-30: next-wave priorities. `BL-260927-expose-a-scoped-template` is
  raised to high and leads the wave (user-scope installs have no repository
  `.oat/templates/`, so lifecycle skills that copy templates fail).
  `BL-260718-support-fumadocs-in-oat-docs` is raised to high with acceptance
  criteria: `oat docs nav sync` writes Fumadocs `meta.json` files from the
  authored `index.md` Contents maps. Wave 2's GitHub issues #322 and #295 were
  closed against #332. GitHub issue #333 (a live recon run that could not
  publish a packet) is split four ways:
  `BL-261001-make-recon-s-packet-validator` (high, joins the wave: the packet
  validator rejects what recon's own brief generator and reconciler produce),
  `BL-261001-recover-recon-lanes-after` (high, joins the wave: a recon note on
  the Codex agent-limit gotcha and one bounded retry),
  `BL-261001-record-mixed-native-and-cli` (low, deferred until mixed-route
  continuations recur), and `BL-261001-make-recon-controller-setup` (low:
  setup and preflight friction).
- 2026-09-28: the `backlog-wave-2` project (lockstep 0.3.9) closed twelve
  items: `BL-260903-close-manual-only-agents-md`,
  `BL-260927-name-only-installed-pack`, `BL-260909-fix-the-agents-md-unsafe`
  (AGENTS.md guidance); `BL-260927-make-claude-md-shims-opt`, which absorbed
  `BL-260830-persist-instruction-sync` (CLAUDE.md shims are opt-in);
  `BL-260907-route-quick-mode-discovery`, `BL-260907-record-absorbed-projects`
  (lifecycle skill routing); `BL-260909-repair-the-bare-fences-that`,
  `BL-260927-validate-recon-worker` (agent roles; resolved by taking
  `recon-worker` out of `oat-reviewer`, not by a validator); and
  `BL-260909-give-packages-control-plane`,
  `BL-260909-rewrite-inbound-references`, `BL-260904-stabilize-the-collection`
  (CI and backlog tooling). `oat backlog archive` now rewrites inbound
  `.oat/repo` references to an archived item. This close-out left no dangling
  `items/` links because none of the twelve had inbound links; the rewriter
  reported zero rewrites.
  `BL-260829-order-phase-bookkeeping-before` stays open. The wave filed four
  follow-ups: `BL-260928-keep-instructions-sync-force`,
  `BL-260928-route-quick-mode-discovery`,
  `BL-260928-serialize-concurrent-agents-md`, and
  `BL-260928-settle-codex-read-authority`.
- 2026-09-27: `BL-260927-make-claude-md-shims-opt` (high) makes CLAUDE.md shims
  opt-in through `.oat/config.json` now that Claude Code's built-in `agents-md`
  plugin reads AGENTS.md by default (v2.1.278). The plugin ignores every
  AGENTS.md once any CLAUDE.md exists on the path, so the change must remove
  managed shims rather than only stop creating them. It absorbs
  `BL-260830-persist-instruction-sync`.
- 2026-09-27 decisions pass (Wave 4 decision track, taken early):
  `DR-260927-dispatch-record-validates` keeps `oat project dispatch record`
  validate-only and removes journal persistence
  (`BL-260909-give-the-dispatch-record`); `DR-260927-test-only-paths-skip`
  exempts non-shipped test files from the lockstep bump
  (`BL-260826-decide-whether-test-only-paths`);
  `DR-260927-operator-waiver-for-test-only` keeps gate staleness for test edits
  but adds an explicit operator waiver (`BL-260902-decide-test-only-freshness`);
  `DR-260927-one-decision-point-at-review` merges the three review-cap items into
  `BL-260818-distinguish-operator-directed`, closing
  `BL-260927-record-owner-overrides` and `BL-260901-add-corrective-revision` as
  superseded and carving out `BL-260927-persist-quick-start-prompt` and
  `BL-260927-mark-gate-findings-as-new-or`; and
  `DR-260927-templates-resolve-repository` sets template precedence to
  repository, user, bundle (`BL-260927-expose-a-scoped-template`).
- 2026-09-27: `BL-260927-export-only-the-recap-page` records that archive
  copies the whole recap run (QA screenshots, fact base, ledger, manifest,
  theme) into tracked `.oat/repo/reference/project-recaps/`, where nothing
  reads it after archive. The four exports total about 8.6 MB, 5.3 MB of it
  QA PNGs from the latest one. The latest page also has six relative source
  links that are broken at the export location. The fix keeps the verified
  run in the archived project and tracks only the page.
- 2026-09-27: the `triage-correctness-wave` project closed nine items from the
  2026-09-26 triage and backlog review: `BL-260927-stop-resolve-providers-sh-from`,
  `BL-260927-make-the-managed-claude`, `BL-260927-name-the-file-in-canonical`,
  `BL-260927-derive-or-label-the-dispatch`,
  `BL-260927-require-a-per-item-walkthrough`,
  `BL-260927-preserve-oat-config-json-key`,
  `BL-260909-reject-malformed-nested-values`,
  `BL-260909-make-oat-sync-scope-all-report`, and
  `BL-260908-validate-the-catalog-refresh`. It also archived
  `BL-260908-restore-recon-s-cheap-fan-out`, whose criteria were already all
  met by PR #285 (merged 2026-09-12). Per-item acceptance evidence is in the
  project's `implementation.md`.
- 2026-09-26 issue triage
  ([record](../triage/2026-09-26-untriaged-issues.md)) verified the twenty
  untriaged issues (#295–#297, #305–#307, #310–#314, #316, #322–#329) and
  created fifteen `BL-260927-*` items. Two are high:
  `BL-260927-stop-resolve-providers-sh-from` (Stop resolve-providers.sh from
  aborting when the last auto-detect test is false), which breaks
  agent-instructions analyze and apply in most repositories, and
  `BL-260927-make-the-managed-claude` (Make the managed Claude dispatch-record
  input producible and self-describing), a mandatory pre-launch check that
  cannot be satisfied from the documentation. The same pass refined
  `BL-260903-close-manual-only-agents-md`, `BL-260820-bind-each-gate-review`,
  and `BL-260909-give-the-dispatch-record`, and found ten `tracked-in-backlog`
  issues whose work had already merged; they close after the triage PR merges.
- 2026-09-25: `BL-260925-add-grok-4-7-cursor-pin` records a deferred Cursor
  pin gap. Grok 4.7 resolves only bare flat IDs, which
  `DR-260718-explicit-cursor-pin-mapping` does not allow, and its quality
  versus Grok 4.6 is still unsettled. The bundled Cursor ladder moved to
  Grok 4.6 and Fable 5.1 in the same change.
- 2026-09-15: `BL-260911-make-oat-doctor` shipped through `oat-doctor-router`
  (PR #300): `oat-doctor` is now one collaborative router over config, PJM,
  agent instructions, docs, and tools. Its docs dive hands off to
  `oat-docs-bootstrap`, so `BL-260911-make-docs-bootstrap-a-front` is the
  natural next step for docs health; `BL-260911-support-per-tool-scope` stays
  medium.
- 2026-09-12: `BL-260912-evaluate-replacing-explainer` follows the
  `agent-authored-recap` simplification with a paired prototype and measured
  decision on replacing only the authoring layer with a pinned, attributed
  Effective HTML subset; the OAT wrapper/router and assurance contracts remain
  the stable boundary.
- 2026-09-13: `BL-260907-replace-the-default-project` shipped through
  `agent-authored-recap`: one manifest-v2 flow now serves project and program
  recaps, plan-time project explainers, and direct input. The same closeout
  archived the four active RC-browser and publication follow-ups that the
  retired tooling made obsolete.
- 2026-09-06: `BL-260906-re-evaluate-universal-plan` reopens the default-policy
  question in `DR-260714-flexible-plan-task-bodies`: objective,
  risk-proportionate proof should prevent both proof-free plans and low-value
  test theater across every workflow mode.
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
  `BL-260713-root-agent-judgment-logging` shipped in backlog wave 4
  (0.3.16): root-agent role guidance owns judgment-entry logging while
  subagents report observations to the root.
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

| ID                                       | Title                                                                                                    | Status | Priority | Scope      | Estimate |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | -------- | ---------- | -------- |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                                                      | open   | urgent   | feature    | L        |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                                                         | open   | high     | feature    | M        |
| BL-261002-add-an-explicit-plan-approval  | Add an explicit plan-approval step to quick and spec-driven projects                                     | open   | high     | feature    | M        |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                                                                | open   | high     | feature    | L        |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches                                           | open   | high     | feature    | M        |
| BL-260820-bind-each-gate-review          | Bind each gate review disposition to its exact received ledger event                                     | open   | high     | task       | M        |
| BL-261002-clean-up-stale-provider-views  | Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed             | open   | high     | task       | M        |
| BL-260820-emit-source-qualified          | Emit source-qualified provenance envelopes for review and gate receipts                                  | open   | high     | feature    | M        |
| BL-261002-enforce-remote-planning        | Enforce remote planning approval caps, storage scope, and binding locations                              | open   | high     | task       | M        |
| BL-261002-gitignore-project-review       | Gitignore project review artifacts instead of committing them                                            | open   | high     | task       | M        |
| BL-260906-harden-dispatch-launch         | Harden dispatch launch baselines and terminal reconciliation                                             | open   | high     | feature    | M        |
| BL-260729-implement-reviewplan-first     | Implement ReviewPlan-first reviewer workflow                                                             | open   | high     | feature    | L        |
| BL-261002-keep-hand-written-knowledge    | Keep hand-written knowledge files and unrelated staged changes safe during knowledge-index refresh       | open   | high     | task       | S        |
| BL-260911-make-docs-bootstrap-a-front    | Make docs bootstrap a front door for existing docs and support the docs-directory convention             | open   | high     | feature    | M        |
| BL-261002-preserve-pjm-remote-settings   | Preserve pjm.remote settings when oat pjm init or migrate --apply reruns                                 | open   | high     | task       | S        |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync                                              | open   | high     | feature    | M        |
| BL-260820-track-pr-closeout-evidence     | Track PR-closeout evidence freshness against the current head                                            | open   | high     | feature    | L        |
| BL-261002-warn-when-the-default-branch   | Warn when the default branch has changed planned paths since the branch base                             | open   | high     | feature    | M        |
| BL-260718-add-generated-runbook          | Add generated-runbook verification command pass                                                          | open   | medium   | feature    | M        |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                                                       | open   | medium   | feature    | M        |
| BL-260830-add-remote-review-respond      | Add remote review respond and summarize skill set                                                        | open   | medium   | feature    | L        |
| BL-261002-align-implement-complete       | Align implement, complete, and pr-final skill contracts with their actual behavior                       | open   | medium   | task       | S        |
| BL-260902-append-only-lifecycle-history  | Append-only lifecycle history after completion                                                           | open   | medium   | feature    | M        |
| BL-260830-cli-flag-help-p2-p3-cleanup    | CLI flag/help P2-P3 cleanup                                                                              | open   | medium   | task       | M        |
| BL-261002-catch-hardcoded-docs-paths     | Catch hardcoded docs paths in skill tests when docs pages move                                           | open   | medium   | task       | S        |
| BL-260819-classify-canonical-skills-by   | Classify canonical skills by distribution, lifecycle, and tenant scope                                   | open   | medium   | feature    | M        |
| BL-261002-commit-a-headless-rendered     | Commit a headless rendered-site QA tour for the docs app                                                 | open   | medium   | task       | M        |
| BL-260830-complete-control-plane-backed  | Complete control-plane-backed lifecycle reads                                                            | open   | medium   | initiative | M        |
| BL-260928-settle-codex-read-authority    | Confirm /recon launches Codex worker lanes as contract-enforced on the released CLI                      | open   | medium   | task       | S        |
| BL-261002-correct-docs-bootstrap-docs    | Correct docs-bootstrap, docs-apply, and docs-analyze skill contracts                                     | open   | medium   | task       | S        |
| BL-261002-decide-a-supported-permission  | Decide a supported permission setup for unattended cross-runtime review                                  | open   | medium   | idea       | M        |
| BL-261002-decide-first-run-defaults      | Decide first-run defaults for project scope without origin and non-interactive pack install              | open   | medium   | idea       | M        |
| BL-260830-decide-generic-oat-ownership   | Decide generic OAT ownership of Jira backlog refinement                                                  | open   | medium   | idea       | L        |
| BL-261002-decide-how-teams-enforce       | Decide how teams enforce shared gate and checkpoint rules                                                | open   | medium   | idea       | M        |
| BL-261002-decide-whether-an-existing     | Decide whether an existing provider folder should activate sync without opt-in                           | open   | medium   | idea       | S        |
| BL-260927-derive-current-lifecycle-state | Derive current lifecycle state from one authority for review, phase, and publication status              | open   | medium   | feature    | L        |
| BL-260818-distinguish-operator-directed  | Design the budget-exhausted decision point for reviews and gates review-cycle cap                        | open   | medium   | task       | L        |
| BL-260927-detect-unfilled-placeholders   | Detect unfilled placeholders and frontmatter-body drift at PR-final and completion                       | open   | medium   | task       | M        |
| BL-261003-diagnose-review-finding        | Diagnose review finding overcounts and revalidate format-only repairs without relaunch                   | open   | medium   | bug        | M        |
| BL-261005-distinguish-stored-receipt     | Distinguish stored receipt branch return from rewritten history                                          | open   | medium   | task       | M        |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract                                               | open   | medium   | feature    | M        |
| BL-261003-enforce-reconnaissance         | Enforce reconnaissance evidence and reconcile original-run review receipts                               | open   | medium   | bug        | M        |
| BL-260912-evaluate-replacing-explainer   | Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset                  | open   | medium   | task       | M        |
| BL-260927-export-only-the-recap-page     | Export only the recap page to project-recaps and fix its broken source links                             | open   | medium   | feature    | M        |
| BL-260902-file-deferred-repository       | File deferred repository follow-ups from a passing receive                                               | open   | medium   | feature    | M        |
| BL-261002-fix-oat-config-describe-gaps   | Fix oat config describe gaps and make config unset reach the layer that holds the key                    | open   | medium   | task       | S        |
| BL-261002-fix-project-planning-skill     | Fix project planning skill handoffs and inputs across discover, spec, promote, split, and plan           | open   | medium   | task       | M        |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs                                        | open   | medium   | feature    | L        |
| BL-260927-give-gate-receipts-portable    | Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule                | open   | medium   | feature    | M        |
| BL-261002-honor-the-requested-scope      | Honor the requested scope for every pack in tools install and init --setup                               | open   | medium   | task       | M        |
| BL-260830-integrate-recon-across         | Integrate recon across analysis and research workflows                                                   | open   | medium   | feature    | L        |
| BL-260830-integrate-recon-with-oat       | Integrate recon with OAT discovery and quick start                                                       | open   | medium   | feature    | M        |
| BL-261003-leave-backlog-archive-staging  | Leave backlog archive staging to callers and report complete result paths                                | open   | medium   | bug        | S        |
| BL-261002-let-plans-declare-an-evidence  | Let plans declare an evidence tier per phase and reconcile tracking on driver takeover                   | open   | medium   | feature    | L        |
| BL-261002-list-pending-required-reviews  | List pending required reviews when a project reaches a pull request                                      | open   | medium   | feature    | S        |
| BL-260830-live-dogfood-oat-brainstorm    | Live dogfood oat-brainstorm destination and fold-back safety                                             | open   | medium   | task       | M        |
| BL-260830-make-documentation-aware       | Make documentation-aware discovery prerequisites configurable                                            | open   | medium   | feature    | M        |
| BL-261002-make-explainer-kit-accept-or   | Make explainer-kit accept or reject source-code inputs explicitly                                        | open   | medium   | task       | S        |
| BL-260904-make-quick-the-default-oat     | Make quick the default OAT workflow mode and spec-driven the explicit larger mode                        | open   | medium   | feature    | L        |
| BL-261002-make-the-copy-sync-strategy    | Make the copy sync strategy checkout-independent and settable from the CLI                               | open   | medium   | task       | M        |
| BL-260906-make-the-dispatch-stamp        | Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions     | open   | medium   | task       | S        |
| BL-260927-mark-gate-findings-as-new-or   | Mark gate findings as new or carried over between attempts                                               | open   | medium   | feature    | M        |
| BL-261002-offer-a-strict-gate-reviewer   | Offer a strict gate-reviewer independence mode and align gate skill wording and decision records         | open   | medium   | feature    | M        |
| BL-261003-persist-separate-review        | Persist separate review artifacts and validate plain-file ledger references                              | open   | medium   | bug        | M        |
| BL-261002-port-the-complexity-review     | Port the complexity-review skill into an OAT pack                                                        | open   | medium   | task       | M        |
| BL-261003-preserve-documented-structured | Preserve documented structured blockers in project status output                                         | open   | medium   | bug        | S        |
| BL-261002-provide-a-complete-oat         | Provide a complete OAT uninstall path and make pack removal clean up after itself                        | open   | medium   | feature    | L        |
| BL-260830-re-evaluate-same-target-gate   | Re-evaluate same-target gate execution                                                                   | open   | medium   | idea       | L        |
| BL-260906-re-evaluate-universal-plan     | Re-evaluate universal plan proof strategy and test-first guidance                                        | open   | medium   | feature    | L        |
| BL-261002-re-review-a-phase-only-after   | Re-review a phase only after Critical or High findings                                                   | open   | medium   | feature    | M        |
| BL-261003-reassess-lite-execution-scope  | Reassess Lite execution scope and preserve completed work on promotion                                   | open   | medium   | feature    | L        |
| BL-260907-recognize-phase-level          | Recognize phase-level completion records so bullet-list revision phases do not read as incomplete        | open   | medium   | task       | S        |
| BL-261003-reconcile-oat-tracking-commit  | Reconcile OAT tracking commit cadence with resumable phase/group batching                                | open   | medium   | bug        | M        |
| BL-260827-refresh-provider-codex-md      | Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags    | open   | medium   | task       | S        |
| BL-260908-remove-the-top-level-skill     | Remove the top-level skill version read after the alias error has been quiet                             | open   | medium   | task       | S        |
| BL-261002-require-exactly-one-h1-per     | Require exactly one H1 per docs page in docs:validate                                                    | open   | medium   | task       | S        |
| BL-261003-require-proportional           | Require proportional adversarial probes at changed review boundaries                                     | open   | medium   | task       | M        |
| BL-260909-restamp-a-stale-copy-strategy  | Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge               | open   | medium   | task       | M        |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command                                            | open   | medium   | feature    | M        |
| BL-261002-route-validated-archive        | Route validated archive receipts from oat-project-complete-auto to the interactive resume tail           | open   | medium   | task       | M        |
| BL-261002-settle-dispatch-policy         | Settle dispatch policy precedence and stop legacy presets overwriting ladder columns                     | open   | medium   | task       | M        |
| BL-260927-share-one-hook-safe-exact-path | Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits                   | open   | medium   | feature    | L        |
| BL-261003-show-autonomous-hard-stop      | Show autonomous hard-stop conditions and effective recovery limits at kickoff                            | open   | medium   | task       | S        |
| BL-260827-span-based-prose-guards        | Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests      | open   | medium   | task       | S        |
| BL-261002-stop-oat-sync-from-changing    | Stop oat sync from changing user values in .codex/config.toml                                            | open   | medium   | task       | S        |
| BL-260911-support-per-tool-scope         | Support per-tool scope migration in oat tools migrate                                                    | open   | medium   | task       | S        |
| BL-260909-surface-config-warnings        | Surface config warnings on every reader path and document the warnings field                             | open   | medium   | task       | M        |
| BL-261002-teach-check-skill-bumps        | Teach check:skill-bumps to follow vendored .agents/docs symlinks                                         | open   | medium   | task       | S        |
| BL-260907-type-check-cli-test-files      | Type-check CLI test files with a test-scoped tsconfig gate                                               | open   | medium   | task       | M        |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                                                            | open   | medium   | task       | S        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                                                               | open   | medium   | task       | S        |
| BL-261002-verify-local-scope-lifecycle   | Verify local-scope lifecycle commits and empty HiLL phase defaults                                       | open   | medium   | task       | S        |
| BL-260830-wire-bounded-durable-reference | Wire bounded durable-reference reads into lifecycle skills                                               | open   | medium   | feature    | M        |
| BL-260830-wire-provide-remote-skills     | Wire provide-remote skills to the review-remote helper CLI                                               | open   | medium   | feature    | L        |
| BL-261002-wire-the-complexity-review     | Wire the complexity review into the sibling gate-capable skills                                          | open   | medium   | task       | M        |
| BL-260925-add-grok-4-7-cursor-pin        | Add Grok 4.7 Cursor pin mappings                                                                         | open   | low      | task       | S        |
| BL-260909-add-a-grep-by-shape-control    | Add a grep-by-shape control for own-key sweeps keyed to variable names                                   | open   | low      | task       | S        |
| BL-260927-add-a-side-effect-free-dry-run | Add a side-effect-free dry run to oat project log append                                                 | open   | low      | task       | S        |
| BL-260830-add-per-claude-md-adoption-opt | Add per-CLAUDE.md adoption opt-out for instruction sync                                                  | open   | low      | feature    | M        |
| BL-260728-additional-visual-workflows    | Additional visual workflows                                                                              | open   | low      | feature    | L        |
| BL-260908-align-the-provider-view-json   | Align the provider-view JSON, evidence states, and docs with the human row                               | open   | low      | task       | XS       |
| BL-260830-benchmark-listprojects-before  | Benchmark listProjects before approving a summary fast path                                              | open   | low      | idea       | M        |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight                                              | open   | low      | task       | M        |
| BL-260903-close-claude-runtime-lineage   | Close Claude runtime lineage depth and unverified provider shapes                                        | open   | low      | task       | S        |
| BL-260901-consolidate-terminal-remote    | Consolidate terminal remote-ref advertisement parsing                                                    | open   | low      | task       | M        |
| BL-261002-correct-misleading-init-status | Correct misleading init, status, and doctor messages and stop scripts from defaulting to user-scope sync | open   | low      | task       | S        |
| BL-260908-date-decision-record-ids       | Date decision-record IDs in local time or document UTC                                                   | open   | low      | task       | XS       |
| BL-260830-decide-whether-oat-owns        | Decide whether OAT owns dependency intelligence                                                          | open   | low      | idea       | L        |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization                                   | open   | low      | feature    | M        |
| BL-261002-fix-brainstorm-and-pjm         | Fix brainstorm and PJM template contract gaps for lite mode and archive-dated                            | open   | low      | task       | S        |
| BL-260906-give-project-state-frontmatter | Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                                 | open   | low      | task       | S        |
| BL-260928-harden-the-backlog-reference   | Harden the backlog reference rewriter's atomic replace edge cases                                        | open   | low      | task       | S        |
| BL-260907-ignore-backslash-escaped       | Ignore backslash-escaped emphasis in skill-script reference extraction                                   | open   | low      | task       | XS       |
| BL-261002-let-skills-declare-their-side  | Let skills declare their side effects in metadata                                                        | open   | low      | feature    | M        |
| BL-260909-make-findsection-comment-aware | Make findSection comment-aware in the bundled-docs contract test                                         | open   | low      | task       | S        |
| BL-261001-make-recon-controller-setup    | Make recon controller setup and preflight self-serve                                                     | open   | low      | feature    | M        |
| BL-260906-make-the-phase-implementer     | Make the phase-implementer sweep contract test negation-aware                                            | open   | low      | task       | S        |
| BL-260830-memory-subsystem-ownership     | Memory subsystem ownership decision for OAT                                                              | open   | low      | idea       | XL       |
| BL-260906-project-journal-reservation    | Project journal reservation state into the smoke evidence bundle                                         | open   | low      | task       | S        |
| BL-261002-publish-an-owner-statement     | Publish an owner statement on project stability, support, and non-goals                                  | open   | low      | task       | XS       |
| BL-260909-re-source-the-surviving-codex  | Re-source the surviving Codex provider claims and repair the dead provider-reference URLs                | open   | low      | task       | S        |
| BL-261001-record-mixed-native-and-cli    | Record mixed native and CLI recon continuations in the manifest                                          | open   | low      | feature    | M        |
| BL-260908-repair-or-exempt-archived      | Repair or exempt archived project ledgers that fail the pr-final path guard                              | open   | low      | task       | S        |
| BL-261005-resolve-deferred-wave-5        | Resolve deferred Wave 5 maintenance edge cases                                                           | open   | low      | task       | L        |
| BL-260908-restructure-the-authoring      | Restructure the authoring skills for progressive disclosure and decide proactive invocation              | open   | low      | feature    | M        |
| BL-260903-retire-deprecated-pack         | Retire deprecated pack placement and dead evidence diagnostics                                           | open   | low      | task       | M        |
| BL-260928-serialize-concurrent-agents-md | Serialize concurrent AGENTS.md guidance appends                                                          | open   | low      | task       | S        |
| BL-260909-show-the-brainstorm-pack       | Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration                        | open   | low      | task       | XS       |
| BL-261002-split-the-tool-packs-page      | Split the Tool Packs page and restructure the Workflow Gates and Dispatch Policy pages                   | open   | low      | task       | M        |
| BL-261002-theme-mermaid-diagrams         | Theme Mermaid diagrams and keep them readable on phones                                                  | open   | low      | task       | M        |
| BL-260909-use-handle-bound-traversal     | Use handle-bound traversal in the managed-copy and manifest filesystem readers                           | open   | low      | task       | M        |
| BL-260909-wave-7-review-polish-leftovers | Wave-7 review polish leftovers                                                                           | open   | low      | task       | S        |
| BL-260903-project-document-should-prompt | project-document should prompt a re-run when review fixes change a shipped contract                      | open   | low      | task       | S        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
