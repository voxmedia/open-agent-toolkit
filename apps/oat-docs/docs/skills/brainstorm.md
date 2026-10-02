---
title: Brainstorm Before Choosing a Workflow
description: Explore a problem conversationally, compare approaches, and choose an explicit destination without starting implementation.
---

## oat-brainstorm

**Invocation:** `/oat-brainstorm` is the reliable way to start it, or ask,
“Let's brainstorm how to make large imports easier to recover without changing
the UI yet.” These are agent instructions; Codex can use `$oat-brainstorm`. An
explicit request to brainstorm activates the mode; an ordinary review,
debugging session, or status check should not be taken over automatically.
Looser phrasing such as “I've been thinking about…” gets an ordinary
conversational answer; after two such exploratory turns the agent offers once
to switch into structured brainstorm mode. If your opening request says the
work should become several projects, the skill frames the conversation around
the child projects and then hands off to `oat-project-split`, which creates
them.

**Prerequisites:** A topic worth exploring. Needs an active OAT project:
optional. No OAT project (a tracked unit of work under `.oat/projects/`) or
repository setup is required to start the conversation; if a project is
active, the skill can offer to fold the result into it. Installed tool packs
(groups of OAT skills you install with `oat tools install`) and repository
capabilities determine which destinations are available later.

**Example scenario:** Support keeps helping customers recover failed uploads,
but the team does not yet know whether to improve resumability, error
messages, or operating procedures. Explore the constraints and compare a few
approaches before deciding whether this needs a project at all. When you say
you are done, the skill offers the destinations available in your setup; you
might pick “Doc-to-path,” confirm `docs/brainstorms/import-recovery.md`, and
get a Markdown write-up of the approaches, the chosen direction, and the open
questions at that path, with nothing committed.

The skill asks focused questions, presents alternatives with trade-offs, and
helps establish a recommended direction. It does not treat brainstorming as
approval to implement code or scaffold a specification. If an active project
is relevant, it can offer to fold the result into that project or preserve it
as a reference; an independent idea remains an option. Fold-back writes the
synthesis into the project's design, discovery, or plan file and commits that
one file on your current branch (for a synced project, one whose files live in
a separate project checkout, it pushes that checkout with `oat project push`
instead). Saving a brainstorming reference file under the active project also
commits or pushes that file. Promoting to a new project runs
`oat project new`, which scaffolds the project and makes it your active
project, and then writes a completed `discovery.md` (or, for a lite project,
fills in its `plan.md`). Capturing a new idea also sets it as your active
idea in local OAT config. Each destination is confirmed before anything is
written.

**What it does without asking:** During the conversation it only reads: it
checks which tool packs are installed and whether a project is active. If the
topic is visual it offers, as a separate question, to start a local
browser-based visual companion; nothing starts unless you accept, and once
accepted it runs a small local Node server and keeps its session files under
`.oat/brainstorm/` (or `~/.oat/brainstorm/` at user scope). Nothing else is
written until you choose a destination and confirm its name, path, or target
file. After that confirmation the skill writes the destination and, for
fold-back or a project reference file, commits (or pushes, for a synced
project) without a further prompt. It does not write code or start the next
project phase.

**Expected output:** A shared understanding of the problem, candidate
approaches, and a confirmed next step. Depending on installed packs and your
choice, the result can be a closing summary in the conversation (no file), a
Markdown document at a path you name, a new or extended idea (`ideas` pack), a
backlog item (`project-management` pack), a new OAT project, or an update to
the active project (`workflows` pack). The destination is confirmed, not
selected merely because a pack is installed.

**Next step:** Choose where the result belongs and approve that handoff. For
an unresolved technical assumption, use [research](research.md) first. For a
direction ready to plan, choose the appropriate project workflow rather than
treating the brainstorming conversation as an executable plan.
