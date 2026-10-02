---
title: Pilot Provider Sync with One Team
description: 'A week-one plan for trying Provider Sync on one repository with a team that mixes Claude Code, Cursor, and Codex: setup, teammate onboarding, what to watch, and how to decide.'
---

# Pilot Provider Sync with One Team

Provider Sync gives a team one set of skills, agents, and rules, kept in the
repository as canonical assets (the files you edit, under `.agents/`), and
shows them to each coding tool, or provider, in that tool's own format. When a
provider view (the per-tool file OAT generates, such as
`.claude/skills/<name>`) no longer matches what OAT wrote, OAT reports it as
drift.

This pilot needs no tracked workflows and no project management setup. OAT
does not commit or push anything during it: you review the changes, commit
them, and open the pull request yourself.

## Before you start

The team needs Node.js 22.17 or newer and Git 2.31 or newer. Each person
installs the CLI with:

```bash
npm install --global @open-agent-toolkit/cli
```

Agree on one CLI version for the pilot. Each sync stamps its CLI version into
the sync manifest, so if you commit that file, mixed versions show up as small,
noisy changes to it. To install a specific version, add it to the package name:
`npm install --global @open-agent-toolkit/cli@<version>`.

One person does the setup, on a branch. The pilot adds these to the
repository:

- `.agents/` with your skills, agents, and rules
- `.oat/sync/config.json` (which providers are on) and
  `.oat/sync/manifest.json` (what OAT last wrote)
- a marked OAT block in `.gitignore`, and a `.gitattributes` file or block
- provider views such as `.claude/skills/`, `.cursor/agents/`, and `.codex/`

[What OAT Writes](../reference/what-oat-writes.md) lists every path, what
creates it, and whether it is meant to be committed.

## Week one

Scope decides which tree a command works on: `project` is this repository and
`user` is your home directory. Every command below passes `--scope project`, so
nothing is written outside the repository.

1. Install the CLI (see above), then check it runs:

   ```bash
   oat --version
   ```

2. Create a branch and initialize the repository:

   ```bash
   git switch -c try-provider-sync
   oat init --scope project
   ```

   If `oat init` asks whether to run guided setup, answer no: guided setup
   installs every tool pack into your home directory, which this pilot does not
   need. Then look at `git status`: you should see `.gitignore`,
   `.gitattributes`, and `.oat/sync/manifest.json`. The empty `.agents/skills`,
   `.agents/agents`, and `.agents/rules` folders are also created, but Git
   shows them only once they contain files. Nothing is written in your home
   directory.

3. Choose providers explicitly. For a team that mixes Claude Code, Cursor, and
   Codex:

   ```bash
   oat providers set --scope project --enabled claude,cursor,codex --disabled copilot,gemini
   ```

   Look at the new `.oat/sync/config.json`. Set every provider explicitly,
   because a provider you leave unset is still synced whenever its folder (for
   example `.claude/`) exists, which differs from one checkout to the next.
   [Sync Config](config.md#which-providers-to-enable) explains each choice.

4. Add one real skill your team already repeats. A skill is a folder with a
   `SKILL.md` file:

   ```markdown title=".agents/skills/review-migration/SKILL.md"
   ---
   name: review-migration
   description: Use when reviewing a database migration for rollback safety.
   ---

   # Review a migration

   Check that the migration can be rolled back and that the previous release
   still works against the new schema. Report problems; do not run the
   migration.
   ```

   [Writing Skills](../contributing/skills.md#frontmatter-fields-in-active-use)
   lists the frontmatter fields. A rule is a Markdown file in `.agents/rules/`
   instead; see
   [Canonical rule frontmatter](providers.md#canonical-rule-frontmatter).

5. Preview the sync, then apply it:

   ```bash
   oat sync --scope project --dry-run
   oat sync --scope project
   ```

   The preview lists each planned operation and changes nothing. After the real
   run, `.claude/skills/review-migration` should be a link to
   `../../.agents/skills/review-migration`. Start a new session in each tool so
   it picks up the change.

6. Check the result:

   ```bash
   oat status --scope project
   ```

   Every row should read `in_sync`. A `missing` row means that entry has not
   been synced yet.

7. Review the diff and commit it. Use
   [What to commit](../reference/what-oat-writes.md#what-to-commit) to check
   each path.

8. Push the branch and open a pull request. The team reviews it like any other
   change.

## What each teammate does

After the pilot branch merges, each teammate installs the same CLI version. If
the pilot committed its provider views, nothing else is needed to start: the
views are relative links into `.agents/` and generated files that contain no
machine-specific paths, and Cursor and Codex read skills from `.agents/skills`
directly. To confirm, run `oat status --scope project`; a `missing` row means a
view was not committed, and `oat sync --scope project` creates it. The links and
generated files were checked on macOS; a fresh clone, and how Windows checkouts
handle committed links, were not tested.

Run `oat sync --scope project`, and commit its output in the same change, when
you add, rename, or delete a skill, agent, or rule, or change an agent or rule.
Rules and the Codex and Cursor agent files are generated copies, so they only
change when sync runs. An edit inside an existing linked skill reaches Claude
Code at once, because the view is a link.

Make every change in `.agents/`, never in the provider folders. Re-running sync
overwrites edits made to generated copies, replaces an untracked file sitting
at a view path, and removes a view whose canonical file was deleted. Editing
through a link changes the canonical file itself, which is easy to miss in
review.

Before committing, run `oat status --scope project`. Its plain output exits 0
even when views are missing, so for a check that can fail, run
`oat status --scope project --hook`: it prints a warning and exits 1 when a view
is missing or drifted.

For an automatic reminder, a teammate can add OAT's optional pre-commit hook
with `oat init --scope project --hook`. Git does not copy hooks when you clone,
so each person adds it in their own clone. The hook only warns; it never blocks
a commit, and it does nothing if `oat` is not installed. If the repository sets
Git's `core.hooksPath`, the hook goes in that folder instead, which may be
inside the working tree. Remove it with `oat init --scope project --no-hook`.

## Mixed tools

| Provider    | What OAT generates in the repository                                                                                             | What the team should know                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Claude Code | A relative link per skill in `.claude/skills/` and per agent in `.claude/agents/`; rules as generated copies in `.claude/rules/` | The only provider with skill views, so a new skill reaches Claude Code only after sync              |
| Cursor      | No skill files: it reads `.agents/skills`. A link per agent in `.cursor/agents/`; rules as `.cursor/rules/*.mdc` files           | Its `.cursor/skills/` folder is not managed; skills found there are reported as strays              |
| Codex       | No skill files: it reads `.agents/skills`. A generated `.codex/agents/<name>.toml` per agent, registered in `.codex/config.toml` | Sync merges into an existing `.codex/config.toml`: it adds OAT's tables and keeps your own settings |
| Gemini      | Nothing; it reads skills and agents from `.agents/` directly                                                                     | Nothing to commit                                                                                   |

If OAT's own implementer and reviewer agents are installed in the repository,
sync also generates one file per supported model for each of them, in
`.cursor/agents/` and `.codex/agents/`, which can add dozens of files to the
first diff. The skill links, agent links, generated agent files, and
`.codex/config.toml` merge were observed by running the CLI in a test
repository. The rule outputs come from [Providers](providers.md), which also
covers Copilot and the user scope.

## What to watch for in week one

- **A bare `oat sync` or `oat init` also writes in your home directory.** Both
  default to scope `all`. Use `--scope project` in shared instructions,
  scripts, and CI.
- **Edits in provider folders are not safe.** Sync overwrites edits to
  generated copies from `.agents/`, and an edit made through a link silently
  changes the canonical file.
- **Disabling a provider leaves its views in place.** Delete them yourself.
  While a disabled provider's folder exists, sync warns on every run, and an
  interactive sync offers to re-enable it with the box already ticked; untick
  it.
- **Keep the default `auto` strategy unless links cannot work.** The `copy`
  strategy records the absolute path of the checkout that ran sync, so copies
  show as drifted in every other checkout and churn in Git.
- **Strays are reported, not deleted.** A stray is a file in a provider folder
  that OAT does not manage. See
  [Choosing a stray disposition](manifest-and-drift.md#choosing-a-stray-disposition).

## Deciding after the pilot

The pilot is working when:

- one change in `.agents/` shows up in Claude Code, Cursor, and Codex after one
  sync and one commit
- teammates on different tools use the same skill without copying it by hand
- `oat status --scope project` shows every row `in_sync` before commits, or in
  CI with `--hook`
- nobody has had to edit a provider folder by hand

**If you stop**, follow [Backing out](../reference/what-oat-writes.md#backing-out).
There is no uninstall command: stopping means one commit that deletes the files
the pilot added and OAT's blocks in `.gitignore` and `.gitattributes`, plus
`oat init --scope project --no-hook` in each clone that added the hook. Your
skills are plain files, so you can keep them.

## Next

- [Provider Sync](index.md) and [Commands](commands.md)
- [Sync Config](config.md) and [Scope and Surface](scope-and-surface.md)
- [Manifest and Drift](manifest-and-drift.md) and [Providers](providers.md)
- [Quickstart](../getting-started/quickstart.md)
- [What OAT Writes](../reference/what-oat-writes.md)
