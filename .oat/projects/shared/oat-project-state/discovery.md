---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-01-28
oat_generated: false
---

# Discovery: oat-project-state

## Initial Request

Implement a minimal design for setting and modifying the active project during the dogfooding phase. This will support the OAT workflow by allowing users to set which project is currently active, with a repo-level dashboard for quick status checks.

## Clarifying Questions

### Question 1: Scope of Operations

**Q:** What operations should 'oat-project-state' support?
**A:** All three commands - open project, clear active project, and complete project
**Decision:** Implement full lifecycle management for dogfooding phase

### Question 2: Interface

**Q:** Should this be a skill or CLI tool?
**A:** Skills with shell scripts for now, will become CLI later
**Decision:** Create skills (e.g., `oat-project-*`) and wrap shell scripts where appropriate

### Question 3: Validation

**Q:** Should setting an active project validate the project exists?
**A:** Yes, strict - only allow projects that have state.md
**Decision:** Validate project directory exists AND contains state.md before setting active

### Question 4: Dashboard Integration

**Q:** Should dashboard generation be wired into oat-project-progress automatically?
**A:** Both oat-project-progress and oat-project-index
**Decision:** Generate dashboard on both status check and knowledge refresh for always-fresh state

## Options Considered

### Option A: Minimal - Just Active Project Pointer

**Description:** Only implement setting/clearing the active project pointer

**Pros:**
- Simplest implementation
- Quick to deliver

**Cons:**
- No visibility into project state without reading files
- No "at a glance" dashboard

### Option B: Full Dashboard + Lifecycle Commands

**Description:** Implement repo dashboard + all three lifecycle commands (open, clear, complete)

**Pros:**
- Complete solution for dogfooding needs
- Single "at a glance" view of repo state
- Clean project lifecycle management

**Cons:**
- More implementation work
- More files to maintain

**Chosen:** B

**Summary:** The full solution provides better developer experience during dogfooding with minimal additional complexity. The dashboard answers "what should I do next?" which is valuable for workflow continuity.

## Key Decisions

1. **File-based architecture:** Keep everything file-based (no DB), derived from existing OAT sources of truth
2. **Dashboard is derived:** `.oat/state.md` is always regenerated, never hand-edited
3. **Strict validation:** Only allow setting active project to directories with valid state.md
4. **Skills first, CLI later:** Implement as skills for dogfooding, migrate to CLI in future phase
5. **Auto-refresh:** Dashboard regenerates on oat-project-progress and oat-project-index runs

## Constraints

- Must work with existing `.oat/active-project` mechanism (local-only, gitignored)
- Must derive data from existing sources (state.md, project-index.md)
- No background watchers or real-time UI
- No multi-project registry (deferred to future phase)
- Keep implementation simple for dogfooding

## Success Criteria

- [ ] Can switch active project via `oat-project-open`
- [ ] Can clear active project via `oat-project-clear-active`
- [ ] Can mark project complete via `oat-project-complete`
- [ ] Dashboard (`.oat/state.md`) shows active project, phase, blockers, knowledge staleness
- [ ] Dashboard regenerates automatically on oat-project-progress and oat-project-index
- [ ] Validation prevents setting invalid project paths

## Out of Scope

- Multi-project registry (`.oat/projects/state.json`)
- Background watchers or real-time UI
- Automatic project switching via git hooks
- Archive/deletion semantics for completed projects
- MRU (most recently used) tracking
- Branch-to-project mapping

## Deferred Ideas

- `oat-archive-project` - Move completed projects to archive - deferred until we have more projects to manage
- Branch-aware project switching - deferred to Product v2.0
- CLI commands (`oat project open/clear/complete`) - deferred until CLI infrastructure exists

## Open Questions

- **Project completion semantics:** Should complete-project enforce that final review is passed? (Answer: Optional check, not enforced)

## Assumptions

- Projects always live in `.agent/projects/<name>/` during dogfooding
- All projects have a valid `state.md` file
- Dashboard generation script runs in <1 second (acceptable overhead)

## Risks

- **State drift:** Dashboard could become stale if generation fails
  - **Likelihood:** Low
  - **Impact:** Low (dashboard is informational only)
  - **Mitigation:** Make script idempotent and fast

## Reference Design

Full design specification in: `.oat/internal-project-reference/temp/oat-project-state.md`

## Deliverables

1. **Script:** `.oat/scripts/generate-oat-state.sh`
2. **Skill:** `oat-project-open` (set active project)
3. **Skill:** `oat-project-clear-active` (clear active project)
4. **Skill:** `oat-project-complete` (mark project complete)
5. **Integration:** Wire dashboard generation into oat-project-progress
6. **Integration:** Wire dashboard generation into oat-project-index

## Next Steps

Ready for `oat-project-spec` to create formal specification.
