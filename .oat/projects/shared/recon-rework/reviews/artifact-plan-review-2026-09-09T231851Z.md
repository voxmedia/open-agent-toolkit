---
oat_generated: true
oat_generated_at: 2026-09-09T23:18:51Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/recon-rework
---

# Artifact Review: plan

**Reviewed:** 2026-09-09T23:18:51Z
**Scope:** Full current recon-rework plan, quick workflow, with upstream discovery and lightweight design.
**Worktree / head:** `/Users/tstang/orca/workspaces/open-agent-toolkit/recon-rework` at `daa07edc31421f93735feb5b07d1670d8b2c45c2`.
**Review method:** Direct current-session review, explicitly requested by Thomas. This reviewer authored the original draft; this is not a fresh-context independent review. The initially delegated reviewer was interrupted at the user's request before producing an artifact. No delegated findings were used.
**Evidence:** Seven current project documents, the prior archived review, the canonical backlog item, and the relevant production contracts, worker instructions, fixtures, and validation paths identified below.

## Summary

The plan retains the intended economical per-wave selection and caller-owned judgment, and most prior review corrections are present. Two integration gaps remain: the proposed additional reconciliation has no defined composition with the existing single-terminal-reconciliation contract, and the worker-mode correction copied an incorrect contradiction-resolution mapping from the prior review. Both require planning changes before implementation; neither requires reopening product discovery or replacing the overall routing approach.

Findings: 0 critical, 2 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **I1 — Define conditional reconciliation without violating the retained terminal-reconciliation contract** (`.oat/projects/shared/recon-rework/plan.md:334`; upstream `.oat/projects/shared/recon-rework/design.md:156`).
  - Issue: The plan requires a standard-profile success case with a stronger conditional reconciliation, both when that wave activates and when it does not. It also preserves required profile passes and existing reconciliation invariants (`plan.md:280-293`, `design.md:185-202`). Standard already requires a reconciliation pass. If the conditional wave is additional to that pass, two completed reconciliation results are rejected; if it is the only reconciliation, the non-triggered branch cannot achieve standard. No task specifies mutually exclusive alternatives, a different typed output for the escalation, or another composition that makes both branches valid.
  - Source evidence: `validate-packet.mjs:867-903` counts every `recon.review-result` with `reviewKind: reconciliation` and requires exactly one complete terminal result for standard/thorough. Extra results produce `SHADOW_RECONCILIATION`, irrespective of their approved conditional lane. `validate-packet.mjs:2058-2087` uses this result for review bindings and ledger-transition validation. `reconcile-ledger.mjs:64-80` also rejects nested reconciliation inputs and requires completed semantic/adversarial/coverage results; it is not a general-purpose stronger synthesis pass immediately after gathering.
  - Verification: A valid standard v1 fixture passed. Adding a second complete reconciliation with a unique approved conditional wave, lane, path, artifact ID, digest, and refreshed approval produced exactly `SHADOW_RECONCILIATION`. This is a probe of the existing contract the design says to retain, not a claim to have tested unimplemented v2 code.
  - Impact: The central escalation example leaves the implementer choosing between an invalid packet and an unplanned relaxation of a protection against shadow ledger transitions.
  - Fix: Specify the exact successful topology and artifact types for both trigger outcomes before implementing p02. Prefer retaining one terminal reconciliation and giving the optional investigation an appropriate existing evidence-producing role; alternatively define a genuinely mutually exclusive selection of the terminal pass with complete non-triggered accounting. Preserve all existing ledger, review-independence, and shadow-reconciliation protections. Do not simply remove the count guard. Name any necessary producer/consumer changes in the task's write set, and require both complete v2 branches plus a rejected shadow-result control through production packet validation. The requirement is bounded escalation, not necessarily a second artifact of kind `reconciliation`.

- **I2 — Map contradiction-resolution to the existing adversarial worker/brief contract** (`.oat/projects/shared/recon-rework/plan.md:114`).
  - Issue: Common Execution Rules map both `reconciliation` and `contradiction-resolution` to worker mode `reconcile`. The latter is incompatible with the preserved evidence contract: contradiction-resolution uses an adversarial brief and seeks discriminating evidence, while `reconcile` consumes review dispositions and produces a ledger candidate. This instruction was copied from the prior review's recommended fix; its presence does not resolve the underlying compatibility question.
  - Source evidence: `validate-packet.mjs:970-982` explicitly requires an `adversary` brief for `reviewKind: contradiction-resolution`. `create-review-brief.mjs:198-219` accepts only `verify`, `adversary`, and `coverage`; `reconcile` is rejected. The existing fake workflow already pairs `contradiction-resolution` with `adversary` (`tests/helpers/fake-recon-run.mjs`, `resultSpecs`). The canonical worker's `adversary` mode searches counterevidence without prior-review conclusions, whereas its `reconcile` mode applies completed review outcomes (`.agents/agents/recon-worker.md`, Mode Behavior).
  - Verification: The real brief producer accepted the same fixture inputs under `adversary` and rejected `reconcile`. The packet consumer independently establishes the required contradiction-resolution brief mode; this is not merely an inference that all worker modes must equal all brief modes.
  - Impact: Following the new mapping produces a contradictory worker assignment or an invalid brief/output path for thorough-profile and conditional contradiction-resolution work. The fake workflow could continue passing while the prose controller dispatches the wrong assignment.
  - Fix: Map `contradiction-resolution` to `adversary`, retaining its distinct manifest wave mode and result `reviewKind`; keep only `reconciliation` mapped to `reconcile`. Have p02-t03 and p03-t01 check that this mapping composes with the existing brief producer, worker input restrictions, and packet validator. Keep the seven-mode worker vocabulary closed. Correct the prior review disposition rather than preserving its erroneous suggestion as a requirement.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `implementation.md`, `state.md`, `handoff.md`, `references/source-context.md`, `reviews/archived/artifact-plan-review-2026-09-09T163711Z.md`, and `BL-260908-restore-recon-s-cheap-fan-out.md`. Production evidence includes recon's skill, profile/worker/packet contracts, canonical worker, contract validator, packet validator, review-brief producer, reconciliation producer, and fixture/fake-workflow consumers. Repository instructions, package scripts, decision CLI help, and reviewer v1.2.4 were also consulted. Spec is absent by design for this quick project.

### Requirements Coverage

| Requirement                                                | Status          | Notes                                                                                                                      |
| ---------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Inexpensive evidence collection and caller-owned judgment  | Covered by plan | p03-t01 explicitly owns the opening intent and named responsibility split.                                                 |
| Independent per-wave model/effort with no run-wide maximum | Covered by plan | p01-t02, p02-t01 and p03-t01 own representation, preview/checking, and the controller.                                     |
| Bounded checking/challenge classified by actual work       | Covered by plan | Defaults are qualified by assignment, with narrowing/escalation and shared guidance retained.                              |
| Preapproved bounded escalation with honest outcomes        | Partial         | I1 requires a concrete topology that composes with the retained terminal ledger contract.                                  |
| All existing modes and profiles remain usable              | Partial         | I2 corrects the contradiction-resolution worker mapping.                                                                   |
| Approved selection without invented execution proof        | Covered by plan | Model capability qualification remains caller/guidance-owned; structural checks do not pretend to rank opaque model names. |
| Manifest v2 plus unchanged v1 evidence and legacy approval | Covered by plan | Original-shape/fingerprint validation precedes normalization; mixed versions and rejection controls are assigned.          |
| Quick evidence-packet framing                              | Covered by plan | Explicitly assigned to profile prose and public docs.                                                                      |
| Governing decisions, distribution and verification         | Covered by plan | Decision ownership, asset packaging, version bumps and focused/full verification are assigned.                             |

### Prior Review Dispositions

The previous report had 3 Important, 5 Medium and 4 Minor findings. Its recommendations are evidence to recheck, not authoritative implementation requirements.

| Prior finding                       | Assessment of current artifacts                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| I1 — below-floor interpretation     | Addressed: design and plan state the structural/identity interpretation and closeout limitation.       |
| I2 — quick-profile framing          | Addressed in p03-t01 and p03-t02.                                                                      |
| I3 — decision-task verification     | Addressed: commands, one-time creation action and inherited-warning baseline are explicit.             |
| M1 — responsibility split           | Addressed in p03-t01.                                                                                  |
| M2 — new controller emits v2        | Addressed in p03-t01.                                                                                  |
| M3 — wave/worker vocabularies       | Not resolved correctly: the prior suggested contradiction mapping was wrong; see I2 above.             |
| M4 — isolated test HOME             | Addressed by the documented per-command test invocation.                                               |
| M5 — generated docs index ownership | Addressed with conditional ownership and regeneration in p03-t02.                                      |
| m1 — planning checklist             | Present, preserving explicitly deferred readiness choices.                                             |
| m2 — source-map anchors             | Updated at the declared inspection commit; production recon sources inspected directly in this review. |
| m3 — actual pins and smoke coupling | Explicit pin files and reader-sameness command are present.                                            |
| m4 — coupled guidance task          | Intentional coupling is explained; no further split is required by this review.                        |

### Necessity Assessment

No additional necessity finding is warranted solely because this is a prose skill or because its fixtures use a fake provider. The manifest version change serves an existing closed persisted format and its real validator/rendering consumers. The small preview/check helper has a named agent consumer and avoids duplicating exact-target checks. Bounded escalation is an explicit requirement; I1 asks for a coherent minimal composition rather than adding another general orchestration layer. The current no-launcher/no-price-database boundaries should remain.

Passing fixture tests will demonstrate the helpers' deterministic behavior, not actual provider launches or semantic adequacy. The plan already states that limitation. This review does not require a new provenance system, mandatory complexity ledger, broad provider benchmark, or live launch during planning.

## Verification Commands

Executed from the recon-rework root:

- `git status --short --branch` and `git rev-parse HEAD`: clean baseline at the SHA above.
- `pnpm run --silent cli:source -- project scope .oat/projects/shared/recon-rework --format value`: exit 0, `shared`.
- `pnpm run --silent cli:source -- project validate-plan --project-path .oat/projects/shared/recon-rework --json`: exit 0, `valid: true`; structural metadata check only.
- `pnpm run --silent cli:source -- decision new --help`: exit 0; the planned creation flags exist. No decision was created.
- The probe below: exit 0 with the asserted accepted/rejected categories. It uses production functions and existing synthetic fixtures, writes only its own temporary fixture, and removes that fixture afterward.

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createPacketFixture, approveExecution } from './.agents/skills/recon/tests/fixtures/packet-fixture.mjs';
import { hashFile } from './.agents/skills/recon/scripts/lib/canonical-json.mjs';
import { validatePacket } from './.agents/skills/recon/scripts/validate-packet.mjs';
import { createReviewBrief } from './.agents/skills/recon/scripts/create-review-brief.mjs';
const f = await createPacketFixture({profile:'standard'});
try {
 const valid = await validatePacket(f.packetRoot);
 assert.equal(valid.valid,true,JSON.stringify(valid.errors));
 console.log('standard baseline: valid');
 const input = {id:'brief-mode-probe',createdAt:'2026-08-31T00:03:00.000Z',manifest:f.manifest,ledger:f.ledger};
 console.log('adversary brief mode:',createReviewBrief({...input,mode:'adversary'}).mode);
 assert.throws(()=>createReviewBrief({...input,mode:'reconcile'}));
 console.log('reconcile brief mode: rejected');
 const extra = JSON.parse(await readFile(join(f.packetRoot,'reviews/reconciliation.json'),'utf8'));
 extra.id='review-z-conditional-reconciliation';extra.reviewerLane='lane-conditional-reconciliation';
 const path='reviews/conditional-reconciliation.json';
 await writeFile(join(f.packetRoot,path),JSON.stringify(extra));
 f.manifest.artifacts.push({path,digest:await hashFile(join(f.packetRoot,path))});
 f.manifest.execution.waves.push({waveId:'wave-conditional-reconciliation',mode:'reconciliation',taskClass:'intelligent-recon',conditional:true,lanes:[{laneId:extra.reviewerLane,scope:'packet/reconciliation',writeRoot:path}]});
 f.manifest.execution=approveExecution(f.manifest.execution);
 await f.persist();
 const rejected=await validatePacket(f.packetRoot);
 console.log('additional approved completed reconciliation:',JSON.stringify({valid:rejected.valid,codes:[...new Set(rejected.errors.map(e=>e.code))]}));
 assert.equal(rejected.valid,false);
 assert.ok(rejected.errors.some(e=>e.code==='SHADOW_RECONCILIATION'));
}finally{await rm(f.tempRoot,{recursive:true,force:true});}
NODE
```

After planning corrections, verify the mode mapping with the real brief producer and specify a representative v2 packet for each conditional branch through `validatePacket`. Those future tests must retain a rejection control for an extra shadow reconciliation. No v2 implementation tests were run in this artifact review because the implementation does not exist.

## Dispatch Audit

The project resolver selected the following target for the initial delegated attempt. Thomas then explicitly requested direct review, and that reviewer was interrupted. This stamp does not describe the author or model controls of the completed direct review:

```text
Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high
```

The final review was performed in the current caller session under the user's direct instruction; no independent runtime-effort observation is claimed. No reconnaissance workers were used for the completed review, no delegated review artifact was adopted, and no dispatch record was written.

## Recommended Next Step

Run `oat-project-review-receive` for this artifact and resolve I1/I2 in the design/plan before implementation. Preserve the prior review event and record this one as `received`; do not mark readiness or review passed. The remaining design review, configured gates and readiness choices stay with the existing quick-start continuation.
