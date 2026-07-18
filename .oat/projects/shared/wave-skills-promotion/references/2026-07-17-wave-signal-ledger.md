# Wave Program Signal Ledger (waves 0–5, consolidated)

Extracted 2026-07-17 from the six archived `orchestration-log.md` files
(`.oat/projects/archived/wave-{0..5}-execution/`) plus git history for both
skill files. Evidence base for `2026-07-17-program-retrospective.md` and
`2026-07-17-wave-skills-promotion-packet.md`. All six end-of-run syntheses
were complete; wave-0 predates the "Skill signal" taxonomy (it used
"Skill-abstraction signal" / "Pilot verdict" framing).

## Skill version timeline

- `oat-wave-execute`: did not exist for wave-0 (hand-rolled wrapper pilot) →
  "EXTRACT before wave 2" ruled at wave-1 synthesis → v1.0.0 (wave-2 commit
  `4eafd540`; rules 1–7 = wave-1's seven adjustments) → 1.1.0 (wave-2
  synthesis) → 1.1.2 (mid-wave-2 hotfix: closeout ordering) → 1.2.0 (wave-3;
  rules 8–9) → 1.2.1 (wave-3 synthesis) → 1.3.0 (wave-4: pairwise
  write-surface intersection; script-owned bootstrap logs) → 1.3.1 (wave-4:
  workarounds retired after upstream 0.1.65) → **1.4.0 (current; ran wave-5)**.
- `oat-wave-program`: created for wave-3 (`08ba22cb`); dogfooded as 1.0.0
  across new/refresh/wave-close modes; **still 1.0.0 — never bumped**.

## Signal ledger

| Wave | Signal                                                                                                   | Type                    | Ruling                                                             |
| ---- | -------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| 1    | Drift-refresh recon is mechanical, stable prompt shape                                                   | strengthens             | adopted (extraction ruling)                                        |
| 1    | Wave skill must own gate-prompt template + scaling                                                       | strengthens             | rule 6, v1.0.0                                                     |
| 1    | Hand-copied wrapper freezes conventions (counter: gates caught the defects anyway — value is cycle time) | contradicts/strengthens | adopted; judgment stays orchestrator-owned                         |
| 1    | Branch naming belongs in tooling                                                                         | strengthens             | rule 1, v1.0.0                                                     |
| 1    | Cross-model lane-selection rule is codifiable                                                            | strengthens             | standing selection rule                                            |
| 1    | Bundle STOP disposition brief element                                                                    | strengthens             | brief template                                                     |
| 1    | Expected-churn briefing prevents false STOPs                                                             | strengthens             | rule 4, v1.0.0                                                     |
| 1    | Runtime-probe + weaker-anywhere review mandates                                                          | strengthens             | adopted; formalized wave-4 as adversarial probes                   |
| 1    | Programmatic SHA handoff                                                                                 | strengthens             | rule 5, v1.0.0                                                     |
| 2    | Verify against plan files, not the program artifact                                                      | strengthens             | validated, keep                                                    |
| 2    | Recon must audit drift-check FILE COVERAGE vs scope                                                      | gap                     | 1.1.0                                                              |
| 2    | Bounded plan gate fits timeout                                                                           | strengthens             | validated                                                          |
| 2    | Provider-pinned review wording in templates                                                              | gap                     | 1.1.0 (provider-neutral)                                           |
| 2    | "Background an inline step" lanes need direct-caller-audit budget                                        | gap                     | 1.1.0                                                              |
| 2    | Region-level churn note → named brief element; DoctorJsonResponse checklist                              | strengthens             | 1.1.0 + adjustment 6a                                              |
| 2    | Silent no-op table edits (oxfmt re-padding)                                                              | gap                     | rule 9; validated wave-3                                           |
| 2    | Wave-scale final review exceeds fixed gate timeout                                                       | gap                     | mitigated via rules 6+8; upstream configurable timeout unconfirmed |
| 3    | Generated runbooks inherit doc drift (verify-commands pass)                                              | gap                     | upstream feedback — OPEN at program end                            |
| 3    | Singleton groups invalid; solo finale ungrouped                                                          | gap                     | 1.2.1; reconfirmed wave-5                                          |
| 3    | Scaffold state hand-advancing                                                                            | gap                     | 1.2.1 → superseded by upstream 0.1.65 → 1.4.1 downgrade queued     |
| 3    | MCP-lane addendum (snapshot+tests move together)                                                         | strengthens             | 1.2.1                                                              |
| 3    | Composition missed p01∩p02 overlap — intersect ALL write surfaces                                        | gap                     | 1.3.0                                                              |
| 3    | Disposition-verification review framing                                                                  | strengthens             | 1.2.1                                                              |
| 3    | Bootstrap-log relocation belongs in the script                                                           | gap                     | 1.2.1; confirmed working 1.3.0                                     |
| 3    | Generalize lint-staged ignore-filter guard to every single-glob task                                     | gap                     | 1.2.1                                                              |
| 3    | Integration gates BEFORE group bookkeeping (format race)                                                 | gap                     | 1.2.1                                                              |
| 3    | Final-gate row-stomp (3rd occurrence)                                                                    | upstream                | open through wave-4; tentatively closing wave-5                    |
| 3    | Rename/refactor purity bar (diff vs original)                                                            | strengthens             | 1.2.1                                                              |
| 4    | Upstream 0.1.65 landed stdin/backlog-new/scaffold fixes                                                  | feedback                | closed; workarounds retired (1.3.1)                                |
| 4    | Drift reconciliations must be NON-narrowing, recorded once                                               | gap                     | 1.4.0                                                              |
| 4    | Adjudicate deferrals against the plan's own scope fences; enumerate sub-writes in compound done-criteria | strengthens/gap         | 1.4.0 plan-author guidance                                         |
| 4    | Conflict-resolution contract (build+suites in worktree; commit-stat; never `git add -A`)                 | gap (HIGH)              | 1.4.0; "validated by fire"; no recurrence wave-5                   |
| 4    | Cumulative-since-plan-commit churn manifests                                                             | note                    | 1.4.0                                                              |
| 4    | Shared-doc enum accretion ("merge, don't append")                                                        | gap                     | 1.4.0 guidance                                                     |
| 4    | `.oat/config.json` intermittent revert                                                                   | upstream                | OPEN — `BL-260715-investigate-oat-config-json`                     |
| 4    | Merge-first external branches (#151: 26-file predicted → 7-file auto)                                    | strengthens             | validated observation                                              |
| 4    | Adversarial-probe reviewer briefs (Critical found ONLY by probe)                                         | strengthens             | 1.4.0, standing                                                    |
| 4    | Croner named-job leak (`runtime.close()`)                                                                | untagged                | backlog note; no confirmed ID                                      |
| 5    | Scaffold placeholder fix → Step 3.2 verify-only                                                          | contradicts             | **queued 1.4.1**                                                   |
| 5    | Coverage-audit catches drift-command gap 3rd consecutive wave                                            | strengthens             | keep verbatim                                                      |
| 5    | Bootstrap sync commits delete tracked provider views (27 files)                                          | gap                     | **queued 1.5.0 + upstream**                                        |
| 5    | Config-revert forensics: exact blob, workspace oat 0.1.1 suspect, isolation non-repro                    | upstream                | OPEN, evidence in BL-260715                                        |
| 5    | Fan-in integration gates load-bearing (caught gate-only race)                                            | strengthens             | **promote to named rule (queued)**                                 |
| 5    | Wrong-branch merge via cwd persistence                                                                   | gap                     | **queued 1.4.1** (pwd+branch assert)                               |
| 5    | p08 deviation adjudication handled self-inconsistent plan                                                | worked-well             | validates 1.4.0 machinery                                          |
| 5    | Fix dispositions need a minimal STORED verification record                                               | gap                     | **queued (unversioned)**                                           |
| 5    | Row-stomp: 2nd consecutive clean gate                                                                    | —                       | closing pending one more observation                               |
| 5    | Prefer resumed-handle fix continuation when alive                                                        | note                    | packet documentation note                                          |

## Queued but unshipped (absent from 1.4.0)

1. **1.4.1** — Step 3.2 scaffold-placeholder check becomes verify-only (oat ≥0.1.65).
2. **1.4.1** — Mandatory `pwd` + `git branch --show-current` assert immediately before every `git merge`.
3. **1.5.0 + upstream** — `bootstrap-group.sh` verifies provider-view parity with the root checkout; merge choreography adds sync-commit content inspection before dispatch.
4. **Unversioned** — "Integration gates after every fan-in" promoted from practice to a named standing rule.
5. **Unversioned** — Every fix disposition (incl. root-verified bounded fixes) requires a minimal stored verification record.
6. **Docs-only** — Prefer resumed-handle over fresh same-target agent for fix continuations when the handle is alive.

## Upstream / CLI-absorption status

| Item                                                                        | Status at program end                              |
| --------------------------------------------------------------------------- | -------------------------------------------------- |
| Gate exit-code bug (0.1.55)                                                 | closed (0.1.59 retest clean)                       |
| Resolver `--candidate-model`/`--preferred` conflict                         | unresolved/untracked since wave-0                  |
| Scaffold placeholder tokens                                                 | fixed 0.1.65; field-verified ×2                    |
| Gate timeout discards completed artifact / configurable per-target timeout  | mitigated at skill layer; upstream ask unconfirmed |
| Gate launcher stdin hang                                                    | fixed 0.1.65; workaround retired                   |
| `oat backlog new` bug                                                       | fixed 0.1.65                                       |
| Reviews-row stomp                                                           | tentatively closing (2 clean gates on 0.1.65)      |
| Runbook verify-commands pass (doc drift)                                    | OPEN                                               |
| `.oat/config.json` revert (exact blob `4dd18f37`; 12+ catches, 0 committed) | OPEN — BL-260715, operator-owned                   |
| `--scope all` flag-placement drift (recurred ×2)                            | in-repo fixes only; structural fix unconfirmed     |
| Bootstrap sync-commit provider-view deletion                                | OPEN — new wave-5                                  |

## Backlog candidates never confirmed filed (staleness-triage input)

Atomic frontmatter merge (W1 p02 TOCTOU) · Slack `createMemory` idempotency
key (W1) · configurable main-listener host / loopback flip (W1) ·
`resolveSafePath` leading-`..` over-breadth (W1) · W2 p01 deferred orderings +
catch-up failure-path test + sticky `lastError` · W2 denylist→allowlist
subprocess seams · W2 service-install 6-way mirror refactor · W2 eviction
hardening · W3 help-manifest↔option parity · W3 quality-suite schema-parse
enforcement · W4 api.md op-enum consolidation · W4 Croner named-job leak.
(Several likely overlap the BL-260713 crop — reconcile at triage.)

## Program numbers (as recorded in logs)

W0: 3 phases/4 tasks; every review layer found ≥1 real issue. W1: 12/12
lanes, 10/10 round-one, 0 fix loops, 0 conflicts. W2: 7/7 round-one, 0
incidents (vs W1's 4); cumulative cross-model catches 11. W3: 7/7 round-one;
p-rev1 failed round 1 then passed; 7 cross-model catches; 3,244 tests. W4:
9/9 merged; 6 round-one + 3 single-round fix loops; 1 conflict episode
(resolved+verified); 7 genuine catches; 3,295→3,395 tests; churn-manifest
streak 32 lanes. W5: 9/9 round-one (first perfect wave) + 2 same-day fix
loops; final gate blocked once on process honesty (remediated same-day);
config-assert 7/7; 0 row-stomps; 0 placeholder hand-fixes; 0 conflicts
across 10 merges.
