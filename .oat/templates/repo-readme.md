---
oat_template: true
oat_template_name: repo-readme
---

# OAT Repo Reference

Human-facing orientation for this OAT repo-reference root — the canonical
project-management and durable-reference surface for the repository.
Agent-facing rules live in the `AGENTS.md` files alongside each directory.

## Layout

| Path                       | What it is                                               | Maintained by                                              |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| `pjm/current-state.md`     | Present operating picture                                | Curated                                                    |
| `pjm/roadmap.md`           | Now / Next / Later direction                             | Curated                                                    |
| `pjm/backlog/items/`       | Active backlog items, one file each                      | Curated + `oat backlog`                                    |
| `pjm/backlog/archived/`    | Completed/abandoned item files                           | Moved here at close-out                                    |
| `pjm/backlog/completed.md` | Newest-first completion summaries                        | Appended at close-out                                      |
| `pjm/backlog/index.md`     | Curated overview + generated item table                  | Overview curated; table via `oat backlog regenerate-index` |
| `pjm/handoffs/`            | One-shot project-kickoff prompts (deleted when consumed) | Backlog walkthroughs; removed in the shipping PR           |
| `reference/decisions/`     | Durable decision records + generated index               | `oat decision`                                             |

## Conventions

- **Generated vs. curated.** Generated tables live inside `<!-- OAT ... -->`
  marker pairs; regenerate them with the owning `oat` command instead of
  hand-editing. Everything outside those markers is curated by hand.
- **IDs.** Backlog items follow `BL-YYMMDD-slug` (`oat backlog generate-id`);
  decisions follow `DR-YYMMDD-slug`. Pair every backlog item ID with its
  human-readable title — no bare IDs in prose or handoffs.
- **Close-out.** When work ships that satisfies a backlog item's acceptance
  criteria, the item is closed and archived in the same commit/PR — run
  `oat backlog archive <id>`. See the Backlog Lifecycle in `pjm/AGENTS.md`.
