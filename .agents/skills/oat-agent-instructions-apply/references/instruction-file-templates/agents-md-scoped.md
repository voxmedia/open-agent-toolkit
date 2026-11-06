# Scoped AGENTS.md Template

Use this template when generating an AGENTS.md for a subdirectory (package, service, module). This supplements the root AGENTS.md with directory-specific guidance.

## Template

```markdown
# {Package/Module Name}

## Commands

- `{test-command}` - Run tests for this package
- `{build-command}` - Build this package
- `{lint-command}` - Lint this package
- {Any package-specific commands}

## Architecture

{2-3 sentences on this module's purpose, its boundaries, why it is built this way, and how it fits into the larger
project. Favor purpose and reasoning over an inventory of files.}

### Entry Points

- `{stable entry point: main module, registry, or config file}` - {why an agent starts here}
- {At most a few pointers. No exhaustive file, route, hook, or consumer lists.}

### Design Intent and Constraints

- {Why this module is built this way — only intent evidenced by docs, decision records, comments, or existing
  instructions}
- {Invariants that must hold here (ordering, idempotency, auth or data boundaries phrased as pointers to where they
  are enforced)}
- {What not to change without asking}
- {If intent is not evidenced, leave this section out and raise it as `ask_user`; never invent it}

### Stack Decisions

{Only when this subtree differs from the root: which option to use for new code here, what is legacy, or a
platform constraint. Point to this subtree's manifest (`package.json` or the stack's equivalent) for dependencies
and versions; never copy them. Omit this section when the root already covers it.}

## Conventions

### Patterns

- {Key patterns specific to this directory — e.g., "all handlers follow the Controller pattern"}

### Non-Negotiables

- {Security or data handling rules specific to this module}
- {Error handling conventions that differ from root}

## Definition of Done

- [ ] Tests pass (`{test-command}`)
- [ ] Lint clean (`{lint-command}`)
- [ ] Type check passes (`{type-check-command}`)

## References

- `{doc-path-or-url}` - {when to read it}
```

## Guidance

- Target: 40–150 lines
- Only create when the directory has genuinely different stack, workflow, or domain requirements
- Do NOT duplicate root-level guidance — only add what's different
- Commands should be runnable from the package directory
- Inherits from root AGENTS.md by default; this file adds or overrides
- Keep only directory-specific essentials inline; link to deeper module docs/config when helpful
- Only include conventions backed by repo evidence for this subtree
- Each scoped file is ongoing maintenance; if the pack's delta looks thin, raise it with the user rather than
  reshaping the recommendation
- No line numbers, counts or ratios, or exhaustive catalogs of routes, hooks, consumers, or files; apply the
  staleness test ("Would a normal merge in this directory make this line false?") to every line; versions are
  allowed when the line names the config file that pins them
- Any test-layout or file-placement rule must match the runner or tool config that picks those files up
