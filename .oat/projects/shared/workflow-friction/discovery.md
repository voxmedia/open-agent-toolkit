---
oat_status: complete
oat_ready_for: plan
oat_blockers: []
oat_last_updated: 2026-04-07
oat_generated: false
oat_template: false
---

# Discovery: Workflow Friction — User Preference Config

## Initial Request

Add user-configurable workflow preferences to `.oat/config.local.json` (and optionally `.oat/config.json` for team-shared defaults) so that repetitive confirmation prompts in OAT workflow skills can be answered once and respected automatically. This reduces friction for power users who always make the same choices.

Examples given by user:

- Set final-phase-only as HiLL checkpoint default for implementation
- Always trigger automatic review at checkpoints
- Always archive on project completion (no confirmation)
- Always auto-create PR without confirmation in pr-final
- General pattern: let users configure defaults so workflows skip asking

## Research Findings

### Confirmation Points Mapped (19 total across 4 skills)

**oat-project-implement (7 prompts):**

1. HiLL checkpoint behavior — 3 options: every phase / specific phases / final only
2. Auto-review at checkpoints — yes/no (already partially configurable via `autoReviewAtCheckpoints`)
3. Resume vs fresh start — when implementation.md exists
4. Stale-state reconciliation — approve bookkeeping drift fix
5. Phase completion pause — continue to next phase?
6. Final review execution model — subagent / fresh session / inline (3 tiers)
7. Post-implementation sequence — summary+docs+PR / summary+PR / exit

**oat-project-pr-final (2 prompts):** 8. Proceed without passed final review — override gate 9. Proceed with missing Final Summary — quality warning

**oat-project-complete (4 prompts):** 10. Ready to mark complete — primary confirmation 11. Archive after completion — yes/no 12. Open a PR in GitHub — yes/no (skipped if PR already tracked) 13. Documentation gate override — proceed without docs sync 14. Completion gates override — proceed despite unsatisfied gates

**oat-project-review-provide (5 prompts):** 15. Review type/scope — inferred or ask 16. Target branch mismatch — switch / inline / cancel 17. Re-review scope narrowing — scope to fix commits only 18. Scope range fallback — how to define range when heuristics fail 19. Subagent authorization — delegate to oat-reviewer

**oat-project-next (0 prompts):** Read-only router, no confirmations by design.

### Existing Config System

**4 config surfaces:**

- `.oat/config.json` — shared repo (committed), team defaults
- `.oat/config.local.json` — per-developer (gitignored), personal state
- `~/.oat/config.json` — user-level global fallback
- `.oat/sync/config.json` — provider sync only

**CLI:** `oat config get/set/list/describe` with type-safe registry (`ConfigKey` union, `CONFIG_CATALOG` metadata, `KEY_ORDER` display ordering).

**Resolution:** env vars → shared → local → user → defaults, with source tracking.

**Already partially exists:** `autoReviewAtCheckpoints` in `.oat/config.json` is read by `oat-project-implement` to skip the auto-review prompt. This is the pattern to extend.

### Config architecture insight

The existing `autoReviewAtCheckpoints` key proves the pattern works: a boolean in config.json that skills check, skipping the prompt when the preference is already expressed. The feature we're building generalizes this to more confirmation points.

## Key Decisions

1. **Config surface:** New preference keys live in `.oat/config.json` (shared/team) with per-developer overrides in `.oat/config.local.json`. Local takes precedence over shared for preferences. This matches the existing resolution model.
2. **Namespace:** All workflow preference keys use a `workflow.` prefix (e.g., `workflow.hillCheckpointDefault`, `workflow.archiveOnComplete`) to distinguish them from existing operational config.
3. **Scope:** Focus on the highest-friction, most-repeated confirmations first. Not every prompt should be configurable — safety gates and context-dependent decisions remain interactive.
4. **Skill contract:** Skills check config before prompting. If a preference is set, the skill uses it silently and logs that a default was applied. If not set, the skill prompts as before (backward compatible).

## Constraints

- Must be backward compatible — missing keys = current interactive behavior
- Must work with `oat config get/set/list/describe` (extend the registry)
- Must not bypass safety-critical gates silently (e.g., "proceed without review" should not be auto-skippable)
- Skills read config via `oat config get` — no direct file parsing in skills
- Boolean preferences should be simple true/false; enum preferences should use string values

## Success Criteria

- Power users can configure their common choices once and never be prompted again for those specific decisions
- `oat config describe` shows all new preference keys with descriptions
- `oat config set workflow.<key> <value>` works for all new keys
- Skills respect preferences when set, prompt when not set
- No breaking changes to existing workflows

## Out of Scope

- Per-project preference overrides in `plan.md` frontmatter (existing `oat_auto_review_at_checkpoints` stays as-is)
- UI/interactive config wizard
- Migration of existing `autoReviewAtCheckpoints` under the `workflow.` namespace (keep it where it is for backward compat, but document the relationship)

## Deferred Ideas

- **Per-project overrides via plan.md frontmatter** — would allow project-level preference tuning. Deferred because config.json/config.local.json covers the 80% case.
- **Config profiles** (e.g., `oat config profile use power-user`) — bundles of preferences. Nice but unnecessary complexity for v1.
- **`oat config init-preferences`** interactive wizard — guided setup of all preferences. Can be a follow-up.

## Open Questions

Resolved during plan review:

- ~~**Naming:**~~ `workflow.` prefix confirmed. ✅
- ~~**Safety gates:**~~ Gate overrides excluded from config. ✅
- **`hillCheckpointDefault` values:** Dropped `"none"` — identical to `"final"`. Now `"every" | "final"` only.
- **`autoCreatePr` → `createPrOnComplete`:** Renamed to clarify it controls the completion flow's PR question, not pr-final (which already auto-creates).
- **Resume prompt:** Dropped as config key. Changed to always-resume default in skill behavior (fresh start via explicit argument only).
- **Bookkeeping commits:** Not a config concern — skill enforcement issue. Added strengthened DO NOT SKIP guidance as a skill task.

## Assumptions

- Skills will be updated to check config before prompting — this is a skill-by-skill change
- The config CLI already supports nested keys with dot notation (confirmed: `archive.s3Uri`, `documentation.root`, etc.)
- Users will set preferences via `oat config set` CLI commands

## Risks

- **Skill drift:** Skills may add new prompts that don't check config. Mitigation: document the pattern and add it to the skill authoring guide.
  - Likelihood: Medium
  - Impact: Low (new prompts just won't have defaults until updated)
  - Mitigation: Add convention to skill authoring docs

## Next Steps

- **Quick mode → straight to plan:** Scope is clear, no architecture decisions remain. Proceed directly to `plan.md`.
