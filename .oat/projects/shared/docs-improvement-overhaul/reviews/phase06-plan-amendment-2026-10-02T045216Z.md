---
oat_generated: true
oat_generated_at: 2026-10-02T04:52:16Z
oat_review_scope: plan-amendment
oat_review_type: artifact
oat_review_invocation: auto
oat_project: .oat/projects/shared/docs-improvement-overhaul
---

# Artifact Review: plan-amendment

**Reviewed:** 2026-10-02T04:52:16Z
**Scope:** Fresh review of the whole-site reader/conservation/configuration/scenario amendment; p01 implementation defects and later review bookkeeping are excluded.
**Files reviewed:** 4 amended artifacts, with discovery and repository instructions as context.
**Commits:** `52190849b5dfbb023e8c0dc93cb10e27d62ad3b4..6145054067bef937d74cf7e952a0c56da67f4264`; authored head resolved to `6145054067bef937d74cf7e952a0c56da67f4264`.

## Summary

The amendment has a coherent six-phase dependency chain and proportionate reader, semantic-conservation, scenario and configuration evidence. It preserves publication/removal authority, distinguishes implementer smoke from independent final computer use, and treats unavailable browser/GitHub acceptance honestly. One bounded task-scope gap should be resolved before the strengthened p04 task runs; current-state summary drift is a smaller artifact-alignment issue.

Findings by severity: 0 critical, 0 high, 1 medium, 1 low

Configured dispatch: `oat-reviewer-gpt-6-1-sol-high`, model axis `selected:gpt-6.1-sol`, effort axis `selected:high`, policy/ceiling `high`, resolved in `/tmp/docs-phase06-amendment-dispatch.json` with no notices. Runtime identity is not independently asserted. Review stayed inline; no nested agents, source edits, code tests, publication or UI actions.

## Findings

### Critical

None

### High

None

### Medium

- **M1: Give the scenario guard and its evidence an explicit p04-t03 file scope** (`.oat/projects/shared/docs-improvement-overhaul/plan.md:235`)
  Issue: The strengthened verification at line 239 requires modifying the validator/tests to reject missing and wrong-section scenario markers, and recording a non-author audit of every scenario/invocation. However, this task's Files list permits only guide pages and index Contents, and its Format command at line 241 covers only docs. The validator/test owners are named in p04-t01, not in the task that now must change them; there is also no named durable scenario-audit deliverable. This leaves the phase packet ambiguous about whether to omit the guard/evidence or edit outside its declared task boundaries.
  Fix: Add the existing `apps/oat-docs/scripts/skill-mapping.ts` and `apps/oat-docs/tests/skill-mapping.test.ts` owners (or the exact selected validator/test files) and a project-local scenario-audit report to p04-t03's Files list. Extend its file-scoped format command and include `pnpm docs:test` for the new missing/wrong-section controls. Keep semantic usefulness with the independent audit; no new schema, public CLI or bespoke guide expansion is needed.

### Low

- **L1: Align the current design/plan summaries with the amended execution state** (`.oat/projects/shared/docs-improvement-overhaul/design.md:16`)
  Issue: The design overview still describes five phases with coverage/final acceptance together and states implementation is unauthorized at line 18, while its amendment and Review Status now recognize six phases and separate implementation authorization. The plan's Implementation Complete introduction at line 379 likewise says zero tasks are complete, while its own line 388 directs readers to implementation.md, which records 3/20 complete. These are stale summaries, not missing implementation or grounds to change p01 code.
  Suggestion: Update the design overview to six phases and the current authority boundary, or explicitly label the old authorization text as historical planning context. Replace the plan's zero-complete sentence with a pointer to implementation.md as the authoritative progress ledger. Discovery can remain the intentionally historical upstream context.

## Requirements/Design Alignment

**Evidence sources used:** Quick-mode `discovery.md` as earlier context; complete `plan.md`, `design.md`, `implementation.md` and `state.md` at the authored head; exact amendment delta; canonical reviewer/review-provide instructions; root/docs AGENTS guidance; `deliberate-testing`; root package formatting commands. No spec is required or present for quick mode. Reported prior test/browser successes were read as bookkeeping, not rerun or independently certified here.

### Requirements Coverage

| Amendment requirement                                                         | Status                      | Evidence and limits                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole-site improvement for onboarding developers and adoption decision-makers | Planned                     | p06-t01/t02/t03/t04 connect coverage gaps, actual source-blind navigation, explicit verdicts and a bounded editorial list.                                                                                                                                                   |
| Preserve content/capabilities across p01, migration and later rewrites        | Planned                     | Pre-move p02-t01 capture includes original implementation-base provenance and p01 changes; all-phase conservation tracks additions; p06 reconciliation/source audit/closeout prohibit silent narrowing. Mechanical units explicitly do not prove distinct-fact completeness. |
| Concrete scenario for every eligible skill and valuable invocation examples   | Planned with task-scope gap | p04-t03 defines realistic situations, per-anchor markers, shared-variant selection, independent source verification and missing/wrong-section negative controls; M1 concerns the implementation/evidence owners, not the proof model.                                        |
| Meaningful configuration choices/defaults/tradeoffs                           | Planned                     | p06-t01 names real choice families and supported source provenance; p06-t04 preserves complete key reference and distinguishes verified defaults from unevidenced rationale/recommendations.                                                                                 |
| Durable Codex/Fable consensus without triage user wait                        | Planned                     | p06-t03 records both positions, owner pages, preserved facts and acceptance checks; disagreement preserves content and uses the smaller rewrite. Removal/narrowing still needs user approval.                                                                                |
| Real independent final browser acceptance after editorial work                | Planned, execution pending  | p05-t03 remains implementer Mini smoke; p06-t05 requires actual CUA, committed-build provenance, seven journeys/five visuals and rechecks after fixes. Fable laptop access is conditional; non-author Codex CUA plus labelled Fable nonvisual review is an honest fallback.  |
| Publication remains separate                                                  | Preserved                   | p03-t02 and p06-t05 leave actual GitHub acceptance pending/blocked without authorized publication. No push or merge authority is inferred.                                                                                                                                   |
| Stable task IDs, sequential ownership, review history and final checkpoint    | Aligned                     | All original p01-p05 IDs remain; five p06 tasks yield 20 tasks. Dependency order and exclusive display control are explicit. Final auto-review checkpoint shifts to p06 without making consensus triage user HiLL.                                                           |

### Extra Work (not in declared requirements)

None identified in the amendment. The project-local baseline, consensus, persona and audit records have named consumers in subsequent tasks and final review; they are not permanent frozen-fact CI inputs. The optional CLI completeness check is deliberately bounded rather than automatically authorized.

## Verification Commands

Executed: authored-head resolution, exact-delta inspection and `git diff --check` on the authoritative range, exit 0. No code suites were run; phase 6 and its evidence remain unimplemented. After the small artifact fixes, run:

```bash
git diff --check
pnpm exec oxfmt --check .oat/projects/shared/docs-improvement-overhaul/plan.md .oat/projects/shared/docs-improvement-overhaul/design.md
```

When p04-t03 is implemented, its declared scenario controls should be executed through `pnpm docs:test`, followed by strict `pnpm docs:skills:validate`; this review does not claim those future scripts/evidence have already passed.

## Recommended Next Step

Run the `oat-project-review-receive` skill to reconcile M1 and L1 in the planning artifacts before the affected tasks execute. Do not treat this amendment review as p01 code acceptance or future persona/browser/source-audit proof.
