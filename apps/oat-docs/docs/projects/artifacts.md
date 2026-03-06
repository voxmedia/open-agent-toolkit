# Project Artifacts

Project artifacts live under `.oat/projects/<scope>/<project>/`.

## Core artifacts

- `state.md`: lifecycle state and checkpoint metadata
- `discovery.md`: problem framing, constraints, and discovery outcomes
- `spec.md`: requirements + acceptance criteria
- `design.md`: architecture and implementation approach
- `plan.md`: phase/task breakdown and review tracking
- `implementation.md`: execution log, verification, final summary

Mode-sensitive notes:

- `state.md` includes workflow mode metadata (`spec-driven`, `quick`, `import`) for routing.
- `spec.md` and `design.md` are required in spec-driven mode, optional in quick/import mode.
- `plan.md` remains canonical execution artifact across all modes.

## Supporting artifacts

- `reviews/*.md`: phase/final review files
- `pr/*.md`: generated PR descriptions
- `references/imported-plan.md`: preserved source plan for import mode

## Contract

Artifacts are the project system of record; automation and routing should derive from these files, not memory.

## Reference artifacts

- `.oat/templates/*.md`
- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
