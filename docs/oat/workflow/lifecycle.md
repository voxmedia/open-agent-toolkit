# Lifecycle

OAT lifecycle order:

1. Discovery (`oat-discovery`)
2. Spec (`oat-spec`)
3. Design (`oat-design`)
4. Plan (`oat-plan`)
5. Implement (`oat-implement`)
6. Review loop (`oat-request-review` / `oat-receive-review`)
7. PR (`oat-pr-progress` / `oat-pr-project`)
8. Complete (`oat-complete-project`)

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
