# PR Flow

Two PR paths exist:

- `oat-pr-progress`: phase or partial progress PR
- `oat-pr-project`: final project PR to `main`

## Inputs

- `spec.md`, `design.md`, `plan.md` (required)
- `implementation.md` (strongly recommended)
- Review status from `plan.md` Reviews table

## Output

Local PR artifact under:
- `.oat/projects/<scope>/<project>/pr/`

GitHub PR body should omit local YAML frontmatter.
