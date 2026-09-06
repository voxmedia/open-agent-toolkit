---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-06
---

# Orchestration Log: wave-2-execution

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

`wave-2-execution` created from `origin/main`
`90883f9bcfb0bc52a2fd58571542d194f71ee585` (W1 merged as PR #262 `6db0457c0`,
wave-close PR #263). `pnpm install --frozen-lockfile`, `pnpm build`, and
`pnpm type-check` exit 0. `oat --version` 0.2.55 against branch 0.2.56 (the
global CLI now trails the branch by one lockstep bump; lanes use
`pnpm run cli --` for branch behavior). `ListAgents` showed no other busy
session on this worktree. Remote name will be `origin/wave-2-execution-2026-09`
(rule-1 deviation carried from W1).

### 2026-09-06 · structural · oat gate review · plan

Plan gate run `54c02cde-f2f7-4e21-a798-ea4a12b49b09` (`codex-5-6-sol-xhigh`)
blocked: 0C / 1I / 0M / 1m — the p01 task text restated the source plan's
commit and review granularity, and oxfmt had turned a line-initial `+ \`p04\``into
a list item. Both resolved in-artifact; a fix script aborted before writing
once, so`f631d1cd6`carries only the archive move and`70250093` the fixes.
**Skill signal (strengthens):** wrapper tasks must stay pointer-only even when
the source plan has unusual commit boundaries.

### 2026-09-06 · project · friction · lane briefs

The p01 implementer found a stale `/tmp/p01-codex-review.md` from the wave-1
p01 lane and would have read it as its own review had it not checked the
mtime. Brief template changed to wave-prefixed `/tmp/wave-2-<phase>-*` names
for the remaining lanes. **Skill signal (gap):** brief templates should scope
scratch paths by wave.

### 2026-09-06 · project · friction · check:skill-bumps timing

`pnpm run check:skill-bumps` compares committed state against `origin/main`,
so before the task commit it reports "nothing to validate"; it is evidence
only after the commits exist. Lanes should run it post-commit (they do) and
not cite the pre-commit run.

### 2026-09-06 · project · feedback · in-phase reset disclosure

The p01 implementer reset to the phase base and re-created its four commits
after discovering a revertibility problem during self-review, before anything
was reported. Accepted: nothing reported, pushed, or ledgered depended on the
discarded SHAs; the standing no-reset rule protects reported history. Recorded
for the reviewer's confirmation.

---

### 2026-09-06 · project · review · p01 round 2

The p01 disposition-verification round (same reviewer handle, narrowed to the
one fix commit) passed: every round-1 probe that had bypassed a guard now
fails against the rebuilt guard, and the fix embeds the reviewer's own probe
string as a permanent inline negative control. Two brief defects surfaced:
the review brief named a non-existent package filter (`@voxmedia/oat-cli`;
the CLI package is `@open-agent-toolkit/cli`), and plain `pnpm check` /
`pnpm type-check` in the lane worktree were full Turborepo replays, so the
reviewer re-ran them with `HOME=$(mktemp -d) pnpm exec turbo run <gate> --force`.
**Skill signal (gap):** lane briefs should give the forced-turbo form for every
gate they cite as evidence, not only for `test`, and name the real package
filter.

---

### 2026-09-06 · project · fan-in · group 1 (p01)

Merge `80491b10c`, lockstep bump 0.2.56 → 0.2.57, all eight gates exit 0 with
`Cached: 0 cached, 10 total` on the forced test run (~9 minutes end to end).
The lane's `git merge-base` was already the integration tip, so the rebase was
a no-op and the five lane commits re-hashed only through the merge. Nothing to
flip: every group-2 plan was already READY. p01 worktree and branch removed.

---

### 2026-09-06 · project · review · p03 round 1

The p03 lane's Codex pre-commit review found and fixed an ordered-token
weakness, and the implementer then narrowed the whole-document `doesNotMatch`
guard to the scoped passage while refactoring — the reviewer's same-input /
opposite-verdict probe (forbidden claim injected outside the passage: base
test fails, HEAD passes) made it Critical. **Skill signal (strengthens):** the
weaker-anywhere instruction in review briefs is what caught it; keep it and
add "any assertion whose input surface shrinks is a weaker-anywhere candidate"
to the reviewer brief template. Two lane frictions: `.lintstagedrc.mjs` has no
`*.mjs` glob so skill test files are not auto-formatted at commit (while
`pnpm format` checks them) — follow-up candidate; the expected-churn text in
the p03/p04 briefs still said the lockstep manifests were at 0.2.56 after the
group-1 bump to 0.2.57 (harmless; fixed in the p05 brief).

---

### 2026-09-06 · project · review · p04 round 1

The p04 lane (13 lifecycle skills, new load-contract matrix) surfaced two
repository defects nobody had seen: four-backtick fences in
`oat-project-plan/SKILL.md` (Steps 8–13, 328 lines) and
`oat-project-review-receive/SKILL.md` (Step 6, 49 lines) had been rendering
whole steps as code, hiding six execution directives from every prose scan
and, per the reviewer, from every gate (`oxfmt --check` accepts the defective
base). Follow-up candidates: a repo-wide fence-balance check; the plan's named
focused tests (`post-implement-sequence-contracts`, `skills.test.ts`) did not
cover `review-skill-contracts.test.ts` or `autonomy-gate-inventory.test.ts`,
which only the forced full suite surfaced. **Skill signal (gap):** plans that
reword lifecycle-skill prose should name the autonomy-contract hash table and
the review-skill-contracts pins as expected ripple. The review's four
Important findings are all backstop-strength (substring exemptions, missing
`use`/`apply` verbs, no fence gate, one mislabeled exemption), no regression;
fix round dispatched on the original handle.

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
