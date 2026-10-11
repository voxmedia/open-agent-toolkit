ALIGNED WITH CHANGES

Plan alignment round 1 of at most 2 — `artifact-cleanup`, plan revision 4 at **`6a5a7986b`**.

The decomposition preserves the settled design and its four sequential integration phases. It needs the bounded edits below before alignment is complete: **0 blocking, 5 important, 2 minor**. These concern implementation instructions and discriminating verification, not reconsideration of D1–D14 or design revision 3.

All tracked-source citations in this report mean **`git show 6a5a7986b:<path>`**, with line numbers in that pinned content. `P` abbreviates `.oat/projects/shared/artifact-cleanup/plan.md`; `D` abbreviates `.oat/projects/shared/artifact-cleanup/design.md`. The three design alignment reports were read at that commit. The two supplied Fable reports and the configured gate artifact were read from their supplied local paths. No conclusion depends on the concurrently changing checkout.

| Negotiated contract                                  | Unique task ownership by slice                                                                                                                                                                                                  | Verification and assessment                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Validator boundaries and caller composition       | p01-t05: staged-summary interface; p02-t03: three-boundary evaluator; p02-t04: CLI and final state-write composition; p02-t06: implement/review/complete callers; p02-t07: integrated walkthrough                               | P:109,135–145,159–169 preserves early closeout, pre-Step-16 allowances, scoped review, final recheck, override non-bypass, and failure-before-publication evidence. The new failure probe is valuable, but executing summary Steps 0–5 still has a pre-check append path: finding 1. No fourth boundary or design revision is needed.                                                                        |
| 2. Shared record reader                              | p02-t01: heading ownership, locations, code exclusion, normalization, raw duplicate visibility, production frontmatter and task-progress adoption; p02-t03: validator consumption                                               | P:119–121,135–137 assigns the producer and both consumers correctly. Existing progress compatibility and new reader tests do not explicitly prove the changed task-progress consumer uses that reader; the design's same-fixture comparison is missing: finding 4.                                                                                                                                           |
| 3. Digest bound and locator                          | p01-t02: sibling config/defaults; p01-t03: projection and token definition; p01-t04: template; p03-t02: archive finalizer                                                                                                       | P:85–103,185–187 preserves hard bounds, recommendation ownership, omitted section, full-set ledger graduation, ambiguity, collision-safe tokens and destination-directory export controls. The summary skill's synthesized recommendations are an additional locator producer without an explicit migration instruction: finding 3.                                                                          |
| 4. Learnings identity and D14                        | p01-t01: grammar/append/check; p01-t05: unified/legacy readers and freshness; p03-t01: autonomous/cloud/goal producers and brief-contract persistence                                                                           | P:75–79,109–111,177–179 now covers legacy-only, proven twin, distinct same-title, learning-only freshness and disabled-log results. All three real writers are owned; scaffold is correctly regression-only. The new category-removal control demands an unspecified CLI refusal and contradicts the compatibility rule: finding 2.                                                                          |
| 5. Run-line projection with preserved launch enum    | p02-t02: renderer and exported terminal mapping; p02-t03: parser/validator; p02-t05: template instructions; p02-t06: request-ID update owner                                                                                    | P:127–137,151,159 preserves the generic enum, raw outcomes, separate terminal classification, escaping/nulls, configured versus observed identity, continuation, stdin, and `validated-only`. Real renderer output is required for evaluator input, and terminal/live cases are named. No reopened enum or mandatory-payload-file requirement found.                                                         |
| 6. Archive retry identity and generation omit-branch | p03-t02: mandatory manifest/retry identity, locator finalization, shared evaluator and dry-run adoption; p03-t03: optional generation authorization                                                                             | P:185–195 preserves project/scope identity, synced guards, cross-date/source-absent reuse, durable generation allocation and the safe omit branch. Revision 4 fixes preview ownership. Its Verify clauses still need preview/apply comparisons and an explicit omitted-option acceptance branch: finding 5.                                                                                                  |
| 7. Phase ownership slices                            | Phase 1: p01-t01–t05; phase 2: p02-t01–t07; phase 3: p03-t01–t03; phase 4: p04-t01–t04                                                                                                                                          | P:27,49,71–233 matches D:481–526. No parallel phase group. Renderer precedes evaluator; reader migration precedes producer retirement; journal templates and operational writers finish in phase 2. Phase 1's locator interface/phase 3 finalizer and phase 1 staging/phase 2 caller are the design's intentional handoffs. Phase 4 is acceptance/bookkeeping, not a deferred consumer implementation phase. |
| 8. Discriminating control recipes                    | Each named guard belongs to its implementation task (P:67); p04-t01 collects results                                                                                                                                            | Bound mutation, full-ledger control, override triple, failing staged closeout and protected-versus-fresh archive baselines are improved and directionally correct. Findings 1,2,4,5 close remaining control gaps; finding 6 makes the empty-digest probe executable. Expected-red policy is sound as bounded at P:35.                                                                                        |
| 9. Documentation inventory                           | p01-t02/t05: config/log/summary/retro/CLI; p02-t02/t04/t07: dispatch/journal/closeout/execution/reviews/state/artifacts; p03-t01/t02/t03: producers/archive; p04-t02: final audit/root/generated docs; p04-t03: records/backlog | Every design inventory page has an owner; alignment-note writers and D1–D12/D14 records are included. Phase 3 omits the same-phase docs gate despite changing these pages: finding 7. `oat-docs check` already includes markdownlint and `docs:skills:check`; no separate duplicate runner is needed.                                                                                                        |

The compound contracts above have one task per implementation slice, with later integration tests consuming earlier output. They do not require collapsing producer, renderer, command and caller into one oversized task. No conflicting implementation owner or unapproved parallel group was found.

1. **[important] The staged summary still appends to the log before final journal validation.**

   **Tasks:** p01-t05 owns the staged interface; p02-t07 owns its failing-closeout probe.

   P:109 says the staged invocation “completes Steps 0–5” before stopping. However, summary Step 2.5 explicitly offers promotion and appends a new `general` judgment for a selected project-scoped observation. Suspending only Step 6 therefore prevents the repository-ledger write but does not preserve the log tail. A defective journal with an otherwise valid selected promotion can change `project-log.md` before the checker refuses. The existing failing probe need not expose this if its fixture has no selected promotion. This conflicts with its own byte-identical log-tail assertion and with the design's expressly allowed pre-refusal prose refresh.

   **Evidence:** P:109,159,169; D:105–115. `.agents/skills/oat-project-summary/SKILL.md:179–218` places the append in Step 2.5, and `:220–223` explains that the appended entry precedes later ledger roll-up. `packages/cli/src/commands/project/log/rollup.ts:232–253,301–309` confirms that promotion append and repository-ledger graduation are distinct writes. `.agents/skills/oat-project-complete/SKILL.md:573–579,792–797` contains both summary entry paths the staged contract must govern.

   **Paste-ready plan edit — append to p01-t05 Files:**

   > In staged mode, Step 2.5 performs only the read-only log check and identifies promotion candidates; any selected `project` → `general` append is deferred until the caller sends `resume: roll-up` after final journal validation. Execute the deferred promotion before Step 6 so full-set ledger graduation remains intact. Before suspension, this invocation writes only summary sections and their freshness metadata. Standalone behavior, seal/ambiguity routing, and the existing promotion consent rule remain unchanged. The complete skill's inline fallback follows this same rule.

   **Paste-ready addition to p02-t07 Verify:**

   > Include one unsealed project-scoped judgment with a selected promotion in the failing staged-closeout fixture. Refusal leaves the project log byte-identical, including no promotion entry. The accepted neighbor performs the deferred append and subsequent ledger graduation; a standalone summary still performs its normal promotion flow.

2. **[important] The missing-category producer control asserts a CLI guarantee that the plan does not define.**

   **Task:** p03-t01.

   P:179 says removing `--category` makes the producer's append be refused by p01-t01's validator. P:77–79 only defines unknown-category and category-without-source refusals, and expressly preserves an entry without category. The settled design puts the missing-category failure at the **producer contract**, not at generic append. Silently adding a converse `--source`-requires-category rule to satisfy the probe would be a new API decision, not execution of this plan.

   **Evidence:** P:77–79,177–179; D:180–188,216–220. `packages/cli/src/commands/project/log/append.ts:1343–1395` validates judgment type/scope/body/area without requiring a learning category; `:2109–2111` exposes the independently reusable idempotency key. `.agents/skills/oat-project-autonomous/SKILL.md:391–405` is the actual six-category producer being replaced.

   **Paste-ready replacement for the `learning-source-identity` clause in p03-t01 Verify:**

   > Guard `learning-source-identity` at the producer contract: separately remove the category argument and the per-observation source argument from an otherwise valid learning-write instruction and confirm the producer contract assertion fails for the missing field; restore each and confirm it passes. Do not require generic append to reject an uncategorized judgment: p01-t01's uncategorized compatibility case remains accepted. The actual categorized producer call with a stable source/key succeeds, and replay appends nothing.

3. **[important] Export-safe source identity is assigned to the digest but not to synthesized recommendations.**

   **Task:** p01-t05 owns summary recommendation authoring; p03-t02 verifies the exported consumer.

   The summary skill currently tells every synthesized recommendation to end in a relative link to the legacy learning file. Changing that to a relative `project-log.md` link when adopting the unified source would recreate the exact export-location failure resolved in design rounds 1–3. P:109 assigns dual reading and deduplication but never replaces this pointer contract. P:185's export finalizer only rewrites the named `oat-project:` tokens, so it cannot repair a relative pointer emitted by this other summary writer. The digest's good locator does not make the other section's links retrievable.

   **Evidence:** P:93,101,109,185; D:149–158,174–176. `.agents/skills/oat-project-summary/SKILL.md:482–487` requires a relative source link and retaining all supporting source pointers; `.oat/templates/summary.md:72–76` also requires relative pointers. `packages/cli/src/commands/project/archive/archive-utils.ts:885–918` copies only the summary to the configured export directory and currently rewrites recap links, not learning links.

   **Paste-ready addition to p01-t05 Files:**

   > Replace the summary skill's relative learning-file pointer instruction with export-safe, non-link source identity for every synthesized recommendation. Unified-log sources use p01-t03's `oat-project:<slug>#<entry-id>` token and retain every supporting source identity; do not independently derive a different entry ID. Legacy sources retain their exact timestamp/category/title identity as self-contained provenance, without claiming an adjacent exported learning file is retrievable. Update the corresponding summary-template pointer comment. Preserve distinct source pointers when recommendations are deduplicated.

   **Paste-ready addition to p03-t02 Verify:**

   > Export a summary containing both the CLI digest and skill-authored Autonomous Execution Learnings. From the configured export destination, assert unified-source tokens in both sections finalize to the same persisted archive identity, supporting entry identities remain distinct, and neither section emits a bare relative project-log/legacy-learning-file link. Include a legacy-only synthesized recommendation as self-contained provenance.

4. **[important] The shared-reader verification can pass while task-mode progress still uses the old reader.**

   **Tasks:** p02-t01 owns progress adoption; p02-t03 owns the validator/progress integration comparison.

   P:119 correctly requires `tasks.ts` to consume the new reader. P:121 verifies new reader ownership and unchanged existing progress fixtures, but does not require the ownership negatives to pass through actual `parseTaskProgress`. P:137 likewise tests the evaluator without the same-fixture progress comparison negotiated in D:296–299. An implementer could build and test the new reader, wire only the validator, and leave the old raw-line completion scan in task progress while satisfying those listed checks. This is a missing discriminating consumer control, not a request for a second parser or identical validator/progress result types.

   **Evidence:** P:119–121,135–137; D:224–233,296–299. `packages/control-plane/src/state/tasks.ts:193–209` scans raw lines into a Set and leaves task ownership active across other headings. `tasks.test.ts:477–520` exercises default task progress, whereas its explicit fenced example at `:811–838` invokes phase-unit mode. Existing valid-result preservation alone cannot detect an unwired task-mode consumer.

   **Paste-ready addition to p02-t01 Verify:**

   > Run the fenced-fake-task and leaked-status fixtures through the public task-mode `parseTaskProgress`, using the real new reader. Neither fixture counts the fake/unowned completion; the minimally different owned-status fixture does. Preserve existing valid-fixture results. Neutralize progress's adoption of the new reader (restore the old raw-line scan) and confirm these assertions fail, then restore it.

   **Paste-ready addition to p02-t03 Verify:**

   > Feed those same plan/journal bytes to real control-plane task progress and the journal evaluator. Assert the intended completion count and the evaluator's owned-record finding independently; do not mock the reader or derive expected values from either implementation. Include normalized revision identity and raw duplicate visibility without requiring progress to become a refusal API.

5. **[important] Archive verification still does not prove mandatory preview/apply parity, and the allowed omit branch has no executable completion criteria.**

   **Tasks:** p03-t02 owns ordinary retry-preview integration; p03-t03 owns the conditional generation verification; p04-t01 consumes their recorded outcomes.

   Revision 4 correctly makes the shared evaluator and `push-runner.ts` adoption mandatory at P:185. The Verify at P:187, however, enumerates apply retries and twin prevention without comparing the public dry-run's reported identity/destinations or checking that it persists nothing. P:195's dry-run control concerns the optional generation path. If that option is omitted, the unconditional generation-allocation and guard requirements at P:67,195,205 cannot be met, despite omission being an explicitly accepted design outcome. Neither issue requires choosing generation semantics now.

   **Evidence:** P:67,185–195,205; D:386–411. `packages/cli/src/commands/project/archive/push-runner.ts:286–316,328–340` independently selects the dry-run snapshot and returns before apply; `:174–200` derives export/S3 destinations from it. `archive-utils.ts:1979–1980,2108–2114` independently derives apply/export identity, while `:610–650,793–874` implements protected persisted/synced matching. `archive/index.ts:41–72` has no generation option at the pinned baseline, so absent support is a legitimate conditional outcome, not a failed implemented guard.

   **Paste-ready addition to p03-t02 Verify:**

   > For retained-source, cross-date and source-absent ordinary retries, invoke public archive dry-run and apply against the same persisted snapshot identity. Assert matching snapshot ID, local archive path, summary export identity/path and S3 destination. Dry-run changes no filesystem bytes, refs, metadata or stubbed S3 objects. These checks are mandatory even when p03-t03 omits generations; they must fail if the runner retains its old current-date derivation.

   **Paste-ready replacement prefix for p03-t03 Verify:**

   > If the option ships, run the generation-authorization guard and all generation/replay/subsequent-request controls below. If the option is omitted, record the bounded reason and follow-up item; verify no generation option or enabled generation behavior is advertised, conflicting reopened content still refuses with follow-up-project guidance, and all mandatory p03-t02 retry/preview controls pass. Record `archive-generation-authorization: not applicable — option omitted` rather than a fabricated pass. p04-t01 accepts this documented branch and still requires every mandatory guard result.

6. **[minor] The empty-digest scaffold probe lacks a summary, and its literal shell commands do not consistently use the isolated branch runtime.**

   **Task:** p01-t04; phase-start probe convention.

   The new fake-HOME initialization at P:37 fixes the prior unset-variable problem. But P:103 scaffolds quick and immediately rolls up without authoring a summary; quick scaffold does not create one. That command fails before testing empty-section omission. Its `node`/`oat` probes also omit `HOME=$FH`, and bare `oat` may select the installed CLI instead of the branch-built one. This is a small probe repair, not a problem with the chosen isolation strategy.

   **Evidence:** P:37,87,103. `packages/cli/src/commands/project/new/scaffold.ts:123–150` excludes summary from scaffold templates; `:543–557` resolves templates through repository, user and bundle tiers. `packages/cli/src/commands/project/log/rollup.ts:278–286` refuses a missing summary before digest rendering.

   **Paste-ready replacement for p01-t04's scratch probe sentence:**

   > In the scratch repository, run all CLI probes with `HOME="$FH"` and an absolute path to this branch's freshly built `packages/cli/dist/index.js` (including commands abbreviated as `oat` elsewhere in the plan). Scaffold quick with `--with-project-log`, author a minimal valid `summary.md`, and then roll up its empty log. Assert the two-line log header, `summarySection: 'omitted'`, and no Workflow Observations heading. The scratch setup must use the intended changed template source/bundle, with no ambient user-template override.

7. **[minor] Phase 3 changes documentation but has no documentation gate before its review.**

   **Task:** p03-t03 as the phase-3 exit check, including its omitted-option branch.

   P:177,185,193 assigns the correct docs, but P:179,187,195 runs skill validation, formatting/search and CLI tests only. The final audit/build will catch defects later, whereas the settled contract requires docs checks in each docs-editing phase. This is not a missing page or a need for three duplicate docs runs.

   **Evidence:** D:415–433,483–488; P:177–195. `apps/oat-docs/package.json:12–16` shows `check` includes Markdown checks, docs validation and `docs:skills:check`, so the existing package command covers the requirement.

   **Paste-ready addition to p03-t03 Verify:**

   > Before phase 3 review, run `pnpm --filter oat-docs check` after all phase-3 docs and mapping updates, whether generations ship or are omitted; capture its exit code and require zero. This is the phase's documentation gate; p04 audits the finished contract rather than completing it.

## Sequencing, expected-red policy and retained conclusions

- **Four phases:** aligned. Phase 2 now orders shared reader and renderer before evaluator, then command integration, templates, writers and the integrated walkthrough. Tasks may temporarily break same-phase pins, but the plan requires a coherent phase before review. No new runtime refusal may be excused as text-pin churn.
- **Expected reds:** P:35 is sound: freeze the exact obsolete test contract and owner before the phase; repair same-phase pins; only the named skill-bump gate may span phases, and nothing remains red at completion. Deferring the final PR-scoped package/skill version bookkeeping does not authorize unrelated runtime failures.
- **`FH`:** assignment plus existence/emptiness checking at every phase/resumed shell is sufficient for initialization. Rebuilding control-plane and CLI before CLI-scoped verification is the correct dependency order. Finding 6 extends that isolation to the literal scratch commands rather than asking for another framework.
- **Settled contracts retained:** D14 still means warn-and-continue on disabled-log no-op, including the goal transition's attempted-capture prerequisite; it does not revive the legacy fallback. The shared parser still excludes table/checklist completion. Overrides remain journal-only and cannot waive closeout/goal/delivery/provenance guards. Failed/cancelled/no-change goal records remain history rather than invented success. The existing launch enum remains `planned | accepted | blocked-before-start` (`generic-dispatch-record.ts:244–249`), with `NEEDS_CONTEXT` continuation distinguished from terminal stops (`phase-execution.md:736–747`).
- **Prior review fixes retained:** the additional complete-auto/reconcile/bootstrap writers and dispatch adapter are present in p02-t06; their actual old destinations were checked. Both journal templates are owned, markers are preserved, Outstanding Items has a destination, summary heading omission is CLI-owned, and `complete-state` has its own write-free refusal checks. The latter is correctly placed before its existing write (`complete-state/index.ts:68–97`), while the early `closeout-check` remains the sequence/goal invariant (`closeout-check/index.ts:344–388`). The protected/fresh archive baseline split is correct.
- **No design reopening:** these edits preserve the three alignment rounds and plan-review alignment notes. No archive rewrite, review retention change, artifact rename, alternative workflow, or expanded production capability is requested. Generation replay remains an implementation obligation with the already-approved omit alternative.

## Review method and limits

Read-only pinned source inspection covered the project plan/design/discovery and three design rounds; supplied prior reviews; log grammar/check/append/roll-up; control-plane task progress and representative tests; dispatch schema/result; closeout-check/complete-state; archive command/runner/identity/export; relevant templates, writer instructions, goal/brief learnings, retro evidence order and docs scripts. Used `git show`, scoped `git grep`, line-numbered reads and local report reads. Applied `deliberate-testing` to the proposed boundaries and controls.

Stoa vault/memory lookups failed in the sandbox, succeeded on authorized read-only retries, and returned no relevant artifact-cleanup context. The local memory registry had no matching entry. No retrieved memory was used as evidence.

**Not executed:** builds, tests, guard mutations, lifecycle probes, `oat sync`, git writes, live archive/S3 operations or implementation. No tracked file was edited. This report is the only written artifact. The findings identify plan instructions and acceptance gaps supported by pinned source; they do not claim runtime reproductions.
