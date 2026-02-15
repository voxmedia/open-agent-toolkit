# Ideas Workflow

The Ideas workflow is a lightweight alternative to the full project lifecycle for personal brainstorming and idea capture. It provides a space to explore ideas conversationally with an agent before deciding whether to promote them to full projects.

Ideas are gitignored and entirely personal — no pressure to finish, no formal gates, no knowledge base dependency.

## Contents

- `docs/oat/ideas/lifecycle.md`
  - End-to-end idea flow from capture through summarization.

## Key differences from projects

| Aspect | Projects | Ideas |
|--------|----------|-------|
| Location | `.oat/projects/shared/` (tracked) | `.oat/ideas/` or `~/.oat/ideas/` (gitignored) |
| Levels | Project only | Project-level or user-level (global) |
| Phases | discovery/spec/design/plan/implement | brainstorm/summarize |
| State | Multi-phase with `state.md` and HiL gates | Two states in frontmatter (`brainstorming`/`summarized`) |
| Knowledge base | Required | Not required |
| Purpose | Structured development | Personal ideation |

## Reference artifacts

- `.agents/skills/oat-idea-new/SKILL.md`
- `.agents/skills/oat-idea-ideate/SKILL.md`
- `.agents/skills/oat-idea-scratchpad/SKILL.md`
- `.agents/skills/oat-idea-summarize/SKILL.md`
- `.oat/templates/ideas/`
