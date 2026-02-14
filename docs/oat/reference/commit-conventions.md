# Commit Conventions

## Phase/task commits

Implementation work commonly uses phase/task ids:
- `pNN-tNN`
- review-fix and review bookkeeping commits

Examples:
- `feat(p04-t03): implement oat init command`
- `fix(p03-t08): harden stray filtering semantics`
- `test(p05-t04): add help snapshot tests`

## Project-level docs/chore commits

Examples:
- `docs(oat): ...`
- `chore(oat): ...`

## Traceability rules

Keep explicit trace links among:
- `plan.md` task ids
- `implementation.md` execution entries
- `reviews/*.md` artifacts
- PR artifacts under `pr/*.md`

## Reference artifacts

- `.oat/projects/shared/provider-interop-cli/plan.md`
- `.oat/projects/shared/provider-interop-cli/implementation.md`
- `.oat/projects/shared/provider-interop-cli/reviews/`
