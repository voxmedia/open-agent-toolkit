---
oat_status: in_progress
oat_ready_for: null
oat_blockers:
  - 'Independent plan gate blocked: review artifact count-format validation failed.'
oat_last_updated: 2026-10-03
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: true
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: high
oat_generated: false
---

# Implementation Plan: backlog-wave-5

> Execute with `oat-project-implement`. This draft is not implementation-ready until root records both planning reviews and completes the owning lifecycle transitions.

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
- [ ] Normal Sol-high planning self-review and independent Opus-high planning review received and reconciled by root.
- [ ] Root completes discovery and marks the reviewed plan ready; implementation confirms its execution checkpoint policy. No HiLL key is added by this draft.

## Parallelism

`oat_plan_parallel_groups: []` intentionally selects six sequential phases. H1 validation can be owned separately from skill-bump validation, but p01's guidance changes touch the same skill validator and shared contracts. p02 changes two separate producers, but shared public types and docs integration require a composed review. p03 owns one Git-index boundary; p04 consumes it; p05 touches completion skills already changed by p03/p04; p06 owns all generated/version/backlog outputs. No adjacent full phase pair has a useful proven file-disjoint implementation contract. Do not manufacture worktrees or a wave program. If root later proposes parallelism, first prove exact disjoint files/dependencies and integration-base readiness, then amend this plan; never exceed two isolated implementation lanes or run competing Git-index/bookkeeping writers in one checkout.

## Execution and Review Contract

- Approved implementer: Codex GPT-6.1 Sol, high effort, for every phase. Independent reviewer: Claude Opus 5.5, high effort, for plan, all phases, and final. Normal planning self-review is a separate Sol-high event. These are explicit user constraints; no route/model/effort substitution after accepted dispatch. Root loads current dispatch contracts and verifies the invocation evidence. Do not copy compiled targets into YAML or misuse a named ceiling as an exact model pin.
- Preserve the existing `oat_phase_review_gate` exactly. Built-in root review, independent phase gate, final review, and HiLL are separate contracts; review events are not plan tasks. Record full reviewed SHA, invocation, artifact and gate target in append-only review rows. On p06 use the lifecycle's final-review boundary rather than inventing a duplicate final-only phase review; the configured all-phase independent gate remains applicable.
- Before implementation, each phase, and any parallel launch: `git fetch origin main`, then `git log --oneline "$(git merge-base HEAD origin/main)..origin/main" -- <that phase's owned paths>`. Record changed paths and reconcile integration drift before dispatch. Finish open merges before running branch CLI probes. Planning entry: workspace `/Users/tstang/Code/open-agent-toolkit`, branch `wave/2026-10-03-backlog-wave-5`, HEAD `91e5fb0c6`, integration base `6ec5313b91e2595893eb89bb6372c028c0284ab4`.
- Preserve the approved dirty recap item and `.oat/sync/manifest.json`. Root handles their authorized persistence; implementations must not discard or sweep them into task commits. Every writer owns an explicit file list. Preserve unrelated staged and unstaged content, and inspect final status after hooks.
- Continue through tasks/phases and the implementation-owned lifecycle tail unless a configured checkpoint, real blocker, or required external input applies. Autonomous allowance is capacity, not permission to ignore terminal recovery or review/authority boundaries.
- Feature probes use local disposable repositories, real hooks and branch-built CLI. No live provider, S3, credential or production calls are required. Root retains publication and destructive-operation authorization.

## Formatting and Evidence

The documented root formatter is oxfmt's write mode. For **every task**, build the shell array `TASK_OWNED_FILES` from that task's explicit Files list, including only created/modified text files and actual newly reported references; do not include removed files, symlink targets outside ownership, binary evidence, or unrelated dirty paths. The concrete file-scoped command is `pnpm exec oxfmt --write "${TASK_OWNED_FILES[@]}"`, followed by `git diff --check -- "${TASK_OWNED_FILES[@]}"`. This is task ownership resolution, not formatter rediscovery. For generated files use their owning generator first, then format the actual produced text paths. After a commit, reread any file before exact-text edits because hooks can re-pad tables and change quoting.

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

**Files:** Modify `.agents/skills/oat-project-autonomous/SKILL.md`, `.agents/docs/autonomy-contract.md`, `.agents/skills/oat-project-implement/references/phase-execution.md`, `.agents/agents/oat-phase-implementer.md`, `packages/cli/src/validation/skills.test.ts`; update the corresponding autonomous guide under `apps/oat-docs/docs/workflows/projects/execution/` after locating its current source.

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

## Phase 2: Preserve PJM settings and structured state

### Task p02-t01: Preserve unowned PJM settings through real command reruns

**Files:** Modify `packages/cli/src/commands/pjm/init.ts`, `init.test.ts`, `migrate.test.ts`; update `apps/oat-docs/docs/getting-started/index.md`, `getting-started/tool-packs.md`, `workflows/backlog-and-planning/backlog-lifecycle.md`, `workflows/ideas/lifecycle.md`, `workflows/backlog-and-planning/remote-project-management.md` only for obsolete destructive-rerun warnings and references to them.

**Dependencies:** p01 complete.

**Change:** Preserve every existing `pjm.*` key except owned `initialized` and `schemaVersion`. Retain remote description, authority default/provider settings and storage state, plus an unknown future key. No remote rewrite is needed; any future rewrite must announce before writing. Remove current warning/caveat prose and dependent warning anchors without losing adoption guidance.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts src/commands/pjm/migrate.test.ts`; `pnpm docs:validate`. Use real init and `migrate --apply` command paths on scratch adopted repos with a literal seeded remote object; compare its serialized bytes and all unowned values before/after. Do not mock `initializeRepoReference` or call live services. Regression fails when the merge is removed; both valid controls pass.

**Format:** Scoped formatter on named source/tests and the five docs pages.

**Commit:** `fix(pjm): preserve existing settings on adoption reruns`

### Task p02-t02: Preserve documented structured blockers end to end

**Files:** Modify `packages/control-plane/src/types.ts`, `state/parser.ts`, `state/parser.test.ts`, `project.test.ts`; modify `packages/cli/src/commands/project/status.ts`, `status.test.ts` only as compatibility requires; update `.agents/skills/oat-project-progress/SKILL.md` and `apps/oat-docs/docs/reference/project-artifacts.md` for deliberate display/type documentation.

**Dependencies:** p02-t01.

**Change:** Preserve documented `{task_id, reason, since}` objects in shared parsed/project JSON, with existing string blockers unchanged. Type the compatible union explicitly. Human/status consumers render reason and task/date deliberately, field/shell selectors serialize structured values, and the recommender/state refresh continue their existing semantics. Inspect all current consumers before widening the public type; do not change unrelated string-array fields. Document handling of malformed blocker entries without silent `[object Object]` coercion.

**Verification:** `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/project.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts`; `pnpm --filter @open-agent-toolkit/control-plane type-check`; `pnpm --filter @open-agent-toolkit/cli type-check`. At one real producer-to-CLI boundary write the exact documented YAML from completion-and-closeout, call branch-built `project status --json`, field and human output, and assert literal three fields; string control remains literal, empty/mixed list behaves deliberately. Existing CLI mocked-state tests cannot prove parser preservation; the boundary fixture must load real state.

**Format:** Scoped formatter on actual touched files listed above.

**Commit:** `fix(state): preserve structured project blockers`

## Phase 3: Shared hook-safe exact-path commits

### Task p03-t01: Implement the narrow shared primitive and skill entry

**Files:** Create `packages/cli/src/commands/shared/exact-path-commit.ts`, `exact-path-commit.test.ts`, `packages/cli/src/commands/internal/commit-paths.ts`, `commit-paths.test.ts`; modify `packages/cli/src/commands/internal/index.ts`. Reuse existing Git runner/config seams; do not create a broad Git framework.

**Dependencies:** p02 complete.

**Change:** Accept an explicit exact file-path list and message, with a caller-supplied operation/artifact identity for recovery. Expose `oat internal commit-paths` for skill lifecycle callers. Validate repository containment and literal paths; permit tracked removals/renames by carrying both old and new names, never wildcard/directory expansion. Hooks stay enabled. Snapshot and preserve unrelated staged blobs and unstaged bytes; successful hook-formatted owned paths match committed final bytes and are clean. Detect concurrent index changes rather than overwriting another writer's snapshot. Reuse bounded inspected lock classification/retry semantics; never delete index locks. Return structured committed/already-matching/nothing/blocked/failed outcomes with attempts and resumable diagnostics, using ignored receipt state where persistence is required. A matching prior success is positively verified, not guessed from message or exit code.

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

**Files:** Modify canonical commit instructions in these skills only: `oat-project-autonomous`, `oat-project-complete`, `oat-project-discover`, `oat-project-document`, `oat-project-new`, `oat-project-implement`, `oat-project-capture`, `oat-project-design`, `oat-project-lite`, `oat-project-quick-start`, `oat-project-import-plan`, `oat-project-revise`, `oat-project-promote-spec-driven`, `oat-project-plan`, `oat-project-review-receive-remote`, `oat-project-review-provide`, `oat-project-reconcile`, `oat-project-spec`, `oat-project-retro-file`, `oat-project-review-receive`, `oat-project-summary`, `oat-worktree-bootstrap-auto`, `oat-wave-execute`, `oat-brainstorm`. Include only their direct commit-bearing `SKILL.md`/reference files (currently implement phase-execution, completion-and-closeout, plan-and-resume; retro apply-procedure) and `.agents/docs/autonomy-contract.md` when its vendored inventory is affected. Modify `packages/cli/src/validation/skills.ts`/`skills.test.ts` only to preserve existing safety validation for the new helper form. Update `apps/oat-docs/docs/reference/cli-reference.md` for the narrow maintenance command.

**Dependencies:** p03-t02. All skill writes are serial with p01 and later p04/p05; versions finalized once per skill in p06.

**Change:** Inventory executable lifecycle commit snippets and replace broad staged-index commits and weaker pathspec-only variants with the shared entry plus exact owned paths. Preserve synced `oat project push` routing, scope failures, conditional created-file sets, error propagation, hook enablement, resumable diagnostics and bookkeeping ownership. Text explaining historical evidence is not an executable caller. Report every adopted or intentionally excluded site; do not sweep all skill text blindly. Archive and knowledge-specific adoption remain p04 responsibilities.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`; `pnpm oat:validate-skills`; `pnpm test:skills`. Exercise a representative shared scaffold/bookkeeping snippet in a disposable repo through the real internal command with unrelated staged data and the real index-managing hook; synced snippets must still route to project push and fail closed on scope errors. The executable text is the public skill contract; validator tests protect loss of path ownership, not internal wording trivia.

**Format:** Scoped formatter on the inventoried actual commit-bearing files and validation/docs edits; no provider-view hand edits.

**Commit:** `fix(skills): use shared exact-path lifecycle commits`

## Phase 4: Archive and knowledge-refresh consumers

### Task p04-t01: Make backlog archive mutations staging-neutral

**Files:** Modify `packages/cli/src/commands/backlog/archive.ts`, `archive.test.ts`, and the archive command wrapper in `packages/cli/src/commands/backlog/index.ts` if result printing requires it; update `apps/oat-docs/docs/reference/config-and-local-state.md` for the result contract.

**Dependencies:** p03 complete.

**Change:** Replace automatic `git mv` with filesystem mutation. Archive must not touch the index in successful, noop or recovery paths. Report complete normalized source/destination/item, completed-ledger, index and rewritten-reference paths, with unambiguous affected-path collection for callers including tracked deletion paths. Keep lifecycle/status/summary/link rewrite/idempotency behavior; report actual mutated outputs on retry as well. Do not absorb the helper's implementation into this S ticket.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`. Real tracked scratch item with unrelated staged+unstaged work: index bytes/path staging remain unchanged after archive; result names every operation path; current content is on disk; noop/retry completes reference/index repairs. Baseline demonstrates staged rename with stale item bytes/old-path staging failure, post-fix staging-neutral result rejects that failure state; valid no-Git and Git controls pass.

**Format:** Scoped formatter on actual owned files.

**Commit:** `fix(backlog): leave archive staging to callers`

### Task p04-t02: Commit complete archive operations in lifecycle callers

**Files:** Modify `.oat/repo/pjm/AGENTS.md`, the canonical source that generates the same PJM guidance if applicable, `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-retro-file/SKILL.md` and other actual `oat backlog archive` lifecycle call sites located by scoped inventory; update `apps/oat-docs/docs/workflows/backlog-and-planning/backlog-lifecycle.md`, `reference/config-and-local-state.md`, and `reference/cli-reference.md`. Extend existing CLI/skill integration tests that own archive closeout; create one scoped skill probe only if none reaches the consumer.

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

## Phase 5: Flat recap export and complete historical migration

### Task p05-t01: Export one page while verifying the full source package

**Files:** Modify `packages/cli/src/commands/project/archive/archive-utils.ts`, `archive-utils.test.ts`, `push-runner.ts`, `push-runner.test.ts`, and `index.test.ts` if public JSON coverage requires it. Reuse existing `fixtures/v2-package` captured package with its provenance; derive legacy cases from the actual tracked legacy manifests rather than invented external-format schemas.

**Dependencies:** p04 complete; all archive producer/shared commit adapters reconciled.

**Change:** Verify all required source hashes/inventory before exporting, including QA and fact base. Produce exactly `.oat/repo/reference/project-recaps/YYYYMMDD-project.html`, embed required local assets and repair/strip project-relative source links in the exported copy, allowing valid tracked summary/decision and external PR targets. Preserve original source/page bytes in the archived run. Report run id, page path, original and exported SHA-256 and verified evidence count as needed; no tracked sidecar. Existing matching transformed page is idempotent, differing existing page rejects without overwrite consent. Atomic attempt-owned temp writes and rollback must not remove a pre-existing matching export or another writer's replacement. Retain the full source package in local and synced archives; existing archive receipt/resume guarantees remain valid.

**Verification:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/index.test.ts`. Extend existing export/hash/collision family: tampered QA/fact base rejects despite page-only output; full-package tracked export violates contents control; matching retry passes without duplication; different page rejects; injected failure removes only attempt-owned writes; concurrent replacement survives; exported relative href/src resolve including fragments. Valid source+page passes. Run against captured v2 and real legacy package before requesting review; keep fixture provenance and archive/S3 seam tests offline.

**Format:** Scoped formatter on actual owned source/tests/fixture text files.

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

**Format:** Scoped formatter on flat HTML and actual rewritten text references; never format immutable archived originals.

**Commit:** `refactor(recaps): migrate tracked packages to flat pages`

## Phase 6: Versions, exact closeout and final integration

### Task p06-t01: Finalize versions, generated projections and docs

**Files:** Modify the five lockstep public manifests (`packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`), `pnpm-lock.yaml` if the owning command changes it, every changed canonical skill's `SKILL.md` metadata version and changed agent's top-level version. Own only generated provider projections/catalog/index outputs reported by current sync/docs commands and docs necessary for these ten tickets.

**Dependencies:** p01–p05 complete.

**Change:** Fetch origin/main and inspect current versions before choosing one common next public version strictly greater than main; do not pre-invent a version. Bump each changed skill/agent once per final PR diff, including all symlink vendors identified by the strengthened gate. Inventory final changed bundled paths, regenerate provider views via `oat sync --scope all`, bundled assets via build, docs catalog via `pnpm docs:skills:generate`, root docs index and nav via owning CLI only when changed. Preserve the initial dirty manifest's unrelated content under root ownership; do not overwrite projections by hand. Remove only obsolete warnings proven fixed by p02/p04, including warning links/anchors. Produce the exact ten-ticket docs coverage check.

**Verification:** `pnpm run check:skill-bumps`; `pnpm release:check-versions`; `pnpm release:validate`; `pnpm docs:skills:check`; `pnpm docs:validate`; `pnpm lint`; `pnpm format`. Inspect the final diff to ensure one bump per changed owner, five-package lockstep, every vendor covered, no generated drift, no unrelated scope. Gate runs here are early feedback; p06-t03 runs the full ordered final sequence.

**Format:** Scoped formatter after generation on actual owned manifests, skill/agent files, projections and docs outputs.

**Commit:** `chore(release): bump wave 5 bundled contracts`

### Task p06-t02: Archive exactly the ten completed backlog items

**Files:** The exact ten source/destination item paths in the Scope table, `.oat/repo/pjm/backlog/completed.md`, `backlog/index.md`, rewritten references actually reported by archive, existing matching `.oat/repo/pjm/handoffs/<ID>.md` deletions, and `current-state.md` only if shipping changes its operating picture. Root owns canonical plan/state/tracking rewrites.

**Dependencies:** p06-t01; every acceptance row below has verified evidence. Root executes closeout after applicable reviews, without marking unverified items complete.

**Change:** Run `oat pjm doctor --json`, inspect full adoption, then use the branch archive command for each exact ID with a nonblank outcome summary. Archive terminal states/ledger/index/refs as one complete caller-owned operation, format reported paths and stage old/new names with the shared helper; delete only existing corresponding kickoff handoffs. Preserve the approved recap ticket amendment in the archived record. Do not close deferred issues/items. Reconcile rewrite overlap serially, then regenerate the backlog index with its owner and refresh current state only where necessary.

**Verification:** Branch CLI `backlog archive <each exact ID> --summary <verified outcome> --json`, then `oat pjm doctor --json`; inspect all ten in `archived/`, none left in `items/`, newest-first ledger outcomes, no old inbound item paths, zero matching handoff files and unrelated staged work unchanged. Compare affected-path lists with commit path sets. This also live-tests the newly fixed archive consumer without a remote service.

**Format:** Scoped formatter on exact reported surviving text paths and root-owned rewritten lifecycle artifacts.

**Commit:** `chore(backlog): close verified wave 5 items`

### Task p06-t03: Run ordered final gates and record integration evidence

**Files:** Root-owned `.oat/projects/shared/backlog-wave-5/implementation.md`, `plan.md`, `state.md`, `project-log.md` when present; gate logs only in ignored `analysis/`. Fixes found by gates or review receive new tasks with their actual bounded files; do not silently append product changes to this verification task.

**Dependencies:** p06-t02. Root owns final code review, independent review, closeout snapshot and PR lifecycle after these checks.

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

**Commit:** `chore(oat): record wave 5 integration verification`

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

| AC  | Required outcome                                                                | Task and verification boundary                                                                    |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| R1  | Exactly one dated HTML, no tracked evidence/sidecar, report/summary identity    | p05-t01/t02/t03: actual archive export inventory and report fields                                |
| R2  | All source hashes verified, full original run retained locally/synced           | p05-t01/t03: QA/fact-base tamper rejects; per-file preserved bytes; offline sync archive contract |
| R3  | Matching retry idempotent; mismatch rejects; rollback owns writes               | p05-t01/t03: existing export, retry, failure and concurrent replacement controls                  |
| R4  | No broken exported relative href/src; valid tracked/external targets allowed    | p05-t01/t03: destination-relative target and fragment checks                                      |
| R5  | Report, printing, completion/resume, summary/PR links compatible; skill bump    | p05-t02, p06-t01: real producer JSON through consumers; owner version gate                        |
| R6  | Docs explain page versus archived evidence                                      | p05-t02: project-artifacts/CLI conservation review and docs checks                                |
| R7  | Every current package migrated; stray handled; refs fixed; size recorded        | p05-t03: fresh tracked inventory, preserved archives, before/after bytes, maintained refs         |
| R8  | Durable decision states tracked page/archive-only QA source split               | p05-t02: amended DR and owner-generated decision index                                            |
| R9  | Lockstep/full DoD; full-package negative export control/new page accepted       | p05-t01, p06-t01/t03: contents rejection, valid control, versions and eight gates                 |
| C1  | One exact-path helper for CLI and skill commits, hooks enabled                  | p03-t01/t02/t03: caller adoption table and real CLI/skill probe                                   |
| C2  | Unrelated staged/unstaged intact; hook-owned paths clean                        | p03-t01/t02: real index-managing hook, literal blobs/bytes/HEAD/status                            |
| C3  | Inspected bounded locks, no deletion, structured resumable exhaustion           | p03-t01/t02: contention/exhaustion/receipt controls                                               |
| C4  | Matching prior success deduplicates                                             | p03-t01/t02: committed identity and retry/no duplicate operation                                  |
| C5  | Scaffold/gate hook and concurrent writer tests                                  | p03-t01/t02: real process tests using shared primitive                                            |
| K1  | Only generated files removed/overwritten; manual note survives                  | p04-t03: actual refresh fixture with marker/manual collision                                      |
| K2  | Commit only knowledge paths; unrelated staging survives                         | p04-t03: shared helper with seeded staged blob                                                    |
| K3  | Probe fails if broad deletion or commit returns                                 | p04-t03: intentional broad-operation negative control                                             |
| K4  | Skill bump; obsolete docs warning removed                                       | p04-t03, p06-t01: docs conservation and bump gate                                                 |
| P1  | Init/migrate preserve all unowned pjm.\*                                        | p02-t01: both real scratch command paths including unknown key                                    |
| P2  | Literal seeded remote unchanged; merge-neutralized regression fails             | p02-t01: serialized remote bytes and guard removal control                                        |
| P3  | Any remote rewrite announced before write                                       | p02-t01: current operation preserves remote; contract explicitly retains pre-write disclosure     |
| P4  | All obsolete docs warnings and dependent refs removed                           | p02-t01, p06-t01: five named pages, matching note inventory and docs checks                       |
| V1  | Every changed shared-doc symlink vendor requires bump                           | p01-t01: real changed target/vendor gate fixture                                                  |
| V2  | Unbumped rejects; bumped passes; pre-fix miss proved                            | p01-t01: failed/accepted pair at actual validator                                                 |
| V3  | Autonomy-only pin reduced only after general keeper exists                      | p01-t01: changed arbitrary-doc keeper and direct gate-inventory link                              |
| H1  | Zero/multiple H1 fails naming file                                              | p01-t02: actual docs validator fixtures                                                           |
| H2  | Zero/one/two self-contained fixture; neutralization fails                       | p01-t02: headings test and restored guard evidence                                                |
| H3  | All current pages pass                                                          | p01-t02, p06-t03: real corpus docs:validate                                                       |
| A1  | Effective limits/all owning stops shown; capacity distinct                      | p01-t03: kickoff contract and default/override dry controls                                       |
| A2  | Failed-attempt terminality preserved                                            | p01-t03: existing terminal controls and no contradictory guidance                                 |
| A3  | Continue-after-failure remains deferred choice                                  | p01-t03: unchanged policy, explicit out-of-scope disclosure                                       |
| Q1  | Focused probes for changed trust/input-limit failure modes                      | p01-t04: reviewer boundary inventory and changed-contract case                                    |
| Q2  | Results or concrete execution limitations                                       | p01-t04: report/structured-mode evidence requirements                                             |
| Q3  | Consequential missing evidence blocks; scope/containment/independence preserved | p01-t04: missing-evidence blocking control and conservation review                                |
| Q4  | No harness/campaign/model-efficacy claim                                        | p01-t04: bounded final guidance diff                                                              |
| Q5  | Independently verified implementer failing/accepted controls can count          | p01-t04: executable limitation plus inspected evidence case                                       |
| Q6  | Unsupported assertion insufficient; existing blocking model                     | p01-t04: unsupported-assertion blocking control, unchanged severity/output schema                 |
| B1  | task_id/reason/since preserved; string/human consumers deliberate               | p02-t02: documented real YAML → parser/project → CLI JSON/field/shell/human boundary              |
| S1  | Archive no staging, complete source/destination/ledger/index/refs report        | p04-t01: real index equality and exact affected-path report                                       |
| S2  | Caller commits entire operation via helper; unrelated staged work intact        | p04-t02, p06-t02: real archive/helper composition and actual closeout paths                       |

## Reviews

Preserve all existing rows, including spec/design placeholders. They do not imply those artifacts must be created for Quick mode. Append bound review events; never overwrite another artifact's event. Root records actual reviewed head and invocation. Additional fixes use new task IDs; reviews do not count as tasks.

| Scope  | Type     | Status   | Date       | Artifact                                           | Reviewed Head                            | Invocation                       | Gate Target            |
| ------ | -------- | -------- | ---------- | -------------------------------------------------- | ---------------------------------------- | -------------------------------- | ---------------------- |
| p01    | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| p02    | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| final  | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| spec   | artifact | pending  | -          | -                                                  | -                                        | -                                | -                      |
| design | artifact | pending  | -          | -                                                  | -                                        | -                                | -                      |
| plan   | artifact | passed   | 2026-10-03 | implementation.md#plan-artifact-self-review        | 96c470bc2b67137b420d082dfbd263749b76260e | auto / inherited planning parent | codex:gpt-6.1-sol:high |
| p03    | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| p04    | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| p05    | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| p06    | code     | pending  | -          | -                                                  | -                                        | -                                | -                      |
| plan   | artifact | received | 2026-10-03 | reviews/artifact-plan-review-2026-10-03T211958Z.md | -                                        | -                                | -                      |

Independent gate run `7abeb986-214b-460e-8ec3-ccbb4cae81a1` ended `artifact_validation_failed` / `receiveEligible: false`. Its artifact declares 0 Critical, 0 High, 6 Medium and 4 Low findings, but writes them as bold paragraphs; the current validator counts list items and rejects the mismatch. No receive event or accepted independent pass is recorded. The artifact contains the requested invocation fields, but gate corroboration did not reach them because verdict parsing failed. Preserve this run and original artifact; implementation readiness remains false.

## Implementation Complete

**Planned task totals:**

- Phase 1: 4 tasks — validators and bounded autonomy/review guidance.
- Phase 2: 2 tasks — PJM settings and structured blockers.
- Phase 3: 3 tasks — shared primitive and CLI/skill lifecycle adoption.
- Phase 4: 3 tasks — caller-owned archive staging and safe knowledge refresh.
- Phase 5: 3 tasks — flat recap producer, consumers and full historical migration.
- Phase 6: 3 tasks — versions/generated outputs, exact backlog closeout and final gates.

**Total: 18 tasks across 6 phases.** This is a planning total, not a completion claim.

Completion requires evidence for all 40 acceptance rows, exactly ten archived tickets and corresponding handoff deletion, preserved original recap evidence, all required gate exit codes, versions/generated/docs consistency, root and independent phase/final review dispositions, and the implementation-owned lifecycle tail through one mergeable PR. Root publishes the PR with accurate scope/test/evidence limitations using the existing PR workflow after final review; it records PR URL and final head. No merge or release. A successful gate or absent findings without accepted independent review evidence does not satisfy completion.

## References

- [Discovery](discovery.md), [Project state](state.md).
- Ten authoritative backlog items and titles are linked in the Scope table; their current criteria outrank summaries here.
- Canonical `.agents/skills/oat-project-quick-start/SKILL.md`, `oat-project-plan-writing/SKILL.md`, `oat-project-implement/SKILL.md`, and current dispatch/review contracts.
- Repository `AGENTS.md`, `apps/oat-docs/AGENTS.md`, `.oat/repo/AGENTS.md`, `.oat/repo/pjm/AGENTS.md`, decision guidance/index and `DR-260911-explainers-are-agent-authored`.
- Deliberate testing: `/Users/tstang/.agents/skills/deliberate-testing/SKILL.md` (author mode; named public boundaries, independent oracles, proportional controls).
- Current source evidence and choices table above; approved scope/base/dirty-state evidence in discovery and root setup commits.
- Root-owned review artifacts and short implementation evidence references will be added as actual results exist. No spec/design/external-plan artifact is required or authorized by this Quick plan.
