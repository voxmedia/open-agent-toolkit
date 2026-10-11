---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/items/BL-260907-ignore-backslash-escaped.md
oat_external_plan_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_main_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_date: '2026-10-10'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-ignore-backslash-escaped
oat_issue_url: null
created: '2026-10-11T00:17:45Z'
---

# Ignore escaped emphasis in skill-script reference extraction

> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute directly when authorized, or optionally import with
> `oat-project-import-plan .oat/repo/reference/external-plans/2026-10-10-ignore-escaped-emphasis-in-script-references.md`. Begin with the drift check.
>
> **Execution status: READY.** No unsatisfied hard dependency was found.

## Source and provenance

- Source: [BL-260907-ignore-backslash-escaped](../../pjm/backlog/items/BL-260907-ignore-backslash-escaped.md).
- Review: [Backlog and roadmap review](../../pjm/backlog/reviews/backlog-and-roadmap-review.md).
- Inspected HEAD: `0702df1305492a4886ee5d97be744b35a3633e55`.
- Compared fetched `origin/main` and merge-base: `0702df1305492a4886ee5d97be744b35a3633e55`; both equal the inspected HEAD.
- Planning date: 2026-10-10 (America/Chicago). `created` records UTC.
- `git status --porcelain` was empty before plan writes. Evidence below is
  file inspection, not a runtime reproduction. No source code or tests were changed.
- Item is open, unassigned, and had no external plan link. Searches across
  external plans and current project artifacts found no plan or active owner
  for this exact outcome. Open PR inventory was #357, #190, and #125;
  none claimed this outcome. Recheck ownership before execution.

## Outcome

An emphasis run immediately preceded by a backslash does not open an
extractable reference. The literal Markdown `\_.oat/scripts/helper.sh\_`
produces no reference and therefore no false unshipped-script violation.
This is the backlog's explicit `readOpeningEmphasis`-returns-null behavior:
it does **not** normalize the escaped spelling into a script path. Ordinary
emphasis and malformed real references retain their existing behavior.

## Live evidence and current state

- `packages/cli/src/commands/init/tools/shared/skill-script-references.ts:137-152`:
  `readOpeningEmphasis` scans `_`/`*` backwards and rejects an identifier before
  the run, but does not reject a backslash.
- The same file at `:254-277`: `extractScriptReferences` skips a candidate when
  the opening reader returns null. Trailing decoration stripping otherwise
  removes the underscore and leaves the preceding backslash in the token.
- `packages/cli/src/commands/init/tools/shared/skill-script-references.test.ts:166-236`
  has extraction rows for real emphasis, globs, and glued identifiers, but no
  escaped-opening row. Its `findUnshippedScriptReferences` suite at `:397`
  already supplies small independent manifest fixtures.
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts:4460`
  consumes the same extractor for shipped Markdown. Do not change product
  skill prose to manufacture a fixture.
- The living review explicitly includes this item at `:216` as low-value,
  low-effort, wave-ready fill-in. Current acceptance criteria are unchanged.
  The older [script-reference plan](./2026-09-02-validate-skill-script-references-against-pack-manifests.md)
  introduced the extractor; it does not plan this escaped-emphasis follow-up.
  The source item's historical claim of zero live instances was not recounted
  by scanning excluded skill directories during this bounded pass.

## Dependencies

| Type                   | Dependency                                  | Required state                  | Current state                                         |
| ---------------------- | ------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| Satisfied prerequisite | Shipped script-reference extractor          | Available in inspected CLI tree | Satisfied; extractor and public contract tests exist. |
| Soft coordination      | Any concurrent edit of the two scoped files | Serialize shared writes         | No current owner found; recheck before execution.     |

No unsatisfied hard dependency remains.

## Landing-event impact

| Event                                      | Affected | Files in common                                                | Required update                                                              |
| ------------------------------------------ | -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Extractor or bundled contract changes land | Yes      | `skill-script-references.ts`, its tests, bundled contract test | Recheck escaped opening semantics and test placement; skip if already fixed. |
| Open PR #190 lands                         | Indirect | No scoped source overlap found in current PR files             | Recheck the actual execution tree and CLI gates.                             |

## Drift check

```bash
git diff --stat 0702df1305492a4886ee5d97be744b35a3633e55..HEAD -- packages/cli/src/commands/init/tools/shared/skill-script-references.ts packages/cli/src/commands/init/tools/shared/skill-script-references.test.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
```

## Scope

Change only `skill-script-references.ts` and its colocated test file, plus
required release and source-item closeout bookkeeping at shipment. Run the
existing bundled contract suite without adding redundant copies of the same
fixture. Markdown grammar redesign, escape-parity interpretation, skill prose,
pack ownership, manifest changes, and other reference syntaxes are out of scope.

## Implementation steps

### 1. Add the narrow regression at the owning public boundary

Extend the extraction table in `skill-script-references.test.ts` with a literal
escaped underscore opening and closing, expecting `[]`. Use a raw string or
explicit double backslashes so the runtime input contains both backslashes.
Add a small contract fixture through `findUnshippedScriptReferences` using the
existing manifest helper, expecting zero violations. Keep an ordinary missing
script in real underscore emphasis as the accepted positive detection control.
Do not export `readOpeningEmphasis` merely to test its private return value.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skill-script-references.test.ts`
— the new escaped-input case fails on the baseline with the trailing-backslash
reference, while existing positive detection remains green. Record this before
changing implementation.

### 2. Reject the escaped opening and retain fail-closed cases

At `readOpeningEmphasis`, return null when the character immediately preceding
a nonempty emphasis run is `\`, alongside the identifier guard. Update the
nearby comments to describe both reasons for skipping a candidate. Do not trim
arbitrary backslashes from extracted names or globally loosen terminators.

**Verify:** rerun the step 1 command; all cases pass. Then run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
— the shipped-source integrity contract still passes.

## Test plan

Public boundaries are `extractScriptReferences` (literal extraction behavior)
and `findUnshippedScriptReferences` (owning-pack validation). The expected empty
list comes from the source item's null/ignore requirement. The baseline emits a
bogus filename and fails the new regression for that reason. Existing real
emphasis, unpaired underscores, nested paths, and missing scripts remain the
independent false-negative controls.

Protects against: escaped prose blocking pack validation; not already caught
because existing contract fixtures cover real references only; covered by the
small escaped-source fixture through the real extractor and manifest join.
No test infrastructure or production test hook is needed.

## Done criteria

- [ ] Escaped opening is ignored, with no trailing-backslash reference emitted.
- [ ] Escaped contract fixture has zero violations; genuine missing references still fail.
- [ ] Baseline red and fixed green are recorded; focused and repository gates pass.
- [ ] Only scoped implementation, release bookkeeping, and source closeout changed.

## STOP conditions and revalidation before execution

Stop if a plan/PR now owns the same fix, the item is closed, or the extractor no
longer has the observed gap. Do not turn this into a general Markdown parser.
If acceptance changes to extracting an unescaped path rather than ignoring the
candidate, obtain clarified requirements before coding.

## Revalidation Before Execution

Recheck the source item, plan backlinks, open PRs, and drift command whenever
HEAD advances, any scoped file changes, or more than seven days pass. Compare
the exact execution HEAD after predecessor integration, not merely origin/main;
preserve the authored SHA. Confirm the literal fixture still reproduces the
same false positive before applying the guard.

## Repository conventions and final verification

Read root `AGENTS.md` and `packages/cli/AGENTS.md` before implementation. Keep
logic domain-local and use same-directory relative imports or established
cross-directory aliases. Preserve JSON diagnostics and exit behavior. Do not
edit installed skills or provider views. Use Conventional Commits; this plan
alone does not authorize pushing, opening a PR, or merging.

Focused commands below use the existing CLI Vitest configuration. Run the full
CLI suite with `pnpm --filter @open-agent-toolkit/cli test`; then run the root
Definition of Done in its documented order, recording each exit code:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Fetch `origin/main` before version checks. Follow the existing lockstep release
contract when implementation changes public package content; coordinate its
five package manifests and lockfile with any integration owner instead of
independently bumping them in concurrent lanes. No skill bump is required for
these CLI-only fixes. Record cache replays honestly; focused `vitest run`
provides fresh execution evidence. Inject isolated `home` in new harnesses.
These commands are future implementation gates, **not planning-run results**.

At shipment, archive the source backlog item through the Backlog Lifecycle in
`.oat/repo/pjm/AGENTS.md`, in the same PR as the capability; this planning pass
leaves the item open and changes only its plan backlink and timestamp.
