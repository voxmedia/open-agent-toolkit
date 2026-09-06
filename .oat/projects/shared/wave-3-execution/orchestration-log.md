---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-06
---

# Orchestration Log: wave-3-execution

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

### 2026-09-06 · structural · oat-wave-execute · preflight

`wave-3-execution` created from `origin/main`
`e97954dd1e85287a41a59fe58730c606e00eb598` (W2 merged as PR #267 `ca71c00a0`,
wave-close PR #268). `pnpm install --frozen-lockfile`, `pnpm build`, and
`pnpm type-check` exit 0. `oat --version` 0.2.55 against branch 0.2.57 (lanes
use `pnpm run cli --`). `ListAgents` showed no other busy session on this
worktree. Remote name will be `origin/wave-3-execution-2026-09`.

---

### 2026-09-06 · structural · oat gate review · plan

Plan gate run `6a82672b-4cfd-49ab-ad23-b8853c33cadf` (`codex-5-6-sol-xhigh`) blocked: 0C / 3I / 1M —
the wrapper goal and discovery still carried wave-2 wording, three drift notes
used operative wording that constrained lanes beyond the pointer-only boundary,
and implementation.md was the raw template. All resolved in-artifact; the
orchestrator's first fix script died on an f-string brace and left a partial
commit (`3a3a9ec29`: ledger row + unarchived artifact), repaired in the next
commit. **Skill signal (strengthens):** template the wrapper from the program
section, not from the previous wave's artifacts; a copied wrapper carries the
previous wave's load-bearing scope statements.

---

### 2026-09-06 · project · friction · probe-restore guidance

The p01 implementer followed the brief's "restore probe edits with
`git checkout -- <file>`" while the file's own change was still uncommitted, and
lost the edit mid-proof (detected via a missing anchor, re-applied, re-verified).
Briefs for p03 and the reviewer template now say: back the file up into a
`mktemp -d` directory before mutating and restore with `cp`; `git checkout --`
only for already-committed content. **Skill signal (contradicts):** the
wave-skill's probe-restore guidance must distinguish committed from
uncommitted targets.

### 2026-09-06 · project · feedback · agent version guard

`pnpm run check:skill-bumps` covers `.agents/skills/*/SKILL.md` only; an edit to
`.agents/agents/oat-phase-implementer.md` without a bump passes the CI gate and
is caught only by the three explicit pins in `skills.test.ts`. Follow-up
candidate: extend the bump gate to canonical agent files.

---

### 2026-09-06 · project · review · p02 deletion-safety review

The program's dedicated ownership/deletion-safety review found the deletion
surface unchanged and every adversarial probe refusing correctly, but caught
the lane's "documented residual" as unsubstantiated: the code comment claimed
Git closes the probe→`worktree add -b` window, and a probe deleted a foreign
branch created in that window at the exact reserved baseline. **Skill signal
(strengthens):** when a lane labels something a "documented residual", the
reviewer brief must ask for the exact documentation location and a probe of
the residual itself. The reviewer also reported that its own mechanical recon
lane returned a false base-vs-head delta; it re-ran the search itself.
**Skill signal (gap):** reviewer-dispatched mechanical lanes need the same
"verify load-bearing claims" rule the root applies to reviewers.

---

### 2026-09-06 · project · fan-in · group 1 (p01, p02)

Merges `388dd1c96` and `034486193`; lockstep 0.2.57 → 0.2.58 with the
`.oat/sync/manifest.json` restamp in the same bump commit (`eb767b3ed`, the rule
adopted after wave 2); all eight gates exit 0 with `Cached: 0` on the forced
test run. Every rebased commit is patch-identical to its reviewed lane commit.
Nothing to flip: p03's plan was already READY. Group-1 worktrees and branches
removed.

---

### 2026-09-06 · general · bug · oat sync --scope all writes user scope

The p03 lane's `pnpm run cli -- sync --scope all` (the wrapper contract's own
instruction) rewrote user-scope provider role files under `~/.cursor/agents`
and `~/.codex/agents` and restamped `~/.oat/sync/manifest.json` from 0.2.61
down to 0.2.58 with a version-skew warning — a write outside the repository
by a lane that is supposed to be worktree-contained. The user manifest is back
at 0.2.61 (another session restamped it). **Skill signal (contradicts):** the
wrapper contract and lane briefs must say `sync --scope project`; `--scope
all` belongs to the operator. Adopted for the remaining wave-3 work and the
wave-4 briefs.

---

### 2026-09-06 · project · fan-in · group 2 (p03)

p03 merged (`0a460472d`) after a clean review and an address-now sweep;
lockstep retained at 0.2.58; all eight gates exit 0 with a forced test run
(`Cached: 0`). All three wave-3 lanes are on the integration branch. Closeout
begins.

---

### 2026-09-06 · structural · oat gate review · final (exit gate, attempt 1)

Exit gate run `872d498a` (`codex-5-6-sol-xhigh`) blocked with two Important
findings: the `phase-execution.md:608` acceptance clause that p01 reported and
the root reviewer had routed to wave close (the gate requires the alignment
now, with an `oat-project-implement` bump), and wrapper records that still
said `sync --scope all` in discovery and read as if the source-plan correction
had been applied. **Skill signal (strengthens):** a lane-reported cross-owner
contradiction inside the same wave's integration diff is a fix, not a
deferral — the exit gate reviews the whole tree and will block on it.
**Skill signal (gap):** closeout records must describe pending corrections as
pending with a durable tracker, never as applied.

---

### 2026-09-06 · general · bug · host killed the exit-gate run

Exit-gate attempt 2 (run `226f2a4e`) was killed by the host for memory
pressure after 4 minutes, leaving a run marker but no receipt or artifact; a
wedged `node ""` probe from a wave-2 reviewer (inherited stdin) had also just
been reclaimed. Recorded as a failed launch (not an attempt) and relaunched.
**Skill signal (gap):** the gate state machine needs an explicit
`not_accepted`/killed transition that relaunches without consuming
`max_attempts`.

---

## End-of-run synthesis (2026-09-06)

**Convention verdicts (evidence: entries above and `implementation.md` Run 1):**

1. Wave→project wrapper with pointer-only tasks: held, after the plan gate caught the wrapper carrying the previous wave's load-bearing scope statements (goal, constraints, out-of-scope) and three drift notes written in operative rather than descriptive voice. Both were in-artifact fixes; no lane narrowed its plan, and p01 reported two out-of-lane concerns instead of improvising them.
2. Wave-boundary drift refresh plus per-lane pre-declaration: held. All three drift checks matched the pre-declaration; the recon's coverage audit correctly predicted the one file (`skills.test.ts`) p01 had to write outside its plan's stated surface.
3. Lane mode vs fan-in mode verification: held, with the wave-2 rule applied — the group-1 bump commit carried the sync-manifest restamp, so no lane sync commit survived a rebase.
4. Root-owned reviews with adversarial probes: held and load-bearing. Fix rounds: p01 one, p02 one, p03 an address-now sweep. No Critical this wave; the reviewers found five Important findings (p01 two, p02 one, p03 none, plus two the p01 reviewer's own probes surfaced after the Codex rounds had passed), and every round-2 disposition-verification passed. The dedicated deletion-safety review for the smoke lane ran sixteen adversarial probes and caught an undocumented residual the lane had labelled "documented".
5. Cross-model in-lane review (Codex, two-round cap): held. Every lane's Codex rounds found real defects pre-commit (an internal contradiction in p01's boundary prose, a claimable pre-existing branch in p02, a false runtime example in p03); the cap forced p03 to prove its post-round-2 fixes locally, which the root reviewer then re-verified in a harness.
6. Group composition from mechanical write-surface intersection: held. Group 1 was write-disjoint; the one cross-group seam (`skills.test.ts`) merged conflict-free in sequence.

**Skill-signal rulings:**

- Contradicts — `oat sync --scope all` in lane briefs and plan steps rewrites the operator's user-scope provider views and restamps `~/.oat/sync/manifest.json` to the invoking version. Rule: lanes and fan-in scripts sync `--scope project`; `--scope all` is operator-only.
- Contradicts — "restore probe edits with `git checkout -- <file>`" destroys uncommitted work; rule: `mktemp -d` backups restored with `cp`, `git checkout --` only for committed content.
- Strengthens — template the wrapper from the program section, never from the previous wave's artifacts (plan-gate finding class).
- Strengthens — reviewer briefs must ask for the exact documentation location and a probe of any "documented residual"; and must tell reviewer-dispatched mechanical lanes to verify load-bearing claims (the p02 reviewer caught a false base-vs-head delta from its own recon lane).
- Gap — `check:skill-bumps` ignores `.agents/agents/*.md`; the agent version is guarded only by explicit pins (follow-up item filed).
- Gap — `scripts/worktree/init.test.mjs` runs under no gate (follow-up item filed).

**Adjustments adopted as rules for later waves:**

1. Lane briefs, reviewer briefs, fan-in gate scripts, and plan steps: `pnpm run cli -- sync --scope project` only.
2. Probe hygiene in every brief: `mktemp -d` backup + `cp` restore; `git checkout --` only for already-committed content.
3. Wrapper scaffolding: author from the program's wave section and the template assets; grep the finished wrapper for the previous wave's identifiers before the plan gate.
4. Reviewer briefs: "documented residual" claims require location + probe; reviewer recon lanes carry the verify-load-bearing-claims rule.

**Graduated-entries ledger:** follow-up backlog items filed at closeout (see `implementation.md` Deferred Findings); plan corrections applied at the wave-close program refresh; skill-signal rulings above are the `oat-wave-execute` change list.
