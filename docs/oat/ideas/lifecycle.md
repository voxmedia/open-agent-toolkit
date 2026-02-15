# Ideas Lifecycle

The ideas lifecycle is intentionally lightweight compared to the project workflow.

## Flow

1. Quick capture: jot idea seeds in `.oat/ideas/scratchpad.md`
2. Start brainstorming: `oat-idea-new` (scaffolds directory, then invokes `oat-idea-ideate`)
3. Resume brainstorming: `oat-idea-ideate` (multiple sessions over time)
4. Finalize: `oat-idea-summarize` (generates summary, updates backlog)

## Directory structure

```
.oat/ideas/
├── backlog.md              # Aggregated list of all ideas
├── scratchpad.md           # Quick-capture pad for idea seeds
└── {idea-name}/
    ├── discovery.md        # Brainstorming document
    └── summary.md          # Generated when finalized
```

## State model

Ideas track two states in `discovery.md` frontmatter:

- `brainstorming` — actively being explored
- `summarized` — finalized with a summary document

No `state.md` per idea. No HiL gates. No knowledge base dependency.

## Active idea pointer

`.oat/active-idea` stores the path to the current idea (gitignored). Ideas and projects use separate pointers and do not interfere with each other.

## Scratchpad

`.oat/ideas/scratchpad.md` is a simple checklist for capturing idea seeds quickly. When `oat-idea-ideate` runs without an active idea, it shows scratchpad entries alongside existing ideas. Selecting a scratchpad entry scaffolds the idea inline.

## Backlog

`.oat/ideas/backlog.md` aggregates all ideas in three sections:

- **Active Brainstorming** — ideas currently being explored
- **Captured Ideas** — summarized and ready for future consideration
- **Archived** — completed, abandoned, or promoted to projects

## Promotion to project

To promote a summarized idea to a full OAT project:

1. Run `oat-new-project {idea-name}` to scaffold the project
2. Run `oat-discovery` and use the idea's `summary.md` as the initial request
3. Update the ideas backlog entry to Archived with reason: promoted to project

## Initialization

The `.oat/ideas/` directory is created automatically by `oat-idea-new` on first use. Future: `oat init ideas` will scaffold the directory and copy idea skills into the project.

## Reference artifacts

- `.oat/ideas/backlog.md`
- `.oat/ideas/scratchpad.md`
- `.oat/ideas/{idea-name}/discovery.md`
- `.oat/ideas/{idea-name}/summary.md`
- `.oat/templates/ideas/`
