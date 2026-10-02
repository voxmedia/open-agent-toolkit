---
title: Getting Started
description: 'Install OAT, get a first result in an existing repository, and learn the ideas the rest of the docs use.'
---

# Getting Started

Open Agent Toolkit (OAT) is a command-line tool and a library of skills
(instructions your coding agent follows on request) for teams that use more
than one AI coding tool, or want more structure in how they use one. You keep
one copy of each skill, agent and rule in your repository, and OAT creates and
checks the copies each tool reads; when you want it, OAT also adds tracked
workflows with plans, reviews and human approval points. Start with
[Quickstart](quickstart.md): it installs the CLI and gives you a first result
that changes files only inside one repository.

## Contents

- [Quickstart](quickstart.md) - Install the CLI, try it in an existing repository, and choose what to add next.
- [Core Concepts](concepts.md) - The ideas the rest of the docs rely on: canonical assets, provider views, scopes, skills and the workflow lifecycle.
- [CLI Bootstrap](bootstrap.md) - What `oat init` sets up in a repository, and the guided setup it offers.
- [Tool Packs and Installed Assets](tool-packs.md) - The bundled tool packs, where they install, and how to update or remove them.

## Project status

- **Version:** the CLI is published on npm as `@open-agent-toolkit/cli` and is
  versioned 0.x, that is, before a 1.0 release.
- **License:** MIT.
- **Releases:** each version is published on the repository's
  [GitHub Releases page](https://github.com/voxmedia/open-agent-toolkit/releases)
  with release notes and the list of merged changes.
- **Issues:** report problems and requests on the
  [issue tracker](https://github.com/voxmedia/open-agent-toolkit/issues).
- **Upgrading:** before you update, read
  [Upgrading from an earlier CLI](tool-packs.md#upgrading-from-an-earlier-cli),
  which lists defaults and exit codes that changed between releases.

## Known limits

These limits are documented on the pages linked from each item. A provider
is a coding agent tool such as Claude Code, Cursor or Codex, and a provider
view is the file or link that tool reads.

- **Cursor model choice is not verified.** When OAT launches an agent in
  Cursor, Cursor can run a different model from the one OAT pinned, without an
  error, and OAT records only the model it requested. See
  [How each provider applies the cap](../workflows/advanced/dispatch-ceiling.md#how-each-provider-applies-the-cap).
- **Edits in provider folders are overwritten.** Re-running `oat sync` rewrites
  provider views from their source in `.agents/`, so an edit made directly in a
  provider folder such as `.claude/` is lost, and a file you placed at a view's
  path yourself is replaced. See
  [Manifest and Drift](../provider-sync/manifest-and-drift.md#quick-look).
- **The default reviewer independence can fall back.** A review gate's default
  setting prefers a reviewer from a different model family, but when none is
  available it falls back to the best available reviewer, which can be from the
  same family, and only records a warning. See
  [How independent the reviewer must be](../workflows/advanced/workflow-gates.md#how-independent-the-reviewer-must-be).
- **Re-running `oat pjm init` removes remote settings.** It replaces the `pjm`
  section of `.oat/config.json` and deletes any `pjm.remote` settings, so back
  the file up first. See
  [Remote Project Management](../workflows/backlog-and-planning/remote-project-management.md#prerequisite).
- **Ad-hoc reviews run in the agent you invoke them in.** `oat-review-provide`
  cannot send a review to a different model; to get another model's review,
  run the skill in that model's coding tool. See
  [oat-review-provide](../workflows/projects/reviews/review-flavors.md#oat-review-provide).
- **Gemini CLI gets no generated view.** OAT treats Gemini CLI as a native
  read-only consumer, and sync does not generate a `.gemini/` view for it. See
  [Canonical Assets and Provider Views](concepts.md#canonical-assets-and-provider-views).
