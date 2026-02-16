# Lifecycle

This lifecycle is an optional OAT layer. Interop-only users can skip it.

OAT lifecycle order:

1. Discovery (`oat-project-discover`)
2. Spec (`oat-project-spec`)
3. Design (`oat-project-design`)
4. Plan (`oat-project-plan`)
5. Implement (`oat-project-implement`)
6. Review loop (`oat-project-review-provide` / `oat-project-review-receive`)
7. PR (`oat-project-pr-progress` / `oat-project-pr-final`)
8. Complete (`oat-project-complete`)

## Artifact progression

`discovery.md` -> `spec.md` -> `design.md` -> `plan.md` -> `implementation.md`

## Operational rules

- Keep `state.md`, `plan.md`, and `implementation.md` synchronized.
- Stop at configured HiL checkpoints.
- Do not move lifecycle forward when required review gates are unresolved.

## Active project resolution

- `.oat/active-project` stores the active project path.
- `.oat/projects-root` may override default shared project root.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
