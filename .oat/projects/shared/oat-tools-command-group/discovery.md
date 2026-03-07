---
oat_status: complete
oat_ready_for: spec
oat_blockers: []
oat_last_updated: 2026-03-07
oat_generated: false
---

# Discovery: oat-tools-command-group

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Introduce a unified `oat tools` command group that consolidates tool lifecycle management (install, update, remove, list) under a single noun-first command namespace. Currently tool management is scattered across `oat init tools` (install), `oat remove skill` / `oat remove skills` (remove), with no update or list capabilities at all.

## Clarifying Questions

### Question 1: Command surface

**Q:** What operations should `oat tools` support?
**A:** Install, update, remove, list, and outdated-check.
**Decision:** Five subcommands covering the full lifecycle.

### Question 2: Relationship to existing commands

**Q:** Should `oat init tools` and `oat remove skill/skills` be replaced or aliased?
**A:** Phase 1 adds the new commands. Phase 2 wraps existing logic under the new namespace. Deprecation of old surface is a follow-up.
**Decision:** Incremental migration — new commands first, consolidation second, deprecation later.

### Question 3: Dry-run convention

**Q:** New commands should use `--dry-run` (mutate by default) vs existing `--apply` (dry-run by default). How to handle?
**A:** New `oat tools` commands use `--dry-run`. Existing commands keep `--apply` until a separate follow-up PR flips the convention CLI-wide.
**Decision:** New convention for new commands only; old convention untouched in this project.

## Options Considered

### Option A: Extend existing commands in place

**Description:** Add update/list/outdated as new subcommands under `oat init tools` and `oat remove`.

**Pros:**
- No new top-level command
- Less code to write

**Cons:**
- `oat init tools update` is awkward naming (init implies first-time)
- `oat init tools list` doesn't make semantic sense under "init"
- Scattered across two unrelated command groups

**Chosen:** No

### Option B: New `oat tools` command group

**Description:** Create a dedicated `oat tools` namespace with install, update, remove, list, outdated subcommands.

**Pros:**
- Clean noun-first naming: `oat tools install`, `oat tools update`, etc.
- Consolidates all tool lifecycle operations in one place
- `list` and `outdated` fit naturally
- Room for future subcommands (e.g., `oat tools info <name>`)

**Cons:**
- New top-level command adds to CLI surface
- Temporary overlap with existing `oat init tools` / `oat remove skill`

**Chosen:** Yes

**Summary:** A dedicated `oat tools` command group provides clean, intuitive naming for the full tool lifecycle. The temporary overlap with existing commands is acceptable and will be resolved via deprecation in a follow-up.

## Key Decisions

1. **Namespace:** `oat tools` as a new top-level command group with subcommands: `install`, `update`, `remove`, `list`, `outdated`.
2. **Mutability convention:** New commands mutate by default with `--dry-run` opt-in (not `--apply`). Existing commands unchanged.
3. **Pack granularity:** Operations work at three levels — single tool by name, pack (`ideas`, `workflows`, `utility`), or `--all`.
4. **Scope support:** All subcommands support `--scope project|user|all` (default `all`), consistent with existing CLI.
5. **Agent support:** `update`, `remove`, and `list` cover both skills and agents (not just skills).
6. **Version detection for agents:** Agents currently lack version frontmatter. Use content-hash comparison initially; add version frontmatter to agents as part of this project.

## Constraints

- Must follow existing CLI architecture patterns: dependency injection, Commander.js factories, help snapshot tests
- Must reuse existing business logic (copy helpers, version comparison, manifest management) — no duplication
- Must support both interactive (TTY) and non-interactive (`--json`) modes
- Workflows pack is project-scope only; this constraint must be enforced in all subcommands
- User-scope only supports skills, not agents
- Must not break existing `oat init tools` or `oat remove skill/skills` commands

## Success Criteria

- `oat tools update` can detect and apply available updates for individual tools, packs, or all tools
- `oat tools list` shows all installed tools with version, pack membership, scope, and update status
- `oat tools outdated` shows only tools with available updates
- `oat tools install` provides same functionality as current `oat init tools`
- `oat tools remove` provides same functionality as current `oat remove skill` + `oat remove skills`
- All subcommands support `--json` structured output
- All subcommands support `--scope` filtering
- Help snapshot tests pass for all new commands
- Existing commands continue to work unchanged

## Out of Scope

- Deprecation warnings on `oat init tools` and `oat remove skill/skills` (follow-up)
- CLI-wide `--apply` → `--dry-run` convention flip (follow-up)
- Tool publishing or registry features
- Tool creation/scaffolding (`oat tools new`)
- Remote tool installation from URLs or registries

## Deferred Ideas

- `oat tools info <name>` — show detailed info about a single tool (description, version history, dependencies) — deferred as nice-to-have
- Auto-trigger `oat sync --apply` after tool updates — deferred; explicit reminder is safer
- `--apply` → `--dry-run` convention flip across all existing commands — separate PR, purely mechanical

## Open Questions

- **Sync integration:** After `oat tools update` modifies canonical files, should it auto-run sync or just print a reminder? Current lean: print reminder (consistent with `oat init tools` behavior).
- **Custom tools in list:** Skills not belonging to any bundled pack should appear as "custom" in `oat tools list`. Should they be updateable? Current lean: no — they have no bundled source to update from.

## Assumptions

- The existing `copyDirWithVersionCheck` and `compareVersions` utilities are sufficient for update detection
- Agent files are small enough that content-hash comparison is performant (no need for incremental checks)
- Pack membership can be determined statically from the existing skill/agent arrays in install-*.ts files

## Risks

- **Naming collision:** `tools` as a top-level command could conflict with future CLI concepts
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** "tools" is well-established CLI naming (npm, brew, etc.); unlikely to conflict

- **Dual-command confusion:** Users may be confused by both `oat init tools` and `oat tools install` existing simultaneously
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Documentation should point to `oat tools` as the preferred surface; deprecation follow-up will resolve

## Next Steps

Continue to `oat-project-spec` (after HiLL approval if configured) to formalize requirements.
