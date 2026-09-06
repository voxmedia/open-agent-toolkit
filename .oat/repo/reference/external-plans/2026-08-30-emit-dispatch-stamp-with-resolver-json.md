---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260826-emit-the-dispatch-stamp-from.md
oat_external_plan_commit: cf01598937cd508329dba9651835488a0c5096a8
oat_external_plan_date: '2026-09-03'
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
> requested. The `tool-pack-scope-provider-truthfulness` project merged as
> PR #255 (`a06e9713a`); the 2026-09-03 refresh confirmed `dispatch-ceiling/`,
> `stamp.ts`, and `DispatchReportV1` are unchanged, no stamp was implemented,
> and the three cited skills were bumped and gained dispatch-lineage prose.
> This plan does not add a second formatting CLI mode or alter stamp grammar.

## Outcome

`oat project dispatch-ceiling resolve ... --report-scope ... --report-action ... --json`
returns both the versioned `dispatchReport` and its canonical parseable
`dispatchStamp`. Orchestrators copy the returned stamp directly instead of
running an out-of-tree TypeScript shim or reconstructing fields by hand.

## Source and live evidence

- Source backlog item:
  [BL-260826-emit-the-dispatch-stamp-from — Emit the dispatch stamp from the dispatch-ceiling resolver](../../pjm/backlog/items/BL-260826-emit-the-dispatch-stamp-from.md)
- Planned at: `origin/main` commit
  `cf01598937cd508329dba9651835488a0c5096a8` on `2026-09-03`.
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
    `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:387,540-555`
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

| Type                  | Dependency                                                                                                                                                                       | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Current state                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hard policy           | [DR-260729-additive-dispatch-reports](../decisions/DR-260729-additive-dispatch-reports.md)                                                                                       | Additive JSON field only; preserve `DispatchReportV1` meanings and stamp grammar byte-for-byte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Accepted; satisfiable inside this plan.                                                                                                                                                                         |
| Satisfied integration | `tool-pack-scope-provider-truthfulness` project / [BL-260829-make-tool-pack-scope-selection](../../pjm/backlog/archived/BL-260829-make-tool-pack-scope-selection.md)             | Merged to `origin/main`; anchors refreshed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Satisfied at merge `a06e9713a3efa9659775af341073b54c226eee24` (PR #255); `oat-project-review-provide` 1.5.3, `-remote` 1.1.2, `oat-project-plan-writing` 1.2.21; `commands/project/dispatch/` added.            |
| Soft enrichment       | [BL-260826-populate-native-subagent](../../pjm/backlog/archived/BL-260826-populate-native-subagent.md) / [issue #211](https://github.com/voxmedia/open-agent-toolkit/issues/211) | If it lands first, revalidate producer/provenance values; unknown remains valid until then.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Item archived by PR #255; issue #211 still open pending its post-merge close. `producer`/`provenance` still resolve to `unknown` on main (`dispatch-report.test.ts:801`), so the additive stamp stays truthful. |
| Soft adjacency        | [BL-260820-emit-source-qualified](../../pjm/backlog/items/BL-260820-emit-source-qualified.md)                                                                                    | Keep review/gate receipt provenance separate from resolver stamp production.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Open; separate ownership.                                                                                                                                                                                       |
| Soft ordering         | W4 group 1 plan [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md)                                            | Runs before this plan; both write `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` and the version pins in `packages/cli/src/validation/skills.test.ts` (both bump `oat-project-implement`), so never in one parallel group; dispatch stamp lands after gate override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Pending.                                                                                                                                                                                                        |
| Soft ordering         | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                                                       | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time.                                                                                                      |

No unsatisfied hard dependency blocks execution.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                                                                                                                                                                                                                                       | Required update                                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections.                                                                                                                                                                                                               | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted.                                                                                                                        |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes              | `.agents/skills/oat-project-review-provide/SKILL.md`, `oat-project-review-provide-remote/SKILL.md`, `oat-project-implement/SKILL.md`, `packages/cli/src/validation/skills.test.ts` (pins and stamp regex), `review-skill-contracts.test.ts` (#190 head `63161897dd4`) | If #190 merges first: re-anchor the review-provide stamp guidance, the `:640` literal and `:2132` regex, and the pin tuples, then bump those skills again; if this lands first, #190 rebases. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat cf01598937cd508329dba9651835488a0c5096a8..origin/main -- packages/cli/src/commands/project/dispatch-ceiling packages/cli/src/commands/project/dispatch packages/cli/src/providers/identity .agents/skills/oat-project-review-provide .agents/skills/oat-project-review-provide-remote .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md
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
- Git/PR convention: changed skills require one PR-scoped `version:` bump each
  plus their pin updates; release bookkeeping is mode-dependent (see step 4):
  the wave fan-in owns the lockstep five-package bump, and only a standalone
  execution bumps the five public packages and `pnpm-lock.yaml` itself. Do not
  push or open a PR unless instructed.

## Scope

### In scope

- Dispatch-ceiling JSON output and tests.
- Existing `formatDispatchStamp` as the sole producer; grammar tests remain
  authoritative.
- Canonical implement/review/review-remote skill guidance and contract tests:
  `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  (the `Dispatch stamp:` literal at `:640`),
  `packages/cli/src/validation/skills.test.ts` (the producer-identity stamp
  regex at `:2132` and the version pins for `oat-project-review-provide`,
  `oat-project-review-provide-remote`, and `oat-project-implement`), and
  `bundle-consistency.test.ts`.
- Dispatch-ceiling documentation.
- Changed skill versions and their pins, and managed provider views.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- `oat project dispatch record` and `packages/cli/src/commands/project/dispatch/`
  — separate persisted-provenance surface delivered by PR #255; it does not
  consume the stamp.

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

**Verify:** `pnpm type-check` → passes; `grep -n 'Dispatch: scope=' packages/cli/src/commands/project/dispatch-ceiling/index.ts` → no hand-built grammar outside `formatDispatchStamp`.

### 2. Lock the additive output and canonical equality

Extend `index.test.ts` to assert `dispatchStamp` equals
`formatDispatchStamp(payload.dispatchReport)` for resolved, inherited/default,
and unknown-producer report routes. Assert the field is absent without report
context and on errors. Retain existing argument-pair validation when only scope
or action is supplied.

Do not duplicate the expected full field order in every resolver test; the
identity stamp suite remains the grammar authority.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/commands/project/dispatch-ceiling src/providers/identity/stamp.test.ts src/providers/identity/dispatch-report.test.ts` → present, absent, error, and byte-equality cases pass; run dispatch-ceiling, `stamp.test.ts`, and `dispatch-report.test.ts`
focused suites; all pass.

### 3. Replace shim-oriented orchestrator guidance

Run a repo-wide exact call-site sweep for `formatDispatchStamp(dispatchReport)`
and update the three canonical lifecycle/review surfaces to read and validate
the returned `dispatchStamp`. Require `dispatchReport.schemaVersion === 1`, a
non-empty stamp with the canonical `Dispatch:` prefix, and direct copy into
dispatch/audit metadata. Keep a warning that callers must not hand-assemble it.

Update affected contract tests to require the field-based route and reject a
normal-path shim. Bump each changed skill exactly once.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts` → focused review/implement skill contract and bundle-consistency tests
pass, and `rg` finds no canonical instruction requiring an out-of-tree shim.

### 4. Update documentation and skill bookkeeping

Document `dispatchStamp` as an additive conditional JSON field and show its
coexistence with `dispatchReport`. Explain that unknown producer/provenance is
truthful until stronger runtime evidence exists. Run provider sync and update
the three skill pins.

Do not edit generated CLI assets directly; normal build/release validation owns
their generated form.

**Verify:** `pnpm build:docs` and `pnpm run check:skill-bumps` → exit 0.

### 5. Run the mode-appropriate gates

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` because this plan changes `.agents/skills`. Do not edit
lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.
Also run `pnpm test:skills`. Run the focused tests independently so Turbo
cache replay is not the only evidence.

## Test plan

- Resolver JSON: field present iff report present; value equals canonical
  formatter across representative resolution routes.
- Identity tests: existing byte grammar remains unchanged.
- Skill contracts: field-based consumption, schema/prefix validation, and no
  hand-assembly/shim requirement.
- Docs build, then the lane-mode or standalone gate set from step 5.

## Done criteria

- [ ] Report-bearing JSON includes one canonical `dispatchStamp` string.
- [ ] Non-report and error responses do not fabricate the field.
- [ ] Stamp equality is derived from the returned `dispatchReport` by the
      existing formatter.
- [ ] Stamp grammar and `DispatchReportV1` meanings are unchanged.
- [ ] Canonical orchestrators consume the field without an out-of-tree shim.
- [ ] Unknown producer/provenance remains permitted and explicit.
- [ ] Changed skills have required bumps and pin updates.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the requested outcome requires a standalone `--stamp` mode rather than the
  selected additive JSON field;
- implementation would change `DispatchReportV1` schema/version or stamp grammar;
- a consumer requires hand-assembled fields rather than the canonical formatter;
- issue #211 lands and changes the report/stamp inputs without revalidation;
- a named verification gate fails twice after one bounded correction; or
- scope expands into review/gate receipt provenance.

## Execution record (2026-09-06, wave 4)

Executed as wave-4 p03 (PR wave-4-execution, CLI 0.2.59): `dispatchStamp` emitted beside `dispatchReport` from the single `formatDispatchStamp` call (present iff the report is, including report-bearing `status: blocked` resolutions; absent on non-report and error envelopes); review-provide 1.5.3 → 1.5.4 (five pins — locate pins by version literal, not skill name), review-provide-remote 1.1.2 → 1.1.3; `oat-project-implement` was NOT re-bumped because the wave's p01 lane had already bumped it (one bump per skill per PR); the three skills' guidance is pinned by a shared bounded-window contract helper (`packages/cli/src/__tests__/skills/dispatch-stamp-contract.ts`) with negative fixtures; the documented prefix drops the grammar's trailing space in prose (markdownlint MD038) while tests keep it. Residual: the helper's lexical guards are a tripwire, not a proof — `BL-260906-make-the-dispatch-stamp` (exit-gate M1: bold-step boundaries and a direct normal-path shim sentence).

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, linked
decision, issue #211 and related backlog items, resolver/report/stamp code,
canonical call sites, and tests when a dependency lands, substantial time
passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, cited contracts or intent change,
another PR implements part of the outcome, or a load-bearing claim cannot be
reproduced.

Refresh applied 2026-09-03 after PR #255 merged:

- Re-anchored `dispatch-and-dry-run.md` to `:387` and `:540-555`; the
  `Dispatch stamp:` literal in `review-skill-contracts.test.ts` is at `:640`
  and the producer-identity stamp regex in `validation/skills.test.ts` at
  `:2132`; `dispatch-ceiling/`, `stamp.ts`, `bundle-consistency.test.ts`, and
  the docs page are unchanged.
- Step 3: the three cited skills now carry a "persist native dispatch lineage"
  paragraph that runs `oat project dispatch record`; land the stamp edits
  adjacent to it and bump each touched skill again (the bump gate is
  PR-scoped).
- `oat project dispatch record` (`commands/project/dispatch/`) is a separate
  persisted-provenance surface that does not consume the stamp; it is out of
  scope unless the sweep proves a consumer.
- `BL-260826-populate-native-subagent` is archived; `producer`/`provenance`
  still resolve to `unknown`.
- Rebase onto current `origin/main`. In standalone mode only, choose a
  lockstep version above the then-current `origin/main`; under the execution
  program the wave fan-in owns that choice.

Update or supersede stale instructions before import or execution.

## Review focus

- Verify one canonical formatter call owns the emitted value.
- Confirm field eligibility exactly matches `dispatchReport` eligibility.
- Confirm skill guidance removes shim dependence without weakening validation.
- Confirm no runtime-identity or receipt-provenance scope crept in.
