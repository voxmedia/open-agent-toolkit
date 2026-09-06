---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-05
---

# Orchestration Log: wave-1-execution

Running log of orchestration and subagent observations for this project. Two
audiences: (1) evaluating this wave's execution specifically, and (2) collecting
general feedback on OAT orchestration/tooling and on the `oat-wave-execute` skill
itself — bugs, friction, and things that worked well.

**Logging contract (for the orchestrator and any lifecycle skill touching this
project):** append an entry whenever something breaks, surprises, requires a
workaround, or works notably well. Structural entries (dispatch stamps, gate
results, STOP/park events, bootstrap statuses, disposition maps) are appended as
one-liners referencing artifacts by path; judgment entries are agent-authored.
Never delete entries; strike through with a correction note if one turns out
wrong. Version-stamp tool-related observations. Keep entries short and factual.
Run `pnpm format:fix` on this file after writing. Tag entries that bear on the
wave-skill's design with a **Skill signal (strengthens/contradicts/gap):** line —
those drive the upstream implementation.

**Entry format:**

    ### YYYY-MM-DD · [project | general] · [bug | friction | worked-well | feedback] · <area>
    What happened (1-3 sentences). Impact/workaround. Follow-up (backlog / upstream / none).

**Structural entry format (skill-appended):**

    ### YYYY-MM-DD · structural · <skill> · <scope>
    One-line mirror of the skill's structured output. Reference artifacts by path.

---

## Entries

### 2026-09-05 · structural · oat-wave-execute · preflight

`wave-1-execution` created from `origin/main` `a1fd7cd41031719c4db85276fceee402f6045e9c`
(the local `main` name is held by the primary checkout, so the branch was cut
directly from the remote ref). `pnpm install --frozen-lockfile`, `pnpm build`
(no cache hits), and `pnpm type-check` exit 0. `oat --version` 0.2.55; no
repo-local `node_modules/.bin/oat`.

### 2026-09-05 · project · friction · scaffold

`oat project new wave-1-execution --mode quick --no-commit` succeeded even though
`.oat/projects/archived/wave-1-execution` (the 2026-08 program's wave 1) exists:
the collision check covers shared, local, and synced scopes only. A second
untracked scaffold directory, `wave-1-execution-260831`, appeared 16 seconds
earlier with an identical template body and was removed before the scaffold
commit; its origin was not identified (the only other process with shell access
was the read-only recon agent). Follow-up: none unless it recurs.
**Skill signal (gap):** the skill's fixed `wave-N-execution` slug collides with
archived wrappers from an earlier program in the same repository; the remote
branch `origin/wave-1-execution` from that program also still exists, so this
wave pushes to `origin/wave-1-execution-2026-09` (rule-1 deviation, local name
unchanged).

### 2026-09-05 · project · friction · duplicate orchestrator (correction to the scaffold entry)

The `wave-1-execution-260831` directory came from a second interactive session
(`repo-improve-wave-87`, the pre-restart instance of this conversation) that had
started wave 1 on the same worktree, renamed the branch, and scaffolded under a
program-qualified slug. It stopped all writes, restored the branch name at
`a1fd7cd41`, and handed the tree to this session; its independent recon agreed
with this wave's drift record. Rule: one orchestrator per worktree — confirm
`ListAgents` shows no busy peer on the same path before scaffolding.
**Skill signal (gap):** the skill has no "claim the tree" step; a session
restart can leave the prior instance running.

### 2026-09-05 · project · feedback · correction (plan-gate m1)

Correction note for the duplicate-orchestrator entry above: the restored
branch base is `a1fd7cd41031719c4db85276fceee402f6045e9c` (full SHA per
standing rule 5).

### 2026-09-05 · structural · oat gate review · plan

Plan gate run `ace386d5-d88b-43e4-bccc-3fd12f3cc7ad` (target
`codex-5-6-sol-xhigh`, cross-family vs the Claude root) returned blocked:
0 Critical / 1 Important / 1 Medium / 1 Minor. All three resolved in-artifact
(Dispatch Profile made runtime-neutral; PR #190 count corrected to 217 files
with six write-surface overlaps; full-SHA correction note). Artifact:
`reviews/archived/artifact-plan-review-2026-09-05T224504Z.md`; verification
records in `implementation.md` under "Review Received: plan".

### 2026-09-05 · structural · oat-reviewer · p01

Root review `reviews/archived/p01-review-2026-09-05T235808Z.md` (opus, reconnaissance
attempted): 0C / 2I / 2M / 5m; weaker-anywhere analysis clean; thirteen
real-filesystem probes. Bounded fix round dispatched through the original
implementer handle (`w1-p01-impl-001`, continuation `w1-p01-fix-001`): I1
pinning test plus non-narrowing plan reconciliation (recorded in the Drift
Refresh Record), I2 falsifiable MkDocs test, M1 refusal exit codes to 1, M2
real-fs symlink case, m2–m4; m1 deferred (outside the lane surface), m5 no
action.

### 2026-09-05 · project · friction · reviewer artifact contract

The p02 reviewer put the `**Reconnaissance:**` signal in its chat reply but not
in the artifact; recovered through the accepted handle. The p01 reviewer brief
was amended to say the line is validated in the file. **Skill signal (gap):**
reviewer briefs should state where the signal must appear.

### 2026-09-05 · project · friction · dispatch journal

`oat project dispatch record` rejects a revision that changes `child_outcome`
("Existing generic fields are immutable"), so a record written at acceptance
cannot later carry the terminal outcome; outcomes live in `implementation.md`.
**Skill signal (contradicts):** the lineage contract says record immediately
after acceptance, but the journal cannot then be closed out.

### 2026-09-06 · structural · oat-wave-execute · group 1 fan-in

Merged p01 (`88ca7f9b1`) and p02 (`d9366de0f`) with `--no-ff` in plan order after rebase; lockstep bump 0.2.55 → 0.2.56 at `87c10a816a77d347e75a44c71c3d7a08cfdbe589`; all eight DoD gates exit 0 with an uncached test run; group-2 readiness checks passed. Worked well: the pre-declared cumulative churn made both lanes' drift checks trivial; the rebase dropped p02's duplicate sync commit automatically.

### 2026-09-06 · structural · oat-wave-execute · group 2 fan-in

Merged p03 (`9561caf19`) and p04 (`a6410ad0c`) with `--no-ff` in plan order after rebase; lockstep retained at 0.2.56; all eight DoD gates exit 0 with an uncached test run at `a6410ad0c4090ce061486c3ccad08a27d4c19c15`. Worked well: the readiness-check flip rule (adopted after the p03 review) and the address-now sweep on p04 kept the group inside one fan-in.

### 2026-09-06 · structural · oat-reviewer · p03 and p04

p03 `reviews/archived/p03-review-2026-09-06T004322Z.md`: 0C/1I/1M/3m (Important = wrapper READY flip, fixed by root bookkeeping `cbaee759a`); p04 `reviews/archived/p04-review-2026-09-06T011441Z.md`: 0C/0I/1M/4m (Medium + one Minor addressed in sweep `915c2a63f`; rest deferred). **Skill signal (strengthens):** reviewers' independent oracles (3.8M-case glob oracle, 24-probe asset harness) found no defects the lanes' own negative controls had missed, but they turned every P0 claim into reproducible evidence.

### 2026-09-05 · project · friction · session

The orchestrator session restarted during the drift-refresh recon dispatch; the
recon agent was resumed from its transcript rather than relaunched.

---

## End-of-run synthesis (2026-09-06)

**Convention verdicts (evidence: entries above and `implementation.md` Run 1):**

1. Wave→project wrapper with pointer-only tasks: held. Four lanes executed their immutable plans with zero narrowing; the one plan-internal contradiction (docs-index config-write clause) was resolved by a recorded non-narrowing reconciliation, not a plan edit.
2. Wave-boundary drift refresh plus per-lane cumulative-churn pre-declaration: held. All four drift checks were trivial matches; zero false STOPs.
3. Lane mode vs fan-in mode verification: held. No lane touched a lockstep release file; one bump (0.2.55 → 0.2.56) at the group-1 fan-in was retained through group 2 and re-checked above fresh main; both full DoD sequences green with uncached tests.
4. Root-owned reviews with adversarial probes: held and load-bearing. Reviewers found two Important findings on p01 (a self-contradictory plan clause and a non-falsifiable P0 test), one process Important on p03 (the wrapper's own READY flip), and produced independent oracle/probe evidence on every lane; every fix landed append-only with a disposition-verification round where required.
5. Cross-model in-lane review (Codex, read-only): held. p01's four rounds caught real containment and symlink defects before commit; p02/p03 clean; p04 caught a ReDoS and a circular golden.
6. Group composition from mechanical write-surface intersection: held. No merge conflicts; the rebase step dropped duplicate sync commits automatically.

**Skill-signal rulings:**

- Gap — slug/branch collision with an earlier program's archived wrapper: the skill should qualify the wrapper slug or branch by program, or check `.oat/projects/archived/` and remote branches in preflight. Adopted for later waves: keep local `wave-N-execution`, push to `origin/wave-N-execution-2026-09`, and defer the archive-name collision to the program-close tail.
- Gap — no "claim the tree" step: a session restart left a prior orchestrator active on the same worktree. Adopted: `ListAgents` check for a busy peer on the same path before scaffolding.
- Gap — reviewer briefs must say the reconnaissance signal is validated in the artifact file. Adopted in the brief template from p01 onward.
- Contradicts — dispatch journal records are immutable after the first revision, so `child_outcome` cannot be closed out; outcomes live in `implementation.md`. Upstream candidate: allow an outcome revision or a terminal event kind.
- Strengthens — bootstrap-group.sh's sync commit is a benign manifest restamp (oatVersion advance) and merges cleanly; inspecting it before dispatch is cheap and should stay.

**Adjustments adopted as rules for later waves:**

1. Run each successor plan's readiness check on the merged tip and flip its frontmatter to READY in the fan-in bookkeeping commit, citing the evidence (the program's group gate requires the flip; p03's reviewer caught the omission).
2. Address-now sweeps for Medium/Minor findings go through the original implementer handle without a re-review; anything Important gets a disposition-verification round on the original reviewer handle.
3. Record lane-commit SHA mappings at every rebase in the fan-in entry, because the Reviews table's reviewed heads are pre-rebase.
4. File the follow-up ledger as backlog items on the wave branch before the final gate so the PR carries them.

**Graduated-entries ledger:** follow-up backlog items filed at closeout (see `implementation.md` Deferred Findings); plan corrections queued for the wave-close program refresh; upstream skill signals above are open-with-owner (program close).
