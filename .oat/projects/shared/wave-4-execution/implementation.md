---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-4-execution

**Started:** 2026-08-27
**Last Updated:** 2026-08-27

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase    | Status   | Tasks | Completed |
| -------- | -------- | ----- | --------- |
| Phase 01 | complete | 1     | 1/1       |

**Total:** 1/1 tasks completed (phase passed after three review cycles)

## Phase 01: refresh-codex-skill-routing (solo)

**Source plan (the contract):** `.oat/repo/reference/external-plans/2026-08-19-refresh-codex-skill-routing.md`
**Status:** passed — three review cycles; round-3 fixes root-verified under the cycle cap at `44fb2327`

### Phase Summary (fill when phase is complete)

Source plan executed in full: `codex-skill` classifies work by OAT task class and takes model and effort from `provider-codex.md` (named as the source of truth; dated examples never override it; compatibility snapshots never defaults); routes offered as one combined model+effort choice; a valid user-supplied pair is honored (below-floor: say so once without blocking; direct-API specialist classification: confirm before launching); if the reference is unavailable the skill stops and asks. `--skip-git-repo-check` removed from ordinary initial-run, `-C`, and resume commands and kept only for a non-Git target directory with reason + authorization; resume examples normalized to the live `codex exec resume` usage; the dead `--full-auto` replaced under the operator-reconciled STOP #2 (`--approve-for-me` only with `-s workspace-write`; network inside a write sandbox via `-c sandbox_workspace_write.network_access=true`; `-s danger-full-access` for genuine broad-filesystem needs; the bypass-all flag for externally sandboxed automation) — sandbox and high-impact authorization retained and tightened. Eight-case prose contract test with logical-line normalization, a structural exemption rule, and semantic assertions; 22-probe mutation matrix in the required state. `codex-skill` 1.2.0 → 1.3.0 once; lockstep 0.2.35 → 0.2.36. Three review rounds (0C/0I/3M/4m → 0C/0I/3M/2m → 0C/0I/1M/1m), thirteen Codex rounds across four commits.

### Task p01-t01: Execute external plan — Route codex-skill through current model guidance and preserve repository checks

- **Status:** done · **Commit:** `b97408f2b968c656f00ca07933e148f4f0ff30cb` (sole commit; parent `51c7ec57`)
- **Implementer:** `oat-phase-implementer` (Opus), request `w4-p01-impl-001`; recovery attempts 0.
- **Drift check:** PASS — plan drift command differs from `6f443c08` only in the five manifests' `version` line; addendum 1 (release surfaces vs fetched `origin/main` = `3c135e21`, baseline 0.2.35): empty; addendum 2 (live Codex, `codex-cli 0.149.1`, captured to `$TMPDIR/w4-p01/codex-help.txt`): `exec` has `-m`, `-c`, `-s`, `-C`, `--skip-git-repo-check`, `--approve-for-me`, `--dangerously-bypass-approvals-and-sandbox`, no `--full-auto`, no effort flag; `exec resume` lacks `-s`, `-C`, and `--approve-for-me` (new fact beyond the drift record — drove the resume normalization); addendum 3: `package.json` and `bundle-inputs.mjs` unchanged (`codex-skill` repo-only). STOP #1 clear; STOP #2 under the operator reconciliation; STOP #3–#5 not tripped.
- **What changed:** `.agents/skills/codex-skill/SKILL.md` (frontmatter `version` 1.2.0 → 1.3.0): step 1 classifies the work by OAT task class and names `provider-codex.md` as the source of truth for model and effort (examples are dated, snapshots never defaults); routes offered as one combined model+effort choice; user-supplied pairs honored with a warn-not-block matrix check; direct-API-only routes excluded (a user-supplied direct-API-only model stops and asks for a CLI route); `--skip-git-repo-check` removed from ordinary initial-run, `-C`, and resume commands and kept only for a non-Git target directory (reason + `AskUserQuestion` authorization); the dead `--full-auto` replaced per the operator reconciliation — `--approve-for-me` only with `-s workspace-write`, `--dangerously-bypass-approvals-and-sandbox` reserved for externally sandboxed automation (the `danger-full-access` row no longer carries a bypass); resume examples normalized to the live `exec resume` usage (options after `resume`; `-c sandbox_mode=` verified accepted on resume via `--strict-config` with a bogus-key control); high-impact flag list names the live flags. New `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs` (`node:test`, 7 cases: authority named; no stale pair offered as a choice; no blanket bypass; non-repository condition + authorization stated; initial/`-C`/resume examples omit the bypass by default; no false resume-inheritance claim). Lockstep 0.2.35 → 0.2.36 (five manifests); `public-package-versions.json` regenerated by `pnpm build`; lockfile unchanged.
- **Verify gates:** step 1 `rg "gpt-5\.3-codex|gpt-5\.4" SKILL.md` → no matches; step 2 three `skip-git-repo-check` mentions, all conditional/authorized (`SKILL.md:52-55`, `:91`, `:117-120`); step 3 `pnpm test:skills` 0 (585 = 578 + 7), `check:skill-bumps` 0, fetch-first `release:check-versions` 0; focused `node --test .agents/skills/codex-skill/tests/*.test.mjs` 7/7. Implementer mutation self-probes on a temp copy: stale pair reintroduced → 1 failure; blanket bypass reintroduced → 2 failures.
- **DoD (pre-commit, all exit 0, logs `$TMPDIR/w4-p01/`):** check, type-check, test, build, check:skill-bumps, fetch + release:check-versions, release:validate, build:docs, lint, format; post-commit re-runs: `release:check-versions` 0 and `check:skill-bumps` 0 (both committed-state-only).
- **Cross-model review (plan Step 4):** `codex review --uncommitted` — seven rounds, 9 findings, 9 fixed, 0 dismissed, round 7 clean. Notable: R2 P1 — the mechanical `--full-auto` → bypass mapping on the `danger-full-access` row would have weakened sandbox posture (plan STOP #3) → fixed; R3 P2 — `-c sandbox_mode=` is accepted on resume (verified before accepting); R4 P2 — the stale-model regex also rejected legitimate prose and `gpt-5.4-mini` → narrowed.
- **Self-identified risks (handed to the reviewer):** resume-configuration wording is the softest fact; `--approve-for-me` semantics documented by one help line; contract-test regex breadth after narrowing; nine review-driven wording edits beyond the plan's minimal text (non-narrowing?); `public-package-versions.json` regenerated, not hand-edited.

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-08-27 (complete: 1 phase passed, 0 failed, 0 stopped)

- Branch: `wave-4-execution`; Tier 1 (native `oat-phase-implementer` /
  `oat-reviewer`); dispatch policy managed / `high` (Claude `opus`, enforced —
  Task model arg); schedule `[p01]` (solo, integration checkout).
- Phase recovery policy: default limit 10; usage ledger in `state.md`.

#### Dispatch records

- `w4-p01-impl-001` — caller `oat-project-implement`; scope `p01`; action
  implementation; role `oat-phase-implementer` (class worker); provider claude;
  dispatch_context root-native (Task tool); catalog: Task-tool model enum
  {sonnet, opus, haiku, fable} observed 2026-08-27; role_selector
  `oat-phase-implementer`; model_selector `opus` (tier-alias); effort
  not-exposed (`effort_axis=not-applicable`); selection_source native-default;
  selection_reason native-catalog; candidates_considered [opus]; task_class
  default-implementation (classification_source caller: bounded skill-contract
  rewrite + prose contract test + lockstep bump in one lane; policy boundary
  reviewed separately as consequential); floor satisfied; authority: write in
  the integration checkout within the source plan's scope; retry_limit 0
  (phase recovery contract owns post-commit repair); resolver
  `oat project dispatch-ceiling resolve` (`w4-resolve-p01-implementer.json`).
  Stamp:
  `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- `w4-p01-review-001` — caller `oat-project-implement`; scope `p01`; action
  review; role `oat-reviewer` (class reviewer, fresh); provider claude;
  model_selector `opus` (configured review ceiling); task_class consequential
  (repository-check bypass / sandbox authorization boundary); brief mandates the
  plan-gate-mapped mutation probes plus five more; resolver output
  `w4-resolve-p01-reviewer.json`. Stamp:
  `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- Enforcement log: `Dispatch policy: high; selected=opus; cap=opus (claude, enforced — Task model arg)`.
- Launch acceptance (2026-08-27): `w4-p01-impl-001` accepted by the Claude Code Task tool (native, `subagent_type: oat-phase-implementer`, `model: opus`) on the integration checkout at `51c7ec57`; returned DONE at `b97408f2`. `w4-p01-review-001` accepted (native, `subagent_type: oat-reviewer`, `model: opus`) against `b97408f2`.

#### Phase Outcomes

| Phase | Worktree                                  | Implementer outcome                                                                               | Review outcome                                                                                                    | Fix rounds | Merged |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| p01   | integration checkout (`wave-4-execution`) | DONE (b97408f2 + fixes d9ce0c33, 39121c35, 44fb2327; DoD 10/10 green; codex 7 + 3 + 2 + 1 rounds) | passed (rounds: 0C/0I/3M/4m → 0C/0I/3M/2m → 0C/0I/1M/1m; cap; round-3 fixes root-verified, final review verifies) | 3          | n/a    |

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

### Review Received: p01 (round 1)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/p01-review-2026-08-27T033338Z.md (reviewed head `b97408f2b968c656f00ca07933e148f4f0ff30cb`, range `3c135e21..b97408f2`, invocation auto, dispatch `w4-p01-review-001`, model opus; probes: live-syntax validation per subcommand, contract-test mutation matrix, authority check, bypass semantics, release bookkeeping, scope verdict on the nine Codex-driven edits, STOP/reconciliation check)

**Findings:** Critical 0 · Important 0 · Medium 3 · Minor 4 — HEAD is correct (all three surviving bypass mentions conditional and authorization-gated; no example carries the bypass; sandbox/high-impact authorization not weakened; the nine Codex-driven edits judged in scope); the gaps are guard coverage and one unsupported wording claim.

**Dispositions (bounded fix round, append-only, resumed implementer handle `w4-p01-impl-001` → fix request `w4-p01-fix-001`):**

- M1 contract test blind spots (`/only/i` exempts `read-only` lines; Quick Reference rows lack the literal `codex exec`, so a bypass added there passes — probes c2/g1 green) → **fix**: derive the checked set from command-ish content (backticked `codex …` or `-s `/`--sandbox`) and replace the exclusion with an explicit allowlist on the documented exception phrase (`/not a Git repo/i`); probes c2 and g1 must fail afterwards.
- M2 phase bookkeeping still template at the reviewed head (root-owned) → **resolved by the root** in this commit: Run 1 record, task record with `b97408f2`, Progress Overview 1/1, `oat_last_commit`; `§ Done-criteria confirmation` is added at final-review receive (W3 pattern).
- M3 "cannot run through the Codex CLI" asserts a capability limit the reference does not establish (it is a routing classification; user instruction overrides the dated examples) → **fix**: restate as the routing classification and downgrade the hard stop to warn-then-confirm, matching the below-floor treatment.
- m1 narrowed stale-model regex evadable by a single retired slug (probes g2/g4 green; the pair is still caught) → **fix**: assert on the slug with a negative lookahead for live specialist suffixes (``/`gpt-5\.[0-3][^`]*`|`gpt-5\.4`(?!-)/i``), verify g2/g4 fail and `SKILL.md:38-40` + the test comment still pass.
- m2 `danger-full-access` recommended where a narrower documented control exists (`-c sandbox_workspace_write.network_access=true`, reviewer-verified real key) → **fix**: split the row (network inside a write sandbox vs genuine broad filesystem access); both stay in the high-impact list.
- m3 no fallback when the provider reference is unreadable → **fix**: one clause — stop and ask for an explicit model and effort rather than falling back to the dated examples.
- m4 `--approve-for-me` / `-s` interaction unguarded in the numbered steps → **fix**: "pair `--approve-for-me` only with `-s workspace-write`".

**Fix round `w4-p01-fix-001` (resumed implementer handle, append-only commit `d9ce0c332a2b13a27a04239ea037d0f4320a3c42` on `b97408f2`; 2 files, +44/−26; skill version still 1.3.0, packages still 0.2.36):**

- M1 → command set derived from command-ish content (backticked `codex …` or `-s `/`--sandbox`), exception allowlist `/not a Git repo/i`; round-1 probes c2 and g1 now fail (were exit 0 at `b97408f2`).
- M3 → "cannot run through the Codex CLI" removed; direct-API specialist routes stated as the reference's routing classification with warn-then-confirm (`SKILL.md:24-30`).
- m1 → slug-keyed stale-model assertion with the live-suffix lookahead; probes g2/g4 fail, the `gpt-5.4-mini` false-positive control passes.
- m2 → Quick Reference split: network inside a write sandbox (`-s workspace-write -c sandbox_workspace_write.network_access=true`) vs genuine broad filesystem access (`-s danger-full-access`, configured approval policy kept); both in the high-impact list (reordered so a rewrapped bullet cannot pair a sandbox flag with the bypass on one line).
- m3 → missing-reference fallback: stop, ask for an explicit model and effort, run exactly what is named, skip the matrix checks the missing reference cannot answer (the last clause from Codex round 1).
- m4 → `--approve-for-me` paired only with `-s workspace-write` in the numbered steps.
- M2 → root bookkeeping: the Run 1 record, task record with the SHA, and `oat_last_commit` landed at `dd5f1da9`; the Progress Overview, Implementation Log scaffold, phantom Test Results row, and `oat_current_task_id` were NOT fixed there (round-2 M2) and are corrected in the round-2 receive commit.
- DoD all ten exit 0 (`$TMPDIR/w4-p01-fix/`) plus `test:skills` 585/585 and focused 7/7; post-commit `release:check-versions` 0 and `check:skill-bumps` 0. Codex: round 1 P2 (fallback unusable) fixed; round 2 clean; round 3 asked to re-assert the M3 hard stop — dismissed as re-litigating a root disposition without new evidence; stopped per the stopping rule.

**Verification record (root):** what — the fix commit's parent chain (`b97408f2` unchanged, `git rev-list --count b97408f2..HEAD` = 2), file list (2), version fields (1.3.0 / 0.2.36); how — `git log`/`git show --stat`/grep at HEAD; where — this entry; independent verification of each disposition — round-2 narrowed review `w4-p01-review-002`.

**Review row `p01` → `fixes_completed` at `d9ce0c33`; narrowed round 2 dispatched.**

### Review Received: p01 (round 2, narrowed)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/p01-review-2026-08-27T040820Z.md (reviewed head `d9ce0c332a2b13a27a04239ea037d0f4320a3c42`, range `b97408f2..d9ce0c33`, invocation auto, dispatch `w4-p01-review-002`, model opus, disposition-verification brief; 11 probes, `SKILL.md` sha256 identical before/after, nine gates exit 0)

**Findings:** Critical 0 · Important 0 · Medium 3 · Minor 2 — m1–m4 verified; M1, M2, M3 partially verified. HEAD is still correct (three conditional, authorization-gated bypass mentions; no example carries it) — the residuals are guard breadth, one wording regression, and root bookkeeping.

**Dispositions (second bounded fix round, append-only, resumed implementer handle → `w4-p01-fix-002`; round 3 narrowed review follows within the 3-cycle cap):**

- M1 the new derivation requires a backtick before `codex ` and misses flag-bearing table rows (probes n1 fenced example, n2 table row: green; the exception allowlist is dead code at HEAD) → **fix**: reviewer-verified derivation — `/(?:^|[`\s])codex\s/`OR`/-s |--sandbox/` OR table rows with a backticked flag (`/^\s*\|.*`-{1,2}[a-z]/`); c2/g1/n1/n2 must fail, suite 7/7 otherwise.
- M3 the rewrite made the below-floor case block on confirmation (plan step 1: no question when a valid model+effort was supplied) → **fix**: split the conditions — below-floor says so once without blocking; only the direct-API specialist classification confirms before launching; add a contract assertion pinning the non-blocking clause.
- M2 root bookkeeping only partially landed and the `dd5f1da9` note overstated it → **resolved by the root in this commit**: Progress Overview 1/1, Implementation Log rewritten, phantom Test Results row removed, `oat_current_task_id: null`, disposition note corrected.
- m1 line-position sensitivity (rewrapping the high-impact list or a stronger prohibition sentence produces false failures) → **fix**: exempt non-example prose explicitly (allowlist for the high-impact inventory and prohibition sentences) so wording improvements pass.
- m2 stale-slug guard misses `gpt-5.5` (a compatibility route per `provider-codex.md:29`) → **fix**: add the 5.5 family to the assertion without the `gpt-5.4-mini` false positive; re-confirm the controls.

**Fix round `w4-p01-fix-002` (resumed implementer handle, append-only commit `39121c35e3ee07d8b7785d783565ae89e087d337` on `d9ce0c33`; 2 files, +66/−15; skill version still 1.3.0, packages still 0.2.36):**

- M1 → reviewer-verified derivation (`codex ` with or without a backtick, `-s `/`--sandbox`, flag-bearing table rows); probes c2/g1/n1/n2 all fail (n1/n2 were green at `d9ce0c33`).
- M3 → two clauses: below-floor pairing "say so once, without blocking"; direct-API specialist classification "confirm before launching" (`SKILL.md:27-30`); 8th contract case pins the non-blocking clause (reverting to "confirm" → `not ok 3`).
- m1 → soft-wrapped lines unwrapped into logical lines before filtering, then an explicit prose allowlist (`not a Git repo`, `high-impact flags`, `Do **not** add`/`Never pass`); probes r1/r2 now pass (were false failures); the allowlist is live code.
- m2 → `gpt-5.5` family added to the stale-slug assertion; the legacy-block probe fails; `gpt-5.4-mini` control and GPT-5.6 prose pass.
- DoD all ten exit 0 (`$TMPDIR/w4-p01-fix2/`), `test:skills` 586/586, focused 8/8; post-commit `release:check-versions` 0 and `check:skill-bumps` 0. Codex: two consecutive clean rounds → stopped; nothing re-opened.

**Verification record (root):** what — parent chain (`b97408f2`, `d9ce0c33` unchanged; `git rev-list --count d9ce0c33..HEAD` = 2), file list (2), versions (1.3.0 / 0.2.36), focused test 8/8 run by the root; how — `git log`/`git show --stat`/grep/`node --test` at HEAD; where — this entry; independent verification — round-3 narrowed review `w4-p01-review-003`.

**Review row `p01` → `fixes_completed` at `39121c35`; narrowed round 3 (cycle 3 of 3) dispatched.**

### Review Received: p01 (round 3, narrowed — cycle 3 of 3)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/p01-review-2026-08-27T043458Z.md (reviewed head `39121c35e3ee07d8b7785d783565ae89e087d337`, range `d9ce0c33..39121c35`, invocation auto, dispatch `w4-p01-review-003`, model opus; probe matrix reproduced plus reviewer-designed probes u1–u9/w1; `SKILL.md` sha256 identical before/after)

**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 1 (+ Deferred ledger D1–D4) — all round-2 dispositions verified; HEAD's skill content is correct (three conditional, authorization-gated bypass mentions; no example carries it). Residuals are guard hardening in the contract test, not shipped-behavior defects; the gate threshold is `important`.

**Cycle-cap disposition (REVIEWRECEIVE-02):** scope `p01` has consumed its three review cycles; the root does not self-authorize a fourth. The reviewer supplied and byte-copy-verified the fixes for M1 and D1 and a concrete suggestion for m1. Disposition: a **bounded, reviewer-specified, root-verified fix** (append-only `w4-p01-fix-003`) with the probe matrix re-run by the root as the stored verification record; independent verification is delegated to the **final review** (scope `final`, its own cycles), which is briefed to verify these three items explicitly, and to the configured exit gate.

- M1 `documentsTheException` exempts on keyword alone (probes u6/u7/u9 single lines and u1/u3 wrapped continuations escape; u8 control fails) → **fix**: reviewer-verified predicate — an exempted line must not itself run `codex exec|resume`; drop or justify the dead `Do **not** add|Never pass` branch; align the comment.
- m1 below-floor assertion pins phrase co-location to one clause (probe u5, a clearer rewrite, fails) → **fix**: assert the property semantically (`without blocking` within 200 chars of `below the route` in either order; no clause pairs `below the route` with `confirm before launching`; `>= 1` matches).
- D1 cross-directory assertion iterates physical lines (probe w1 escapes at all three heads) → **fix**: use `logicalLines` (reviewer-validated one-liner).
- D2 paragraph-level over-strictness → accepted (no current false failure). D3 drifted line citations in the dispatch brief → accepted (cosmetic). D4 in-flight `oat_last_commit` → the `state.md` half was resolved in this commit; the Implementation Log fix-round-2 line was destroyed by a botched edit in `6075a705` and restored at the final-review receive (final round-1 I1).

**Fix round `w4-p01-fix-003` (resumed implementer handle, append-only commit `44fb232773ee0360e4c891123ef069fc0bc137d6` on `39121c35`; test file only, +28/−19; `SKILL.md` byte-identical to `39121c35`; skill 1.3.0, packages 0.2.36):**

- M1 → structural exemption: an exempted line must not itself run `codex exec|resume` (`tests/…:37-48`); the prohibition branch kept with a one-line justification (dropping it would re-fail probe r2).
- m1 → semantic below-floor assertion: whole-file co-location window plus a no-clause-pairs-with-`confirm before launching` loop; `>= 1` matches (`:110-127`).
- D1 → cross-directory assertion on `logicalLines` (`:181-183`).
- DoD all ten exit 0 (`$TMPDIR/w4-p01-fix3/`), `test:skills` 586/586, focused 8/8; post-commit `release:check-versions` 0 and `check:skill-bumps` 0. Codex: one round, one P2 (widen the phrase-literal `confirm before launching` check to `\bconfirm`) — dismissed for scope (root-specified patch), recorded for the final review's ledger.

**Verification record (root, cycle-cap disposition):** what — the 22-probe matrix (c2, g1, n1, n2, u1–u9, w1, g2, g4, g5, m3rev → fail; control, r1, r2, u4, u5, fp → pass) re-run by the root against HEAD `44fb2327` with the implementer's reproducible runner (temp copies; repository never written; `NO-TESTS-RAN` guard); how — `$TMPDIR/w4-p01-fix3/probes/run-all.sh` → `ALL PROBES MATCHED`, runner exit 0 (log `scratchpad/w4/root-probe-run.log`; runner copied to `scratchpad/w4/probes/`), plus `git show --stat` (one file) and `git diff --stat 39121c35 HEAD -- SKILL.md` empty; where — this entry; independent verification — the final review (scope `final`), briefed to re-run the matrix and attempt an evasion of the structural rule.

**Review row `p01` → `passed` at `44fb2327` (round 3 dispositions root-verified under the cycle cap; final review verifies independently). Next: closeout baseline → root DoD → final review → configured exit gate.**

### Review Received: final (round 1)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/final-review-2026-08-27T050607Z.md (reviewed head `41da6443304b0296d5fda899b9c3f10d1bc6815b`, range `3c135e21..41da6443`, invocation auto, dispatch `w4-final-review-001`, model opus)

**Findings:** Critical 0 · Important 1 · Medium 4 · Minor 1 — no shipped-behavior defect: DoD 10/10 re-run by the reviewer at `41da6443`; every command example valid against live help; every offered/excluded route consistent with `provider-codex.md`; weaker-anywhere clean; the 22-probe matrix reproduces (`ALL PROBES MATCHED`); docs: no page references the old routing or bypass (`oat_docs_updated` → `skipped` at the document step is consistent). Two findings are contract-test guard breadth (the round-3 structural rule keys on two literal subcommand tokens; the below-floor assertion is evadable by paraphrase — the Codex `\bconfirm` patch is rejected but the concern is upheld); four are wrapper bookkeeping.

**Deferred Findings Re-evaluation:** the reviewer's ledger closes R1 m1–m4, R2 m1–m2, R3 m1/D1, accepts D2/D3 and the STOP #2 reconciliation, and escalates the half-resolved D4 (now I1) and the R3 M1 partial closure (now M1).

**Dispositions (bounded fix round on the final scope — cycle 1 of 3 for scope `final` — append-only `w4-final-fix-001` for the two test items; root bookkeeping in this commit):**

- I1 Implementation Log: a botched edit in `6075a705` wrote a replacement callback's source in place of the round-2 line and dropped the round-3 line → **fixed** (both lines restored verbatim); D4 note corrected. Root cause: the receive script's `once` helper accepted a function as the replacement; the helper now rejects non-string replacements.
- M1 structural exemption keys on `codex exec|resume` only (evasions e1 flag-only row with an allowlist phrase, e2 bare `codex`, e3 `codex e` alias) → **fix** (implementer): negative test on any live invocation of the binary (`/(?:^|[`\s])codex(?:\s|`)/`) and deny the exemption to flag-bearing table rows; e1–e3 must fail, the 22-probe matrix must stay matched.
- M2 below-floor assertion evadable by paraphrase (b1 "ask for confirmation before running" passes; `\bconfirm` would false-fail b2) → **fix** (implementer): property-based denial of a confirmation/authorization _requirement_ in the below-floor clause set while allowing negated mentions; b1 must fail, b2/u4/u5/control must pass.
- M3 Reviews ledger `p01` row paired the round-3 artifact with `44fb2327`, a head it never reviewed → **fixed**: head restored to `39121c35` with a note pointing at the root verification record; the root-verified pass at `44fb2327` is carried by this final review.
- M4 stale status prose (`state.md` Artifacts/comment/Next Milestone; `implementation.md` Total line) → **fixed**.
- m1 References `design.md`/`spec.md` residue → **fixed** (`N/A (quick mode)`).

**Verification record (root):** what — I1/M3/M4/m1 edits; how — `rg -n 'm=>m|not started|day one|round 2 in progress|phase review in progress' <project>` returns nothing, `rg -n '39121c35' implementation.md` shows the restored line, `validate-plan` valid, `oxfmt --check` clean; where — this entry; independent verification — narrowed final round 2 after the implementer's fix commit.

**Fix round `w4-final-fix-001` (resumed implementer handle, append-only commit `94d6f74d342e1b272fbc7d1ebed2cffe8de8330f` on `a4a96489`; test file only; `SKILL.md` unchanged since `39121c35`):**

- M1 → exemption keys on the binary: `invokesCodex` = any `codex` invocation (bare, `e` alias, subcommands) is never exempt; flag-bearing table rows can be exempted only by the documented non-repository exception, never by authorization/prohibition wording (stated deviation from the literal "never exempt" — a blanket denial fails the unprobed control because the documented exception row at `SKILL.md:99` is itself flag-bearing; e1 still fails). Evasions e1/e2/e3 fail; controls e4/e5 fail; r1/r2/u4/u5/fp/control pass.
- M2 → property-based confirmation check (`requiresConfirmation` / `negatesConfirmation`); b1 fails, b2 passes; `\bconfirm` not adopted.
- 29-probe runner ALL PROBES MATCHED (before-run mismatches were exactly e1, e2, e3, b1). DoD all ten 0 (`$TMPDIR/w4-final-fix/`); `test:skills` 586/586; post-commit `release:check-versions` 0 and `check:skill-bumps` 0. Codex: one round, two P2 dismissed — (1) factually wrong (the regex matches `confirmation` via the `confirm` prefix; verified by execution); (2) a negated mention can mask a positive requirement in the same clause — true, reproduced, out of this round's root-prescribed semantics → final-review ledger.

**Verification record (root):** what — the fix commit's file list (1) and parent chain, `SKILL.md` unchanged since `39121c35` (`git diff --stat` empty), the extended 29-probe runner re-run by the root at HEAD; how — `git show --stat`, `git diff`, `run-all.sh` → ALL PROBES MATCHED (log `scratchpad/w4/root-probe-run-2.log`; runner copied to `scratchpad/w4/probes/`); where — this entry; independent verification — narrowed final round 2 `w4-final-review-002`.

**Review row `final` → `fixes_completed` at `94d6f74d`; narrowed round 2 dispatched.**

### Review Received: final (round 2, narrowed)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/final-review-2026-08-27T053039Z.md (reviewed head `6b81bea96da62fe1533a870c9d522fb640967eed`, range `41da6443..6b81bea9`, invocation auto, dispatch `w4-final-review-002`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 2 · Minor 1 — all round-1 dispositions (I1, M1–M4, m1, docs) verified fixed; 29-probe matrix independently reproduced; 8/8 gates re-run; `SKILL.md` byte-identical since `39121c35`. Two genuine residual evasions of the contract guard remain (each with an isolation control), and one artifact-drift minor.

**Dispositions (bounded fix round `w4-final-fix-002`, append-only, test file only; round 3 — the last final cycle — verifies):**

- M1 the `not a Git repo` carve-out is row-scoped (probe x1: the shipped `Apply local edits` row with the bypass plus a trailing "(covers a target that is not a Git repo)" note is exempted; x1c control fails) → **fix**: for a flag-bearing table row, require the exception phrase in the use-case cell (`line.split('|')[1]`), evaluated before the whole-line test.
- M2 `negatesConfirmation` skips the whole clause (probes x6 negation mask and x4 "and with no delay" insertion evade; x6c control fails) and is dead weight (b2 never matches `requiresConfirmation`) → **fix**: delete the skip so the requirement assertion applies to every below-floor clause.
- m1 Final Summary / task-record summary lag the final-scope commits and the 29-probe matrix → **fixed at the round-3 receive** (so the text names the last code commit).

**Review row `final` → `fixes_added` at `6b81bea9`; fix round then narrowed round 3 (cycle 3 of 3).**

## Implementation Log

Chronological log of implementation progress.

### 2026-08-27

- Preflight from main `3c135e21` (`worktree:init`, build, type-check exit 0; manifest restamp `f9db417c`); wrapper scaffolded `8e903a0c`; plan gate passed round 1 (`cursor-gpt-5-6-sol-xhigh`, run `0d369be4`, one medium mapped into rule 8); implement phase opened `51c7ec57`.
- [x] p01-t01: Execute external plan — `b97408f2` (Opus implementer `w4-p01-impl-001`; DoD 10/10; Codex seven rounds, nine findings fixed pre-commit).
- [x] p01-t01 fix round 1 — `d9ce0c33` (append-only; round-1 M1/M3/m1–m4; Codex three rounds under the stopping rule).
- [x] p01-t01 fix round 2 — `39121c35` (append-only; round-2 M1/M3/m1/m2: logical-line derivation + prose allowlist, non-blocking below-floor clause with an 8th contract case, `gpt-5.5` slug; Codex two clean rounds).
- [x] p01-t01 fix round 3 — `44fb2327` (append-only; round-3 M1/m1/D1 — structural exemption rule, semantic below-floor assertion, logical-line cross-directory check; test file only; root-run 22-probe matrix ALL MATCHED).
- [x] p01-t01 final-scope fix — `94d6f74d` (append-only; final round-1 M1/M2 — exemption keyed on any `codex` invocation, property-based confirmation check; test file only; root-run 29-probe matrix ALL MATCHED).
- Decisions: the operator-reconciled `--full-auto` replacement is evaluated per example row (a mechanical swap weakened the `danger-full-access` row and was caught by Codex); prose guards key on documented phrases and command-ish content, not hedging words; cross-model review stops at two clean rounds or below-Medium findings.
- Blockers: none.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

**Final verification (root, closeout baseline) at `6075a705`** — full definition of done invoked literally, one log per gate under the session scratchpad `w4-dod/`, exit codes in `exits.txt`: `pnpm check` 0 · `pnpm type-check` 0 · `pnpm test` 0 · `pnpm build` 0 · `pnpm run check:skill-bumps` 0 · `git fetch origin` 0 then `pnpm release:check-versions` 0 (0.2.36 vs `origin/main` 0.2.35) · `pnpm release:validate` 0 · `pnpm build:docs` 0 · `pnpm lint` 0 · `pnpm format` 0. Tree clean after the run; no deterministic-smoke worktrees left behind.

Earlier evidence: implementer DoD 10/10 at `b97408f2`, `d9ce0c33`, `39121c35`, `44fb2327` (post-commit `release:check-versions` and `check:skill-bumps` re-runs 0 each time); `pnpm test:skills` 586/586 (578 + 8 new); focused contract test 8/8; root-run 22-probe mutation matrix ALL MATCHED at `44fb2327`; reviewer re-runs at every head.

## Final Summary (for PR/docs)

**What shipped:** `codex-skill` (1.2.0 → 1.3.0) routes model and reasoning effort through OAT's live Codex provider reference by task class instead of a stale two-model list; the repository-check bypass is conditional (non-Git target only) and authorization-gated; every command example validates against codex-cli 0.149.1 with the dead `--full-auto` replaced under the operator-reconciled STOP #2 (sandbox and high-impact authorization retained and tightened); an eight-case prose contract test guards the stale pair, single retired slugs, blanket or example-default bypass across every command-ish line, the authority sentence, the non-repository condition, and the non-blocking below-floor rule. Lockstep bump 0.2.35 → 0.2.36.

**User-facing behavioral change:** agents following `codex-skill` now classify work, read `provider-codex.md`, and offer only currently eligible model+effort routes; ordinary Codex runs keep the repository check; unattended edits require `--approve-for-me` with a write sandbox; network access no longer implies the broadest sandbox.

**Key files:** `.agents/skills/codex-skill/SKILL.md`, `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs` (new), five `packages/*/package.json`, `packages/cli/assets/public-package-versions.json` (regenerated).

**Verification:** DoD 10/10 at `b97408f2`, `d9ce0c33`, `39121c35`, `44fb2327` (post-commit `release:check-versions` and `check:skill-bumps` re-runs 0 each time); `test:skills` 586/586; reviewer probes across three rounds — live-syntax validation per subcommand, 22-probe mutation matrix (root-run at HEAD: all matched), provider-reference consistency, weaker-anywhere on sandbox/authorization, scope verdict on the Codex-driven edits.

**Design deltas:** N/A (quick mode; no `design.md`). Reconciliation: the plan's STOP #2 (`--full-auto` absent from live help) resolved non-narrowingly by operator direction inside the plan's own step 2 (recorded once in `plan.md` § Drift Refresh Record).

## References

- Plan: `plan.md`
- Design/Spec: N/A (quick mode)
