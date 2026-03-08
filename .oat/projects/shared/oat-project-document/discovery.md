---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-03-08
oat_generated: false
---

# Discovery: oat-project-document

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Add a dedicated skill to run after implementation/review cycles that reads project artifacts and implementation code to generate documentation update recommendations (and optional patches). The skill should evaluate all documentation and instruction surfaces relevant to the project, produce a clear delta plan, and apply approved updates with traceability.

## Clarifying Questions

### Question 1: Relationship to existing docs skills

**Q:** How should oat-project-document relate to the existing oat-docs-analyze/oat-docs-apply pair?
**A:** Self-contained — analyze, present delta plan, get user approval, and apply all in one invocation. No separate skill invocation required. They coexist but don't depend on each other. oat-docs-analyze/apply is for docs-surface health; oat-project-document is for project-driven "what changed that needs documenting?"
**Decision:** Skill is fully self-contained with its own analyze-present-apply flow.

### Question 2: Documentation targets and scope

**Q:** What documentation targets should the skill evaluate?
**A:** All documentation and instruction surfaces relevant to the project. Primary focus on documentation (docs directory, READMEs, reference files), with instruction surfaces (AGENTS.md, provider rules) only recommended on strong signals (new test framework, new styling library, new directory needing agent instructions).
**Decision:** Scan all surfaces that exist; apply different thresholds for docs vs. instructions.

### Question 3: Analysis approach

**Q:** Should analysis be driven by git diffs or project artifacts?
**A:** Artifacts-first. Read project artifacts (discovery, spec, design, plan, implementation.md) to understand what was built, then read code as source of truth to verify. Git diffs only as needed for additional detail, not the primary mechanism.
**Decision:** Artifact-driven targeting — artifacts tell the story, code confirms reality.

### Question 4: Config schema for docs directory

**Q:** How should the documentation directory be configured?
**A:** Add a `documentation` section to `.oat/config.json` with `root` (path to docs dir), `tooling` (descriptive string like "mkdocs"), and `config` (path to tooling config file). All paths relative to repo root.
**Decision:** Three fields: root, tooling, config — all relative to repo root.

### Question 5: User interaction and autonomous flows

**Q:** Should the skill require user approval before applying changes?
**A:** Default is interactive (present plan, ask approval, apply). Support `--auto` argument to skip approval for autonomous/subagent flows.
**Decision:** Interactive by default, `--auto` for autonomous execution.

### Question 6: Active vs. archived project targeting

**Q:** How should the skill resolve which project to document?
**A:** Default to active project. Accept an explicit project path as argument. If no active project and no path provided, ask the user.
**Decision:** Active project default, explicit path override, prompt as fallback.

### Question 7: Integration with oat-project-complete

**Q:** How should the completion flow integrate?
**A:** Add `oat_docs_updated` frontmatter field (null | skipped | complete). oat-project-complete checks this field — soft suggestion by default, hard gate when `documentation.requireForProjectCompletion` is true in config.
**Decision:** Soft suggestion default, configurable hard gate.

## Options Considered

### Option A: Surface-first scan

**Description:** Scan all documentation surfaces first, then read project artifacts to determine what changed.

**Pros:**
- Thorough coverage of all surfaces
- Simple to implement

**Cons:**
- Slow on large repos
- May surface noise for surfaces unrelated to the project

### Option B: Artifact-driven targeting (chosen)

**Description:** Read project artifacts first to understand what was built, verify against code, then identify only affected documentation surfaces.

**Pros:**
- Focused and efficient — only touches surfaces relevant to the project
- Avoids noise
- Natural fit for artifacts-first principle

**Cons:**
- Slightly more complex analysis logic

### Option C: Template-driven checklist

**Description:** Walk through a fixed checklist of documentation patterns.

**Pros:**
- Predictable and mechanical

**Cons:**
- Brittle — misses anything not in the template
- Doesn't scale to diverse project types

**Chosen:** B

**Summary:** Artifact-driven targeting provides focused, efficient analysis by letting project artifacts guide which documentation surfaces to evaluate, avoiding noise from unrelated surfaces.

## Key Decisions

1. **Self-contained skill:** Single invocation covers analyze → present → approve → apply. No chaining to other skills.
2. **Artifact-driven targeting:** Read artifacts first, verify against code, then assess affected surfaces.
3. **Documentation-first, instructions on strong signals:** Docs surfaces get thorough treatment; instruction surfaces only on clear triggers (new framework, new directory, new tooling).
4. **Config schema:** `documentation.root`, `documentation.tooling`, `documentation.config` in `.oat/config.json`, plus `documentation.requireForProjectCompletion`.
5. **State tracking:** `oat_docs_updated` frontmatter field in state.md (null | skipped | complete).
6. **Interactive default:** Present delta plan for approval; `--auto` bypasses for autonomous flows.
7. **File creation and splitting:** Beyond updating existing docs, skill recommends new files/directories and splitting large files.

## Constraints

- Must work with both active and completed/archived projects
- Must not require project phase mutation (read-only access to artifacts)
- Must follow existing skill conventions (frontmatter, progress indicators, allowed-tools)
- Should auto-detect docs tooling when config is absent

## Success Criteria

- Running oat-project-document produces a clear docs delta plan and/or applies approved updates with traceability
- Skill can target both active and archived projects without requiring phase mutation
- oat-project-complete flow can recommend or gate on documentation sync status (policy configurable)
- Skill identifies when new doc files/directories need to be created
- Skill identifies when existing docs files need to be split due to size

## Out of Scope

- Generating documentation content from scratch (skill recommends and patches, doesn't author full guides)
- Replacing oat-docs-analyze/oat-docs-apply (complementary, different entry points)
- Automated PR creation from documentation changes (user handles git workflow after skill completes)

## Deferred Ideas

- Integration with CI to auto-run documentation checks on PR — deferred until skill proves value manually
- Multi-project documentation rollup (aggregate changes from several projects) — deferred for future iteration

## Open Questions

None remaining — all resolved during brainstorming.

## Assumptions

- Project artifacts (discovery.md, spec.md, design.md, plan.md, implementation.md) are populated with meaningful content
- The OAT skill convention and frontmatter patterns remain stable
- Provider rules file locations follow established conventions (.cursor/rules/, .claude/rules/, etc.)

## Risks

- **Artifact quality variance:** If project artifacts are thin, recommendations may be less precise
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Fall back to code analysis when artifacts lack detail

- **False positives on instruction recommendations:** Overly sensitive signal detection for instruction surfaces
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation:** Strong signal threshold and interactive approval step

## Next Steps

Quick mode: proceed to design.md (rich technical detail warrants a separate design artifact), then to plan.md.
