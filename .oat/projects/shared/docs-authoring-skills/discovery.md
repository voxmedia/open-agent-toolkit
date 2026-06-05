---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-06-05
oat_generated: false
---

# Discovery: docs-authoring-skills

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- If an implementation detail comes up, capture it as an open question, constraint, or planning input.

## Initial Request

Create a quick-mode OAT project for the docs authoring skill work that emerged from the brainstorm in `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/`.

The project should deliver a layered documentation-authoring capability:

- an agnostic `authoring-docs` skill for general technical documentation authoring guidance;
- an `oat-docs-authoring` wrapper skill for OAT/Fumadocs-specific authoring conventions;
- improvements to `oat-docs-analyze` so repeatable docs-app drift patterns are detected;
- limited bootstrap improvements that are relevant to new OAT docs apps;
- a standalone MkDocs-to-OAT-Fumadocs migration handoff document for the one remaining migration repo.

## Clarifying Questions

### Question 1: Workflow shape

**Q:** Should this be one OAT project or split into separate projects?
**A:** One project.
**Decision:** Keep the work as a single quick-mode project with coordinated phases/workstreams.

### Question 2: Skill names

**Q:** What should the baseline and wrapper skills be named?
**A:** Use `authoring-docs` for the agnostic baseline and `oat-docs-authoring` for the OAT/Fumadocs wrapper.
**Decision:** These names are fixed for planning and implementation.

### Question 3: Migration scope

**Q:** Should MkDocs-to-OAT-Fumadocs migration be incorporated into `oat-docs-bootstrap`?
**A:** No. Migration should remain a separate single-file markdown handoff guide for an agent doing the remaining migration.
**Decision:** Do not make `oat-docs-bootstrap` own migration. Bootstrap changes should only cover bootstrap-relevant improvements.

## Solution Space

### Approach 1: Layered skills plus lifecycle updates _(Recommended)_

**Description:** Create the agnostic baseline and OAT/Fumadocs wrapper as distinct skills, then update existing lifecycle skills where the analyses found repeatable checks or scaffold guidance gaps.
**When this is the right choice:** Best when the concepts are reusable across many docs tasks but OAT/Fumadocs also has a concrete contract that should not pollute the general baseline.
**Tradeoffs:** Requires coordination across several artifacts and skill boundaries, but keeps responsibilities clean.

### Approach 2: Single large OAT docs authoring skill

**Description:** Put general documentation guidance, OAT/Fumadocs conventions, migration guidance, and lifecycle skill guidance into one skill.
**When this is the right choice:** Better only if the goal is a single entry point with minimal cross-skill references.
**Tradeoffs:** Would duplicate universal guidance, blur boundaries with bootstrap/analyze/apply, and make the skill harder to maintain.

### Approach 3: Lifecycle-only updates

**Description:** Skip new authoring skills and only update `oat-docs-analyze`, `oat-docs-bootstrap`, and related existing skills.
**When this is the right choice:** Better if the need were only enforcement and not reusable authoring guidance.
**Tradeoffs:** Would leave no reusable baseline for agents authoring docs outside OAT/Fumadocs or wrapper skills.

### Chosen Direction

**Approach:** Layered skills plus lifecycle updates.
**Rationale:** The brainstorm and analysis artifacts strongly support a universal baseline plus a thin OAT/Fumadocs overlay. Existing lifecycle skills should enforce or operationalize the standards without absorbing all authoring guidance.
**User validated:** Yes.

## Options Considered

### Option A: Make `authoring-docs` reference-first

**Description:** Treat `authoring-docs` as the universal documentation-quality baseline that other skills can read or reference.

**Pros:**

- Avoids coupling general docs guidance to OAT/Fumadocs.
- Lets wrapper and lifecycle skills reuse the same authoring standards.
- Keeps general documentation advice portable across repos and providers.

**Cons:**

- Agents may need to read an additional skill/reference file when working inside OAT docs apps.

**Chosen:** A

**Summary:** The baseline should be reference-first, not an all-in-one active workflow.

### Option B: Make `oat-docs-authoring` a thin wrapper

**Description:** Keep OAT-specific guidance focused on docs root resolution, local maps, generated index behavior, validation, and lifecycle boundaries.

**Pros:**

- Prevents duplication of the agnostic baseline.
- Encodes the concrete OAT/Fumadocs contract where it belongs.
- Gives lifecycle skills a clear source for wrapper rules.

**Cons:**

- Requires clear handoff language so agents know when to use lifecycle skills.

**Chosen:** B

**Summary:** The wrapper should be thin and contract-focused.

## Key Decisions

1. **Project mode:** Use a single quick-mode OAT project.
2. **Baseline skill:** Create `authoring-docs` from the imported research pack as an agnostic, evidence-first technical documentation authoring baseline.
3. **Wrapper skill:** Create `oat-docs-authoring` as a thin OAT/Fumadocs overlay over `authoring-docs`.
4. **Analyzer updates:** Update `oat-docs-analyze` to catch repeatable drift patterns found across existing OAT Fumadocs docs apps.
5. **Bootstrap scope:** Limit `oat-docs-bootstrap` changes to bootstrap-relevant improvements; do not make it a migration workflow.
6. **Migration guide:** Keep `mkdocs-to-oat-fumadocs-refactor-guide.md` as the standalone handoff document for the remaining migration repo.
7. **Repo improvements:** Treat the seven per-repo improvement artifacts as follow-up prompts/backlog inputs, not core skill content.

## Constraints

- No implementation code changes during quick-start planning.
- Preserve existing OAT lifecycle skill boundaries: bootstrap, analyze, apply, and project-document should keep their distinct responsibilities.
- Any changes to canonical skills under `.agents/skills/*/SKILL.md` require a version bump for each changed skill in the final PR diff.
- Changes to shipped skills or bundled assets require the lockstep public package version bump for `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, and `packages/docs-transforms` when the change qualifies as shipped functionality.
- Publishable-package changes require `pnpm release:validate` before finishing.
- Prefer same-directory imports or package aliases if implementation touches TypeScript code; avoid parent-relative imports.

## Success Criteria

- `authoring-docs` exists and covers general technical documentation authoring across APIs, CLIs, apps, services, libraries/frameworks, monorepos, architecture/operations, and internal/public contexts.
- `oat-docs-authoring` exists and clearly references or layers on `authoring-docs` without duplicating broad writing guidance.
- `oat-docs-authoring` documents the OAT/Fumadocs contract: authored `index.md`, `## Contents`, `.md` links, generated root index, `.md` preference, no `overview.md`, validation, and lifecycle-skill boundaries.
- `oat-docs-analyze` can detect the most important repeatable drift patterns surfaced by the seven repo analyses.
- `oat-docs-bootstrap` is improved only where bootstrap-specific guidance/checks need clarification.
- `mkdocs-to-oat-fumadocs-refactor-guide.md` is polished enough to hand to an agent for the remaining MkDocs-to-OAT-Fumadocs migration.
- Planning keeps repo-specific improvement work separate from the core skill/lifecycle updates unless explicitly chosen as follow-up work.

## Out of Scope

- Implementing the remaining MkDocs-to-OAT-Fumadocs migration in another repo.
- Making `oat-docs-bootstrap` a migration workflow.
- Applying the seven per-repo improvement artifacts to their target repositories as part of this project.
- Building a full spec-driven requirements/design lifecycle unless later promoted.
- Replacing `oat-docs-analyze`, `oat-docs-apply`, or `oat-project-document` with the new wrapper skill.

## Deferred Ideas

- Convert per-repo improvement artifacts into repo-specific backlog items or standalone project prompts.
- Add an `oat docs` CLI command for read-only generated-index freshness checks if analyzer implementation needs a reusable primitive.
- Create richer examples/evals for docs-authoring skills using the seven analyzed docs apps.

## Open Questions

- **Skill scaffolding:** Should `authoring-docs` be created as an agnostic skill via the agnostic skill scaffold or as a project-local OAT skill? Planning should inspect current skill conventions before deciding.
- **Wrapper invocation:** Should `oat-docs-authoring` be user-invocable directly, or primarily referenced by bootstrap/analyze/apply/project-document? Recommendation: make it user-invocable for targeted authoring/restructuring.
- **Analyzer scope:** Which repeatable checks can be implemented inside existing `oat-docs-analyze` without adding new CLI support?
- **Bootstrap scope:** Which generated-index/Fumadocs clarifications belong in `oat-docs-bootstrap` versus docs/reference pages?
- **Migration guide polish:** What final additions are needed before the standalone migration guide is ready to hand to another agent?

## Assumptions

- The imported brainstorm research and analysis artifacts are authoritative planning inputs for this project.
- Quick mode with optional lightweight design is sufficient; the project does not need full spec-driven rigor unless implementation uncovers deeper architectural risk.
- Existing OAT skill scaffolding conventions and validation commands can be discovered from the repository during implementation.

## Risks

- **Scope creep:** The project can expand into applying repo-specific docs fixes.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep repo-specific artifacts as references/backlog inputs unless explicitly pulled into scope.
- **Boundary blur:** New skills could duplicate lifecycle skill behavior.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Make lifecycle boundaries explicit in discovery, design, and plan tasks.
- **Release-policy miss:** Skill changes may require version bumps and release validation.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Include version and release-validation tasks in the plan.

## Next Steps

Proceed with a lightweight design before generating the implementation plan, because the work spans new skills, existing lifecycle skill updates, reference artifacts, and release-policy requirements.
