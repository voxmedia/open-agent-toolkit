---
oat_template: true
oat_template_name: repo-agents
---

# Repo Reference Guidance

Use this directory as the canonical OAT repo-reference root.

- Active operational planning lives in `pjm/`.
- Durable append-mostly references live in `reference/`.
- Keep generated indexes inside their managed marker pairs.
- When an index conflicts, regenerate it with the owning OAT command and stage the result.
- Backlog close-out follows the **Backlog Lifecycle** in `pjm/AGENTS.md` — run
  `oat backlog archive <id>` in the same PR that ships the work.
- `README.md` is the human-facing orientation for this directory; agent-facing
  rules live in the `AGENTS.md` files alongside each subdirectory.
