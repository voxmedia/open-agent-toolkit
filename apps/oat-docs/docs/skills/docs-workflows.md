# Docs Workflows

OAT’s docs workflow combines deterministic CLI helpers with higher-judgment
skills for analysis and controlled updates.

## Docs workflow pieces

### CLI helpers

- `oat docs init` scaffolds a docs app
- `oat docs nav sync` regenerates nav from `index.md`
- `oat docs analyze` and `oat docs apply` expose the workflow surface in CLI help

### Skills

- `oat-docs-analyze` evaluates a docs surface for structure, drift, coverage,
  contributor guidance, and docs-app contract issues
- `oat-docs-apply` consumes the analysis artifact and applies only approved,
  evidence-backed recommendations

## Contract model

The docs workflow mirrors the agent-instructions analyze/apply split:

- Analyze owns discovery, evidence gathering, confidence, and disclosure decisions
- Apply consumes the artifact, asks for approval, and must not invent new docs conventions

This keeps deterministic behavior in the CLI and judgment-heavy behavior in the
skills.

## Typical flow

1. Bootstrap a docs app with `oat docs init`
2. Author or migrate docs so every directory has an `index.md`
3. Keep local `## Contents` sections current
4. Run `oat docs nav sync`
5. Run `oat-docs-analyze`
6. Review the artifact and run `oat-docs-apply`

## Progressive disclosure

The docs workflow expects local indexes to guide discovery without forcing agents
to open every page.

- keep local topic summaries in `index.md`
- link to deeper setup/config/reference material when full detail is not needed inline
- let the analysis artifact decide what should be inline, link-only, omitted, or escalated to the user

## Related docs

- [`../cli/docs-apps.md`](../cli/docs-apps.md)
- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)
- [`execution-contracts.md`](execution-contracts.md)
