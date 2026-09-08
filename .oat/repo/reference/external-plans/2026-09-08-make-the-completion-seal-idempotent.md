---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260907-make-the-completion-seal.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-make-the-completion-seal
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/252
created: '2026-09-08T21:15:43Z'
---

# Make the completion seal idempotent and unpark wave-5 p09

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> The CLI already owns the idempotency primitive, so this plan wires it up
> rather than inventing it. The only ordering constraint is soft:
> `2026-09-08-read-stdin-in-finalize-synced-archive.md` writes the same
> `oat-project-complete/SKILL.md`, so the two never run in one parallel group,
> it merges first, and this plan rebases onto it.

## Outcome

`oat project log check` reports whether a project log already carries a
completion seal, so a resumed completion can see the seal instead of grepping
for its heading in skill prose. `oat-project-complete` appends the seal with a
stable idempotency key, so replaying the seal invocation reports
`already-appended` and leaves exactly one seal entry; a pre-existing **unkeyed**
seal, written before this change, is recognized the same way. `oat project log
append` refuses any non-seal append to a sealed log, so the skill's standing
"No project-log append may follow the seal" invariant is enforced by code
rather than by prose. The shipped grep-for-seal workaround at
`oat-project-complete/SKILL.md:734-741` is replaced by routing on the probe's
new field. With seal idempotence real, the parked wave-5 p09 plan
(`2026-09-02-defer-activeproject-clearing-on-archive-completions.md`) is
refreshed onto it, its parked patch is re-applied, and its seven test cases
pass — including exactly one seal entry after a pre-archive interruption.
Completing this closes GitHub issue
[#252](https://github.com/voxmedia/open-agent-toolkit/issues/252).

## Source and live evidence

- Source backlog item:
  [BL-260907-make-the-completion-seal — Make the completion seal append idempotent so pre-archive interruptions can resume](../../pjm/backlog/items/BL-260907-make-the-completion-seal.md),
  including its `## Triage narrowing (2026-09-08)` section, which is the scope
  this plan implements.
- Source issue: [#252](https://github.com/voxmedia/open-agent-toolkit/issues/252)
  — "Clear activeProject only after completion durability receipts exist",
  confirmed `OPEN` at planning time.
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the tree whose
  content this plan actually read (branch `wave-7-plans`).
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the fetched
  `origin/main` tip; the inspected `HEAD` is identical to it.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty at the
  repository root. `.worktrees/wave-5/p09` is a separate, deliberately dirty
  checkout described below.
- Verified evidence:
  - `packages/cli/src/commands/project/log/check.ts:35` —
    `status: 'ok' | 'absent' | 'synthesis_pending'`. Confirmed live: on a log
    carrying two completion seals, `oat project log check --json` (built CLI
    `0.2.65`) returned
    `{"status":"synthesis_pending","logPath":…,"entryCounts":{"structural":2,…},"lastEntryDate":"2026-09-08","synthesisPending":true,"grammarViolations":[]}`
    — no seal field anywhere. The probe genuinely cannot see a seal.
  - `.agents/skills/oat-project-complete/SKILL.md:766-772` — the seal append is
    `oat project log append --project … --structural --producer oat-project-complete --ref seal --body "Completion sealed at $(date -u +%Y-%m-%dT%H:%M:%SZ); project-log roll-up status: ok."`.
    No `--idempotency-key`, and a fresh timestamp in the body.
  - Reproduced live on the built CLI in a `mktemp -d` scratch repository:
    running that exact invocation twice, changing only the timestamp, returned
    `status: "appended"` **both** times and left **two**
    `### 2026-09-08 · structural · oat-project-complete · seal` headings in
    `project-log.md`. This is the defect that parked wave-5 p09.
  - `packages/cli/src/commands/project/log/append.ts:1021` `idempotencyToken`,
    `:1029-1041` `findProjectLogEntryByIdempotencyKey`, `:1107`/`:1174`
    `idempotencyKey`, `:1352-1366` `validateIdempotencyKey` (the key must appear
    as a whole word in `--body`), `:1491-1508` the dedupe branch returning
    `status: 'already-appended'`. The primitive exists and is well-documented.
  - Reproduced live: the same seal invocation with
    `--idempotency-key "oat-seal:demo2"` and that token embedded in the body,
    replayed with a **different** timestamp, returned `status: "appended"` then
    `status: "already-appended"` and left exactly **one** seal heading — with
    **no** `--commit` flag and **no** CLI change. Keying the seal append is
    therefore a skill-side edit, not a CLI feature.
  - `append.ts:1823` and `:1838` describe `--idempotency-key` as something to
    "Pass … with `--commit` to finalize a gate partial-finalization receipt".
    That understates the shipped behavior just reproduced: dedupe works on its
    own. The wording is a documentation surface this plan corrects.
  - `.agents/skills/oat-project-complete/SKILL.md:734-741` — the shipped prose
    workaround: "The status probe above reports no seal state, so detect the
    seal directly before appending anything: read `logPath` from
    `PROJECT_LOG_CHECK` and treat the log as sealed when it already contains a
    structural seal heading of the form
    `### <date> · structural · oat-project-complete · seal`."
  - That workaround is pinned twice in
    `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`:
    at `:1593` (`expect(content).toContain('No project-log append may follow the seal')`,
    inside `pins project-log roll-up and seal before lifecycle completion and archive`)
    and across `:1754-1803`
    (`never appends retirement findings after an existing seal on resume`, which
    asserts the literal strings `The status probe above reports no seal state`,
    ``read `logPath` from `PROJECT_LOG_CHECK` ``,
    `### <date> · structural · oat-project-complete · seal`,
    `runs in report-only mode`, `append nothing to the sealed log`,
    `never re-enter the roll-up or the seal`, and
    `No project-log append may follow the seal`). Replacing the prose means
    rewriting that test, not deleting it.
  - `packages/cli/src/commands/project/log/grammar.ts:18,54-57` — a structural
    heading is
    `### <date> · structural · <producer> · <ref>`, and
    `parseProjectLogEntries` (`check.ts:161`) already yields `producer` and
    `ref` per entry. Seal detection needs no new parser.
  - Consumers of the check result: `oat-project-complete/SKILL.md:637` and
    `oat-project-summary/SKILL.md:153`, both
    `PROJECT_LOG_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)`.
    No TypeScript consumer outside `check.ts` itself
    (`grep -rn 'checkProjectLog\|ProjectLogCheckResult' packages/cli/src`
    returns only `check.ts` and its own test). Adding a field is additive for
    both.
  - `.agents/skills/oat-project-summary/SKILL.md:161-172` — the summary flow
    invokes `oat project log append` to graduate observations to `--scope
general`. Step 3.7 re-enters this skill on a resume whenever entry counts
    are nonzero (`SKILL.md:645-651`), so a sealed-log append refusal is
    reachable from that path and must be routed there.
  - **Narrower than the source claims:** `oat project log rollup` never writes
    `project-log.md`. `rollup.ts:255-290` reads the log, rewrites a section of
    `summary.md`, and appends only to the configured repository ledger; the
    ledger append already dedupes
    (`rollup.ts:224-231` → `ledgerOutcome: 'deduplicated'`). "Block roll-up
    appends after sealing" therefore reduces to "do not re-enter the roll-up on
    a sealed log", which is a skill-side routing decision, not a CLI guard.
  - **Confirms the source:** option (b) in the backlog item is not available.
    The Step 3.65 retry router is gated at `SKILL.md:582` to
    `[[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "false" ]]`, so it
    cannot cover shared **archive** completions without a scope change this plan
    does not take.
  - The parked wave-5 p09 patch is preserved **on disk** in the still-present
    worktree `.worktrees/wave-5/p09`, dirty at base
    `956773dc6832dea1a765bfa61716e824166878fc`:
    `git -C .worktrees/wave-5/p09 diff --stat` reports
    `SKILL.md | 107 ++++++---`, `lifecycle.md | 9 +`,
    `picking-up-projects.md | 18 +` (117 insertions, 17 deletions), plus two
    untracked files —
    `.agents/skills/oat-project-complete/scripts/validate-durable-archive-receipt.mjs`
    (165 lines) and
    `.agents/skills/oat-project-complete/tests/validate-durable-archive-receipt.test.mjs`
    (249 lines) — which together match the "531 insertions" recorded in
    `.oat/projects/shared/wave-5-execution/implementation.md:337`. That record
    also names a patch file `w5/p09-parked-work.patch` in the wave-5
    orchestrator scratchpad; that scratchpad is session-local and the file was
    **not** found on this machine, so the worktree is the only durable copy.
  - `.oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md:222-227`
    — the parked plan's resume design rests on "Step 3.7's status probe sees the
    existing seal and skips the append", which is false today and which this
    plan makes true. `:298-315` is its STOP list, whose fourth clause
    ("the resume design would require … a project-log append after the seal")
    is the clause that fired. Its
    `## Revalidation Before Execution` already carries a
    `**Refresh applied 2026-09-07 …**` entry; this plan adds a second, dated
    entry beneath it rather than rewriting the first.
  - **Discrepancy inside the parked plan:** its `## Test plan` enumerates
    **seven** cases (three guard/ordering plus four interruption cases,
    `:257-283`), while its step 4 (`:232-240`) says "the six cases in the test
    plan" and its `## Done criteria` (`:294`) says "Six new contract tests". The
    backlog item's third acceptance criterion says seven. Seven is correct; the
    refresh fixes the two stale counts.
  - `.agents/skills/oat-project-complete/SKILL.md:8` declares
    `metadata.version: 1.7.9`; sweeping that literal returns exactly two pins,
    `review-skill-contracts.test.ts:1401` and `skills.test.ts:4550`.
    `.agents/skills/oat-project-summary/SKILL.md:8` declares `1.5.4`; sweeping
    that literal returns `skills.test.ts:3030` and `skills.test.ts:7738`.
  - `packages/cli/src/validation/named-skill-load-contract.test.ts` exists and
    sweeps sentences that pair an execution verb with a named `oat-project-*`
    skill; wave-5 recorded it as a write surface and a gate for every
    skill-editing lane
    (`.oat/projects/shared/wave-5-execution/implementation.md:238`).

## Dependencies

| Type              | Dependency                                                                                                                                                            | Required state                                                                                                                                                                                                                             | Current state                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Satisfied         | [Read stdin with an fd-capable API in finalize-synced-archive.mjs](./2026-09-08-read-stdin-in-finalize-synced-archive.md)                                             | Independent: it fixes the synced Step 12 finalizer script; this plan touches the seal and the log CLI. Neither needs the other's behavior.                                                                                                 | Satisfied — the two plans share no behavior and this plan is not blocked by it.           |
| Soft ordering     | The same plan, as a shared write on `.agents/skills/oat-project-complete/SKILL.md`                                                                                    | Never in one parallel group. It merges first; this plan rebases onto it. One `metadata.version` bump per skill per PR: if it already bumped `oat-project-complete` in this wave PR, **this plan does not re-bump** — it adopts that value. | Pending; the wave composition serializes the two lanes.                                   |
| Soft ordering     | Shared write: the skill version pins in `packages/cli/src/validation/skills.test.ts` and `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` | Never in one parallel group with another lane that writes either file; the wave orders those groups.                                                                                                                                       | Pending; the wave composition serializes them.                                            |
| Soft prerequisite | The parked wave-5 p09 patch preserved in the `.worktrees/wave-5/p09` worktree                                                                                         | Still present and readable at execution time, or re-derivable from the parked plan's steps 1, 2, 3, and 5.                                                                                                                                 | Landed on disk at base `956773dc6832dea1a765bfa61716e824166878fc`; snapshot it in step 1. |
| Soft follow-up    | GitHub issue [#252](https://github.com/voxmedia/open-agent-toolkit/issues/252)                                                                                        | Closed once this plan's done criteria hold; the issue is the durable tracker for the parked p09 outcome.                                                                                                                                   | Open.                                                                                     |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                       | Affected | Files in common                                                                                                                                                                                                                 | Required update                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReviewPlan Stage A` (draft PR #190) merges                 | Major    | `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts`, `apps/oat-docs/docs/workflows/projects/lifecycle.md` — all three appear in PR #190's changed files. | Rebase, then re-anchor by string rather than by line: find the two seal `it(...)` blocks by their test names, the version pins by the OLD VERSION LITERAL, and the lifecycle seal paragraph by its `no project-log append ever follows the seal` sentence. |
| `remote project management` (PR #273) merges                | None     | None: none of its 144 changed files touch `oat-project-complete`, `oat-project-summary`, `packages/cli/src/commands/project/log/**`, or either pin file.                                                                        | No action.                                                                                                                                                                                                                                                 |
| `brainstorm companion` (PR #125) merges                     | None     | None of its 26 changed files touch this plan's surfaces.                                                                                                                                                                        | No action.                                                                                                                                                                                                                                                 |
| Sibling lane `read-stdin-in-finalize-synced-archive` merges | Minor    | `.agents/skills/oat-project-complete/SKILL.md`, both version pin files.                                                                                                                                                         | Rebase; adopt its `oat-project-complete` version and add no second bump for that skill in the same PR.                                                                                                                                                     |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- packages/cli/src/commands/project/log/check.ts packages/cli/src/commands/project/log/check.test.ts packages/cli/src/commands/project/log/append.ts packages/cli/src/commands/project/log/append.test.ts packages/cli/src/commands/project/log/rollup.ts packages/cli/src/commands/project/log/grammar.ts packages/cli/src/commands/project/log/lifecycle.integration.test.ts .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-complete/scripts .agents/skills/oat-project-complete/tests .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts packages/cli/src/validation/named-skill-load-contract.test.ts apps/oat-docs/docs/cli-utilities/project-log.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md .oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md
```

If the check result shape, the append idempotency helpers, the seal prose, or
either pin moved, re-anchor before editing. If `ProjectLogCheckResult` already
carries a seal field, or the seal append already passes a key, the work landed
elsewhere and this plan needs re-scoping, not re-application — that is a STOP
condition. A pin that no longer reads `1.7.9` means the sibling lane already
bumped `oat-project-complete` in this PR: adopt that value.

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before
  `pnpm test:smoke` / `pnpm test:release` and before any control that runs the
  branch-built CLI.
- Typecheck: `pnpm type-check`.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/project/log src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts src/validation/named-skill-load-contract.test.ts`.
- Skill tests: `pnpm test:skills` →
  `node --test .agents/skills/*/tests/*.test.mjs`.
- Check: `pnpm check` (markdownlint over `apps/oat-docs/docs` plus
  `oat:validate-skills`). Lint/format check (non-mutating): `pnpm lint` and
  `pnpm format`; both are required because this plan changes `.agents/skills`,
  and CI runs neither.
- Skill version convention: one `metadata.version` bump per changed skill per
  PR — the top-level `version:` field is gone since CLI 0.2.65. Locate pins by
  the OLD VERSION LITERAL across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`. The bump is PR-scoped, not edit-scoped: if the
  sibling lane already bumped `oat-project-complete` in this wave PR, this plan
  adopts that value and adds no second bump. `oat-project-summary` is bumped by
  this plan because no other wave-7 lane edits it — confirm that with the drift
  check first.
- `DR-260906-standing-claims-in-skills-name`: every standing claim added to a
  skill names the code that owns it and ships its executable backstop in the
  same change, never keyed to a physical line number. The new "the probe reports
  the seal" claim in `SKILL.md` is owned by `check.ts` and backed by the new
  `check.test.ts` and `review-skill-contracts.test.ts` cases in the same commit.
- `.oat/config.json` keys parity: not applicable — this plan adds no
  configuration key.
- Implementation pattern: `check.test.ts:1-58` (`createHarness`, `runCommand`)
  for command-level assertions on the JSON result;
  `append.ts:1029-1041` and `:1491-1508` for the existing dedupe shape, which
  the seal-specific dedupe mirrors rather than replaces.
- Git/PR convention: do not push or open a PR from this plan; the wave owns
  merge choreography.
- Shipped CLI and bundled-skill change: in lane mode the wave fan-in owns the
  lockstep bump; only a standalone execution bumps the five public packages
  itself.

## Scope

### In scope

- `packages/cli/src/commands/project/log/check.ts` — additive `sealed` and
  `seal` fields on `ProjectLogCheckResult`, derived from the already-parsed
  structural entries; the human-readable line gains a sealed marker. The
  `status` union is **not** changed.
- `packages/cli/src/commands/project/log/append.ts` — seal-specific dedupe
  (a structural `oat-project-complete`/`seal` append onto an already-sealed log
  reports `already-appended`, keyed or unkeyed), a new terminal
  `status: 'sealed'` refusal for any non-seal append onto a sealed log, and the
  corrected `--idempotency-key` help text at `:1823`/`:1838`.
- `packages/cli/src/commands/project/log/check.test.ts`,
  `append.test.ts`, and `lifecycle.integration.test.ts` — the cases named in
  the test plan.
- `.agents/skills/oat-project-complete/SKILL.md` — the seal append gains
  `--idempotency-key`; the Step 3.7 resume clause at `:734-741` routes on the
  probe's `sealed` field instead of grepping for the heading; the Step 3.7
  summary hard gate and roll-up are both skipped on a sealed log; plus the
  parked p09 patch's edits to the resume entry (`:88-140`), the Step 6 guard,
  the Step 8 retention sentence, and Step 12.
- `.agents/skills/oat-project-complete/scripts/validate-durable-archive-receipt.mjs`
  and `.agents/skills/oat-project-complete/tests/validate-durable-archive-receipt.test.mjs`
  — re-applied from the parked p09 patch.
- `.agents/skills/oat-project-summary/SKILL.md` — route its own
  `PROJECT_LOG_CHECK` on `sealed: true`: skip ledger-graduation appends and
  report instead of attempting an append that the CLI now refuses.
- `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  — rewrite the `never appends retirement findings after an existing seal on
resume` case for the new prose, keep the `No project-log append may follow
the seal` pin, add the keyed-seal pin, add the p09 guard/ordering and
  interruption cases, and update the `oat-project-complete` version pin.
- `packages/cli/src/validation/skills.test.ts` — the `oat-project-complete` and
  `oat-project-summary` version pins (found by literal).
- `packages/cli/src/validation/named-skill-load-contract.test.ts` — only if a
  new sentence pairs an execution verb with a named `oat-project-*` skill; it is
  a required gate either way.
- `apps/oat-docs/docs/cli-utilities/project-log.md` (`:78`, `:142-155`,
  `:204-212`) — document the seal field, the keyed seal append, and the sealed
  refusal.
- `apps/oat-docs/docs/workflows/projects/lifecycle.md` (`:159-184`) and
  `apps/oat-docs/docs/workflows/projects/picking-up-projects.md` — the seal
  detection prose plus the parked p09 patch's docs edits.
- `.oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md`
  — a dated `**Refresh applied 2026-09-08 …**` entry in its
  `## Revalidation Before Execution`, resting its resume path on the new seal
  idempotence and correcting its six-versus-seven test count.
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan when it runs as a wave lane; the wave fan-in step makes
  exactly one lockstep bump for the integrated wave and regenerates the version
  asset through the build. Only a standalone execution bumps them itself, above
  freshly fetched `origin/main`.

### Out of scope

- `packages/cli/src/commands/project/log/rollup.ts` — verified not to write
  `project-log.md` and already deduplicating its ledger append. Adding a seal
  guard there would be a guard on a write that does not happen.
- Extending the Step 3.65 retry router to shared archive completions — option
  (b) in the backlog item. It is gated to synced non-archive runs at
  `SKILL.md:582`; widening it is a different design with a different blast
  radius, and this plan takes option (a).
- `packages/cli/src/commands/project/archive/**` and
  `refs/oat/completed/**` — the parked p09 plan already put both out of scope
  and nothing here changes that.
- `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs` —
  owned by the sibling plan.
- `packages/cli/assets/skills/**` — a gitignored byte copy regenerated by
  `packages/cli/scripts/bundle-assets.sh`; never edit or stage it.
- Retiring the `synthesis_pending` status or otherwise reshaping the `status`
  union.

## Current state

The completion seal is the last entry a project log may ever receive, and the
skill says so twice (`SKILL.md:741`, `:777`), pinned twice
(`review-skill-contracts.test.ts:1593`, `:1803`). Nothing enforces it. Three
gaps combine:

1. **The probe is blind.** `checkProjectLog` (`check.ts:245-285`) parses every
   entry, counts structural ones, and throws the producer/ref away. Its result
   has no seal field, so any consumer that needs to know whether a log is sealed
   must re-read the file itself. That is exactly what `SKILL.md:734-741` tells
   the model to do, and prose instructions to grep a file are not enforcement.
2. **The seal append is not idempotent.** It passes no `--idempotency-key`, and
   its body carries `$(date -u …)`, so two invocations differ in content and
   both append. Reproduced: two seals, both `status: "appended"`. The CLI
   already has everything needed to prevent this — `idempotencyToken`,
   `findProjectLogEntryByIdempotencyKey`, `validateIdempotencyKey`, and the
   `already-appended` return — and passing a stable key makes the replay a
   no-op today, with no CLI change. But a key cannot help a log sealed _before_
   this change: an old unkeyed seal body carries no token to match, so
   recognizing old seals needs the structural-heading path instead.
3. **Post-seal appends are permitted.** `appendProjectLog` never looks for a
   seal, so the retirement sweep, an observation promotion from
   `oat-project-summary`, or any other producer can append after it.

Those three gaps are why wave-5 p09 parked. Its resume design assumed gap 1 and
gap 2 did not exist: "Step 3.7's status probe sees the existing seal and skips
the append". Widening the Step 6 guard as p09 requires keeps the active pointer
alive through the whole network-bearing closeout, so every interruption re-enters
Step 3.7 — and today that means a second seal, violating the invariant p09's own
acceptance criteria depend on. Closing the three gaps makes p09's premise true,
which is why the plan refresh is a step here and not a separate item.

## Implementation steps

### 1. Snapshot the parked p09 patch before touching anything

Preserve the parked work as a durable artifact inside this lane's worktree
before any edit, because its only surviving copy is a dirty worktree that a
`git worktree prune` or a cleanup pass can remove:

```bash
git -C .worktrees/wave-5/p09 diff > p09-parked-tracked.patch
git -C .worktrees/wave-5/p09 status --porcelain
cp .worktrees/wave-5/p09/.agents/skills/oat-project-complete/scripts/validate-durable-archive-receipt.mjs .
cp .worktrees/wave-5/p09/.agents/skills/oat-project-complete/tests/validate-durable-archive-receipt.test.mjs .
```

**Verify:** `git -C .worktrees/wave-5/p09 diff --stat` reports three modified
files with 117 insertions and 17 deletions; the two copied files are 165 and
249 lines; `p09-parked-tracked.patch` is non-empty. If the worktree is gone,
this is a STOP condition unless the executor is explicitly authorized to
re-derive the patch from the parked plan's steps 1, 2, 3, and 5.

### 2. Reproduce the three gaps and record the red state

In a `mktemp -d` scratch repository (never `rm -rf` a variable path), with a
project directory holding `state.md` and a `project-log.md` copied from
`packages/cli/assets/templates/project-log.md`, using the branch-built CLI
(`pnpm build`, then `node packages/cli/dist/index.js`):

- run the exact seal invocation from `SKILL.md:766-772` twice with different
  timestamps; record two `status: "appended"` results and
  `grep -c 'structural · oat-project-complete · seal'` returning `2`;
- run `project log check --json` on that log; record the absence of any seal
  field;
- append a judgment entry after the seal; record that it succeeds.

**Verify:** all three observations recorded before any edit. These are the
pre-fix states that the tests in step 8 must reproduce as failures.

### 3. Make `check` seal-aware

In `check.ts`, extend `ProjectLogCheckResult` (`:34-45`) with
`sealed: boolean` and
`seal: { heading: string; date: string; keyed: boolean } | null`, derived in
`checkProjectLog` (`:264-285`) from the already-parsed entries: a structural
entry whose `producer` is `oat-project-complete` and whose `ref` is `seal`.
When several exist, report the **first** and record the count so a
double-sealed log from before this change is still legible. Set `keyed` from
whether the entry body carries the canonical seal token defined in step 5.
Leave `status` as `'ok' | 'absent' | 'synthesis_pending'` — it is consumed by
`oat-project-complete/SKILL.md:637` and `oat-project-summary/SKILL.md:153`, and
turning a sealed log into a fourth status would break every existing
`status: "ok"` route. Extend the non-JSON line at `:305-315` with a sealed
marker. Export the seal-detection helper so `append.ts` uses the same
definition; two definitions of "sealed" is the failure mode to avoid.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/project/log/check.test.ts` → new cases pass;
re-run step 2's scratch probe against the rebuilt CLI →
`"sealed": true` with the first seal heading and `"status": "synthesis_pending"`
unchanged.

### 4. Make the seal append idempotent and recognize old unkeyed seals

In `append.ts`, before the existing key-based dedupe at `:1494`, add a
seal-specific branch using the shared helper from step 3: when the requested
entry is structural with producer `oat-project-complete` and ref `seal`, and
the log already carries such a seal, return
`{ status: 'already-appended', logPath, heading: <existing seal heading>, created: false }`
without writing. This is what recognizes a **pre-existing unkeyed** seal, which
key matching cannot. Keep the existing key-based dedupe untouched for every
other producer.

Then add the refusal: when the log is sealed and the requested entry is **not**
a seal, return a new terminal `status: 'sealed'` carrying the seal heading and
a message naming the invariant, and make the command surface it as a non-zero
exit with the same JSON-versus-text handling the other terminal statuses use.
Correct the `--idempotency-key` wording at `:1823` and the epilogue at `:1838`
so they no longer imply `--commit` is required for dedupe.

**Verify:** `pnpm exec vitest run src/commands/project/log` → green, including
the new cases; re-run step 2's double-seal reproduction against the rebuilt
CLI → the second invocation reports `already-appended` and the log holds
exactly one seal; the post-seal judgment append now exits non-zero with
`status: "sealed"`.

### 5. Key the seal append and replace the prose workaround

In `.agents/skills/oat-project-complete/SKILL.md`:

- add `--idempotency-key "oat-seal:$PROJECT_NAME"` to the seal append
  (`:766-772`) and embed that exact token as its own whitespace-delimited word
  in `--body` — `validateIdempotencyKey` (`append.ts:1352-1366`) rejects a key
  the body does not carry, and `idempotencyToken` (`:1021`) matches the whole
  word, so the key must not be glued to the varying timestamp. Prefix the
  project name (`oat-seal:`) so the token cannot collide with ordinary prose in
  a body.
- rewrite the resume clause at `:734-741` to route on the probe:
  `sealed: true` from `PROJECT_LOG_CHECK` puts the sweep in report-only mode.
  Keep the invariant sentence `No project-log append may follow the seal`
  verbatim — it is pinned twice — and keep the sealed-log behavior identical
  (report the findings in the Step 12 summary, append nothing, never re-enter
  the roll-up or the seal). Delete only the instruction to read `logPath` and
  grep for the heading, and say instead which code owns the claim
  (`oat project log check` reports `sealed`), per
  `DR-260906-standing-claims-in-skills-name`.
- on a sealed log, also skip Step 3.7's summary hard gate (`:645-651`) and the
  roll-up (`:747`), so a resume never re-enters `oat-project-summary` or the
  roll-up after sealing.

In `.agents/skills/oat-project-summary/SKILL.md` (`:150-172`), route its own
probe on `sealed: true`: skip ledger graduation, report that the log is sealed,
and never attempt an append the CLI now refuses.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
→ the rewritten seal case and the new keyed-seal pin pass, and both
`No project-log append may follow the seal` pins still pass; `pnpm test:skills`
→ green.

### 6. Refresh the parked p09 plan

Append a dated entry to
`.oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md`
in its `## Revalidation Before Execution` section, beneath the existing
`**Refresh applied 2026-09-07 …**` paragraph and without rewriting it:

`**Refresh applied 2026-09-08 (seal idempotence landed):**` — state that the
step-3 premise "Step 3.7's status probe sees the existing seal and skips the
append" is now true because `oat project log check` reports `sealed` and the
seal append is keyed and dedupes; that the fourth STOP clause at `:298-315`
("a project-log append after the seal") is discharged by the CLI refusal rather
than by prose; that the count is **seven** new contract cases, not six (correct
the stale "six" in its step 4 and its Done criteria); and re-anchor the pins
the earlier refresh named onto this PR's values. Do not change its frontmatter,
its `oat_external_plan_commit`, or its legacy-mode shape.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
→ the readiness contract test, which sweeps every dated plan including this one,
passes; `pnpm exec oxfmt --check .oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md`
→ clean.

### 7. Re-apply the parked p09 patch

Apply the snapshot from step 1 onto the refreshed base: the Step 6 guard
widened to `SHOULD_ARCHIVE == "true" && IS_DURABLE_PROJECT == "true"`, the
shared-scope resume branch in the Step 1 entry block, the Step 8 retention
sentence, the generalized Step 12 clear, the new
`validate-durable-archive-receipt.mjs` with its `.mjs` test, and both docs
pages. Resolve conflicts against step 5's edits by hand — the patch's own prose
asserts "Step 3.7's status probe sees the existing seal and skips the append",
which must now be reconciled with step 5's routing sentence rather than
duplicated. Do not reuse or rename `validate-nonarchive-lifecycle-receipt.mjs`.

**Verify:** `pnpm test:skills` → the new
`validate-durable-archive-receipt.test.mjs` passes;
`git status --short` shows only in-scope paths and nothing under
`packages/cli/assets/`.

### 8. Add every test and prove each one can fail

Add the cases in the test plan, then neutralize each guard in turn, confirm the
matching case goes red, and restore. Every assurance-bearing clause gets its own
control: seal detection, keyed dedupe, old-unkeyed-seal recognition, the
post-seal refusal, and the one-seal-after-interruption case.

**Verify:** each neutralization is run, its failure output recorded, and the fix
restored; the full focused suite is green afterwards. A clause whose test stays
green under neutralization is vacuous and must be rewritten before continuing.

### 9. Docs, bumps, and pins

Update `apps/oat-docs/docs/cli-utilities/project-log.md` (the `check` output
description at `:142-155`, the `--idempotency-key` bullet at `:78`, and the
seal/roll-up paragraph at `:204-212`) and the seal paragraph in
`apps/oat-docs/docs/workflows/projects/lifecycle.md:179-184`. Bump
`oat-project-summary`'s `metadata.version`, and bump
`oat-project-complete`'s **only if** no sibling lane already bumped it in this
wave PR. Sweep each OLD literal across `packages/cli/src`, `tools/smoke`, and
`.agents/skills/*/tests` and update every pin found.

**Verify:** `rg -n '<each old literal>' packages/cli/src tools/smoke .agents/skills`
returns nothing; `pnpm run check:skill-bumps` exits 0; `pnpm check` →
markdownlint clean.

### 10. Gate

**Verify (lane mode, the default under the execution program):** run, capturing
each exit code explicitly (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`, never
`… | tail && echo OK`): the focused vitest set above, `pnpm test:skills`, then
`pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force` (a plain `pnpm test` can
replay a cache hit; look for `cache hit, replaying logs` or `>>> FULL TURBO`),
`pnpm run check:skill-bumps`, and — because this plan changes `.agents/skills`
— `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. Do not edit
lockstep release files and do not run `pnpm release:check-versions` or
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. This plan runs as a lane in wave 7, in a worktree
at `.worktrees/wave-7/<lane>`, with a root review after. **Standalone mode
only:** bump the five public packages above freshly fetched `origin/main` and
run the eight AGENTS.md gates in order.

## Test plan

Structural pattern: `check.test.ts:1-58` (`createHarness`/`runCommand`) for
command-level JSON assertions, and `append.ts:1491-1508`'s existing
`already-appended` cases in `append.test.ts` for the dedupe shape.

- `check.test.ts`:
  - a log with one `oat-project-complete`/`seal` structural entry reports
    `sealed: true` with that heading and `keyed` reflecting the body token;
  - an unsealed log reports `sealed: false`, `seal: null`;
  - a log sealed by a **different** producer or a different `ref` is **not**
    sealed;
  - a doubly-sealed legacy log reports the first seal and its count;
  - `status` is still `ok`/`synthesis_pending`/`absent` in every case, and the
    existing entry counts are unchanged.
    Negative control: remove the producer/ref condition so any structural entry
    counts as a seal → the different-producer case fails.
- `append.test.ts`:
  - replaying the keyed seal invocation with a different timestamp returns
    `already-appended` and writes one entry;
  - replaying a seal onto a log holding an **old unkeyed** seal returns
    `already-appended` — the case that key matching alone cannot satisfy;
  - a judgment append onto a sealed log returns `status: 'sealed'` and the
    command exits non-zero;
  - a `--scope general` promotion append onto a sealed log is refused the same
    way (the `oat-project-summary` path);
  - an append onto an **unsealed** log is unaffected in every existing case.
    Negative controls: delete the seal-specific dedupe branch → the unkeyed-seal
    case fails with a second entry; delete the refusal → the sealed-log judgment
    case fails by succeeding.
- `lifecycle.integration.test.ts`: a completion sequence that seals, is
  interrupted, and resumes leaves exactly one seal and no post-seal entry.
- `review-skill-contracts.test.ts`:
  - the rewritten `never appends retirement findings after an existing seal on
resume` case asserts the new routing prose and keeps
    `No project-log append may follow the seal`;
  - a new case pins `--idempotency-key "oat-seal:$PROJECT_NAME"` on the seal
    append and its presence in `--body`;
  - the seven p09 cases: three guard/ordering cases (pointer retained for every
    archive-enabled scope; cleared for `local` and for every non-archive
    completion; archive index before the Step 12 clear index) and four
    interruption cases executed through the bash guard evaluator against a temp
    project fixture, not string-matched (after `complete-state`; after the PR
    artifact; after archive but before the clear; archive not discoverable).
    The third interruption case is the one that must show **exactly one** seal
    entry.
    Negative controls: revert the Step 6 guard widening → the retention cases go
    red; move the resume branch's archive-validation sentence after the clear →
    the ordering case goes red; remove the seal key → the keyed-seal pin goes red.
- `skills.test.ts` and `named-skill-load-contract.test.ts`: green; the version
  pins fail on the old literal before they are updated, which is itself the
  control proving the pins are live.
- `skills-bundled-docs-contract.test.ts`: green with the refreshed p09 plan and
  both wave-7 plans in the corpus.
- Manual control: re-run step 2's scratch reproduction against the rebuilt CLI
  and record one seal, `sealed: true`, and a refused post-seal append.
- Regression proved: a pre-archive interruption resumes without a second seal;
  a log sealed before this change is still recognized; nothing can append after
  the seal.

## Done criteria

- [ ] `oat project log check --json` reports `sealed` and `seal` for a sealed
      log, `sealed: false` for an unsealed one, and its `status` union is
      unchanged.
- [ ] Replaying the skill's seal invocation reports `already-appended` and
      leaves exactly one seal entry, both for a keyed seal and for a
      pre-existing unkeyed one.
- [ ] Any non-seal append onto a sealed log is refused with `status: 'sealed'`
      and a non-zero exit, and `oat-project-summary` routes around it instead of
      hitting it.
- [ ] `oat-project-complete/SKILL.md` no longer instructs the model to grep for
      the seal heading; it routes on the probe, and both
      `No project-log append may follow the seal` pins still pass.
- [ ] Step 3.7 on a sealed log re-enters neither the summary hard gate, the
      roll-up, nor the seal.
- [ ] `2026-09-02-defer-activeproject-clearing-on-archive-completions.md`
      carries a dated `Refresh applied 2026-09-08` entry resting its resume path
      on the new seal idempotence and stating seven cases, and
      `skills-bundled-docs-contract.test.ts` passes with it.
- [ ] The parked p09 patch (steps 1, 2, 3, 5) is re-applied and its seven test
      cases pass, including exactly one seal entry after a pre-archive
      interruption.
- [ ] Every neutralization control listed in the test plan was observed red and
      recorded.
- [ ] Exactly one `metadata.version` bump per changed skill exists in the PR
      diff, and every OLD literal sweep returns nothing.
- [ ] Lane mode: focused tests, `pnpm test:skills`, `pnpm check`,
      `pnpm type-check`, forced `turbo run test`, `pnpm run check:skill-bumps`,
      `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills` pass with
      captured exit codes, and no lockstep release file is edited. Standalone
      mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained or out-of-scope files, and
      nothing under `packages/cli/assets/`.
- [ ] GitHub issue #252 is referenced in the change and is closable; closing
      this plan closes it.

## STOP conditions

Stop and report instead of improvising when:

- the `.worktrees/wave-5/p09` worktree is gone and no patch snapshot exists —
  re-deriving 531 insertions of parked work from prose is a different task with
  a different estimate, and it needs explicit authorization;
- the drift check shows a seal field already on `ProjectLogCheckResult`, or a
  key already on the seal append — the work landed elsewhere and this plan needs
  re-scoping;
- making the post-seal refusal pass would require weakening any existing
  acceptance: the **weaker-anywhere rule** applies to `checkProjectLog`,
  `appendProjectLog`, and `validateIdempotencyKey` alike — any input previously
  rejected that becomes accepted is a **Critical** finding, whatever the suite
  says. In particular, the seal-specific dedupe must not let a
  producer/ref-mismatched entry pass as a seal, and it must not relax
  `validateIdempotencyKey`'s requirement that the key appear in the body;
- the refusal would break a legitimate flow that this plan does not route —
  a consumer of `oat project log append` outside `oat-project-complete` and
  `oat-project-summary` that appends after completion. Enumerate consumers
  before shipping the refusal; if one exists, report it rather than silently
  widening the exemption;
- turning the sealed state into a fourth `status` value looks necessary — that
  breaks every `status: "ok"` route in both consuming skills, and the additive
  field exists to avoid it;
- the p09 patch cannot be reconciled with the new routing prose without
  reintroducing a second `oat project archive` invocation, a project-log append
  after the seal, or a skipped Step 7 artifact — the parked plan's own STOP
  clauses at `:298-315` still bind;
- a neutralization in step 8 leaves its case green;
- a required change crosses into
  `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs`
  (owned by the sibling plan),
  `packages/cli/src/commands/project/archive/**`, or the Step 3.65 router's
  scope gate;
- a named verification gate fails twice after one bounded correction;
- an unsatisfied hard dependency in `## Dependencies` still blocks execution,
  whatever `oat_execution_status` claims.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `c9f2e147ac0674e73a60735e0c1727ccc6048756`;
- PR #190 lands (major: it edits both pin files and `lifecycle.md` — apply the
  `## Landing-event impact` table and re-anchor by string, not line), or PR
  #273 or #125 lands;
- the sibling plan `2026-09-08-read-stdin-in-finalize-synced-archive.md` merges
  — then `oat-project-complete` is already bumped in this PR and step 9 adopts
  that value;
- `.worktrees/wave-5/p09` changes state, is pruned, or is committed;
- the parked p09 plan is refreshed or superseded by anything other than this
  plan;
- `ProjectLogCheckResult`, `appendProjectLog`'s idempotency helpers, the seal
  prose at `SKILL.md:734-741`/`:766-772`, or the pinned `it(...)` names in
  `review-skill-contracts.test.ts` change;
- a load-bearing evidence claim cannot be reproduced — re-run step 2's three
  reproductions before trusting this plan.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`.

## Review focus

- The seal definition lives in **one** place and both `check` and `append` use
  it. Two definitions of "sealed" is the regression to look for.
- `status` on `ProjectLogCheckResult` is unchanged, and both consuming skills'
  existing `status: "ok"` / `"absent"` / `"synthesis_pending"` routes still work
  untouched.
- The post-seal refusal is a **stronger** guard: verify no legitimate append
  became impossible, and that `oat-project-summary` was actually routed rather
  than left to hit the refusal. Conversely, verify nothing previously rejected
  became accepted — that is the Critical class.
- Old unkeyed seals are recognized by structure, not by key. A design that only
  keys new seals silently regresses every project sealed before this change.
- The rewritten `review-skill-contracts.test.ts` seal case asserts the new
  behavior rather than merely relaxing the old assertions; both
  `No project-log append may follow the seal` pins survive.
- The p09 refresh is a real reconciliation: its step-3 premise sentence now
  matches the shipped routing, and the six-versus-seven count is corrected in
  both places.
- Every neutralization control was observed red with output recorded, not
  asserted — including the one-seal-after-interruption case, which is the whole
  point of the item.
- Exactly one bump per changed skill in the PR diff; pins moved by literal
  sweep, not by the line numbers this plan quotes.
- Follow-up deferred on purpose: extending the Step 3.65 retry router to shared
  archive completions (backlog option (b)) remains unexplored and is not
  required once seal idempotence is real.
