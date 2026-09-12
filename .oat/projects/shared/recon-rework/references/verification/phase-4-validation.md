# Phase 4 validation evidence

**Date:** 2026-09-10

**Verification baseline:** `9721d7c680a0778967addaf9ef8b391839949d9c`

**origin/main after refresh:** `44616e8fa4b79d9444fc639f8611c645f4bf03fe`

This note records repeatable Phase 4 verification. Raw command logs were retained
outside tracked project artifacts under `/tmp/recon-p04-*.log` for this run.

## CI gate ledger

The gates ran sequentially in the repository's declared CI order. Every command
reported its own exit code; the next gate was not started until the preceding gate
returned zero.

| Order | Command                       | Exit | Execution evidence                                                                |
| ----- | ----------------------------- | ---- | --------------------------------------------------------------------------------- |
| 1     | `pnpm check`                  | 0    | Turbo: 10 successful, 4 cached; 6 executed. Skill validation and root format ran. |
| 2     | `pnpm type-check`             | 0    | Turbo: 10 successful, 5 cached builds; all 5 type-check tasks executed.           |
| 3     | `pnpm test`                   | 0    | Turbo: 10 successful, 5 cached builds; all 5 package tests executed.              |
| 4     | `pnpm build`                  | 0    | Turbo: 5 successful, 5 cached; this gate was a cache replay.                      |
| 5     | `pnpm run check:skill-bumps`  | 0    | Validated 3 changed canonical skill/role declarations against `origin/main`.      |
| 6a    | `git fetch origin main`       | 0    | Refreshed the comparison ref immediately before the release-version gate.         |
| 6     | `pnpm release:check-versions` | 0    | The five public packages are lockstep `0.2.72`, greater than main's `0.2.71`.     |
| 7     | `pnpm release:validate`       | 0    | Packed and validated all 5 public packages; visual validation was valid.          |
| 8     | `pnpm build:docs`             | 0    | Turbo: 6 successful, 6 cached; this gate was a cache replay.                      |

The root test command's non-Turbo supplements actually executed rather than replaying:

- smoke: 167/167 passed;
- skills: 940/940 passed;
- release: 42 passed and 1 intentionally skipped out of 43;
- worktree-init scripts: 1/1 passed.

Because these standalone suites visibly executed in the root output, they were not
duplicated. The fresh package-test control used an isolated temporary home:

```bash
HOME=$(mktemp -d) pnpm exec turbo run test --force
```

It returned 0 with 10/10 Turbo tasks force-executed and 0 cached. The CLI package
reported 390 files and 7,395 tests passed. The temporary home was removed after the
command. Additional repository checks returned 0:

- `pnpm lint` (5 lint tasks executed; cached entries were dependency builds);
- `pnpm format` (5 package format tasks and the root 476-file check executed);
- `node --test .agents/skills/recon/tests/*.test.mjs` (253/253 passed).

## Compatibility and routing controls

The focused compatibility/control command is:

```bash
node --test \
  --test-name-pattern="v1 normalization preserves|v2 resolution inherits|v2 standard triggered condition|v2 standard not-triggered condition|exact target check preserves|production validation rejects a shadow reconciliation" \
  .agents/skills/recon/tests/routing-contracts.test.mjs \
  .agents/skills/recon/tests/routing-preview.test.mjs \
  .agents/skills/recon/tests/workflow.integration.test.mjs
```

It returned 0 with 6/6 selected tests passing after the guards were restored.
Specifically:

- v1 normalization retained its pinned byte-exact approval fingerprint and its
  homogeneous target;
- v2 inherited or replaced each whole exact target without merging axes;
- the valid triggered condition produced contradiction evidence and fed exactly one
  terminal reconciliation;
- the valid non-triggered condition produced no conditional artifact and still fed
  exactly one terminal reconciliation;
- invalid constructed-target drift was rejected with
  `CONSTRUCTED_TARGET_MISMATCH`, while a matching target remained accepted;
- an invalid additional reconciliation artifact produced
  `SHADOW_RECONCILIATION` and was not publishable.

The complete conditional-contract surface is also included in the 253-test focused
suite. It covers unknown, duplicate, terminal, over-cap, incomplete-predicate,
failed-predecessor, and non-triggered-publication invalid controls.

## Guard-neutralization proof

Two production guards were neutralized one at a time with an uncommitted temporary
edit. Each cited test failed, the edit was restored immediately, and the focused
six-test command above then passed. No neutralized code remains in the diff.

### Exact approved target

Temporary mutation: make `exactTargetEqual()` in
`.agents/skills/recon/scripts/lib/routing.mjs` return `true` unconditionally.

```bash
node --test \
  --test-name-pattern="exact target check preserves opaque identity" \
  .agents/skills/recon/tests/routing-preview.test.mjs
```

Observed categorical outcome: exit 1, `Missing expected exception`; the expected
`CONSTRUCTED_TARGET_MISMATCH` guard could no longer be observed. After restoring
the production comparison, the selected test passed.

### Single terminal reconciliation

Temporary mutation: set `expectedCount` to `reconciliationResults.length` in
`resolveTerminalReconciliation()` in
`.agents/skills/recon/scripts/validate-packet.mjs`, neutralizing its exact-count
check.

```bash
node --test \
  --test-name-pattern="production validation rejects a shadow reconciliation" \
  .agents/skills/recon/tests/workflow.integration.test.mjs
```

Observed categorical outcome: exit 1 because `SHADOW_RECONCILIATION` was absent.
The independent lane-write guard still rejected the forged artifact with
`LANE_WRITE_PATH_VIOLATION`; this does not substitute for the neutralized terminal
count assertion. After restoration, the selected test passed and again observed
`SHADOW_RECONCILIATION`.

## Evidence limits

The fake workflow is a deterministic synthetic harness. It proves manifest parsing,
approval binding, dispatch-axis comparison, conditional topology, artifact flow,
reconciliation, and publication controls against repository fixtures. It does not
prove provider availability, provider billing, live model identity, native launch
receipts, network behavior, or real worker quality. This phase performed no live
native launch and makes no claim that one occurred.
