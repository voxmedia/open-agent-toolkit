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

# Preserve `__proto__`-named config keys through JSON parsing

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
  [BL-260903-preserve-proto-named-config — Preserve `__proto__`-named config keys through jsonc parsing](../../pjm/backlog/items/BL-260903-preserve-proto-named-config.md)
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
- Shipped CLI behavior: in lane mode the wave fan-in owns the lockstep bump;
  only a standalone execution bumps the five packages itself.

## Scope

### In scope

- `packages/cli/src/config/json.ts` — `parseTree` + `getNodeValue`, explicit
  `undefined`-root branch, unchanged error contract and message.
- New `packages/cli/src/config/json.test.ts`.
- `project-tools-config.test.ts` — disk round-trip case; retire the
  scope-out comment.
- One decision record via `oat decision new`.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

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

### 5. Decide and gate

Record the null-prototype read policy (proposed title: "OAT config reads
construct null-prototype objects and preserve `__proto__`-named keys"). Before writing the record, run `oat pjm doctor --json` and require `adoption.state` of `declared` or `inferred-legacy` (STOP otherwise), read `.oat/repo/reference/decisions/AGENTS.md`, create it with `oat decision new`, and run `oat decision regenerate-index`.

**Verify (lane mode, the default under the execution program):** run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes. Do not edit lockstep
release files or run `pnpm release:check-versions` / `pnpm release:validate`;
the wave fan-in owns the lockstep bump and the full definition-of-done
sequence. **Standalone mode only:** bump the five public packages above
freshly fetched `origin/main` and run the eight AGENTS.md gates in order.

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
- [ ] Decision record added.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- `oat pjm doctor --json` reports adoption `none` or `partial-initialization`
  (the decision record cannot be written; initialize with `oat pjm init` first);
- any consumer suite fails under null prototypes (an unaudited assumption
  exists; a normalization layer is needed instead);
- the `SyntaxError` message or `line:column` output changes;
- the decision lands as "document the limitation" (then close the item as
  will-not-do with that rationale instead of merging code); or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

**Refresh applied 2026-09-08 (wave-6 boundary, post-STOP amendment; supersedes the parser mechanism named in steps 1–2 and the null-prototype consumer premise):** The wave-6 lane executed steps 1–5 with `parseTree` + `getNodeValue` as written and its cross-model review reproduced two regressions that trip this plan's own STOP conditions: (1) `getNodeValue` recurses where `parse` did not, so configs nested deeper than ≈2111 levels that `parse` accepted (to ≈4792) now throw `RangeError` instead of the contracted `SyntaxError` — an unchanged-error-contract violation; (2) a consumer breaks under null prototypes: `config/oat-config.ts:1252` coerces a raw value with `String(rawDefaultScope)`, which throws on a null-prototype object (`{"projects":{"defaultScope":{}}}` reported `Invalid projects.defaultScope … "[object Object]"` before and `Cannot convert object to primitive value` after), the exact "unaudited assumption" the STOP names, whose remedy the STOP itself prescribes as a normalization layer. Amended mechanism: `json.ts` keeps `parseTree` for error collection (errors loop first, message and options unchanged — empty or whitespace content still throws `ValueExpected` as it always did) and then MATERIALIZES the tree iteratively (an explicit stack, no recursion) into ordinary `Object.prototype`-backed objects and arrays, defining every own key with `Object.defineProperty` (enumerable, writable, configurable) so `__proto__` is an own data property and never a prototype assignment; the result round-trips through `JSON.stringify` unchanged. Consumers therefore receive plain objects (implicit coercions such as `String(x)` behave byte-identically) and no consumer normalization is required. Test plan additions: a depth control at 5000 nested arrays parses on the new path and produces the same `SyntaxError` class for malformed input at depth; an injection control (`{"__proto__":{"git":{"defaultBranch":"INJECTED"}}}` → `oat config get git.defaultBranch` is `main`/default, and `Object.getPrototypeOf(parsed) === Object.prototype`); the `String(rawDefaultScope)` consumer control through the real CLI (message identical pre/post for `{}` and `[{}]` values); the rejection-parity test compares the full formatted message, not a boolean. Corrections to this plan's own text: the Test-plan bullet "returns `undefined` for empty content" is wrong under the unchanged error contract (empty content throws); the Outcome's "null-prototype object" wording is superseded by "plain object with `__proto__` as an own key". Everything else in the plan (scope, STOPs, Done criteria as amended here, the decision record) stands.
**Refresh applied 2026-09-07 (wave-6 boundary, per the execution program's pre-dispatch refresh clause; drift re-run against `cc91a2d21` = `origin/main` after waves 1–5 and the Lite workflow merged; PR #190 is still an open draft, so its landing-event rows do not apply):** Mechanism reproduced live on the base (`parse` drops the own `__proto__` key; `getNodeValue(parseTree)` keeps it on a null-prototype object; `parseTree('')` is `undefined`); `json.ts:13-27` byte-unchanged; `jsonc-parser` 3.2.1 exact at `packages/cli/package.json:49`; no direct `.hasOwnProperty(` in `packages/cli/src`; `json.test.ts` absent; `project-tools-config.test.ts:200` exact, `:253-262→:254-262`; `user-sync-config.ts:91` exact, `:105-107→:106`; `oat-config.ts:1124-1143→:1256-1269` (`__proto__` comment `:1263`). **Corrected caller inventory (the plan's "eight" is false — there are ten):** `config/oat-config.ts:1473,1490,1574,1606,1633,1820,1849` (seven), `config/sync-config.ts:100`, `config/user-sync-config.ts:91`, `commands/gate/index.ts:980` (was `:865`; the gate module was rewritten +1358 by W5), and **`packages/cli/src/commands/config/index.ts:2856`** — a consumer W5 added with `oat config unset`, which already carries a `__proto__` disclaimer at `:2516-2519` and a `hasOwnProperty` path walker at `:2553`. Contract amendment: add `packages/cli/src/commands/config/index.ts` and its `index.test.ts` to the drift-check path list, to the Step-4 consumer sweep, and to In-scope (a null-prototype config object must flow through `oat config get/set/unset/list/adopt` unchanged, with a `__proto__`-keyed scratch config exercised end-to-end through the real command); the STOP condition about an unaudited consumer is satisfied by this amendment, not triggered. Test-plan gap to close: add a zod `safeParse` null-prototype case (the plan asserts it "verified" but pins nothing). The decision record and regenerated index are write surfaces the drift command omits.
Revalidate against current `origin/main`, the backlog item, the
`jsonc-parser` pin, and the consumer suites when substantial time passes,
main advances materially from `dd41adb9bed53aa2389e911b601615fc2b26f0b7`, PR #190 lands, or a
load-bearing claim cannot be reproduced.

## Review focus

- Behavioral change to every config read; confirm consumer suites ran
  uncached.
- Whitespace-only content handling.
