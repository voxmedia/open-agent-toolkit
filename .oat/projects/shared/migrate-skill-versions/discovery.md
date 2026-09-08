---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-08
oat_generated: false
---

# Discovery: migrate-skill-versions

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Backlog item `BL-260904-migrate-bundled-skills-from` (high, GitHub issue #258 follow-up). After wave 6 p04 made `metadata.version` the canonical skill version with the top-level `version:` key as a deprecated alias, the operator asked (2026-09-08): "with p04 shipping, can we remove the top level version" and, on the answer that a standalone project would do it, "yeah, I mean its a straight forward project we should probably clean it up." Every one of the 82 bundled canonical skills still carries only the alias, so `pnpm oat:validate-skills` prints 82 warnings per run and the shipped authoring templates already emit a shape two release-tool readers cannot parse.

## Clarifying Questions

### Question 1: Scope of the migration

**Q:** Skills only, or agent roles too?
**A:** (Operator did not specify; discovery finding.) The five agent roles under `.agents/agents` carry the same top-level field, but neither enforcement surface covers them: the alias warning walks only `.agents/skills`, and the bump gate's diff pathspec is `.agents/skills/*/SKILL.md`. They emit no warning and no test breaks.
**Decision:** Migrate the 82 skills, which is what the backlog item names. Leave the agent roles on the top-level field and record that as an explicit deferral in the decision record rather than widening scope silently.

### Question 2: When does the alias stop being read?

**Q:** Should this project remove the top-level read from the resolver?
**A:** The backlog item's acceptance criterion says: record whether any host outside OAT reads the top-level field; if none does, the alias warning becomes an error one release later and the top-level read is removed after it has been quiet.
**Decision:** This project records the decision and keeps the resolver's alias read intact (third-party skills installed from packs may still carry it); a follow-up item owns the warning-to-error promotion and the eventual removal. Nothing in this project changes how a foreign skill resolves.

### Question 3: Bump size

**Q:** Patch or minor bump for a frontmatter-only migration?
**A:** The PR-scoped bump gate requires one bump per changed skill; the change is metadata shape, not behavior.
**Decision:** Patch bump for every migrated skill, including the two skills whose script or test files also change in this project.

## Solution Space

### Approach 1: Fix the readers first, then migrate everything in one PR _(Recommended)_

**Description:** Make every non-resolver reader of the version field metadata-aware (the two release-tool regex readers, the test-suite sweeps, the mutation-based tests) while all skills still carry the alias, then move all 82 skills and repoint every pin in a second phase of the same PR, with one lockstep release bump.
**When this is the right choice:** When the readers are few (recon found two production readers and eight test files) and the migration itself is mechanical.
**Tradeoffs:** One large PR (about 95 files); the reviewer verifies a script's output rather than hand edits.

### Approach 2: Migrate in batches across several PRs

**Description:** Move skills in groups (lifecycle skills, explainer family, the rest), each with its own bump and pin updates.
**When this is the right choice:** When readers cannot all be fixed ahead of time or when parallel skill edits are landing.
**Tradeoffs:** Several lockstep bumps, several rounds of the same pin sweep, and a long window where `validate-skills` prints a mix of warnings; no parallel skill edits are landing now that the execution program is complete.

### Chosen Direction

**Approach:** Approach 1.
**Rationale:** The program's skill-editing waves are done, the readers are enumerated, and a single PR keeps the bump gate and the pin sweep to one pass.
**User validated:** Yes — the operator asked for the cleanup and accepted a standalone project.

## Options Considered

### Option A: Script the frontmatter move with a checked-in helper

**Description:** Add a small repository script that rewrites the frontmatter (move or merge the version into `metadata`, bump) so the change is reproducible and reviewable.

**Pros:**

- Reviewable transformation; re-runnable if a skill is edited before merge
- The same script can be pointed at agent roles later

**Cons:**

- One more maintained script for a one-time change

### Option B: One-off transformation in the implementer's scratch space

**Description:** Perform the rewrite with an ad-hoc script that is not committed; the diff is the evidence.

**Pros:**

- No new maintained surface

**Cons:**

- The reviewer must re-derive the transformation from a 82-file diff

**Chosen:** B, with the transformation described exactly in the plan task and its invariants pinned by tests (every skill resolves from `metadata`, no skill carries the top-level key, every pin equals its skill's resolved version). The repository already has the resolver and the validator; a checked-in one-time script would outlive its use.

**Summary:** Scratch transformation, invariants enforced by the test suite and the structural validator.

## Key Decisions

1. **Readers before movers:** every reader that anchors on a line-start `version:` regex is made metadata-first (top-level as fallback, quotes stripped) and proven red-then-green before any skill drops the key.
2. **Invariants pinned:** the corpus sweeps in the skills test suite read through the shared resolver and, after the migration, assert `source === 'metadata'` for every bundled skill; a negative control re-adds a top-level alias to one skill and shows the sweep red.
3. **Agent roles deferred** (see Question 1); recorded in the decision record.
4. **Alias retirement schedule** recorded as a decision: no provider, sync surface, or docs site reads the top-level field of a projected copy (recon, 2026-09-08); the warning becomes an error one release after this migration ships, and the resolver's top-level read is removed one release after the error has been quiet — both owned by a follow-up backlog item.
5. **Standalone verification mode:** this is not a wave lane, so the project owns the lockstep bump (0.2.64 → 0.2.65 above fresh `origin/main`) and runs the full eight-gate Definition of Done.

## Constraints

- One version bump per changed skill in the final PR diff (`DR-260906-one-version-bump-per-changed`); the two skills whose scripts or tests change in this project (`oat-explainer-kit`, `explainer-kit`, `recon`) take the same single patch bump as the rest.
- The bundled assets under `packages/cli/assets` are a gitignored byte copy of `.agents/skills`; fixes land in the canonical tree only.
- `pnpm run check:skill-bumps` must pass with zero findings; `pnpm oat:validate-skills` must print zero alias warnings after the migration.
- Every pin is located by the OLD VERSION LITERAL (plain and regex-escaped) across `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests`, never by skill name.
- Provider views: `oat sync --scope project` after the migration must show no deletion; the projected copies carry the new frontmatter.
- Skill authoring templates already emit `metadata.version` only; they are not changed.

## Success Criteria

- All 82 bundled skills declare `metadata.version` and no top-level `version`; each is bumped once.
- `pnpm oat:validate-skills` exits 0 with zero `skill-version-alias` warnings; `pnpm run check:skill-bumps` exits 0.
- `pnpm release:validate` and `pnpm test:release` pass with the explainer-family skills migrated (the RC builder reads `metadata.version`).
- `pnpm test:smoke` and `pnpm test:skills` pass with every pin repointed.
- A skill authored from the shipped template (metadata-only) is accepted by every reader this project touches.
- The decision record and the follow-up item for alias retirement exist; the backlog item is archived with an outcome summary.
