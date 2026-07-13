# Cursor CLI Smoke Drive Protocol

## Expected topology

Cursor CLI is a separate flavor from Cursor IDE. The run records its live root
Subagent catalog, dispatches one phase implementer and one root-owned reviewer
per phase, and may claim optional nesting only when structured events prove it.
An accepted interrupted child is terminal; it does not permit a replacement
route.

## Automated invocation

The runner executes `cursor-agent --print --force --trust` with stream JSON and
an explicit workspace. Canonical evidence writes to
`tools/smoke/reports/cursor-cli/<scenario>/`.

## Operator-interactive handoff

`--drive-mode operator --stage prepare` prints an interactive `cursor-agent`
command and canned prompt for the disposable worktree. Run it in a TTY and
collect after completion. Operator evidence writes to
`tools/smoke/reports/cursor-cli/operator/<scenario>/`.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the repository's normal OAT workflow skills. Treat Cursor CLI as its own
harness: observe this invocation's native catalog, select exact native targets
only from that snapshot, and select any CLI route before launch. Dispatch one
phase implementer that directly executes its tasks, then dispatch its
independent reviewer from the root. Nested work is optional and requires a
bounded benefit. Before every child launch, retain launcher-owned selection and
acceptance facts. Assign the child a launcher-owned `requestId`. For each phase
implementer and reviewer, record `launcherRole: "project-root"`,
`parentScope: "project"`, and the manifest `runIdentity` as `parentRequestId`.
For optional nested work, record `launcherRole: "phase-agent"`, its phase as
`parentScope`, and the parent phase implementer's `requestId` as
`parentRequestId`. Never infer ownership from child self-report. Write these
records with `schemaVersion: 2`. Do not publish
an accepted dispatch record while its handle is running; after termination,
write exactly one immutable record with its
terminal `completed` or `failed` outcome. Record pre-start rejection
immediately. Keep runtime identity separate, and write dispatch and
state-transition records only through tools/smoke/evidence/record.mjs,
following tools/smoke/CONTRACT.md. Preserve gate JSON without rewriting it.

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

Do not infer Cursor IDE behavior, modify the parent worktree or persisted user
configuration, or replace an accepted child launch. Work only in this
disposable worktree and commit each fixture task exactly as planned.
```

<!-- OAT_SMOKE_PROMPT_END -->
