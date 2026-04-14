---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_generated: false
---

# Discovery: install-sync

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Capture code-level details only when they materially define the scope of the fix.

## Initial Request

Follow up on the remaining `oat tools install <pack>` auto-sync scoping bug. The previous fix addressed silent cross-pack deletions caused by stale manifest entries, but a new reproduction shows that `oat tools install docs` still creates unrelated provider-view entries and Codex agent config for canonical content outside the docs pack.

## Clarifying Questions

### Question 1: Discovery Input

**Q:** Should the new quick-start project use the session context rather than asking for a separate description?
**A:** Yes. Infer the project description from the discussion and reproduce-focused analysis we already completed.
**Decision:** Use the established repro, diff, and root-cause analysis from this session as the discovery basis.

## Chosen Direction

Use the existing install-triggered sync filter as the authoritative canonical scope for the entire sync plan, not just stale-manifest removals.

**Rationale:** The current behavior is already close to correct. `oat tools install` passes the installed canonical paths into `oat sync`, but sync planning only applies that filter during the removal pass. Extending the same filter to entry generation and Codex extension planning keeps the fix local to the sync boundary and avoids pack-specific logic in install commands.

**User validated:** Yes

## Options Considered

### Option A: Scope Sync Planning by Canonical Filter _(Chosen)_

**Description:** Treat `--install-canonical` as a full sync scope for plan generation, removals, and extension writes.

**Pros:**

- Preserves the install/sync separation
- Matches the mental model of "sync only what was just installed"
- Covers provider views and Codex extension config with one consistent rule

**Cons:**

- Requires touching both sync planning and Codex extension computation
- Needs regression coverage across command and engine layers

**Chosen:** A

**Summary:** Keep the fix in sync orchestration and apply one canonical filter consistently across all install-triggered side effects.

## Key Decisions

1. **Scope boundary:** Install-triggered sync should only add, update, or remove provider artifacts for canonical paths explicitly passed by install.
2. **Codex config behavior:** Install-triggered Codex extension updates must also respect the same canonical path scope.
3. **Regression strategy:** Add focused tests around sync planning and install-triggered behavior rather than broad workflow refactors.

## Constraints

- Do not refactor the overall install/sync architecture
- Do not change manifest schema unless the fix proves it is necessary
- Keep behavior unchanged for ordinary `oat sync` runs that are not install-triggered

## Success Criteria

- Running `oat tools install docs` only syncs docs-pack canonical content
- Unrelated provider views are not added during install-triggered auto-sync
- `.codex/config.toml` does not gain unrelated agents during docs-pack install
- Regression tests fail before the fix and pass after

## Out of Scope

- Revisiting the already-fixed stale-manifest deletion path unless a new repro proves regression
- Broader redesign of provider view syncing
- Changes to skill manifests or pack membership

## Deferred Ideas

- A future audit of whether non-install `oat sync` should support other scoped partial-sync workflows
- UI improvements to explain why install-triggered sync is intentionally narrower than a full sync

## Open Questions

- Whether the Codex project extension planning path can consume the same canonical filter directly or needs a narrower adapter-level projection
- Whether one command-level regression test is enough, or whether the Codex extension behavior also needs a dedicated unit test

## Assumptions

- The reproduced additions in `.claude/`, `.github/`, and `.codex/config.toml` come from canonical content already present under `.agents/`
- The install command already passes the correct canonical scope for the selected pack
- The desired behavior is that install-triggered auto-sync remains narrowly scoped to the installed pack

## Risks

- **Risk Name:** Partial scoping leaves one output path unfiltered
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Add regression coverage that asserts both provider-view and Codex config outputs remain scoped

## Next Steps

- Update sync planning so install-triggered canonical filters scope entry generation as well as removals
- Apply the same scope to Codex extension planning
- Add regression tests for scoped install-triggered sync
- Hand off to `oat-project-implement`
