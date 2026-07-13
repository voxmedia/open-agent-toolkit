# Claude Smoke Drive Protocol

## Expected topology

The root uses native `Agent` dispatch for one phase implementer and one
independent reviewer per phase. The phase implementer executes tasks directly.
Nested Agent dispatch is optional evidence when useful, not a required live-run
condition.

## Automated invocation

The runner executes `claude -p` with stream JSON and noninteractive permissions
inside the disposable worktree. Canonical evidence writes to
`tools/smoke/reports/claude/<scenario>/`.

## Operator-interactive handoff

`--drive-mode operator --stage prepare` prints the disposable worktree,
interactive `claude` command, and canned prompt. Run it in a TTY and collect
after completion. Operator evidence writes to
`tools/smoke/reports/claude/operator/<scenario>/`.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the repository's normal OAT workflow skills. Prefer the provider-native
root-owned phase-agent topology: one phase implementer directly executes the
phase, then the root dispatches its independent reviewer. Optional nested work
must have a concrete benefit and bounded scope. Before every child launch,
retain launcher-owned selection and acceptance facts.
Assign the child a launcher-owned `requestId`. For each phase implementer and
reviewer, record `launcherRole: "project-root"`, `parentScope: "project"`, and
the manifest `runIdentity` as `parentRequestId`. For optional nested work,
record `launcherRole: "phase-agent"`, its phase as `parentScope`, and the
parent phase implementer's `requestId` as `parentRequestId`. Never infer
ownership from child self-report. Write these records with `schemaVersion: 2`.
Do not publish an
accepted dispatch record while its handle is running; after termination, write
exactly one immutable record with its terminal `completed` or `failed` outcome.
Record pre-start rejection immediately. Keep runtime identity separate, and
write dispatch and state-transition records only through
tools/smoke/evidence/record.mjs, following tools/smoke/CONTRACT.md. Preserve
gate JSON without rewriting it.

The `oat` command is already bound to the preflight-verified source build
through the smoke environment. Use it directly; do not install dependencies,
bootstrap this outer worktree, or invoke `pnpm run cli`.

For each required external review gate, invoke `oat gate review` exactly once
with `--target {{GATE_TARGET}}`. You may inspect `oat gate target list`, but
never invoke a gate as a probe. An accepted failed gate is terminal for that
gate and must not be replaced.

Any child containment, ownership-registration, base, or fixture-readiness
failure is run-fatal: record `invalid-run-abort`, terminate accepted handles,
and stop before any later phase implementer, optional worker, review, or gate.
Never degrade an invalid smoke run to sequential execution or replace an
aborted handle. Gate liveness reports elapsed, idle, and hard-budget
milliseconds; activity proves liveness, not completion, and never extends the
hard budget.

Gate count is fixed: `plan-review` runs one plan gate, `implement` runs one
final code gate after p03, and `full` runs those two gates. Phase self-reviews
still run once per phase from the root, and each reviewer receives only that
phase's commit range and acceptance criteria. Do not turn a fixture review into
repository-wide diagnosis, workflow redesign, or unrelated cleanup.

Do not modify the parent worktree or persisted user configuration. Work only in
this disposable worktree, commit each fixture task exactly as planned, and do
not replace any accepted child launch.
```

<!-- OAT_SMOKE_PROMPT_END -->
