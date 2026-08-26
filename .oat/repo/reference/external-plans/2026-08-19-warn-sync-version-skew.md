---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260718-warn-when-oat-sync-uses.md
oat_external_plan_commit: 6f443c08
oat_backlog_items:
  - BL-260718-warn-when-oat-sync-uses
oat_issue_url: null
created: '2026-08-20T02:37:32Z'
---

# Surface sync producer and invoker version skew before mutation

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

## Outcome

`oat sync` reports when a loaded manifest was produced by a different CLI
version than the invoking CLI. Human and JSON output identify both versions in
dry-run and apply modes, while version skew remains advisory and apply retains
its existing restamping behavior.

## Source and live evidence

- Source artifact or scope:
  `.oat/repo/pjm/backlog/items/BL-260718-warn-when-oat-sync-uses.md`
- Planned at: commit `6f443c08` on `2026-08-19`
- Related backlog items: `BL-260718-warn-when-oat-sync-uses` — Warn when oat
  sync uses a different producing CLI version
- Verified evidence:
  - `packages/cli/src/commands/sync/index.ts:238` loads each scope manifest
    before constructing its `ScopeSyncPlan`.
  - `packages/cli/src/commands/sync/apply.ts:96` detects a stale manifest
    version only to decide whether to execute and restamp the manifest.
  - `packages/cli/src/commands/sync/dry-run.ts:98` and
    `packages/cli/src/commands/sync/apply.ts:168` construct the current JSON
    envelopes independently.
  - `packages/cli/src/manifest/manager.ts:34` fails closed for malformed
    manifests, creates a current-version empty manifest when the file is
    absent, and `saveManifest` restamps with `OAT_VERSION` at line 81.
  - `packages/cli/src/commands/sync/index.test.ts:502` already proves a
    no-op apply refreshes stale `oatVersion` silently.

## Drift check

Run before editing:

```bash
git diff --stat 6f443c08..HEAD -- packages/cli/src/commands/sync packages/cli/src/manifest
```

If an in-scope file changed, compare this plan's current-state evidence with
the live code. A material mismatch is a STOP condition unless the output and
test seams remain equivalent.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Test: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/sync/index.test.ts`
  → the sync command test file passes.
- Lint/format check: `pnpm check` → repository checks pass without mutation.
- Implementation pattern: match the typed diagnostic fields already carried
  by `ScopeSyncPlan` and assembled into both human and JSON output paths.
- Git/PR convention: do not push or open a PR unless instructed; do not edit
  generated provider views directly. Bump all five public packages together
  because this changes shipped CLI behavior.

## Scope

### In scope

- `packages/cli/src/commands/sync/sync.types.ts` — one typed version-skew
  diagnostic shared by apply and dry-run.
- `packages/cli/src/commands/sync/index.ts` — derive the diagnostic from the
  loaded manifest and `OAT_VERSION` before any apply mutation.
- `packages/cli/src/commands/sync/apply.ts` and
  `packages/cli/src/commands/sync/dry-run.ts` — expose the diagnostic in human
  and JSON modes.
- `packages/cli/src/commands/sync/index.test.ts` — regression cases for apply,
  dry-run, equality, directionality, and manifest edge behavior.
- The five public package manifests and `pnpm-lock.yaml` — required lockstep
  release metadata for changed shipped CLI behavior.

### Out of scope

- Changing manifest schema or recovery behavior — malformed manifests already
  fail closed and an absent manifest intentionally becomes a current-version
  empty manifest.
- Blocking sync on version skew — the backlog contract requires an advisory.
- General update detection or automatic tool updates — this plan only reports
  provenance already present in the sync manifest.

## Current state

`computePlans` retains the loaded `Manifest` on every `ScopeSyncPlan`, so the
producing version is available before the command chooses dry-run or apply.
Apply later compares it with `OAT_VERSION`, but only as
`shouldRefreshManifestVersion`; dry-run does not surface the comparison. JSON
payloads currently include plans, summary, provider mismatches, and extension
data, leaving a natural additive field for version diagnostics.

## Implementation steps

### 1. Define one stable version-skew diagnostic

Add a small type such as `SyncVersionSkew` to `sync.types.ts` with `scope`,
`producingVersion`, and `invokingVersion`. Add an optional diagnostic to
`ScopeSyncPlan` and an optional array to `SyncJsonPayload`. Derive it while
building each scope plan only when the two non-empty strings differ; do not
parse semantic-version ordering because the behavior depends on identity, not
which side is newer.

Treat an absent manifest as no skew because `loadManifest` deliberately creates
it with the invoking version. Preserve the existing validation error for an
empty or otherwise malformed `oatVersion` rather than converting corruption
into a warning.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli type-check` → the typed payload and both
output paths compile.

### 2. Emit the advisory before apply can restamp

In `runSyncCommand`, log human warnings from the computed diagnostics before
branching to `runSyncDryRun` or `runSyncApply`. Include the scope plus both
version labels in one deterministic message. Suppress the human warning in
JSON mode and add the same structured array to both JSON envelopes instead,
including dry-run no-op output.

Do not alter exit codes, planned-operation counts, or apply eligibility. The
existing stale-manifest apply must still call `executeSyncPlan` and restamp the
manifest after the warning is observable.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/commands/sync/index.test.ts`
→ focused tests pass with no output-mode cross-contamination.

### 3. Lock down edge cases and compatibility

Extend the existing command harness cases to prove:

- a stale producing version emits one human warning before successful apply;
- dry-run emits the same warning and never calls `executeSyncPlan`;
- JSON apply and JSON dry-run expose both versions and emit no human warning;
- an equal version emits no diagnostic;
- both a numerically older and a numerically newer producing string are
  reported, establishing that the comparison is symmetric inequality;
- an absent manifest follows the current empty-manifest behavior without a
  false warning; and
- an invalid or missing `oatVersion` retains the existing manifest-validation
  error rather than reaching sync output.

**Verify:** `pnpm test` → the full test suite passes.

### 4. Apply lockstep release bookkeeping

Bump the five public package versions together and update `pnpm-lock.yaml`
through pnpm. Do not hand-edit generated bundled assets.

**Verify:**
`pnpm release:check-versions && pnpm release:validate` → lockstep and package
validation pass.

## Test plan

- Change `packages/cli/src/commands/sync/index.test.ts` using the existing
  `createHarness` and stale no-op test at line 502.
- Use output captures to assert exact human/JSON separation and both version
  values.
- Keep `packages/cli/src/manifest/manager.test.ts` as the structural authority
  for missing and malformed manifest behavior; add only a focused case there
  if the current tests do not exercise the required boundary.
- Focused command:
  `pnpm --filter @open-agent-toolkit/cli test -- src/commands/sync/index.test.ts`
  → all sync command cases pass.
- Full commands:
  `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:check-versions && pnpm release:validate && pnpm build:docs`
  → all exit zero.

## Done criteria

- [ ] A stale manifest yields one pre-mutation diagnostic with scope,
      producing version, and invoking version.
- [ ] Human apply and dry-run warn without changing exit status.
- [ ] JSON apply and dry-run expose a structured diagnostic and no human text.
- [ ] Equal, older, newer, absent, and invalid evidence cases behave as stated.
- [ ] All five public package versions move together and release gates pass.
- [ ] The complete repository Definition of Done exits zero.
- [ ] `git status --short` contains no unexplained or out-of-scope files.

## STOP conditions

Stop and report instead of improvising when:

- live sync output has gained a different common diagnostic envelope that
  should own this field;
- satisfying the requirement would require relaxing `ManifestSchema` or
  recovering from a corrupt manifest;
- any consumer proves that adding an optional JSON field is not backward
  compatible;
- a named verification gate fails twice after one bounded correction; or
- the work would expose, copy, or rotate a credential without explicit
  authority.

## Review focus

- Confirm the warning is emitted before `executeSyncPlan` can restamp evidence.
- Confirm JSON mode remains machine-only and version skew is non-fatal.
- Confirm missing/corrupt manifests retain their existing semantics rather
  than being conflated with a legitimate version mismatch.
