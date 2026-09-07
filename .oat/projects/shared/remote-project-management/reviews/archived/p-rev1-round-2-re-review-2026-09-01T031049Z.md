---
oat_generated: true
oat_generated_at: 2026-09-01T03:10:49Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: manual
oat_review_round: 2
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 1a11231c8c72ae7aeb32627858c6ca3c0c0a1d7a
oat_review_range: 3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..1a11231c8c72ae7aeb32627858c6ca3c0c0a1d7a
---

# Code Re-review: p-rev1 Round 2

**Reviewed:** 2026-09-01T03:10:49Z
**Scope:** Corrective Revision 1, tasks `prev1-t01` through `prev1-t04`, including bounded fix commit `1a11231c8c72ae7aeb32627858c6ca3c0c0a1d7a`
**Reviewed base:** `3a304e20c995f6d10f7de5d76430ef7d7c3f93fe`
**Reviewed full head:** `1a11231c8c72ae7aeb32627858c6ca3c0c0a1d7a`
**Files reviewed:** 18 implementation/test files plus 1 prior review artifact as history
**Commits:** `3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..1a11231c8c72ae7aeb32627858c6ca3c0c0a1d7a` (6 commits)
**Verdict:** BLOCK — Phase 4 must remain blocked
**Dispatch:** request `remote-project-management-p-rev1-review-2-20260901T0259Z`; target `oat-reviewer-gpt-5-6-sol-high`; model axis `selected:gpt-5.6-sol`; effort axis `selected:high`; policy/ceiling `high`

## Summary

The bounded fix closes the public project-publication carrier and unbound-create description-policy findings, and it replaces thrown-error scraping with a durable digest-bound preview/apply state transition. The phase still does not pass: verified managed-section updates materialize the full remote body as the writable baseline, create handoff can durably claim an attempt before its action exists, and the new `needs-review` envelope does not emit the structured preview required for informed approval.

Findings: 2 critical, 1 important, 0 medium, 0 minor

**Reconnaissance:** not-attempted

## Findings

### Critical

- **Managed-section verification advances the baseline with the full remote body, so the required governed-value regression remains incomplete** (`packages/cli/src/commands/pjm/remote/service.ts:1581`)
  - Issue: The verified-update path calls `baselineFromSnapshot()`, which unconditionally copies `snapshot.issue.description` into `baseline.fields.description` at `service.ts:2448-2471`. In managed-section mode the snapshot intentionally retains the complete remote body, while the reconciliation baseline must retain only the uniquely governed managed content. The new default-run regression checks operation ID and revision fields at `index.test.ts:1384-1395` but never asserts governed baseline values, so it passes over this defect. A direct production-helper reproduction with an unchanged managed section and a new remote-owned prefix throws `Remote mutation has a same-field reconciliation conflict`, even though surrounding remote content must be preserved and ignored by managed-content reconciliation.
  - Impact: Harmless remote-owned edits outside the OAT section become false same-field conflicts; even an unchanged managed section is represented differently from the local governed value. This violates the P0 managed-content and three-way reconciliation contract and leaves prior Critical finding 4 only partially closed.
  - Fix: Materialize baseline fields through the effective description policy. Keep the complete body in the snapshot, but for `managed-section` extract and persist only the validated managed content (and reject malformed/missing boundaries); use the full body only for `replace`. Extend the default-run verified-update/restart regression to assert all governed baseline values and add a reconcile case where surrounding remote-owned prose changes without producing a conflict or outbound write.
  - Requirement: FR5, FR7, FR9, NFR3

- **Create handoff records `attempt-started` before the durable current action exists** (`packages/cli/src/commands/pjm/remote/service.ts:764`)
  - Issue: Both approved-preview create and immediately authorized create reach `attempt-started` with an appended attempt before `writeCurrentAction()` runs at `service.ts:782`. If action persistence fails or the process stops in that window, the journal says a remote attempt started and requires reconciliation, but `continueOperation()` fails at `service.ts:1052-1055` because no current action exists. The store's own append-only evidence test demonstrates the intended safe order—persist the action first, then transition to `attempt-started`—at `store.test.ts:444-488`.
  - Impact: A pre-effect local interruption strands an unbound create in an unrecoverable/ambiguous state, despite no host action having been emitted. The system cannot safely resume, retry, or perform authoritative reconciliation against an unbound identity, violating the P0 create-provenance and restart-safety contract.
  - Fix: Introduce a restart-safe handoff substate/protocol: persist the exact append-only/current action while the operation is still planned or authorized, then atomically or recoverably transition to `attempt-started` before returning it to the host. On restart, reconcile action evidence and journal state deterministically. Add injected-failure/restart tests for every boundary between operation creation/authorization, action evidence/current-pointer persistence, attempt transition, and envelope return for both direct and preview-approved creates.
  - Requirement: FR11, FR14, NFR2, NFR3

### Important

- **The approval response emits only operation/digest identifiers, not the structured preview** (`packages/cli/src/commands/pjm/remote/service.ts:2014`)
  - Issue: `approvalPreviewEnvelope()` returns provider/target/authority plus recovery strings containing the operation ID and digest, while `RemoteCommandEnvelope` has no preview field (`output.ts:13-29`). The exact structured preview is persisted in the operation, but neither JSON nor human output emits its affected fields, rendered values/hashes, policy/freshness inputs, or observed revision. This conflicts with `design.md:1265-1273` (preview persisted and emitted in JSON) and NFR6's requirement that mutation previews identify provider, target, operation, affected fields, authority, and revision.
  - Impact: The new two-command apply protocol is mechanically digest-bound, but the public command does not provide an inspectable preview on which a user or host can make an informed fresh-approval decision. This leaves prior Critical finding 2 functionally improved but not fully aligned with the user-visible preview contract.
  - Fix: Add a bounded sanitized preview member to the command envelope (or an equally direct structured inspection response) and render it in both JSON and human modes. Include operation, affected field mask, safe rendered values/hashes, effective authority, and revision/freshness evidence. Add default-CLI JSON/human tests that approve only the emitted persisted preview and never read internal journal files.

### Medium

None

### Minor

None

## Prior Critical Finding Closure

| Prior Critical finding                                  | Disposition                 | Re-review evidence                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public project publication carrier                      | Closed                      | Public `--project-publication-file` wiring is validated in `index.ts:215-289`; `readProjectPublication()` accepts only bounded `title`/`description`/`priority`; the default command completes authoritative read-back and project binding/baseline materialization in `service.test.ts:845-1048`. |
| Persisted structured preview/apply                      | Partial / Important remains | Planned operations persist `approvalPreview`, apply revalidates load-bearing inputs, and error-regex scraping is gone. The public response still emits only IDs/digest, not the structured preview required by design/NFR6.                                                                        |
| Description-policy enforcement for unbound create       | Closed                      | `prepareCreate()` resolves policy before `buildCreateProjection()`; `none` omits description, `managed-section` builds the bounded managed block, and `replace` receives a create approval floor. Default-run project/backlog matrix coverage is at `service.test.ts:1051-1229`.                   |
| Default-run verified-update/baseline restart regression | Partial / Critical remains  | The default runner now completes mutation, read-back, crash-after-baseline recovery, and replay rejection. It does not assert governed baseline values, and production stores the complete remote body instead of managed content, producing false conflicts.                                      |

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, prior review `reviews/p-rev1-review-2026-09-01T020434Z.md`, the authoritative six-commit range, and all 18 changed implementation/test files.

### Requirements Coverage

| Requirement | Status               | Notes                                                                                                                                              |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR4         | implemented in scope | Public backlog and explicit project publication reach the provider-neutral create lifecycle.                                                       |
| FR5         | partial              | Initial and update state are durable, but managed-section baseline values are not the agreed governed values.                                      |
| FR7         | partial              | Create modes are enforced; verified managed-section baseline semantics remain incorrect.                                                           |
| FR8         | partial              | Preview/apply is persisted and digest-bound, but the public response does not emit the inspectable structured preview.                             |
| FR9         | partial              | Managed-section baseline representation creates false three-way conflicts.                                                                         |
| FR11        | partial              | Update pre-read/read-back are guarded; create action handoff has a pre-effect durable-state gap.                                                   |
| FR12        | implemented in scope | Whole-field suppression remains bounded and typed; no raw suppressed values were introduced.                                                       |
| FR14        | partial              | Create intent is durable, but action-handoff failure can strand it as an unrecoverable started attempt.                                            |
| FR16        | implemented in scope | Changed code remains provider-neutral and uses bounded live capability evidence.                                                                   |
| FR18        | implemented in scope | Project publication consumes only the explicit normalized carrier and does not infer project artifacts.                                            |
| NFR1        | implemented in scope | All creates/updates use explicit projections and the universal bounded outbound safety gate; no broad scan or general DLP behavior was introduced. |
| NFR2        | partial              | Most drift/policy/approval paths fail closed; the create handoff gap leaves misleading durable attempt state.                                      |
| NFR3        | missing              | Managed baseline recovery is semantically wrong and create handoff is not restart-safe at the pre-effect boundary.                                 |
| NFR6        | partial              | The response identifies target/authority and digest but omits the structured affected-field/revision preview.                                      |
| NFR8        | implemented in scope | No provider-native tool names, schemas, catalogs, or CLI dialects were added.                                                                      |

### Extra Work (not in declared requirements)

None.

### Bounded Safety/Portability Check

The authoritative changed production/test surface was checked for the approved boundary. It introduces no repository/worktree/Git-history secret scan, credential-value parser/general-DLP claim, native MCP tool name or schema, captured provider catalog, or provider-specific CLI dialect. The project publication file is an explicit caller-selected normalized projection carrier, not an inferred scan.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/authority.test.ts src/commands/pjm/remote/service.test.ts src/commands/pjm/remote/index.test.ts src/commands/pjm/remote/schema.test.ts src/commands/pjm/remote/external-action.test.ts src/commands/pjm/remote/credential-safety.test.ts src/commands/pjm/remote/outbound-projection-safety.test.ts src/commands/pjm/remote/create-binding.test.ts src/commands/pjm/remote/lifecycle.test.ts src/commands/pjm/remote/purpose-policy.test.ts src/commands/pjm/remote/local-projection.test.ts src/commands/pjm/remote/reconcile.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/association.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/store.test.ts src/commands/pjm/remote/__integration__/lifecycle.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli build
git diff --check 3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..1a11231c8c72ae7aeb32627858c6ca3c0c0a1d7a
```

Observed: 17 test files passed, 221/221 tests passed; CLI type-check passed; CLI build passed; range diff check passed. A direct production-helper reproduction also confirmed that an unchanged managed section plus changed surrounding remote-owned prose currently throws a same-field reconciliation conflict.

## Recommended Next Step

Run `oat-project-review-receive` to convert the two Critical and one Important findings into bounded corrective tasks. Do not begin Phase 4 until a fresh `p-rev1` review passes with zero Critical and zero Important findings.
