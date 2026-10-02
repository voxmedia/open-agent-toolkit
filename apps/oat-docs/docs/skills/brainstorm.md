---
title: Brainstorm Before Choosing a Workflow
description: Explore a problem conversationally, compare approaches, and choose an explicit destination without starting implementation.
---

## oat-brainstorm

**Invocation:** Ask, “Let's brainstorm how to make large imports easier to
recover without changing the UI yet,” or invoke `/oat-brainstorm`. These are
agent instructions; Codex can use `$oat-brainstorm`. An explicit request to
brainstorm activates the mode; an ordinary review, debugging session, or
status check should not be taken over automatically.

**Prerequisites:** A topic worth exploring. No existing OAT project or
repository setup is required to start the conversation. Installed packs and
repository capabilities determine which destinations are available later.

**Example scenario:** Support keeps helping customers recover failed uploads,
but the team does not yet know whether to improve resumability, error
messages, or operating procedures. Explore the constraints and compare a few
approaches before deciding whether this needs a project at all.

The skill asks focused questions, presents alternatives with trade-offs, and
helps establish a recommended direction. It does not treat brainstorming as
approval to implement code or scaffold a specification. If an active project
is relevant, it can offer to fold the result into that project or preserve it
as a reference; an independent idea remains an option.

**Expected output:** A shared understanding of the problem, candidate
approaches, and a confirmed next step. Depending on available capabilities
and your choice, the result can stay inline or move to an idea, backlog item,
project workflow, or documentation destination. The destination is confirmed,
not selected merely because a pack is installed.

**Next step:** Choose where the result belongs and approve that handoff. For
an unresolved technical assumption, use [research](research.md) first. For a
direction ready to plan, choose the appropriate project workflow rather than
treating the brainstorming conversation as an executable plan.
