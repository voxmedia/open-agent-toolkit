# Mini-Wave Agent Dry Run

This fixture is an agent-executed smoke test of the promoted
`oat-wave-program` and `oat-wave-execute` skills. It validates mechanical
choreography, not review quality. Run every command with macOS system
`/bin/bash` where a shell is named.

Set `TOOLKIT_ROOT` to the toolkit checkout containing this README. All other
commands run in the materialized fixture unless a step says otherwise.

## 1. Materialize the fixture

```bash
cd "$TOOLKIT_ROOT"
FIXTURE_REPO="$(
  /bin/bash \
    .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh
)"
cd "$FIXTURE_REPO"
git branch -M main
git status --short
```

Pass criteria:

- the setup command prints one path under `${TMPDIR:-/tmp}/mini-wave-*`;
- the path is a clean Git repository on `main`; and
- the initial commit contains three indexed plan files, the plan index, and
  executable `scripts/dod-gate.sh`.

## 2. Apply `oat-wave-program new`

Read the promoted `.agents/skills/oat-wave-program/SKILL.md` and its execution
program template from `TOOLKIT_ROOT`. Apply its `new` process to the fixture
index. Create
`.oat/repo/reference/external-plans/2026-07-18-execution-program.md` with:

- exactly one row for each of `mini-p01-alpha-plan.md`,
  `mini-p02-beta-plan.md`, and `mini-p03-finale-plan.md`;
- `wave-1` for all three rows and `pending` status;
- one wave section declaring p01+p02 a write-disjoint two-lane group and p03
  an ungrouped solo finale; and
- a status-ledger row for `wave-1` in `composed` state.

Verify coverage mechanically before committing:

```bash
INDEX_COUNT="$(grep -c '^| \[p0[123]' \
  .oat/repo/reference/external-plans/mini-plan-index.md)"
PROGRAM_COUNT="$(grep -c '^| mini-p0[123]' \
  .oat/repo/reference/external-plans/2026-07-18-execution-program.md)"
test "$INDEX_COUNT" -eq 3
test "$PROGRAM_COUNT" -eq "$INDEX_COUNT"
git add .oat/repo/reference/external-plans/2026-07-18-execution-program.md
git commit -m "docs(pjm): add mini-wave execution program"
```

Pass criteria: three indexed plans map to three unique program rows, no plan is
silent, and the program commit leaves a clean tree.

## 3. Compose the wave wrapper

Create `wave-1-execution` from current `main`. Apply the promoted
`oat-wave-execute` scaffold process mechanically:

1. Create `.oat/projects/shared/mini-wave-execution/` with minimal `state.md`,
   `discovery.md`, `plan.md`, `implementation.md`, and
   `orchestration-log.md`.
2. In `plan.md`, point p01, p02, and p03 at their immutable external plans.
   Declare only p01+p02 in one parallel group; leave p03 ungrouped and ordered
   after the group.
3. Add `briefs/p01.md`, `briefs/p02.md`, and `briefs/p03.md`. Each brief must
   name its external-plan pointer, complete write surface, expected cumulative
   churn, fixture environment commands, DoD gate, one-commit-per-task rule,
   and the boundary that lane workers never edit wrapper project files.
4. Record the drift refresh as PASS for all plans, including the complete
   pairwise write-surface intersection.
5. Mark the program rows `in-wave` and ledger `in-progress` with a pointer to
   the wrapper project.

Format authored Markdown, commit the program + wrapper scaffold, and record:

```bash
git checkout -b wave-1-execution
git add .oat/projects/shared/mini-wave-execution \
  .oat/repo/reference/external-plans/2026-07-18-execution-program.md
git commit -m "docs(wave-1): compose mini-wave wrapper"
BASE_SHA="$(git rev-parse HEAD)"
test "$(printf '%s' "$BASE_SHA" | wc -c | tr -d ' ')" -eq 40
```

Pass criteria: the wrapper has three pointer-only phases, the only group has
two write-disjoint lanes, p03 is ungrouped, the three briefs are complete, and
the recorded base is a full SHA.

## 4. Execute the happy path

### Bootstrap p01+p02

From the clean fixture root on `wave-1-execution`, run the promoted script:

```bash
/bin/bash \
  "$TOOLKIT_ROOT/.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh" \
  wave-1 "$BASE_SHA" p01 p02 | tee "$FIXTURE_REPO/bootstrap-status.log"
grep -q '^STATUS view-parity=ok$' "$FIXTURE_REPO/bootstrap-status.log"
grep -q '^STATUS p01: status=success ' "$FIXTURE_REPO/bootstrap-status.log"
grep -q '^STATUS p02: status=success ' "$FIXTURE_REPO/bootstrap-status.log"
rm "$FIXTURE_REPO/bootstrap-status.log"
git status --short
```

Inspect each phase branch's optional `chore: run sync` commit before dispatch.
If present, it may contain only `.oat/sync/manifest.json` and provider-managed
paths; any deletion or unrelated path is a STOP.

Pass criteria: system bash runs the script, view parity is `ok`, both phase
STATUS lines report the expected branch/base and `git_clean=pass`, any sync
commit is scoped, and removing the captured log restores a clean root.

### Implement, verify, and merge p01+p02

In each generated worktree, follow its brief and external plan in task order.
Create one commit per task, run `/bin/bash scripts/dod-gate.sh` plus the
plan-specific grep after each task, and confirm only that lane's declared
source file changed.

Merge in plan order. Before **every** merge, run and assert both checks:

```bash
cd "$FIXTURE_REPO"
test "$(pwd -P)" = "$(cd "$FIXTURE_REPO" && pwd -P)"
test "$(git branch --show-current)" = "wave-1-execution"
git merge --no-ff wave-1/p01 \
  -m "chore(p01): merge wave-1/p01 - alpha lane (review passed)"
```

Before merging p02, rebase `wave-1/p02` onto the updated integration tip from
its worktree, rerun its verification, then repeat the two assertions and merge
with conventional scope `p02`.

After the two-lane fan-in:

```bash
/bin/bash scripts/dod-gate.sh
grep -q '^alpha-check: passed$' src/alpha.txt
grep -q '^beta-check: passed$' src/beta.txt
```

Pass criteria: each lane has two verified task commits, both merges are
`--no-ff` commits made from the intended root/branch, and the mandatory fan-in
gate passes.

### Run and merge ungrouped p03

Create `wave-1/p03` from the current integration tip in its own worktree. Apply
the p03 brief in two verified task commits. Do not create a singleton parallel
group. Repeat the root-path and integration-branch assertions immediately
before the `--no-ff` p03 merge, then run:

```bash
/bin/bash scripts/dod-gate.sh
grep -q '^fan-in-check: passed$' src/finale.txt
```

Remove all three worktrees and delete the merged phase branches.

Pass criteria: p03 starts after the p01+p02 fan-in, remains ungrouped, merges
from the asserted integration root/branch, the final happy-path gate passes,
and the integration root is clean.

## 5. Execute the unhappy leg

Force the integration gate to fail without changing source:

```bash
set +e
FIXTURE_GATE_FAIL=1 /bin/bash scripts/dod-gate.sh
GATE_STATUS=$?
set -e
test "$GATE_STATUS" -eq 1
```

In the wrapper `implementation.md`, append a fix-loop record that:

- records the failed command and exit status;
- marks closeout parked while the gate is red;
- identifies the disposition as clearing the fixture-only failure injection,
  not a source fix; and
- stores a minimal verification record with what was verified, the exact
  rerun command, its passing result, and the artifact location.

Clear the injected environment variable, rerun `/bin/bash scripts/dod-gate.sh`,
mark the fix disposition verified and closeout unparked, format the record, and
commit only the bookkeeping artifact.

Pass criteria: the forced gate fails, no merge/close occurs while parked, the
stored verification record is complete, the rerun passes, and the wrapper
record returns to an unparked state in a clean commit.

## 6. Apply `wave-close`

Apply the promoted `oat-wave-program wave-close wave-1` process:

1. Flip all three plan rows from `in-wave` to `done`.
2. Flip the ledger row to `merged`.
3. Record `fixture://mini-wave` as the PR reference, the integration merge tip
   SHA, and the wrapper `implementation.md` as the completion-record link.
4. Re-run the three-index-row ↔ three-program-row coverage check from step 2,
   format, and commit the program artifact.

Pass criteria: coverage remains 3 ↔ 3, every plan row is `done`, the ledger has
the PR/SHA/completion provenance, and the final fixture tree is clean.
