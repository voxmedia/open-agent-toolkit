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

{2-4 sentences describing the project structure, key modules, and how they relate.}

### Key Directories

- `{dir/}` - {purpose}
- `{dir/}` - {purpose}

### Technology Stack

- **Runtime:** {e.g., Node.js 22, Python 3.12 — include concrete versions when the repo evidence provides them}
- **Framework:** {e.g., Next.js 15, FastAPI}
- **Infrastructure:** {e.g., Docker Compose, local DB, cloud/service environment, wrapper scripts}
- **Build:** {e.g., Turborepo, Webpack}
- **Testing:** {e.g., Vitest, pytest}
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

## References

- `{doc-path-or-url}` - {when to read it}
```

## Guidance

- Target: <300 lines (hard max 500)
- Canonical commands should appear in the first screenful
- When version numbers are available in repo evidence, include them instead of generic stack names
- Call out local infrastructure or wrapper scripts when they materially affect how the project runs
- If commit format is enforced by repo config, mention it explicitly
- Prefer noting the canonical command source of truth (`package.json`, `composer.json`, Makefile, etc.) so static command lists do not drift
- Non-negotiables (security, data handling) should be near the top
- Don't duplicate content that belongs in scoped files
- This file is read by ALL providers — keep it provider-agnostic
- Only include conventions that are backed by repo evidence
- If formatter/linter config already enforces a style rule, prefer commands or links over restating the rule
- Use progressive disclosure: keep essentials inline and link to deeper docs/config/examples
