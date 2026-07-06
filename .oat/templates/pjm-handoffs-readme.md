---
oat_template: true
oat_template_name: pjm-handoffs-readme
---

# PJM Handoffs

One-shot kickoff context for backlog items about to become OAT projects. Each
file stitches the backlog item, existing research, code pointers, and mode
guidance into a single prompt an operator passes as context when starting a
project (`oat-project-quick-start` or `oat-project-new`).

Conventions:

- One file per backlog item, named `<BL-id>.md`.
- Handoffs are **consumable, not durable**: once the project is created and the
  content is absorbed into project artifacts, delete the handoff (`git rm`) in
  the same PR that ships the work. Durable knowledge belongs in the item file,
  `reference/`, or project artifacts — never here.
- Each handoff carries its own deletion instruction so the consuming agent
  needs no outside context.
