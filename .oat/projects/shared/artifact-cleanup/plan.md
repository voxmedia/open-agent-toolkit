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

**Files:** `packages/cli/src/commands/project/archive/{index,push-runner,archive-utils}.ts`, archive option/result types (+tests), help snapshots, docs: `--new-generation <reason>` requires a non-empty reason and exactly one unambiguously resolved predecessor for the same project and originating scope; never overwrites the predecessor or bypasses synced source/ref guards; allocates and persists the new generation identity and predecessor binding before any export, copy or S3 side effect so an in-flight retry reuses that identity and receipt; a replay is distinguished from a new generation by the manifest-hash match against same-scope candidates, with the persisted `generationRequest` id recorded as the request witness (p03 review L1 alignment); dry-run uses the same read-only evaluator and reports the proposed identity without persisting it. If the replay distinction cannot be specified during this task, the option is omitted, the task records why, and follow-up-project guidance stays (design, D11).

**Verify:** If the option ships: guard `archive-generation-authorization`: predecessor resolution neutralized → a generation is allocated with two candidates; restored → refused; a valid generation with one predecessor succeeds, its retry reuses the identity, a second explicit request allocates a new generation with the first as predecessor; dry-run persists nothing (tree and scratch S3 unchanged). If the option is omitted: record the bounded reason and a follow-up backlog item; verify no generation option or behavior is advertised (help snapshot, docs), conflicting reopened content still refuses with follow-up-project guidance, and every mandatory p03-t02 retry/preview control passes; record `archive-generation-authorization: not applicable — option omitted` rather than a fabricated pass (p04-t01 accepts this documented branch and still requires every mandatory guard result). Runner: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts`. Phase-3 documentation gate, whether or not generations ship: `pnpm --filter oat-docs check` after all phase-3 docs and mapping updates, exit code captured and required zero. **Commit:** `feat(p03-t03): explicit archive generations with predecessor binding`

---

### Task p03-t04: (review) Warn when --new-generation resolves to an existing generation

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`archiveProjectOnCompletion`: when `options.newGenerationReason != null` and the identity disposition is `retry`, push a warning naming the existing generation and snapshot and stating that the reason was not recorded)
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts` (`buildDryRunReport` emits the same warning line)
- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (one test asserting the warning text in apply and dry-run)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): M1: content identical to an existing archive plus `--new-generation` exits 0 with `warnings: []` and no text signal; the validated reason is discarded.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:1152`, `push-runner.ts:193`

**Step 2: Implement fix**

Keep deviation (d) (unchanged content resolves to the latest generation) but make it audible in both modes.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t04): warn when --new-generation resolves to an existing generation`

---

### Task p03-t05: (review) Deterministic local archive path for scope-qualified and empty-base identities

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`new` disposition: when `snapshotName` is scope-qualified, `archivePath = <archived root>/<project>-<scope>` and refuse if it exists, mirroring `allocateArchiveGeneration`; when the base path exists but is empty, use the base path; never a clock-derived suffix)
- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (extend `same slug from a different scope` to assert the local path and dry-run/apply `archivePath` parity; one empty-base-path case)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): M2: the `new` branch returns `resolveUniqueArchivePath`'s timestamp-suffixed path whenever the base directory exists, so a different-scope archive and an empty base directory land at `demo5-2026…` names that differ between dry-run and apply and from `repo archive sync`'s hydrated name.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:1206` (and `resolveUniqueArchivePath` 624–636)

**Step 2: Implement fix**

Derive the local path from the identity, not the clock.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t05): deterministic archive path for scope-qualified and empty-base identities`

---

### Task p03-t06: (review) Reason codes on archive refusals and the occupant recovery hint

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (stable codes `archive-retry-ambiguous`, `archive-retry-conflict`, `archive-occupant-unverifiable`, `archive-generation-synced`, `archive-generation-reason`, `archive-generation-no-predecessor`, `archive-generation-ambiguous-predecessor`, `archive-generation-pending`, `archive-generation-path-occupied`; the occupant refusal says to inspect and remove a partial copy left by an interrupted archive and retry, otherwise record reopened work in a follow-up project)
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts` (JSON error carries `code`)
- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (pin each code)
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` (`#archive-identity` lists the codes)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): M3: the eight new refusals are prose-only and the JSON error has no `code`; the unverifiable-occupant message points a crash leftover at a follow-up project.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:1183` (and 957, 1048, 1134, 1179–1187, 1245–1297), `push-runner.ts:392`

**Step 2: Implement fix**

Design "Error Handling": archive guard fails closed with a reason code; fix the hint.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts; pnpm --filter oat-docs check`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t06): reason codes on archive refusals and the occupant recovery hint`

---

### Task p03-t07: (review) Content-conflict refusal names the latest generation

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (choose the candidate with the highest generation, mention `allocation: pending` when set)
- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (one case with generations 1–5 present)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): L2: `sameIdentity[0]` is the alphabetically first candidate, so the refusal points the operator at the oldest snapshot.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:1178`

**Step 2: Implement fix**

Name the latest generation in the message.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t07): content-conflict refusal names the latest generation`

---

### Task p03-t08: (review) Recordless synced dry-run resolves identity through the completed ref

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (export `resolveRecordlessSyncedArchiveIdentity`)
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts` (when `projectScope === 'synced'` and there is no record, call it to supply `persistedSnapshot`/`sourceRefSha` to the evaluator in both modes)
- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (recordless synced project with several candidates: dry-run and apply report the same identity, or both refuse)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): L3: with several synced candidates and no record, the preview reports today's date while the apply binds via the completed ref or refuses.
Location: `packages/cli/src/commands/project/archive/push-runner.ts:290`, `archive-utils.ts:1118–1121, 1391`

**Step 2: Implement fix**

Close the known parity gap the implementer and reviewer both flagged.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/help-snapshots.test.ts`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t08): recordless synced dry-run resolves identity through the completed ref`

---

### Task p03-t09: (review) Test the .git exclusion for shared-scope archives

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (one shared-scope case with a nested `.git/HEAD`: absent from the archive, source and archive manifest hashes equal)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): L4: `ARCHIVE_RETENTION_EXCLUSIONS` now excludes `.git` for every scope, but only synced cases are tested.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:268`

**Step 2: Implement fix**

Add the control; no behaviour change.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`test(p03-t09): shared-scope archives exclude .git`

---

### Task p03-t10: (review) Autonomous learning commit identity uses the written source id

**Files:**

- Modify: `.agents/skills/oat-project-autonomous/SKILL.md` (show the call as `LEARNING_SOURCE="autonomous-$RUN_ID-NN"; oat_record_learning <category> "$LEARNING_SOURCE" …` so the commit block's `--identity` suffix is the id just written; `oat_record_learning` itself stays byte-identical across the three producers)
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md` and `oat-project-goal/SKILL.md` if their commit blocks have the same gap
- Modify: `packages/cli/src/commands/init/tools/shared/learning-producer-contracts.test.ts` (pin the assignment)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T035735Z.md`): L5: the persist block uses `$LEARNING_SOURCE`, which nothing assigns, so every learning commits under an empty identity suffix.
Location: `.agents/skills/oat-project-autonomous/SKILL.md:464`

**Step 2: Implement fix**

Assign the variable at the call site; run `oat sync --scope project`.

**Step 3: Verify**

Run: `pnpm oat:validate-skills; HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/learning-producer-contracts.test.ts`
Expected: green; the named negative control fails with the guard neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t10): autonomous learning commits carry the written source id`

---

### Task p03-t11: (review) Replay warning states the persisted generation reason

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`newGenerationReplayWarning` picks `generationReason`; when persisted, say the archive was allocated for that reason and no new generation was allocated)
- Modify: `archive-retry-identity.test.ts` (extend the explicit-generation replay test to assert the wording)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T042217Z.md`, round 2): L1: the warning says "the reason was not recorded" even when replaying an explicit generation whose reason is persisted.
Location: `archive-utils.ts:968`

**Step 2: Implement fix**

Correct the clause on the replay path; keep the warning audible.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t11): replay warning states the persisted generation reason`

---

### Task p03-t12: (review) Reason codes on the recordless synced and persisted-path refusals

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`ArchiveIdentityError` with `archive-synced-recordless-unbound`, `archive-synced-recordless-ambiguous`, and `archive-retry-ambiguous` for `resolvePersistedArchivePath`; add the two new codes to `ARCHIVE_IDENTITY_REFUSAL_CODES`)
- Modify: `archive-retry-identity.test.ts` (pin the codes in the recordless synced describe)
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` (codes table)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T042217Z.md`, round 2): L2: the recordless synced refusals now surface in dry-run as plain `CliError`s with `code: undefined`, contradicting the docs table's promise.
Location: `archive-utils.ts:1546, 1566, 704`

**Step 2: Implement fix**

Make every refusal carry a code, as the table promises.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive; pnpm --filter oat-docs check`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t12): reason codes on the recordless synced and persisted-path refusals`

---

### Task p03-t13: (review) Treat an empty scope-qualified directory as free

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (scope-qualified occupancy check uses `pathExists && !isEmptyDirectory`, mirroring the base-path rule)
- Modify: `archive-retry-identity.test.ts` (empty `<project>-<scope>` directory reused; non-empty metadata-less one refused)

**Step 1: Understand the issue**

Review finding (`p03-review-2026-10-12T042217Z.md`, round 2): L3: an empty `<project>-<scope>` directory is refused while an empty base directory is reused.
Location: `archive-utils.ts:1293`

**Step 2: Implement fix**

One rule for empty directories at both paths.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p03-t13): treat an empty scope-qualified archive directory as free`

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

### Task p04-t05: (review) Correct the p04-t01 guard evidence and make the guard runs real

**Files:**

- Modify: `.oat/projects/shared/artifact-cleanup/implementation.md` (only the `### Task p04-t01` block: replace the `guards.txt` pointer with the real location and cite how each guard was run)
- Add: `.oat/repo/analysis/2026-10-12-artifact-cleanup-p04-probes/scripts/guards.sh` (gitignored evidence; runs the eleven named guards by their real vitest titles under a fake HOME and writes `out/guards.txt` with per-guard exit codes and counts)

**Step 1: Understand the issue**

Review finding M1 (`p04-review-2026-10-12T051738Z.md`): the p04-t01 entry cites `guards.txt`, which does not exist (results live at `out/results.txt`), and says the eleven guards were "run by name"; three guard names (`learning-category-validation`, `digest-bounded-projection`, `digest-ledger-graduation-intact`) exist only as comments in their test files, so `vitest -t <guard>` matches zero tests and exits 0 with everything skipped. All eleven pass when run by their real titles; this is an evidence-record defect.
Location: `implementation.md:916`, `:921`

**Step 2: Implement fix**

Write `scripts/guards.sh` that runs each guard by its real test file and title (`vitest run <file> -t '<exact title>'`), fails if a filter matches zero tests, and records per-guard results to `out/guards.txt`; run it once under `HOME=$FH`; rewrite the p04-t01 evidence sentence to cite `out/results.txt` and `out/guards.txt` with the exact invocations.

**Step 3: Verify**

Run: `bash .oat/repo/analysis/2026-10-12-artifact-cleanup-p04-probes/scripts/guards.sh` (under `HOME=$FH`)
Expected: eleven guards, each with a non-zero matched-test count and exit 0; `out/guards.txt` written; `grep -c 'guards.txt' implementation.md` resolves to a real path.

**Step 4: Commit**

`chore(p04-t05): correct the p04-t01 guard evidence pointer and record real guard runs`

---

### Task p04-t06: (review) Replay-warning docs sentence matches both messages

**Files:**

- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` (lines ~254–256: a `--new-generation` replay resolves to that generation and warns that no new generation was allocated, naming the persisted reason when the predecessor was itself an explicit generation)

**Step 1: Understand the issue**

Final review L2 (`final-review-2026-10-12T052402Z.md`): the docs say a replay "warns that the reason was not recorded", but since p03-t11 that text appears only when the matched archive has no persisted reason.
Location: `apps/oat-docs/docs/reference/project-artifacts.md:254-256`

**Step 2: Implement fix**

Reword the sentence; docs only.

**Step 3: Verify**

Run: `pnpm --filter oat-docs check`
Expected: exit 0.

**Step 4: Commit**

`docs(p04-t06): replay-warning sentence covers both messages`

---

### Task p04-t07: (review) Empty generation directory is reusable like the other archive paths

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`allocateArchiveGeneration`: throw `archive-generation-path-occupied` only when the `<project>-gN` path exists and is non-empty, using `isEmptyDirectory` like the base and scope-qualified checks)
- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (one accepted-neighbor case: an empty `<project>-gN` directory is reused; the existing occupied-path case stays refused)

**Step 1: Understand the issue**

Final review L3: p03-t13 made empty base and scope-qualified directories reusable and the docs say so, but `allocateArchiveGeneration` still refuses any existing `<project>-gN` path on `pathExists` alone, so an operator who emptied a half-copied generation directory per the occupant hint is refused on the next `--new-generation`.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:1397-1403`

**Step 2: Implement fix**

One rule for empty directories at all three paths.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: green; with the guard reverted to bare `pathExists`, the new case fails.

**Step 4: Commit**

`fix(p04-t07): empty generation directory is reusable`

---

### Task p04-t08: (review) Rehash the existing archive before adopting a retry

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (before a `retry` disposition is acted on: compute the candidate archive's current manifest hash and require agreement with both its recorded `manifestHash` and the source manifest; a damaged candidate refuses with a stable code, e.g. `archive-retry-candidate-damaged`, without changing either copy; the same check guards the source-absent resume path)
- Modify: `archive-retry-identity.test.ts` (damaged-archive refusal beside the unchanged-retry accepted control: archive, restore the intact source, damage one archived file leaving metadata unchanged → refused, source and archive untouched; unchanged retry still reuses)
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` (code table)

**Step 1: Understand the issue**

Exit-gate finding (`final-review-2026-10-12T055711Z.md`, codex-6-sol-xhigh): H1: the evaluator trusts `candidate.metadata.manifestHash` without rehashing the candidate's retained bytes, so a retry against a damaged archive skips the copy and removes the intact source, leaving only the damaged copy (breaks D11's identical-snapshot contract).
Location: `archive-utils.ts:1197` (and the source removal at ~2966)

**Step 2: Implement fix**

Verify the candidate's actual bytes before export, publication or deletion.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t08): rehash the existing archive before adopting a retry`

---

### Task p04-t09: (review) Detect each fenced payload independently in the journal evaluator

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (`fencedBlocks`: parse each actual fence with its own opener, closer, info string and preceding marker instead of grouping consecutive excluded lines; keep individually marked `quoted-evidence` fences accepted)
- Modify: `evaluator.test.ts` (two compositions: a marked quoted-evidence fence immediately followed by an unmarked dispatch payload → `dispatch-payload`; a four-space indented line immediately before a payload fence → `dispatch-payload`; the isolated marked evidence fence stays accepted)

**Step 1: Understand the issue**

Exit-gate finding (`final-review-2026-10-12T055711Z.md`, codex-6-sol-xhigh): M1: `fencedBlocks` groups consecutive non-record lines, so a marked evidence fence immediately followed by an unmarked payload exempts both, and an indented line before a payload hides it; both return `ok` while the isolated payload refuses (D6 refusal contract).
Location: `packages/cli/src/commands/project/journal-check/rules.ts:779`

**Step 2: Implement fix**

Parse fences individually.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t09): detect each fenced payload independently`

---

### Task p04-t10: (review) Digest honors the whole-section line limit

**Files:**

- Modify: `packages/cli/src/commands/project/log/rollup.ts` (the omission trailer and the categorized-learning cross-reference count against `maxLines`; when they cannot fit, render the bounded subset the limit allows, never exceed it; full-set ledger graduation unchanged)
- Modify: `rollup.test.ts` (one categorized entry with `maxLines: 1` and `2` renders at most that many lines; `3`, `5`, `60` controls unchanged)
- Modify: `apps/oat-docs/docs/reference/configuration.md` only if the documented minimum changes

**Step 1: Understand the issue**

Exit-gate finding (`final-review-2026-10-12T055711Z.md`, codex-6-sol-xhigh): M2: the trailer and cross-reference are appended unconditionally after the fit check, so `maxLines: 1` or `2` renders three lines (D4 whole-section bound).
Location: `packages/cli/src/commands/project/log/rollup.ts:386`

**Step 2: Implement fix**

Bound the final rendered blocks (or refuse unsupported values explicitly through configuration); keep graduation independent of rendering.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t10): digest honors the whole-section line limit`

---

### Task p04-t11: (review) Count digest origins without inherited object properties

**Files:**

- Modify: `packages/cli/src/commands/project/log/rollup.ts` (`byProducer` as a null-prototype dictionary or `Map` with explicit serialization)
- Modify: `rollup.test.ts` (an origin named `__proto__` counts as one rendered entry and `Object.prototype` is untouched; an ordinary origin control)

**Step 1: Understand the issue**

Exit-gate finding (`final-review-2026-10-12T055711Z.md`, codex-6-sol-xhigh): L1: `byProducer` is a plain object, so an origin named `__proto__` mutates `Object.prototype.rendered` and emits `byProducer: {}`.
Location: `packages/cli/src/commands/project/log/rollup.ts:328`

**Step 2: Implement fix**

Null-prototype tally.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t11): count digest origins without inherited properties`

---

### Task p04-t12: (review) Export selected review references as plain provenance

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`finalizeSummaryArchiveLocators`: local review links such as `[text](reviews/…)` become a labelled filename or source identity; real external links intact)
- Modify: `archive-retry-identity.test.ts` or the export tests (a judgment containing a review link exports as plain provenance; an external link survives)

**Step 1: Understand the issue**

Exit-gate finding (`final-review-2026-10-12T055711Z.md`, codex-6-sol-xhigh): L2: a judgment observation containing `[the review](reviews/final.md)` survives the digest and export unchanged, presenting an unreachable link (reviews are not archived, D2/D4).
Location: `packages/cli/src/commands/project/log/rollup.ts:300` / archive finalizer

**Step 2: Implement fix**

Extend the finalizer to review links.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/project/log`
Expected: green; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t12): export review references as plain provenance`

---

### Task p04-t13: (review) One retention set: `pr/` excluded from local copy, manifest, S3 and hydration

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`ARCHIVE_RETENTION_EXCLUSIONS` gains `pr`; derive `S3_ARCHIVE_SYNC_EXCLUDES` from that set so one list defines the retained archive; copy filter at ~L2974, manifest at ~L822, upload at ~L3133 all read the same set; the damaged-archive hint at ~L1108 stays true)
- Modify: `packages/cli/src/commands/repo/archive/sync-runner.ts` (~L114: hydration excludes come from the same exported set)
- Modify: `archive-retry-identity.test.ts` (beside "accepts a retry whose only difference is review evidence": archive a project with `pr/final.md`, hydrate through `runArchiveSyncCommand` with a fake `aws` that honors `--exclude`, retry with the source absent → disposition `retry`, never `archive-retry-candidate-damaged`; control: with `pr` removed from the manifest exclusions the same case is refused), `archive-utils.test.ts` and `index.test.ts` pins of the exclude list, `sync-runner.test.ts`
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` (~L195, ~L226-228, ~L253: `pr/` is process evidence like `reviews/`, not retained in archives or S3) and any other docs sentence listing the retained set; check `finalizeSummaryArchiveLocators` treats `pr/…` links like `reviews/…` links (p04-t12) and extend it if the exported summary can link to `pr/`

**Step 1: Understand the issue**

External PR review W1 (`reviews/archived/external-pr-review-2026-10-12T065140Z.md`, verified High): the identity manifest hashes `pr/` while S3 upload and hydration exclude `pr/*`, so an intact S3 restore of any project with a `pr/` dir reads as `archive-retry-candidate-damaged` on the source-absent retry; the refusal's own recovery hint reproduces the damaged state.

**Step 2: Implement fix**

One retention set, applied identically to the local copy, the manifest, the upload and the hydration; the reviewer's intentional PR exclusion is preserved (root decision in the review artifact).

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/repo/archive` and `pnpm --filter oat-docs check`; the new round-trip test fails with the manifest exclusion neutralized and passes restored.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t13): exclude pr/ from the archive retention set everywhere`

---

### Task p04-t14: (review) Never copy archive-owned entries from the source

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (~L2977: the source copy filter also rejects `ARCHIVE_OWNED_ENTRIES`, so a source reopened by copying its archive never overwrites the pending allocation written at ~L2941-2950)
- Modify: `archive-retry-identity.test.ts` (under "explicit archive generations" beside "persists the allocation before any side effect": reopen by copying the g1 archive including `.oat-archive-source.json`, request g2 with a `copyDirectory` that runs the production filter and throws after the dotfile would be admitted → `demo-g2/.oat-archive-source.json` still says `generation: 2, allocation: pending`, and the next request resumes `…-demo-g2` instead of `archive-generation-ambiguous-predecessor`; control: pre-fix filter copies the g1 metadata)

**Step 1: Understand the issue**

External PR review W2 (verified Medium): the copy filter consults only `ARCHIVE_RETENTION_EXCLUSIONS`, so a predecessor's `.oat-archive-source.json` is copied over the g2 pending marker; `clearPendingGeneration` then preserves the g1 metadata and the project has two generation-1 archives.

**Step 2: Implement fix**

Exclude archive-owned entries from the source copy.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`; the interrupted-copy regression fails neutralized, passes restored.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t14): never copy archive-owned entries from the source`

---

### Task p04-t15: (review) Resolve archive generations when syncing by project name

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`parseArchiveSnapshotName` ~L433-465 captures an optional trailing `-g(\d+)` as `generation` and exposes the base `projectName` plus the full local name; the local hydration target keeps the full name so `demo-g2` never lands on `demo`)
- Modify: `packages/cli/src/commands/repo/archive/sync-runner.ts` (~L333-355: by-name selection matches the base name, an exact snapshot or full-name match takes precedence, and the latest pick orders by generation before date)
- Modify: `sync-runner.test.ts` (beside "selects the latest snapshot for each project": listing `20261011-demo/` + `20261012-demo-g2/`, `runSync({ projectName: 'demo' })` targets `.oat/projects/archived/demo-g2` from the g2 source; `sync demo-g2` still exact-matches; unnamed sync still hydrates both), `archive-utils.test.ts` unit for `parseArchiveSnapshotName('20261012-demo-g2')`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md` (~L160: by-name restore selects the latest generation of the latest dated snapshot) and the `project-artifacts.md` recovery sentence; a project literally named `…-g2` keeps exact-name precedence (note the residual ambiguity in the docs)

**Step 1: Understand the issue**

External PR review W3 (verified Medium): the `-gN` suffix is part of the slug to the parser, so `oat repo archive sync demo` hydrates generation 1 and the documented latest-snapshot restore and the damaged-archive recovery hint cannot reach the latest generation by name.

**Step 2: Implement fix**

Generation-aware snapshot identity in the parser and the sync selector; targets unchanged.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/repo/archive` and `pnpm --filter oat-docs check`; the producer-to-sync regression fails neutralized, passes restored.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t15): resolve archive generations when syncing by project name`

---

### Task p04-t16: (review) Scope-qualify successor archive paths on other-scope collisions

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`allocateArchiveGeneration` ~L1436-1457: when the dated identity collides or `<project>-gN` is held by a valid archive of another scope, both the local path and the export identity take the `-<scope>` qualifier, mirroring the generation-1 rule at ~L1339-1350; a non-empty path without matching metadata still refuses `archive-generation-path-occupied`; candidate enumeration must find the qualified successor on retry)
- Modify: `archive-retry-identity.test.ts` (under "explicit archive generations": shared `demo` and local `demo` archived, both reopened, g2 for both in either order → `demo-g2` and `demo-g2-<scope>` with matching export identities, each source-absent retry resumes its own; the empty-directory reuse case stays green)
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (~L207) and `project-artifacts.md` (~L219): successor path grammar includes the qualified form

**Step 1: Understand the issue**

External PR review W4 (verified Medium): generation 1 qualifies path and identity together, but successors qualify only the export identity, so the second scope to request g2 is refused with a message calling a valid archive junk.

**Step 2: Implement fix**

Apply the recorded scope-qualification deviation consistently to successor paths and identities.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive` and `pnpm --filter oat-docs check`; the shared/local g2 regression fails neutralized, passes restored.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t16): scope-qualify successor archive paths on collisions`

---

### Task p04-t17: (review) Read plan progress through the masked record reader

**Files:**

- Modify: `packages/control-plane/src/state/tasks.ts` (`parsePhaseProgress` ~L97-144 derives plan task headings from `readJournalRecords(planContent)` or applies the same `recordMask` before `parseTaskHeadingLine`; confirm the masked grammar accepts every legacy heading spelling at ~L28-30 — `p1-t01`, `prev1-t01`, `p-rev1-t01` — before swapping)
- Modify: `packages/control-plane/src/state/tasks.test.ts` (`parseTaskProgress` over a plan whose only fence holds `### Task p01-t02: Example` totals 1) and `packages/cli/src/commands/project/journal-check/evaluator.test.ts` (truthful 1/1 journal with that plan → `ok`; the false 1/2 overview → `overview-total-mismatch`; run both through `complete-state` as the public boundary)

**Step 1: Understand the issue**

External PR review W5 (verified High): task matching masks fenced examples through `readJournalRecords` while `checkOverviewTotals` reads `context.progress` from a raw-line plan scan; a fenced `### Task` example makes a truthful journal refuse and only a false overview completes. Nine non-test consumers share `parseTaskProgress`, so counts for such plans shift everywhere in the intended direction.

**Step 2: Implement fix**

One masked plan reading for progress and validation.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state src/commands/project/promote` plus `HOME=$FH pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state`; the fenced-example regression fails neutralized, passes restored.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t17): read plan progress through the masked record reader`

---

### Task p04-t18: (review) Refuse run lines without a valid request identity

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (`checkRunLines` ~L880: `request` null or failing the producer's identifier pattern → `run-line-malformed`; import the pattern from `packages/cli/src/providers/identity/generic-dispatch-record.ts` ~L24-29 rather than duplicating it; other nullable selectors unchanged)
- Modify: `evaluator.test.ts` (a `realRunLine()` with `request=~` is refused at review and completion; two such lines never report `run-line-duplicate` with an empty label); extend `NEGATIVE_VARIANTS` in `journal-check/__tests__/fixtures.ts` so `complete-state/journal.test.ts` covers it at the public boundary

**Step 1: Understand the issue**

External PR review W6 (verified Medium): `~` parses to null and folds to an empty dedup key, so a hand-edited run line with no request identity passes validation and completion while the producer rejects the same input.

**Step 2: Implement fix**

Validate the required projected identity against the producer contract.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state`; the null-request regression fails neutralized, passes restored.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t18): refuse run lines without a valid request identity`

---

### Task p04-t19: (review) Catch template placeholders inside inline-code slots

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (~L936-970: stop blanking inline code wholesale; inside a backtick span match only when the whole span is a template vocabulary token — `{path}`, `{why}`, `{purpose}`, `{Task Name}`, `{Phase Name}`, `{Project Name}`, `{N}`, `{sha}`, `{time}`, `{command(s)…}` — and only in a slot position (list-item start or after a `**Label:**` marker); the existing `quoted-evidence` marker (~L815, ~L830) opts a line out; prose heuristics outside spans unchanged)
- Modify: `evaluator.test.ts` (`- \`{path}\` - Reader module.`refused`template-residue`and refused by`complete-state`; `\`{ sourceId, locator }\``, `\`packages/{cli,control-plane}/package.json\``, `\`returns {status, reasons}\``accepted; a`<!-- quoted-evidence -->`line with`\`{Task Name}\``accepted; the real template path from`.oat/templates/implementation.md:43` as the negative control at the completion boundary)
- Verify, read-only: `node packages/cli/dist/index.js project journal check --project .oat/projects/shared/artifact-cleanup --at completion --json` reports no `template-residue` (its L531 quotes `{Task Name}` mid-line as evidence); report rather than edit if it does

**Step 1: Understand the issue**

External PR review W7 (verified Medium): `stripInlineCode` hides the template's own backticked `{path}` slots, so an unfilled key-files line passes completion. The p02 L3 prose false positive (`returns {status, reasons}`) must stay accepted.

**Step 2: Implement fix**

Vocabulary-and-slot matching inside inline code instead of blanket stripping.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state`; the inline-slot regression fails neutralized, passes restored; this project's journal still has no residue reason.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t19): catch template placeholders inside inline-code slots`

---

### Task p04-t20: (review) State the real disabled-log contract for learning writes

**Files:**

- Modify: `.agents/skills/oat-project-autonomous/SKILL.md` (~L414-451 `oat_record_learning` and its D14 sentences), `.agents/skills/oat-cursor-cloud-projects/references/cursor-cloud-mechanics.md` (~L111-148), `.agents/skills/oat-project-goal/SKILL.md` (~L160-161, ~L179-204, ~L646-648): a disabled project log (`workflow.projectLog: false`) stops creation, so the append skips with `status: skipped` and the helper's one warning line; an existing `project-log.md` keeps accepting categorized learnings regardless of the flag (`DR-260718-automatic-create-on-first`); drop every "never pre-check / disabled means no-op" claim that contradicts this; keep the helper's `skipped` grep as the warning trigger (all three skills are already bumped in this PR; no further bump)
- Modify: `packages/cli/src/commands/project/log/append.ts` only if the prose needs a clearer `skipped.reason`; otherwise none
- Modify: `packages/cli/src/commands/project/log/append.test.ts` (~L445: an existing log + `projectLog: false` + a categorized learning append → `appended`, asserted on the policy outcome, not only the heading; absent log + `false` → `skipped` with `reason: projectLog=false`)
- Re-pin `packages/cli/src/validation/skills.test.ts` lines that quote the changed prose, if any

**Step 1: Understand the issue**

External PR review W8 and Bugbot B2 (verified: artifact/prose mismatch; the CLI behavior is decision-backed): D14 and three skill mirrors promise that a disabled log makes the append no-op with a warning, but `append.ts:1741-1750` consults the flag only when the log is absent, pinned by `append.test.ts:445` and DR-260718. Root decision: align the prose with the recorded contract; the root records the D14 alignment note in `design.md`.

**Step 2: Implement fix**

Prose states the real rule; the test asserts both branches explicitly.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log src/validation/skills.test.ts`; `pnpm check` and `pnpm run check:skill-bumps` exit 0.
Expected: green with explicit exit codes; the named control fails with the fix neutralized and passes restored.

**Step 4: Commit**

`docs(p04-t20): state the real disabled-log contract for learning writes`

---

### Task p04-t21: (review) Carry the PR body across the archive in oat-project-complete

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md` (already bumped to 1.7.18 in this PR; no further bump): after Step 5 regenerates the archive-aware artifact and before Step 8 archives, copy its frontmatter-stripped body to a temp file recorded as `PR_BODY_FILE` (verify it starts with the markdown heading); Step 10's expected-changes list keeps the active artifact only; Steps 11 and 11.5 read `$PR_BODY_FILE` instead of `{PROJECT_PATH}/pr/project-pr-*.md` / `{ARCHIVE_PATH}/pr/project-pr-*.md` (~L1508, ~L1589, ~L1623-1624) and clean it up at the end; the discovered-archive route (~L166-177, no active project) has no artifact: Step 11.5 skips the body sync with an explicit report line instead of failing; the non-archive synced branch keeps `PR_DESCRIPTION_PATH`
- Modify: every test pinning the replaced sentences (`packages/cli/src/validation/skills.test.ts`, `named-skill-load-contract.test.ts`, `closeout-skills` contract tests; grep `project-pr-\*` and `ARCHIVE_PATH}/pr`) and the docs page that describes the complete flow if it names the archived `pr/` path (`apps/oat-docs/docs/**`; grep `pr/project-pr`)

**Step 1: Understand the issue**

Final review round 4 H1 (`reviews/archived/final-review-2026-10-12T141023Z.md`): Steps 10/11/11.5 read the regenerated PR body from `{PROJECT_PATH}/pr/` after Step 8 set `PROJECT_PATH="$ARCHIVE_PATH"`; p04-t13 dropped `pr/` from the local archive and `oat project archive` deletes the active project, so the body exists nowhere when the PR is created or synced (`.oat/**/pr/` is gitignored here). S3-hydrated archives never carried `pr/`, so the discovered-archive route was already broken.

**Step 2: Implement fix**

The skill carries the body it needs across the archive; archives keep one retention set.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init src/commands/tools` plus `pnpm check` exit 0; the re-pinned contract test fails with the old `{ARCHIVE_PATH}/pr/` sentence restored and passes with the new one.
Expected: green with explicit exit codes; the named control fails neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t21): carry the PR body across the archive in oat-project-complete`

---

### Task p04-t22: (review) Different-day control for the scope-qualified successor clause

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-retry-identity.test.ts` (the W4 `.each` test gains a row where the other scope's generation-1 archive carries a different date, so `pathHeldByOtherScope` alone decides and the test fails with that clause neutralized; L2: reorder the W1 round-trip test so the hydrate-then-retry assertion runs before the `existsSync(pr)` pin, or split the pin into its own `it`)

**Step 1: Understand the issue**

Final review round 4 M1: the W4 `.each` rows use the same date for both scopes, so with the `pathHeldByOtherScope` clause removed all 244 archive tests still pass although the dist behaviour depends on it. L2: the W1 test fails in the pre-fix state on its `existsSync` pin before reaching the assertion that proves the finding.

**Step 2: Implement fix**

Make each guard fail for the reason it exists.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`; the new row fails with the clause neutralized and passes restored; the W1 test fails pre-fix on the retry assertion.
Expected: green with explicit exit codes; the named control fails neutralized and passes restored.

**Step 4: Commit**

`test(p04-t22): different-day control for the scope-qualified successor`

---

### Task p04-t23: (gate) Claim a generation exclusively before writing or clearing its allocation

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (~L2961-2975 allocation write, cleanup ~L3003-3004 and ~L3314-3318: the pending allocation is claimed atomically — exclusive create (`wx`) of `.oat-archive-source.json` in the generation path, or an equivalent exclusive claim — and the identity is re-evaluated under that claim; an existing completed archive at the path is never overwritten (reuse or refuse without writes); a pending marker held by another caller refuses with a stable code, e.g. `archive-generation-claim-held`; the allocation carries an owner token and `clearPendingGeneration` removes only the allocation this operation wrote (token match), never another caller's completed files; the empty-directory reuse case (p03-t13, p04-t07) stays supported)
- Modify: `archive-retry-identity.test.ts` (deterministic overlapping-call regression: call B pauses after evaluating the vacant g2 path via an injected barrier, call A completes g2 and removes the source, B resumes → A's completed g2 is preserved byte-identical (state.md present, manifest hash unchanged) and B either reuses it or refuses without writes; control: pre-fix allocation overwrites A's metadata and cleanup deletes A's files)
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` (code table) if a new reason code ships

**Step 1: Understand the issue**

Exit gate generation 2 attempt 1 H1 (`reviews/archived/final-review-2026-10-12T144139Z.md`, codex-6-sol-xhigh): the vacancy decision from `evaluateArchiveRetryIdentity` is consumed later with a recursive mkdir and an overwriting metadata write; two overlapping archive calls both see an unused g2, A completes it and removes the source, B resumes, replaces A's completed metadata with a pending allocation and `clearPendingGeneration` deletes A's retained files (D11 immutability). The gate's probe (artifact section "Archive producer/consumer and overlapping-call probe") adds one scheduling barrier before `const archivePath = identity.archivePath;` in the compiled module.

**Step 2: Implement fix**

Exclusive claim, re-evaluation under the claim, owner-scoped cleanup.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`; the overlapping-call regression fails with the claim neutralized and passes restored.
Expected: green with explicit exit codes; the named control fails neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t23): claim an archive generation exclusively before writing its allocation`

---

### Task p04-t24: (gate) Parse scope-qualified generation names end to end

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (`parseArchiveSnapshotName` ~L469-475: one producer/consumer naming contract `<date>-<slug>[-gN][-<scope>]` matching what `allocateArchiveGeneration` ~L1470-1475 emits (`20261012-demo-g2-local`): `generation` 2, family key `demo-local` (slug plus scope qualifier), project `demo`, scope `local`, local hydration name unchanged `demo-g2-local`)
- Modify: `packages/cli/src/commands/project/archive/sync-runner.ts` (~L253-271: by-name `sync demo-local` selects the latest generation of that family (`demo-g2-local` over `20261011-demo-local`); by-name `sync demo` covers every family of project `demo` including scope-qualified ones at their latest generation; exact snapshot name and full local name keep precedence; unnamed sync unchanged)
- Modify: `archive-utils.test.ts`, `sync-runner.test.ts`, `archive-retry-identity.test.ts` (an actual scope-qualified generation produced by the writer, listed and selected by name, including the later-date successor case and a literal project name containing `-gN`), docs sentences in `lifecycle.md`, `oat-directory-structure.md`, `project-artifacts.md` describing by-name restore

**Step 1: Understand the issue**

Exit gate generation 2 attempt 1 M1 (`reviews/archived/final-review-2026-10-12T144139Z.md`): p04-t16's writer emits `…-demo-g2-local` but p04-t15's parser recognizes a generation only when `-gN` ends the name, so the scope-qualified successor parses as `demo-g2-local` generation 1 and by-name sync (`demo-local`, and `demo`) selects the older snapshot; exact-name and unnamed sync still reach it.

**Step 2: Implement fix**

One naming contract shared by the writer, the parser and the selector.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/commands/repo/archive` and `pnpm --filter oat-docs check`; the composition regression fails with the parser's scope-aware branch neutralized and passes restored.
Expected: green with explicit exit codes; the named control fails neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t24): parse scope-qualified generation names end to end`

---

### Task p04-t25: (gate) Refuse duplicate or misplaced plan task records before accepting journal evidence

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/rules.ts` (`checkTaskModeRecords` ~L351-377: duplicate normalized plan identities (`p01-t01` and `p1-t1`) refuse with a stable reason, e.g. `plan-task-duplicate`, and a plan task whose `inOwningPhase` is false refuses with e.g. `plan-task-misplaced`, both reporting the plan.md locations and routing correction to the plan owner; these are authoring defects, never override-eligible evidence gaps)
- Modify: `evaluator.test.ts`, `complete-state/journal.test.ts` (both variants through `complete-state`: refused, `state.md` bytes unchanged; the valid 1/1 neighbour completes; the missing-commit neighbour still refuses), `journal-check/__tests__/fixtures.ts` `NEGATIVE_VARIANTS`; check `packages/control-plane/src/state/tasks.ts` ~L142-155 reports the same contract (progress must not read 2/2 or 0/0 for these plans without the checker refusing first)
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` reason-code table and the journal-check reference if codes are listed there

**Step 1: Understand the issue**

Exit gate generation 2 attempt 1 M2 (`reviews/archived/final-review-2026-10-12T144139Z.md`): `checkTaskModeRecords` groups plan tasks by normalized id but uses only `planBlocks[0]` and never rejects duplicate plan identities or a plan task outside its owning phase; a plan with `p01-t01` and `p1-t1` passes completion at 2/2, and `p01-t01` moved under Phase 2 passes while progress reads 0/0 (D5 raw-record checks).

**Step 2: Implement fix**

Plan record uniqueness and phase ownership validated before journal matching.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/complete-state` plus control-plane `src/state`; the two new refusals fail with the checks neutralized and pass restored.
Expected: green with explicit exit codes; the named control fails neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t25): refuse duplicate or misplaced plan task records`

---

### Task p04-t26: (gate follow-up) Owner-scoped claim and cleanup for first archives

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (first archives (generation 1) use the same exclusive claim as successors: the pending `.oat-archive-source.json` is created exclusively with the owner token before the copy; a failed copy's cleanup removes only what this call claimed (`removePath(archivePath)` never deletes another call's completed archive); a path completed by another call refuses `archive-generation-claim-held` without writes; an interrupted first archive leaves a pending allocation that the retry path resumes or takes over exactly as a successor does; the empty-directory reuse and damaged-candidate checks stay green)
- Modify: `archive-retry-identity.test.ts` (overlapping first archives: B pauses before its allocation via the `ensureDir` barrier, A completes g1 and removes the source, B resumes → A's g1 byte-identical and B refuses without writes; interrupted-g1 resume still completes; control: pre-fix cleanup removes A's completed g1)
- Modify: `apps/oat-docs/docs/reference/project-artifacts.md` only if the recovery wording for an interrupted first archive changes

**Step 1: Understand the issue**

Implementer concern after p04-t23: first archives still allocate without a claim, so two overlapping first archives of the same project can end with the failed copy's cleanup removing the archive the other call just completed (same D11 immutability class as gate H1, generation 1 case).

**Step 2: Implement fix**

Same claim mechanism for generation 1; cleanup owner-scoped everywhere.

**Step 3: Verify**

Run: `HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`; the overlapping-first-archive regression fails with the claim neutralized and passes restored; interrupted-g1 resume and empty-directory reuse unchanged.
Expected: green with explicit exit codes; the named control fails neutralized and passes restored.

**Step 4: Commit**

`fix(p04-t26): owner-scoped claim and cleanup for first archives`

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target                                                                                                                                                                                                                                               |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-10-12 | reviews/archived/p01-review-2026-10-12T012710Z.md           | c6b98bcac0408788ba03303f81c50123bf962c44 | auto       | round 1: 0/0/1/3; M1 and L3 aligned in plan; L1→p01-t06, L2→p01-t07; fixes landed 0bce1f045, d905d0110                                                                                                                                                    |
| p01    | code     | passed          | 2026-10-12 | reviews/archived/p01-review-2026-10-12T013544Z.md           | a359c4524044ac4a8b74ad1739dc7fce1d25d730 | auto       | round 2 (narrowed to 5c7e60601..d905d0110): 0/0/0/0; M1/L3 plan alignments and L1/L2 fixes verified                                                                                                                                                       |
| p02    | code     | fixes_completed | 2026-10-12 | reviews/archived/p02-review-2026-10-12T024507Z.md           | a9ee702f55d3ce000927edf4c50ce73f5adc3af2 | auto       | round 1: 0/0/2/3; all five converted (p02-t08..p02-t12); fixes landed cbaaefbcb..3607948f4                                                                                                                                                                |
| p02    | code     | passed          | 2026-10-12 | reviews/archived/p02-review-2026-10-12T030234Z.md           | b9f2f8050e2246c1d6a92e2b5aacf70e0b2f053e | auto       | round 2 (narrowed to 736be8cfc..3607948f4): 0/0/0/0; all five round-1 findings closed                                                                                                                                                                     |
| p03    | code     | fixes_completed | 2026-10-12 | reviews/archived/p03-review-2026-10-12T035735Z.md           | 6ccbc207df036960615182dcf0bc575360ddb1cc | auto       | round 1: 0/0/3/5; L1 aligned in plan/design; seven converted (p03-t04..p03-t10); fixes landed 60d10eb8b..a6a9950a5                                                                                                                                        |
| p03    | code     | passed          | 2026-10-12 | reviews/archived/p03-review-2026-10-12T042217Z.md           | 1f5601c3f080ac4ca284ab634ef92039437a48be | auto       | round 2 (narrowed to 53340c9ec..a6a9950a5): 0/0/0/3; three new Lows converted (p03-t11..t13), root-verified, covered by the final review                                                                                                                  |
| p04    | code     | passed          | 2026-10-12 | reviews/archived/p04-review-2026-10-12T051738Z.md           | aec70adab4381d0e713a2c199a03990828824e68 | auto       | round 1: 0/0/1/1; M1 → p04-t05; L1 fixed by the root in the receive commit; p04-t05 landed b7c2eeb29, root-verified; final review covers the fix delta                                                                                                    |
| final  | code     | fixes_completed | 2026-10-12 | reviews/archived/final-review-2026-10-12T052402Z.md         | b38441a265f3b76757225863ac09a8b4aef32de1 | auto       | round 1: 0/0/0/3 over 87433267b..b38441a26 (61 commits, 135 files); L1 fixed by the root; L2 → p04-t06, L3 → p04-t07; fixes landed b0e788e8a, 046efcd22                                                                                                   |
| final  | code     | passed          | 2026-10-12 | reviews/archived/final-review-2026-10-12T054613Z.md         | 22b2b7d881069f4da33423d2fc1117e002550580 | auto       | round 2 (narrowed to e435a3317..046efcd22): 0/0/0/0; all round-1 Lows closed                                                                                                                                                                              |
| design | artifact | received        | 2026-10-11 | references/astra-design-round-1.md                          | fd158b6f5                                | manual     | Astra (gpt-6-astra, high) round 1: ALIGNED WITH CHANGES, 13                                                                                                                                                                                               |
| design | artifact | received        | 2026-10-11 | references/astra-design-round-2.md                          | e07fa3be7                                | manual     | Astra round 2: ALIGNED WITH CHANGES, 7 narrowed; D14 recorded                                                                                                                                                                                             |
| design | artifact | passed          | 2026-10-11 | references/astra-design-round-3.md                          | c2648e860                                | manual     | Astra round 3: ALIGNED; duplicate body removed, labels synced                                                                                                                                                                                             |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/plan-review-2026-10-11-round1.md           | 3117624163e79ffbd04418af5f5c94af264f0335 | manual     | Fable 5.1 high round 1: 0/3/9/5; all applied in plan revision 2                                                                                                                                                                                           |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/plan-review-2026-10-11-round2.md           | 91b3727bf48912d91f735d946ff7133a474ac777 | manual     | round 2: 0/0/1/2, all 17 round-1 findings resolved; applied in revision 3                                                                                                                                                                                 |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/artifact-plan-review-2026-10-11T162428Z.md | 91b3727bf48912d91f735d946ff7133a474ac777 | gate       | codex-6-sol-xhigh: 0/0/7/1, passed at threshold high; applied in revision 4                                                                                                                                                                               |
| plan   | artifact | fixes_added     | 2026-10-11 | references/astra-plan-round-1.md                            | 6a5a7986bcab5880f240961c43306ec1150d6c1a | manual     | Astra (gpt-6-astra, high) plan round 1: ALIGNED WITH CHANGES, 5 important / 2 minor; applied in revision 5                                                                                                                                                |
| plan   | artifact | passed          | 2026-10-11 | references/astra-plan-round-2.md                            | 6ddc7476114babe72d7307d2c41f2ac45fcc3709 | manual     | Astra plan round 2: ALIGNED; plan revision 5 approved by the orchestrator per the autonomous-run rules (D13); ready for oat-project-implement, not active                                                                                                 |
| plan   | artifact | received        | 2026-10-11 | reviews/archived/artifact-plan-review-2026-10-11T162428Z.md | -                                        | -          | -                                                                                                                                                                                                                                                         |
| final  | code     | fixes_completed | 2026-10-12 | reviews/archived/final-review-2026-10-12T055711Z.md         | ca2db88fa5345ec9dba8d2e06bb04ef1d44287b9 | gate       | codex-6-sol-xhigh: exit gate attempt 1 blocked 0/1/3/2; H1→p04-t08, M1→p04-t09, M2→p04-t10, L1→p04-t11, L2→p04-t12; M3 fixed by the root; fixes landed 80a8a724e..7e32ece6e                                                                               |
| final  | code     | passed          | 2026-10-12 | reviews/archived/final-review-2026-10-12T061438Z.md         | 2c2594f424bff2892e40b1e0567a474ab95226f4 | auto       | round 3 (narrowed to 0ff8c0aec..7e32ece6e): 0/0/0/1; H1 rehash and the four other gate findings verified closed; the Low (journal count) fixed by the root                                                                                                |
| final  | code     | passed          | 2026-10-12 | reviews/archived/final-review-2026-10-12T062754Z.md         | b348f3e4c9fa40cda1b1ef767b8dcbab2a83f585 | gate       | codex-6-sol-xhigh: exit gate attempt 2 ok 0/0/0/0 (judgment sweep: nothing to disposition)                                                                                                                                                                |
| final  | code     | fixes_completed | 2026-10-12 | reviews/archived/external-pr-review-2026-10-12T065140Z.md   | bbc3616a959e97f422aec9209c24f0695763c6f0 | external   | Warp Quaker Factory changes requested 0/8/0/0 + Cursor Bugbot 2 Medium; root verification lanes confirmed W1–W8; W1→p04-t13, W2→p04-t14, W3→p04-t15, W4→p04-t16, W5→p04-t17, W6→p04-t18, W7→p04-t19, W8/B2→p04-t20; B1 (awsProfile) no change by decision |
| final  | code     | fixes_completed | 2026-10-12 | reviews/archived/final-review-2026-10-12T141023Z.md         | 731a5d78165e49c4dae9cf4c9ec9128066aebbbd | auto       | round 4 (narrowed to fca8060e0..5bbc20b10): 0/1/1/2; W1–W8 verified closed; H1 → p04-t21, M1 + L2 → p04-t22, L1 (overview total) fixed by the root                                                                                                        |
| final  | code     | passed          | 2026-10-12 | reviews/archived/final-review-2026-10-12T142835Z.md         | 5fe8ac058a35db697d5cc40077d4c38f90967b74 | auto       | round 5 (narrowed to fd5b5351c..c0b261839): 0/0/0/1; H1, M1, L1, L2 verified closed; the Low (Step 11.5 failure wording) fixed by the root                                                                                                                |
| final  | code     | received        | 2026-10-12 | reviews/final-review-2026-10-12T144139Z.md                  | b70b067ea74a1d98359ccc2c5612edaf0843a807 | gate       | codex-6-sol-xhigh                                                                                                                                                                                                                                         |
| final  | code     | fixes_pending   | 2026-10-12 | reviews/archived/final-review-2026-10-12T144139Z.md         | b70b067ea74a1d98359ccc2c5612edaf0843a807 | gate       | codex-6-sol-xhigh: exit gate generation 2 attempt 1 blocked 0/1/2/0; H1→p04-t23, M1→p04-t24, M2→p04-t25                                                                                                                                                   |

For code-review events, `Reviewed Head` is the full 40-character SHA at the head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate Target` is populated only for gate events.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 7 tasks - Log categories and source identity, digest configuration, bounded roll-up digest, summary/log templates, summary and retro readers with the staged closeout invocation, two review fix tasks (template placeholder, maxLines minimum)
- Phase 2: 12 tasks - Shared record reader, one-line dispatch record, journal evaluator, `journal check` command and complete-state integration, journal templates with slots, writer skills and roles, phase-2 docs and walkthrough, five review fix tasks (receipt placement, completion posture docs, journal-missing refusal, oat_ready_for agreement, brace residue pattern)
- Phase 3: 13 tasks - Unified learning producers (D14), archive retry identity, explicit generations, seven review fix tasks (generation warning, deterministic paths, reason codes, latest-generation message, synced dry-run parity, .git control, learning commit identity; round-2 polish: replay reason wording, two more refusal codes, empty scope-qualified directory)
- Phase 4: 12 tasks - Lifecycle probes, documentation audit, decision records and backlog, version bumps and gates, three review fix tasks (guard evidence pointer, replay-warning docs sentence, empty generation directory) and five exit-gate fix tasks (archive rehash on retry, per-fence payload detection, digest line limit, origin tally, review-link export)

**Total: 44 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design, revision 3 final; Astra rounds in `references/astra-design-round-{1,2,3}.md`)
- Discovery: `discovery.md` (D1–D14)
- Evidence (machine-local): `.oat/repo/analysis/2026-10-11-archived-artifact-audit.md`, `…-sol-review.md`
