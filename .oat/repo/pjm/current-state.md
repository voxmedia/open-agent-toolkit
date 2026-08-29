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
- [Implementation Execution](../../../apps/oat-docs/docs/workflows/projects/implementation-execution.md)
  defines tiered pre-commit prevention, bounded same-target append-only
  recovery, numeric attempt accounting, and direction-required boundaries.
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

- CLI `0.2.41` (portable-agent-references, branch pending merge) generalizes
  portable references from the identified cross-skill reads to the entire
  user-default asset surface. A manifest-driven ratchet derives skill _and_
  agent assets from `PACK_MANIFEST` and classifies cross-skill `SKILL.md` reads
  plus file- and directory-form targets at or below `references/`, across
  backticked, plain, Markdown-link, `./`, `../`, and repeated-parent spellings.
  All nine canonical callers now resolve through installed roots: six skills use
  loaded → user → project, and three agents use user → project, because no
  provider exposes a stable loaded-agent source directory. The
  `oat-phase-implementer` bare-path exemption is replaced by the same positive
  assertions its consumers use, and a temporary migration inventory of 21 exact
  entries was drained to zero, leaving only the six pre-existing non-executable
  historical entries. This closes the residual agent-surface and
  cross-skill `references/*.md` deferral recorded against `0.2.39`. Mutation
  testing twice confirmed the ratchet is live; the full CI gate list passed
  uncached and HOME-isolated. One direction remains unenforced and is tracked as
  `BL-260829-unified-agent-provider-root`: skills reading canonical _agent_
  definitions still use bare `.agents/agents/<name>.md` paths, a path shape the
  matcher structurally cannot see.
- CLI `0.2.39` (portable-skill-references, merged as PR #226) makes the
  identified packaged sibling-skill reads portable across loaded, user, and
  project scopes. Idea, implementation, plan-writing, and brainstorm handoff
  surfaces now fail closed with pack-specific install/update recovery; the
  implementation dispatcher resolves workflow and utility dependencies
  independently so mixed-scope installs remain valid. A recursive authored-
  Markdown ratchet rejects new bare sibling `SKILL.md` reads while retaining
  only exact historical evidence. The complete repository gate sequence and
  refreshed Fable exit gate passed. Closed
  `BL-260827-make-packaged-skill-references`; residual agent surfaces and
  cross-skill `references/*.md` coverage remain deferred to a later portability
  follow-up.
- CLI `0.2.37` makes every OAT tool pack user-scope eligible through one
  intent-aware install/update/remove/migrate lifecycle while keeping curated
  PJM state and adoption repository-owned. Inventory, status, and doctor now
  distinguish intent from placement and ownership; migration is preview-first,
  verifies the destination before removing managed sources, supports rollback,
  and preserves shared assets and repository customizations. Provider sync
  keeps user scope skills-only where required and reports unmaterialized agents
  explicitly. All eleven repository gates and a zero-finding final closeout
  review passed. Closed `BL-260818-make-the-project-management`; scope/adoption
  diagnostics and lifecycle/config polish remain as implementation-ready
  follow-up projects.
- CLI `0.2.31` (explainer-improvements-v2, branch pending merge) hardens the
  Explainer Kit publication boundary end to end: publication-root and receipt
  screening is version-agnostic (a future contract version cannot silently
  bypass it), C0/C1 control characters and backslashes are rejected in both
  roots, public roots refuse loopback/link-local/private addresses with
  redirects disabled (opt-out via `EXPLAINER_KIT_ALLOW_PRIVATE_PUBLIC_ROOT`,
  which leaves a durable `publicRootPolicy` receipt trace), and the initiative
  catalog is versioned `v2` carrying a public-verification policy marker that
  is threaded as a required argument through every builder/validator call
  site. `project-recap@2` gains end-to-end coverage; the skill and hermetic
  release suites run inside `pnpm test`; two version-lockstep gates
  (`check:skill-bumps`, `release:check-versions`) run locally and in CI, and
  `AGENTS.md`'s Definition of Done now mirrors CI's gate list exactly. Asset
  bundling publishes by atomic staged rename. Delivered through six final
  review rounds and five bounded fix batches; deferred residue lives in six
  `BL-260817-*` backlog items.
- CLI `0.2.35` closes the hermetic-assets defect from the 2026-08-19 defect wave
  program (wave 3 wrapper project `wave-3-execution`): `resolveAssetsRoot`
  honors a non-empty `OAT_ASSETS_DIR` with the unchanged fail-closed bundle
  validation (missing, malformed, or version-mismatched overrides error out
  instead of falling back), the package-coverage smoke consumer reads a private
  per-file bundle and asserts its own environment restoration and cleanup, and
  the CLI unit suite neutralizes an ambient override at the vitest env seam.
  Closed `BL-260817-let-resolveassetsroot-honor`.
- CLI `0.2.34` closes the sync version-skew defect from the 2026-08-19 defect
  wave program (wave 2 wrapper project `wave-2-execution`): `oat sync` now
  compares each scope manifest's `oatVersion` with the invoking CLI before the
  dry-run/apply branch and logs an advisory warning naming the scope and both
  versions (JSON mode reports the same data as a `versionSkew` array in the
  dry-run and apply envelopes); the apply-path manifest restamp is derived from
  the same diagnostic so the advisory and the restamp cannot drift apart.
  Closed `BL-260718-warn-when-oat-sync-uses`.
- CLI `0.2.33` closes two containment defects from the 2026-08-19 defect wave
  program (wave 1 wrapper project `wave-1-execution`): the smoke cleanup SIGTERM
  regression harness is bounded (bounded child-exit wait, SIGKILL plus bounded
  reap or detach before temp-dir cleanup, stage-aware diagnostics) so
  `pnpm test` can no longer wedge on a missed signal, and
  `pnpm release:check-versions` additionally rejects lockstep public-package
  versions that are not strictly greater than current `origin/main` (numeric
  comparator, fail-closed evidence, composes with the merge-base rule). Test
  files under `packages/cli/src/` count as publishable changes, so the wave
  carried the lockstep bump. Closed `BL-260818-bound-the-smoke-cleanup` and
  `BL-260817-detect-branch-behind-published`.
- CLI `0.2.30` adds evidence-grounded project retrospectives to the lifecycle
  tail. `retro` is a post-approval-only closeout step; `oat-project-retro`
  generates and idempotently applies machine-scannable promotion findings, and
  `oat-project-retro-file` files consented repo or upstream feedback after
  destination preflight and duplicate checks. The `workflow.retro` namespace
  controls non-interactive apply and filing behavior, while interactive
  completion offers a missing retro as a safety net. Dogfood revisions add
  strict canonical/legacy revision-phase parsing, one bounded mutable
  `Current State` surface, exact-versus-related duplicate classification,
  destination-first local receipts with fail-closed rerun recovery, and
  evidence-scaled concise output. A second dogfood refinement adds deterministic
  pre-action receipt outcomes, standalone narratives with stable evidence
  anchors, source-level evidence inventories, and safe append-only project-log
  correction routing.
- CLI `0.2.28` adds tiered task-level defect prevention and bounded
  same-target post-commit recovery without weakening accepted-launch
  terminality. A dedicated per-phase numeric budget, committed terminal ledger
  handoff, immutable recovery commits, and canonical recovery events make
  attempts fail-closed and auditable; generated Claude, Codex, and Cursor views
  are validated for equivalent behavior. Existing installations update with
  `oat tools update` followed by `oat sync --scope all`.
- CLI `0.2.27` closes the Explainer Kit golden visual recovery: one immutable
  adaptive set plans a hub, architecture view, and deck from a shared claim
  ledger; artistic routing preserves exact branch, fan-in, cycle, node, edge,
  direction, and label semantics; lifecycle sources resolve to commit-pinned
  canonical backlinks; and each initiative emits a manifest-derived catalog.
  Unattended recaps require a trusted launched-Chromium session and independent
  critic, retain engine/version identity and decoded PNG evidence through
  finalization and archive validation, and permit at most one correction.
  Authenticated `ekrt2` resume tokens bind the complete canonical request.
  Three portable real-Chromium golden cases, five public package payloads, and
  the 65-measurement release visual gate pass. Additional visual workflows
  remain separately tracked as `BL-260728-additional-visual-workflows`.
- CLI `0.2.26` makes managed-capped implementation and fix dispatches
  auditable without changing compatibility exit behavior. Dispatch Report V1
  now carries provider-neutral task classification, applicable Codex task
  effort, legacy preferred-selection provenance, and ordered structured
  notices. A skipped exact-candidate selection or an exact candidate without a
  task class emits a stable coded warning in human and JSON output while
  resolution remains successful. Policy choices, post-adoption output, and
  runtime reviewer resolution also disclose effective terminal Fable targets;
  organizations remain responsible for confirming model access and applicable
  retention-policy eligibility.
- CLI `0.2.25` narrows lifecycle and gate re-reviews by default from a
  lineage-qualified prior reviewed head; `false` is the explicit full-scope
  opt-out. Review artifacts and the tracked Reviews ledger preserve validated
  full-SHA provenance across archival, clones, and worktrees. Missing,
  conflicting, non-existent, or non-ancestor provenance fails open to full
  scope, and every re-review reports its resolved range plus
  empty/bookkeeping-only/substantive classification without using that
  classification to skip review.
- CLI `0.2.21` rebuilds Explainer Kit authoring on two per-artifact paths,
  replacing slot-filling that produced structurally thin output. A narrative
  path promotes Markdown from provenance to actual renderer input, so tables,
  GFM-alert callouts, fenced timelines, and fenced diagrams render as
  structure; an artistic path has the agent compose HTML from hash-pinned
  shells. Recipe policy chooses the path, not the author. `recipe/v2` replaces
  v1, which is retired at the 2.0.0 boundary, and carries finite per-recipe and
  per-type expansion caps, guideline misses degrade to warnings while safety and
  provenance stay hard errors, approval moves after render and QA with the
  accepted set persisted in `content-approval/v2` for faithful resume, and
  author provenance binds through trusted caller configuration with the core
  stamping time from its injected clock. Render QA is opt-in and never
  self-launching. `explainer-kit` 2.0.0 marks the author-contract boundary.
- CLI `0.2.18` adopts Claude Opus 5 as the hard-reasoning and consequential
  incumbent in `subagent-orchestration`, and admits six probe-verified Cursor
  pin mappings — five `claude-opus-5` effort rungs plus
  `claude-opus-4-8[effort=xhigh]`, which is catalogued for cyber-sensitive work
  but deliberately kept out of the bundled recommendation. Recommendation
  `2026-07-25.1` places Opus 5 across the Cursor `balanced`, `high`, and
  `frontier` tiers and drops `claude-sonnet-5-high` from `economy` as strictly
  dominated; the supported catalogue is now 18 flat IDs against 16 recommended
  candidates. Unlike the earlier inconclusive Cursor verification, resolution
  was observed directly from Cursor's `subagentStart` lifecycle hooks, which
  the headless client does not emit. Approved mappings can now carry a probe
  record that must match the selector it approves, so editing a mapping
  without re-probing fails its own test. Probing also characterized a distinct
  silent-fallback mode: Cursor substitutes a default for any selector
  component it cannot resolve, and the default rung is family-specific rather
  than always `high`. The reproducible method is documented at
  `apps/oat-docs/docs/contributing/verifying-cursor-pins.md`; sync-time
  validation is tracked as `BL-260726-validate-cursor-pin-effort`.
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
  explicitly unvalidated. _Resolved in `0.2.18`_: the missing channel was the
  runtime, not the schema. Agent lifecycle hooks fire in the Cursor desktop app
  but not in the headless client, and reading `subagentStart.subagent_model`
  there produced the conclusive evidence this attempt could not obtain.
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

Portable references have one remaining unenforced direction:
`BL-260829-unified-agent-provider-root` proposes a single
`${AGENT_PROVIDER_ROOT}` binding with `/skills` and `/agents` leaves, replacing
the two parallel candidate lists that already share their user and project
tiers. It carries real design questions (loaded-tier eligibility given that
provider agent views are not format-identical to canonical, and whether a
shared root regresses independent per-dependency binding), so it is scaffolded
as project `agent-provider-root` with seeded discovery rather than queued as a
mechanical port.
