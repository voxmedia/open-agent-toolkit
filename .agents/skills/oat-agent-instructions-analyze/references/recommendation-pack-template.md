# Recommendation Pack: `rec-001`

## Target

- Action: {create / update}
- Path: `{path}`
- Provider / Format: {provider / format}
- Disclosure: {inline / link_only / omit / ask_user}
- Disclosure Reason: {why this disclosure: non-obvious, spread across many files, or costly to get wrong -> inline; findable with one grep or `ls` -> omit}

## Evidence

Evidence locators and counts are for review and apply-time rechecking only. They are never copied into instruction
file content; generated text names a symbol, function, config key, or glob instead.

- `{path}:{line}` - {why this evidence matters}
- `{path}:{line}` - {supporting configuration, docs, or code pattern}

## Design Intent and Constraints

- {why it is built this way, invariants that must hold, what not to change without asking — evidenced only; otherwise `ask_user` or `none`}

## Structural Conventions

- {imports, exports, file layout, frontmatter, or structural template rules}

## Behavioral Conventions

- {delegation, sequencing, runtime behavior, workflow rules, or architecture expectations}

## Counter-Examples

- {common mistake or anti-pattern}
- {structurally valid but architecturally wrong output}

## New-File Workflow

1. {creation or wiring step}
2. {registration, sync, or follow-up step}

## Preferred Default for New Files

{pattern A / pattern B / N/A}

## Claim Corrections

- `{old claim -> verified replacement}`

## Generation Constraints

- Must Include: {required claims, commands, references, examples, or behavior}
- Must Not Include: {unsupported or stale guidance; always line numbers, counts or ratios, and exhaustive catalogs of routes, hooks, consumers, or files}
- Link Targets: {path / URL or `N/A`}
