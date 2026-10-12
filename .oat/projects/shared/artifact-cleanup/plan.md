---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-11
oat_phase: plan
oat_phase_status: complete
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

**Plan revision 5 (2026-10-11):** applies Astra plan round 1 (`references/astra-plan-round-1.md`, gpt-6-astra high, ALIGNED WITH CHANGES, 5 important / 2 minor): staged summary defers the Step 2.5 promotion append until `resume: roll-up`; the producer-contract guard no longer asserts a generic-append refusal; export-safe non-link source identity for synthesized recommendations; task-mode progress adoption of the shared reader proven through `parseTaskProgress`; mandatory dry-run/apply identity parity in p03-t02 and an executable omit branch for p03-t03; the p01-t04 scratch probe authors a summary and uses the branch dist under `HOME=$FH`; a phase-3 docs gate. **Plan revision 4 (2026-10-11):** applies the configured plan gate (`reviews/archived/artifact-plan-review-2026-10-11T162428Z.md`, codex-6-sol-xhigh, 0/0/7/1, passed at threshold high): recommendation ownership between the digest and Autonomous Execution Learnings stated; the `digest-bounded-projection` recipe corrected; override controls discriminate scope authorization; lossless-fold consumer controls (legacy-only, twin, learning-only freshness, missing category); a failing staged-closeout probe in p02-t07; the shared retry-identity evaluator and dry-run adoption made mandatory in p03-t02; protected fixtures separated from probe-owned archive destinations in p04-t01; per-phase `FH` setup. **Plan revision 3 (2026-10-11):** applies artifact review round 2 (`reviews/archived/plan-review-2026-10-11-round2.md`, 0/0/1/2): `src/providers/identity` added to the p02-t02 and p02-t05 runners; three docs paths spelled from `apps/oat-docs/docs/`; the design body sentence on the summary template aligned with alignment note 2. **Plan revision 2 (2026-10-11):** applies the structured plan artifact review round 1 (`reviews/archived/plan-review-2026-10-11-round1.md`, Fable 5.1 high, 0/3/9/5): the three unowned writers of the dropped `## Implementation Log` section and the dispatch adapter skill join the writer task; the summary template keeps no `## Workflow Observations` heading and roll-up gains an `omitted` outcome; the Outstanding Items destination is declared; phase 2 reordered (renderer before validator) and split (evaluator / CLI integration; writers / docs and walkthrough); locator grammar, override line grammar and the staged summary signal defined; decision records cover D1–D12 and D14; pin inventory completed; `p01-t01`'s guard re-pointed at the new category refusal; docs paths spelled from `apps/oat-docs/docs/`. Design alignment notes recorded in `design.md` (no design re-review needed per the reviewer).

**Goal:** Make OAT lifecycle artifacts readable and trustworthy for the projects that will be archived from now on, by fixing the writers rather than the names: a bounded observations digest instead of a verbatim log copy in `summary.md`; one canonical journal format with a shared record reader and a mode-aware validator at three boundaries; a producer-made one-line run record; fixed journal slots and slimmer templates moved together with every writer; `state.md` as the owner of gate transitions; `oat-execution-learnings.md` folded into `project-log.md` across all three producers; archive retries that cannot create twins; and documentation moved in the same phase as each contract. Decisions D1–D14 in `discovery.md`; design revision 3 in `design.md` (Astra rounds 1–3 in `references/`).

**Architecture:** Four sequential, integration-complete phases. Phase 1 lands the log and summary contract (grammar, digest, config, readers, templates). Phase 2 lands journal and lifecycle enforcement (shared reader, `journal check`, run-line renderer, journal templates, every writer skill, closeout composition). Phase 3 lands the learning producers and archive identity. Phase 4 is acceptance: fresh lifecycle probes, the documentation audit, decision and backlog records, version bumps and the full gate run. Each phase owns the documentation sections for its contracts; later phases verify, never finish, earlier consumers.

**Tech Stack:** TypeScript ESM (Node 22), vitest, oxlint/oxfmt, Markdown skill contracts under `.agents/skills`, templates under `.oat/templates` registered in `packages/cli/scripts/bundle-inputs.mjs`, Fumadocs under `apps/oat-docs`, decision records via `oat decision new`.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): project-log judgment categories and source identity`

**Integration base:** `feat/freestyle-project-workflow` after the `brief-goal-workflow-modes` goal phases (p12) are accepted; re-read brief-contract §12, the goal skill's learnings clause and `implementation-brief.md` at phase start (D13). Dispatch ceiling frontier; no HiLL checkpoints (brief-mode default carried over; `oat_plan_hill_phases: ['p04']` is the quick-mode spelling of "final only, auto-reviewed").

**Expected-red policy (design "Probe and testing"):** every phase re-pins the contract tests for the files it edits in the same phase (`skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts`, template contract tests, help snapshots). The only phase-crossing expected red is `check:skill-bumps` until p04-t04. Before each phase runs, the root freezes the exact expected-red list for that phase (test, obsolete contract, reason, owner task) in the journal; nothing else may be red at a phase's review.

**Phase-start setup (every phase, every resumed shell):** `FH=$(mktemp -d); test -d "$FH" && test -z "$(ls -A "$FH")"` before the first `HOME=$FH` run; one fake HOME per phase, deleted at the end; `pnpm --filter @open-agent-toolkit/control-plane build` and `pnpm --filter @open-agent-toolkit/cli build` before any CLI-scoped run.

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

Every new refusal is proven at its public boundary: an otherwise valid case, baseline acceptance recorded, post-change refusal for the named reason, and a minimally different accepted neighbor. Projection changes assert the old versus new _output_ of a successful command, never the refusal of valid input. Compatibility cases (accepted by both versions) are listed separately from negatives. Each assurance-bearing guard is neutralized once to show its assertion fails for the intended reason. Named guards: `learning-category-validation` (p01-t01), `digest-bounded-projection` (p01-t03), `digest-ledger-graduation-intact` (p01-t03), `record-reader-ownership` (p02-t01), `run-line-terminality` (p02-t02), `journal-check-terminal-shape` (p02-t03), `journal-check-placement` (p02-t03), `journal-check-override-scope` (p02-t03), `learning-source-identity` (p03-t01), `archive-retry-identity` (p03-t02), `archive-generation-authorization` (p03-t03). p04-t01 references each by name with its probe result. Compatibility cases (accepted by both versions, listed per task) are never counted as negatives.

---

## Phase 1: Log and summary contract

### Task p01-t01: Project-log judgment categories and source identity

**Files:** `packages/cli/src/commands/project/log/grammar.ts` (judgment body head fields `**Category:**`, `**Source:**`, `**Origin:**`, `**Recorded:**`; the six categories `gotcha`, `efficiency`, `documentation-gap`, `candidate-skill-content`, `decision`, `environment-limited`; heading regexes unchanged), `log/append.ts` (`--category`, `--source`, `--origin` for judgment entries, category validated, `--idempotency-key` honored for judgment entries so a retry appends nothing), `log/check.ts` (parsed entries expose the fields; `learnings: legacy` when `oat-execution-learnings.md` exists), the shared log parser used by `rollup.ts`/`synthesize.ts` (+tests for each). The existing `--idempotency-key` contract (`append.ts` already returns `already-appended` for any entry whose body carries the key as a word) is reused, not reimplemented: the producer passes the per-observation source id as the key and embeds it in the `**Source:**` body head so the existing word check accepts it.

**Steps:** RED tests for each flag, the unknown-category refusal, `--category` without `--source` refused, and the legacy report; GREEN; keep existing logs parsing byte-identically (fixture of a real archived log: `.oat/projects/archived/lite-workflow-mode/project-log.md` copied as a compact fixture with provenance header).

**Verify:** `pnpm --filter @open-agent-toolkit/control-plane build`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log src/commands/help-snapshots.test.ts`; guard `learning-category-validation`: category validator neutralized → `--category bogus` accepted; restored → refused with the named reason; `--category` without `--source` refused; a valid category plus source accepted. Compatibility (both versions): an entry without `--category` is accepted; a retried append with the same `--idempotency-key` appends nothing. **Commit:** `feat(p01-t01): project-log judgment categories and source identity`

---

### Task p01-t02: Digest configuration

**Files:** `packages/cli/src/config/oat-config.ts` (sibling object `workflow.projectLogDigest` with positive-integer `maxEntries` default 12 and `maxLines` default 60; `workflow.projectLog` untouched), `packages/cli/src/config/resolve.ts` (resolved leaf keys `workflow.projectLogDigest.maxEntries`/`.maxLines` under local/shared/user/default precedence; defaults), `packages/cli/src/commands/config/index.ts` if the key list is enumerated there (+tests), `apps/oat-docs/docs/reference/configuration.md` (the two keys beside `workflow.projectLog`).

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/config`; a public `oat config get workflow.projectLogDigest.maxEntries` on a scratch repo resolves the default, a shared override, and coexists with `workflow.projectLog: false`; a non-integer value is refused by the reader. **Commit:** `feat(p01-t02): workflow.projectLogDigest configuration`

---

### Task p01-t03: Bounded observations digest in roll-up

**Files:** `packages/cli/src/commands/project/log/rollup.ts` (+test): Workflow Observations renders judgment entries only, newest first then category priority (`decision`, `gotcha` first) then heading text, capped by `maxEntries`/`maxLines` with an omitted-count trailer; concise per-item rendering (heading line, first observation sentence, limitations and uncertainty; a recommendation is rendered only for entries without a category, because categorized entries' synthesized recommendations are owned by the summary skill's `## Autonomous Execution Learnings` section, and the same rule applies to a standalone roll-up); each item carries date, type, area, category and a collision-safe entry identity plus the project/source locator as a non-link token `oat-project:<slug>#<entry-id>` (entry-id = date, type, area and a per-entry ordinal; no Markdown link is emitted; p03-t02 rewrites the token to the archive identity at export); obsolete `.oat/projects/shared/...` or synced paths in selected bodies removed or labelled; `writeSummarySection` gains a third outcome `summarySection: 'omitted'` that removes an existing empty `## Workflow Observations` section and never creates one when the digest is empty, exposed under `--json`; counts by producer and omitted sources under `--json`; general-scope ledger graduation (`rollup.ts` ledger path, dedupe, failure semantics) untouched; `ambiguous` refusal and structured failure routing untouched; a single cross-reference line to the summary's Autonomous Execution Learnings section when category-bearing entries exist. Shared-source control: one category-bearing learning rendered through both roll-up and the summary skill appears exactly once as a recommendation (in Autonomous Execution Learnings) and once as an observation line (in the digest), never twice as a recommendation.

**Verify:** projection regressions on valid fixture logs assert successful results in both versions and reject the _old output_ (structural entries, a live shared path, over-bound content present) while the new output omits, sanitizes and bounds them and keeps eligible judgment content, identities, omitted counts and complete ledger graduation; ambiguity/unreadable-input refusals are separate cases with unchanged output bytes. Runner: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log`; pins re-pinned here: `rollup.test.ts`, `lifecycle.integration.test.ts` (both pin the current `## Workflow Observations` output). The export-destination, duplicate-heading and non-default `summaryExportPath` assertions belong to p03-t02. Guards: `digest-bounded-projection` (the unchanged regression assertion fails against the over-bound output produced with the bound neutralized, passes after the bound is restored, and passes on the within-bound neighbor; command success is reported separately from assertion success), `digest-ledger-graduation-intact` (graduation filtered by digest selection → a general judgment beyond the cap is missing from the ledger; restored → present). **Commit:** `feat(p01-t03): bounded observations digest in project-log rollup`

---

### Task p01-t04: Summary and project-log templates

**Files:** `.oat/templates/project-log.md` (header reduced to two lines and a docs link; sample entry dropped; frontmatter unchanged), `.oat/templates/summary.md` (no `## Workflow Observations` heading is added — the CLI appends or omits that section; the `## Autonomous Execution Learnings` HTML comment, which still says "when the project contains oat-execution-learnings.md", is replaced by the category-bearing rule plus a one-line note that the CLI owns the observations section; template lines must not quote their own headings outside heading lines, per `template-heading-literals.test.ts`), `packages/cli/scripts/bundle-inputs.mjs` (registration verified, no rewrite), the template contract tests that pin template text (`template-heading-literals.test.ts`, `skills-bundled-docs-contract.test.ts`, the `project/new` scaffold tests), `packages/cli/assets/templates/*` regenerated through normal tooling (`git add -f` for the tracked copies as p08 did).

**Verify:** `pnpm --filter @open-agent-toolkit/cli build`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/tools src/commands/init/tools/shared/template-heading-literals.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`; in a scratch repository, with every CLI probe run as `HOME="$FH"` and the absolute path to this branch's freshly built `packages/cli/dist/index.js` (never a bare `oat`, which may select the installed CLI) and no ambient user-template override: scaffold quick with `--with-project-log`, assert the two-line log header, author a minimal valid `summary.md`, then roll up its empty log and assert `summarySection: 'omitted'` and no `## Workflow Observations` heading. **Commit:** `feat(p01-t04): slim project-log header and digest summary template`

---

### Task p01-t05: Summary and retro readers, staged closeout invocation, phase-1 docs

**Files:** `.agents/skills/oat-project-summary/SKILL.md` (reads unified log entries with categories first and `oat-execution-learnings.md` second, deduplicating by source identity; new or changed learning-source identities invalidate freshness independently of task/phase freshness; the staged invocation contract, stated verbatim: "Staged invocation: the caller states `staged: true`; the summary skill completes Steps 0–5, writes frontmatter, and stops; the caller later states `resume: roll-up` to run Step 6 onward; standalone invocations run straight through"; in staged mode Step 2.5 performs only the read-only log check and identifies promotion candidates, and any selected `project` → `general` append is deferred until the caller sends `resume: roll-up` after final journal validation, executed before Step 6 so full-set ledger graduation stays intact; before suspension the invocation writes only summary sections and their freshness metadata; standalone behavior, seal/ambiguity routing and the promotion consent rule are unchanged, and the complete skill's inline fallback follows the same rule; the `**Workflow Observations coexistence contract:**` and `one-line cross-reference` sentences updated for the digest; the relative learning-file pointer instruction for synthesized recommendations replaced by export-safe, non-link source identity: unified-log sources use p01-t03's `oat-project:<slug>#<entry-id>` token and retain every supporting source identity without deriving a different entry id, legacy sources retain their exact timestamp/category/title as self-contained provenance without claiming an adjacent exported file is retrievable, distinct source pointers preserved when recommendations are deduplicated; the summary template's pointer comment updated to match), `.oat/templates/project-retro.md` (evidence source list: unified log first, `oat-execution-learnings` legacy second), `.agents/skills/oat-project-retro/SKILL.md` and `references/evidence-and-lanes.md` (unified first, legacy second, evidence order and strength rules preserved), `apps/oat-docs/docs/workflows/projects/execution/project-log.md` (category, source, digest), `apps/oat-docs/docs/workflows/projects/closeout/retro.md`, `apps/oat-docs/docs/reference/cli-reference.md` (bullets for `log append --category/--source/--origin`, `log check` legacy report, `log rollup` digest, `omitted` outcome and `--json`), `.agents/docs/autonomy-contract.md` for any re-keyed prompt site, the contract tests that pin summary/retro text (`skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts` which pins the summary step order, the coexistence contract, `## Workflow Observations`, `## Autonomous Execution Learnings` and the cross-reference sentence).

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; `pnpm --filter oat-docs check`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared` green (phase-1 pins moved in this task); `rg -n 'oat-execution-learnings' .agents/skills/oat-project-summary .agents/skills/oat-project-retro` shows only the legacy-second read. Reader controls on a scratch project (compact fixtures): a legacy-only learnings file is consumed by both summary and retro; a proven twin (same timestamp, category and title in the log and the legacy file) is emitted once while a distinct same-title lesson is kept; a learning-only change (new source id, task and phase state held constant) marks the summary stale and a refresh renders it; a changed recommendation under an unchanged phase fingerprint is re-rendered. **Commit:** `feat(p01-t05): summary and retro read unified learnings; staged closeout invocation`

---

### Task p01-t06: (review) Add the learnings-fingerprint placeholder to the summary template

**Files:**

- Modify: `.oat/templates/summary.md` (placeholder frontmatter gains `oat_summary_learnings_fingerprint: none` beside the three existing tracking fields)
- Modify: any template contract test that enumerates the summary frontmatter keys

**Step 1: Understand the issue**

Review finding L1 (`p01-review-2026-10-12T012710Z.md`): the template's placeholder frontmatter lists `oat_summary_last_task`, `oat_summary_revision_count` and `oat_summary_includes_revisions` but not `oat_summary_learnings_fingerprint`, which the summary skill now writes in every workflow mode (Step 5). No CLI reader uses a strict key set, so this is a preview gap only.
Location: `.oat/templates/summary.md:9-11`

**Step 2: Implement fix**

Add `oat_summary_learnings_fingerprint: none` to the placeholder block; re-pin whichever contract test enumerates those keys.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli build; HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/init/tools/shared/template-heading-literals.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: green; a scaffolded summary carries the placeholder.

**Step 4: Commit**

`fix(p01-t06): summary template previews the learnings fingerprint field`

---

### Task p01-t07: (review) Document the minimum useful projectLogDigest.maxLines

**Files:**

- Modify: `apps/oat-docs/docs/reference/configuration.md` (state the minimum useful `maxLines`, about 6: the first item plus the reserved trailer and cross-reference lines)
- Modify: `packages/cli/src/commands/config/index.ts` (the `workflow.projectLogDigest.maxLines` catalog description states the same minimum)
- Modify: `packages/cli/src/commands/project/log/rollup.test.ts` (one test pinning the edge: a `maxLines` below the first item plus the reserve yields `rendered: 0`, the trailer and the cross-reference only, and the bound still holds)

**Step 1: Understand the issue**

Review finding L2: the fit check reserves the trailer and cross-reference blocks before the first item, so a `maxLines` below the first item's lines plus that reserve writes a section with `rendered: 0` and only the trailer. The bound holds and the default (60) is unaffected; this is a configuration edge.
Location: `packages/cli/src/commands/project/log/rollup.ts:342-350`

**Step 2: Implement fix**

Document the minimum beside the key in the docs and the config catalog; pin the edge with one test. Do not change the bound semantics.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log src/commands/config; pnpm --filter oat-docs check`
Expected: green.

**Step 4: Commit**

`fix(p01-t07): document the minimum useful projectLogDigest.maxLines`

---

## Phase 2: Journal and lifecycle enforcement

### Task p02-t01: Shared journal record reader

**Files:** `packages/control-plane/src/state/journal-records.ts` (new, +test): heading-only record reader with source locations, explicit heading ownership (a task block ends at the next heading of equal or higher level), fenced and indented code excluded, shared phase/task identity normalization (`p1`/`p01`, `prev1`/`p-rev1`), raw records retained (duplicates visible), exactly-one-owned `**Status:**` and `**Commit:**` extraction; `packages/control-plane/src/state/tasks.ts` task-mode progress consumes it with unchanged public results on the existing fixtures; barrel export; the production frontmatter reader used for journal and state metadata (malformed, missing and non-terminal distinguished).

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/control-plane exec vitest run` (all existing progress fixtures unchanged); guard `record-reader-ownership`: ownership neutralized → a status line under a fenced fake task heading, and a status leaked from the next section, are attributed to the wrong task; restored → attributed correctly; a plain valid journal reads identically; duplicate normalized ids are both returned; a flow-style YAML frontmatter fixture (the audit's false positive) parses. Consumer adoption: the fenced-fake-task and leaked-status fixtures run through the public task-mode `parseTaskProgress` with the real new reader count neither fake nor unowned completion, while the minimally different owned-status fixture does, and existing valid-fixture results are preserved; neutralize progress's adoption (restore the old raw-line scan) → these assertions fail; restore. **Commit:** `feat(p02-t01): shared journal record reader with ownership and fence exclusion`

---

### Task p02-t02: One-line dispatch record projection

**Files:** `packages/cli/src/commands/project/dispatch/{record,index}.ts` (+tests): `--format line` additive projection v1 with named fields (request id, configured target and formal `Dispatch:` stamp, launch status from the generic enum, raw child outcome, terminal classification, continuation references, optional observed identity and comparison), `·` delimited with backslash escaping and explicit null encoding, stdin preserved, `--json` keeps `status: validated-only`, the record and runtime identity and adds the projection, renderer writes nothing; `packages/cli/src/providers/identity/generic-dispatch-record.ts` exports the producer-to-outcome terminal mapping (consumed unchanged by p02-t03); help snapshots (`project dispatch record --help` and the `project` listing); `apps/oat-docs/docs/reference/cli-reference.md` bullet.

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/providers/identity src/commands/help-snapshots.test.ts`; the published managed example renders; guard `run-line-terminality`: mapping neutralized → a `running` outcome classifies terminal; restored → non-terminal; `completed`, terminal-stop, `blocked-before-start` (no outcome) and continuation lines classify as designed; a `NEEDS_CONTEXT` with an open handle is non-terminal. **Commit:** `feat(p02-t02): one-line dispatch record projection`

---

### Task p02-t03: Journal evaluator and rules

**Files:** `packages/cli/src/commands/project/journal-check/{evaluator,rules,types}.ts` (+fixture suite): pure evaluator; boundaries `implement-preflight|review|completion` with `scope` for review; rules per design (task modes: plan ids ↔ unique blocks through p02-t01's reader, one owned terminal status, commit evidence or approved scope disposition, overview totals; brief/goal via the landed phase-unit, milestones, delivery-coverage and goal-audit readers with failed/cancelled/no-change records valid and approved deferrals never normalized; status agreement with `state.md` through the production frontmatter reader; placement across the whole journal: blocks in their phase, receipts in the owning phase or `## Reviews and Gates`, deferrals in `## Deferred Findings`, `## References` last, dispatch payloads refused anywhere except explicitly marked quoted evidence, every run line (p02-t02's projection, parsed with its exported mapping) terminal at completion, no template residue); override line grammar, the only shape the checker accepts, one line under `## Deviations from Plan / Design`: `**Override:** <scope-disposition-approved|evidence-lost|operator-accepted-gap> · **Authorized by:** <decision id> · **Scope:** <pNN-tNN|pNN> · <reason>`; output `{status, reasons:[{code,path,line,owner}]}`.

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check`; negatives on an otherwise valid fixture (baseline accepted by the old `complete-state` evaluator, refused by the new evaluator for the named reason, beside an accepted neighbor): fenced fake task; leaked status/SHA; duplicate normalized ids; `blocked` header under a completed overview; plan task without a block; checklist instead of blocks; payload under Deferred Findings with the run slot empty (ownership/payload semantics, never length); unresolved run line at completion (from real `--format line` output); `{Task Name}` residue; override controls on an otherwise valid journal with exactly one eligible gap (a completed task block missing owned commit evidence): refused without an override; accepted with a matching code, scope and decision id; refused when only the scope is changed to another task or phase; a malformed override line is refused. Compatibility: flow-style YAML; a single revision spelling; a goal journal with a failed record, an extracted phase and an approved deferral. Caller cases: `implement-preflight` accepts unwritten terminal headers; `review --scope p02` ignores future phases. Same-bytes comparison: feed identical plan/journal bytes to real control-plane task progress and to the evaluator and assert the intended completion count and the evaluator's owned-record finding independently (no mocked reader, expected values not derived from either implementation), including normalized revision identity and raw duplicate visibility. Guards `journal-check-terminal-shape`, `journal-check-placement`, `journal-check-override-scope` (scope guard neutralized → the wrong-scope override is accepted; restored → refused) each neutralized once. **Commit:** `feat(p02-t03): journal evaluator with mode-aware rules and three boundaries`

---

### Task p02-t04: `oat project journal check` and lifecycle integration

**Files:** `packages/cli/src/commands/project/journal-check/index.ts` (command: `--project`, `--at`, `--scope`, `--json`, read-only; `project/index.ts` registration; help snapshots incl. the `project` listing), `closeout-check/index.ts` unchanged as the sequence/goal invariant, `complete-state/index.ts` rechecks the invariant and the final evaluator immediately before its write and writes nothing on refusal (+tests through the public `complete-state` boundary: the p02-t03 negatives re-run here as baseline-accept/new-refuse before any state write, with the override line idempotent on code + scope + decision id), `apps/oat-docs/docs/reference/cli-reference.md` bullet for `journal check`.

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state src/commands/project/closeout-check src/commands/help-snapshots.test.ts`; the override triple (no override / matching override / wrong-scope override) re-run through `complete-state` with byte-identical state on each refusal; the same override receipt paired with an invalid sequence or delivery still refuses without writes; `node packages/cli/dist/index.js project journal check --help` renders. **Commit:** `feat(p02-t04): journal check command and complete-state integration`

---

### Task p02-t05: Journal templates with fixed slots

**Files:** `.oat/templates/implementation.md` (adds `## Reviews and Gates` and `## Deferred Findings` before `## Final Summary`; drops `## Implementation Log`, the per-phase `## Test Results` table and the Conventions blockquote; one free-text verification line per phase; keeps `## Deviations from Plan / Design`; the `## Orchestration Runs` comment is replaced by the one-line-per-request-id rule, the `orchestration-runs-start/end` markers stay because `promote.brief.test.ts` locates them; Outstanding Items — excluded parallel phases and unmerged worktrees — move to lines under `## Deferred Findings`), `.oat/templates/implementation-brief.md` (same two slots; drops `## Implementation Log` as well; phase-unit records unchanged), `packages/cli/scripts/bundle-inputs.mjs` registration verified, the template contract tests (`template-heading-literals.test.ts`, `skills-bundled-docs-contract.test.ts`, the `project/new` scaffold tests, `promote.brief.test.ts`, `stamp.test.ts`), `packages/cli/assets/templates/*` regenerated (`git add -f`), the brief-contract §9 record-ownership table row for the journal (slots named).

**Verify:** `pnpm --filter @open-agent-toolkit/cli build`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/project/promote src/commands/init/tools/shared/template-heading-literals.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/project/dispatch src/providers/identity/stamp.test.ts`; a scaffolded quick and brief project passes `journal check --at implement-preflight` with no residue findings once a phase section is filled; `oat:validate-skills`, `format:root`. **Commit:** `feat(p02-t05): journal templates with Reviews and Gates and Deferred Findings slots`

---

### Task p02-t06: Writer skills and agent roles target the slots

**Files:** `.agents/skills/oat-project-implement/references/{phase-execution,completion-and-closeout,dispatch-and-dry-run,plan-and-resume}.md` (run line via `dispatch record --format line` under `## Orchestration Runs` updated in place; receipts, fix tasks and deferrals to their slots; `journal check --at implement-preflight` before Step 16 with the closeout invariant; `state.md` owns gate transitions, one terminal line per gate run in the journal; `phase-execution.md` excluded-phase reporting (currently the Outstanding Items table) → `## Deferred Findings` lines), `.agents/skills/oat-project-dispatch-subagents/SKILL.md` (the caller's run-record instruction points at `dispatch record --format line` and the in-place update rule), `oat-project-complete-auto/SKILL.md` (exception block → `## Deviations from Plan / Design`, never end-of-file), `oat-project-reconcile/SKILL.md` (session entry → the owning phase section, or `## Deviations from Plan / Design` when no phase owns it), `oat-worktree-bootstrap-auto/SKILL.md` (baseline warning → `## Deviations from Plan / Design`), `oat-project-review-receive/SKILL.md` and `oat-project-review-receive-remote/SKILL.md` (receipt fields: finding identity and substance, disposition and rationale, fix-record or approved-deferral linkage, final outcome; review paths local-only; placement), `oat-project-revise/SKILL.md` (revision blocks in their phase), `oat-project-review-provide/SKILL.md` (`journal check --at review --scope`; refresh-only findings are not tasks), `oat-project-complete/SKILL.md` (existing no-write preflight; the summary-status preflight (lines ~396–406) also compares `oat_summary_learnings_fingerprint` with `summary_learnings_fingerprint` from the summary skill in every mode and treats a mismatch or missing field as `stale` (p01 review M1); Step 3.5 runs the summary skill staged (`staged: true`), then `journal check --at completion`, then Step 3.7 resumes roll-up (`resume: roll-up`); the inline fallback honors the same suspension point; writes the override line exactly as p02-t03 defines it, idempotent on code + scope + decision id; terminal prose rewrite of Final Summary and summary from observed facts; writes `oat_pr_status_observed_at` (UTC) beside `oat_pr_status` before archive — D12's writer), `oat-project-pr-progress`/`oat-project-pr-final` (receipt lines to the slot), agent roles if their journal instructions change, regenerated project-scope projections (`sync --scope project`), contract tests re-pinned (`skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts`, `autonomy-gate-inventory.test.ts`).

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared` green; `rg -n '## Implementation Log|## Test Results|end of the file' .agents/skills .agents/agents .oat/templates` returns zero hits (each surviving hit justified in the commit body). **Commit:** `feat(p02-t06): journal writers target fixed slots; closeout validates before roll-up`

---

### Task p02-t07: Phase-2 docs, autonomy re-keys and the scripted walkthrough

**Files:** `apps/oat-docs/docs/workflows/projects/execution/index.md` and `apps/oat-docs/docs/workflows/projects/execution/implementation-execution.md`, `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md`, `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `apps/oat-docs/docs/reference/project-state-machine.md`, `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `apps/oat-docs/docs/reference/project-artifacts.md` (slots, run lines, override line, local-only review paths, `oat_pr_status_observed_at`), `.agents/docs/autonomy-contract.md` re-keys for every prompt site p02-t06 changed, `apps/oat-docs/skill-docs.json` if a skill gains a docs section.

**Verify:** `pnpm --filter oat-docs check`; `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts`; a scripted walk-through on a scratch quick project (implement one phase with a stubbed dispatch producing a real `--format line` record, receive one review with a fix and a deferral, complete) produces a journal that passes `journal check --at completion` with the receipt in the slot and the override line absent; and a failing staged-closeout probe: the same project with one journal defect the early closeout invariant permits but the final checker rejects (a payload under Deferred Findings), driven through the complete skill: the authorized terminal-prose refresh may land, but no repo-ledger graduation, no seal append, no archive or export and no lifecycle advance occur (assert the ledger, log tail, archive directory and `state.md` lifecycle fields byte-identical); the accepted neighbor (defect removed) resumes roll-up and closes normally; a standalone summary invocation on the defective project still runs straight through. The failing fixture includes one unsealed project-scoped judgment with a selected promotion: refusal leaves the project log byte-identical with no promotion entry; the accepted neighbor performs the deferred append and the subsequent ledger graduation; a standalone summary still performs its normal promotion flow. **Commit:** `docs(p02-t07): journal and closeout documentation for the fixed slots`

---

### Task p02-t08: (review) Align receipt placement for task-scoped and revision reviews

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (owning phase from a task-id scope via `normalizeTaskId(token)?.phaseId`)
- Modify: `packages/cli/src/commands/project/journal-check/evaluator.test.ts` (two cases beside "receipt appended after References": task-scoped receipt in its phase accepted; `p-revN` receipt in `## Phase p-revN` accepted, in the corrected phase refused)
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md` (Step 7: a `p-revN` receipt lives in the `## Phase p-revN` section the revise skill creates, or under `## Reviews and Gates`; a task-scoped receipt lives in the task's phase)
- Modify: any contract test pinning that Step 7 sentence

**Step 1: Understand the issue**

Review finding (`p02-review-2026-10-12T024507Z.md`): M1: review-receive Step 7 tells a `p-revN` receipt to live in the phase it corrects and never covers task-scoped receipts; the evaluator derives the owning phase from the first scope token and refuses both as `receipt-misplaced`.
Location: `.agents/skills/oat-project-review-receive/SKILL.md:667`, `packages/cli/src/commands/project/journal-check/rules.ts:663-669`

**Step 2: Implement fix**

Derive the owning phase from a task-id scope in the evaluator; make the skill text match the evaluator for `p-revN`; add the two evaluator cases.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/validation src/commands/init/tools/shared; pnpm oat:validate-skills`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p02-t08): receipt placement agrees between review-receive and the journal evaluator`

---

### Task p02-t09: (review) Completion posture: in_progress is routed back, not accepted

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md` (Step 3.0: replace the `in_progress` bullet; journal and state must agree at completion, an `in_progress` project routes back to `oat-project-implement`; status disagreement is not an override-eligible gap)
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md` (line ~94: accepts `pr_open` or `complete`)
- Modify: `review-skill-contracts.test.ts` if it pins the bullet

**Step 1: Understand the issue**

Review finding (`p02-review-2026-10-12T024507Z.md`): M2: Step 3.0 and lifecycle.md still promise that completion accepts `in_progress`; the completion evaluator and `complete-state` refuse `state-status-disagrees`.
Location: `.agents/skills/oat-project-complete/SKILL.md:478`, `apps/oat-docs/docs/workflows/projects/lifecycle.md:94`

**Step 2: Implement fix**

One-paragraph skill and docs alignment; no code change.

**Step 3: Verify**

Run: `pnpm oat:validate-skills; pnpm format:root; pnpm --filter oat-docs check; HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p02-t09): completion posture docs match the status-agreement rule`

---

### Task p02-t10: (review) Fail closed when a planned project has no journal at completion

**Files:**

- Modify: `packages/cli/src/commands/project/complete-state/index.ts` (when `plan.md` exists but `implementation.md` does not, refuse with a `journal-missing` reason and write nothing; a plan-less fixture keeps the old behavior)
- Modify: `packages/cli/src/commands/project/complete-state/journal.test.ts` and the existing journal-less completion tests (plan-less fixtures where the old behavior is intended; one new refusal case)

**Step 1: Understand the issue**

Review finding (`p02-review-2026-10-12T024507Z.md`): L1: a project without `implementation.md` bypasses the final evaluator entirely; every scaffold writes a journal, so the only way to reach this branch is deleting it.
Location: `packages/cli/src/commands/project/complete-state/index.ts:96`

**Step 2: Implement fix**

Fail closed for planned journal-less projects with a named reason code; keep plan-less fixtures green.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/complete-state src/commands/project/closeout-check src/commands/project/journal-check`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p02-t10): complete-state refuses a planned project with no journal`

---

### Task p02-t11: (review) Evaluate oat_ready_for agreement at completion

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (at `completion`, journal `oat_ready_for` must be `null` or a closeout skill name; otherwise `state-status-disagrees` with the field named)
- Modify: `packages/cli/src/commands/project/journal-check/evaluator.test.ts` (stale `oat_ready_for: oat-project-implement` under `oat_status: complete` refused; `null` and `oat-project-complete` accepted)

**Step 1: Understand the issue**

Review finding (`p02-review-2026-10-12T024507Z.md`): L2: design "Status agreement" lists journal `oat_status`/`oat_ready_for`; the evaluator checks `oat_status` and the pointer only.
Location: `packages/cli/src/commands/project/journal-check/rules.ts:175-196`

**Step 2: Implement fix**

Add the `oat_ready_for` check at the completion boundary with a test pair.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p02-t11): journal evaluator checks oat_ready_for agreement at completion`

---

### Task p02-t12: (review) Anchor the template-residue brace pattern to placeholder vocabulary

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (`BRACE_PLACEHOLDER`: match only the template's placeholder vocabulary or brace tokens that start a list item or follow a `**…:**` marker; `{Task Name}` control stays refused)
- Modify: `packages/cli/src/commands/project/journal-check/evaluator.test.ts` (prose `returns {status, reasons}` outside inline code accepted; `{Task Name}` residue still refused)

**Step 1: Understand the issue**

Review finding (`p02-review-2026-10-12T024507Z.md`): L3: the brace pattern matches any `{word …}` outside inline code, so ordinary prose is refused as `template-residue`.
Location: `packages/cli/src/commands/project/journal-check/rules.ts:893`

**Step 2: Implement fix**

Narrow the pattern; keep the residue guard green.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p02-t12): template-residue check ignores ordinary brace prose`

---

## Phase 3: Learning producers and archive identity

### Task p03-t01: Unified learning producers and the disabled-log rule (D14)

**Files:** `.agents/skills/oat-project-autonomous/SKILL.md` (learnings written with `project log append --type <mapped> --scope project --category <original> --source <per-observation id> --origin oat-project-autonomous --idempotency-key …`, observation/impact/recommendation/uncertainty body; mapping `gotcha`, `environment-limited` → `friction`; `efficiency`, `candidate-skill-content` → `worked-well`; `documentation-gap`, `decision` → `feedback`; when append no-ops because the log is disabled, one warning line and continue; never creates `oat-execution-learnings.md`), `.agents/skills/oat-cursor-cloud-projects/SKILL.md` and `references/cursor-cloud-mechanics.md` (same write), `.agents/skills/oat-project-goal/SKILL.md` (lines 146 commit-path list, 161 and 167 fallback references, 600–606 capture step) and `oat-project-brief/references/brief-contract.md` §12.10 (lines 693–714) plus the §12.3 `delivered → aligning` row that cites it (D14 replaces the disabled-log fallback; the producer's `--idempotency-key` is the per-observation source id, embedded in the `**Source:**` body head so the existing word check accepts it), `packages/cli/src/commands/project/new/scaffold.test.ts` regression (no learnings file created in any mode), docs `apps/oat-docs/docs/workflows/advanced/autonomy.md`, `apps/oat-docs/docs/workflows/advanced/cursor-cloud.md`, `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md`, contract tests re-pinned, projections regenerated.

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; `rg -n 'oat-execution-learnings' .agents/skills apps/oat-docs/docs` lists only legacy-read sentences; guard `learning-source-identity` at the producer contract: separately remove the category argument and the per-observation source argument from an otherwise valid learning-write instruction and confirm the producer contract assertion fails for the missing field, restore each and confirm it passes; generic append is not required to reject an uncategorized judgment (p01-t01's uncategorized compatibility case stays accepted); the actual categorized producer call with a stable source/key succeeds and a replay appends nothing; a scratch project with `workflow.projectLog: false` run through the autonomous learnings step emits the warning, creates no file, and summary/retro report "no learnings recorded". **Commit:** `feat(p03-t01): autonomous, cloud and goal learnings write the project log`

---

### Task p03-t02: Archive retry identity and locator finalization

**Files:** `packages/cli/src/commands/project/archive/archive-utils.ts` (+tests): persisted retry identity = project + originating scope + generation/snapshot identity bound to a canonical retained-artifact manifest (exclusions incl. `reviews/` and archive-owned derived fields specified once); an identical retry reuses the original local snapshot, dated export identity, S3 destination and receipt across dates and after source removal; conflicting or ambiguous candidates refuse before export, overwrite or remote mutation with follow-up-project guidance; the `49aeb5075` recordless synced retry, completed-ref matching, stale-source refusal and exact-root guards preserved; one shared read-only identity evaluator owns retry identity for both apply and dry-run, and `push-runner.ts` adopts it so the public dry-run reports the persisted snapshot/export identity an identical retry would reuse rather than deriving a new dated identity (this substep is mandatory in p03-t02 whether or not p03-t03 ships the generation option); the summary export rewrites p01-t03's `oat-project:<slug>#<entry-id>` tokens to the archive identity; `.oat-archive-source.json` gains the manifest hash and generation fields; the exported summary is verified from its destination directory (`.oat/repo/reference/project-summaries/`) including duplicate-heading sources and a non-default `archive.summaryExportPath`; export a summary containing both the CLI digest and skill-authored Autonomous Execution Learnings and assert from the destination that unified-source tokens in both sections finalize to the same persisted archive identity, supporting entry identities stay distinct, neither section emits a bare relative project-log or legacy-learning-file link, and a legacy-only synthesized recommendation survives as self-contained provenance; docs `apps/oat-docs/docs/reference/cli-reference.md` archive bullets and `apps/oat-docs/docs/reference/project-artifacts.md`.

**Verify:** `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/project/log`; guard `archive-retry-identity`: identity neutralized → a same-day retry of an identical project creates a timestamp-suffixed twin (the audit's five-pair shape); restored → reuses the snapshot; cross-date retry, source-absent resume, changed content (refuses), same slug in a different scope, synced ambiguous and mismatched identities (refuse) each probed without touching existing archives (scratch repo, stubbed S3). Preview/apply parity (mandatory even if p03-t03 omits generations): for retained-source, cross-date and source-absent ordinary retries invoke the public archive dry-run and apply against the same persisted snapshot identity and assert matching snapshot id, local archive path, summary export identity/path and S3 destination; dry-run changes no filesystem bytes, refs, metadata or stubbed S3 objects; these checks fail if the runner retains its old current-date derivation. **Commit:** `feat(p03-t02): archive retry identity and locator finalization`

---

### Task p03-t03: Explicit archive generations

**Files:** `packages/cli/src/commands/project/archive/{index,push-runner,archive-utils}.ts`, archive option/result types (+tests), help snapshots, docs: `--new-generation <reason>` requires a non-empty reason and exactly one unambiguously resolved predecessor for the same project and originating scope; never overwrites the predecessor or bypasses synced source/ref guards; allocates and persists the new generation identity and predecessor binding before any export, copy or S3 side effect so an in-flight retry reuses that identity and receipt; an explicit subsequent generation is distinguished from a replay by a persisted `generation_request` id in the snapshot metadata; dry-run uses the same read-only evaluator and reports the proposed identity without persisting it. If the replay distinction cannot be specified during this task, the option is omitted, the task records why, and follow-up-project guidance stays (design, D11).

**Verify:** If the option ships: guard `archive-generation-authorization`: predecessor resolution neutralized → a generation is allocated with two candidates; restored → refused; a valid generation with one predecessor succeeds, its retry reuses the identity, a second explicit request allocates a new generation with the first as predecessor; dry-run persists nothing (tree and scratch S3 unchanged). If the option is omitted: record the bounded reason and a follow-up backlog item; verify no generation option or behavior is advertised (help snapshot, docs), conflicting reopened content still refuses with follow-up-project guidance, and every mandatory p03-t02 retry/preview control passes; record `archive-generation-authorization: not applicable — option omitted` rather than a fabricated pass (p04-t01 accepts this documented branch and still requires every mandatory guard result). Runner: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts`. Phase-3 documentation gate, whether or not generations ship: `pnpm --filter oat-docs check` after all phase-3 docs and mapping updates, exit code captured and required zero. **Commit:** `feat(p03-t03): explicit archive generations with predecessor binding`

---

## Phase 4: Acceptance, documentation audit, records and release

### Task p04-t01: Fresh lifecycle probes per mode

**Files:** `implementation.md` Phase 4 evidence entry only (scratch under `mktemp -d`, one fake HOME, compact fixtures already landed in p01–p03; large generated artifacts under ignored `analysis/`).

**Steps:** `pnpm build`; for each of quick, lite, brief and goal: scaffold, implement one phase with a dispatched (stubbed) run and the `--format line` record, one review round with a fix and a deferral through receive, an autonomous-style learning write (cloud and goal variants where applicable), summary refresh, retro evidence inventory, complete, archive twice (same day and with a changed date). Assert every discovery success criterion: no fenced payloads and one terminal run line per launch; receipts and deferrals in their slots and `## References` last; no template residue; the summary's observations section bounded with no structural entries and no live paths, the general ledger graduated; completion refusals for the injected failure shapes (each by name) with `complete-state` writing nothing; gate transitions once in `state.md`; learnings in the log with categories, legacy file absent, disabled-log warning case; archive retry reuses the snapshot; log header two lines. Reference every guard from the supplement with its probe outcome. Protected non-mutation surfaces, separated from probe-owned outputs: before the run, record content hashes of the pre-existing protected fixtures (a copy of three real archived projects placed under the scratch archive root, and the stubbed S3 bucket's pre-seeded objects) and of every sealed `project-log.md` that existed before the probe; after the run those hashes must match and only the named fresh outputs (the probe projects' archives, exports and objects) may be new; after the first archive of each probe project take a second baseline and prove the identical retry adds no snapshot, export or object.

**Verify:** every probed command returns its expected categorical result; failures are fixed in the owning phase's files and re-probed. Two named legacy-learning rows (p01 review L3): on a scratch project whose legacy `oat-execution-learnings.md` holds one proven twin of a categorized log entry and one same-title distinct lesson, (a) the summary skill emits one recommendation for the twin under its `oat-project:` token and keeps the distinct lesson, and (b) the retro evidence inventory lists the legacy file second and consumes it; both rows are agent-run, not prose pins. **Commit:** `chore(p04-t01): record lifecycle probes for artifact cleanup`

---

### Task p04-t02: Documentation audit and root AGENTS.md

**Files:** audit of every page named in design "Documentation" plus `apps/oat-docs/docs/reference/project-artifacts.md`, root `AGENTS.md` (Definition of Done and artifact-location guidance where the journal slots and `journal check` change), `apps/oat-docs/skill-docs.json` mappings, `apps/oat-docs/docs/skills/index.md` via `pnpm docs:skills:generate`, `apps/oat-docs/index.md` via `oat docs generate-index`, `NOTICES.md` untouched.

**Verify:** `rg -n 'Workflow Observations|oat-execution-learnings|Implementation Log|Test Results' apps/oat-docs/docs AGENTS.md .agents/skills` shows only the intended current descriptions (each remaining hit justified in the commit body); `pnpm build:docs`; `pnpm --filter oat-docs check`; `git diff --stat apps/oat-docs/index.md` shows only generated changes. **Commit:** `docs(p04-t02): documentation audit for artifact cleanup`

---

### Task p04-t03: Decision records and backlog

**Files:** after `node packages/cli/dist/index.js pjm doctor --json` confirms adoption: decision records via `oat decision new` for `writers-only-fresh-output-measurement` (D1), `reviews-not-archived` (D2), `no-artifact-renames` (D3), `summary-observations-digest` (D4), `canonical-journal-format-and-validator` (D5, D6), `journal-slots-and-state-owned-gates` (D7, D8), `closeout-refresh-and-prose-rewrite` (D9, D10), `archive-retry-identity-and-generations` (D11), `archived-pr-status-is-an-observation` (D12), `learnings-in-project-log` (D3, D14); backlog items for the deferred ideas in `discovery.md` and anything deferred in p01–p03; `oat decision regenerate-index`.

**Verify:** the index regenerates without conflict; `git status --short` clean after commit. **Commit:** `docs(p04-t03): decision records and backlog for artifact cleanup`

---

### Task p04-t04: Version bumps and the full gate run

**Files:** `git fetch origin main` first; bump every skill and agent role changed in p01–p04 whose version is not already strictly greater than `origin/main`; every exact version pin that names a bumped skill (the p08-t06 sweep command); lockstep versions in the five public `package.json` files and `packages/cli/assets/public-package-versions.json` strictly greater than fetched `origin/main`; regenerated projections via `oat sync --scope project`.

**Steps:** `FH=$(mktemp -d)` once; every gate as its own line with a captured exit code: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, `HOME=$FH pnpm exec turbo run test --force` (no `FULL TURBO`), `pnpm build` then `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, `pnpm format`.

**Verify:** every exit code 0; no expected red remains; failures fixed in the owning files before the phase closes; `git status --short` clean. **Commit:** `chore(p04-t04): version bumps for artifact cleanup`

After p04 is accepted: final integrated review, summary, document and `pr-final` per the configured sequence; the final PR is linked and left for Thomas to merge.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target                                                                                                                                               |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-10-12 | reviews/archived/p01-review-2026-10-12T012710Z.md           | c6b98bcac0408788ba03303f81c50123bf962c44 | auto       | round 1: 0/0/1/3; M1 and L3 aligned in plan; L1→p01-t06, L2→p01-t07; fixes landed 0bce1f045, d905d0110                                                    |
| p01    | code     | passed          | 2026-10-12 | reviews/archived/p01-review-2026-10-12T013544Z.md           | a359c4524044ac4a8b74ad1739dc7fce1d25d730 | auto       | round 2 (narrowed to 5c7e60601..d905d0110): 0/0/0/0; M1/L3 plan alignments and L1/L2 fixes verified                                                       |
| p02    | code     | fixes_completed | 2026-10-12 | reviews/archived/p02-review-2026-10-12T024507Z.md           | a9ee702f55d3ce000927edf4c50ce73f5adc3af2 | auto       | round 1: 0/0/2/3; all five converted (p02-t08..p02-t12); fixes landed cbaaefbcb..3607948f4                                                                |
| p03    | code     | pending         | -          | -                                                           | -                                        | -          | -                                                                                                                                                         |
| p04    | code     | pending         | -          | -                                                           | -                                        | -          | -                                                                                                                                                         |
| final  | code     | pending         | -          | -                                                           | -                                        | -          | -                                                                                                                                                         |
| design | artifact | received        | 2026-10-11 | references/astra-design-round-1.md                          | fd158b6f5                                | manual     | Astra (gpt-6-astra, high) round 1: ALIGNED WITH CHANGES, 13                                                                                               |
| design | artifact | received        | 2026-10-11 | references/astra-design-round-2.md                          | e07fa3be7                                | manual     | Astra round 2: ALIGNED WITH CHANGES, 7 narrowed; D14 recorded                                                                                             |
| design | artifact | passed          | 2026-10-11 | references/astra-design-round-3.md                          | c2648e860                                | manual     | Astra round 3: ALIGNED; duplicate body removed, labels synced                                                                                             |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/plan-review-2026-10-11-round1.md           | 3117624163e79ffbd04418af5f5c94af264f0335 | manual     | Fable 5.1 high round 1: 0/3/9/5; all applied in plan revision 2                                                                                           |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/plan-review-2026-10-11-round2.md           | 91b3727bf48912d91f735d946ff7133a474ac777 | manual     | round 2: 0/0/1/2, all 17 round-1 findings resolved; applied in revision 3                                                                                 |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/artifact-plan-review-2026-10-11T162428Z.md | 91b3727bf48912d91f735d946ff7133a474ac777 | gate       | codex-6-sol-xhigh: 0/0/7/1, passed at threshold high; applied in revision 4                                                                               |
| plan   | artifact | fixes_added     | 2026-10-11 | references/astra-plan-round-1.md                            | 6a5a7986bcab5880f240961c43306ec1150d6c1a | manual     | Astra (gpt-6-astra, high) plan round 1: ALIGNED WITH CHANGES, 5 important / 2 minor; applied in revision 5                                                |
| plan   | artifact | passed          | 2026-10-11 | references/astra-plan-round-2.md                            | 6ddc7476114babe72d7307d2c41f2ac45fcc3709 | manual     | Astra plan round 2: ALIGNED; plan revision 5 approved by the orchestrator per the autonomous-run rules (D13); ready for oat-project-implement, not active |
| plan   | artifact | received        | 2026-10-11 | reviews/artifact-plan-review-2026-10-11T162428Z.md          | -                                        | -          | -                                                                                                                                                         |

For code-review events, `Reviewed Head` is the full 40-character SHA at the head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate Target` is populated only for gate events.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 7 tasks - Log categories and source identity, digest configuration, bounded roll-up digest, summary/log templates, summary and retro readers with the staged closeout invocation, two review fix tasks (template placeholder, maxLines minimum)
- Phase 2: 12 tasks - Shared record reader, one-line dispatch record, journal evaluator, `journal check` command and complete-state integration, journal templates with slots, writer skills and roles, phase-2 docs and walkthrough, five review fix tasks (receipt placement, completion posture docs, journal-missing refusal, oat_ready_for agreement, brace residue pattern)
- Phase 3: 3 tasks - Unified learning producers (D14), archive retry identity, explicit generations
- Phase 4: 4 tasks - Lifecycle probes, documentation audit, decision records and backlog, version bumps and gates

**Total: 26 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design, revision 3 final; Astra rounds in `references/astra-design-round-{1,2,3}.md`)
- Discovery: `discovery.md` (D1–D14)
- Evidence (machine-local): `.oat/repo/analysis/2026-10-11-archived-artifact-audit.md`, `…-sol-review.md`
