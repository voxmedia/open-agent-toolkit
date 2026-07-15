---
oat_generated: true
oat_generated_at: 2026-07-15T21:21:05Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/gate-execution-hardening
---

# Artifact Review: design

**Reviewed:** 2026-07-15T21:21:05Z
**Scope:** Lightweight design against quick-mode discovery
**Files reviewed:** 2
**Commits:** Not applicable

## Dispatch Audit

Dispatch: scope=design action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=gpt-5.6-sol-high

## Summary

The design covers the requested headless execution contract, budget precedence, reviewer-resolution fixes, liveness probes, and regression fixture matrix with concrete interfaces and failure behavior. Before planning, it should close one tracked-state hygiene risk and make Codex liveness attribution and requirement-to-test coverage explicit.

Findings: 0 critical, 1 important, 2 medium, 0 minor

## Findings

### Critical

None

### Important

- **Transient run markers have no mechanism preventing commits** (`.oat/projects/shared/gate-execution-hardening/design.md:190`)
  - Issue: The marker is intentionally written under the tracked project `reviews/` directory and may survive a gate-process crash, but the design claims it is “never committed” without specifying an ignore rule, local-only storage boundary, or staging exclusion. A dot-prefixed filename is still visible to Git and can be captured by directory-scoped review bookkeeping.
  - Fix: Store markers in an explicitly local-only/ignored location, or add a repository ignore and staging-exclusion contract for `reviews/.pending-gate-*.json`. Add a regression test proving an orphaned marker cannot enter review bookkeeping commits.

### Medium

- **Codex activity evidence is not attributable to the gate child** (`.oat/projects/shared/gate-execution-hardening/design.md:152`)
  - Issue: Claude and Cursor probes use project-scoped directories, while the Codex probe watches the global daily sessions directory. An unrelated Codex session can therefore produce “activity evidence” after gate spawn, conflicting with the discovery requirement that envelopes carry the latest trustworthy activity evidence.
  - Fix: Define evidence scope/correlation explicitly. Prefer a child/session-correlated path when available; otherwise label Codex evidence as ambient runtime activity, include its lower-confidence scope in the envelope, and ensure diagnostics never imply gate-child progress.

- **The fixture matrix is not mapped explicitly to discovery requirements** (`.oat/projects/shared/gate-execution-hardening/design.md:200`)
  - Issue: The test strategy contains strong concrete scenarios, but it does not map discovery requirements 1–4 and the reviewer-resolution additions to named unit, fixture, and manual checks. That makes omissions harder to detect when the plan is generated.
  - Fix: Add a requirement-to-test mapping table covering headless completion safety, budget precedence/bounds, liveness evidence, run-marker behavior, resolver-envelope distinctions, and pre-plan inheritance.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `design.md`, `discovery.md`; `plan.md` and `implementation.md` were read for workflow context only.

### Requirements Coverage

| Requirement                             | Status  | Notes                                                                                         |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Discovery 1: headless completion safety | covered | Dual-channel signal, inline/awaited routing, refusal, and correlation behavior are specified. |
| Discovery 2: configurable budgets       | covered | Six-level precedence, bounds, source reporting, and type defaults are specified.              |
| Discovery 3: liveness adapters          | partial | Interface and failure behavior are concrete, but Codex evidence attribution needs tightening. |
| Discovery 4: secondary items            | partial | Marker and fixture matrix are adopted, but marker commit hygiene is unresolved.               |
| Reviewer-resolution additions           | covered | Resolver reason distinction and guarded pre-plan inheritance are specified.                   |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after applying the design fixes:

```bash
rg -n "pending-gate|local-only|gitignore|staging" .oat/projects/shared/gate-execution-hardening/design.md
rg -n "ambient|correlat|evidence scope|confidence" .oat/projects/shared/gate-execution-hardening/design.md
rg -n "Requirement-to-Test|Requirements Coverage" .oat/projects/shared/gate-execution-hardening/design.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
