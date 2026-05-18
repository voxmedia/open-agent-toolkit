---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_generated: false
---

# Discovery: agent-instructions-nesting-rubric

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Implementation details captured as Open Questions or Constraints, not deliverable lists.

## Initial Request

The user repeatedly runs `oat-agent-instructions-analyze` and finds it frequently
misses opportunities to recommend `AGENTS.md` (or other instruction files) for
subdirectories that hold a meaningful, domain-specific body of code — e.g. a
`packages/<pkg>/src/<domain>/` directory with 10–20 files and conventions that
apply only to that domain.

A representative analysis note that triggered the request:

> Deep-subdirectory sweep result: No app/package exceeds 50 source files
> (largest: bigquery-sync 29), so no nested second-level AGENTS.md is warranted —
> one file per app/package is the correct granularity.

The user considers the 50-source-file gate a bad heuristic. Nested instruction
files exist precisely to add **increasing specificity** layered on top of
higher-level files; a small-but-distinct domain directory is a legitimate
candidate regardless of how large its parent package is. The analysis rubric
should capture these opportunities.

## Clarifying Questions

### Question 1: Workflow scope

**Q:** How should the rubric revision be scoped?
**A:** Quick workflow — bounded, single-skill guidance change with clear requirements.
**Decision:** Run as a quick-mode OAT project; no spec-driven ceremony.

## Solution Space

Well-understood request — the user articulated both the problem and the desired
direction. Chosen direction: **revise the analyze skill's directory-assessment
rubric so per-directory evaluation runs at every depth, triggered by distinct/
non-obvious domain conventions rather than a parent file-count threshold.**

## Root Cause (from investigation)

`references/directory-assessment-criteria.md` is the rubric the analyze skill
applies in Step 4 (Assess Coverage Gaps). Two issues were confirmed by reading
the skill:

1. **The 50-file gate is real, not a misread.** The "Large Directory
   Decomposition" section (the _only_ place the rubric discusses going deeper
   than one-file-per-app/package) opens with "When a directory meets 1+ primary
   indicators and contains **more than 50 source files**, assess its major
   subdirectories…". A field agent that finds no app/package over 50 files
   correctly concludes — per the rubric as written — that no nested file is
   warranted. The rubric is wrong, not the agent.

2. **The section conflates two distinct questions.** (a) "This area is so large
   that one broad recommendation would be too vague — decompose the
   _recommendation_ into granular sub-area guidance." (b) "Should a nested
   subdirectory get its own instruction file at all?" The rubric only has
   mechanism (a), and (a)'s 50-file threshold accidentally became the answer to
   (b). Question (b) is a per-directory merit question that should be answered
   by applying the primary indicators to every directory at every depth.

Reinforcing biases in the same doc:

- Indicator 4 (Distinct Domain Boundary) is rated only "Moderate" and all its
  examples are top-level packages — nothing signals it applies at depth.
- Indicator 5 (>10 source files) is "Moderate" and never described as recursive.
- The Exclusions section frames a nested file as "overhead", contradicting the
  point that a nested file is _cheap_ because it does not repeat the parent.

The skill's own bundled doc `references/docs/agent-instruction.md` §13 ("Scoped
Files — When and How") already supports the progressive-specificity model
("must not duplicate root", "override only where divergence exists"). The
criteria doc simply never connects nested-domain subtrees to §13.

## Key Decisions

1. **Reframe the trigger as distinct conventions, not file count.** A
   subdirectory warrants its own instruction file when it has non-obvious,
   domain-specific conventions an agent would otherwise miss — independent of
   parent size. File count becomes a _supporting_ signal, never a gate.
2. **Per-directory evaluation at every depth.** The directory walk evaluates
   every directory against the primary indicators recursively; deeper
   assessment is not gated behind a parent file-count threshold.
3. **Rewrite "Large Directory Decomposition".** Keep its genuine purpose
   (decompose a broad recommendation into granular sub-area guidance) but
   remove the 50-file figure as an _entry condition_. It may remain only as a
   soft "definitely decompose above this" prompt, not a gate.
4. **Add explicit progressive / nested instruction-file guidance.** Document
   the model: child files inherit parent context, stay short, and capture only
   the domain-specific delta. Cross-reference `agent-instruction.md` §13.
5. **Guard against the opposite failure (instruction-file sprawl).** The
   revised rubric must give a clear _positive_ criterion (distinct, non-obvious
   conventions worth capturing) so it does not start recommending an
   `AGENTS.md` for every 10-file folder that simply mirrors its parent. Removing
   a threshold without adding a positive trigger is explicitly rejected.
6. **Elevate / re-scope Distinct Domain Boundary** so it reads as applicable at
   any depth, with a nested example (`packages/<pkg>/src/<domain>/`).
7. **Reframe the Exclusions section** around "no distinct conventions to
   capture" rather than raw smallness, so a small domain directory with real
   divergence is not excluded as "overhead".

## Constraints

- Guidance/rubric change only — no change to the analysis engine logic beyond
  wording in `SKILL.md` Step 4 that frames the directory walk.
- Primary edit targets: `.agents/skills/oat-agent-instructions-analyze/
references/directory-assessment-criteria.md` and the Step 4 framing in that
  skill's `SKILL.md`. Check the artifact template only if its directory-coverage
  section also encodes the app/package-only model.
- Bump the changed skill's frontmatter `version:` (currently 1.9.0).
- Release policy: changes under `.agents/skills` require the lockstep public
  package version bump across `packages/cli`, `packages/control-plane`,
  `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`.
- The bundled copy under `packages/cli/assets/skills/` is gitignored (a build
  artifact regenerated from canonical) — editing the canonical `.agents/skills`
  copy is sufficient; no manual sync of the bundled copy.
- Run `pnpm release:validate` before completion (publishable-package DoD).

## Success Criteria

- The rubric no longer gates nested instruction-file recommendations behind a
  parent source-file count; the 50-file figure is no longer an entry condition.
- The rubric explicitly directs per-directory assessment at every depth and
  explains progressive/nested instruction files (delta-over-parent specificity).
- The rubric carries a clear positive trigger (distinct, non-obvious domain
  conventions) and an explicit anti-sprawl guard so it does not over-recommend.
- A directory like `packages/<pkg>/src/<domain>/` with ~10–20 files and
  domain-specific conventions would be surfaced as a coverage-gap candidate by
  the revised rubric, even when its parent package is well under 50 files.
- Skill `version:` bumped; lockstep public package versions bumped together;
  `pnpm release:validate` passes.

## Out of Scope

- Changing `oat-agent-instructions-apply` generation logic (it consumes the
  analysis bundle; revised recommendations flow through unchanged).
- Re-running the analysis on this repo or shipping new instruction files —
  that is the apply skill's job, performed separately by the user.
- Reworking unrelated rubric criteria (file-type discovery, quality checklist)
  beyond what the nesting reframe requires.
- Auto-tuning or numeric scoring of "domain specificity" — the trigger stays
  qualitative and evidence-based, consistent with the rest of the skill.

## Open Questions

- **Soft threshold:** Should the rewritten decomposition guidance keep any
  numeric figure at all (as a soft "definitely decompose" prompt), or drop
  numbers entirely in favor of purely qualitative signals? Leaning toward
  keeping it only as a non-gating prompt.

## Assumptions

- The analyze skill's Step 4 already intends a full directory-tree walk; the
  criteria doc is what narrows it. Fixing the criteria doc (plus light Step 4
  framing) is sufficient — no engine/script change required.
- The artifact template's directory-coverage table is generic enough to need
  no change (to be confirmed during implementation).

## Risks

- **Instruction-file sprawl:** Over-correcting could make the skill recommend
  too many thin nested files.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Decision 5 — a mandatory positive trigger (distinct,
    non-obvious conventions) and explicit anti-sprawl guidance in the rubric.

## Next Steps

Quick mode — proceed to plan generation once the design-depth decision point
and requirements gate are cleared.
