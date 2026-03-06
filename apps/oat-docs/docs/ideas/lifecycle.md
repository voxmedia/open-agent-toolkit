# Ideas Lifecycle

The ideas lifecycle is intentionally lightweight compared to the project workflow.

## Levels

Ideas can be stored at two levels:

- **Project level** (default) — `.oat/ideas/` in the current project, gitignored
- **User level** (global) — `~/.oat/ideas/` in the home directory, for ideas not tied to a specific project

All idea skills accept a `--global` flag to operate at user level. Without the flag, skills auto-detect the level by checking for an active idea pointer or existing ideas directory at each level.

Each level has its own independent backlog, scratchpad, and active-idea pointer.

## Flow

1. Quick capture: `oat-idea-scratchpad` to review or capture idea seeds
2. Start brainstorming: `oat-idea-new` (scaffolds directory, then invokes `oat-idea-ideate`)
3. Resume brainstorming: `oat-idea-ideate` (multiple sessions over time)
4. Finalize: `oat-idea-summarize` (generates summary, updates backlog)

## Directory structure

```text
# Project level
.oat/ideas/
├── backlog.md              # Aggregated list of all ideas
├── scratchpad.md           # Quick-capture pad for idea seeds
└── {idea-name}/
    ├── discovery.md        # Brainstorming document
    └── summary.md          # Generated when finalized

# User level (global) — same structure
~/.oat/ideas/
├── backlog.md
├── scratchpad.md
└── {idea-name}/
    ├── discovery.md
    └── summary.md
```

## State model

Ideas track two states in `discovery.md` frontmatter:

- `brainstorming` — actively being explored
- `summarized` — finalized with a summary document

No `state.md` per idea. No HiLL gates. No knowledge base dependency.

## Active idea pointer

Each level has its own pointer file (both gitignored):

- Project level: `.oat/active-idea`
- User level: `~/.oat/active-idea`

Ideas and projects use separate pointers and do not interfere with each other.

## Scratchpad

The scratchpad is a checklist for capturing idea seeds quickly. Each entry supports nested bullets for quick notes:

```markdown
- [ ] **{idea name}** - {brief summary} _(YYYY-MM-DD)_
  - {quick note}
  - {another note}
```

Use `oat-idea-scratchpad` to review entries or quick-capture new ones. When `oat-idea-ideate` runs without an active idea, it also shows scratchpad entries alongside existing ideas. Selecting a scratchpad entry scaffolds the idea inline.

## Backlog

The backlog (`backlog.md`) aggregates all ideas in three sections:

- **Active Brainstorming** — ideas currently being explored
- **Captured Ideas** — summarized and ready for future consideration
- **Archived** — completed, abandoned, or promoted to projects

## Promotion to project

To promote a summarized idea to a Spec-Driven OAT project:

1. Run the `oat-project-new` skill with the idea name to scaffold the project
2. Run the `oat-project-discover` skill and use the idea's `summary.md` as the initial request
3. Update the ideas backlog entry to Archived with reason: promoted to project

## Initialization

The ideas directory is created automatically by `oat-idea-new` or `oat-idea-scratchpad` on first use. Future: `oat init ideas` will scaffold the directory and copy idea skills into the project.

## Reference artifacts

- `{IDEAS_ROOT}/backlog.md`
- `{IDEAS_ROOT}/scratchpad.md`
- `{IDEAS_ROOT}/{idea-name}/discovery.md`
- `{IDEAS_ROOT}/{idea-name}/summary.md`
- `.oat/templates/ideas/`
