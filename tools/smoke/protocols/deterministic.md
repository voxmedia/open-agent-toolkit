# Deterministic Smoke Drive Protocol

## Expected topology

The in-process fake provider records one accepted root-to-coordinator launch
for each fixture phase and one accepted coordinator-to-worker launch for every
fixture task. Parallel phases use real Git worktrees and the production locked
ownership journal. The fake gate writes the same gate envelope and review
artifact shape consumed by live evidence collection.

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

Gate target: {{GATE_TARGET}}.
Gate count is fixed: the implement scenario runs exactly one external final
code gate after p03 and one coordinator-owned self-review per phase.
```

<!-- OAT_SMOKE_PROMPT_END -->
