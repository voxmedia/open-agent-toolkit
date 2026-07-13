# Deterministic Smoke Drive Protocol

## Expected topology

The in-process fake provider records one accepted root-to-phase-implementer
launch and one root-owned reviewer launch for each fixture phase. The phase
implementer directly produces each planned task commit. Optional nested
dispatch is validated when present but is not required. Parallel phases use
real Git worktrees and the production locked ownership journal. The fake gate
writes the same gate envelope and review artifact shape consumed by live
evidence collection.

## Automated invocation

The runner executes `tools/smoke/deterministic/provider.mjs` in the disposable
worktree. It requires no provider credentials or network access. It replaces
only provider and gate processes; provisioning, journaling, immutable dispatch
records, Git topology, evidence collection, assertions, and cleanup remain the
production paths.

## Operator-interactive handoff

Unsupported. Deterministic runs are automated and must finish in seconds.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the deterministic fake provider and fake gate only. Preserve the production
ownership journal, immutable dispatch records, Git topology, gate envelope,
evidence collection, assertions, and cleanup paths. No provider credential,
network request, dependency installation, repository build, or repository-wide
test is permitted.

Publish each accepted dispatch record only after the fake handle has a terminal
`completed` or `failed` outcome; `running` is not a valid immutable evidence
outcome. Assign every phase implementer and reviewer a stable `requestId`,
`launcherRole: "project-root"`, `parentScope: "project"`, and the manifest
`runIdentity` as `parentRequestId`. Optional nested records, when injected,
identify `launcherRole: "phase-agent"`, the phase `parentScope`, and the parent
phase implementer's `requestId`; ownership never comes from child self-report.
Write every new dispatch record with `schemaVersion: 2`.

Gate target: {{GATE_TARGET}}.
Gate count is fixed: the implement scenario runs exactly one external final
code gate after p03 and one root-owned phase review per phase.
```

<!-- OAT_SMOKE_PROMPT_END -->
