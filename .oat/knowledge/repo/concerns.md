---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

### CLI is Placeholder Only
- **Issue:** `packages/cli/src/index.ts` is a stub with no implementation
- **Impact:** Primary value proposition (CLI tooling) not yet delivered
- **Priority:** High (planned for future phases)

### No Test Infrastructure
- **Issue:** No test framework configured despite Turborepo test task
- **Impact:** No automated quality verification
- **Priority:** High

### Project Artifacts Gitignored
- **Issue:** `.agent/projects/**` is gitignored
- **Impact:** Project state is local-only, no multi-developer collaboration
- **Priority:** Medium (planned for future phases)

## Known Bugs

### None Critical

No critical bugs identified in current codebase.

## Security Considerations

### Hardcoded Version
- **Issue:** CLI version hardcoded as "0.0.1"
- **Risk:** Low (CLI not functional yet)
- **Fix:** Read from package.json when implementing

### No Secrets Validation
- **Issue:** No validation of environment variables
- **Risk:** Low (no secrets used currently)

## Performance

### Knowledge Base Generation
- **Issue:** Sequential shell-based scanning
- **Impact:** May scale poorly for large repos
- **Mitigation:** Thin index generated first for fast feedback

### No Incremental Updates
- **Issue:** Full regeneration on each `/oat:index`
- **Impact:** Redundant work if codebase unchanged
- **Future:** Implement incremental refresh

## Fragile Areas

### State.md Frontmatter
- **Why:** Source of truth for workflow routing
- **Risk:** Manual editing can corrupt state
- **Mitigation:** Use skills for modifications

### Plan.md Task Headers
- **Why:** Task IDs parsed from headers
- **Risk:** Format changes break parsing
- **Mitigation:** Use templates, preserve format

### Skill Registration
- **Why:** Skills registered manually in AGENTS.md
- **Risk:** New skills can be missed
- **Mitigation:** Update AGENTS.md when adding skills

## Missing Features

### No Async Review Support
- **Impact:** Blocks distributed team workflows
- **Status:** Planned for future

### No Multi-Branch Support
- **Impact:** Single active project at a time
- **Status:** Planned for future

### No Automated PR Opening
- **Impact:** Manual `gh pr create` required
- **Status:** Could be added to skills

## Test Coverage Gaps

### No Automated Tests
- **Untested:** All skill logic, parsing, state management
- **Risk:** Bugs found only during manual testing
- **Priority:** High

## Priority Matrix

| Issue | Impact | Priority |
|-------|--------|----------|
| No test infrastructure | High | HIGH |
| CLI placeholder | High | HIGH (deferred) |
| Project gitignore | Medium | MEDIUM |
| State.md fragility | Medium | MEDIUM |
| Hardcoded version | Low | LOW |

---

*Concerns audit: 2026-01-28*
