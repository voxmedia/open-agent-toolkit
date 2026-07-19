# Program Retrospective: the 2026-07 Repo-Improvement Waves

Written 2026-07-17, after PR #152 closed the program (5/5 waves + wave 0,
48/48 plans). Evidence: `2026-07-17-wave-signal-ledger.md` (consolidated from
the six archived orchestration logs), the six wave summaries in
`project-summaries/`, and the execution-program artifact. The published
program explainer lives at `.oat/repo/explainers/stoa-wave-program-2026-07/`.

## What the program was

Six merged PRs (#146–#150, #152) executed a 48-plan corpus through the
wave→project wrapper pattern (DR-260713-wave-project-wrapper-over): immutable
external plans as per-lane contracts, parallel worktree lanes with opus
implementers, root-owned opus reviewers, codex cross-model review on risk
lanes, fan-in integration gates, cross-runtime final gates, and one human
approval per wave. Two skills were dogfooded into existence along the way:
`oat-wave-execute` (0→1.4.0 across five hardening runs) and
`oat-wave-program` (1.0.0, three modes, dogfooded from wave 3).

## The five findings that matter

1. **The mechanical/judgment split is the load-bearing design.** The wave-1
   extraction ruling drew the line — the skill owns everything hand-re-derivation
   kept breaking (branch naming, merge choreography, gate scoping, bookkeeping
   cadence); the orchestrator keeps group composition, dispositions, synthesis,
   and user checkpoints. Every subsequent wave validated the line from both
   sides: zero convention re-derivation incidents after extraction (wave 1 had
   four), while the judgment layer absorbed things no template could (a plan
   whose own sketch violated its acceptance criteria; a mid-wave operator
   gate re-route).
2. **Layered independent review works — and each layer catches things only it
   can.** Round-one pass rates climbed from 10/12 (W1) to 9/9 (W5, first
   perfect wave) while the catches moved earlier: codex cross-model review
   delivered 40+ pre-commit findings across the program (3×P1 async races in
   one W5 lane alone), adversarial reviewer probes found a Critical invisible
   to every gate and test (W4 p06), and fan-in integration gates caught a
   teardown race invisible to per-lane DoD and two prior fan-ins (W5). The
   final gates earned their place too — including blocking once on process
   honesty rather than code, which is the system working.
3. **Drift discipline scales better than re-planning.** 32+ consecutive
   briefed lanes without a false drift-STOP; three consecutive waves where
   the recon coverage-audit caught a plan's own drift-command gap; plans
   authored five days before execution survived four waves of churn with
   zero plan mutations — reconciled through non-narrowing recorded deltas
   instead of rewrites.
4. **Boundary asserts beat root-cause availability.** The `.oat/config.json`
   ambient revert was never root-caused (12+ occurrences, exact blob,
   workspace oat 0.1.1 as prime suspect) — but the config-integrity assert
   caught it at every boundary and zero reverts reached a commit. The same
   pattern (verify-at-boundary, not trust-the-tool) closed the bookkeeping
   no-op class (rule 9) and the provider-view sync-drift class (queued 1.5.0).
5. **The feedback loop with upstream tooling compounds.** Filed friction
   (gate stdin hang, scaffold placeholders, `oat backlog new`, row-stomp)
   came back fixed in oat 0.1.65 mid-program; the skill retired its
   workarounds the same wave (1.3.1) and field-verified the fixes. The
   remaining open items ride in the promotion packet.

## What did not work / cost real time

- The wave-2 final-gate timeout episode (two attempts exhausted, no artifact)
  — mitigated at the skill layer, but the upstream configurable-timeout ask
  was never confirmed shipped.
- The wave-4 conflict episode: keep-both splicing broke five seams and a
  `git add -A` nearly swept a stale config into an amend — all caught by the
  verify-resolution procedure, which became the 1.4.0 contract. Cost: hours;
  value: the contract has had zero recurrences since.
- Self-inflicted orchestration errors remained possible at the seams the
  skill doesn't yet own: a wave-5 merge landed on a phase branch via shell
  cwd persistence (caught instantly; pwd/branch assert queued for 1.4.1).
- Loop-closing on backlog candidates was the weakest bookkeeping surface:
  a dozen candidates raised in syntheses were never confirmed filed-with-ID
  (now the staleness-triage input list in the ledger).

## Verdict

The pattern is promotion-ready. Both skills leave the program with every
standing rule evidence-backed, a queued change list (1.4.1/1.5.0) that is
specific and small, and a CLI-absorption list where the mechanical layer
should sink below the skill entirely. The handover is
`2026-07-17-wave-skills-promotion-packet.md`.

## What happens next (operator-agreed)

God-module split (stoa, discovery done) → backlog staleness triage → the
promotion project in the OAT repo (packet-scaffolded, like explainer-kit) →
wave 6 as a separate compact program on the promoted skills — the first run
where the dogfood becomes the product.
