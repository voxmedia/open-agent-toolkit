---
oat_generated: true
oat_generated_at: 2026-10-01T06:19:17Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/backlog-wave-3
oat_gate_headless: true
oat_gate_run_id: e44bde62-cfaa-45c8-9449-42b58de6090b
oat_gate_target: codex-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-6.1-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-10-01T06:19:17Z
**Scope:** Current six-phase plan for backlog-wave-3, quick workflow.
**Files reviewed:** 4 primary project artifacts, plus targeted source and contract inspection.
**Commits:** Not applicable to artifact review; committed baseline `3886f0e3ab70aaf13f1e861abcfaae012be4022e`.
**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high-3da8a37eed`

## Review Scope

- Project: `.oat/projects/shared/backlog-wave-3`.
- Workflow mode: `quick`; state frontmatter reports `plan / in_progress`.
- Available project artifacts used: `discovery.md`, `plan.md`, `implementation.md`, and `state.md`.
- Spec and design: absent and optional for this mode; discovery supplies the upstream requirements.
- Review route: validated gate helper selected `inline`; its `cliRoot` exactly matched `OAT_GATE_CLI_ROOT`. The helper reported that model evidence was unavailable. Gate invocation metadata above records configured selectors, not independently observed identity.
- Dispatch Profile advisory: no explicit named-ceiling section is present, which is valid. No missing-profile finding is raised. The policy audit above records the managed/high project policy; the gate invocation remains the prompt-provided model and xhigh effort.
- Delegated reconnaissance was not attempted; inspection and synthesis ran inline.

## Summary

The plan maps all fourteen approved backlog items to twenty-five sequential tasks and preserves the accepted template, persistence-removal, waiver, and release decisions. The revised persistence search covers the wrapped prose and excludes the immutable test fixture identified by the preceding structured review. One High finding remains in the required closeout proof, plus two Medium gaps in the instructions guard proof and the new recon issue contract; resolve these before treating the plan review as passed.

Findings by severity: 0 critical, 1 high, 2 medium, 0 low

## Findings

### Critical

None

### High

- **H1: Add the required closeout transition proof, beyond supplied snapshot fixtures** (`.oat/projects/shared/backlog-wave-3/plan.md:615`).
  Issue: p04-t02 tests a read-only checker and terminal `complete-state` against already constructed `state.md` fixtures. p04-t03 adds text-contract checks (`plan.md:679`), but no task exercises creation and persistence of the snapshot before the first child, ordered summary/document/PR dispatch, durable child completion, and the intervening approval transition. Those are explicit acceptance criteria in `.oat/repo/pjm/backlog/items/BL-260806-fail-closed-when-configured.md:41`. The existing test `uses one immutable snapshot and its stored order across every closeout boundary` at `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts:992` only reads skill prose and asserts strings. It cannot establish the missing runtime trace. Consequently every listed p04 check could pass while the original skipped-child failure recurs and the item is archived as complete.
  Fix: Add a bounded transition proof to p04-t03 with a concrete executable command or a controlled real lifecycle probe and a retained trace. Start configured-plus-absent, observe the snapshot persisted and reopened before any child, execute required children in the stored order, reopen durable completion state after each child, stop at pending approval, and permit terminal completion only after the remaining required transitions. Include interruption/resume and a noncanonical stored order so a remembered vocabulary order cannot satisfy the proof. Keep p04-t02's state-fixture tests as focused checks of the CLI guard; do not replace the missing lifecycle evidence with more prose assertions.
  Requirement: `BL-260806-fail-closed-when-configured`, transition-level acceptance and discovery Success Criteria.

### Medium

- **M1: Make the apply-time link-guard neutralization reachable** (`.oat/projects/shared/backlog-wave-3/plan.md:772`).
  Issue: All listed fixtures begin with `AGENTS.md` already resolving to `CLAUDE.md`. Step 2 requires planning to skip those files, then requires neutralizing only the apply-time re-check to make a test fail (`plan.md:780`). With planning still protecting the same fixtures, no overwrite reaches apply and removing that re-check leaves those tests green. The plan therefore lacks the distinct setup needed to demonstrate its promised second guard is load-bearing. This matters because `applySyncActions` removes the target before rewriting it (`packages/cli/src/commands/instructions/sync/sync.ts:470`), so a link created after planning can otherwise lose the only instruction copy.
  Fix: Add a command-boundary case starting with an unlinked, force-updatable pair; after planning selects the write and before apply, replace an `AGENTS.md` with a link to that `CLAUDE.md`. Assert both files still resolve to the original bytes and a skip is reported. Neutralize only the apply guard and confirm this case fails; prove the initial-link planning guard separately. Reuse the real-filesystem interception pattern in `packages/cli/src/commands/instructions/instructions.integration.test.ts:1411`, extending it for pointer/symlink overwrite rather than the existing `none` removal path.
  Requirement: `BL-260928-keep-instructions-sync-force`; the plan's neutralize-and-restore contract and `deliberate-testing` rule against a negative test passing for an unrelated guard.

- **M2: Define fail-closed validation for the new claim-scoped issue objects** (`.oat/projects/shared/backlog-wave-3/plan.md:467`).
  Issue: p03-t03 introduces `{ text, claimIds: [...] }` and `{ text, scope: 'global' }` but does not specify nonempty claim sets, exact choice of one scope form, or binding to claims actually covered by that review. Its test and p03-t04's controls cover a valid scoped issue and a global issue, but omit malformed or unbound scopes. This is an assurance boundary: a simple membership implementation can accept `claimIds: []` or a misspelled/out-of-review claim ID and apply uncertainty to no verified claim. The current shape boundary rejects all non-string issues (`.agents/skills/recon/scripts/lib/contracts.mjs:2288`); replacing it must not turn malformed scope into silently ignored uncertainty. This is a risk in the proposed contract, not a claim that the unwritten implementation already fails.
  Fix: State the closed union and add negative cases: empty/non-string claim IDs, unknown or out-of-review IDs, neither scope form, and both forms. Bind scoped IDs to the immutable review brief/reviewed claim set before reconciliation or publication; reject malformed binding rather than treating it as no issue. Retain controls showing a valid scoped issue downgrades only its targets and legacy strings/global objects prohibit verified assurance for every covered claim. Define the global negative control's bad state explicitly as retaining covered claims at `verified`, so honest downgraded partial packets are not confused with invalid assurance.
  Requirement: `BL-261001-make-recon-s-packet-validator`, explicit affected-claim scope and fail-closed negative controls.

### Low

None

## Requirements/Design Alignment

**Evidence sources used:** The four project artifacts above; the four accepted `DR-260927-*` decisions named by discovery; the force-sync, closeout, recon-publication, and recon-recovery backlog records; targeted template, docs-nav, release, instructions-sync, recon, and closeout sources and tests. No implementation completion is claimed.

### Requirements Coverage

| Requirement group                                                   | Plan coverage           | Notes                                                                                                                                    |
| ------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Shared template precedence and user-only installation               | p01-t01 through p01-t03 | Repository/user/bundle order, overwrite semantics, and skill/version propagation are explicit.                                           |
| Fumadocs navigation                                                 | p02-t01 through p02-t04 | Strict lists, unlisted paths, cross-folder links, titles, formatter round-trip, MkDocs regression, and real docs generation are mapped.  |
| Recon publication                                                   | p03-t01 through p03-t04 | Production-helper integration and negative controls are present; scoped-issue validation needs M2.                                       |
| Codex admission recovery                                            | p03-t05                 | Preserves zero-retry default, accepted work, target controls, and fresh review contexts; mixed-route records remain explicitly deferred. |
| Exit-gate fingerprint and operator waivers                          | p04-t01, p04-t04        | Both qualified fingerprint generations and immutable provenance are covered.                                                             |
| Closeout snapshot invariant                                         | p04-t02, p04-t03        | CLI rejection and consumer routing are planned; required lifecycle transition evidence is missing (H1).                                  |
| Instructions force-sync safety                                      | p05-t01                 | Correct protection intent; distinct apply-time proof setup is missing (M1).                                                              |
| Validate-only dispatch records                                      | p05-t02                 | Retains managed Claude validation, removes persistence and wrapped references, carries redaction assertions forward.                     |
| Test-only release paths, YAML types, quick routing, packs docs      | p05-t03 through p05-t06 | Concrete fixtures, commands, unchanged-route controls, and the real release probe are mapped.                                            |
| Lockstep release, fourteen-item closeout, all-phase review evidence | p06-t01 through p06-t03 | Full gates and conditional real-phase evidence for BL-260829 are recorded; H1 must be resolved before its closeout item is eligible.     |

### Extra Work (not in declared requirements)

None

## Verification Commands

Review execution verified clean committed project artifacts, current branch and shared scope, and the gate route/dispatch JSON envelopes. Inspection of the revised p05-t02 `rg -U` command confirmed that it finds the current wrapped persistence descriptions and the optional `--project` invocations, while its test exclusions remove the attested test fixture. Product source and tests were not edited or neutralized during this review, and proposed implementation tests have not been run.

Artifact/bookkeeping checks, run by the review owner after writing:

```bash
pnpm exec oxfmt --write .oat/projects/shared/backlog-wave-3/plan.md .oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T061917Z.md
pnpm exec oxfmt --check .oat/projects/shared/backlog-wave-3/plan.md .oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T061917Z.md
git diff --check
```

The canonical `parseReviewGateVerdict` parser is also run against the formatted artifact to verify counts, scope, invocation metadata, and policy-view labeling. Full build/release/test gates belong to implementation and are not implied by this artifact review.

For H1, retain the new lifecycle trace and its exact command in p04-t03. For M1, run the instructions command-boundary integration test and its isolated apply-guard neutralization. For M2, run the recon schema/reconciliation/publication tests including the newly defined bad scopes.

The version-pinned Codex admission note was checked against the primary [residency source](https://raw.githubusercontent.com/openai/codex/rust-v0.159.2/codex-rs/core/src/agent/control/residency.rs) and [tool registration source](https://raw.githubusercontent.com/openai/codex/rust-v0.159.2/codex-rs/core/src/tools/spec_plan.rs). This verifies the cited source contract, not the binary owning this session or an actual capacity recovery run.

## Recommended Next Step

Run `oat-project-review-receive` for this gate artifact, address H1 and disposition M1/M2, then rerun the configured plan gate. The High finding is blocking; do not mark the plan review passed on the current artifact.
