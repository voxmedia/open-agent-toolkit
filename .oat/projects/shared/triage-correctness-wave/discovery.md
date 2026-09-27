---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-27
oat_generated: false
---

# Discovery: triage-correctness-wave

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Implementation details belong to the plan.

## Initial Request

Deliver one bounded backlog wave selected with the `tackle-backlog` skill after
a full review of the 114 active backlog items on 2026-09-26. The operator
approved this exact batch as a single pull request:

1. `BL-260927-stop-resolve-providers-sh-from` (Stop resolve-providers.sh from
   aborting when the last auto-detect test is false), GitHub #324.
2. `BL-260927-make-the-managed-claude` (Make the managed Claude dispatch-record
   input producible and self-describing), GitHub #326.
3. `BL-260927-name-the-file-in-canonical` (Name the file in canonical rule parse
   errors and keep one bad rule from aborting sync), GitHub #316.
4. `BL-260927-derive-or-label-the-dispatch` (Derive or label the dispatch audit
   line from the gate invocation in gate-originated reviews), GitHub #325.
5. `BL-260927-require-a-per-item-walkthrough` (Require a per-item walkthrough of
   retro register items in the final report), GitHub #313 and #297.
6. `BL-260927-preserve-oat-config-json-key` (Preserve .oat/config.json key
   order and skip no-op config writes), GitHub #329 and #311.
7. `BL-260909-reject-malformed-nested-values` (Reject malformed nested values in
   the strict pjm.remote shared reader).
8. `BL-260909-make-oat-sync-scope-all-report` (sync --scope all failed-scope
   report).
9. `BL-260908-validate-the-catalog-refresh` (Validate the catalog-refresh
   policy in sync evidence).

Plus reconciliation: archive `BL-260908-restore-recon-s-cheap-fan-out` (Restore
recon's cheap-fan-out intent with per-wave routing under one approval
envelope), whose acceptance criteria are all checked and whose close condition
(PR #285 merged 2026-09-12) is met.

## Clarifying Questions

### Question 1: Batch and topology

**Q:** Which batch and PR topology?
**A:** Approve the nine items plus the reconciliation as one PR.
**Decision:** One wave branch (`wave/2026-09-26-backlog`), one quick project,
one mergeable PR. No stack.

### Question 2: Roles and review coverage

**Q:** Implementer, independent reviewer, and phase-gate coverage?
**A:** Claude implements; Codex reviews; gate every phase.
**Decision:** Opus 5.5 phase implementers; the plan gate, every phase gate, and
the final gate route to `codex-6-sol-xhigh` through the configured targets'
priority order with same-family avoidance. `oat_phase_review_gate` covers all
phases.

### Question 3: Dispatch policy

**Q:** What does "use high dispatch for gates" mean?
**A:** Project dispatch policy `high`.
**Decision:** `oat_dispatch_policy` is `managed/high` in project state; gate
targets are unchanged.

## Solution Space

Each item is an already-verified defect or bounded enhancement with explicit
acceptance criteria in its backlog file and evidence in
`.oat/repo/pjm/triage/2026-09-26-untriaged-issues.md`. The chosen direction is to
implement each item's acceptance criteria as written, grouped by write set.

## Key Decisions

1. **Canonical rule `alwaysApply` handling:** accept `alwaysApply: true` as an
   alias for `activation: always` in canonical rule parsing, matching the
   existing Cursor importer, and make every remaining parse error name the
   repository-relative file. Chosen over warn-and-skip because the alias
   preserves a rule the author clearly intended to apply, while file-naming
   errors cover genuinely invalid rules.
2. **Managed Claude dispatch record scope:** make the existing validation path
   usable (collect-all errors, pattern messages, a published example pinned by
   a test, and a producer for the canonical-role evidence). The keep-or-remove
   decision about the per-dispatch journal stays with
   `BL-260909-give-the-dispatch-record` and is out of scope.
3. **Config writes:** preserve the existing key order of `.oat/config.json` and
   skip the write when nothing semantically changed; a real change must not
   reorder untouched keys.
4. **Gate audit line:** gate-originated review artifacts derive the dispatch
   audit line from the gate invocation (or label it as the policy view), and
   validation rejects an unlabeled disagreement.
5. **Design depth (gate QS-04):** straight to plan. Every item has concrete
   acceptance criteria and verified evidence; the only design choices (items 1
   and 2 above) are recorded here, so no lightweight design artifact is
   needed.

## Constraints

- Follow the repository Definition of Done: `pnpm check`, `pnpm type-check`,
  `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`,
  `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`.
- Bump each changed canonical skill's `metadata.version` once in the PR, and
  bump the five lockstep public packages together because bundled assets and
  CLI behavior change.
- Tests that are evidence for a defect fix must be shown to fail against the
  pre-fix behavior (neutralize-and-restore or a pre-fix run).
- Import-path convention: same-directory imports or package aliases; no
  parent-relative imports.
- Do not hand-edit generated indexes or bundled asset mirrors that the build
  regenerates.

## Success Criteria

- Every acceptance criterion of the nine items passes, with evidence recorded in
  `implementation.md`.
- The nine items and the reconciled recon item are archived through
  `oat backlog archive` in the wave PR.
- Independent Codex review passes the plan gate, each phase gate, and the final
  gate, with dispositions recorded.
- All eight Definition of Done gates pass locally with captured exit codes.
- One mergeable PR is open against `main`; nothing is merged.

## Out of Scope

- Deciding the fate of the dispatch journal (`BL-260909-give-the-dispatch-record`).
- The guidance lane (`BL-260903-close-manual-only-agents-md`,
  `BL-260927-name-only-installed-pack`).
- Template resolution (`BL-260927-expose-a-scoped-template`), which needs a
  precedence decision.
- Large cross-cutting items (lifecycle current-state authority, shared commit
  primitive, portable gate receipts).
- Any change to user-level gate target configuration.

## Deferred Ideas

- `oat tools where` locate command — tracked in
  `BL-260927-name-only-installed-pack`.

## Open Questions

- None blocking. Exact file-level implementation surfaces are settled in the
  plan from read-only recon against the baseline.

## Assumptions

- Recon file and line anchors reflect `origin/main` at `88907ec4c`.
- The configured gate target priorities remain unchanged during the run.

## Risks

- **Shared contract-test files:** several items pin skill text in shared test
  files.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** order phases so only one phase edits those files at a
    time.
- **Implement-skill change affects every future run:** the dispatch-record item
  edits the implement skill reference.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation Ideas:** keep the change to replacing placeholders with a
    tested example and producer reference; independent review.
- **Pre-commit hook reformats committed markdown:** the lint-staged hook can
  leave hook-modified files after a commit.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** check `git status` after every commit.

## Next Steps

Quick mode → straight to plan.
