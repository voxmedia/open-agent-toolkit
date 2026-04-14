---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_generated: false
---

# Discovery: project-document-docs-gap-hardening

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Improve `oat-project-document` so it stops missing documentation recommendations for newly introduced capability areas, especially when a repo already has a docs app. The concrete failure mode is that the skill tends to suggest edits to existing reference and roadmap surfaces, but misses recommending new docs files or directories for major new functionality such as a mobile app plus CI/CD and release automation.

## Solution Space

The request is well-understood. The chosen direction is to harden `oat-project-document` so it performs an explicit documentation coverage-gap pass for newly shipped capability surfaces, using repo evidence rather than relying only on existing docs files and artifact-mentioned code paths.

## Options Considered

### Option A: Patch `oat-project-document` in place

**Description:** Extend the skill contract so it inventories documentable capability surfaces, compares them against the docs app, and recommends `CREATE` actions for missing coverage.

**Pros:**

- Fixes the failure mode at the point where project closeout docs decisions are made
- Keeps the post-implementation workflow simple for users
- Reuses patterns already established in `oat-docs-analyze`

**Cons:**

- Requires careful wording so the skill stays evidence-based and does not speculate
- Needs docs updates so the behavior change is visible to contributors

**Chosen:** A

**Summary:** Harden the existing project-document workflow rather than introducing a new intermediate workflow step.

## Key Decisions

1. **Workflow mode:** Use quick workflow because the scope is bounded and the problem statement is already clear.
2. **Primary fix direction:** Bring the coverage-gap and content-opportunity discipline from `oat-docs-analyze` into `oat-project-document`.
3. **Evidence model:** Recommendations for new docs files must be grounded in project artifacts plus code-verified capability evidence.
4. **Docs scope:** Update user-facing docs anywhere they describe `oat-project-document` too narrowly.

## Constraints

- Keep changes scoped to documentation workflow skills and docs, not implementation source behavior outside that area.
- Preserve the `oat-project-document` contract as an apply-in-one-run workflow, not a separate analyze/apply split.
- Avoid instructions that require a healthy local `oat` CLI invocation in this worktree, because the current CLI path is failing here.

## Success Criteria

- `oat-project-document` explicitly checks for undocumented capability surfaces, including brand new docs areas.
- The skill can recommend `CREATE` actions for new docs files or directories when no existing page covers the shipped capability.
- The recommendation rules tell the agent when to create a new page versus expanding an existing one.
- OAT docs describing the lifecycle or skill behavior are updated to match the new expectation.

## Out of Scope

- Reworking the entire docs workflow around mandatory `oat-docs-analyze` artifacts
- Changing source-code implementation outside the documentation workflow surface
- Solving the unrelated local CLI bootstrap failure as part of this task

## Deferred Ideas

- A future refactor where `oat-project-document` can optionally call into a shared docs-analysis helper instead of duplicating some logic
- Broader repo-wide capability discovery heuristics beyond the documentation workflow scope

## Open Questions

- Whether `oat-project-document` should eventually delegate part of its discovery phase to a shared docs-analysis primitive instead of carrying parallel instructions

## Assumptions

- The existing `oat-docs-analyze` coverage-gap pass is the best local pattern to reuse for this behavior.
- Repos with docs apps need stronger guidance for new file and directory creation than generic README/reference updates provide.

## Risks

- **Risk:** The skill becomes too broad and starts scanning unrelated code aggressively.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep the discovery scoped to project-built capability areas and evidence-backed signals.

## Next Steps

- Generate a quick implementation plan
- Update the skill contract and related docs
- Run focused consistency checks against the docs-analysis skill
