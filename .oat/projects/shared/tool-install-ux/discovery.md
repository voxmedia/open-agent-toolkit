---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-13
oat_generated: false
---

# Discovery: tool-install-ux

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Scope and plan a quick-mode project for `oat tools install` issues in the interactive pack installer:

- user-selected user-scope installs appear to remain effectively project-installed
- the installer should show each pack's current install location
- the prompt should prepopulate with the current location when a pack is already installed
- the UI should indicate when a pack is already installed

## Clarifying Questions

### Question 1: Workflow choice

**Q:** Should this be handled with project workflow tracking or ad hoc planning?
**A:** Use plan-mode scoping first, then switch into `oat-project-quick-start` for a lightweight tracked plan.
**Decision:** Keep this in quick mode and produce `discovery.md` + `plan.md` without implementation code changes.

### Question 2: Project scope

**Q:** Is this project about the earlier cross-pack provider-view deletion bug, or the newer install-scope/UX issue?
**A:** This project is for the newer `oat tools install` scope-selection and install-location UX issues.
**Decision:** Treat the earlier auto-sync deletion bug as out of scope for this project.

## Solution Space

The request is well-understood. No divergent design study is needed before planning. The chosen direction is to treat a scope change as a migration, derive current pack location from installed tools on disk, and update the interactive prompt and summary output to reflect real install state.

## Options Considered

### Option A: Persist pack scope in `.oat/config.json`

**Description:** Add explicit per-pack install-scope metadata to shared config and drive the installer from config state.

**Pros:**

- Easy prompt prepopulation once written
- Centralized metadata for future commands

**Cons:**

- Introduces a config-format change for an issue that can already be inferred from disk state
- Risks drift between config and actual canonical content

**Chosen:** Neither

**Summary:** This adds more surface area than needed for a quick bugfix.

### Option B: Derive pack scope from installed tools on disk

**Description:** Scan project and user canonical roots, map installed tools back to packs, and infer each pack's current location (`project`, `user`, `both`, or `not installed`) at runtime.

**Pros:**

- Uses existing scan logic and reflects the real install state
- Avoids changing config format

**Cons:**

- Requires some new aggregation logic in the installer
- Needs careful handling for packs that exist in both scopes

**Chosen:** B

**Summary:** Runtime detection matches the current architecture and keeps the fix narrowly scoped.

## Key Decisions

1. **Scope semantics:** Changing a user-eligible pack from one scope to the other should behave as a migration, not an additive second install.
2. **State source:** Current install location should be inferred from canonical content on disk, not from new config metadata.
3. **UX target:** The interactive installer should show current install location, indicate already-installed packs, and preselect user-scope choices based on actual state.
4. **Mixed-scope normalization:** If a pack is already installed in both scopes and the user explicitly selects one scope during install, normalize the pack to the selected scope and report cleanup of the opposite-scope canonical content.
5. **Summary output:** Post-install reporting should list the final per-pack scope outcome instead of collapsing mixed results into a single overall scope label.

## Constraints

- Keep this in quick mode; no spec-driven artifacts.
- Do not implement code changes during this skill.
- Avoid changing config or manifest format unless implementation proves it is necessary.
- Respect existing pack scope rules: `core` remains user-only; `workflows` and `project-management` remain project-only.

## Success Criteria

- The resulting plan covers the root cause of the apparent “user scope installed at project level anyway” behavior.
- The plan includes work to surface current install location and already-installed state in the prompt.
- The plan includes regression coverage for scope migration and prompt prepopulation behavior.

## Out of Scope

- The separate cross-pack provider-view deletion bug triggered by `oat tools install <pack>` auto-sync.
- Broad refactors of install/sync architecture unrelated to the install-scope UX issue.
- Config schema changes unless implementation uncovers a hard blocker.

## Deferred Ideas

- Persist explicit per-pack scope metadata in config if runtime inference turns out to be too fragile.
- Consolidate tool install/list/update/remove onto a shared pack-install-state abstraction after this bugfix lands.

## Open Questions

None at discovery time. Remaining implementation choices should stay within the decisions above.

## Assumptions

- The misleading behavior comes from additive installs plus auto-sync across both scopes, not from the eligible-pack copy step writing to the wrong root.
- Existing scan logic can reliably map installed tools back to their owning pack for prompt prepopulation.

## Risks

- **False migration cleanup:** Removing the opposite-scope canonical copy could surprise users who intentionally keep the same pack in both scopes.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Cover the `both` state explicitly in implementation and tests, and make the normalization rule deliberate in command output.
- **Prompt/state drift:** The prompt could show stale or incomplete install-state information if pack aggregation logic is incomplete.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Reuse existing `scanTools` classification and add regression tests for mixed installs.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Quick mode → straight to plan:** selected. Generate implementation tasks for install-state detection, migration semantics, prompt UX, and regressions.
