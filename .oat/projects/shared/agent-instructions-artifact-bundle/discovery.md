---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-19
oat_generated: false
---

# Discovery: agent-instructions-artifact-bundle

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a
  deliverable list.

## Initial Request

Create a follow-up project for introducing an artifact-bundle handoff between `oat-agent-instructions-analyze` and
`oat-agent-instructions-apply` so less behavioral and workflow context is lost between analysis and application.

## Clarifying Questions

### Question 1: Follow-up direction

**Q:** Should we first tighten the current analyze/apply pipeline or move directly to a richer artifact bundle?
**A:** Tighten the current pipeline first, then pursue a follow-up PR for the bundle-based approach.
**Decision:** This project should focus on the bundle contract itself rather than on more incremental markdown-only
handoff changes.

## Solution Space

This request started as a design question because the current single-artifact handoff was still creating a content
ceiling for apply. Three approaches were considered:

### Approach 1: Keep expanding the single markdown artifact

**Description:** Continue adding new fields to the existing artifact template and apply contract.
**When this is the right choice:** Best when only one or two missing data points remain and the summary artifact can
still serve both review and generation.
**Tradeoffs:** Easy to ship incrementally, but it keeps compressing detail into one document and makes apply depend on
increasingly dense prose.

### Approach 2: Merge analyze and apply into one workflow

**Description:** Remove the explicit handoff and let one run analyze and generate in a single pass.
**When this is the right choice:** Useful when reviewability and selective approval do not matter.
**Tradeoffs:** Reduces interface loss, but also loses auditability, rerun flexibility, and a clean approval boundary.

### Approach 3: Keep separate skills, add an artifact bundle _(Recommended)_

**Description:** Preserve the human-readable summary artifact while adding a machine-oriented manifest plus
per-recommendation packs.
**When this is the right choice:** Best when reviewability still matters, but generation needs richer structured
context than one markdown report can safely carry.
**Tradeoffs:** Adds a new contract surface and implementation work, but directly addresses the actual loss point.

### Chosen Direction

**Approach:** Keep separate analyze/apply skills and introduce an artifact bundle.
**Rationale:** This preserves reviewability while giving apply a richer, recommendation-scoped contract.
**User validated:** Yes

## Options Considered

### Option A: One bundle file

**Description:** Emit a single structured YAML or JSON document for all recommendation detail.

**Pros:**

- Simple file layout
- Easy for apply to load in one read

**Cons:**

- Large repos would still collapse many recommendation contracts into one dense artifact
- Harder to review per recommendation

**Chosen:** B

### Option B: Manifest plus per-recommendation packs

**Description:** Emit a summary, a manifest, and one recommendation pack per output target.

**Pros:**

- Keeps context targeted and reviewable
- Allows apply to load only the approved packs it needs

**Cons:**

- Requires a slightly more complex output contract
- Needs explicit validation of pack references

**Chosen:** B

**Summary:** Use a small manifest plus recommendation-scoped packs so the handoff stays reviewable and
generation-ready.

## Key Decisions

1. **Workflow split:** Keep analyze and apply as separate skills; do not merge them into one workflow.
2. **Artifact strategy:** Add a bundle contract beside the human-readable summary artifact instead of replacing it.
3. **Bundle granularity:** Store recommendation-scoped context in per-pack documents rather than one oversized machine
   artifact.
4. **Apply boundary:** Apply should consume the bundle as its primary contract and use the summary artifact as review
   context, not as an excuse to infer missing fields.

## Constraints

- Preserve the current human review artifact experience for PRs and review comments.
- Avoid making apply rediscover repository conventions from scratch.
- Keep the follow-up scoped to the analyze/apply interface rather than a larger lifecycle redesign.
- Stay compatible with the existing OAT skill and template structure in this repository.

## Success Criteria

- A quick-mode plan exists for implementing an artifact bundle without collapsing analyze and apply into one skill.
- The design identifies the manifest and pack contract clearly enough for implementation tasks and fixture coverage.
- The resulting plan includes regression-oriented verification so future handoff losses are easier to catch.

## Out of Scope

- Merging analyze and apply into a single skill.
- Reworking unrelated agent-instructions guidance that is already merged.
- Full implementation within discovery; this project should only prepare the design and runnable plan.

## Deferred Ideas

- Optional automation for comparing bundle output against generated files - deferred until the contract exists.
- Provider-specific optimizations beyond the shared bundle contract - deferred until core bundle flow works.

## Open Questions

- **Bundle schema:** Which fields belong in the manifest versus the pack body to keep both readable and parseable?
- **Apply compatibility:** How much of the current apply plan generation can be reused once bundle inputs exist?

## Assumptions

- The artifact bundle can be introduced without breaking the current human review flow.
- YAML manifest plus markdown packs is a workable compromise between structure and readability.

## Risks

- **Contract bloat:** The bundle could become as overloaded as the current single artifact.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep the manifest minimal and move recommendation detail into targeted packs.
- **Apply drift:** Apply could keep leaning on prose summary instead of the bundle.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Make bundle validation explicit and make pack fields the primary generation inputs.
- **Insufficient regression coverage:** The new interface could still drop fields without tests or fixtures.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Add focused fixture coverage for behavioral guidance, workflow steps, and claim corrections.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Quick mode → straight to plan:** proceed directly to `plan.md` when scope is clear and no architecture decisions
  remain.
- **Quick mode → optional lightweight design:** produce a focused `design.md` (architecture, components, data flow,
  testing) before planning. Choose this when discovery surfaced architecture choices or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed the scope is larger or more complex than
  expected.
- **Spec-driven mode:** continue to `oat-project-spec` (after HiLL approval if configured).
