# Root AGENTS.md Template

Use this template when generating a root-level AGENTS.md file. This is the canonical, provider-agnostic instruction file — all providers read it.

## Template

```markdown
# {Project Name}

## Development Commands

### Essential Commands

- `{install-command}` - Install dependencies
- `{dev-command}` - Start development server
- `{build-command}` - Build for production
- `{test-command}` - Run tests
- `{lint-command}` - Lint code

### Additional Commands

- {Any project-specific commands}
- {Point to `package.json`/`composer.json`/task runner config as the canonical command source of truth when applicable}

## Architecture Overview

{2-4 sentences on what the system is for, how its major parts relate, and why it is shaped this way. Favor purpose
and reasoning over a directory inventory; an agent can list directories itself.}

### Where to Start

- `{stable entry point: a top-level directory, main module, or config file}` - {why an agent starts here}
- {At most a few pointers. No exhaustive file, route, or hook lists.}

### Design Intent and Constraints

- {Why it is built this way — only intent evidenced by docs, decision records, comments, or existing instructions}
- {Invariants that must hold, e.g. ordering, idempotency, or where auth and data boundaries are enforced (phrase
  boundaries as pointers: "auth is enforced in `{file}`; read it before changing routes")}
- {What not to change without asking}
- {If intent is not evidenced, leave this section out and raise it as `ask_user`; never invent it}

### Stack Decisions

{Record only what the manifests (`package.json`, `composer.json`, `pyproject.toml`, `go.mod`, `Gemfile`, `.nvmrc`,
or the stack's equivalent) cannot say. Point to them for dependencies and versions; never copy an inventory. Omit
any line below that a glance at the manifest answers.}

- **Source of truth:** {e.g., "dependencies and versions: `package.json` and `.nvmrc`"}
- **Use for new code:** {which option to choose when several coexist, e.g., "new JS packages use `pmc-scripts`, not
  the legacy central build"}
- **Legacy, do not extend:** {present but deprecated, e.g., "jQuery is legacy; do not add new jQuery code"}
- **Platform constraints:** {constraints no manifest shows, e.g., "deploys to WordPress VIP: read-only filesystem"}
- **Behavior-changing versions:** {only where a version changes which API is correct, e.g., "Next.js Pages Router,
  not App Router"; name the file that pins it}
- **Commit Format:** {e.g., Conventional Commits with commitlint — only if the repo enforces one}

## Code Conventions

### Style

- {Only repo-specific, evidence-backed rules that are NOT already reliably enforced by formatter/linter}
- {Prefer links to canonical docs/config when the detail is too deep for always-on instructions}

### Patterns

- {Key architectural patterns — e.g., "prefer composition over inheritance"}

### Non-Negotiables

- {Security rules, access control patterns}
- {Data handling requirements}
- {Error handling conventions}

## Definition of Done

- [ ] Tests pass (`{test-command}`)
- [ ] Lint clean (`{lint-command}`)
- [ ] Type check passes (`{type-check-command}`)
- [ ] Build succeeds (`{build-command}`)
- [ ] Instructions still true: when a change invalidates or adds a durable convention, update the nearest affected
      instruction files (`AGENTS.md`, `CLAUDE.md`, rules) in the same PR, and record design intent or decisions the
      code does not show

## References

- `{doc-path-or-url}` - {when to read it}
```

## Guidance

- Target: <300 lines (hard max 500)
- Canonical commands should appear in the first screenful
- Do not restate the dependency or version inventory from the manifests (`package.json` or the stack's equivalent);
  point to them. Mention a version only when it changes which API or approach is correct, and name the file that
  pins it
- Call out local infrastructure or wrapper scripts when they materially affect how the project runs
- If commit format is enforced by repo config, mention it explicitly
- Prefer noting the canonical command source of truth (`package.json`, `composer.json`, Makefile, etc.) so static command lists do not drift
- Non-negotiables (security, data handling) should be near the top
- Don't duplicate content that belongs in scoped files
- This file is read by ALL providers — keep it provider-agnostic
- Only include conventions that are backed by repo evidence
- If formatter/linter config already enforces a style rule, prefer commands or links over restating the rule
- Use progressive disclosure: keep essentials inline and link to deeper docs/config/examples
- Inline what is non-obvious, spread across many files, or costly to get wrong. The essential commands, entry
  points, and boundaries this template requires always stay inline. Omit a fact only when one grep or `ls` finds it
  and an agent is unlikely to get it wrong without the instruction
- No line numbers (name the symbol, function, or config key), no counts or ratios, and no exhaustive catalogs of
  routes, hooks, consumers, or files
- Staleness test for every line: "Would a normal merge in this directory make this line false?" If yes, omit it or
  point to a stable anchor (symbol, config key, glob). Versions are allowed when the line names the config file that
  pins them (for example "Node 22, pinned in `.nvmrc`")
- Any rule about where files go must match the runner or tool config that picks them up
