# Wave Skills Promotion Packet

Handover for upstreaming `oat-wave-execute` + `oat-wave-program` from the
stoa repo into the OAT toolkit. Assembled 2026-07-17 at program end
(operator-agreed at the wave-4 era; scope extended 2026-07-17 with the
explainer-kit integration items). Companion documents:
`2026-07-17-program-retrospective.md` (narrative) and
`2026-07-17-wave-signal-ledger.md` (full evidence ledger).

## 1. What is being handed over

| Asset                    | Where (stoa repo)                                                                                                                                 | Version | State                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `oat-wave-execute` skill | `.agents/skills/oat-wave-execute/` (SKILL.md + `scripts/bootstrap-group.sh` + `assets/wrapper-plan-template.md`, `orchestration-log-template.md`) | 1.4.0   | Promotion candidate; 5 hardening runs; every rule evidence-cited                                                         |
| `oat-wave-program` skill | `.agents/skills/oat-wave-program/` (SKILL.md + `assets/execution-program-template.md`)                                                            | 1.0.0   | Three modes (new/refresh/wave-close) dogfooded; coverage invariant mechanically enforced; session-loss resilience proven |
| Signal ledger            | `2026-07-17-wave-signal-ledger.md`                                                                                                                | —       | Every signal + ruling, waves 0–5                                                                                         |
| Reference program run    | `.oat/repo/reference/external-plans/2026-07-14-execution-program.md` + 6 wave summaries + archived wave projects (S3)                             | —       | Worked example at full scale                                                                                             |

## 2. Queued skill changes (apply during upstreaming — none are in 1.4.0)

**1.4.1 (small, do first):**

1. Step 3.2 scaffold-placeholder fix becomes **verify-only** on oat ≥ 0.1.65
   (upstream substitution landed; keep as a guard, drop the mandatory edit).
2. Merge choreography: mandatory `pwd` + `git branch --show-current` assert
   **immediately before every `git merge`** (closes the cwd-persistence
   wrong-branch failure mode, observed once, recovered clean).

**1.5.0:**

3. `bootstrap-group.sh` verifies **provider-view parity with the root
   checkout** instead of committing whatever worktree `oat sync` produces;
   merge choreography adds a sync-commit content inspection before dispatch
   (wave-5: every worktree's sync commit deleted 27 tracked
   `.codex/agents/*.toml` files; excised manually at all 10 merges).
4. Promote to a named standing rule: **integration gates after every fan-in**
   ("the only detector for cumulative-timing defect classes; never skip on an
   all-lanes-passed wave" — proven by the W5 embed-teardown catch).
5. Fix loop: every fix disposition — **including root-verified bounded
   fixes** — produces a minimal stored verification record (raised by the W5
   final gate blocking on exactly this audit gap).
6. Docs note: prefer **resuming the original implementer handle** for fix
   continuations when it is still alive (cheaper, retains design context);
   fresh same-target agent only when the handle is gone.

## 3. CLI-absorption list (mechanical layer that should sink below the skill)

| Item                                                | Evidence                                                                                                                                                                             | Suggested absorption                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Wave command family (`oat wave new/refresh/close`?) | `oat-wave-program`'s three modes are fully mechanical over the program artifact                                                                                                      | New CLI surface; skill becomes judgment-only                              |
| Singleton-group semantics                           | `validate-plan` already rejects them; the "solo finale = ungrouped phase" encoding lives only in skill prose                                                                         | Document/enforce in validate-plan help                                    |
| Worktree bootstrap contract                         | `bootstrap-group.sh` wraps `oat-worktree-bootstrap-auto` + base verify + STATUS lines + (queued) view-parity check                                                                   | `oat worktree bootstrap-group`                                            |
| Reviews-row stomp                                   | Tentatively fixed in 0.1.65 (2 clean gates); confirm and close the feedback item after one more observation                                                                          | Confirm fix; delete skill step 6.5 restore-watch                          |
| Config-integrity assert                             | 12+ catches of the `.oat/config.json` revert (`BL-260715-investigate-oat-config-json`, open, operator-owned; workspace oat 0.1.1 prime suspect)                                      | Root-cause upstream; until then consider a CLI-level tracked-config guard |
| Still-open upstream feedback                        | Configurable per-target gate timeout; runbook verify-commands pass; `--scope all` flag-placement drift; resolver `--candidate-model`/`--preferred` conflict (untracked since wave-0) | Triage during the promotion project                                       |

## 4. Explainer-kit integration scope (RC-gated — see memory/decision 2026-07-17)

Owned by this promotion project, explicitly out of scope for explainer-kit v1;
build against the **packaged explainer-kit v1 RC** (frozen schemas), never its
source tree:

1. **`program-recap` recipe** (generic `explainer-kit.recipe/v1` format) — the
   multi-project birdseye product; reference implementation: the shipped
   program deck (`.oat/repo/explainers/stoa-wave-program-2026-07/`, published
   at `https://dy4vzrzaexuy5.cloudfront.net/explainers/stoa-wave-program-2026-07/index.html`).
2. **Wave-close / program-close callers** in the wave skills: synthesize a
   fact base from the reconciled program records → invoke via
   `FactBaseBindingV1 {mode:'supplied'}` → output root
   `.oat/repo/explainers/<slug>/`. Publishing stays human-gated.
3. **Personal-wrapper migration** to `ExplainerRunRequestV1` + manifest
   consumption — doubles as explainer-kit's RC acceptance gate (operator-owned
   E2E; their fixture + migration runbook support it).

Sequencing note: explainer-kit's Phase 3 touches the same OAT lifecycle
skills this promotion lands beside — coordinate merge order in the OAT repo.

## 5. Suggested promotion-project shape (OAT repo)

Same handoff pattern as the explainer-kit project: scaffold an OAT project in
an `orca` workspace of the OAT repo with this packet + the two skill sources
copied into `references/`; spec-driven mode. Phase sketch (indicative, the
project owns its own plan): (1) port skills + apply the 1.4.1/1.5.0 queue +
OAT-repo conventions (packs, versioning, release validation); (2)
CLI-absorption decisions (§3) — each is adopt/defer with rationale, not
mandatory; (3) explainer integration (§4) once the explainer-kit RC exists;
(4) validation — dry-run a mini-wave against a fixture repo, then the real
validation is stoa's wave 6 running on the promoted skills.

## 6. Success criteria for the promotion

- The promoted skills run stoa's wave 6 with zero regressions against the
  1.4.0 behavior plus the queued changes applied.
- Every §2 item shipped or explicitly rejected with rationale.
- Every §3 row dispositioned (absorbed / deferred-with-owner / closed).
- §4 lands against the frozen RC with the personal-wrapper E2E green.
- The signal-ledger discipline survives: the promoted skills keep the
  orchestration-log contract and end-of-run synthesis requirement — the
  mechanism that produced all of the above.
