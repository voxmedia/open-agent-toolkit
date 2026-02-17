---
name: oat-project-plan-writing
description: Canonical plan.md format contract shared by all plan-producing and plan-mutating skills
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Glob, Grep
---

# Plan Writing Contract

Defines the canonical `plan.md` format that all OAT plan-producing and plan-mutating skills must follow.

## Progress Indicators (User-Facing)

When a skill invokes this contract during plan authoring, it should print a sub-banner:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ PLAN WRITING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a sub-phase indicator; the calling skill owns the top-level banner.

## Canonical Plan Format

Every `plan.md` produced or edited by any OAT skill **must** satisfy these invariants.

### Required Frontmatter Keys

```yaml
---
oat_plan_source: full | quick | imported   # origin workflow mode
oat_plan_hil_phases: []                     # HiL checkpoint phase list (empty = every phase)
oat_status: in_progress | complete          # plan lifecycle status
oat_ready_for: null | oat-project-implement # downstream consumer
---
```

Additional frontmatter keys (`oat_phase`, `oat_phase_status`, `oat_blockers`, `oat_last_updated`, `oat_generated`, `oat_template`, `oat_import_reference`, `oat_import_source_path`, `oat_import_provider`) are set by calling skills as needed.

### Stable Task IDs

- Format: `pNN-tNN` (e.g., `p01-t03`, `p02-t12`).
- IDs are monotonically increasing within a phase and never reused.
- Review-generated fix tasks continue the sequence (e.g., after `p03-t08`, fixes start at `p03-t09`).
- Heading format: `### Task pNN-tNN: {Task Name}`.

### Required Sections

Every `plan.md` must contain these sections (order may vary):

1. **`## Reviews`** - Table tracking review status per phase/scope.
2. **`## Implementation Complete`** - Summary with phase counts and total task count.
3. **`## References`** - Links to related artifacts (design, spec, discovery, etc.).

If any required section is missing when a skill edits `plan.md`, it must be restored using the template headings without deleting existing content.

### Review Table Preservation Rules

- The `## Reviews` table includes both **code** rows (`p01`, `p02`, …, `final`) and **artifact** rows (`spec`, `design`).
- Skills must **never delete** existing review rows.
- New rows may be appended (e.g., `p03` for a newly added phase).
- Status semantics: `pending` → `fixes_added` → `fixes_completed` → `passed`.

### Implementation Complete Section

- Must reflect accurate phase counts and total task count.
- When review-fix tasks are added, update totals immediately.
- Phase rollup counts in headings (if present) must stay consistent.
