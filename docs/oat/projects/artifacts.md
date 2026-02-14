# Project Artifacts

Project artifacts live under `.oat/projects/<scope>/<project>/`.

## Core artifacts

- `state.md`: lifecycle state and checkpoint metadata
- `discovery.md`: problem framing, constraints, and discovery outcomes
- `spec.md`: requirements + acceptance criteria
- `design.md`: architecture and implementation approach
- `plan.md`: phase/task breakdown and review tracking
- `implementation.md`: execution log, verification, final summary

## Supporting artifacts

- `reviews/*.md`: phase/final review files
- `pr/*.md`: generated PR descriptions

## Contract

Artifacts are the project system of record; automation and routing should derive from these files, not memory.

## Reference artifacts

- `.oat/templates/*.md`
- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
