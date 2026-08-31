---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260826-emit-the-dispatch-stamp-from.md
oat_external_plan_commit: 2c6005d64f45a19e8b9eedbc977959b066d3eda0
oat_external_plan_date: '2026-08-31'
oat_execution_status: READY
oat_backlog_items:
  - BL-260826-emit-the-dispatch-stamp-from
oat_issue_url: null
created: '2026-08-30T23:49:30Z'
---

# Emit the canonical dispatch stamp with resolver JSON

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** The selected contract is an additive
> `dispatchStamp` string beside `dispatchReport` when report context is
> requested. PR #249 removed an unrelated manifest-pack assertion from one
> shared test file but did not change resolver/report/stamp behavior. This plan
> does not add a second formatting CLI mode or alter stamp grammar.

## Outcome

`oat project dispatch-ceiling resolve ... --report-scope ... --report-action ... --json`
returns both the versioned `dispatchReport` and its canonical parseable
`dispatchStamp`. Orchestrators copy the returned stamp directly instead of
running an out-of-tree TypeScript shim or reconstructing fields by hand.

## Source and live evidence

- Source backlog item:
  [BL-260826-emit-the-dispatch-stamp-from — Emit the dispatch stamp from the dispatch-ceiling resolver](../../pjm/backlog/items/BL-260826-emit-the-dispatch-stamp-from.md)
- Planned at: `origin/main` commit
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` on `2026-08-31`.
- Verified evidence:
  - `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2758-2775`
    builds a `DispatchReportV1` only when both report scope and action are
    supplied.
  - `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2880-2901`
    adds `dispatchReport` to JSON but emits no stamp field.
  - `packages/cli/src/providers/identity/stamp.ts:97-119` already formats either
    a report or record into the canonical byte grammar.
  - `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts:2156-2180`
    is the existing report-bearing resolver JSON assertion.
  - `.agents/skills/oat-project-review-provide/SKILL.md:647-661`,
    `.agents/skills/oat-project-review-provide-remote/SKILL.md:291`, and
    `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:372,530`
    instruct orchestrators to derive the stamp through formatter semantics,
    which is not directly available from the CLI JSON response.
  - `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md:481-498`
    documents the same derivation contract.
- Related history/decision:
  - [DR-260729-additive-dispatch-reports](../decisions/DR-260729-additive-dispatch-reports.md)
    permits additive report fields while requiring unchanged stamp grammar.
  - [PR #187 — feat: expose managed dispatch visibility and terminal reviewer constraints](https://github.com/voxmedia/open-agent-toolkit/pull/187)
    introduced Dispatch Report V1.
  - [PR #218 — docs(pjm): close wave 2 in the execution program ledger](https://github.com/voxmedia/open-agent-toolkit/pull/218)
    filed this residual item.
  - PR #249 changed `bundle-consistency.test.ts` only by removing an unrelated
    duplicated scope/ownership assertion. The file remains a valid shipped-skill
    contract seam, and issue #211 remains open.

## Dependencies

| Type            | Dependency                                                                                                                                                                    | Required state                                                                                  | Current state                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Hard policy     | [DR-260729-additive-dispatch-reports](../decisions/DR-260729-additive-dispatch-reports.md)                                                                                    | Additive JSON field only; preserve `DispatchReportV1` meanings and stamp grammar byte-for-byte. | Accepted; satisfiable inside this plan.          |
| Soft enrichment | [BL-260826-populate-native-subagent](../../pjm/backlog/items/BL-260826-populate-native-subagent.md) / [issue #211](https://github.com/voxmedia/open-agent-toolkit/issues/211) | If it lands first, revalidate producer/provenance values; unknown remains valid until then.     | Open; does not block emitting a canonical stamp. |
| Soft adjacency  | [BL-260820-emit-source-qualified](../../pjm/backlog/items/BL-260820-emit-source-qualified.md)                                                                                 | Keep review/gate receipt provenance separate from resolver stamp production.                    | Open; separate ownership.                        |

No unsatisfied hard dependency blocks execution.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 2c6005d64f45a19e8b9eedbc977959b066d3eda0..origin/main -- packages/cli/src/commands/project/dispatch-ceiling packages/cli/src/providers/identity .agents/skills/oat-project-review-provide .agents/skills/oat-project-review-provide-remote .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md
```

If another change added a stamp mode/field, changed report eligibility, or
changed grammar, stop and refresh or supersede this plan.

## Repository conventions

- Build: `pnpm build` and `pnpm build:docs` → workspace and docs builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused tests: dispatch-ceiling resolver tests, identity stamp/report tests,
  and affected skill contract tests pass.
- Lint/format: `pnpm lint && pnpm format` → TypeScript and canonical skill
  coverage passes.
- Provider refresh: `oat sync --scope all` → managed views reflect canonical
  skill guidance.
- Implementation pattern: call `formatDispatchStamp(dispatchReport)` exactly
  once at the resolver output boundary; never reimplement field order.
- Git/PR convention: shipped CLI/docs/skill changes require changed skill
  version bumps and one lockstep bump of all five public packages; do not push
  or open a PR unless instructed.

## Scope

### In scope

- Dispatch-ceiling JSON output and tests.
- Existing `formatDispatchStamp` as the sole producer; grammar tests remain
  authoritative.
- Canonical implement/review/review-remote skill guidance and contract tests.
- Dispatch-ceiling documentation.
- Changed skill versions, managed provider views, five package versions, and
  `pnpm-lock.yaml`.

### Out of scope

- A standalone `--stamp` or plain-text-only command mode.
- Changing `DispatchReportV1`, its schema version, or stamp field order.
- Improving unknown producer/provenance before issue #211 lands.
- Source-qualified gate/review receipts.
- Hand-editing generated `packages/cli/assets` copies.

## Current state

The resolver already owns all normalized report data and the identity module
already owns canonical stamp conversion. The missing operation is one function
call at the JSON output boundary. The field should exist exactly when
`dispatchReport` exists, because report scope/action are required to construct a
meaningful stamp. Non-report resolver calls and error envelopes remain unchanged.

Human output already renders the report; this plan does not add a second human
line. Canonical orchestrator instructions should require `dispatchStamp` and may
optionally corroborate it by formatting the report in environments that expose
the library. They must not require a shim as the normal path.

## Implementation steps

### 1. Add `dispatchStamp` beside `dispatchReport`

Import `formatDispatchStamp` into the dispatch-ceiling command. When
`buildResolutionReport` returns a report, compute the stamp once and emit:

```json
{
  "...resolution": "...",
  "dispatchReport": { "schemaVersion": 1 },
  "dispatchStamp": "Dispatch: scope=..."
}
```

Keep the field absent when report context is absent. Preserve human output,
blocked/error exit codes, report construction, and all report meanings.

**Verify:** CLI package typecheck passes with no copied grammar logic.

### 2. Lock the additive output and canonical equality

Extend `index.test.ts` to assert `dispatchStamp` equals
`formatDispatchStamp(payload.dispatchReport)` for resolved, inherited/default,
and unknown-producer report routes. Assert the field is absent without report
context and on errors. Retain existing argument-pair validation when only scope
or action is supplied.

Do not duplicate the expected full field order in every resolver test; the
identity stamp suite remains the grammar authority.

**Verify:** run dispatch-ceiling, `stamp.test.ts`, and `dispatch-report.test.ts`
focused suites; all pass.

### 3. Replace shim-oriented orchestrator guidance

Run a repo-wide exact call-site sweep for `formatDispatchStamp(dispatchReport)`
and update the three canonical lifecycle/review surfaces to read and validate
the returned `dispatchStamp`. Require `dispatchReport.schemaVersion === 1`, a
non-empty stamp with the canonical `Dispatch:` prefix, and direct copy into
dispatch/audit metadata. Keep a warning that callers must not hand-assemble it.

Update affected contract tests to require the field-based route and reject a
normal-path shim. Bump each changed skill exactly once.

**Verify:** focused review/implement skill contract and bundle-consistency tests
pass, and `rg` finds no canonical instruction requiring an out-of-tree shim.

### 4. Update documentation and release bookkeeping

Document `dispatchStamp` as an additive conditional JSON field and show its
coexistence with `dispatchReport`. Explain that unknown producer/provenance is
truthful until stronger runtime evidence exists. Run provider sync, bump all
five public packages together, and update `pnpm-lock.yaml`.

Do not edit generated CLI assets directly; normal build/release validation owns
their generated form.

**Verify:** `pnpm build:docs`, skill bump checks, and release validation pass.

### 5. Run complete gates

Run focused tests independently, then the repository Definition of Done in
order with a fresh `origin/main` fetch before version checking. Also run
`pnpm lint`, `pnpm format`, `pnpm test:skills`, and
`pnpm oat:validate-skills` for canonical skill coverage.

## Test plan

- Resolver JSON: field present iff report present; value equals canonical
  formatter across representative resolution routes.
- Identity tests: existing byte grammar remains unchanged.
- Skill contracts: field-based consumption, schema/prefix validation, and no
  hand-assembly/shim requirement.
- Docs build plus full CLI/skills/build/release gates.

## Done criteria

- [ ] Report-bearing JSON includes one canonical `dispatchStamp` string.
- [ ] Non-report and error responses do not fabricate the field.
- [ ] Stamp equality is derived from the returned `dispatchReport` by the
      existing formatter.
- [ ] Stamp grammar and `DispatchReportV1` meanings are unchanged.
- [ ] Canonical orchestrators consume the field without an out-of-tree shim.
- [ ] Unknown producer/provenance remains permitted and explicit.
- [ ] Changed skills and all five public packages have required bumps.
- [ ] Focused and full gates pass with no unexplained files.

## STOP conditions

Stop and report instead of improvising when:

- the requested outcome requires a standalone `--stamp` mode rather than the
  selected additive JSON field;
- implementation would change `DispatchReportV1` schema/version or stamp grammar;
- a consumer requires hand-assembled fields rather than the canonical formatter;
- issue #211 lands and changes the report/stamp inputs without revalidation;
- a named verification gate fails twice after one bounded correction; or
- scope expands into review/gate receipt provenance.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, linked
decision, issue #211 and related backlog items, resolver/report/stamp code,
canonical call sites, and tests when a dependency lands, substantial time
passes, main advances materially from
`2c6005d64f45a19e8b9eedbc977959b066d3eda0`, cited contracts or intent change,
another PR implements part of the outcome, or a load-bearing claim cannot be
reproduced.

Update or supersede stale instructions before import or execution.

## Review focus

- Verify one canonical formatter call owns the emitted value.
- Confirm field eligibility exactly matches `dispatchReport` eligibility.
- Confirm skill guidance removes shim dependence without weakening validation.
- Confirm no runtime-identity or receipt-provenance scope crept in.
