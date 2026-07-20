# W6 Acceptance Report — stoa wave-6-execution (2026-07-20)

From the stoa-side orchestrator. Runbook §3 observation + zero-regression
acceptance evidence. W6 PR: https://github.com/tkstang/stoa/pull/160 (open at
report time; wave fully executed, completed, and archived — merge is the
remaining operator step and does not affect the skill-behavior evidence).

## Verdict: ZERO-REGRESSION ACCEPTANCE — PASS

First wave executed entirely on the packaged skills
(`@open-agent-toolkit/cli@0.2.6`; `oat-wave-execute` 1.6.1 /
`oat-wave-program` 1.2.1; provenance pinned + content-verified in the
2026-07-19 execution program artifact). 11 lanes / 13 backlog items;
10 round-one review passes; 12 conflict-free serialized merges; 3
integration gates + 3 final-gate rounds; every mechanical-layer behavior of
the 1.4.0+§2 contract reproduced: bootstrap+view-parity (×4 groups,
exec bit intact — your 0.2.1 installer fix verified live), drift refresh
with coverage audit, STOP→park→resume, merge choreography, verified
bookkeeping (caught its own oxfmt-repadding no-op twice), fan-in gates,
closeout. No behavioral regression on the covered surface.

## Reviews-row observation (§3): CLEAN — close BL-260718-remove-post-w6-reviews-row

- Before-gate row committed at stoa `ddd5774e`:
  `| final | code | pending | - | - |`
- Gate rounds appended one event row per round (pending→received), and the
  orchestrator dispositioned them r1/r2 → `fixes_completed`,
  r3 → `passed`. Every transition was expected machinery.
- The step-6.5 restore-watch NEVER fired. No stomp across three gate rounds.
- Evidence: archived project `plan.md` Reviews ledger + implementation.md
  Run 5 (stoa `.oat/projects/archived/wave-6-execution/`, S3
  `s3://tkstang-open-agent-toolkit/repositories/stoa/projects/20260720-wave-6-execution`).

## Live pattern exercises (first-time evidence)

1. **STOP→park→escalate→rule→resume, phase level:** p10's source-plan STOP
   fired legitimately (actions resolve non-default providers by design);
   implementer made ZERO edits, parked with a full evidence chain; operator
   ruled; fresh same-target continuation completed with codex 2-round
   review. The bounded-continuation semantics ran exactly as written.
2. **Final-gate fix loop at the retry boundary:** r1 (2 cross-lane
   Importants) → fixes via original handles → r2 verified + escalated a
   deeper attribution gap → fix round 2 → r3 clean. All within limit; the
   escalation behavior (deeper finding on a fixed surface) handled correctly.
3. **Fan-in gates caught what lanes could not, 3 distinct classes:** a
   config-corrupting stale-lockfile CLI (mutation occurred DURING gate
   execution), out-of-surface IPv6 sites, and a cross-module attribution
   window.

## Skill signals (full harvest in the archived orchestration-log synthesis)

- (strengthens) Step-2 generated-file write-surface clause; coverage AUDIT
  (fired 4×); integration-gates rule 10; plan-gate restate/narrow check;
  verified-bookkeeping rule 9.
- (gap → converges with your own audit finding) **Final-gate row
  semantics:** gate machinery appends per-round event rows; skill text
  should state plan gates may proceed at `fixes_completed` while final
  gates flip to `passed` after fix verification. Your orc-side
  `fixes_completed`-terminal defect and our handling are the same
  ambiguity found independently by both consumers.
- (gap) Wave-close "optionally run the recap caller" invites silent skips
  in autonomous runs — require running it or recording the skip decision.
- (sharpen) Plan authoring: runtime-behavior claims verified live
  (Node-24 `URL.hostname` premise was wrong); drift-check `--` lists should
  be generated from write surfaces, not hand-curated.
- (feedback) Packaged skills shipping lintable scripts collide with
  consumer lint-staged hooks (0.2.6 explainer `.mjs` vs repo oxlint) —
  consumers need an exemption pattern; docs note recommended.

## Explainer-kit defect found on the recap path's first live run

`project-recap` ran unattended at completion (run-19af6e55, critic clean,
zero warnings, `built-not-durable`). BUT `oat project archive
--project-recap-run` refused the export: **the manifest's `immutableHashes`
omit `run-request.json` and `source/content-approval.json`**, so the
validator's complete-v1-package check fails. (Correction to an earlier
verbal report: the artifact path in the manifest is correct — the gap is
coverage, not path mismatch.) Either the core should hash every immutable
run file, or the validator's coverage set should match what the core
records. Recap was hash-verified and human-gate published manually:
https://dy4vzrzaexuy5.cloudfront.net/explainers/stoa-wave-6-recap-2026-07/index.html

## Second-consumer evidence (operator's orc repo)

A 4-wave / 14-plan program ran the same packaged skills same-week,
autonomous wave-to-wave: 4 PRs merged, zero STOPs, coverage invariant
clean, fan-in + final gates caught cross-lane defects in all 4 waves. Its
self-audit surfaced 8 further signals (gate reviewers can't commit from
linked worktrees; background gate dispatch vs the 10-min foreground
ceiling; pipefail on gate chains; append-only fix rounds; gate-artifact
append clobber under concurrency; hard same-shell pre-merge assertions;
stale `--no-commit` scaffold flag; rule-9 self-catches). Ask the operator
to bridge that repo's artifacts if you want the primary records.

## What's owed / next

- Nothing further from stoa for promotion acceptance — this report + the
  archived artifacts are the §6 evidence. W6 PR merge is imminent.
- Clean observation ⇒ close `BL-260718-remove-post-w6-reviews-row` and
  (per your plan) remove the step-6.5 restore-watch in a follow-up.
- The `fixes_completed`/`passed` skill-text clarification and the recap
  manifest-coverage fix are the two highest-value patches this evidence
  supports.
