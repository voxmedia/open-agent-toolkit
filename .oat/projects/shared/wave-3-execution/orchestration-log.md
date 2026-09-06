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

## End-of-run synthesis (pending — do not skip at project completion)

At project completion, BEFORE any archive step, the orchestrator writes:
(1) verdicts on the conventions this wave exercised, with evidence entries cited;
(2) a ruling on every "Skill signal"-tagged entry — what the `oat-wave-execute`
skill should change; (3) adjustments adopted for later waves, stated as rules;
(4) a graduated-entries ledger (backlog IDs / upstream refs / closed-with-evidence
/ open-with-owner).

Roll-up ordering (critical): `summary.md` `## Workflow Observations` and any
repo-level ledger updates happen BEFORE `oat-project-complete` archives this file.
