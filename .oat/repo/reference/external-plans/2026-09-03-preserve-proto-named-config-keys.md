---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260903-preserve-proto-named-config.md
oat_external_plan_commit: dd41adb9bed53aa2389e911b601615fc2b26f0b7
oat_external_plan_date: '2026-09-03'
oat_execution_status: READY
oat_backlog_items:
  - BL-260903-preserve-proto-named-config
oat_issue_url: null
created: '2026-09-03T22:30:00Z'
---

# Preserve **proto**-named config keys through JSON parsing

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This changes
> every OAT config read for one pathological key; the plan includes the
> alternative close (document the limitation) so the decision is explicit.

## Outcome

`parseJsonConfig` returns null-prototype objects built with
`jsonc-parser`'s `parseTree` and `getNodeValue`, so a key literally named
`__proto__` survives a read exactly as the write path already preserves it.
The error-collection contract, the `SyntaxError` message, and
trailing-comma and comment options are unchanged, the empty-content case is
explicit, and a full disk read-write-read round-trip test closes the FR10 gap
the existing test suite documents. A decision record states the
null-prototype config-read policy.

## Source and live evidence

- Source backlog item:
  [BL-260903-preserve-proto-named-config — Preserve **proto**-named config keys through jsonc parsing](../../pjm/backlog/items/BL-260903-preserve-proto-named-config.md)
- Planned at: `origin/main` commit `dd41adb9bed53aa2389e911b601615fc2b26f0b7` on `2026-09-03`.
- Verified evidence:
  - `packages/cli/src/config/json.ts:13-27` — `parseJsonConfig` calls
    `parse` from `jsonc-parser` with `{ allowTrailingComma: true,
disallowComments: true }`, collects `ParseError[]`, and throws
    `SyntaxError` with the config path and `line:column` details.
  - `jsonc-parser@3.2.1` (`packages/cli/package.json:49`, exact pin):
    `parse` assigns into a plain object and drops `__proto__`;
    `parseTree` plus `getNodeValue` (implemented with
    `Object.create(null)`) preserves it with zero parse errors. Verified by
    executing both against the installed copy; `parseTree('')` returns
    `undefined`.
  - `ParseOptions` has no prototype option; no dependency change is needed.
  - Write path already correct: `config/oat-config.ts:1124-1143` builds
    preserved siblings with `Object.fromEntries` under a comment naming this
    hazard.
  - Eight production callers, none in tests: `oat-config.ts:1327,1344,1369,
1556,1585`, `sync-config.ts:100`, `user-sync-config.ts:91`,
    `commands/gate/index.ts:865`. No `json.test.ts` exists.
  - Null-prototype safety: no direct `.hasOwnProperty(` in
    `packages/cli/src`; `user-sync-config.ts:105-107` uses
    `Object.prototype.hasOwnProperty.call`; zod `safeParse` accepts a
    null-prototype object (verified).
  - `commands/tools/shared/project-tools-config.test.ts:253-262` — the FR10
    write-path case whose comment explicitly scopes out the read side and
    names `parseJsonConfig` as the remaining gap.
- Constraining decisions: none on point; closing this is itself a decision
  candidate.

## Dependencies

| Type             | Dependency                                                          | Required state                                                     | Current state |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| Soft integration | Draft PR #190 (edits `gate/index.ts`, a `parseJsonConfig` consumer) | Land this after #190 or re-run the gate suite on the merged state. | Open draft.   |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common                                      | Required update                                                                                        |
| --------------------------------------------- | -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `review-plan-workflow` (draft PR #190) merges | Minor    | None written by this plan; `gate/index.ts` consumes. | Re-run `src/commands/gate/index.test.ts` on the merged state; no plan change unless a consumer breaks. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat dd41adb9bed53aa2389e911b601615fc2b26f0b7..origin/main -- packages/cli/src/config/json.ts packages/cli/src/config/oat-config.ts packages/cli/src/config/sync-config.ts packages/cli/src/config/user-sync-config.ts packages/cli/src/commands/gate/index.ts packages/cli/src/commands/tools/shared/project-tools-config.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `json.ts` changed or the `jsonc-parser` pin moved, re-anchor before
editing.

## Repository conventions

- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/config src/commands/tools/shared/project-tools-config.test.ts src/commands/gate/index.test.ts`.
- Lint/format: `pnpm check` → passes.
- Implementation pattern: the existing error-collection shape in `json.ts`;
  the disk round-trip case at `project-tools-config.test.ts:200`.
- Shipped CLI behavior: five-package lockstep bump above `0.2.53`.

## Scope

### In scope

- `packages/cli/src/config/json.ts` — `parseTree` + `getNodeValue`, explicit
  `undefined`-root branch, unchanged error contract and message.
- New `packages/cli/src/config/json.test.ts`.
- `project-tools-config.test.ts` — disk round-trip case; retire the
  scope-out comment.
- One decision record via `oat decision new`.
- Five public package manifests.

### Out of scope

- `oat-config.ts` (write path correct; owned by other plans),
  `gate/index.ts` (consumer; PR #190), `sync-config.ts` and
  `user-sync-config.ts` (verify, do not edit), the dependency pin.

## Current state

`json.ts` is the single parse chokepoint for every OAT config read. The
write path preserves `__proto__` siblings; the read path drops them one
layer earlier. Consumers are already null-prototype safe by inspection, and
the four consumer suites are the executable proof.

## Implementation steps

### 1. Rewrite the parser core

Use `parseTree(raw, errors, options)`; return `undefined` when the root is
`undefined` (empty or whitespace-only content); otherwise
`getNodeValue(root)`. Keep the error-collection loop and the exact
`SyntaxError` message.

**Verify:** `pnpm exec vitest run src/config` → all existing config tests
pass unchanged.

### 2. Add the parser test file

**Verify:** `pnpm exec vitest run src/config/json.test.ts` → the five cases
in the test plan pass.

### 3. Close the FR10 round-trip

Add the disk read-write-read case beside `:200`; delete the scope-out
comment at `:257-262`.

**Verify:** `pnpm exec vitest run src/commands/tools/shared/project-tools-config.test.ts` → pass.

### 4. Consumer sweep

**Verify:** `pnpm exec vitest run src/config/sync-config.test.ts src/config/user-sync-config.test.ts src/config/oat-config.test.ts src/commands/gate/index.test.ts`
→ pass unchanged (null prototypes are inert).

### 5. Decide, bump, gate

Record the null-prototype read policy with `oat decision new`; bump the five
packages; run the eight AGENTS.md gates in order with captured exit codes.

## Test plan

- `json.test.ts` (new): preserves a `__proto__` key as an own property;
  returns null-prototype objects; accepts trailing commas; rejects comments
  with a `line:column` `SyntaxError` naming the path; returns `undefined`
  for empty content.
- `project-tools-config.test.ts` (pattern `:200`): preserves a `__proto__`
  sibling through a full disk cycle.
- Regression proved: the parse-layer drop and the untested error path.

## Done criteria

- [ ] `parseJsonConfig` preserves `__proto__` and returns null-prototype
      objects; message and options unchanged.
- [ ] New parser tests and the FR10 round-trip pass; consumer suites pass
      unchanged.
- [ ] Decision record added; lockstep bump and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- any consumer suite fails under null prototypes (an unaudited assumption
  exists; a normalization layer is needed instead);
- the `SyntaxError` message or `line:column` output changes;
- the decision lands as "document the limitation" (then close the item as
  will-not-do with that rationale instead of merging code); or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, the
`jsonc-parser` pin, and the consumer suites when substantial time passes,
main advances materially from `dd41adb9bed53aa2389e911b601615fc2b26f0b7`, PR #190 lands, or a
load-bearing claim cannot be reproduced.

## Review focus

- Behavioral change to every config read; confirm consumer suites ran
  uncached.
- Whitespace-only content handling.
