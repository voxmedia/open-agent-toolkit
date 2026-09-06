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

## End-of-run synthesis (pending — do not skip at project completion)

At project completion, BEFORE any archive step, the orchestrator writes:
(1) verdicts on the conventions this wave exercised, with evidence entries cited;
(2) a ruling on every "Skill signal"-tagged entry — what the `oat-wave-execute`
skill should change; (3) adjustments adopted for later waves, stated as rules;
(4) a graduated-entries ledger (backlog IDs / upstream refs / closed-with-evidence
/ open-with-owner).

Roll-up ordering (critical): `summary.md` `## Workflow Observations` and any
repo-level ledger updates happen BEFORE `oat-project-complete` archives this file.
