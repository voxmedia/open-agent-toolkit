---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-03
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: false
oat_plan_hill_phases: ['p06']
oat_auto_review_at_hill_checkpoints: true
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: high
oat_generated: false
---

# Implementation Plan: backlog-wave-5

> Execute with `oat-project-implement`. Required planning reviews are received, findings resolved, and complexity review complete.

**Goal:** Deliver the approved ten maintenance tickets in one PR with preserved user Git state and archived evidence, compatible producers/consumers, proportional verification, and no merge or release.

**Architecture:** Retain existing CLI/control-plane and skill boundaries. Add one narrow shared exact-path commit primitive with a CLI entry for skill callers; keep caller-specific allowlists and artifact identities. Update recap producer/report/consumers as one composition, leaving full immutable run packages in project archives and exporting only the rendered page.

**Tech Stack:** TypeScript ESM, Node 22+, pnpm/Turborepo, Vitest for packages, Node test/tsx for skill/docs fixtures, real local Git/hooks for commit acceptance, existing remark/unified Markdown parsing, existing archive/sync seams.

**Commit Convention:** Atomic Conventional Commits, one planned task per commit: `{type}({scope}): {description}`. Root separately owns lifecycle bookkeeping and review commits. Review fixes receive new stable IDs and updated totals.

## Planning Checklist

- [x] User approved one ten-ticket Quick wave and one PR through mergeable publication; merge/release excluded.
- [x] QS-04 straight-to-plan rationale and QS-05 requirements confirmation recorded in discovery.
- [x] Actual source and authoritative acceptance criteria inspected.
- [x] Parallel ownership evaluated; sequential execution declared.
- [x] Explicit phase review gate preserved losslessly.
- [x] Normal Sol-high planning self-review and independent Opus-high planning review received and reconciled by root.
- [x] Discovery is complete through the owning CLI. Root marks the reviewed plan ready; implementation confirms its execution checkpoint policy. No HiLL key is added by this draft.

## Parallelism

`oat_plan_parallel_groups: []` intentionally selects six sequential phases. H1 validation can be owned separately from skill-bump validation, but p01's guidance changes touch the same skill validator and shared contracts. p02 changes two separate producers, but shared public types and docs integration require a composed review. p03 owns one Git-index boundary; p04 consumes it; p05 touches completion skills already changed by p03/p04; p06 owns generated/version outputs; root owns backlog closeout. No adjacent full phase pair has a useful proven file-disjoint implementation contract. Do not manufacture worktrees or a wave program. If root later proposes parallelism, first prove exact disjoint files/dependencies and integration-base readiness, then amend this plan; never exceed two isolated implementation lanes or run competing Git-index/bookkeeping writers in one checkout.

## Execution and Review Contract

- Approved implementer: Codex GPT-6.1 Sol, high effort, for every phase. Independent reviewer: Claude Opus 5.5, high effort, for plan, all phases, and final. Normal planning self-review is a separate Sol-high event. These are explicit user constraints; no route/model/effort substitution after accepted dispatch. Root loads current dispatch contracts and verifies the invocation evidence. Do not copy compiled targets into YAML or misuse a named ceiling as an exact model pin.
- Preserve the existing `oat_phase_review_gate` exactly. Phase workers own p01 through p06 implementation tasks; final verification, ticket archival and project publication belong to the implementation root’s lifecycle tail, outside dispatched phase tasks. Built-in root review, independent phase gate, final review, and HiLL are separate contracts; review events are not plan tasks. Record full reviewed SHA, invocation, artifact and gate target in append-only review rows. On p06 use the lifecycle's final-review boundary rather than inventing a duplicate final-only phase review; the configured all-phase independent gate remains applicable.
- Before implementation, each phase, and any parallel launch: `git fetch origin main`, then `git log --oneline "$(git merge-base HEAD origin/main)..origin/main" -- <that phase's owned paths>`. Record changed paths and reconcile integration drift before dispatch. Finish open merges before running branch CLI probes. Planning entry: workspace `/Users/tstang/Code/open-agent-toolkit`, branch `wave/2026-10-03-backlog-wave-5`, HEAD `91e5fb0c6`, integration base `6ec5313b91e2595893eb89bb6372c028c0284ab4`.
- The approved recap-ticket amendment and worktree-init sync-manifest update were persisted in setup commit `96c470bc2b67137b420d082dfbd263749b76260e`. Preserve that committed content; implementations must not discard or sweep them into task commits. Every writer owns an explicit file list. Preserve unrelated staged and unstaged content, and inspect final status after hooks.
- Continue through tasks/phases and the implementation-owned lifecycle tail unless a configured checkpoint, real blocker, or required external input applies. Autonomous allowance is capacity, not permission to ignore terminal recovery or review/authority boundaries.
- Feature probes use local disposable repositories, real hooks and branch-built CLI. No live provider, S3, credential or production calls are required. Root retains publication and destructive-operation authorization.

## Formatting and Evidence

The documented root formatter is oxfmt's write mode. For **every task**, build the shell array `TASK_OWNED_FILES` from that task's explicit Files list, including only created/modified format-supported text files and actual newly reported references; exported recap HTML and immutable archived evidence are excluded because their recorded hashes attest exact bytes; do not include removed files, symlink targets outside ownership, binary evidence, or unrelated dirty paths. The concrete file-scoped command is `pnpm exec oxfmt --write "${TASK_OWNED_FILES[@]}"`, followed by `git diff --check -- "${TASK_OWNED_FILES[@]}"`. This is task ownership resolution, not formatter rediscovery. For generated files use their owning generator first, then format the actual produced text paths. After a commit, reread any file before exact-text edits because hooks can re-pad tables and change quoting.

Use deliberate-testing author guidance: test the named public boundaries below, with requirements/literal seeded bytes as the oracle and real internal collaborators. Extend existing test families where they already own the failure. Do not add test-only production hooks, broad snapshots, copied machine baselines, or repeated tests of the same failure at several layers.

For preservation/provenance/approval/receipt/review contracts, retain a reproduction-grade negative control: baseline admits the bad state, changed implementation rejects the same state, valid control still passes. For bug fixes record pre-fix failure for the intended reason and post-fix pass. If a test is used as proof of a P0 guarantee, temporarily neutralize its guard, demonstrate failure, restore it, and record the result once per P0 clause. Do not label ordinary requirements P0 merely to expand verification. Docs-only edits take conservation diff and one review round, without invented negative controls.

Machine logs, timing, hash ledgers and temporary fixtures belong in ignored `.oat/projects/shared/backlog-wave-5/analysis/`; `implementation.md` links short evidence summaries and exact repeatable commands. No tracked screenshot/hash baseline package.

## Current Source and Technical Choices

| Boundary            | Current evidence                                                                                                                                    | Bounded choice                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill bump gate     | `packages/cli/src/validation/skills.ts:1153` diffs skills/agents only; `skills.test.ts:6123` pins autonomy vendors                                  | Extend the actual gate to changed `.agents/docs` targets and symlink-consuming skills; retain direct skill/agent rules.                                                |
| Docs validation     | `apps/oat-docs/scripts/validate.ts` has routes/nav checks; `scripts/markdown.ts` already uses remark AST                                            | Count actual document H1 nodes using existing parsing, including Setext headings and excluding fenced/frontmatter content.                                             |
| PJM init/migrate    | `init.ts:223` replaces `pjm`; `migrate.ts:547` calls it                                                                                             | Merge only command-owned initialized/schemaVersion over existing PJM settings.                                                                                         |
| Structured blockers | `control-plane/src/state/parser.ts:125` coerces blocker entries; `types.ts:132` exposes strings                                                     | Preserve a `string \| {task_id, reason, since}` union in structured state; keep strings and deliberately render objects in human consumers.                            |
| Commit recovery     | `project/log/append.ts:843` has bounded lock retry and identity verification; `sync/ref-sync.ts:1006`, scaffold and promote have other commit paths | Extract one narrow exact-file primitive plus internal CLI entry; keep project-log append locking and identity verification as caller-owned protections.                |
| Backlog staging     | `backlog/archive.ts:180` uses `git mv`; result omits complete operation paths                                                                       | Use filesystem rename without staging and report exact affected paths, including old/new item paths and rewritten references.                                          |
| Knowledge refresh   | Skill line 46 deletes all Markdown; line 662 commits the whole staged index                                                                         | Generated ownership from existing `oat_generated: true` metadata and explicit generated filenames; preserve unmarked collisions and manual notes.                      |
| Recap export        | `archive/archive-utils.ts:1285` copies a full run; report has manifest/exportRoot; push/resume/completion consume it                                | Flat HTML report with run id and original/exported page hashes, no tracked sidecar. Original package remains immutable; exported bytes may differ through link repair. |

## Phase 1: Validators and bounded lifecycle guidance

### Task p01-t01: Require version bumps for shared-doc vendors

**Files:** Modify `packages/cli/src/validation/skills.ts` and `skills.test.ts`.

**Dependencies:** None. Serial ownership of these files also covers p01-t03/p01-t04's contract tests.

**Change:** Include changed `.agents/docs` files in the gate's Git diff, discover consuming symlinks under canonical skills (including direct gate-inventory links), and attribute each changed target to its owning `SKILL.md`. Resolve actual symlink targets with containment/cycle/missing-target handling appropriate to current validation; deduplicate consumers and preserve exact/NUL path handling. Preserve direct skill and agent bump behavior. Reduce the autonomy-only pin only after its general protection is demonstrably covered.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`. Disposable real Git/symlink fixtures: changed shared doc + unbumped consumer fails; bumped consumer passes; multiple vendors each require their bump; unrelated docs without vendors do not require a fabricated owner. Capture baseline missed case and post-fix rejection, with valid control. Fixture protects a released vendored contract; existing autonomy-only pin cannot catch arbitrary shared docs.

**Format:** Run the scoped formatter contract on the two owned files.

**Commit:** `fix(skills): require bumps for changed vendored docs`

### Task p01-t02: Require exactly one document H1

**Files:** Modify `apps/oat-docs/scripts/validate.ts`, `scripts/markdown.ts`; create `apps/oat-docs/tests/headings.test.ts`. Modify an existing docs page only if current corpus reveals a real violation; enumerate such pages before editing.

**Dependencies:** None; execute after p01-t01 in this sequential plan.

**Change:** Add a document-heading check to the actual `docs:validate` path using the existing Markdown parser. Count heading depth 1, report filename and actual zero/multiple count, handle ATX and Setext headings, and ignore frontmatter/code examples. Restrict nested heading context according to document semantics rather than regex matches in code. Reuse existing parser setup without a second parsing subsystem.

**Verification:** `pnpm --filter oat-docs exec tsx --tsconfig tsconfig.docs-tools.json --test tests/headings.test.ts`; `pnpm docs:validate`. Self-contained temp docs fixtures cover zero/one/two H1s, frontmatter and fenced examples, Setext and relevant nested context. Zero/two must reject naming the file; one passes; neutralize the check to prove fixture failure, restore; all current pages pass.

**Format:** Scoped formatter on the three named files plus any explicitly enumerated corrected pages.

**Commit:** `fix(docs): validate one document h1 per page`

### Task p01-t03: Disclose autonomous effective limits and hard stops

**Files:** Modify `.agents/skills/oat-project-autonomous/SKILL.md`, `.agents/docs/autonomy-contract.md`, `.agents/skills/oat-project-implement/references/phase-execution.md`, `.agents/agents/oat-phase-implementer.md`, `packages/cli/src/validation/skills.test.ts`; update `apps/oat-docs/docs/workflows/advanced/autonomy.md`.

**Dependencies:** p01-t01.

**Change:** Kickoff reads the owning recovery/gate/dispatch contracts and reports effective project/phase limits, prior durable usage, remaining capacity, source/override, and all applicable stops. Include failed-attempt terminality, eligibility/proof failure, budget exhaustion, malformed ledger or unresolved pending attempt, exact-target/accepted-launch failure, blocking review policy, missing credentials, repository authority, product judgment, destructive-risk and inventory gaps. Distinguish route retries, recovery events, warnings and recovery permission. Preserve the current default/phase override semantics (do not create a new policy), and preserve terminal failed-attempt behavior even when allowance remains.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`; `pnpm oat:validate-skills`. Extend existing user-visible contract assertions with effective-limit/source/capacity-versus-permission requirements and absence of a continue-after-failure promise. A documented dry kickoff with default and phase override controls must agree with source limits; existing terminal-failure tests stay green. No live provider invocation.

**Format:** Scoped formatter on named files and the located guide; p06 owns generated outputs and versions.

**Commit:** `docs(autonomy): disclose recovery limits and hard stops`

### Task p01-t04: Require proportional changed-boundary probes in reviews

**Files:** Modify `.agents/agents/oat-reviewer.md`, `.agents/skills/oat-project-review-provide/SKILL.md`, `.agents/skills/oat-project-review-provide-remote/SKILL.md`, `packages/cli/src/validation/skills.test.ts`; update only the existing review-template section if needed in `.oat/templates/` after locating its canonical template.

**Dependencies:** p01-t01; p01-t03 settles shared guidance changes first.

**Change:** Reviewer inventories changed trust/input/size/limit boundaries, names credible failures and focused probes, and records categorical results or concrete execution limitations. Missing consequential evidence produces an existing blocking finding; unsupported implementer assertions cannot count. Independently inspected failing and accepted implementer controls can count when the reviewer cannot execute, with exact commands/artifact provenance and limitation. Keep existing containment, independence, output schemas, severity model and dispatch policy; no new harness or campaign.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`; `pnpm oat:validate-skills`. Contract probes distinguish consequential guarantee with absent evidence (blocking), independently verified bad+accepted controls with execution limitation (eligible), unsupported assertion (blocking), and docs-only change without a credible changed boundary (no manufactured probe obligation). Tests own the review contract text; existing general checklist tests do not cover these acceptance distinctions.

**Format:** Scoped formatter on explicit owned files and any located template.

**Commit:** `docs(review): require evidence at changed consequential boundaries`

### Task p01-t05: (review) Include supported MDX pages in H1 validation

**Files:** Modify `apps/oat-docs/scripts/validate.ts` and `apps/oat-docs/tests/headings.test.ts` only.

**Dependencies:** p01-t04.

**Change:** Resolve M1 from `reviews/archived/p01-review-2026-10-03T225737Z.md`: include both supported .md and .mdx page extensions in the existing H1 scan. Extend existing self-contained zero/one/two and relevant frontmatter/code cases to MDX. Preserve recursive AST counting and filename/count diagnostics; no parser or validator rewrite.

**Verification:** Run the existing heading fixture command and `pnpm docs:validate`. Reproduce pre-fix zero/two MDX acceptance with the review's exact disposable probe; fixed cases reject while valid MDX and Markdown controls pass. Neutralizing the new extension coverage must break the MDX keeper. Retain categorical evidence locally under analysis/p01; no tracked corpus changes.

**Format:** Scoped documented formatter on the two files.

**Commit:** `fix(docs): include mdx in document h1 validation`.

### Task p01-t06: (review) Align the executed test summary

**Files:** Modify only the `## Test Results` prose in this project's `implementation.md`; root retains all other lifecycle sections.

**Dependencies:** p01-t05 and its committed root tracking.

**Change:** Resolve L1 from the same review: replace the obsolete planning-only placeholder with a concise Phase 1 actual results/evidence pointer. Preserve executed versus cached evidence, guidance-only limitations and pending final gates. This is a bounded review-generated artifact task on the original phase handle; no product changes or new test.

**Verification:** Conservation/readback against committed phase/task evidence; scoped formatting and diff check only.

**Format:** Documented scoped Markdown formatter.

**Commit:** `docs(oat): align wave 5 test results with phase evidence`.

### Task p01-t07: (review) Route state progress to the authoritative ledger

**Files:** Root-owned `state.md` Current Artifacts implementation entry only.

**Dependencies:** p01-t06.

**Change:** Resolve L1 from p01/r2: replace the stale duplicated progress count with a pointer to implementation.md's task ledger and verification evidence. Preserve the phase's in-progress state and pending independent gate; no product change.

**Verification:** Readback and conservation diff show only the stale prose entry changes. Scoped formatting/diff check; no automated test needed for this artifact alignment.

**Format:** Documented scoped Markdown formatter.

**Commit:** `docs(oat): route wave progress to its task ledger`.

## Phase 2: Preserve PJM settings and structured state

### Task p02-t01: Preserve unowned PJM settings through real command reruns

**Files:** Modify `packages/cli/src/commands/pjm/init.ts`, `init.test.ts`, `migrate.test.ts`; update `apps/oat-docs/docs/getting-started/index.md`, `getting-started/tool-packs.md`, `workflows/backlog-and-planning/backlog-lifecycle.md`, `workflows/ideas/lifecycle.md`, `workflows/backlog-and-planning/remote-project-management.md` only for obsolete destructive-rerun warnings and references to them.

**Dependencies:** p01 complete.

**Change:** Preserve every existing `pjm.*` key except owned `initialized` and `schemaVersion`. Retain remote description, authority default/provider settings and storage state, plus an unknown future key. No remote rewrite is needed; any future rewrite must announce before writing. Remove current warning/caveat prose and dependent warning anchors without losing adoption guidance.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts src/commands/pjm/migrate.test.ts`; `pnpm docs:validate`. Use real init and `migrate --apply` command paths on scratch adopted repos with a literal seeded remote object; compare its serialized bytes and all unowned values before/after. Do not mock `initializeRepoReference` or call live services. Regression fails when the merge is removed; both valid controls pass.

**Format:** Scoped formatter on named source/tests and the five docs pages.

**Commit:** `fix(pjm): preserve existing settings on adoption reruns (p02-t01)`

### Task p02-t02: Preserve documented structured blockers end to end

**Files:** Modify `packages/control-plane/src/types.ts`, `state/parser.ts`, `state/parser.test.ts`, `project.test.ts`; update `packages/control-plane/README.md` only to reflect this public blocker union as required by package AGENTS; modify `packages/cli/src/commands/project/status.ts`, `status.test.ts` only as compatibility requires; update `.agents/skills/oat-project-progress/SKILL.md` and `apps/oat-docs/docs/reference/project-artifacts.md` for deliberate display/type documentation.

**Dependencies:** p02-t01.

**Change:** Preserve documented `{task_id, reason, since}` objects in shared parsed/project JSON, with existing string blockers unchanged. Type the compatible union explicitly. Human/status consumers render reason and task/date deliberately, field/shell selectors serialize structured values, and the recommender/state refresh continue their existing semantics. Inspect all current consumers before widening the public type; do not change unrelated string-array fields. Document handling of malformed blocker entries without silent `[object Object]` coercion.

**Verification:** `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/project.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts`; `pnpm --filter @open-agent-toolkit/control-plane type-check`; `pnpm --filter @open-agent-toolkit/cli type-check`. At one real producer-to-CLI boundary write the exact documented YAML from completion-and-closeout, call branch-built `project status --json`, field and human output, and assert literal three fields; string control remains literal, empty/mixed list behaves deliberately. Existing CLI mocked-state tests cannot prove parser preservation; the boundary fixture must load real state.

**Format:** Scoped formatter on actual touched files listed above.

**Commit:** `fix(state): preserve structured project blockers (p02-t02)`

### Task p02-t03: (review) Keep malformed blockers visible to completion

**Files:** Modify `packages/control-plane/src/state/parser.ts`, `state/parser.test.ts`, `packages/cli/src/commands/project/status.test.ts`, `packages/control-plane/README.md`, `.agents/skills/oat-project-progress/SKILL.md`, and `apps/oat-docs/docs/reference/project-artifacts.md` only. Existing ignored p02 command-probe evidence may be refreshed; no new production hook or completion policy change.

**Dependencies:** p02-t02.

**Change:** Address passing gate M1/L1 from `reviews/archived/p02-review-2026-10-04T004538Z.md`: valid records and legacy strings remain literal; malformed list entries remain visible as a diagnostic legacy string containing their JSON, so the existing non-empty blocker hard stop remains effective. Preserve existing legacy-string normalization. Update the three ignore claims. Substitute the documented bare date in the real-reader producer fixture. This corrects a same-boundary preservation gap, not a new completion feature.

**Verification:** Existing parser/project/status test families and actual branch-built parser-to-CLI probe. The prior malformed-record-only state yields an empty blocker list; corrected state must produce a diagnostic blocker in JSON/field/shell/human and keep the canonical auto-completion nonempty-list predicate true, without invoking completion. Documented structured record with bare date, legacy string and empty-list controls still pass. Record categorical before/after outcomes and literal malformed JSON oracle; do not mock the reader or change product temporarily during review.

**Format:** `pnpm exec oxfmt --write` on only the owned actual changed files; scoped diff/check/type-check/build/docs validation.

**Commit:** `fix(state): keep malformed blocker entries visible (p02-t03)`.

## Phase 3: Shared hook-safe exact-path commits

### Task p03-t01: Implement the narrow shared primitive and skill entry

**Files:** Create `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`, `packages/cli/src/commands/internal/commit-paths.ts`, `commit-paths.test.ts`; modify `packages/cli/src/commands/internal/index.ts`. Reuse existing Git runner/config seams; do not create a broad Git framework.

**Dependencies:** p02 complete.

**Change:** Accept an explicit exact file-path list and message, with a caller-supplied operation/artifact identity for recovery. Expose `oat internal commit-paths` for skill lifecycle callers. Validate repository containment and literal paths; permit tracked removals/renames by carrying both old and new names, never wildcard/directory expansion. Hooks stay enabled. Snapshot and preserve unrelated staged blobs and unstaged bytes; successful hook-formatted owned paths match committed final bytes and are clean. Detect concurrent index changes rather than overwriting another writer's snapshot. Reuse bounded inspected lock classification/retry semantics; never delete index locks. Return structured committed/already-matching/nothing/blocked/failed outcomes with attempts and resumable diagnostics, using ignored receipt state where persistence is required. A matching prior success is positively verified, not guessed from message or exit code. Record the selected real/temporary index strategy and its interaction with hooks in implementation tracking before adoption; escalate if hook cleanliness and preservation cannot both hold for a partially staged unrelated file.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/exact-path-commit.test.ts src/commands/internal/commit-paths.test.ts`. Real temp Git repo with index-managing lint-staged-style hook, staged+unstaged versions of an unrelated file, owned create/modify/delete/rename, hook formatting, hook failure, bounded lock contention/exhaustion and concurrent writers. Compare exact unrelated index blobs and worktree bytes, HEAD path set, final owned status and matching identity. Reproduce baseline hook-dirty/broad staged leakage and post-fix rejection; unchanged valid operation passes. Concurrent-writer fixture protects index-loss behavior absent from mock runner tests; use real processes and no test-only product flags.

**Format:** Scoped formatter on the five owned files.

**Commit:** `feat(git): add hook-safe exact-path commit primitive`

### Task p03-t02: Adopt the primitive in current CLI lifecycle callers

**Files:** Modify `packages/cli/src/commands/project/log/append.ts`, `append.test.ts`, `packages/cli/src/commands/gate/index.ts`, `index.test.ts` only where shared result adapters require it; `packages/cli/src/commands/project/sync/ref-sync.ts`, `ref-sync.test.ts`; `packages/cli/src/commands/project/promote/promote.ts`, `promote.test.ts`; `packages/cli/src/commands/project/new/scaffold.ts` and its existing tests. Enumerate any additional direct project lifecycle commit sites before adoption; escalate unrelated command families rather than expanding.

**Dependencies:** p03-t01.

**Change:** Route gate-owned log commits, ref-sync record commits, promote and scaffold through the helper. Preserve caller-specific allowlists, project-log append advisory lock, committed run identity, idempotency, receipt schema/exit semantics and synced routing. Adapt structured exhaustion without hiding failure or clearing pending recovery evidence. Require exact newly created scaffold paths, not the project directory. Produce a compact caller adoption table in implementation tracking with any intentional noncaller exclusions and reasons.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts src/commands/gate/index.test.ts src/commands/project/sync/ref-sync.test.ts src/commands/project/promote/promote.test.ts src/commands/project/new`. Real scaffold-style and gate-owned hook/concurrent tests must execute the shared primitive; do not mock it. Existing lost-entry, unavailable committed-read, receipt and synced allowlist controls remain green. Prove exhausted retry is resumable, matching committed entry deduplicates, and distinct entries survive concurrency.

**Format:** Scoped formatter on only actually modified listed files.

**Commit:** `refactor(git): share lifecycle commit protections`

### Task p03-t03: Adopt exact-path commits across skill lifecycle owners

**Files:** Modify canonical commit instructions in these skills only: `oat-project-autonomous`, `oat-project-complete`, `oat-project-discover`, `oat-project-document`, `oat-project-new`, `oat-project-implement`, `oat-project-capture`, `oat-project-design`, `oat-project-lite`, `oat-project-quick-start`, `oat-project-import-plan`, `oat-project-revise`, `oat-project-promote-spec-driven`, `oat-project-plan`, `oat-project-review-receive-remote`, `oat-project-review-provide`, `oat-project-reconcile`, `oat-project-spec`, `oat-project-retro-file`, `oat-project-review-receive`, `oat-project-summary`, `oat-worktree-bootstrap-auto`, `oat-wave-execute`, `oat-brainstorm`, `oat-project-retro`, `oat-agent-instructions-apply`, `oat-docs-apply`, `oat-review-provide`, `oat-review-receive-remote`. Include only their direct commit-bearing `SKILL.md`/reference files (currently implement phase-execution and completion-and-closeout; retro apply-procedure) plus `oat-wave-execute/assets/wrapper-plan-template.md` and `.agents/agents/oat-phase-implementer.md` for their direct task-commit instructions; include `.agents/docs/autonomy-contract.md` when its vendored inventory is affected. The wrapper and role adopt the same primitive; do not leave a separate weaker task-commit route. Modify `packages/cli/src/validation/skills.ts`/`skills.test.ts` only to preserve existing safety validation for the new helper form. Mechanically adapt the existing public-contract tests `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `project-start-preflight-contracts.test.ts`, and `post-implement-sequence-contracts.test.ts` where focused failures prove their old staging-form assertions obsolete; preserve ownership, fail-closed, smoke and receipt requirements. Update `apps/oat-docs/docs/reference/cli-reference.md` for the narrow maintenance command.

**Dependencies:** p03-t02. All skill writes are serial with p01 and later p04/p05; versions finalized once per skill in p06.

**Change:** Inventory executable lifecycle commit snippets and replace broad staged-index commits and weaker pathspec-only variants with the shared entry plus exact owned paths. Preserve synced `oat project push` routing, scope failures, conditional created-file sets, error propagation, hook enablement, resumable diagnostics and bookkeeping ownership. From p03-t03 onward this wave’s root and workers invoke the branch CLI directly from source (`pnpm --silent run cli -- internal commit-paths ...`) for lifecycle bookkeeping until the new command ships. Any branch-built `dist` invocation requires a fresh `pnpm build` after the latest CLI source changes. Shipped guidance fails closed with update guidance when the command is unavailable, never falls back to a broad staged-index commit. Text explaining historical evidence is not an executable caller. Report every adopted or intentionally excluded site; do not sweep all skill text blindly. Archive and knowledge-specific adoption remain p04 responsibilities.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/project-start-preflight-contracts.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`; `pnpm oat:validate-skills`; `pnpm test:skills`. Exercise a representative shared scaffold/bookkeeping snippet in a disposable repo through the real internal command with unrelated staged data and the real index-managing hook; synced snippets must still route to project push and fail closed on scope errors. The executable text is the public skill contract; validator tests protect loss of path ownership, not internal wording trivia.

**Format:** Scoped formatter on the inventoried actual commit-bearing files and validation/docs edits; no provider-view hand edits.

**Commit:** `fix(skills): use shared exact-path lifecycle commits`

### Task p03-t04: Reconcile lifecycle commit recovery (p03-review)

**Findings:** H1/H2 in `reviews/archived/p03-review-2026-10-04T022902Z.md`; root agrees with both independently repeated real-caller probes.

**Files:** Only `packages/cli/src/commands/project/sync/ref-sync.ts`, `ref-sync.test.ts`; `packages/cli/src/commands/project/promote/promote.ts`, `promote.test.ts`; `packages/cli/src/commands/project/log/append.ts`, `append.test.ts`; `packages/cli/src/commands/project/migrate/index.ts`, `index.test.ts` for the actual public recovery route; and `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts` if narrow reservation/receipt reconciliation requires shared-owner changes. Declare any need beyond these ten paths before editing.

**Dependencies:** p03-t01/t02/t03 committed; same accepted phase author; fix iteration 1 of 2, independent of settled recovery1/10. One append-only fix-round commit, no original task/recovery amendments.

**Change:** Recover actual committed-but-blocked migration after owning compensation without retaining a receipt whose commit is no longer an ancestor. Either reconcile only verified operation-owned pending state after proven complete rollback or preserve the verified committed state with concrete pending finalization; preserve foreign/replaced markers and positive ancestor/tree/identity verification. Expose promotion helper outcome, attempts, lock class, stable identity, receipt and safely quoted executable exact-path recovery command in public JSON/human persistence refusal. Following that instruction after lock release finalizes already-produced Quick artifacts and deduplicates a committed-but-pending promotion. Preserve existing refusal/synced/local semantics.

**Verification:** Add owning-family regressions failing on reviewed code for the actual failures; real Git/hooks, offline bare remote, actual CLI output, executable returned recovery instruction, committed-but-blocked retry, foreign/replaced marker retention and literal unrelated staged/unstaged/concurrent preservation. Saved baseline probes: `analysis/p03/review-r1-migration-retry.mjs` and `review-r1-promotion-recovery.mjs`; normal accepted controls pass. Bad outcomes are reproduction evidence, never product acceptance oracles. Run full Phase 3 twelve-file composition plus the existing migrate/index.test.ts public-command family and fresh CLI check/types/build; direct execution, no Turbo replay. No new harness or test-only hooks.

**Format:** Scoped `pnpm exec oxfmt --write` on exact edited files.

**Commit:** `fix(git): retain recoverable lifecycle commit state`

### Task p03-t05: (review) Verify committed receipt parents before settlement

**Finding:** M1 in `reviews/archived/p03-review-2026-10-04T032627Z.md`; root repeated the real receipt-replacement probe and agrees with the bounded provenance finding. The exercised commit/tree remain correct; no index-loss claim.

**Files:** Only `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`, and `packages/cli/src/commands/project/migrate/index.test.ts`. Declare any additional need before editing.

**Dependencies:** p03-t04 committed; same accepted Sol6.1/high phase author. Second bounded review correction, independent of settled recovery usage1/10. One append-only task commit; no original amendments.

**Change:** Add positive actual-parent verification in the existing committed-receipt resume branch before index/receipt settlement. Preserve the existing empty-parent representation for valid root commits. Reject a committed receipt replacement with a conflicting parent, retain the migration marker and replacement evidence, and preserve literal unrelated Git state. Keep existing identity/tree/trailer/ancestor/path checks and caller recovery unchanged; no new recovery framework.

**Verification:** Extend the existing helper and owning public migration families with the captured wrong-parent replacement and valid accepted controls, using real collaborators. Reproduce pre-fix failure for the stated reason; rebuild CLI and repeat `analysis/p03/review-r2-receipt-gap.mjs` expecting refusal with marker/foreign receipt retained. Repeat both saved actual public recovery probes and the existing Phase3 thirteen-file composition, fresh CLI check/types/build, scoped formatting/diff. Direct execution; no new harness or test-only production hook.

**Format:** Scoped `pnpm exec oxfmt --write` on exact edited files.

**Commit:** `fix(git): verify committed receipt parent before settlement`

### Task p03-t06: (review) Support unrelated nested repositories and gitlinks

**Finding:** H1 in `reviews/archived/p03-review-2026-10-04T051023Z.md`; root disposition agrees, bounded corrective revision explicitly approved by the operator on 2026-10-04.

**Files:** `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`. Declare any additional need before editing.

**Dependencies:** p03-t05 committed. User explicitly approved these four corrections and one additional native review plus configured Opus gate; further blocking findings return to the operator. One append-only correction commit per task, original commits immutable.

**Change:** Handle directory entries in both preservation snapshot and hook guard without readFile/EISDIR. Preserve literal unrelated index/worktree state and containment; do not silently weaken C2 by skipping directories without a justified contract.

**Verification:** Real-Git nested repository and tracked submodule accepted controls, with unrelated staged/worktree state preserved; pre-fix commands fail EISDIR. Existing invalid owned-directory refusal still passes. Existing owning-family tests, CLI check/type-check/fresh build; direct execution and proportional negative/accepted controls.

**Format:** Scoped `pnpm exec oxfmt --write` on actual edited files.

### Task p03-t07: (review) Accept staged tracked removals and both rename sides

**Finding:** M1 in `reviews/archived/p03-review-2026-10-04T051023Z.md`; root disposition agrees, bounded corrective revision explicitly approved by the operator on 2026-10-04.

**Files:** `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`. Declare any additional need before editing.

**Dependencies:** p03-t05 committed. User explicitly approved these four corrections and one additional native review plus configured Opus gate; further blocking findings return to the operator. One append-only correction commit per task, original commits immutable.

**Change:** Positively recognize HEAD-tracked removals absent from the real index after git rm/git mv. Commit both old/new names; preserve unrelated staging and existing literal path validation.

**Verification:** Actual staged git rm and git mv both-side controls must fail on the reviewed implementation and pass after correction; normal filesystem rename and untracked-missing refusal remain valid. Existing owning-family tests, CLI check/type-check/fresh build; direct execution and proportional negative/accepted controls.

**Format:** Scoped `pnpm exec oxfmt --write` on actual edited files.

### Task p03-t08: (review) Settle operation-owned resources on termination

**Finding:** M2 in `reviews/archived/p03-review-2026-10-04T051023Z.md`; root disposition agrees, bounded corrective revision explicitly approved by the operator on 2026-10-04.

**Files:** `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`; `packages/cli/src/commands/internal/commit-paths.ts`, `commit-paths.test.ts` only if owning CLI signal handling is needed. Declare any additional need before editing.

**Dependencies:** p03-t05 committed. User explicitly approved these four corrections and one additional native review plus configured Opus gate; further blocking findings return to the operator. One append-only correction commit per task, original commits immutable.

**Change:** Bound termination handling to the active operation. Coordinate cancellation/settlement of child Git before inode-verified owned lock/temp cleanup; never unlock while a surviving child can commit, and never remove foreign/replaced resources. No new PID database or generic recovery framework unless separately justified.

**Verification:** Real child/hook SIGTERM and SIGINT probes show no orphaned owned index.lock or stale unreported commit/index state, valid retry finalizes safely, and replacement/foreign locks remain. Gate signal finding is independently executed evidence; root has not repeated it yet. Existing owning-family tests, CLI check/type-check/fresh build; direct execution and proportional negative/accepted controls.

**Format:** Scoped `pnpm exec oxfmt --write` on actual edited files.

### Task p03-t09: (review) Finalize settled record markers before fresh operations

**Finding:** L1 in `reviews/archived/p03-review-2026-10-04T051023Z.md`; root disposition agrees, bounded corrective revision explicitly approved by the operator on 2026-10-04.

**Files:** `packages/cli/src/commands/project/sync/ref-sync.ts`, `ref-sync.test.ts`, `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`. Root accepted the declared helper/test addition before editing: share a narrow positive settlement proof instead of duplicating a weaker receipt validator.

**Dependencies:** p03-t05 committed. User explicitly approved these four corrections and one additional native review plus configured Opus gate; further blocking findings return to the operator. One append-only correction commit per task, original commits immutable.

**Change:** Close the existing adapter/helper settlement gap using positively verified owning finalization or settled-marker reconciliation. Preserve foreign marker/receipt and idempotent matching retries; safely allow a later distinct content operation with the same message/paths.

**Verification:** Exercise the public record-commit recovery followed by changed-content recurrence, matching repeat and foreign/replaced-marker refusals through actual helper. Gate recurrence is source-only evidence; reproduce before choosing the correction. Existing owning-family tests, CLI check/type-check/fresh build; direct execution and proportional negative/accepted controls.

**Format:** Scoped `pnpm exec oxfmt --write` on actual edited files.

### Task p03-t10: (review) Complete record recovery across committed generations

**Finding:** M1 in `reviews/archived/p03-review-2026-10-04T062815Z.md`, independently reproduced by root. The no-intervening accepted control passes; a real different-message commit to the same record followed by the original fresh unstaged operation fails with its stale identity. This is the original L1 prune/re-scaffold/prune case, not the disclosed staged-recurrence limitation.

**Status:** Completed at47e441ace; native r5 passed and configured r3 received with its finding resolved by p03-t11. Signal Low remains final-owned.

**Files:** Proposed existing `packages/cli/src/commands/project/sync/ref-sync.ts`, `ref-sync.test.ts`, `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`. The refreshed assessment recommends narrowly verified superseded-reservation retirement through the shared owner; operator approved this bounded route. Declare any additional need before editing.

**Dependencies:** p03-t09 committed; operator approved correction and one cycle. Phase 4 waits for acceptance; preserve all original commits and counters.

**Change:** Complete the existing marker-owning recovery boundary so a later valid committed generation cannot strand a stale identity. Do not remove the helper's changed-HEAD safety guard or rotate arbitrary failures. Preserve actual parent/tree/trailer/ancestry/emitted ownership, unresolved-publication and foreign/replaced-marker refusal, migration finalization and unrelated Git state.

**Verification:** Extend the existing owning record family with exact saved `analysis/p03/review-r4-intervening-record.mjs` sequence. Expected acceptance currently fails exit1; after correction it must succeed while the no-intervening control and refusal/preservation controls still pass. Include removal/recreation where final worktree absence equals the original receipt but HEAD contains the recreated record; retirement proof binds validated history/current publication/marker ownership. Direct committed-head composition, CLI check/types/fresh build and actual public recovery probes; one additional fresh standard review and configured gate are operator-authorized; residual accepted-requirement gaps return to operator.

**Format:** Scoped formatter on actual owned files.

### Task p03-t11: (review) Recover superseded record reservations with an unrecorded commit

**Finding:** M1 in `reviews/archived/p03-review-2026-10-04T125636Z.md`, independently reproduced by root. A post-commit unowned-file mutation leaves the initial receipt without commit/tree; immediate retry recovers successfully. After a valid different-message same-record commit, the original message/path pair fails repeatedly, with no retirement proof and its marker retained.

**Status:** Completed at1f7e5842; native r6 received and configured r4 confirms the named sequence. Diagnostic M1 is approved for p03-t12; automatic rewrite recovery is deferred. Six Low findings stay final-owned.

**Files:** `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`, `packages/cli/src/commands/project/sync/ref-sync.ts`, `ref-sync.test.ts`. Only these four product paths are authorized; declare additional scope before editing.

**Dependencies:** p03-t10 complete; mandatory refreshed complexity assessment and explicit operator disposition before correction or Phase 4.

**Change:** Complete positively recovered prior-operation recognition through its existing shared verification owner, preserving strict direct old-identity refusal, current publication/receipt/index/HEAD/lock checks, matching marker inode/device/bytes, bounded fresh reservation and migration mandatory finalization. No old-tree publication, arbitrary failure rotation, weaker duplicate validator, new recovery framework or receipt schema.

**Verification:** Saved `analysis/p03/gate-r3-adapter-unrecorded.mjs` has observation-only exit0; its immediate accepted control passes and later-generation output reproduces the dead end. Root captures output and applies an independent expected fresh-SHA/zero-marker acceptance oracle: `analysis/p03-gate-r3-root-unrecorded-acceptance.exit` currently1; unrelated literal preservation passes. Extend the existing record regression with this captured real-Git post-commit failure, then retain staged/forged/foreign/replaced/current-publication refusals and prior intervening/prune-recreate/direct-oldidentity controls. Direct phase composition/check/types/freshbuild and authorized fresh review/gate only after operator decision.

**Format:** Scoped formatter on actual owned files.

### Task p03-t12: (review) Make unbound-provenance refusal diagnostics truthful

**Finding:** Diagnostic portion of M1 in `reviews/archived/p03-review-2026-10-04T140803Z.md`; refreshed necessity report `reviews/archived/complexity-p03-2026-10-04T142327Z.md`. Operator approved this bounded correction and one additional review cycle on 2026-10-04.

**Files:** Only `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`, `packages/cli/src/commands/project/sync/ref-sync.ts`, `ref-sync.test.ts`.

**Dependencies:** p03-t11 committed. Automatic rewritten-history recovery is explicitly deferred; six Low findings retain final ownership. Original request `wave5-p03-implement-r1`; same exact Sol6.1/high target.

**Status:** Completed atc13e4faed; authorized native r7/configured r5 pending.

**Change:** For trailer candidates that cannot bind the receipt parent, preserve safe refusal and retained evidence, but use existing result/error fields to state an inspection/reconciliation stop. Do not advertise unchanged same-identity retry as sufficient or infer that rebase is certain. Preserve every parent/tree/trailer/ancestry/path/publication/marker ownership guard, migration compensation and mandatory finalization. No automatic marker/receipt deletion or rotation, new command/schema/registry or broader failure-semantic redesign.

**Verification:** Extend the existing owning real-Git record regression with saved `analysis/p03/gate-r4-rewritten-history.mjs` input. Pre-fix assertions must fail for misleading retryability/guidance, post-fix must refuse truthfully while marker/receipt/HEAD/index/worktree/unrelated literals are unchanged. No-rewrite accepted control passes. Retain forged-provenance, recovered/unrecorded, intervening/prune-recreate/direct-oldidentity and migration controls. CLI check/types/freshbuild plus direct phase composition; ONE fresh native Sol6.1/high review (r7) and configured Opus5.5/high gate (r5) are authorized. Further unresolved findings return to operator; counts never reset.

**Format:** Scoped formatter on actual edited paths; one append-only task commit.

**Commit:** `fix(git): report unbound recovery as inspection required`

## Phase 4: Archive and knowledge-refresh consumers

### Task p04-t01: Make backlog archive mutations staging-neutral

**Files:** Modify `packages/cli/src/commands/backlog/archive.ts`, `archive.test.ts`, and the archive command wrapper in `packages/cli/src/commands/backlog/index.ts` if result printing requires it; update `apps/oat-docs/docs/reference/config-and-local-state.md` for the result contract. Mechanically derived effective additions: `index.test.ts` typed/JSON result propagation and `rewrite-references.ts` interrupted-operation path ownership through the existing scanner; accepted by root before edit.

**Dependencies:** p03 complete.

**Change:** Replace automatic `git mv` with filesystem mutation. Archive must not touch the index in successful, noop or recovery paths. Report complete normalized source/destination/item, completed-ledger, index and rewritten-reference paths, with unambiguous affected-path collection for callers including tracked deletion paths. Keep lifecycle/status/summary/link rewrite/idempotency behavior; report actual mutated outputs on retry as well. Do not absorb the helper's implementation into this S ticket.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`. Real tracked scratch item with unrelated staged+unstaged work: index bytes/path staging remain unchanged after archive; result names every operation path; current content is on disk; noop/retry completes reference/index repairs. Baseline demonstrates staged rename with stale item bytes/old-path staging failure, post-fix staging-neutral result rejects that failure state; valid no-Git and Git controls pass.

**Format:** Scoped formatter on actual owned files.

**Commit:** `fix(backlog): leave archive staging to callers`

### Task p04-t02: Commit complete archive operations in lifecycle callers

**Files:** Modify `.oat/repo/pjm/AGENTS.md`, the canonical guidance templates `.oat/templates/pjm-agents.md`, `repo-agents.md`, `repo-readme.md`, `.agents/skills/oat-pjm-update-repo-reference/SKILL.md`, `oat-pjm-review-backlog/SKILL.md`, `oat-doctor/SKILL.md`, `oat-wave-execute/SKILL.md` and its `assets/wrapper-plan-template.md` and other actual `oat backlog archive` lifecycle call sites located by scoped inventory; update `apps/oat-docs/docs/workflows/backlog-and-planning/backlog-lifecycle.md`, `reference/config-and-local-state.md`, and `reference/cli-reference.md`. Extend existing CLI/skill integration tests that own archive closeout; create one scoped skill probe only if none reaches the consumer.

**Dependencies:** p04-t01 and p03-t03.

**Change:** Caller consumes all reported affected paths, adds handoff deletion if owned, formats rewritten text, and commits via the shared primitive. Include old tracked item path and new destination; never stage only the old missing path or omit ledger/index/references. Keep per-item summary and terminal-state policy; preserve unrelated staged work. Align manual fallback guidance with caller-owned staging. Update the adoption table rather than introducing another Git wrapper.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`; `pnpm test:skills`; `pnpm oat:validate-skills`; `pnpm docs:validate`. Execute real archive then shared helper in one scratch lifecycle: HEAD contains terminal item, ledger, index and rewritten refs; old file absent; unrelated staged data remains staged/uncommitted. Negative omitted-old/destination partial-operation control must fail the operation-completeness assertion, accepted full-path control passes.

**Format:** Scoped formatter on actual changed guidance, consumer and test files.

**Commit:** `fix(lifecycle): commit complete backlog archive results`

### Task p04-t03: Preserve manual knowledge and staged user work

**Files:** Modify `.agents/skills/oat-repo-knowledge-index/SKILL.md`; create `.agents/skills/oat-repo-knowledge-index/scripts/refresh-owned.mjs` and `tests/refresh-owned.test.mjs` only for the small deterministic ownership/refresh boundary needed by the skill; update `apps/oat-docs/docs/skills/repo-improve.md` to remove the obsolete warning.

**Dependencies:** p03-t01/p03-t03, after p04-t02 finishes shared lifecycle writes.

**Change:** Replace blanket Markdown deletion with explicit generated ownership: existing `oat_generated: true` files may be refreshed, known expected generated outputs must not overwrite unmarked hand-written collisions, and unrelated/manual files survive. Keep generation/frontmatter contracts, preflight and tracking workflow. Commit the exact generated paths through the shared primitive; unrelated staging survives. Do not create a second persistent tracking manifest when existing generated metadata suffices.

**Verification:** `node --test .agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs`; `pnpm oat:validate-skills`; `pnpm docs:validate`. Disposable repository with a manual Markdown file, generated old file, unmarked output-name collision and unrelated staged/unstaged data; execute the actual deterministic refresh/commit path without model calls. Baseline broad-delete/broad-commit control loses manual content or captures staged work; fixed case preserves bytes/index and commits only declared generated outputs. Test fails when either broad operation returns. Small script fixture is justified because prose-only scanning cannot prove filesystem/index preservation; no general generation harness.

**Format:** Scoped formatter on the four named text files.

**Commit:** `fix(knowledge): preserve manual files during refresh`

### Task p04-t04: Offer and persist Plain Markdown in guided init

**Requirement:** U1 — user explicitly requested Plain Markdown in the existing-docs menu, saving the choice in config (2026-10-04). This is a direct addition to the approved Quick wave, not an eleventh backlog closure.

**Files:** `packages/cli/src/commands/init/index.ts`, `guided-setup.test.ts`; `apps/oat-docs/docs/getting-started/bootstrap.md`.

**Dependencies:** p03 received/cleared before Phase 4 launch.

**Change:** Add `Plain Markdown` with literal value `markdown` to existing-documentation tooling choices. Preserve common existing-framework choices and existing default. Persist `documentation.tooling: "markdown"` and selected normalized root through the existing config merge, preserving unrelated documentation/config fields. No automatic Markdown detection or framework scaffold changes.

**Verification:** Extend the existing guided setup family using the actual supplied menu choices and real config IO in a temporary repository. Select the actual Markdown option, run `init --setup --scope project`, and read persisted `.oat/config.json` to verify tooling/root plus unrelated setting preservation. A mock that returns markdown regardless of offered choices is insufficient: the keeper must fail pre-fix because the option is absent. Run focused guided-setup tests, CLI check/types/build and applicable docs checks.

**Format:** Scoped `pnpm exec oxfmt --write` on the three edited files.

**Commit:** `fix(init): offer plain Markdown documentation tooling`

## Phase 5: Flat recap export and complete historical migration

### Task p05-t01: Export one page while verifying the full source package

**Files:** Modify `packages/cli/src/commands/project/archive/archive-utils.ts`, `archive-utils.test.ts`, `push-runner.ts`, `push-runner.test.ts`, and `index.test.ts` if public JSON coverage requires it. Reuse existing `fixtures/v2-package` captured package with its provenance; derive legacy cases from the actual tracked legacy manifests rather than invented external-format schemas.

**Dependencies:** p04 complete; all archive producer/shared commit adapters reconciled.

**Change:** Verify all required source hashes/inventory before exporting, including QA and fact base. Produce exactly `.oat/repo/reference/project-recaps/YYYYMMDD-project.html`, embed required local assets and repair/strip project-relative source links in the exported copy, allowing valid tracked summary/decision and external PR targets. Preserve original source/page bytes in the archived run. Report run id, page path, original and exported SHA-256 and verified evidence count as needed; no tracked sidecar. Existing matching transformed page is idempotent, differing existing page rejects without overwrite consent. Atomic attempt-owned temp writes and rollback must not remove a pre-existing matching export or another writer's replacement. Retain the full source package in local and synced archives; existing archive receipt/resume guarantees remain valid.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/index.test.ts`. Extend existing export/hash/collision family: tampered QA/fact base rejects despite page-only output; full-package tracked export violates contents control; matching retry passes without duplication; different page rejects; injected failure removes only attempt-owned writes; concurrent replacement survives; exported relative href/src resolve including fragments. Valid source+page passes. Run against captured v2 and real legacy package before requesting review; keep fixture provenance and archive/S3 seam tests offline.

**Format:** Scoped formatter on actual owned source/tests/fixture text files. Never format exported HTML after hashing; preserve the recap ignore rule.

**Commit:** `fix(archive): export verified recaps as single html pages`

### Task p05-t02: Compose report, completion/resume, summary and documentation

**Files:** Modify `.agents/skills/oat-project-complete/SKILL.md`, its `scripts/` and existing tests only where the new report crosses the consumer (including resolve-synced-archive-entry, execute/finalize entry, parse resume/retry fields and durable-receipt validation when applicable); `packages/cli/src/commands/project/archive/archive-utils.ts`/tests only for summary links/report integration; `apps/oat-docs/docs/reference/project-artifacts.md`, `reference/cli-reference.md`; amend `.oat/repo/reference/decisions/DR-260911-explainers-are-agent-authored.md` and regenerate its index through the owning command.

**Dependencies:** p05-t01. Preserve p03/p04 edits in the same completion skill.

**Change:** Consumer contract uses the flat page path/run/hash identity instead of requiring export `manifest.relativePath`. Inspect all projectRecapExport readers, including report printing and synced terminal retry/resume paths; preserve old receipt readability deliberately where needed, but new successful exports use only the new shape. Summary `Explainer Outcome` and maintained PR References target the page. Document tracked page versus full archive evidence, retained integrity checks, idempotency and no sidecar. Amend the existing recap decision to state this durability split, preserving its original authoring decision and history. Run PJM doctor before decision write and owning decision index regeneration afterward.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/sync-runner.test.ts`; `node --test .agents/skills/oat-project-complete/tests/*.test.mjs`; `pnpm oat:validate-skills`; `pnpm docs:validate`. Real branch producer JSON fed into completion/resume consumers, with matching and mismatched run/page/hash controls, must succeed/fail categorically; no fabricated report-only fixture. Conservation review confirms report fields, docs and decision claims remain coherent. Use offline sync seams, no live remote or AWS calls.

**Format:** Scoped formatter on the actually enumerated consumer/tests/docs/decision outputs.

**Commit:** `fix(completion): consume flat recap export reports`

### Task p05-t03: Migrate every tracked recap after evidence preservation

**Files:** Own only `.oat/repo/reference/project-recaps/` migration outputs/removals, corresponding maintained inbound references under `.oat/repo/reference/project-summaries/`, `.oat/repo/` and current project PR-reference artifacts discovered by link inventory. Local ignored archived run copies are preservation outputs, never staged. No changes to original source evidence or historical external PRs. Amend migration checks in the existing archive test family only if needed to enforce final export contents.

**Dependencies:** p05-t02.

**Change:** Re-inventory tracked packages and sizes at task start. Planning inventory: `20260721-explainer-kit`, `20260722-wave-skills-promotion`, `20260914-agent-authored-recap`, `20260927-triage-correctness-wave`, `20260928-backlog-wave-2`, `20261001-backlog-wave-3`, `20261003-backlog-wave-4`. Legacy page paths are nested under `site/initiatives/...`; use manifest-declared page rather than assume `site/index.html`. For each package locate the corresponding archived project/run, compare full relative-file/hash inventory, preserve any missing original file byte-for-byte in the archive and verify before deleting tracked support files. If conflicting evidence cannot be reconciled, stop before removal. The archive copy must retain original page, source, QA and package metadata; S3 synchronization retains that same full archived tree through existing behavior.

Create one same-stem `.html` file per package using p05-t01's export/link rules; rewrite every maintained inbound link and fix exported relative resources/fragments. Handle stray `2026-08-19-defect-wave-program.fact-base.json` by locating its consumer and preserving it in that consumer's archive/source location before removing the tracked stray; do not invent a replacement sidecar. Remove supporting directories only after preservation proof. Record before/after tracked byte counts and per-package categorical preservation/link/contents results in a short implementation summary; hash inventories/logs remain ignored.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts`; `pnpm docs:validate`; `git diff --check`. Repeat exact tracked inventory and byte count; assert seven (or newly inventoried additional) flat pages, zero tracked support directories/sidecars, all relative href/src resolvable, no maintained old-path refs, and byte/hash equality of every original package file with its preserved archive copy. Perform a rollback/retry local scratch migration before the real removals; a conflicting archive byte blocks deletion while matching retry passes. Review conservation of original HTML content except intentional link/asset transformations. Do not claim preservation from directory existence alone or claim live S3 upload without evidence.

**Format:** Format only actual rewritten Markdown references; never format the flat exported HTML or immutable archived originals. Preserve `.oxfmtrc.jsonc`’s recap ignore rule, which also covers flat pages.

**Commit:** `refactor(recaps): migrate tracked packages to flat pages`

### Task p05-t04: (review) Repair valid unquoted recap links and assets

**Files:** Only `packages/cli/src/commands/project/archive/archive-utils.ts` and its existing `archive-utils.test.ts` family. Preserve every retained original package and migrated HTML byte; no new dependency/parser subsystem, report/receipt schema or authoring policy.

**Dependencies:** p05-t01/t02/t03 complete; original accepted phase handle `wave5-p05-implement-r1`, continuation `cont-backlog-wave-5-p05-fix-1`. Review fix iteration 1 of 2; independent of recovery used1/10 pendingnull.

**Change:** Confirmed native p05 r1 M1: valid unquoted href/src bypass quoted-only rewriting, leaving a successful flat export with a nonexistent destination. Apply the existing containment, asset inlining, target and fragment rules consistently to valid quoted and unquoted attribute syntax. Remove/repair unavailable project-source links, embed required local assets and preserve valid tracked/external links. No original source/page transformation in place.

**Verification:** Retain original negative observer `analysis/p05/review-r1-link-syntax.*` and independent root reproduction. Run focused existing-family regressions on the reviewed baseline (must fail), then repaired implementation (must pass), checking emitted destination link/asset validity with quoted accepted comparisons and source-byte conservation. Use a honestly labelled derivative of the captured authentic package, not an invented external manifest. Rerun the four archive/report/offline sync Vitest families, all existing completion tests, CLI check/type-check and fresh CLI build. Repeat authentic seven-package output/hash conservation and real producer/consumer controls as relevant. No live remote/provider/AWS call, test-only hook or broad test audit.

**Format:** Scoped repository formatter on the two owned source/test files; never format hashed HTML/original evidence.

**Commit:** `fix(archive): repair unquoted recap links and assets`

### Task p05-t05: (review) Restrict recap rewriting to actual HTML attributes

**Files:** `packages/cli/src/commands/project/archive/archive-utils.ts`, its existing `archive-utils.test.ts`, and exactly four user-approved generated pages under `.oat/repo/reference/project-recaps/`: `20260914-agent-authored-recap.html`, `20260927-triage-correctness-wave.html`, `20261001-backlog-wave-3.html`, `20261003-backlog-wave-4.html`. Four HTML changes are limited to removing30corrupt SVG marker URL inner quote pairs (60bytes), using exact genuine fresh producer output. Preserve every retained original package, other three exported pages, narratives, IDs and links; no new parser framework/dependency, report schema, authoring restriction or product policy. User approved this explicit extension on2026-10-04.

**Dependencies:** p05-t01 through p05-t04 complete. Same accepted author `wave5-p05-fix1-crash-resume`, linked original request `wave5-p05-implement-r1`, continuation `cont-backlog-wave-5-p05-fix-2`. Review fix iteration 2 of 2; recovery used1/10 pendingnull unchanged.

**Change:** Confirmed native p05 r2 M1: whole-document unquoted href/src matching changes valid inline JavaScript and can refuse a valid export. Restrict relevant href/src, CSS and script replacement paths to actual markup attributes; preserve inline/inlined script/style bodies and non-attribute text, including tag-shaped strings/comments. Keep existing quoted/unquoted link repair, asset inlining, target/fragment and containment rules.

**Verification:** Preserve reviewer and independent root inline-script baseline/current observers. On reviewed baseline prove the literal href/src script controls fail preservation/execution while unrelated value control passes; repaired output must preserve and execute all three to 123. Extend the existing export test family proportionally for relevant raw bodies/non-attribute text and retain quoted/unquoted links/assets/containment. Use honestly labelled derivatives of retained authentic packages; originals stay byte-identical. Corrected four derived pages must match genuine producer hashes and restore matching retries; retain old/new complete-byte identity evidence without rewriting historical receipts. Rerun four archive/report/offline-sync test families, completion tests, CLI check/type-check and fresh CLI build. Repeat genuine seven-package output/hash conservation and real public producer/readers as relevant. No live remote/provider/AWS call, test-only production hook or broad parser/test audit.

**Format:** Scoped repository formatter on the two code files only; copy the four generated pages as exact verified producer bytes without formatting.

**Commit:** `fix(archive): preserve script bodies during recap rewriting`

## Phase 6: Versions and generated integration

### Task p06-t01: Finalize versions, generated projections and docs

**Files:** Modify the five lockstep public manifests (`packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`), `pnpm-lock.yaml` if the owning command changes it, every changed canonical skill's `SKILL.md` metadata version and changed agent's top-level version. Own only generated provider projections/catalog/index outputs reported by current sync/docs commands and docs necessary for these ten tickets.

**Dependencies:** p01–p05 complete.

**Change:** Fetch origin/main and inspect current versions before choosing one common next public version strictly greater than main; do not pre-invent a version. Bump each changed skill/agent once per final PR diff, including all symlink vendors identified by the strengthened gate. Inventory final changed bundled paths, regenerate project provider views via the branch command `pnpm run cli -- sync --scope project` (user-scope refresh remains operator-owned), bundled assets via build, docs catalog via `pnpm docs:skills:generate`, root docs index and nav via owning CLI only when changed. Preserve setup’s committed sync-manifest content; do not overwrite projections by hand. Remove only obsolete warnings proven fixed by p02/p04, including warning links/anchors. Produce the exact ten-ticket docs coverage check.

**Verification:** `pnpm run check:skill-bumps`; `pnpm release:check-versions`; `pnpm release:validate`; `pnpm docs:skills:check`; `pnpm docs:validate`; `pnpm lint`; `pnpm format`. Inspect the final diff to ensure one bump per changed owner, five-package lockstep, every vendor covered, no generated drift, no unrelated scope. Gate runs here are early feedback; the root lifecycle tail runs the full ordered final sequence.

**Format:** Scoped formatter after generation on actual owned manifests, skill/agent files, projections and docs outputs.

**Commit:** `chore(release): bump wave 5 bundled contracts`

### Task p06-t02: Propagate version pins into retained contract tests

**Files:** `packages/cli/src/validation/skills.test.ts`; `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`.

**Dependencies:** p06-t01 complete. Operator approved the bounded final-test amendment and delegated routine continuation on2026-10-04.

**Change:** Update only literal version expectations for the committed p06 owner inventory. Preserve all behavior assertions, fixed pin counts and independently known expected versions; inspect newly unmasked failures before expanding. No version bump or product change.

**Verification:** Direct Vitest run of both existing files, before and after commit; scoped format; diff conservation.

**Commit:** `test(skills): align final bundled version contracts`

### Task p06-t03: Reconcile final inventory composition

**Files:** `.agents/docs/autonomy-contract.md` HEAD coverage cells; `packages/cli/src/validation/named-skill-load-contract.test.ts` CALL_SITE_MATRIX rows.

**Dependencies:** p06-t02 complete. Same explicit approval.

**Change:** Reconcile nine unmapped and seven stale prompt fingerprints with unchanged gate classifications. In particular90001dadf75f→e30e06f39281 retains REVIEWRECEIVE-07, overriding the diagnostic's erroneous NG recommendation. Classify only seven evidenced reference/ownership/operation-identity mentions as non-executing. Preserve scanner/load-required/negative controls; do not change autonomy-gate-inventory.test.ts. Existing PR-scoped vendor bumps remain unchanged.

**Verification:** Both existing inventory suites, canonical validation and skill-bump gate, scoped format, source/destination vendor parity through owning build; all pre/post-commit exits recorded. No hand-written provider projections.

**Commit:** `fix(skills): reconcile final autonomy inventories`

### Task p06-t04: Exercise real helper failure and bookkeeping contracts

**Files:** `packages/cli/src/commands/init/tools/shared/project-log-staging-behavior.test.ts`; `packages/cli/src/commands/pjm/init.test.ts`; `packages/cli/src/commands/project/prune/index.test.ts`.

**Dependencies:** p06-t03 complete. Same explicit approval.

**Change:** Supply stable unique fixture identities and execute the real branch helper in disposable repos. Preserve omitted-log negative control, filesystem handoff deletion/owned tracked removal in the shipping PR, unrelated staged blobs/worktree bytes and both prune retry/refusal scenarios. Inject actual failing Git hooks instead of bypassed commit spies; observe the owned deletion/pending receipt and same-operation retry rather than guessing staged status or mocking success. If a real product defect appears, report the exact evidence for root-scoped correction; do not hide it with a test change.

**Verification:** Three existing direct suites, real failure/accepted/retry controls and exact Git conservation, scoped format; repeat after commit. Root subsequently restarts all final gates into new receipt paths.

**Commit:** `test(git): exercise lifecycle helpers through real hooks`

### Task p06-t05: Close proportional guidance and evidence findings

**Files:** `.agents/skills/oat-project-autonomous/SKILL.md`; `.agents/agents/oat-reviewer.md`; `.agents/skills/oat-project-review-provide/SKILL.md`; `.agents/skills/oat-project-review-provide-remote/SKILL.md`; `packages/cli/src/validation/skills.test.ts`; `.agents/docs/autonomy-contract.md` only if changed prompt fingerprints require same-policy coverage reconciliation.

**Dependencies:** p06-t04 complete. Operator delegated scoped final finding resolution on2026-10-04.

**Change:** Address p01gate five Lows. Split immediate exact-target loss from authorized same-handle/same-target continuation stops using owning terms. Require a blocking finding under the existing severity model, not a pre-existing finding. Move the probe-record operational instruction out of the fenced artifact body or replace it with a placeholder, conserving fields. Remove the self-local withoutStop assertions as invalid shipped evidence; retain the real positive contract keepers and positive separate-future-policy assertion rather than a brittle negative phrase scan. Add chained vendor, top-level tests-only and aliased-document cases to the existing real-Git keeper as needed after inspecting existing coverage. Preserve the existing ACMR deletion policy as a recorded limitation; do not change production validator behavior. Reconcile only fingerprints affected by these guidance edits, retaining each gate classification. No additional metadata bump: changed owners already bumped once in this PR.

**Verification:** Deliberate-testing protection accounting for removed controls; direct skills/autonomy/named-call inventory suites, real Git unbumped rejection and bumped accepted control; canonical validation, docs validation, scoped lint/format and CLI check/types. Existing positive guards remain. Owning final generation refreshes providers/bundle; do not hand-edit outputs.

**Commit:** `fix(guidance): resolve final review evidence findings`

### Task p06-t06: Preserve knowledge refresh reports across shell calls

**Files:** `.agents/skills/oat-repo-knowledge-index/SKILL.md`; `.agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs`.

**Dependencies:** p06-t05 complete.

**Change:** Address p04gate Low4. Make the actual prepare snippet emit the exact JSON report so its affectedPaths remain available to the agent across separate shell calls; clean up only its owned temporary file on successful and failed execution. Commit guidance consumes the retained reported paths rather than depending on an ambient shell variable. Preserve ownership detection/collision refusals/manual files and existing generated outputs. Prefer eliminating the temporary file if direct printed helper output provides the same contract. Keep existing PR-scoped metadata bump unchanged.

**Verification:** Adapt the existing keeper to execute the actual prepare and commit guidance in separate shell processes, without appending its own hidden report cat. Existing eight-output, removed-extra-generated, collision, manual-file and unrelated staged/worktree guards remain. Direct existing skill test file, scoped lint/format/canonical validation; prove actual prepare output is independently parseable and commit includes retained removed paths.

**Commit:** `fix(knowledge): retain refresh ownership across shell calls`

### Task p06-t07: Clarify legacy recap evidence and durable links

**Files:** `apps/oat-docs/docs/reference/project-artifacts.md`; `.oat/repo/reference/project-summaries/20260722-wave-skills-promotion.md`; `.oat/repo/reference/project-summaries/20260914-agent-authored-recap.md`; `.oat/repo/reference/project-summaries/20260927-triage-correctness-wave.md`; `.oat/repo/reference/project-summaries/20261003-backlog-wave-4.md`.

**Dependencies:** p06-t06 complete.

**Change:** Address p05gate Low2/Low3. Document existing direct-CLI v1 compatibility: exact inventory/hashes plus canonical fact-base/theme and build-record run/outcome agreement are verified under the v1 contract; v2 additionally requires ledger/QA coverage and completion selects v2. No eligibility-policy or code change. Replace exactly four recap href targets pinned to the temporary wave branch with durable relative ../project-recaps/<stem>.html destinations, preserving all link text, narrative and limitations. Leave historical archives and all HTML bytes untouched.

**Verification:** Documentation conservation diff and real code/probe cross-check for the v1/v2 distinction; four exact target replacements, all tracked destinations exist, seven-summary/recap link oracle and docs validation. One final independent review covers the docs edits. No new test suite or baseline.

**Commit:** `docs(recap): clarify legacy evidence and durable links`

### Task p06-t08: Refresh final generated projections and bundled parity

**Files:** Only exact generated provider paths and manifest/catalog/index outputs reported by owning branch sync/docs commands; no manual projection edits, no canonical metadata/public version changes. Build assets remain ignored. Preserve setup manifest fields unless the owning command mechanically updates them.

**Dependencies:** p06-t07 complete.

**Change:** Regenerate project provider views with the current branch sync command after the approved guidance corrections. Verify all changed canonical owners and six autonomy-doc vendors match bundled bytes, including reviewer materialized variants. Check docs catalog/index/nav and regenerate only if their owning commands report drift. Inspect the exact resulting path list before the normal-hook commit; if zero tracked paths change, report settled-noop for root rather than fabricate a commit.

**Verification:** Owning sync dry-run reports no remaining drift, provider/canonical and bundle/vendor parity, skill-bump/public-version/release validation, docs catalog/validation, scoped lint/format and actual generated path conservation. Root then restarts the full ordered final gates. One PR-scoped bump per owner remains.

**Commit:** `chore(sync): refresh final wave guidance projections`

### Task p06-t09: Reconcile retired-reference smoke guard with captured legacy recap compatibility

**Files:** `tools/smoke/explainer-kit/no-retired-references.test.mjs` only.

**Dependencies:** p06-t08 complete. New bounded final-gate correction under operator-delegated routine continuation.

**Change:** Final r2 runs all8303CLI tests successfully but the smoke scan flags built-durable in the approved legacy archive reader and two captured v1 contract files. Preserve those original bytes and compatibility behavior. Extend the existing named path/pattern allowlist only for that exact legacy label in those three exact paths; do not exclude a directory or suppress other retired symbols/outcomes. Retain every existing retirement control. Extend the existing allowlist keeper with admitted exact compatibility references and categorical rejection of another retired label/symbol in those paths plus the same legacy label outside them. No production, captured fixture, public version or generated-output changes.

**Verification:** Deliberate-testing: scanner boundary still rejects newly shipped retired references; existing real-repository keeper provides observed pre-fix rejection, admitted legacy controls and out-of-scope bad references prove bounded exception. Direct existing Node smoke file plus relevant real archive suite, scoped lint/format; capture explicit exits and exact bytes/scope before/after normal hooks. Existing archive coverage owns current-v2 outcome refusal and authentic legacy acceptance; inspect it without inventing another compatibility framework. Root reruns full final sequence afterwards. No new test campaign.

**Commit:** `test(recap): scope legacy reference scan exceptions`

## Root Lifecycle Tail

These steps use `oat-project-implement`’s existing closeout flow; no additional coordinator, phase, task dispatch or program is introduced. Keep ticket closeout after verified acceptance and required reviews.

### Root final verification and review boundary

**Files:** Root-owned `.oat/projects/shared/backlog-wave-5/implementation.md`, `plan.md`, `state.md`, `project-log.md` when present; gate logs only in ignored `analysis/`. Fixes found by gates or review receive new tasks with their actual bounded files; do not silently append product changes to this verification task.

**Prerequisites:** p06-t01 and all earlier implementation tasks complete. Root owns the final checks, final independent reviews, subsequent backlog closeout, completion snapshot and PR lifecycle. This is workflow-owned work, not an implementer-dispatched task.

**Change:** Confirm final ten-ticket acceptance mapping and producer/consumer composition, including new validator on all actual changed vendors, shared primitive on actual callers, complete archive paths, structured status shape, original recap evidence and flat report/resume contracts. Run all eight repository gates in CI order with explicit exit codes; record executed versus cached evidence. Each command writes its own ignored log, captures `$?` immediately and fails on nonzero; never infer success from tail/pager/filter. Extra lint/format are required because skills changed. Build first before bare smoke suites; evidence-grade reruns use isolated HOME and forced Turbo with safe task-specific environment values, avoiding maintainer templates.

**Verification (required order):**

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `git fetch origin main`, then `pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`

Also run `pnpm lint`, `pnpm format`, `pnpm docs:validate`, `pnpm docs:skills:check`. For fresh suite proof after build, allocate `WAVE5_TEST_HOME=$(mktemp -d)` and use `env HOME="$WAVE5_TEST_HOME" pnpm exec turbo run test --force`; also run `env HOME="$WAVE5_TEST_HOME" pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, and `pnpm oat:validate-skills` separately for their applicable changed contracts. The environment override uses HOME only for the child command; never repurpose the shell's HOME variable. Record all independent boundary controls and limitations, then remove only owned temporary files after preserving summaries. If main advanced in planned paths, reconcile and rerun affected evidence before claiming the reviewed head is ready.

**Format:** Scoped formatter on root-owned changed lifecycle text before its bookkeeping commit; formatter-induced changes require affected checks again.

**Root evidence commit:** `chore(oat): record wave 5 integration verification`

### Root backlog closeout: Archive exactly the ten completed items

**Files:** The exact ten source/destination item paths in the Scope table, `.oat/repo/pjm/backlog/completed.md`, `backlog/index.md`, rewritten references actually reported by archive, existing matching `.oat/repo/pjm/handoffs/<ID>.md` deletions, and `current-state.md` only if shipping changes its operating picture. Root owns canonical plan/state/tracking rewrites.

**Prerequisites:** All implementation phases, final verification and required code/gate reviews passed; all 40 original acceptance rows plus U1 have verified evidence. Root executes closeout in the owning lifecycle tail after review fixes, without marking unverified items complete. Any later finding that invalidates acceptance stops publication and requires the same item’s completion record to be reconciled; it cannot remain falsely complete.

**Change:** Run `oat pjm doctor --json`, inspect full adoption, then use the branch archive command for each exact ID with a nonblank outcome summary. Archive terminal states/ledger/index/refs as one complete caller-owned operation, format reported paths and stage old/new names with the shared helper; delete only existing corresponding kickoff handoffs. Preserve the approved recap ticket amendment in the archived record. Do not close deferred issues/items. Reconcile rewrite overlap serially, then regenerate the backlog index with its owner and refresh current state only where necessary.

**Verification:** Branch CLI `backlog archive <each exact ID> --summary <verified outcome> --json`, then `oat pjm doctor --json`; inspect all ten in `archived/`, none left in `items/`, newest-first ledger outcomes, no old inbound item paths, zero matching handoff files and unrelated staged work unchanged. Compare affected-path lists with commit path sets. This also live-tests the newly fixed archive consumer without a remote service.

**Format:** Scoped formatter on exact reported surviving text paths and root-owned rewritten lifecycle artifacts.

**Root closeout commit:** `chore(backlog): close verified wave 5 items`

### Root completion export and publication check

After required reviews and verified ticket closeout, execute this wave’s completion with the branch’s canonical `.agents/skills/oat-project-complete/SKILL.md` and its branch-owned scripts, not an older installed consumer. Run `pnpm build` after the final CLI changes and route completion’s `oat project archive` call through `node packages/cli/dist/index.js`; preserve the completion skill’s exact arguments and receipt/resume contract. This pins both the exporter and the report consumers to the reviewed implementation.

After this wave’s own recap export and before PR publication, repeat the tracked-recap contents assertion from p05-t03: all historical exports plus this wave’s export are single `.html` files; no recap support directories, manifests, sidecars, QA/source files or stray fact-base file remain tracked. Verify the new page’s original/exported hashes through the new report and retained immutable run, and its links/assets. Run relevant checks for the completion delta and require the implementation exit gate’s final freshness/receive contract before publication. Do not format hashed HTML or rewrite original evidence. Root records these post-completion results alongside the final acceptance evidence.

## Scope and Acceptance Matrix

Each alias below names one authoritative item. AC numbers follow the current ticket bullet order; evidence is required for every row, not inferred from suite green. Archive rewrites will update these source links through the owning command at closeout.

| Alias | Authoritative ticket                                                                                                                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R     | [BL-260927-export-only-the-recap-page — Export only the recap page to project-recaps and fix its broken source links](../../../repo/pjm/backlog/items/BL-260927-export-only-the-recap-page.md)                         |
| C     | [BL-260927-share-one-hook-safe-exact-path — Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits](../../../repo/pjm/backlog/items/BL-260927-share-one-hook-safe-exact-path.md)       |
| K     | [BL-261002-keep-hand-written-knowledge — Keep hand-written knowledge files and unrelated staged changes safe during knowledge-index refresh](../../../repo/pjm/backlog/items/BL-261002-keep-hand-written-knowledge.md) |
| P     | [BL-261002-preserve-pjm-remote-settings — Preserve pjm.remote settings when oat pjm init or migrate --apply reruns](../../../repo/pjm/backlog/items/BL-261002-preserve-pjm-remote-settings.md)                         |
| V     | [BL-261002-teach-check-skill-bumps — Teach check:skill-bumps to follow vendored .agents/docs symlinks](../../../repo/pjm/backlog/items/BL-261002-teach-check-skill-bumps.md)                                           |
| H     | [BL-261002-require-exactly-one-h1-per — Require exactly one H1 per docs page in docs:validate](../../../repo/pjm/backlog/items/BL-261002-require-exactly-one-h1-per.md)                                                |
| A     | [BL-261003-show-autonomous-hard-stop — Show autonomous hard-stop conditions and effective recovery limits at kickoff](../../../repo/pjm/backlog/items/BL-261003-show-autonomous-hard-stop.md)                          |
| Q     | [BL-261003-require-proportional — Require proportional adversarial probes at changed review boundaries](../../../repo/pjm/backlog/items/BL-261003-require-proportional.md)                                             |
| B     | [BL-261003-preserve-documented-structured — Preserve documented structured blockers in project status output](../../../repo/pjm/backlog/items/BL-261003-preserve-documented-structured.md)                             |
| S     | [BL-261003-leave-backlog-archive-staging — Leave backlog archive staging to callers and report complete result paths](../../../repo/pjm/backlog/items/BL-261003-leave-backlog-archive-staging.md)                      |

| AC  | Required outcome                                                                | Task and verification boundary                                                                                                          |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Exactly one dated HTML, no tracked evidence/sidecar, report/summary identity    | p05-t01/t02/t03: actual archive export inventory and report fields                                                                      |
| R2  | All source hashes verified, full original run retained locally/synced           | p05-t01/t03: QA/fact-base tamper rejects; per-file preserved bytes; offline sync archive contract                                       |
| R3  | Matching retry idempotent; mismatch rejects; rollback owns writes               | p05-t01/t03: existing export, retry, failure and concurrent replacement controls                                                        |
| R4  | No broken exported relative href/src; valid tracked/external targets allowed    | p05-t01/t03: destination-relative target and fragment checks                                                                            |
| R5  | Report, printing, completion/resume, summary/PR links compatible; skill bump    | p05-t02, p06-t01: real producer JSON through consumers; owner version gate                                                              |
| R6  | Docs explain page versus archived evidence                                      | p05-t02: project-artifacts/CLI conservation review and docs checks                                                                      |
| R7  | Every current package migrated; stray handled; refs fixed; size recorded        | p05-t03: fresh tracked inventory, preserved archives, before/after bytes, maintained refs                                               |
| R8  | Durable decision states tracked page/archive-only QA source split               | p05-t02: amended DR and owner-generated decision index                                                                                  |
| R9  | Lockstep/full DoD; full-package negative export control/new page accepted       | p05-t01, p06-t01, root final verification and post-completion export check: contents rejection, valid control, versions and eight gates |
| C1  | One exact-path helper for CLI and skill commits, hooks enabled                  | p03-t01/t02/t03: caller adoption table and real CLI/skill probe                                                                         |
| C2  | Unrelated staged/unstaged intact; hook-owned paths clean                        | p03-t01/t02: real index-managing hook, literal blobs/bytes/HEAD/status                                                                  |
| C3  | Inspected bounded locks, no deletion, structured resumable exhaustion           | p03-t01/t02: contention/exhaustion/receipt controls                                                                                     |
| C4  | Matching prior success deduplicates                                             | p03-t01/t02: committed identity and retry/no duplicate operation                                                                        |
| C5  | Scaffold/gate hook and concurrent writer tests                                  | p03-t01/t02: real process tests using shared primitive                                                                                  |
| K1  | Only generated files removed/overwritten; manual note survives                  | p04-t03: actual refresh fixture with marker/manual collision                                                                            |
| K2  | Commit only knowledge paths; unrelated staging survives                         | p04-t03: shared helper with seeded staged blob                                                                                          |
| K3  | Probe fails if broad deletion or commit returns                                 | p04-t03: intentional broad-operation negative control                                                                                   |
| K4  | Skill bump; obsolete docs warning removed                                       | p04-t03, p06-t01: docs conservation and bump gate                                                                                       |
| P1  | Init/migrate preserve all unowned pjm.\*                                        | p02-t01: both real scratch command paths including unknown key                                                                          |
| P2  | Literal seeded remote unchanged; merge-neutralized regression fails             | p02-t01: serialized remote bytes and guard removal control                                                                              |
| P3  | Any remote rewrite announced before write                                       | p02-t01: current operation preserves remote; contract explicitly retains pre-write disclosure                                           |
| P4  | All obsolete docs warnings and dependent refs removed                           | p02-t01, p06-t01: five named pages, matching note inventory and docs checks                                                             |
| V1  | Every changed shared-doc symlink vendor requires bump                           | p01-t01: real changed target/vendor gate fixture                                                                                        |
| V2  | Unbumped rejects; bumped passes; pre-fix miss proved                            | p01-t01: failed/accepted pair at actual validator                                                                                       |
| V3  | Autonomy-only pin reduced only after general keeper exists                      | p01-t01: changed arbitrary-doc keeper and direct gate-inventory link                                                                    |
| H1  | Zero/multiple H1 fails naming file                                              | p01-t02: actual docs validator fixtures                                                                                                 |
| H2  | Zero/one/two self-contained fixture; neutralization fails                       | p01-t02: headings test and restored guard evidence                                                                                      |
| H3  | All current pages pass                                                          | p01-t02, root final verification: real corpus docs:validate                                                                             |
| A1  | Effective limits/all owning stops shown; capacity distinct                      | p01-t03: kickoff contract and default/override dry controls                                                                             |
| A2  | Failed-attempt terminality preserved                                            | p01-t03: existing terminal controls and no contradictory guidance                                                                       |
| A3  | Continue-after-failure remains deferred choice                                  | p01-t03: unchanged policy, explicit out-of-scope disclosure                                                                             |
| Q1  | Focused probes for changed trust/input-limit failure modes                      | p01-t04: reviewer boundary inventory and changed-contract case                                                                          |
| Q2  | Results or concrete execution limitations                                       | p01-t04: report/structured-mode evidence requirements                                                                                   |
| Q3  | Consequential missing evidence blocks; scope/containment/independence preserved | p01-t04: missing-evidence blocking control and conservation review                                                                      |
| Q4  | No harness/campaign/model-efficacy claim                                        | p01-t04: bounded final guidance diff                                                                                                    |
| Q5  | Independently verified implementer failing/accepted controls can count          | p01-t04: executable limitation plus inspected evidence case                                                                             |
| Q6  | Unsupported assertion insufficient; existing blocking model                     | p01-t04: unsupported-assertion blocking control, unchanged severity/output schema                                                       |
| B1  | task_id/reason/since preserved; string/human consumers deliberate               | p02-t02: documented real YAML → parser/project → CLI JSON/field/shell/human boundary                                                    |
| S1  | Archive no staging, complete source/destination/ledger/index/refs report        | p04-t01: real index equality and exact affected-path report                                                                             |
| S2  | Caller commits entire operation via helper; unrelated staged work intact        | p04-t02, root backlog closeout: real archive/helper composition and actual closeout paths                                               |

## User-added Acceptance

| ID  | Criterion                                                                                                              | Task and proof                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| U1  | Existing-docs guided init offers Plain Markdown and persists markdown tooling/root without discarding unrelated config | p04-t04: actual offered choice and real persisted-config keeper, pre-fix failure |

## Reviews

Preserve all existing rows, including spec/design placeholders. They do not imply those artifacts must be created for Quick mode. Append bound review events; never overwrite another artifact's event. Root records actual reviewed head and invocation. Additional fixes use new task IDs; reviews do not count as tasks.

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target          |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | -------------------- |
| p01    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p02    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| final  | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                    |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                    |
| plan   | artifact | passed          | 2026-10-03 | implementation.md#plan-artifact-self-review                 | -                                        | -          | -                    |
| p03    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p04    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p05    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p06    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| plan   | artifact | received        | 2026-10-03 | reviews/artifact-plan-review-2026-10-03T211958Z.md          | -                                        | -          | -                    |
| plan   | artifact | passed          | 2026-10-03 | implementation.md#revised-plan-artifact-self-review         | -                                        | -          | -                    |
| plan   | artifact | fixes_completed | 2026-10-03 | reviews/archived/artifact-plan-review-2026-10-03T220910Z.md | -                                        | -          | -                    |
| plan   | artifact | passed          | 2026-10-03 | reviews/archived/artifact-plan-review-2026-10-03T221441Z.md | -                                        | -          | -                    |
| p01    | code     | fixes_completed | 2026-10-03 | reviews/archived/p01-review-2026-10-03T225737Z.md           | e586535587644cd6faf2a5c221650710fa6bd726 | auto       | -                    |
| p01    | code     | fixes_completed | 2026-10-03 | reviews/archived/p01-review-2026-10-03T231742Z.md           | d116bf47814081a4d8784f637ada4a5854e154b0 | auto       | -                    |
| p01    | code     | passed          | 2026-10-03 | reviews/archived/p01-review-2026-10-03T232906Z.md           | 2a173c4ab68e02fdf02ed2777dfd36958f86ca80 | gate       | claude-opus-5-5-high |
| p02    | code     | passed          | 2026-10-04 | reviews/archived/p02-review-2026-10-04T004034Z.md           | b1bfa9e22aa1da9c029c0b438f8685afc1e41061 | auto       | -                    |
| p02    | code     | received        | 2026-10-04 | reviews/p02-review-2026-10-04T004538Z.md                    | 787c6acb9d8223191979c02cb12e75addf00f45c | gate       | claude-opus-5-5-high |
| p02    | code     | passed          | 2026-10-04 | reviews/archived/p02-review-2026-10-04T004538Z.md           | 787c6acb9d8223191979c02cb12e75addf00f45c | gate       | claude-opus-5-5-high |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T022902Z.md           | 48cb84b46f04cf1a0ba82e322fd3c4131c802a47 | auto       | -                    |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T032627Z.md           | 0ab95601abdd58e124c37b4d9770e07aaade5b09 | auto       | -                    |
| p03    | code     | passed          | 2026-10-04 | reviews/archived/p03-review-2026-10-04T050037Z.md           | de854f7bc9e11e3a3b7a8f5ffaa02e75fbd8bec9 | auto       | -                    |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T051023Z.md           | 6fa4f0d5947faf15fc2bda64410f534c8b85a3fe | gate       | claude-opus-5-5-high |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T062815Z.md           | aba8d06dd34a1ae60718a8f6738aea72cd08d99f | auto       | -                    |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T063659Z.md           | 12a8da785036595cade0e1f1a739763911bb20ee | gate       | claude-opus-5-5-high |
| p03    | code     | passed          | 2026-10-04 | reviews/archived/p03-review-2026-10-04T124703Z.md           | 317a07e9566fab4bf8d92f60754bb8af708c6ba4 | auto       | -                    |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T125636Z.md           | 9e790ffdcd43afd41fac6bc2414b89a7929caf2c | gate       | claude-opus-5-5-high |
| p03    | code     | passed          | 2026-10-04 | reviews/archived/p03-review-2026-10-04T135302Z.md           | 2057385d4bfc4d2c43b8ae0a7d4e81dd52e19628 | auto       | -                    |
| p03    | code     | fixes_completed | 2026-10-04 | reviews/archived/p03-review-2026-10-04T140803Z.md           | e6e1f3592b892cad0a2c56d4898649bc4ef4a34d | gate       | claude-opus-5-5-high |
| p03    | code     | passed          | 2026-10-04 | reviews/archived/p03-review-2026-10-04T145112Z.md           | ca5633822b83ea54d08a66b3dce7fc721d550ed7 | auto       | -                    |
| p03    | code     | passed          | 2026-10-04 | reviews/archived/p03-review-2026-10-04T150535Z.md           | 5dbd2c71540a98c21f0c90684522588c56b605e6 | gate       | claude-opus-5-5-high |
| p04    | code     | passed          | 2026-10-04 | reviews/archived/p04-review-2026-10-04T154829Z.md           | 977689cd913df72029fb0388802307cb3d7696f2 | auto       | -                    |
| p04    | code     | passed          | 2026-10-04 | reviews/archived/p04-review-2026-10-04T155932Z.md           | 6a5f522c3d5da9bd747aefdffc52cb43f397c257 | gate       | claude-opus-5-5-high |
| p05    | code     | fixes_completed | 2026-10-04 | reviews/archived/p05-review-2026-10-04T171337Z.md           | a7dcb82521fe426cc0e1b1accdf182b6e8aa02e0 | auto       | -                    |
| p05    | code     | fixes_completed | 2026-10-04 | reviews/archived/p05-review-2026-10-04T202926Z.md           | 386fd8f2845ba0e10da257f730d2357669a37b5a | auto       | -                    |
| p05    | code     | passed          | 2026-10-04 | reviews/archived/p05-review-2026-10-04T213716Z.md           | 8893b61dde96a24fb05822b7ac3bc33c627e782f | auto       | -                    |
| p05    | code     | passed          | 2026-10-04 | reviews/archived/p05-review-2026-10-04T215406Z.md           | a016b5adb2c222adf5401c50151152fc6a141da2 | gate       | claude-opus-5-5-high |

Independent gate run `7abeb986-214b-460e-8ec3-ccbb4cae81a1` ended `artifact_validation_failed` / `receiveEligible: false`. Its original artifact declared 0 Critical, 0 High, 6 Medium and 4 Low findings as bold paragraphs; the validator counted list items and rejected the mismatch. No receive event or accepted independent pass is recorded. The artifact contains the requested invocation fields, but gate corroboration did not reach them because verdict parsing failed. Preserve this run and original artifact; that run never granted implementation readiness.

Planning recovery: the original findings were reformatted without content/provenance changes and the parser now tallies 6 Medium / 4 Low. Root independently verified the source-backed authoring corrections before a fresh configured gate run. The original failed envelope remains ineligible and is never promoted into a pass. Fresh run `4fc38012-9f90-4a0a-b665-853396e48d9f` returned a valid matched envelope, was received with its Low formatting correction resolved, and establishes the independent plan pass; complexity review found no further changes.

## Implementation Complete

**Planned task totals:**

- Phase 1: 7 tasks — four original tasks and three bounded artifact/MDX review corrections.
- Phase 2: 3 tasks — PJM settings, structured blockers and the malformed-entry preservation correction.
- Phase 3: 12 tasks — shared primitive and CLI/skill adoption, plus nine committed bounded review corrections, including recovered-unrecorded receipt recognition.
- Phase 4: 4 tasks — caller-owned archive staging, safe knowledge refresh and user-added Plain Markdown init choice/config persistence.
- Phase 5: 5 tasks — flat recap producer, consumers, full historical migration, valid unquoted link/asset repair and raw-body preservation with approved four derived SVG page refresh.
- Phase 6: 9 tasks — versions/generated outputs, three approved final-test corrections, three delegated final guidance/evidence corrections final owning-command regeneration and one final-smoke compatibility correction. Root final verification, review and exact backlog closeout remain mandatory lifecycle-tail work.

**Total: 40 tasks across 6 phases.** This is a planning total, not a completion claim.

Completion requires evidence for all 40 original acceptance rows plus U1, exactly ten archived tickets and corresponding handoff deletion, preserved original recap evidence, all required gate exit codes, versions/generated/docs consistency, root and independent phase/final review dispositions, and the implementation-owned lifecycle tail through one mergeable PR. Root publishes the PR with accurate scope/test/evidence limitations using the existing PR workflow after final review; it records PR URL and final head. No merge or release. A successful gate or absent findings without accepted independent review evidence does not satisfy completion.

## References

- [Discovery](discovery.md), [Project state](state.md).
- Ten authoritative backlog items and titles are linked in the Scope table; their current criteria outrank summaries here.
- Canonical `.agents/skills/oat-project-quick-start/SKILL.md`, `oat-project-plan-writing/SKILL.md`, `oat-project-implement/SKILL.md`, and current dispatch/review contracts.
- Repository `AGENTS.md`, `apps/oat-docs/AGENTS.md`, `.oat/repo/AGENTS.md`, `.oat/repo/pjm/AGENTS.md`, decision guidance/index and `DR-260911-explainers-are-agent-authored`.
- Deliberate testing: `/Users/tstang/.agents/skills/deliberate-testing/SKILL.md` (author mode; named public boundaries, independent oracles, proportional controls).
- Current source evidence and choices table above; approved scope/base/dirty-state evidence in discovery and root setup commits.
- Root-owned review artifacts and short implementation evidence references will be added as actual results exist. No spec/design/external-plan artifact is required or authorized by this Quick plan.

## Phase 3 review boundary — 2026-10-04

Eleven phase tasks are committed. Operator approved p03-t12 diagnostics-only correction and ONE native r7/configured r5 cycle; automatic rewritten-history recovery deferred. Six Lows remain final-owned; 21/30 committed. Prior counts and recovery1/10 pendingnull unchanged.

### Operator disposition — 2026-10-04

Approved diagnostics-only corrective revision p03-t12 and ONE fresh native Sol6.1/high r7 plus configured Opus5.5/high r5 gate. Automatic recovery after rewritten provenance is deferred as a separate contract decision; safety refusal remains mandatory. Six Lows stay final-owned. Prior six native/four configured rounds and recovery1/10 pendingnull remain durable, not reset. Original phase handle unavailable after runtime restart; lifecycle permits one fresh same-target bounded fix continuation linked to wave5-p03-implement-r1. After this correction/review cycle passes, continue the remaining approved sequential wave and one-PR lifecycle tail; any remaining unresolved blocking disposition returns to operator.

### Operator continuation authority —2026-10-04

Operator approved the three final-test correction tasks and directed root to take this project across the finish line, asking only when needed. Root may resolve ordinary scoped corrections, review dispositions and routine checkpoints from verified evidence without another permission prompt. Existing ten-ticket requirements, exact targets, immutable history, all verification/gates and no-merge/no-release boundary remain. This delegates judgment; it neither waives findings nor permits false gate/acceptance claims. Consequential new product/security/destructive decisions and unresolvable external blockers still require operator input.
