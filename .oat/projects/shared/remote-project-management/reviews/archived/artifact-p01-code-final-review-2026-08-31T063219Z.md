---
oat_generated: true
oat_generated_at: 2026-08-31T06:32:19Z
oat_review_scope: p01
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 306bdd9dc0f862021ef049f019b9f0f7d6579599
oat_review_range: 7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8..306bdd9dc0f862021ef049f019b9f0f7d6579599
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/artifact-p01-code-rereview-2026-08-31T060131Z.md
oat_prior_review_head_sha: 7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8
---

# Code Final Review: p01

**Reviewed:** 2026-08-31T06:32:19Z  
**Scope:** Phase p01 — Domain, Configuration, and Persistence (`p01-t01` through `p01-t10`)  
**Files reviewed:** 20 implementation and test files; 9 files in the round-2 repair  
**Authoritative effective delta:** `2c6005d64f45a19e8b9eedbc977959b066d3eda0..306bdd9dc0f862021ef049f019b9f0f7d6579599`  
**Original phase history:** `44547bd26d621891e25b3e05f2c1662ee1423058..a7e8068989a66ae84866dcc4dded337bddd160c5`  
**Final re-review lineage:** `7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8..306bdd9dc0f862021ef049f019b9f0f7d6579599`  
**Round-2 repair delta:** `0b7e274ddcfdbf57459cb5351bfbd5919badacd4..306bdd9dc0f862021ef049f019b9f0f7d6579599`

## Summary

The round-2 repair correctly rejects unknown provider and operation policy keys at config read, adds the three operation-class representations, and diagnoses provider and available identity/context divergence without exposing context values. Phase p01 nevertheless remains blocked: malformed values at a recognized provider key can still disappear under an `autonomous` repository default, and the operation schema's cross-field rules still admit destructive mutations under read-only and composite lifecycle shapes.

Findings: 2 critical, 0 important, 3 medium, 0 minor

**Terminal disposition:** BLOCKED — Phase p01 does not meet the required zero-Critical/zero-Important pass condition.

## Review Dispatch

- Request: `review-p01-r3-20260831T063219Z`
- Caller/action: `oat-project-implement` / `review`
- Configured target: `oat-reviewer-gpt-5-6-sol-high`
- Provider/model/effort/service tier: `codex` / `gpt-5.6-sol` / `high` / `priority`
- Task class/model floor: `consequential` / `consequential` — satisfied
- Policy/ceiling: `high` / `high`
- Route: root-native, matrix-pinned review target; caller-inline fallback without below-floor downgrade

## Evidence Sources Used

- `.oat/projects/shared/remote-project-management/discovery.md`
- `.oat/projects/shared/remote-project-management/spec.md`
- `.oat/projects/shared/remote-project-management/design.md`
- `.oat/projects/shared/remote-project-management/plan.md`
- `.oat/projects/shared/remote-project-management/implementation.md`
- Both prior p01 review artifacts and their exact reviewed heads
- The 20 Phase p01 implementation/test files in the authoritative effective delta
- The exact nine-file round-2 repair and current Git history

## Prior-Blocker Disposition

### Round 1

| Prior Critical/Important                                                            | Disposition                            | Evidence                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical: malformed policy restrictions could disappear under permissive defaults   | **Partially resolved; still blocking** | Known invalid scalar values clamp closed and unknown keys now reject at config read, but a malformed value at a recognized provider key is still skipped while the repository `autonomous` default survives (`oat-config.ts:1102-1128`, `oat-config.ts:1178-1192`). |
| Critical: schemas omitted durable identity, recovery, lifecycle, and batch evidence | **Partially resolved; still blocking** | The missing evidence fields and `null`/`composite` variants are present, but the operation discriminant remains one-way and composite substeps are not restricted to the designed annotation/transition set (`schema.ts:561-644`).                                  |
| Important: binding materialization bypassed or mismatched its pre-create journal    | **Resolved**                           | Materialization loads the named journal, requires a verified create outcome, and compares binding, provider, target, context, purposes, restrictions, projection, and provenance before the atomic metadata write (`store.ts:143-162`, `store.ts:464-523`).         |
| Important: ordinary PJM doctor missed default Git-common-dir state                  | **Resolved**                           | The shipped doctor resolves Git common-dir storage and repository identity before scanning the default operational roots, with command-level coverage (`doctor.ts:563-613`, `doctor.test.ts:117-165`).                                                              |

### Round 2

| Prior Critical/Important                                                                   | Disposition                            | Evidence                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical: unknown provider/operation policy keys survived permissive defaults              | **Resolved as stated**                 | Config read enumerates and rejects unknown remote, provider, authority, and operation paths before normalization; direct runtime tests cover misspelled provider and operation keys (`oat-config.ts:1140-1228`, `oat-config.test.ts:416-457`). |
| Critical: operation schema could not represent read-only, composite, and ordinary variants | **Partially resolved; still blocking** | The union now represents `null`, `composite`, and ordinary classes, but cross-field validation accepts `discussion + delete` and a composite closeout containing a `delete` substep (`schema.ts:26-30`, `schema.ts:561-644`).                  |
| Important: doctor missed provider and available identity/context divergence                | **Resolved**                           | Doctor compares state provider, snapshot stable identity/context, and capability context against portable metadata and emits only binding IDs plus field labels (`remote/doctor.ts:217-270`, `remote/doctor.test.ts:176-321`).                 |

## Findings

### Critical

- **Malformed recognized provider policy entries are dropped while permissive authority survives** (`packages/cli/src/config/oat-config.ts:1102`)
  - Issue: The closed-key check validates a provider policy's children only when the recognized provider entry is an object (`oat-config.ts:1178-1192`), and normalization likewise skips a non-object recognized entry (`oat-config.ts:1106-1108`). A raw config with `authority.default: autonomous` and `providers.github: "read-only"` therefore reads successfully as repository-wide `autonomous` with no GitHub restriction. An independent `readOatConfig()` probe reproduced that exact permissive result. Doctor can flag the raw shape, but runtime mutation configuration has already lost the intended narrowing, contrary to the design's fail-closed rule.
  - Fix: Validate the complete shared remote policy as a closed structural schema before normalization. Reject non-object `providers`, non-object known-provider entries, and malformed authority/operation containers at config read, or retain an invalid-policy sentinel that clamps and blocks the affected provider. Add direct-runtime fixtures for every malformed container shape under `autonomous`; do not rely on a separate doctor invocation.
  - Requirement: FR7, FR8, NFR2

- **Operation governance is not a safe discriminated union** (`packages/cli/src/commands/pjm/remote/schema.ts:561`)
  - Issue: The schema constrains lifecycle only when `operationClass` is `null`, but the ordinary branch does not enforce the converse. Consequently, `lifecycleOperation: discussion` with `operationClass: delete` and non-null authority parses successfully. The composite branch requires only a non-empty step list, while `RemoteOperationStepSchema` accepts every mutation class; a closeout composite containing a `delete` step also parses successfully. Independent schema probes confirmed both accepted records. This permits durable destructive mutation evidence to masquerade as a read-only discussion or designed annotation/transition closeout, violating the P0 lifecycle and fail-closed boundaries.
  - Fix: Make the operation schema a true discriminated union. Require intake/refresh/discussion to use `operationClass: null`; restrict composite to closeout with only unique `annotate` and/or `transition` substeps, null parent authority/approval, and no conflicting parent effect evidence; and define the allowed lifecycle/mutation matrix for ordinary records. Add negative fixtures for read-only lifecycle plus mutation, composite delete/create/relink/recreate, duplicate semantic substeps, and ordinary records carrying composite-only substeps.
  - Requirement: FR4, FR5, FR10, FR15, NFR2, NFR3

### Important

None.

### Medium

- **Duplicate-identity diagnostics still ignore provider context** (`packages/cli/src/commands/pjm/remote/doctor.ts:204`)
  - Issue: The duplicate key remains only `provider:stableId`, while the design's uniqueness boundary is provider/context/stable-ID. Independent GitHub hosts, Jira sites, or workspaces can therefore be falsely blocked as duplicates.
  - Fix: Canonicalize the provider-specific context and include it in the duplicate key. Add same-ID/different-context and same-tuple fixtures.
  - Disposition: Retain as Medium; the demonstrated consequence is a false-positive diagnostic, not an unsafe mutation.

- **Pre-rename write failures can leave temporary records behind** (`packages/cli/src/commands/pjm/remote/store.ts:405`)
  - Issue: Cleanup begins only around rename and directory sync. A `writeFile`, file `sync`, or `close` failure exits before `unlink(tempPath)`, leaving potentially sensitive snapshot or journal content outside the managed inventory.
  - Fix: Wrap the entire post-open lifecycle in one cleanup guard, close safely, and remove the temporary path on every failure without masking the primary error. Inject failures at write, file sync, close, rename, and directory sync.
  - Disposition: Retain as Medium; this is local residue and recovery hygiene, with no evidence of remote mutation or credential leakage in the current phase.

- **Unconfigured fail-closed policy defaults are not exposed by effective config** (`packages/cli/src/config/resolve.ts:47`)
  - Issue: `DEFAULT_SHARED_CONFIG` still omits `pjm.remote` policy/storage. Transport defaults are materialized separately, but `config get/list/dump` returns absent/null policy children until configuration exists rather than resolved `none`, `read-only`, and local storage with default source attribution.
  - Fix: Materialize fail-closed remote policy/storage defaults in effective resolution and test get, list, and dump before any remote configuration exists.
  - Disposition: Retain as Medium; runtime safety defaults remain fail-closed, but the effective-config UX does not expose them accurately.

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** discovery, specification, design, plan, implementation, both prior reviews, the authoritative effective code delta, and the exact round-2 repair.

### Requirements Coverage

| Requirement | Phase p01 status         | Notes                                                                                                                                      |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FR2         | implemented contribution | Local storage and ordinary PJM remain independent of provider availability; full offline lifecycle remains assigned later.                 |
| FR5         | partial / blocked        | Durable identity and recovery evidence are representable, but operation cross-field governance remains unsafe.                             |
| FR7         | partial / blocked        | Valid and unknown-key policy cases are handled, but malformed known-provider shapes can disappear under permissive defaults.               |
| FR8         | partial / blocked        | Four authority modes exist; config structural invalidity can still bypass intended provider narrowing.                                     |
| FR10        | partial / blocked        | Per-binding records and batch evidence exist, but composite closeout accepts operations outside its atomic annotation/transition contract. |
| FR12        | implemented contribution | Storage classes, bounded descriptions/extensions, and redaction evidence fields are present; sanitization behavior remains later work.     |
| FR13        | implemented contribution | Identity history and remote lifecycle conditions are representable.                                                                        |
| FR14        | implemented contribution | Exclusive create intent is retained and coupled to verified materialization; duplicate search/recovery execution remains later work.       |
| FR16        | implemented contribution | Local > user > built-in transport replacement, deduplication, and explicit disablement align with design.                                  |
| NFR1        | partial                  | Storage separation and credential-safe diagnostics are present; complete sanitization/security scanning remains later work.                |
| NFR2        | partial / blocked        | Malformed known-provider configuration and operation discriminant gaps do not fail closed.                                                 |
| NFR3        | partial / blocked        | Journals and evidence are durable, but accepted operation records can encode contradictory lifecycle/mutation semantics.                   |
| NFR4        | implemented contribution | Common machine-local operational state remains available across worktrees.                                                                 |
| NFR7        | implemented contribution | Legacy associations and local PJM behavior remain compatible; focused and CLI checks pass.                                                 |

### Design Alignment

- Configuration ownership, transport precedence, storage separation, Git-common-dir discovery, create-intent coupling, durable evidence fields, and credential-safe provider/context diagnostics align with the design.
- Complete config structural validation and operation cross-field governance still contradict explicit design contracts. These remain implementation defects because p01 owns closed config parsing and strict record schemas.

### Extra Work (not in declared requirements)

None.

## Test and Verification Assessment

- Independently reran the combined Phase p01 suite: **10 files, 426 tests passed**.
- Independently ran `pnpm --filter @open-agent-toolkit/cli type-check`: **passed**.
- Independently ran `pnpm --filter @open-agent-toolkit/cli lint`: **passed with zero warnings/errors**.
- Independently ran `pnpm --filter @open-agent-toolkit/cli check`: **passed**, including formatting.
- Independently ran authoritative `git diff --check`: **passed**.
- Independently probed the current operation schema: both `discussion + delete` and `closeout/composite + delete substep` returned successful parses.
- Independently probed config read with a malformed recognized GitHub provider policy under repository `autonomous`: the provider entry was omitted and `autonomous` remained effective.
- The implementer/root reported an uncached full CLI pass at 317 files/4,697 tests; this final review did not rerun that broad suite. The independently run safety-focused checks are green, but their current fixtures do not cover the two Critical cases above.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts src/commands/pjm/remote/schema.test.ts src/commands/pjm/remote/storage-locator.test.ts src/commands/pjm/remote/store.test.ts src/commands/pjm/remote/association.test.ts src/commands/backlog/new.test.ts src/commands/pjm/remote/doctor.test.ts src/commands/pjm/doctor.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli check
git diff --check 2c6005d64f45a19e8b9eedbc977959b066d3eda0..306bdd9dc0f862021ef049f019b9f0f7d6579599 -- packages/cli/src/config packages/cli/src/commands/config packages/cli/src/commands/pjm/remote packages/cli/src/commands/backlog/new.ts packages/cli/src/commands/backlog/new.test.ts packages/cli/src/commands/pjm/doctor.ts packages/cli/src/commands/pjm/doctor.test.ts
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the two Critical findings into bounded Phase p01 repair tasks. Do not begin Phase p02 until the config reader rejects malformed recognized provider policy shapes and the operation schema enforces a complete lifecycle/mutation discriminant.
