---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: true
oat_generated: false
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: high
---

# Implementation Plan: backlog-wave-4

> Execute this plan using `oat-project-implement`. The seven phases run
> sequentially on branch `wave/2026-10-02-backlog-wave-4`.

**Goal:** Ship Wave 4 of the backlog as one PR: close or advance thirteen
backlog items with evidence (bundle and asset-root hardening, gate budgets,
nested-gate rejection and idle kill, sync restamping, a complexity review at
every review and gate budget exhaustion, persisted quick-start approvals,
root judgment logging, an opt-in autonomous completion skill, and four small
fixes) and bump the lockstep packages to 0.3.14 (`main` reached 0.3.13
through #335 during planning; the branch merged `origin/main` at `e19389cd2`).

**Architecture:** Six sequential phases plus a release fan-in (seven in
total), grouped by write set: build assets
(p01), gate timeouts (p02), sync correctness (p03), review-loop skills (p04),
completion (p05), small fixes (p06), and a release fan-in (p07).

**Tech Stack:** TypeScript ESM CLI (`packages/cli`, vitest), control-plane
(`packages/control-plane`), Bash build scripts, bundled skills under
`.agents/skills` (canonical; `packages/cli/assets` is a generated copy that is never edited
by hand, except the tracked `public-package-versions.json`, which the lockstep
bump changes) with shared docs under `.agents/docs`, `node --test`
skill suites, Fumadocs docs app (`apps/oat-docs`), oxfmt and oxlint.

**Commit Convention:** `{type}({task-id}): {description}`, for example
`fix(p01-t01): fail closed on empty bundle-inputs lookups`. Commit bodies stay
within commitlint's 100-character line limit; check `git commit`'s exit code
explicitly, never through a pipe.

**Format command (every artifact-writing task):**
`pnpm exec oxfmt --write <changed files>` from the repository root for
Markdown, JSON, and JS/TS files. Never run oxfmt on any `state.md`.

**Scoped test commands:** CLI tests run with
`pnpm --filter @open-agent-toolkit/cli exec vitest run <path relative to packages/cli>`;
control-plane tests with
`pnpm --filter @open-agent-toolkit/control-plane exec vitest run <path>`; skill
suites with `node --test .agents/skills/<name>/tests/*.test.mjs`. Anything that
imports `@open-agent-toolkit/control-plane` or reads `packages/cli/assets`
needs `pnpm build` first.

**Worker rules (every task):**

- Behavior changes get a failing-first test; guards get a neutralize-and-restore
  proof (disable the guard, show the test fails, restore). Record both in the
  commit body.
- Tests that exercise template resolution or anything reading `~/.oat` inject
  an isolated `HOME` (`HOME=$(mktemp -d)`).
- Version bumps: every task bumps each skill whose bundled files it changes
  (including a vendored shared doc under `references/docs/`), and each agent
  role it changes, unless the branch already bumped it: check with
  `git fetch origin main && git diff origin/main...HEAD -- <skill dir>`
  (three dots, so changes that landed on `main` are not mistaken for this
  branch's bump). Update every pin of that version in
  `packages/cli/src/validation/skills.test.ts` or the skill's own contract test
  in the same commit. Run `pnpm run check:skill-bumps` before committing.
- A changed shared doc under `.agents/docs/` counts as a change to every skill
  that vendors it through `references/docs/`. `autonomy-contract.md` is
  vendored by `oat-project-document`, `oat-project-implement`,
  `oat-project-lite`, `oat-project-pr-final`, and `oat-project-quick-start`,
  so the first task that edits it bumps all five (unless already bumped).
- New prompt-like prose in lifecycle skills can trip
  `packages/cli/src/validation/autonomy-gate-inventory.test.ts`; add the
  printed `sha12 -> GATE-ID|NG` key to the "HEAD prompt-site coverage" table in
  `.agents/docs/autonomy-contract.md` in the same task's commit (p04-t08 only
  rewrites the four inventory rows). New sentences that name an
  `oat-project-*` skill with an execution verb need a row in
  `packages/cli/src/validation/named-skill-load-contract.test.ts`.
- Never `rm -rf` a variable path; use `mktemp -d` scratch directories.
- Use `node packages/cli/dist/index.js` (after `pnpm build`) for branch-CLI
  probes; the `oat` on PATH is the released 0.3.10 CLI.
- Lanes regenerate provider views with `oat sync --scope project` only.

---

## Phase 1: Build assets

### Task p01-t01: Fail closed on empty bundle-inputs lookups

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh` (lines 8-10 build
  `"${REPO_ROOT}/$(node "${INVENTORY}" --get <key>)"`; staging is created by
  the `mkdir -p` at line 42; the directory copy is at line 107)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`printValue`, around line 182)
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`

**Step 1: Failing test first**

In `bundle-consistency.test.ts`, add a case that copies `bundle-assets.sh` and
a stub `bundle-inputs.mjs` (its `--get` prints an empty line) into
`<mktemp>/packages/cli/scripts/`, so the temporary directory is the script's
`REPO_ROOT`, and runs it with `OAT_ASSETS_DIR` pointing at another temporary
directory. Assert a non-zero exit and a stderr message naming the empty key;
that message is the discriminating assertion (the current script also exits
non-zero on the stub, and its EXIT trap removes staging), so also assert the
guard fires before the `mkdir -p` at line 42 (for example, no staging
directory is ever created, checked with a trap-proof marker). Add a second case
for a lookup that resolves to the repository root (for example `.`). Reuse the
existing `getBundleScriptPath`, `execFileSync('bash', ...)`, and
`BUNDLE_ASSETS_TEST_TIMEOUT_MS` patterns. Confirm both fail against the
current script without filling the disk (the stub tree must be tiny, and the
test must assert before any recursion can grow).

**Step 2: Implement**

Add a `require_inventory_path <key>` helper to `bundle-assets.sh`, used for all
three lookups before any `mkdir` or `cp`. It exits 1 with a clear message when
the lookup prints nothing, is absolute, contains a `..` segment, or resolves to
`REPO_ROOT`. Then assert that `STAGING` and `PREVIOUS` are not inside the docs
source tree and that the docs source is not an ancestor of `ASSETS`. In
`bundle-inputs.mjs`, make `printValue` reject an empty string, an absolute
path, and a `..` segment with a non-zero exit.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/release/public-package-contract.test.ts`
and `pnpm --filter @open-agent-toolkit/cli build`.
Expected: exit 0 (the real bundle still builds). Neutralize the guard, show the
new test fails, restore.

**Step 4: Commit**

`fix(p01-t01): fail closed on empty bundle-inputs lookups`

---

### Task p01-t02: Report the errno when the assets root cannot be read

**Files:**

- Modify: `packages/cli/src/fs/assets.ts` (`resolveAssetsRoot` catch, around
  lines 266-277; reuse `isMissingPathError` and `errorCode`)
- Modify: `packages/cli/src/fs/assets.test.ts`

**Step 1: Failing test first**

In `describe('resolveAssetsRoot')`, add a case with a self-referential symlink
as `OAT_ASSETS_DIR` (ELOOP, as in the existing symlink test around lines
425-447). Assert the message contains `(ELOOP)`, does not say "not found", and
the exit code is 2. Add the packaged-root variant through `statRedirects`.
Add a file-level `afterEach(() => statRedirects.clear())`.

**Step 2: Implement**

Keep the "Assets directory not found" message for ENOENT; report
`Assets directory could not be read (<errno>): <path>` plus the existing remedy
for other errors, mirroring `validateBundleStructure`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/fs/assets.test.ts`
Expected: exit 0.

**Step 4: Commit**

`fix(p01-t02): report the errno when the assets root cannot be read`

---

## Phase 2: Gate timeouts

### Task p02-t01: Give full-surface artifact reviews a 30-minute default

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (`resolveGateExecTimeout`,
  around lines 909-1016; the artifact branch at about 999-1001 returns 900_000)
- Modify: `packages/cli/src/commands/gate/index.test.ts` (scope-default
  `it.each` around 8413-8470; the info-string pin around 8519)
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (budgets, around
  925-940) and `apps/oat-docs/docs/reference/cli-reference.md` (around 165)

**Step 1: Failing test first**

Add artifact cases (scopes `plan`, `design`, `discovery`) to the scope-default
table expecting 1_800_000 with source `scope-default`, and a case showing that
CLI, target, `workflow.gateTimeouts`, and env overrides still take precedence.

**Step 2: Implement**

Return 1_800_000 for every artifact review (operator decision: full-surface
artifact and plan reviews default to 30 minutes). Leave task-scoped code
reviews at 900_000. Update the pinned info string and the docs.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: exit 0.

**Step 4: Commit**

`feat(p02-t01): give full-surface artifact reviews a 30-minute default`

---

### Task p02-t02: Reject a duplicate live gate for the same project and scope

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (`GateRunMarker` around
  235-245; `writeGateRunMarker` around 482 and its call around 4193-4210; the
  dependency seam around 151-158 and 430; failure envelope
  `writeReviewGateExecutionFailure` around 2675-2725; success envelope)
- Modify: `packages/cli/src/commands/gate/index.test.ts`,
  `packages/cli/src/commands/gate/gate-hardening.integration.test.ts` (the exact
  `gate-start` object in case 3, around 143, if the diagnostic changes)
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (marker fields
  around 1017-1019; a short "Nested and duplicate runs" section; incident table
  around 1046)

**Step 1: Failing test first**

Through injected dependencies (no real processes), seed a live marker for the
same project, review type, and scope, and assert that a second `gate review`
launches nothing and returns a structured, non-zero envelope whose JSON
records the recursion decision (`recursion: { decision: "rejected",
matchedRunId }`). Add controls: a marker with a dead pid, an unparseable marker
file, a marker for a different scope, and a run-ID shim directory are all
ignored and the launch proceeds with `recursion: { decision: "none" }`.

**Step 2: Implement**

Add `pid` to `GateRunMarker`. Before writing the marker, scan the
`oat-gate-runs` directory for `*.json` markers through an injected scan and
pid-alive check (`process.kill(pid, 0)` in production), match on project,
review type, and scope, and reject a live match without launching. Record the
recursion decision in the marker-adjacent diagnostics and in both success and
failure JSON envelopes. The scan must stay injectable so tests never see real
markers from other processes; the integration test uses a unique `TMPDIR`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/commands/gate/gate-hardening.integration.test.ts`
Expected: exit 0. Neutralize the rejection, show the duplicate test fails,
restore.

**Step 4: Commit**

`feat(p02-t02): reject a duplicate live gate for the same project and scope`

---

### Task p02-t03: Kill an idle gate child and report distinct timeout outcomes

**Files:**

- Modify: `packages/cli/src/commands/gate/child-process.ts` (`ProcessRunOptions`
  13-24, `ProcessRunResult` 26-33, `runChildProcess` from 55; activity tracking
  85-107; hard timer 200-212; probe activity 124-135; idle diagnostic 172)
- Modify: `packages/cli/src/commands/gate/index.ts` (resolve the idle window
  next to the hard budget; pass it for `purpose: 'execute'` runs with piped
  stdio only; thread `timeoutKind` into the failure envelope)
- Modify: `packages/cli/src/commands/gate/child-process.test.ts`,
  `packages/cli/src/commands/gate/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`

**Step 1: Failing tests first**

In `child-process.test.ts`, with real `node -e` children and small budgets (the
existing pattern; no fake timers): a child that prints every 30 ms with
`idleTimeoutMs` 100 and a longer hard cap is not killed by the idle mechanism
and outlives the idle window; a silent child is killed within the idle window
with `timeoutKind: 'idle'`; a chatty child is stopped by the hard cap with
`timeoutKind: 'hard'`. Add a case where `project-dir` probe evidence advances
(`lastChangeAt` or `totalSizeBytes` changes between consecutive liveness
observations) and resets the idle clock; a case where that evidence changes
once and then stays static, and the child is still killed with
`timeoutKind: 'idle'` (the probe's `changedSinceBaseline` flag is cumulative,
`activity-probes.ts` around 193-197, so it must not be used); and a case
where `ambient-runtime` evidence never resets the clock. In `index.test.ts`, assert
the envelope distinguishes idle kill, hard-cap kill, and the existing
recovered-after-timeout path (`lateCompletion`).

**Step 2: Implement**

Add `idleTimeoutMs` to the run options and an idle checker that reuses the
hard-timer kill path and samples probe evidence on the existing liveness tick
(`child-process.ts` around 155-191). Stdout, stderr, and `project-dir`
evidence that advanced since the previous observation count as activity;
`ambient-runtime` evidence does not. Resolve the idle window as 600_000 ms by
default, disabled when it is not below the hard budget, never applied to
`stdio: 'inherit'` runs, and disabled by default for runtimes whose transcript
evidence is only `ambient-runtime` (Codex, `activity-probes.ts` around 169):
an outer Codex process can stay silent on stdout while a nested reviewer
works, which is the incident behind this item, so Codex runs keep the hard
cap only. Document this in `workflow-gates.md` and the PR callout. Report `timeoutKind` (`idle` or
`hard`) in the structured envelope and diagnostics. The early-template write
(item criterion 4) and the provider preflight and unavailable-target envelope
(criteria 8-9) stay out of scope.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/child-process.test.ts src/commands/gate/index.test.ts src/commands/gate/gate-hardening.integration.test.ts`
Expected: exit 0. Neutralize the idle kill, show the silent-child test fails,
restore.

**Step 4: Commit**

`feat(p02-t03): kill an idle gate child and report distinct timeout outcomes`

---

## Phase 3: Sync correctness

### Task p03-t01: Restamp stale copy hashes and bridge legacy retirement

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.ts` (`classifyOperation` around
  385-470; `classifyObsoleteMappingRetirement` 281-373, directory-copy branch
  340-365)
- Modify: `packages/cli/src/engine/execute-plan.ts` (`ensureSkipEntryManaged`
  379-395; `toManifestEntry` 173-196)
- Modify: `packages/cli/src/engine/engine.types.ts` (`SyncPlanEntry`,
  `SyncOperationType`) and the renderers in
  `packages/cli/src/commands/sync/dry-run.ts` and `apply.ts`, so the restamp is
  visible in dry-run and JSON output
- Modify: `packages/cli/src/engine/compute-plan.test.ts`,
  `packages/cli/src/engine/execute-plan.test.ts`, an end-to-end case in
  `packages/cli/src/engine/engine.integration.test.ts` (or `edge-cases.test.ts`),
  and the `commands/sync` tests for the rendered restamp

**Step 1: Failing tests first**

- A faithful copy-strategy tree whose manifest `contentHash` is legacy or
  tampered: the plan reports a restamp on the skip entry (visible in dry-run
  and JSON output), sync writes the framed digest, and a second run changes
  nothing (`lastUpdated` unchanged). Control: a matching hash is left
  untouched.
- An obsolete copy mapping with a legacy manifest digest classifies `remove`
  when the provider tree matches canonical, and `detach` when the provider body
  is tampered or the stored hash is forged (copy the fixture style of the test
  around 405-446; derive the legacy digest with `computeDirectoryDigests`, as
  `drift/detector.test.ts` around 455 does).

**Step 2: Implement**

Mark skip entries whose recorded hash differs from the framed digest for
restamp in the plan, and write the framed digest in `ensureSkipEntryManaged`
only then. In `classifyObsoleteMappingRetirement`, accept a stored legacy
digest through `computeDirectoryDigests(canonicalPath)` (guarded with
`.catch(() => null)`, as the detector does). Do not change the detector bridge
or the legacy encoder; their retirement stays open.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine src/drift src/commands/sync`
Expected: exit 0, including the detector's fused-forgery controls.

**Step 4: Commit**

`fix(p03-t01): restamp stale copy hashes and bridge legacy retirement`

---

### Task p03-t02: Report a missing SKILL.md for every canonical skill directory

**Files:**

- Modify: `packages/cli/src/validation/skills.ts` (around 1562-1574; keep
  `validatedSkillCount` at around 1702 unchanged)
- Modify: `packages/cli/src/validation/skills.test.ts` (beside 272-287)

**Step 1: Failing test first**

A non-`oat-` skill directory (for example `custom-skill`) with no `SKILL.md`
is reported as missing.

**Step 2: Implement**

Run the missing-`SKILL.md` check over every canonical skill directory; keep
the `oat-*`-specific checks as they are.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
and `pnpm oat:validate-skills`.
Expected: exit 0 (every current directory has a `SKILL.md`).

**Step 4: Commit**

`fix(p03-t02): report a missing SKILL.md for every canonical skill directory`

---

### Task p03-t03: Stop marker-less skill and agent directories from looping

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.ts` (and, if needed,
  `packages/cli/src/engine/execute-plan.ts` `applyCopyMarker` around 222-233),
  `packages/cli/src/engine/engine.types.ts`, and the renderers in
  `packages/cli/src/commands/sync/dry-run.ts` and `apply.ts` for the new
  entry-level error
- Modify: the matching engine and `commands/sync` tests

**Step 1: Failing test first**

A canonical skill directory without `SKILL.md` (and an agent directory without
its role file) under copy strategy: two consecutive syncs produce the same
single, clear configuration error naming the missing marker file and no
`update_copy`; other entries still sync.

**Step 2: Implement**

Detect the missing marker while planning and report it as a loud entry-level
error instead of planning `update_copy` on every run.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine src/commands/sync`
Expected: exit 0.

**Step 4: Commit**

`fix(p03-t03): stop marker-less skill and agent directories from looping`

---

## Phase 4: Review-loop skills

### Task p04-t01: Add the condensed complexity-review guidance

**Files:**

- Create: `.agents/docs/complexity-review-fallback.md`
- Create: symlinks `references/docs/complexity-review-fallback.md` in
  `.agents/skills/oat-project-implement`, `.agents/skills/oat-project-quick-start`,
  and `.agents/skills/oat-project-review-receive` (relative links to
  `../../../../docs/complexity-review-fallback.md`, matching how
  `autonomy-contract.md` is vendored; `oat-project-review-receive` has no
  `references/docs/` directory yet, so create it)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`linkedFiles`, around
  121-128)
- Modify: `NOTICES.md` (the doc adapts prose from the `complexity-review` skill
  in `tkstang/skills`)

**Step 1: Write the doc**

One doc, read by the root and by the reviewer subagent:

- **When:** every budget-exhaustion point (listed with the owning skill and
  step), and the opt-in early trigger (two consecutive High findings in the
  same family within one loop, when `workflow.complexityReviewEarlyTrigger` is
  true).
- **Probe:** look for an installed `complexity-review/SKILL.md` in
  `~/.agents/skills`, `~/.claude/skills`, then `<repo>/.agents/skills`. When
  found, the subagent reads and follows it as a document (it is not
  model-invocable), with interactive questions forbidden. Otherwise it follows
  the condensed method below.
- **Dispatch:** one read-only reviewer-class subagent through
  `oat-project-dispatch-subagents` at the resolved reviewer ceiling. It writes
  nothing and launches nothing, reads committed content when another writer may
  own the worktree, and returns the report inline. Scope: the reviewed target
  (phase commit range or plan bundle), the contract sources (backlog items,
  discovery, spec, design, decision records), and every review artifact of the
  exhausted loop.
- **Condensed method:** contract restated from independent sources (labeled
  inferred and the verdict provisional when missing); simplest viable
  baseline; machinery inventory with the deletion test; ledger columns Item,
  Claimed value, Evidence, Lifecycle cost, Recommendation (Keep, Simplify,
  Defer with a reintroduction trigger, or Delete); evidence scale; verdict
  scale (`Deletion-rule compliant`, `Partially compliant`, `Not compliant`);
  report sections; skeptical-not-minimalist stance; correctness findings go
  out of lane.
- **OAT additions:** REQUIRES-OPERATOR markers for rows only the operator can
  settle; open findings classified as accepted-requirement, regression, or
  new-hardening with recurring families called out; which open findings a
  recommended simplification would dissolve; a recommended disposition from
  extra cycles, proceed with override, corrective revision, or **simplify**.
- **Decision message and record:** the root saves the report beside the review
  artifacts (`reviews/complexity-<scope>-<timestamp>.md`), shows one decision
  message (why the loop stopped, the verdict and ledger highlights, dissolvable
  findings, REQUIRES-OPERATOR items in plain terms, the recommended
  disposition), and records the operator's choice with the report path in
  `implementation.md`. Agents never select the disposition; under
  `OAT_AUTONOMOUS=1` the run stops at its boundary report, which includes the
  same content.

**Step 2: Wire the bundle**

Add the doc to `linkedFiles`, create the three symlinks, and add the
`NOTICES.md` entry.

**Step 3: Verify**

Run: `pnpm build` and `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: exit 0; the bundled copies resolve.

**Step 4: Commit**

`feat(p04-t01): add condensed complexity-review guidance`

---

### Task p04-t02: Add the opt-in early complexity trigger config key

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (type around 281-282, parse
  around 730-735), `packages/cli/src/config/resolve.ts`
  (`DEFAULT_WORKFLOW_CONFIG` around 117-118),
  `packages/cli/src/commands/config/index.ts` (key union around 165-170, key
  list around 346-347, describe entries around 870-890,
  `WORKFLOW_BOOLEAN_KEYS` around 1463-1464)
- Modify: `packages/cli/src/config/oat-config.test.ts`,
  `packages/cli/src/config/resolve.test.ts`,
  `packages/cli/src/commands/config/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`,
  `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Failing test first**

`workflow.complexityReviewEarlyTrigger` parses as a boolean, defaults to
`false`, and is accepted by `oat config get`, `set`, and `describe`, following
the `workflow.archiveOnComplete` tests.

**Step 2: Implement** the key and its docs.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config src/commands/config`
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t02): add the opt-in early complexity trigger config key`

---

### Task p04-t03: Run the complexity review at implement's exhaustion points and log root judgment

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
  (root review cap and bounded fix loop around 778-811; phase gate exhaustion
  around 822-845)
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
  (final review cap around 199-206 and 295; exit gate `maxAttempts` around
  536-543 and 773-795)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` ("Project Log Append
  Points", around 42-76)
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  (project-log pin around 725-760) and the implement version pins in
  `packages/cli/src/validation/skills.test.ts`

**Step 1: Failing pins first**

Add a table-driven contract test (in `review-skill-contracts.test.ts` or a new
`complexity-review-contracts.test.ts` beside it) with one row per implement
exhaustion point (root review cap, phase gate exhaustion, final review cap,
exit gate `maxAttempts`): each site points to
`references/docs/complexity-review-fallback.md`, dispatches the review before
the decision message or boundary report, and says agents never select the
disposition. Add a pin for the root-judgment logging guidance.

**Step 2: Implement**

At each implement exhaustion point add the one-paragraph pointer: dispatch the
complexity review per the shared doc, then present the decision message (or,
under `OAT_AUTONOMOUS=1`, include it in the boundary report), and record the
operator's choice with the report path in `implementation.md`. Mention the
opt-in early trigger at the root review loop. In "Project Log Append Points",
add root-judgment entries through `oat project log append` when breaks,
surprises, workarounds, or notable successes surface, including observations
relayed from subagent reports (queued and appended at the next bookkeeping
boundary, never while a child owns the worktree); say that phase implementers
and dispatched subagents have no logging duties; defer the entry format to the
helper's `--help`; keep the existing "the helper no-ops when the feature is
off" wording. Bump `oat-project-implement`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t03): run the complexity review at implement's exhaustion points`

---

### Task p04-t04: Run the complexity review at review-receive's cycle cap

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md` (Step 8, around
  604-630)
- Modify: the contract test from p04-t03 (add the receive row) and the
  review-receive version pins in `packages/cli/src/validation/skills.test.ts`

**Step 1: Failing pin first** for the receive cycle-cap row.

**Step 2: Implement**

At the "limit reached" point, dispatch the complexity review per the shared
doc before the menu, add **simplify** to the offered dispositions, and record
the choice with the report path. Keep the three-cycle count and the exclusion
of gate-originated artifacts unchanged. Bump `oat-project-review-receive`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t04): run the complexity review at review-receive's cycle cap`

---

### Task p04-t05: Define the gate approval record once

**Files:**

- Create: `.agents/docs/gate-approval-record.md`
- Create: symlinks `references/docs/gate-approval-record.md` in
  `.agents/skills/oat-project-quick-start`, `.agents/skills/oat-project-implement`,
  `.agents/skills/oat-project-next`, and `.agents/skills/oat-project-progress`
  (next and progress have no `references/docs/` directory yet; create it)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`linkedFiles`)
- Modify: `packages/cli/src/commands/shared/frontmatter.ts`
  (`PROJECT_STATE_FRONTMATTER_FIELDS`, around 41) and
  `packages/cli/src/commands/shared/frontmatter.test.ts` (around 488-520)
- Modify: `.oat/templates/state.md` (commented `oat_quick_start_gate` block next
  to `oat_implement_exit_gate`, around 39-48)
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
  (the `oat_implement_exit_gate` shape around 314-341 and the write rule around
  549-551 reference the shared doc and add `decided_at`)

**Step 1: Write the doc**

Define the shared lifecycle-gate record carried in project `state.md`. The
common core, used by both carriers: `status` (`allowed` | `blocked`),
`disposition` (`passed` | `warned` | `prompt_approved` | `project_disabled`,
or `null` when blocked), `config_fingerprint`, `reviewed_head` (the commit the
gate reviewed, recorded as provenance), and `decided_at` (ISO 8601 UTC). In
the same doc, define implement's `oat_implement_exit_gate` as a documented
superset of that core (its additional `status` values `pending` and `stale`,
disposition `no_gate`, `resolution`, and its effective-delta fields), so the
shape is written down once and both enums are pinned. An
explicit operator continuation after a `prompt` failure writes
`allowed/prompt_approved`; declining or deferring writes `blocked`, never
anything that reads as approval. Name the two carriers:
`oat_implement_exit_gate` (implement, which keeps its additional fields) and
`oat_quick_start_gate` (quick-start). Describe how readers validate a quick-start record: its
`config_fingerprint` matches the currently resolved quick-start gate
declaration. `reviewed_head` is not compared with `HEAD`, because Step 3.7
commits after the gate; implement's record keeps its own effective-delta
freshness rule.

**Step 2: Wire it**

Add the doc to `linkedFiles` and the four symlinks; add `oat_quick_start_gate`
to the state frontmatter fields and template; make implement's shape reference
the doc and write `decided_at` (update any field-by-field pins in
`post-implement-sequence-contracts.test.ts`, around 279-300).

**Step 3: Verify**

Run: `pnpm build` and `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts src/commands/init/tools/shared`
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t05): define the gate approval record once`

---

### Task p04-t06: Persist quick-start gate outcomes and run the complexity review at QS-12

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (Gate Execution
  steps 5-6 around 878-892; the block/prompt paragraph around 900-906; Step 3.7
  around 904-932)
- Modify: the contract test from p04-t03 (quick-start row) and a new pin that
  fails when quick-start's approval write is removed; quick-start version pins
  in `packages/cli/src/validation/skills.test.ts` (including the gate-text regex
  around 2193)

**Step 1: Failing pins first**

Pin: quick-start writes `oat_quick_start_gate` per
`references/docs/gate-approval-record.md` for every configured-gate outcome;
a `prompt` continuation writes `allowed/prompt_approved`; a decline or deferral
writes `blocked`; and exhausted `block` attempts dispatch the complexity review
before escalation.

**Step 2: Implement**

Add the record write to the gate steps and Step 3.7 (completion only after an
`allowed` record), and the complexity-review pointer at `maxAttempts`
exhaustion only (a single `prompt` failure is not a budget exhaustion). Bump `oat-project-quick-start`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
Expected: exit 0. Remove the approval write, show the pin fails, restore.

**Step 4: Commit**

`feat(p04-t06): persist quick-start gate outcomes and review complexity at QS-12`

---

### Task p04-t07: Read both gate records in next and progress

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md` (Step 5.0 around 331-373)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (gate posture
  reporting around 180-203)
- Modify: pins for next and progress in `packages/cli/src/validation/skills.test.ts`

**Step 1: Failing pins first**

Next and progress read `oat_quick_start_gate` through the shared doc's
validation rule, alongside the implement record they already handle. The
quick plan readiness predicate stays the single routing rule for quick plans
(it is defined once in quick-start and mirrored by the control-plane router
and, after p06-t03, the dashboard), so the record adds no route: after
readiness passes, next reports a missing, `blocked`, or fingerprint-stale
quick-start record as a warning in its recommendation, and progress reports
both records' status and disposition. A pin fails when quick-start's
approval write (p04-t06) is removed, because the readers' documented record
no longer has a writer.

**Step 2: Implement** the read paths, and bump `oat-project-next` and
`oat-project-progress`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t07): read both gate records in next and progress`

---

### Task p04-t08: Update the autonomy contract and the docs for the review loop

**Files:**

- Modify: `.agents/docs/autonomy-contract.md` (rows QS-12, IMPLEMENT-12,
  IMPLEMENT-18, REVIEWRECEIVE-02: dispatch the complexity review and include it
  in the boundary report; never self-select a disposition; the "HEAD
  prompt-site coverage" table for every new prompt-like line)
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`,
  `apps/oat-docs/docs/workflows/projects/implementation-execution.md`,
  `apps/oat-docs/docs/workflows/projects/reviews.md`,
  `apps/oat-docs/docs/workflows/projects/autonomy.md`,
  `apps/oat-docs/docs/workflows/projects/lifecycle.md`,
  `apps/oat-docs/docs/cli-utilities/project-log.md`

**Step 1: Implement**

Update the four inventory rows and add every coverage key the drift test
prints. Document the complexity review at budget exhaustion (probe, condensed
fallback, decision message, early trigger), the persisted quick-start
approval, and root judgment logging. Apply any version bumps
`check:skill-bumps` requires for skills that vendor the changed contract.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts src/validation/named-skill-load-contract.test.ts src/validation/skills.test.ts`,
`pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, and
`pnpm format:root`.
Expected: exit 0.

**Step 3: Commit**

`docs(p04-t08): document the review-loop complexity review and gate records`

---

## Phase 5: Completion

### Task p05-t01: Add the `workflow.autonomousComplete` opt-in

**Files:**

- Modify: the same config files as p04-t02 (`oat-config.ts`, `resolve.ts`,
  `commands/config/index.ts`) and their tests
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md` (including the
  cross-repository note for a `--user` opt-in around 842-846) and
  `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Failing test first**

`workflow.autonomousComplete` parses as a boolean, defaults to `false`, and is
accepted by `oat config get`, `set`, and `describe`.

**Step 2: Implement** the key and docs.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config src/commands/config`
Expected: exit 0.

**Step 4: Commit**

`feat(p05-t01): add the workflow.autonomousComplete opt-in`

---

### Task p05-t02: Add the `oat-project-complete-auto` companion skill

**Files:**

- Create: `.agents/skills/oat-project-complete-auto/SKILL.md` (model on
  `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`: model-invocable,
  `user-invocable: false`, no interactive questions; initial
  `metadata.version: 1.0.0`)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (skills list, around 72),
  `packages/cli/src/commands/tools/shared/pack-manifest.ts`
  (`WORKFLOW_SKILL_NAMES`, around 162), `apps/oat-docs/docs/workflows/skills/index.md`,
  `apps/oat-docs/docs/cli-utilities/tool-packs.md` (if it enumerates the pack)
- Modify: `packages/cli/src/validation/named-skill-load-contract.test.ts` rows
  for any new `oat-project-*` execution sentences; the guard pins go in a new
  `packages/cli/src/commands/init/tools/shared/complete-auto-contracts.test.ts`
- Modify (only if the skill has fenced project-artifact `git add` or
  `git commit` lines): `packages/cli/src/validation/synced-bookkeeping-sites.json`
  (`validateOatSkills` requires entries, `skills.ts` around 490-500)
- Generated: `.claude/skills/oat-project-complete-auto` symlink and
  `.oat/sync/manifest.json` entry via `oat sync --scope project` (branch CLI)

**Step 1: Failing pins first**

A contract test pins the three-layer guard: (1) without
`workflow.autonomousComplete: true` the skill stops with "interactive
completion required"; (2) the objective preflight runs
`oat project closeout-check <path> --json --autonomous` and hard-fails on
incomplete tasks, a non-passed final review row, an unmerged PR without a
recorded exception, an incomplete post-implement sequence, unresolved
blockers, or an unsatisfied project-log gate, never assuming an answer; (3)
it runs only when a workflow names it as a step or under an `OAT_AUTONOMOUS`
lifecycle run, refuses self-initiated cleanup, and records the requesting
workflow in its run report and the completion commit body. Batch mode: it
accepts several wave-wrapper projects at program close behind the program-end
operator checkpoint, preflighting each project individually and stopping that
project on any failure.

**Step 2: Implement**

Write the skill so it resolves archive and PR choices from config
(`workflow.archiveOnComplete`, `workflow.createPrOnComplete`) and points to
the interactive skill's steps instead of copying them; `oat-project-complete`
is unchanged. Register the skill in the bundle, the workflows pack, and the
skill catalog; regenerate provider views with the branch CLI
(`node packages/cli/dist/index.js sync --scope project`) and confirm a clean
status afterward. After p03-t01 the branch CLI may restamp unrelated stale
manifest entries; commit that churn with the skill and say so in the commit
body.

**Step 3: Verify**

Run: `pnpm build`, `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/commands/tools src/validation`,
and `pnpm oat:validate-skills`.
Expected: exit 0.

**Step 4: Commit**

`feat(p05-t02): add the oat-project-complete-auto companion skill`

---

### Task p05-t03: Point wave closeout at the companion skill

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (closeout step 8, around
  419-446: remove the interim execute-as-a-document guidance)
- Modify: `.agents/skills/oat-wave-program/SKILL.md` (around 128-129)
- Modify: a contract pin for the repointed step

**Step 1: Failing pin first** (in `complete-auto-contracts.test.ts` from
p05-t02) that wave-execute's autonomous closeout step 8
invokes `oat-project-complete-auto` and no longer offers the as-document path.

**Step 2: Implement** the repoint; bump `oat-wave-execute` and
`oat-wave-program`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`
(`oat-wave-execute` has no `node --test` suite).
Expected: exit 0.

**Step 4: Commit**

`feat(p05-t03): point wave closeout at the companion skill`

---

### Task p05-t04: Tighten the pr-final ledger scan boundary prose

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (the "Ledger-path
  guard" paragraph around 423; optionally the Step 2 wording around 196)
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  and the pr-final version pins in `packages/cli/src/validation/skills.test.ts`

**Step 1: Failing pin first** for the new wording.

**Step 2: Implement**

Say the scan ends at the next level-two heading other than `## Reviews`
itself, and that `###` and level-one headings do not end it. Document that the
escaped-pipe stop stands until a real ledger contains an escaped pipe. Bump
`oat-project-pr-final`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
Expected: exit 0.

**Step 4: Commit**

`docs(p05-t04): tighten the pr-final ledger scan boundary prose`

---

## Phase 6: Small fixes

### Task p06-t01: Downgrade claims that thorough-profile reviews leave undisposed

**Files:**

- Modify: `.agents/skills/recon/scripts/reconcile-ledger.mjs` (around 28-39,
  247-279)
- Modify: `.agents/skills/recon/references/packet-contract.md` (around 396-398)
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs` and
  `.agents/skills/recon/tests/two-source-publication.test.mjs`; recon version
  pins in `.agents/skills/recon/tests/skill-contract.test.mjs` and
  `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/workflows/skills/recon.md` if it states the rule

**Step 1: Failing test first**

With the production helpers, a thorough-profile packet whose
redundant-verification review omits a claim reconciles that claim to
`unresolved`, renders it under Review Downgrades with a reason, and publishes
as `partial` instead of failing with `MISSING_INDEPENDENT_REVIEW`. Cover a
claim outside the redundant review's brief: reconciliation and publication
must agree on it, and the renderer lists a reason.

**Step 2: Implement**

Make reconciliation require a disposition from every review kind publication
requires for the achieved profile (read the rule from `validate-packet.mjs`
around 2085-2228 and share it rather than restating it), and state the rule
for every review kind in `packet-contract.md`. Bump `recon`.

**Step 3: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs` and
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`.
Expected: exit 0.

**Step 4: Commit**

`fix(p06-t01): downgrade claims that thorough-profile reviews leave undisposed`

---

### Task p06-t02: Resolve oat-wrap-up's summary template through the CLI

**Files:**

- Modify: `.agents/skills/oat-wrap-up/SKILL.md` (around 368 and 397) and
  `.agents/skills/oat-wrap-up/references/report-template.md` (around 66)
- Modify: a pin in `packages/cli/src/validation/skills.test.ts`

**Step 1: Failing pin first** that wrap-up resolves the summary template with
`oat template resolve summary` (`--json`, or `--output` for the bundle tier,
whose `path` is null) and no longer names `.oat/templates/summary.md` as a
direct path.

**Step 2: Implement**; bump `oat-wrap-up`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
and `pnpm oat:validate-skills`.
Expected: exit 0.

**Step 4: Commit**

`fix(p06-t02): resolve oat-wrap-up's summary template through the CLI`

---

### Task p06-t03: Route quick plans on the dashboard by readiness

**Files:**

- Modify: `packages/control-plane/src/index.ts` (export
  `evaluateQuickPlanReadiness` from `src/state/quick-plan-readiness.ts`)
- Modify: `packages/cli/src/commands/state/generate.ts` (`computeNextStep`
  around 298; the shared `plan:in_progress` map around 430)
- Modify: `packages/cli/src/commands/state/generate.test.ts` (copy the lite
  routing test style around 318-364)

**Step 1: Failing test first**

A quick-mode project at `plan:in_progress` with a not-ready `plan.md` routes to
`oat-project-quick-start` on the dashboard, and a ready plan routes to
`oat-project-implement`, with the same reason wording as the router. Add a
parity assertion against `recommendSkill` for the same fixture.

**Step 2: Implement** the export and the dashboard branch that reads the
quick plan readiness through it.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane build`,
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`,
and `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`.
Expected: exit 0.

**Step 4: Commit**

`fix(p06-t03): route quick plans on the dashboard by readiness`

---

## Phase 7: Release fan-in

### Task p07-t01: Bump the lockstep public packages to 0.3.14

**Files:**

- Modify: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
  and `packages/cli/assets/public-package-versions.json`, following the file
  set of the 0.3.12 bump
  (`git show --stat 202dd1465` filtered to version files)

**Step 1: Verify**

Run: `git fetch origin main && pnpm release:check-versions` and
`pnpm release:validate`.
Expected: exit 0.

**Step 2: Commit**

`chore(p07-t01): bump lockstep public packages to 0.3.14`

---

### Task p07-t02: Close out the backlog items

**Step 1: Archive completed items with the branch CLI**

Run `oat pjm doctor --json` and confirm `adoption.state` is `declared` before
any PJM write. After `pnpm build`, run `node packages/cli/dist/index.js backlog archive <id>
--summary "<outcome>"` for each item whose in-scope criteria all pass:
`BL-261001-fail-closed-when-bundle-assets`,
`BL-260906-report-errno-for-asset-root`, `BL-260718-harden-full-surface-gate`,
`BL-260927-persist-quick-start-prompt`, `BL-261001-run-a-complexity-review-when`,
`BL-260713-root-agent-judgment-logging`, `BL-260720-add-oat-project-complete-auto`
(strip its `{Outcome}` placeholders first), `BL-260908-tighten-the-pr-final-ledger`,
`BL-261001-downgrade-claims-that-thorough`,
`BL-261001-resolve-the-summary-template`, `BL-261001-route-quick-mode-plan`
(narrow its criteria to the dashboard first, citing the router and skill
tables that already agree). Archive `BL-260908-retire-the-top-level-skill` with `--wont-do` and a
summary saying it is superseded by `BL-260908-remove-the-top-level-skill`.

**Step 2: Rewrite partial items in place**

- `BL-260711-add-activity-aware-gate`: record the shipped idle kill and
  distinct outcomes; keep criteria 4 (early template write, after
  `BL-260729-implement-reviewplan-first`), 8, and 9 open, plus criterion 7's
  live smoke-fixture verification.
- `BL-260909-restamp-a-stale-copy-strategy`: record the shipped parts; keep
  only the bridge and legacy-encoder retirement open.
- Add the Wave 4 complexity-review slice to
  `BL-260818-distinguish-operator-directed`, so its remaining criteria do not
  duplicate shipped behavior.

**Step 3: File the follow-up**

With `node packages/cli/dist/index.js backlog new`, create a backlog item to
wire the complexity review into the sibling
gate-capable skills (`oat-project-plan`, `oat-project-import-plan`,
`oat-project-design`, `oat-project-discover`, `oat-project-lite`), then run
`backlog regenerate-index`.

**Step 4: Commit**

`chore(p07-t02): close out the wave 4 backlog items`

---

### Task p07-t03: Run the full Definition of Done

**Step 1: Run every gate with explicit exit codes**

In CI order, each captured as `pnpm <gate> > <log> 2>&1; echo "exit=$?"`:
`pnpm build` first with the real `HOME`, then `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm build`,
`pnpm run check:skill-bumps`, `pnpm release:check-versions` (after
`git fetch origin main`), `pnpm release:validate`, `pnpm build:docs`; then
`pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, and
`pnpm format`. Confirm the test runs were not cache replays.

**Step 2: Record** each exit code and the head SHA in `implementation.md`.

**Step 3: Commit**

`chore(p07-t03): record wave 4 definition-of-done evidence`

---

## Parallelism

The plan is fully sequential (`oat_plan_parallel_groups: []`).

- p01, p02, and p03 have disjoint source write sets, but p01 changes
  `bundle-assets.sh`, which generates the `packages/cli/assets` bundle that
  every later phase's build and tests consume. Running p02 or p03 in a
  parallel worktree would verify against a bundle produced without p01's
  change, so they share a generated artifact and stay sequential.
- p02 and p04 both edit `apps/oat-docs/docs/cli-utilities/workflow-gates.md`.
- p03 edits `packages/cli/src/validation/skills.ts` and `skills.test.ts`; p04,
  p05, and p06 extend `skills.test.ts` with version pins and change the
  branch's skill-bump state that `check:skill-bumps` evaluates at each phase
  head.
- p04 and p05 both edit the config files (`oat-config.ts`, `resolve.ts`,
  `commands/config/index.ts`) and their tests.
- p06-t03 needs a control-plane build that later CLI test runs consume.
- p07 is the fan-in: the lockstep bump and backlog close-out need every
  earlier phase.

Within p04, tasks edit the same skills in order (implement in t03 and t05,
quick-start in t05 and t06, the autonomy contract last in t08).

---

## Acceptance Mapping

| Item                                       | Criterion                                                                    | Task                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------- |
| `BL-261001-fail-closed-when-bundle-assets` | Clear error on an empty or repository-root lookup, no copy                   | p01-t01                   |
|                                            | Staging never inside a copied source tree                                    | p01-t01                   |
|                                            | Test reproduces the empty lookup and fails closed                            | p01-t01                   |
| `BL-260906-report-errno-for-asset-root`    | Errno reported for non-ENOENT failures, with a failing-if-dropped test       | p01-t02                   |
|                                            | `statRedirects` reset in `afterEach`                                         | p01-t02                   |
| `BL-260718-harden-full-surface-gate`       | Full-surface budget not silently 900 seconds                                 | p02-t01                   |
|                                            | Matching in-flight run rejected, not relaunched                              | p02-t02                   |
|                                            | Tests: precedence, long envelope, nested invocation                          | p02-t01, p02-t02          |
|                                            | Markers and JSON show budget and recursion decision                          | p02-t01, p02-t02          |
| `BL-260711-add-activity-aware-gate`        | Active child not idle-killed; silent child killed in window; hard cap stays  | p02-t03                   |
|                                            | Timeout checks for a recovered artifact (existing `lateCompletion`)          | p02-t03 (asserted)        |
|                                            | Distinct idle, hard-cap, and recovered outcomes; tests                       | p02-t03                   |
|                                            | Early template write, provider preflight, unavailable-target envelope        | open (p07-t02 rewrite)    |
| `BL-260909-restamp-a-stale-copy-strategy`  | Stale hash restamped; second run no-op                                       | p03-t01                   |
|                                            | Legacy obsolete mapping: `remove` when matching, `detach` otherwise          | p03-t01                   |
|                                            | Missing `SKILL.md` reported for every canonical skill directory              | p03-t02                   |
|                                            | Marker-less directory does not loop                                          | p03-t03                   |
|                                            | Bridge and legacy encoder retirement                                         | open (p07-t02 rewrite)    |
| `BL-261001-run-a-complexity-review-when`   | Complexity review at every exhaustion point, pinned per point                | p04-t03, p04-t04, p04-t06 |
|                                            | Decision message content including **simplify**                              | p04-t01, p04-t03-t04      |
|                                            | Choice recorded with report path; never self-selected (autonomy too)         | p04-t01, p04-t08          |
|                                            | Dependency resolved (probe plus condensed fallback); subagent writes nothing | p04-t01                   |
|                                            | Opt-in early trigger                                                         | p04-t02, p04-t03          |
|                                            | Version bumps and docs                                                       | p04-t03-t08               |
| `BL-260927-persist-quick-start-prompt`     | Continuation persists `allowed/prompt_approved` in state                     | p04-t05, p04-t06          |
|                                            | Decline or deferral persists nothing that reads as approval                  | p04-t05, p04-t06          |
|                                            | Next and progress read and report it; readiness predicate unchanged; pin     | p04-t06, p04-t07          |
|                                            | Version bump; shape defined once                                             | p04-t05, p04-t06          |
| `BL-260713-root-agent-judgment-logging`    | Root guidance logs judgment entries, including relayed observations          | p04-t03                   |
|                                            | Subagents have no logging duties                                             | p04-t03                   |
|                                            | Trigger stated; format deferred to `--help`; no-op preserved                 | p04-t03                   |
| `BL-260720-add-oat-project-complete-auto`  | Three-layer guard                                                            | p05-t01, p05-t02          |
|                                            | Interactive skill unchanged                                                  | p05-t02                   |
|                                            | Wave-execute step 8 repointed                                                | p05-t03                   |
|                                            | Batch mode with per-project preflight                                        | p05-t02                   |
| `BL-260908-tighten-the-pr-final-ledger`    | Scan-boundary prose; escaped-pipe stop documented                            | p05-t04                   |
| `BL-261001-downgrade-claims-that-thorough` | Missing disposition from any required kind keeps the claim `unresolved`      | p06-t01                   |
|                                            | Reconciliation and publication agree; production-helper test; contract text  | p06-t01                   |
| `BL-261001-resolve-the-summary-template`   | Wrap-up resolves through `oat template resolve`; bump                        | p06-t02                   |
| `BL-261001-route-quick-mode-plan`          | Router, dashboard, and skill tables agree; readiness stated once             | p06-t03                   |
|                                            | Router and dashboard tests pin the route                                     | p06-t03                   |
| `BL-260908-retire-the-top-level-skill`     | Closed as superseded                                                         | p07-t02                   |

---

## PR Requirements

- Title: `feat: gate budgets and idle kill, complexity review at review caps, autonomous completion skill (wave 4, lockstep 0.3.14)`.
- The body opens with a **Behavior changes** callout:
  - artifact gate reviews default to 30 minutes (was 15);
  - a second gate for the same project, review type, and scope is rejected
    while one is running;
  - a gate child with no output or project-directory activity for 10 minutes
    is stopped, reported as an idle kill;
  - `bundle-assets.sh` and `bundle-inputs.mjs` fail on empty, absolute, or
    escaping inventory paths;
  - `oat sync` restamps stale copy hashes and reports a marker-less skill or
    agent directory as an error instead of rewriting it on every run;
    `oat:validate-skills` reports a missing `SKILL.md` in any skill directory;
  - lifecycle skills run a complexity review when a review or gate budget is
    exhausted and offer **simplify**; quick-start persists its gate outcome as
    `oat_quick_start_gate`;
  - new `workflow.autonomousComplete` and
    `workflow.complexityReviewEarlyTrigger` config keys (both default off) and
    the `oat-project-complete-auto` skill;
  - Codex gate runs keep the hard cap only (no idle kill), because Codex
    activity evidence cannot be attributed to the gate child;
  - the updated skills need `oat` 0.3.14 or later for the new config keys.
- After the behavior callout, a shipped summary: one plain-language problem
  statement per closed backlog item, plus the two partial items and what
  stays open.
- Verification evidence: Definition of Done exit codes and the review and gate
  outcomes.

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| p05    | code     | pending | -    | -        | -             | -          | -           |
| p06    | code     | pending | -    | -        | -             | -          | -           |
| p07    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Build assets
- Phase 2: 3 tasks - Gate timeouts
- Phase 3: 3 tasks - Sync correctness
- Phase 4: 8 tasks - Review-loop skills
- Phase 5: 4 tasks - Completion
- Phase 6: 3 tasks - Small fixes
- Phase 7: 3 tasks - Release fan-in

**Total: 26 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Approved batch (machine-local): `.oat/repo/analysis/backlog-wave-4/approved-batch.md`
- Backlog items listed in the Acceptance Mapping
- Follow-up filed this wave: `BL-261002-port-the-complexity-review`
