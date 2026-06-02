# Canonical Rule Frontmatter

Canonical glob-scoped rules live at `.agents/rules/{name}.md`. This is the **single source you author** — `oat sync --scope project` reads it and generates the provider-specific rule files (`.claude/rules/*.md`, `.cursor/rules/*.mdc`, `.github/instructions/*.instructions.md`). Do not hand-author those provider files.

The canonical frontmatter is provider-agnostic and uses three fields: `description`, `globs`, and `activation`.

## Frontmatter Fields

| Field         | Required    | Type     | Description                                                                            |
| ------------- | ----------- | -------- | -------------------------------------------------------------------------------------- |
| `activation`  | **Yes**     | enum     | One of `always`, `glob`, `agent-requested`, `manual`. See matrix below.                |
| `globs`       | Conditional | string[] | Glob patterns the rule targets. **Required when `activation: glob`.**                  |
| `description` | Conditional | string   | Short purpose. **Required when `activation: agent-requested`**; recommended otherwise. |

> The `activation` value is validated. The only accepted values are
> `always`, `glob`, `agent-requested`, and `manual`. Any other value
> (e.g. `auto`) is rejected by `oat sync --scope project`.

## Activation Matrix

| `activation`      | When to use                                                      | Required companion fields |
| ----------------- | ---------------------------------------------------------------- | ------------------------- |
| `glob`            | Rule applies to files matching specific patterns                 | `globs`                   |
| `always`          | Repo-wide rule that should be in every session                   | —                         |
| `agent-requested` | Agent decides relevance from the description (no file targeting) | `description`             |
| `manual`          | Opt-in only — user explicitly invokes the rule                   | —                         |

Selection rule of thumb: if the recommendation targets file patterns, use `activation: glob` with `globs`. Use `always` only for genuinely repo-wide guidance, `agent-requested` for description-driven rules with no glob, and `manual` for opt-in references.

## Examples

### Glob-scoped (most common)

```yaml
---
description: 'Firebase handler trigger/registration conventions'
activation: glob
globs:
  - 'src/functions/**/*.ts'
---
# {Rule Title}

{ Rule body — identical to glob-scoped-rule.md template body }
```

### Always-on

```yaml
---
description: 'Repo-wide security non-negotiables'
activation: always
---
# {Rule Title}

{ Rule body }
```

### Agent-requested (no globs)

```yaml
---
description: 'Patreon integration gotchas — apply when touching billing flows'
activation: agent-requested
---
# {Rule Title}

{ Rule body }
```

### Manual (opt-in)

```yaml
---
description: 'One-off migration playbook'
activation: manual
---
# {Rule Title}

{ Rule body }
```

## How It Maps to Providers

`oat sync --scope project` translates each canonical `activation` to the equivalent provider frontmatter:

| Canonical         | Claude (`.claude/rules/*.md`) | Cursor (`.cursor/rules/*.mdc`)       | Copilot (`.github/instructions/*`) |
| ----------------- | ----------------------------- | ------------------------------------ | ---------------------------------- |
| `glob`            | `paths`                       | `alwaysApply: false` + `globs`       | `applyTo`                          |
| `always`          | no frontmatter (always-on)    | `alwaysApply: true`                  | repo-wide `applyTo` / shim         |
| `agent-requested` | degrades to always-on         | `alwaysApply: false` + `description` | degrades to always-on              |
| `manual`          | omitted / opt-in              | no frontmatter                       | omitted                            |

See the per-provider frontmatter docs in this directory (`claude-rule.md`, `cursor-rule.md`, `copilot-instruction.md`) for the generated output formats, and `references/docs/rules-files.md` for the full cross-provider deep dive.
