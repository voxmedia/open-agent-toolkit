---
title: Ideas Lifecycle
description: 'Ideas directory structure, state model, scratchpad flow, and promotion to projects.'
---

# Ideas Lifecycle

The ideas lifecycle is intentionally lightweight compared to the project workflow.

## Levels

Ideas can be stored at two levels:

- **Project level** (default) — `.oat/ideas/` in the current project, gitignored
- **User level** (global) — `~/.oat/ideas/` in the home directory, for ideas not tied to a specific project

All idea skills accept a `--global` flag to operate at user level. Without the flag, skills auto-detect the level by checking for an active idea pointer or existing ideas directory at each level.

Each level has its own independent backlog, scratchpad, and active-idea config value.

## Flow

1. Quick capture: `oat-idea-scratchpad` to review or capture idea seeds
2. Start brainstorming: `oat-idea-new` (scaffolds directory, then invokes `oat-idea-ideate`)
3. Resume brainstorming: `oat-idea-ideate` (multiple sessions over time)
4. Finalize: `oat-idea-summarize` (generates summary, updates backlog)

## Relationship to `oat-brainstorm`

The always-on `oat-brainstorm` skill (in the `brainstorm` tool pack) can feed into this workflow. When a brainstorming conversation converges on an ideas-pack destination, the dispatcher follows the same flow above and seeds it with the brainstorming session content:

- **Capture as new idea** — runs `oat-idea-new` Steps 3-7 inline and pre-fills the new idea's `discovery.md` from the brainstorming payload (`What's the Idea?` from the synthesized summary + motivation, `What Would It Look Like?` from the vision, `Open Questions` from the conversation, plus a first session under `Notes & Discussion` headed `### Session: YYYY-MM-DD (seeded from oat-brainstorm)`). The dispatcher then optionally chains into `oat-idea-ideate` Step 4 to keep brainstorming inside the idea, or stops with the session captured.
- **Extend existing idea** — jumps straight to `oat-idea-ideate` Step 4 (Start New Session) on the chosen idea path and appends the brainstorming transcript as a new session under `Notes & Discussion`.
- **Summarize directly** — fast path that runs the capture flow silently and then invokes `oat-idea-summarize` end-to-end, producing both the idea record and the summary in one shot. Only offered when the brainstorming conversation produced enough material to summarize directly.

`oat-brainstorm` sets `activeIdea` automatically when its destination lands in this workflow. If the brainstorming conversation converges on a non-ideas destination instead (scoped backlog item, new project, doc-to-path, inline), `oat-brainstorm` does not touch ideas — see [Tool Packs](../../cli-utilities/tool-packs.md) for the full brainstorm pack reference.

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

## Active idea

Each level stores the active idea in its config file:

- Project level: `activeIdea` in `.oat/config.local.json` (gitignored)
- User level: `activeIdea` in `~/.oat/config.json`

Read/write via CLI: `oat config get activeIdea` / `oat config set activeIdea <path>`.

Ideas and projects use separate config keys and do not interfere with each other.

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

If the work hasn't been summarized as an idea yet — or never was an idea to begin with — `oat-brainstorm`'s **"promote to a new OAT project"** destination is a parallel route. The brainstorm dispatcher scaffolds the project via `oat project new <slug> --mode <mode>`, writes the seeded `discovery.md` directly from the brainstorming payload (Initial Request, Solution Space with approaches considered, Chosen Direction, Key Decisions, Open Questions), and stops with a pointer to `oat-project-quick-start` or `oat-project-design`. It deliberately writes `discovery.md` only — never a partial `design.md` — so the design phase keeps its full collaborative cadence.

## Initialization

The ideas directory is created automatically by `oat-idea-new` or `oat-idea-scratchpad` on first use. Future: `oat init ideas` will scaffold the directory and copy idea skills into the project.

## Reference artifacts

- `{IDEAS_ROOT}/backlog.md`
- `{IDEAS_ROOT}/scratchpad.md`
- `{IDEAS_ROOT}/{idea-name}/discovery.md`
- `{IDEAS_ROOT}/{idea-name}/summary.md`
- `.oat/templates/ideas/`
