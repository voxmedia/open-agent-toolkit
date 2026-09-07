---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-06
---

# Orchestration Log: wave-4-execution

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

`wave-4-execution` created from `origin/main`
`0af558db80068649fb8858be7a98c635e6f12f3d` (W3 merged as PR #269 `ed75370db`,
wave-close PR #270 `0af558db8`). `pnpm install --frozen-lockfile` (post-checkout
hook, lockfile up to date), `pnpm build`, and `pnpm type-check` exit 0.
`oat --version` 0.2.55 against branch 0.2.58 (lanes use `pnpm run cli --`).
Remote name will be `origin/wave-4-execution-2026-09`.

### 2026-09-06 · structural · oat-wave-execute · drift refresh

One read-only recon agent (Opus) against `ed75370db` (the wave base differs
only by the W3 close records): 0 PASS / 3 MINOR-DRIFT / 0 STOP; record in
`plan.md`. The recon confirmed the program's regrouping reason and found it
stronger than stated: p01 and p03 collide on identical lines
(`skills.test.ts:4341`/`:5430`, `oat-project-implement/SKILL.md:3`), so the
wrapper carries the one-bump-per-skill-per-PR rule for that skill explicitly.
**Skill signal (strengthens):** the wave-boundary recon's pairwise
write-surface intersection is the load-bearing input to group composition.

---

### 2026-09-06 · structural · oat gate review · plan

Plan gate run `e89abdea-e24d-476f-8640-7bd848d13999` (`codex-5-6-sol-xhigh`) passed
first time: 0C / 0I / 0M / 0m. **Skill signal (strengthens):** authoring the
wrapper from the program section and the recon (not from the previous wave's
artifacts) removed the whole finding class the W3 plan gate blocked on.

---

### 2026-09-06 · structural · oat-wave-execute · group 1 + p03 fan-ins

Group 1 merged `034780db0` (p01) and `6a09a6bd2` (p02) after rebase; lockstep 0.2.58 → 0.2.59 with the manifest restamp `0bb028ca2` — the fan-in's `sync --scope project` printed p02's new advisory (`Manifest version refreshed; no content changes required.`) on the repository's own manifest. p03 merged `92da1d57b`. Both fan-ins: eight gates green, `Cached: 0`.

### 2026-09-06 · project · friction · brief pin lists

The executor notes enumerated pins by skill name and missed pins that assert the version literal alone (`.toBe('1.5.3')`): p01 found seven more pins than briefed, p03 five instead of two. Rule for later waves: lanes grep the version LITERAL, not the skill name. **Skill signal (strengthens):** the recon's pin inventory must be literal-based.

### 2026-09-06 · project · worked-well · review probes on the built CLI

All three reviewers probed the built CLI in scratch projects rather than the test harness: p02's reviewer found the plan-body `No changes required.` the pinned test could not see (array-element assertion; the suite's injected formatter fake never emitted the sentence); p01's reviewer ran twenty malformed inputs and an independent fingerprint walk; p03's reviewer found a blocked-route stamp nobody had pinned. **Skill signal (strengthens):** reviewer briefs must require a live probe of the built CLI for every command-surface lane.

### 2026-09-06 · project · feedback · Codex disagreeing with itself

p03's sweep round returned both "guards too loose" and "guards too tight" on the same regex helper; the lane read that as the signal to change what the guard anchors to (owning section) instead of tuning the pattern. Worth carrying into the reviewer/implementer guidance.

---

## End-of-run synthesis (2026-09-06)

**Convention verdicts (evidence: entries above and `implementation.md` Run 1):**

1. Wave→project wrapper with pointer-only tasks: held. Authoring the wrapper from the program section and the recon produced the program's first zero-finding plan gate. p01's plan anticipated that its change might not ship as one reviewable commit; the wrapper allowed contract-slice commits under one task ID instead of an import-and-split, and the reviewer verified the range.
2. Wave-boundary drift refresh plus per-lane pre-declaration: held. All three drift checks matched; the recon predicted the p01∩p03 identical-line collisions that made the one-bump rule necessary. Gap: its pin inventory was name-based and undercounted (see friction entry).
3. Lane mode vs fan-in mode verification: held; the lockstep bump plus project-scope sync at the group-1 fan-in exercised p02's own feature on the repository's manifest.
4. Root-owned reviews with adversarial probes: held and load-bearing. Fix rounds: p01 one, p02 one, p03 an address-now sweep. Reviewers found five Important findings (p01 two, p02 one, plus Codex's in-lane Critical on p01 that the reviewer independently confirmed fixed); every round-2 verification passed. The decisive technique was live probing of the built CLI.
5. Cross-model in-lane review (Codex, two-round cap): held. Codex found the p01 stale-transition Critical pre-commit, the p02 non-falsifiable test, and the p03 whole-document-match weakness; its sandbox could not run tests in two lanes, so root reviewers re-ran the implementer probes.
6. Group composition from mechanical write-surface intersection: held. Group 1 write-disjoint; p03's seam with p01 (`skills.test.ts` pins, `oat-project-implement`) resolved by ordering plus the one-bump rule.

**Skill-signal rulings:**

- Strengthens — author the wrapper from the program section and the recon; grep for the previous wave's identifiers before the gate.
- Strengthens — pin inventories by version literal; briefs say "grep the literal".
- Strengthens — reviewer briefs require a live probe of the built CLI for command-surface lanes and a re-run of implementer probes whenever Codex could not execute tests.
- Strengthens — a docs contradiction inside the integration diff's own rule is fixed in the wave (the p01 I2 ruling), with the scope expansion reported and recorded as a plan correction.
- Gap — the plan Dependencies tables do not capture cross-wave shared writes created by in-wave scope expansions; the wave-close refresh must add them (this wave: `contributing/skills.md` for W6, `state-utils.test.ts` for W5).

**Adjustments adopted as rules for later waves:**

1. Lane briefs: "locate pins by grepping the version literal".
2. Reviewer briefs: live CLI probe in a scratch project for every command-surface lane; re-run implementer probes when Codex ran source-only.
3. Wave close: add landing-event / dependency rows for any file a lane edited outside its plan's named scope.

**Graduated-entries ledger:** follow-up backlog items filed at closeout (see `implementation.md` Deferred Findings); plan corrections applied at the wave-close program refresh; skill-signal rulings above are the `oat-wave-execute` change list.

### 2026-09-06 · project · feedback · reviewer scratch hygiene

The p01 round-2 reviewer reported in its reply (not in its artifact) that it had run `rm -rf` on a scratch path under its own `mktemp -d` sandbox; no prompt fired and nothing outside the sandbox was touched. Recorded here as a process note; the orchestrator had mis-filed it as the review's Minor (corrected after the final review caught it).

### 2026-09-06 · structural · oat-wave-execute · final review

Root final review `w4-final-review-001` (artifact `final-review-2026-09-06T194032Z.md`, head `1dfdd1a83`): 0C / 3I / 4M / 4m, all product gates green and every patch-id pair matched; the Importants are prose contradictions OUTSIDE the lanes' diff (discover/design gate steps still teaching `null` ⇒ no gate; `autonomy.md`) plus a misrecorded review finding, and the Mediums are record defects (a stale `state.md`, a wrong retained-lockstep line, a p03 row the oxfmt-repadded table swallowed). **Skill signal (strengthens):** post-merge bookkeeping scripts must assert every replacement (the p03 Phase Outcomes row replacement silently missed after oxfmt re-padded the table); and the final review must sweep the whole docs/skills tree for the retired rule, not just the diff.

---
