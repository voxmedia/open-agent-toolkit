---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-11
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: ['p04'] # quick mode cannot express 'none'; [] would mean every phase. Final-phase checkpoint only; under OAT_AUTONOMOUS it auto-reviews and continues.
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # fully sequential: design revision 3 ("Implementation Phases") shows phases 1–2 share the CLI reference, the summary contract and the validator's producers
oat_plan_source: quick # spec-driven | quick | imported | lite | brief
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: artifact-cleanup

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make OAT lifecycle artifacts readable and trustworthy for the projects that will be archived from now on, by fixing the writers rather than the names: a bounded observations digest instead of a verbatim log copy in `summary.md`; one canonical journal format with a shared record reader and a mode-aware validator at three boundaries; a producer-made one-line run record; fixed journal slots and slimmer templates moved together with every writer; `state.md` as the owner of gate transitions; `oat-execution-learnings.md` folded into `project-log.md` across all three producers; archive retries that cannot create twins; and documentation moved in the same phase as each contract. Decisions D1–D14 in `discovery.md`; design revision 3 in `design.md` (Astra rounds 1–3 in `references/`).

**Architecture:** Four sequential, integration-complete phases. Phase 1 lands the log and summary contract (grammar, digest, config, readers, templates). Phase 2 lands journal and lifecycle enforcement (shared reader, `journal check`, run-line renderer, journal templates, every writer skill, closeout composition). Phase 3 lands the learning producers and archive identity. Phase 4 is acceptance: fresh lifecycle probes, the documentation audit, decision and backlog records, version bumps and the full gate run. Each phase owns the documentation sections for its contracts; later phases verify, never finish, earlier consumers.

**Tech Stack:** TypeScript ESM (Node 22), vitest, oxlint/oxfmt, Markdown skill contracts under `.agents/skills`, templates under `.oat/templates` registered in `packages/cli/scripts/bundle-inputs.mjs`, Fumadocs under `apps/oat-docs`, decision records via `oat decision new`.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): project-log judgment categories and source identity`

**Integration base:** `feat/freestyle-project-workflow` after the `brief-goal-workflow-modes` goal phases (p12) are accepted; re-read brief-contract §12, the goal skill's learnings clause and `implementation-brief.md` at phase start (D13). Dispatch ceiling frontier; no HiLL checkpoints (brief-mode default carried over; `oat_plan_hill_phases: ['p04']` is the quick-mode spelling of "final only, auto-reviewed").

**Expected-red policy (design "Probe and testing"):** every phase re-pins the contract tests for the files it edits in the same phase (`skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts`, template contract tests, help snapshots). The only phase-crossing expected red is `check:skill-bumps` until p04-t04. Before each phase runs, the root freezes the exact expected-red list for that phase (test, obsolete contract, reason, owner task) in the journal; nothing else may be red at a phase's review.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none; D13)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities (design revision 3: sequential)
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: []`. Phases 1 and 2 both edit the CLI reference and the summary contract, and the validator in phase 2 must not precede the writers it validates; phase 3 consumes phase 1's readers; phase 4 verifies everything. Bounded internals inside a phase may be split across subagents by the phase implementer only with disjoint file, test, doc and generated-output ownership.

---

## Dispatch Profile

| Phase | Named ceiling | Rationale                                                                                                     |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| p01   | frontier      | CLI projection and config contract with cross-reader compatibility; Thomas asked for the frontier ceiling     |
| p02   | frontier      | Shared parser plus a validator at three lifecycle boundaries; regressions here block every project's closeout |
| p03   | frontier      | Three producers and the archive identity contract; irreversible archive side effects                          |
| p04   | frontier      | Acceptance probes, documentation audit and release gates                                                      |

---

## Negative controls, p01–p04 (design "Probe and testing")

Every new refusal is proven at its public boundary: an otherwise valid case, baseline acceptance recorded, post-change refusal for the named reason, and a minimally different accepted neighbor. Projection changes assert the old versus new _output_ of a successful command, never the refusal of valid input. Compatibility cases (accepted by both versions) are listed separately from negatives. Each assurance-bearing guard is neutralized once to show its assertion fails for the intended reason. Named guards: `digest-bounded-projection` (p01-t03), `digest-ledger-graduation-intact` (p01-t03), `learning-source-identity` (p01-t01, p03-t01), `record-reader-ownership` (p02-t01), `journal-check-terminal-shape` (p02-t02), `journal-check-placement` (p02-t02), `journal-check-override-scope` (p02-t02), `run-line-terminality` (p02-t03), `archive-retry-identity` (p03-t02), `archive-generation-authorization` (p03-t03). p04-t01 references each by name with its probe result.

---

## Phase 1: Log and summary contract

### Task p01-t01: Project-log judgment categories and source identity

**Files:** `packages/cli/src/commands/project/log/grammar.ts` (judgment body head fields `**Category:**`, `**Source:**`, `**Origin:**`, `**Recorded:**`; the six categories `gotcha`, `efficiency`, `documentation-gap`, `candidate-skill-content`, `decision`, `environment-limited`; heading regexes unchanged), `log/append.ts` (`--category`, `--source`, `--origin` for judgment entries, category validated, `--idempotency-key` honored for judgment entries so a retry appends nothing), `log/check.ts` (parsed entries expose the fields; `learnings: legacy` when `oat-execution-learnings.md` exists), the shared log parser used by `rollup.ts`/`synthesize.ts` (+tests for each; help snapshots).

**Steps:** RED tests for each flag, the unknown-category refusal, the retry no-op and the legacy report; GREEN; keep existing logs parsing byte-identically (fixture of a real archived log: `.oat/projects/archived/lite-workflow-mode/project-log.md` copied as a compact fixture with provenance header).

**Verify:** `pnpm --filter @open-agent-toolkit/control-plane build`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log src/commands/help-snapshots.test.ts`; guard `learning-source-identity`: with the idempotency check neutralized a retried append duplicates the entry, restored it appends nothing, a distinct source still appends. Compatibility: an entry without `--category` is accepted by both versions. **Commit:** `feat(p01-t01): project-log judgment categories and source identity`

---

### Task p01-t02: Digest configuration

**Files:** `packages/cli/src/config/oat-config.ts` (sibling object `workflow.projectLogDigest` with positive-integer `maxEntries` default 12 and `maxLines` default 60; `workflow.projectLog` untouched), `packages/cli/src/config/resolve.ts` (resolved leaf keys `workflow.projectLogDigest.maxEntries`/`.maxLines` under local/shared/user/default precedence; defaults), `packages/cli/src/commands/config/index.ts` if the key list is enumerated there (+tests), `apps/oat-docs/docs/reference/configuration.md` (the two keys beside `workflow.projectLog`).

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/config`; a public `oat config get workflow.projectLogDigest.maxEntries` on a scratch repo resolves the default, a shared override, and coexists with `workflow.projectLog: false`; a non-integer value is refused by the reader. **Commit:** `feat(p01-t02): workflow.projectLogDigest configuration`

---

### Task p01-t03: Bounded observations digest in roll-up

**Files:** `packages/cli/src/commands/project/log/rollup.ts` (+test): Workflow Observations renders judgment entries only, newest first then category priority (`decision`, `gotcha` first) then heading text, capped by `maxEntries`/`maxLines` with an omitted-count trailer; concise per-item rendering (heading line, first observation sentence, recommendation when present, limitations and uncertainty); each item carries date, type, area, category and a collision-safe entry identity plus the project/source locator (interface defined here; the archive finalizer is p03-t02); obsolete `.oat/projects/shared/...` or synced paths in selected bodies removed or labelled; section omitted when nothing durable; `--json` exposes counts by producer and omitted sources; general-scope ledger graduation (`rollup.ts` ledger path, dedupe, failure semantics) untouched; `ambiguous` refusal and structured failure routing untouched; a cross-reference line to the summary's Autonomous Execution Learnings section when category-bearing entries exist.

**Verify:** projection regressions on valid fixture logs assert successful results in both versions and reject the _old output_ (structural entries, a live shared path, over-bound content present) while the new output omits, sanitizes and bounds them and keeps eligible judgment content, identities, omitted counts and complete ledger graduation; the exported summary is verified from its destination directory (`.oat/repo/reference/project-summaries/`) including duplicate-heading sources and a non-default `summaryExportPath`; ambiguity/unreadable-input refusals are separate cases with unchanged output bytes. Guards: `digest-bounded-projection` (bound neutralized → over-bound output accepted by the regression assertion; restored → fails for that reason; a within-bound control passes), `digest-ledger-graduation-intact` (graduation filtered by digest selection → a general judgment beyond the cap is missing from the ledger; restored → present). **Commit:** `feat(p01-t03): bounded observations digest in project-log rollup`

---

### Task p01-t04: Summary and project-log templates

**Files:** `.oat/templates/project-log.md` (header reduced to two lines and a docs link; sample entry dropped; frontmatter unchanged), `.oat/templates/summary.md` (`## Workflow Observations` becomes the digest section with the omit-when-empty note; `## Autonomous Execution Learnings` describes the category-bearing rendering), `packages/cli/scripts/bundle-inputs.mjs` (registration verified, no rewrite), the template contract tests and bundled-docs/bundle tests that pin template text, `packages/cli/assets/templates/*` regenerated through normal tooling (`git add -f` for the tracked copies as p08 did).

**Verify:** `pnpm --filter @open-agent-toolkit/cli build`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/tools src/commands/init/tools/shared/bundled-docs*`; `node packages/cli/dist/index.js project new probe --mode quick --with-project-log` on a scratch repo yields a log whose header is two lines; the summary template renders through `oat-project-summary`'s Step 6 roll-up with an empty log and omits the section. **Commit:** `feat(p01-t04): slim project-log header and digest summary template`

---

### Task p01-t05: Summary and retro readers, staged closeout invocation, phase-1 docs

**Files:** `.agents/skills/oat-project-summary/SKILL.md` (reads unified log entries with categories first and `oat-execution-learnings.md` second, deduplicating by source identity; new or changed learning-source identities invalidate freshness independently of task/phase freshness; the staged closeout invocation contract: when invoked by `oat-project-complete` with the staged flag, author sections and freshness metadata, suspend before Step 6 roll-up, resume only on the caller's signal; standalone behavior unchanged), `.agents/skills/oat-project-retro/SKILL.md` and `references/evidence-and-lanes.md` (unified first, legacy second, evidence order and strength rules preserved), `apps/oat-docs/docs/workflows/projects/execution/project-log.md` (category, source, digest), `apps/oat-docs/docs/workflows/projects/closeout/retro.md`, `apps/oat-docs/docs/reference/cli-reference.md` (sections for `log append --category/--source/--origin/--idempotency-key`, `log check` legacy report, `log rollup` digest and `--json`), `.agents/docs/autonomy-contract.md` for any re-keyed prompt site, the contract tests that pin summary/retro text (`skills.test.ts`, `named-skill-load-contract.test.ts`).

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; `pnpm --filter oat-docs check`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared` green (phase-1 pins moved in this task); `rg -n 'oat-execution-learnings' .agents/skills/oat-project-summary .agents/skills/oat-project-retro` shows only the legacy-second read. **Commit:** `feat(p01-t05): summary and retro read unified learnings; staged closeout invocation`

---

## Phase 2: Journal and lifecycle enforcement

### Task p02-t01: Shared journal record reader

**Files:** `packages/control-plane/src/state/journal-records.ts` (new, +test): heading-only record reader with source locations, explicit heading ownership (a task block ends at the next heading of equal or higher level), fenced and indented code excluded, shared phase/task identity normalization (`p1`/`p01`, `prev1`/`p-rev1`), raw records retained (duplicates visible), exactly-one-owned `**Status:**` and `**Commit:**` extraction; `packages/control-plane/src/state/tasks.ts` task-mode progress consumes it with unchanged public results on the existing fixtures; barrel export; the production frontmatter reader used for journal and state metadata (malformed, missing and non-terminal distinguished).

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/control-plane exec vitest run` (all existing progress fixtures unchanged); guard `record-reader-ownership`: ownership neutralized → a status line under a fenced fake task heading, and a status leaked from the next section, are attributed to the wrong task; restored → attributed correctly; a plain valid journal reads identically; duplicate normalized ids are both returned; a flow-style YAML frontmatter fixture (the audit's false positive) parses. **Commit:** `feat(p02-t01): shared journal record reader with ownership and fence exclusion`

---

### Task p02-t02: `oat project journal check` and lifecycle integration

**Files:** `packages/cli/src/commands/project/journal-check/{index,evaluator,rules}.ts` (+tests): pure evaluator + I/O; `--at implement-preflight|review|completion`, `--scope` for review, `--json`; rules per design (task modes: plan ids ↔ unique blocks, one owned terminal status, commit evidence or approved scope disposition, overview totals; brief/goal via the landed phase-unit, milestones, delivery-coverage and goal-audit readers with failed/cancelled/no-change records valid and approved deferrals never normalized; status agreement with `state.md`; placement across the whole journal: blocks in their phase, receipts in the owning phase or `## Reviews and Gates`, deferrals in `## Deferred Findings`, `## References` last, dispatch payloads refused anywhere except explicitly marked quoted evidence, every run line terminal at completion, no template residue); override reason codes `scope-disposition-approved`, `evidence-lost`, `operator-accepted-gap` with an authorizing decision identity, read-only; output `{status, reasons:[{code,path,line,owner}]}`; `closeout-check/index.ts` unchanged as the sequence/goal invariant; `complete-state/index.ts` rechecks the invariant and the final evaluator immediately before its write and writes nothing on refusal; `project/index.ts` registration; help snapshots; CLI reference section.

**Verify:** negatives through the public `complete-state` boundary (baseline acceptance on an otherwise valid fixture, refusal for the named reason before any write, accepted neighbor): fenced fake task; leaked status/SHA; duplicate normalized ids; `blocked` header under a completed overview; plan task without a block; checklist instead of blocks; payload under Deferred Findings with the run slot empty (fails for ownership/payload semantics, never length); unresolved run line at completion; `{Task Name}` residue; an override with every other guard satisfied passes, the same receipt paired with an invalid sequence or delivery still refuses without writes. Compatibility: flow-style YAML, a single revision spelling, a goal journal with a failed record, an extracted phase and an approved deferral. Caller cases: `implement-preflight` accepts unwritten terminal headers; `review --scope p02` ignores future phases. Guards `journal-check-terminal-shape`, `journal-check-placement`, `journal-check-override-scope` each neutralized once. **Commit:** `feat(p02-t02): journal check at implement, review and completion boundaries`

---

### Task p02-t03: One-line dispatch record projection

**Files:** `packages/cli/src/commands/project/dispatch/{record,index}.ts` (+tests): `--format line` additive projection v1 with named fields (request id, configured target and formal `Dispatch:` stamp, launch status from the generic enum, raw child outcome, terminal classification from an explicit producer-to-outcome mapping, continuation references, optional observed identity and comparison), `·` delimited with backslash escaping and explicit null encoding, stdin preserved, `--json` keeps `status: validated-only`, the record and runtime identity and adds the projection, renderer writes nothing; `packages/cli/src/providers/identity/generic-dispatch-record.ts` untouched except the exported mapping; help snapshots; CLI reference section.

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/commands/help-snapshots.test.ts`; the published managed example renders; guard `run-line-terminality`: mapping neutralized → a `running` outcome classifies terminal; restored → non-terminal; `completed`, terminal-stop, `blocked-before-start` (no outcome) and continuation lines classify as designed; a `NEEDS_CONTEXT` with an open handle is non-terminal. **Commit:** `feat(p02-t03): one-line dispatch record projection`

---

### Task p02-t04: Journal templates with fixed slots

**Files:** `.oat/templates/implementation.md` (adds `## Reviews and Gates` and `## Deferred Findings` before `## Final Summary`; drops `## Implementation Log`, the per-phase `## Test Results` table and the Conventions blockquote; one free-text verification line per phase; keeps `## Deviations from Plan / Design`), `.oat/templates/implementation-brief.md` (same two slots; phase-unit records unchanged), `packages/cli/scripts/bundle-inputs.mjs` registration verified, template contract tests and scaffold tests (`project/new`), `packages/cli/assets/templates/*` regenerated (`git add -f`), the brief-contract §3 record-ownership table row for the journal (slots named).

**Verify:** `pnpm --filter @open-agent-toolkit/cli build`; scaffold tests; a scaffolded quick and brief project passes `journal check --at implement-preflight` with no residue findings once a phase section is filled; `oat:validate-skills`, `format:root`. **Commit:** `feat(p02-t04): journal templates with Reviews and Gates and Deferred Findings slots`

---

### Task p02-t05: Writer skills, closeout composition and phase-2 docs

**Files:** `.agents/skills/oat-project-implement/references/{phase-execution,completion-and-closeout,dispatch-and-dry-run,plan-and-resume}.md` (run line via `dispatch record --format line` under `## Orchestration Runs` updated in place; receipts, fix tasks and deferrals to their slots; `journal check --at implement-preflight` before Step 16 with the closeout invariant; `state.md` owns gate transitions, one terminal line per gate run in the journal; the old run-table instruction replaced), `oat-project-review-receive/SKILL.md` and `oat-project-review-receive-remote/SKILL.md` (receipt fields: finding identity and substance, disposition and rationale, fix-record or approved-deferral linkage, final outcome; review paths local-only; placement), `oat-project-revise/SKILL.md` (revision blocks in their phase), `oat-project-review-provide/SKILL.md` (`journal check --at review --scope`; refresh-only findings are not tasks), `oat-project-complete/SKILL.md` (existing no-write preflight; staged summary invocation; `journal check --at completion`; override recording in `## Deviations from Plan / Design` and the log; terminal prose rewrite of Final Summary and summary from observed facts; PR fields labelled as timestamped observations in the archived state), `oat-project-pr-progress`/`oat-project-pr-final` (receipt lines to the slot), agent roles if their journal instructions change, regenerated project-scope projections (`sync --scope project`), docs: `workflows/projects/execution/index.md` and the implementation-execution guidance, `closeout/closeout-skills.md`, the lifecycle and project-state-machine pages, `workflows/advanced/workflow-gates.md`, `reviews/index.md`, `reference/project-artifacts.md`, `reference/cli-reference.md` (`journal check`, `dispatch record --format line`), `.agents/docs/autonomy-contract.md` re-keys, contract tests re-pinned (`skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts`, `autonomy-gate-inventory.test.ts`).

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; `pnpm --filter oat-docs check`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared` green; `rg -n 'Implementation Log|Test Results table|HEAD~' .agents/skills/oat-project-implement/references` shows no surviving instruction to write the dropped sections; a scripted walk-through on a scratch quick project (implement one phase with a stubbed dispatch, receive one review with a fix and a deferral, complete) produces a journal that passes `journal check --at completion` with the receipt in the slot. **Commit:** `feat(p02-t05): journal writers target fixed slots; closeout validates before roll-up`

---

## Phase 3: Learning producers and archive identity

### Task p03-t01: Unified learning producers and the disabled-log rule (D14)

**Files:** `.agents/skills/oat-project-autonomous/SKILL.md` (learnings written with `project log append --type <mapped> --scope project --category <original> --source <per-observation id> --origin oat-project-autonomous --idempotency-key …`, observation/impact/recommendation/uncertainty body; mapping `gotcha`, `environment-limited` → `friction`; `efficiency`, `candidate-skill-content` → `worked-well`; `documentation-gap`, `decision` → `feedback`; when append no-ops because the log is disabled, one warning line and continue; never creates `oat-execution-learnings.md`), `.agents/skills/oat-cursor-cloud-projects/SKILL.md` and `references/cursor-cloud-mechanics.md` (same write), `.agents/skills/oat-project-goal/SKILL.md` learnings step and `oat-project-brief/references/brief-contract.md` §12 learnings clause (D14 replaces the disabled-log fallback), `packages/cli/src/commands/project/new/scaffold.test.ts` regression (no learnings file created in any mode), docs `workflows/advanced/autonomy.md`, `workflows/advanced/cursor-cloud.md`, `closeout/closeout-skills.md`, contract tests re-pinned, projections regenerated.

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; `rg -n 'oat-execution-learnings' .agents/skills apps/oat-docs/docs` lists only legacy-read sentences; guard `learning-source-identity` re-proved at the producer: with `--source` omitted the autonomous contract test fails; a scratch project with `workflow.projectLog: false` run through the autonomous learnings step emits the warning, creates no file, and summary/retro report "no learnings recorded". **Commit:** `feat(p03-t01): autonomous, cloud and goal learnings write the project log`

---

### Task p03-t02: Archive retry identity and locator finalization

**Files:** `packages/cli/src/commands/project/archive/archive-utils.ts` (+tests): persisted retry identity = project + originating scope + generation/snapshot identity bound to a canonical retained-artifact manifest (exclusions incl. `reviews/` and archive-owned derived fields specified once); an identical retry reuses the original local snapshot, dated export identity, S3 destination and receipt across dates and after source removal; conflicting or ambiguous candidates refuse before export, overwrite or remote mutation with follow-up-project guidance; the `49aeb5075` recordless synced retry, completed-ref matching, stale-source refusal and exact-root guards preserved; the summary export finalizes the digest's project/source locator to archive identity; `.oat-archive-source.json` gains the manifest hash and generation fields; docs `reference/cli-reference.md` archive section and `reference/project-artifacts.md`.

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/project/log`; guard `archive-retry-identity`: identity neutralized → a same-day retry of an identical project creates a timestamp-suffixed twin (the audit's five-pair shape); restored → reuses the snapshot; cross-date retry, source-absent resume, changed content (refuses), same slug in a different scope, synced ambiguous and mismatched identities (refuse) each probed without touching existing archives (scratch repo, stubbed S3). **Commit:** `feat(p03-t02): archive retry identity and locator finalization`

---

### Task p03-t03: Explicit archive generations

**Files:** `packages/cli/src/commands/project/archive/{index,push-runner,archive-utils}.ts`, archive option/result types (+tests), help snapshots, docs: `--new-generation <reason>` requires a non-empty reason and exactly one unambiguously resolved predecessor for the same project and originating scope; never overwrites the predecessor or bypasses synced source/ref guards; allocates and persists the new generation identity and predecessor binding before any export, copy or S3 side effect so an in-flight retry reuses that identity and receipt; an explicit subsequent generation is distinguished from a replay by a persisted `generation_request` id in the snapshot metadata; dry-run uses the same read-only evaluator and reports the proposed identity without persisting it. If the replay distinction cannot be specified during this task, the option is omitted, the task records why, and follow-up-project guidance stays (design, D11).

**Verify:** guard `archive-generation-authorization`: predecessor resolution neutralized → a generation is allocated with two candidates; restored → refused; a valid generation with one predecessor succeeds, its retry reuses the identity, a second explicit request allocates a new generation with the first as predecessor; dry-run persists nothing (tree and scratch S3 unchanged). **Commit:** `feat(p03-t03): explicit archive generations with predecessor binding`

---

## Phase 4: Acceptance, documentation audit, records and release

### Task p04-t01: Fresh lifecycle probes per mode

**Files:** `implementation.md` Phase 4 evidence entry only (scratch under `mktemp -d`, one fake HOME, compact fixtures already landed in p01–p03; large generated artifacts under ignored `analysis/`).

**Steps:** `pnpm build`; for each of quick, lite, brief and goal: scaffold, implement one phase with a dispatched (stubbed) run and the `--format line` record, one review round with a fix and a deferral through receive, an autonomous-style learning write (cloud and goal variants where applicable), summary refresh, retro evidence inventory, complete, archive twice (same day and with a changed date). Assert every discovery success criterion: no fenced payloads and one terminal run line per launch; receipts and deferrals in their slots and `## References` last; no template residue; the summary's observations section bounded with no structural entries and no live paths, the general ledger graduated; completion refusals for the injected failure shapes (each by name) with `complete-state` writing nothing; gate transitions once in `state.md`; learnings in the log with categories, legacy file absent, disabled-log warning case; archive retry reuses the snapshot; log header two lines. Reference every guard from the supplement with its probe outcome.

**Verify:** every probed command returns its expected categorical result; failures are fixed in the owning phase's files and re-probed. **Commit:** `chore(p04-t01): record lifecycle probes for artifact cleanup`

---

### Task p04-t02: Documentation audit and root AGENTS.md

**Files:** audit of every page named in design "Documentation" plus `apps/oat-docs/docs/reference/project-artifacts.md`, root `AGENTS.md` (Definition of Done and artifact-location guidance where the journal slots and `journal check` change), `apps/oat-docs/skill-docs.json` mappings, `apps/oat-docs/docs/skills/index.md` via `pnpm docs:skills:generate`, `apps/oat-docs/index.md` via `oat docs generate-index`, `NOTICES.md` untouched.

**Verify:** `rg -n 'Workflow Observations|oat-execution-learnings|Implementation Log|Test Results' apps/oat-docs/docs AGENTS.md .agents/skills` shows only the intended current descriptions (each remaining hit justified in the commit body); `pnpm build:docs`; `pnpm --filter oat-docs check`; `git diff --stat apps/oat-docs/index.md` shows only generated changes. **Commit:** `docs(p04-t02): documentation audit for artifact cleanup`

---

### Task p04-t03: Decision records and backlog

**Files:** after `node packages/cli/dist/index.js pjm doctor --json` confirms adoption: decision records via `oat decision new` for `summary-observations-digest` (D4), `canonical-journal-format-and-validator` (D5, D6), `journal-slots-and-state-owned-gates` (D7, D8), `learnings-in-project-log` (D3, D14), `archive-retry-identity-and-generations` (D11), `reviews-not-archived` (D2), `no-artifact-renames` (D3); backlog items for the deferred ideas in `discovery.md` and anything deferred in p01–p03; `oat decision regenerate-index`.

**Verify:** the index regenerates without conflict; `git status --short` clean after commit. **Commit:** `docs(p04-t03): decision records and backlog for artifact cleanup`

---

### Task p04-t04: Version bumps and the full gate run

**Files:** `git fetch origin main` first; bump every skill and agent role changed in p01–p04 whose version is not already strictly greater than `origin/main`; every exact version pin that names a bumped skill (the p08-t06 sweep command); lockstep versions in the five public `package.json` files and `packages/cli/assets/public-package-versions.json` strictly greater than fetched `origin/main`; regenerated projections via `oat sync --scope project`.

**Steps:** `FH=$(mktemp -d)` once; every gate as its own line with a captured exit code: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, `HOME=$FH pnpm exec turbo run test --force` (no `FULL TURBO`), `pnpm build` then `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, `pnpm format`.

**Verify:** every exit code 0; no expected red remains; failures fixed in the owning files before the phase closes; `git status --short` clean. **Commit:** `chore(p04-t04): version bumps for artifact cleanup`

After p04 is accepted: final integrated review, summary, document and `pr-final` per the configured sequence; the final PR is linked and left for Thomas to merge.

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                           | Reviewed Head | Invocation | Gate Target                                                   |
| ------ | -------- | -------- | ---------- | ---------------------------------- | ------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | pending  | -          | -                                  | -             | -          | -                                                             |
| p02    | code     | pending  | -          | -                                  | -             | -          | -                                                             |
| p03    | code     | pending  | -          | -                                  | -             | -          | -                                                             |
| p04    | code     | pending  | -          | -                                  | -             | -          | -                                                             |
| final  | code     | pending  | -          | -                                  | -             | -          | -                                                             |
| design | artifact | received | 2026-10-11 | references/astra-design-round-1.md | fd158b6f5     | manual     | Astra (gpt-6-astra, high) round 1: ALIGNED WITH CHANGES, 13   |
| design | artifact | received | 2026-10-11 | references/astra-design-round-2.md | e07fa3be7     | manual     | Astra round 2: ALIGNED WITH CHANGES, 7 narrowed; D14 recorded |
| plan   | artifact | pending  | -          | -                                  | -             | -          | -                                                             |

For code-review events, `Reviewed Head` is the full 40-character SHA at the head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate Target` is populated only for gate events.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks - Log categories and source identity, digest configuration, bounded roll-up digest, summary/log templates, summary and retro readers with the staged closeout invocation
- Phase 2: 5 tasks - Shared record reader, `journal check` at three boundaries, one-line dispatch record, journal templates with slots, writer skills and closeout composition
- Phase 3: 3 tasks - Unified learning producers (D14), archive retry identity, explicit generations
- Phase 4: 4 tasks - Lifecycle probes, documentation audit, decision records and backlog, version bumps and gates

**Total: 17 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design, revision 3; Astra rounds in `references/astra-design-round-{1,2,3}.md`)
- Discovery: `discovery.md` (D1–D14)
- Evidence (machine-local): `.oat/repo/analysis/2026-10-11-archived-artifact-audit.md`, `…-sol-review.md`
