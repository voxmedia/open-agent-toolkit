---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-03-08
oat_generated: false
---

# Design: oat-project-document

## Overview

oat-project-document is a self-contained OAT skill that reads project artifacts and implementation code to identify documentation surfaces that need updating, creates new documentation where gaps exist, and applies approved changes in a single invocation. It follows the artifact-driven targeting approach: project artifacts (discovery, spec, design, plan, implementation.md) define what was built, code serves as source of truth for verification, and the skill assesses only documentation surfaces affected by the project.

The skill operates in two modes: interactive (default) where a delta plan is presented for user approval, and autonomous (`--auto`) where all recommendations are applied directly. It integrates with the project lifecycle via an `oat_docs_updated` frontmatter field and can optionally gate `oat-project-complete`.

## Architecture

### System Context

This skill sits between the implementation/review phase and the completion phase in the OAT project lifecycle:

```
implement → review → [oat-project-document] → complete
```

It reads from project artifacts and code (inputs), evaluates documentation surfaces (analysis), and writes to documentation files (outputs). It does not modify project artifacts except for the `oat_docs_updated` state field.

**Key Components:**
- **Project Resolver:** Resolves target project from argument, active project config, or user prompt
- **Artifact Reader:** Reads and synthesizes project artifacts into a "what was built" model
- **Code Verifier:** Reads source files referenced in artifacts to confirm implementation reality
- **Surface Scanner:** Discovers all documentation and instruction surfaces in the repo
- **Delta Assessor:** Compares "what was built" against "what's documented" to produce recommendations
- **Approval Gate:** Presents delta plan to user for approval (skipped in `--auto` mode)
- **Change Applier:** Writes approved documentation updates, creates new files, splits large files

### Data Flow

```
[1] Resolve project → read artifacts (discovery, spec, design, plan, implementation.md)
                          ↓
[2] Build "what was built" model (features, APIs, config, decisions, frameworks)
                          ↓
[3] Verify against source code (read referenced files)
                          ↓
[4] Scan documentation surfaces (docs dir, READMEs, AGENTS.md, provider rules, reference files)
                          ↓
[5] Assess delta per surface (update / create / split / no change)
                          ↓
[6] Present delta plan → user approval (or --auto skip)
                          ↓
[7] Apply changes → commit → update oat_docs_updated state
```

## Component Design

### Project Resolver

**Purpose:** Determine which project to operate on.

**Logic:**
1. If `project-path` argument provided → use it directly
2. Else read `activeProject` from `.oat/config.local.json`
3. If neither → prompt user via AskUserQuestion
4. Validate: state.md exists, at least one artifact (plan.md or implementation.md) is present

**Design Decisions:**
- Does not require specific lifecycle state — works on active or completed projects
- Read-only access to project state (only writes `oat_docs_updated`)

### Artifact Reader

**Purpose:** Read project artifacts and synthesize a "what was built" understanding.

**Inputs:** discovery.md, spec.md (if exists), design.md (if exists), plan.md, implementation.md

**Extracts:**
- Features and capabilities added
- Architectural decisions made
- New frameworks, tooling, or libraries introduced
- New CLI commands or config schema changes
- New directories or structural changes
- API changes or additions

**Design Decisions:**
- Reads all available artifacts; gracefully handles missing ones (quick-mode projects may lack spec/design)
- Synthesizes across artifacts rather than treating each independently

### Surface Scanner

**Purpose:** Discover all documentation and instruction surfaces in the repository.

**Documentation surfaces (primary — thorough analysis):**

| Surface | Discovery Method |
|---|---|
| Docs directory | `documentation.root` from config, or auto-detect (scan for mkdocs.yml, docusaurus.config.js, etc.) |
| Root README.md | Always check |
| Subdirectory READMEs | Glob `**/README.md` — assess existing ones for relevance; flag missing ones for new apps/packages |
| Reference files | Check `.oat/repo/reference/` (current-state, backlog, roadmap, decision-record) |

**Instruction surfaces (secondary — strong signals only):**

| Surface | Discovery Method | Signal Threshold |
|---|---|---|
| Root AGENTS.md / CLAUDE.md | Always check | New dev commands, build changes, architectural conventions |
| Subdirectory AGENTS.md | Glob `**/AGENTS.md` | New directory with complex patterns needing agent guidance |
| Provider rules | Check enabled providers via `.oat/sync/config.json`; scan `.cursor/rules/`, `.claude/rules/`, etc. | New test framework, styling library, tooling requiring glob-scoped rules |

**Auto-detection fallback (when `documentation` config absent):**
- Scan for `mkdocs.yml`, `docusaurus.config.js`, `conf.py`, `docs/` directory
- Infer root, tooling, config for the session (do not write to config)

### Delta Assessor

**Purpose:** Compare what was built against what's documented to produce actionable recommendations.

**Recommendation types:**
- **UPDATE:** Existing doc needs content changes to reflect new behavior/features
- **CREATE:** No existing doc covers this area — recommend new file/directory
- **SPLIT:** Existing doc would become too large with additions — recommend breaking it up

**Per recommendation, captures:**
- Target file (existing path or proposed new path)
- Action type (update / create / split)
- Summary of what changes and why
- Evidence (which artifact/code drove the recommendation)

**Design Decisions:**
- Instructions only recommended with strong signals (new framework, new directory, new tooling pattern)
- File size heuristic for split recommendations (configurable threshold, sensible default)

### Approval Gate

**Purpose:** Present delta plan for user confirmation before applying changes.

**Interactive mode (default):**
- Display grouped delta plan (documentation updates, then instruction updates)
- Options: approve all, approve individually, skip entirely
- If skipped → no changes applied, `oat_docs_updated` remains null

**Autonomous mode (`--auto`):**
- Skip presentation and approval
- Apply all recommendations directly

### Change Applier

**Purpose:** Execute approved documentation updates.

**Operations:**
- Edit existing files (update content)
- Create new files and directories
- Split large files (create new file, move content, update original)
- Update docs tooling nav structure if config exists (e.g., mkdocs.yml nav)

**Commit convention:**
- `docs({scope}): {description}` for documentation changes
- Single commit containing all documentation updates plus state.md update

## Data Models

### Config Schema Addition

**Location:** `.oat/config.json`

```json
{
  "documentation": {
    "root": "apps/oat-docs/docs",
    "tooling": "mkdocs",
    "config": "apps/oat-docs/mkdocs.yml",
    "requireForProjectCompletion": false
  }
}
```

All fields optional. All paths relative to repo root.

### State Frontmatter Addition

**Location:** `state.md` (per project)

```yaml
oat_docs_updated: null  # null | skipped | complete
```

- `null` — documentation step hasn't been run
- `skipped` — user explicitly chose to skip
- `complete` — documentation updates applied (or no updates needed)

## Integration Points

### oat-project-complete

When oat-project-complete runs, it checks `oat_docs_updated`:

1. If `null` and `requireForProjectCompletion` is `false` (default): soft suggestion — "Consider running oat-project-document before completing this project."
2. If `null` and `requireForProjectCompletion` is `true`: hard gate — cannot proceed until complete or skipped.
3. If `skipped` or `complete`: proceeds normally.

### Skill Arguments

```
argument-hint: "[project-path] [--auto]"
```

- `project-path` — optional explicit path to project directory
- `--auto` — skip user approval, apply all recommendations directly

## Open Questions

None — all resolved during brainstorming.

## References

- Discovery: `discovery.md`
- Related skills: `oat-docs-analyze`, `oat-docs-apply`, `oat-project-complete`
- Config schema: `.oat/config.json`
- Provider sync config: `.oat/sync/config.json`
