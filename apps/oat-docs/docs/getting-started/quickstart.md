---
title: Quickstart
description: 'Install the OAT CLI, get a first result in an existing repository, and choose what to add next.'
---

# Quickstart

In about ten minutes you install the OAT command-line tool, try it safely in a
repository you already have, and choose what to add.

## What you need

- Node.js 22.17 or newer
- Git 2.31 or newer
- An existing Git repository

OAT does not run an up-front Git version check. Git compatibility is evaluated
best-effort by each command, and a missing or unsupported Git operation makes
that command fail with a system error.

## Install the CLI

```bash
npm install --global @open-agent-toolkit/cli
oat --version
```

## Your first result

From the root folder of your repository, run:

```bash
oat init --scope project
oat status --scope project
```

`--scope project` targets the current repository. OAT calls this choice a
scope; `user` scope targets your home directory instead.

In a terminal, `oat init` asks which providers to enable (saved in
`.oat/sync/config.json`), whether to add an optional pre-commit hook that
warns, without blocking, when provider views are out of date, and whether to
run guided setup. For this first run, answer no to guided setup: it installs
tool packs in your home directory. Apart from your answers,
`oat init --scope project` writes only these files:

- empty folders `.agents/skills/`, `.agents/agents/` and `.agents/rules/`,
  which hold your canonical assets: the one copy of each skill, agent and rule
  that you edit;
- `.oat/sync/manifest.json`, OAT's record of the files it manages;
- a block marked `# OAT core` at the end of `.gitignore` and `.gitattributes`,
  creating either file if needed and leaving your existing lines unchanged.

It does not touch your home directory or your Git remote, and it commits
nothing. For every file OAT creates, what to commit, and how to remove it all, see [What OAT Writes](../reference/what-oat-writes.md).

`oat status --scope project` reports provider views: the files or links that
each provider (a coding agent tool such as Claude Code, Cursor or Codex) reads.
A new repository has none yet, so it prints `No managed entries found.`

Leaving out `--scope project` also writes under your home directory
(`~/.oat/sync/manifest.json` and an empty `~/.agents/skills/`).

## Then choose what to add

Each path works on its own. Code blocks run in a terminal. Names written as
`/name` are agent skills, typed in your coding agent's chat, not in a shell;
Codex uses `$name`. A skill is a set of instructions your agent follows on
request, and a tool pack is a bundle of skills and templates that installs
together.

### Provider Sync

You edit each skill, agent and rule once in `.agents/`, and OAT creates the
files each coding tool reads and reports drift. It needs no tracked projects.

Add a skill first: a folder in `.agents/skills/` with a `SKILL.md` file (see
step 4 of [Pilot Provider Sync with One Team](../provider-sync/pilot-with-a-team.md)).
With no skills, sync reports `No changes required.`

```bash
oat providers set --scope project --enabled claude
oat sync --scope project --dry-run
oat sync --scope project
```

The first command saves your choice in `.oat/sync/config.json` (other
providers are `cursor`, `codex`, `copilot` and `gemini`). The second previews.
The third creates views, such as a link in `.claude/skills/` for each skill in
`.agents/skills/`, and records them in `.oat/sync/manifest.json`. A provider
folder already in the repository, such as `.claude/`, is enough for sync to
create its views. Read next: [Provider Sync](../provider-sync/index.md).

### Reusable skills

You get skills for research, comparing options, code review, ideas and
brainstorming, installed for you across all your repositories. You do not need
`oat init` for this.

```bash
oat tools install --scope user
oat sync --scope user
```

With no pack name, this installs all eight packs (core, ideas, docs,
workflows, utility, research, brainstorm and project-management) under
`~/.agents/` and `~/.oat/`, and sync links them into tools it finds in your
home directory, such as `~/.claude/skills/`. To install one pack, name it:
`oat tools install research --scope user`. The core pack (`oat-docs` and
`oat-doctor`) always installs for your user, never into a repository. Read
next: [Skills](../skills/index.md) and
[Tool Packs and Installed Assets](tool-packs.md).

### Workflows

You track longer work as a resumable project with reviews, approval points and
files such as `plan.md`, `implementation.md` and `state.md`.

```bash
oat tools install workflows --scope project
```

Claude Code reads skills only from `.claude/skills/`, while Cursor, Codex,
Copilot and Gemini read `.agents/skills/` directly. If you use Claude Code and
have not enabled it, run `oat providers set --scope project --enabled claude`
and then `oat sync --scope project` after installing, or the `/oat-...` skills
will not appear in it.

Then type `/oat-project-quick-start` in your coding agent.

This adds workflow skills and agents under `.agents/`, templates, scripts and
project folders under `.oat/`, and `.oat/config.json`. New tracked projects
default to the synced scope, which stores project files on a separate Git ref
and pushes it to your `origin` remote; read
[Before your first project](../workflows/projects/planning/starting-projects.md#before-your-first-project)
first. Read next: [Choose a Workflow](../workflows/choose-workflow.md).

### Docs tooling

You set up plain Markdown or a docs site, then have your agent analyze it and
apply the changes you approve.

```bash
oat tools install docs --scope project
```

As with Workflows, if you use Claude Code and have not enabled it, run
`oat providers set --scope project --enabled claude` and
`oat sync --scope project` after installing.

Then type `/oat-docs-bootstrap` in your coding agent.

This adds seven docs skills under `.agents/skills/`, templates under
`.oat/templates/`, a script under `.oat/scripts/`, and `.oat/config.json`.
Read next: [Docs Tooling](../docs-tooling/index.md).

For setup options, configuration and every command, see
[CLI Bootstrap](bootstrap.md),
[Config and Local State](../reference/config-and-local-state.md) and the
[CLI Reference](../reference/cli-reference.md).

## If you are unsure

Start with the path that matches what you need right now.

- To sync canonical assets across tools, choose Provider Sync.
- For help with one task, such as researching a decision, choose Reusable
  skills.
- To run a tracked implementation workflow, choose Workflows.
- To work on documentation, choose Docs tooling.
- For command-line setup or utility guidance, use the links just above.

You can adopt more than one path over time; they work together or on their
own.
