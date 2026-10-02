---
title: Home
description: 'An open-source toolkit for portable, provider-agnostic agent tooling and workflows.'
---

# OAT Documentation

Open Agent Toolkit (OAT) is an open-source command-line tool and skill library
for teams that work with AI coding agents such as Claude Code, Cursor, Codex,
GitHub Copilot and Gemini CLI. You define skills, agents and rules once in your
repository and OAT keeps every tool's copy in step, and when you want more
structure it adds optional tracked workflows with plans, reviews and human
approval points.

## What you can do with it

- **Keep your coding tools aligned.** Edit each skill, agent and rule once in
  `.agents/`, let `oat sync` create the files each tool reads, and check them
  for drift with `oat status`. Start with
  [Provider Sync](provider-sync/index.md).
- **Get help with a single task.** Use ready-made skills, instructions your
  agent follows on request, to research a decision, compare options or review
  a change, without setting up a tracked project. Start with
  [Skills](skills/index.md).
- **Make longer work resumable.** Track work as a project that moves through
  discovery, specification, design, planning, implementation, review and pull
  request, with points where a person approves before the agent continues.
  Start with [Choose a Workflow](workflows/choose-workflow.md).
- **Keep documentation maintained.** Set up plain Markdown or a docs site,
  then have your agent analyze it and apply the improvements you approve.
  Start with [Docs Tooling](docs-tooling/index.md).

Each of these works on its own, so you can start with one and add others
later.

## Start here

New to OAT? [Quickstart](getting-started/quickstart.md) installs the CLI, gives
you a first result in an existing repository that changes files only inside
that repository, and helps you choose what to add next.

## Why OAT exists

Teams often need some combination of:

- provider-specific agent instructions that stay aligned from one tool to another
- reusable skills and helper tooling that do not depend on one provider
- a more structured workflow for longer-running implementation work

OAT exists to make those layers work together without forcing teams to adopt
all of them at once. It is not another agent runtime: it works through the
coding agents you already use.

## Contents

- [Getting Started](getting-started/index.md) - How to install OAT, get a first result, and learn the core ideas, plus project status and known limits.
- [Skills](skills/index.md) - Which skill to use for a task, and how to run it.
- [Workflows](workflows/index.md) - Tracked projects from plan to pull request, plus ideas, backlog planning and running a batch of existing plans as a wave.
- [Provider Sync](provider-sync/index.md) - How to keep one set of skills, agents and rules in step across coding tools.
- [Docs Tooling](docs-tooling/index.md) - How to set up and maintain Markdown docs or a docs site.
- [Reference](reference/index.md) - Configuration, commands, file locations and troubleshooting.
- [Contributing](contributing/index.md) - How to change OAT itself: code, docs and skills.
