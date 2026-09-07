---
oat_generated: true
oat_generated_at: 2026-08-31T06:01:31Z
oat_review_scope: p01
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8
oat_review_range: d9b9a40c546ef95da258584fbe1646cb95f50660..7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/artifact-p01-code-review-2026-08-31T052706Z.md
oat_prior_review_head_sha: d9b9a40c546ef95da258584fbe1646cb95f50660
---

# Code Re-review: p01

**Reviewed:** 2026-08-31T06:01:31Z  
**Scope:** Phase p01 — Domain, Configuration, and Persistence (`p01-t01` through `p01-t10`)  
**Files reviewed:** 20 implementation and test files; 10 files in the bounded fix  
**Authoritative effective delta:** `2c6005d64f45a19e8b9eedbc977959b066d3eda0..7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8`  
**Original implementation range:** `44547bd26d621891e25b3e05f2c1662ee1423058..a7e8068989a66ae84866dcc4dded337bddd160c5`  
**Re-review lineage:** `d9b9a40c546ef95da258584fbe1646cb95f50660..7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8`  
**Bounded fix delta:** `7c758469c96012f3355787adcb1a75505027ff16..7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8`

## Summary

The bounded fix materially improves the Phase 1 foundation: binding materialization is now coupled to its retained create intent, the shipped PJM doctor reaches the Git-common-dir operational store, and the record schemas now retain most of the missing evidence. The phase remains blocked because malformed unknown policy restrictions are still normalized away while a permissive default survives, the strict operation schema still cannot represent designed read-only or composite operations, and doctor can pass provider-divergent metadata/state records.

Findings: 2 critical, 1 important, 3 medium, 0 minor

**Terminal disposition:** BLOCKED — Phase p01 does not meet the required zero-Critical/zero-Important pass condition.

## Evidence Sources Used

- `.oat/projects/shared/remote-project-management/discovery.md`
- `.oat/projects/shared/remote-project-management/spec.md`
- `.oat/projects/shared/remote-project-management/design.md`
- `.oat/projects/shared/remote-project-management/plan.md`
- `.oat/projects/shared/remote-project-management/implementation.md`
- `.oat/projects/shared/remote-project-management/reviews/artifact-p01-code-review-2026-08-31T052706Z.md`
- The 20 Phase 1 implementation/test files in the authoritative effective delta
- The exact 10-file bounded fix delta and current Git history

## Prior-Blocker Disposition

| Round-1 blocker                                                                     | Disposition                            | Evidence                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical: malformed shared policy restrictions silently removed/broadened authority | **Not resolved**                       | Known invalid values now clamp safely, and doctor reports unknown paths, but normalization still iterates only recognized operations/providers and discards unknown narrowing keys while preserving a permissive default (`oat-config.ts:1055`, `oat-config.ts:1101`).                   |
| Critical: schemas omitted durable identity/recovery/lifecycle/batch evidence        | **Partially resolved; still blocking** | The named missing fields were added, but every operation still requires one mutation class and therefore cannot encode the design's `null` read-only operations or `composite` closeout (`schema.ts:516`).                                                                               |
| Important: binding materialization bypassed/mismatched its pre-create journal       | **Resolved**                           | `materializeVerifiedBinding()` now requires the operation ID, loads the retained create journal, requires verified identity evidence, and compares target, provider context, purposes, restrictions, projection, and provenance before writing (`store.ts:143-162`, `store.ts:458-517`). |
| Important: shipped PJM doctor missed default Git-common-dir operational storage     | **Resolved**                           | The command now derives the Git common directory and stable repository identity, resolves the default storage location, and has command-level coverage that seeds and discovers malformed/common-dir state (`doctor.ts:563-613`, `doctor.test.ts:114-162`).                              |

## Findings

### Critical

- **Unknown policy restrictions are still normalized away while permissive defaults survive** (`packages/cli/src/config/oat-config.ts:1055`)
  - Issue: Invalid values on recognized operation/provider keys now clamp to `read-only`/`none`, but unknown operation keys and unknown provider keys are skipped because normalization iterates only the closed known lists. The new regression fixture explicitly supplies `unknownOperation` and `unknownProvider` beside `authority.default: autonomous`, then expects the normalized runtime policy to retain `autonomous` while omitting those restrictions (`packages/cli/src/config/oat-config.test.ts:364`). Doctor can report the raw unknown paths, but the runtime policy object no longer carries an invalid sentinel, and the plan does not establish doctor as a mandatory guard for every direct mutation command. A typo such as a provider or operation narrowing key can therefore broaden effective authority.
  - Fix: Parse the shared policy as a closed schema before normalization. Reject unknown keys at config-read time, or retain an invalid-policy sentinel that clamps the entire affected provider/operation scope to `read-only` and blocks authority resolution until repaired. Add direct-runtime cases for misspelled provider and operation narrowing keys under `autonomous`, proving mutation authority cannot remain permissive without relying on a separate doctor invocation.
  - Requirement: FR7, FR8, NFR2

- **The strict operation schema cannot represent read-only or composite lifecycle operations** (`packages/cli/src/commands/pjm/remote/schema.ts:516`)
  - Issue: `operationClass` is required and accepts only mutation classes. The design requires the equivalent field to be `MutationClass | 'composite' | null`: `null` is necessary for read-only intake/refresh/discussion journals, and `composite` is necessary for the one-record closeout with independently governed annotation/transition substeps. Consequently, later planned lifecycle work must either record false mutation evidence or modify the supposedly design-complete p01 schema; no later task declares `schema.ts` ownership for this static shape correction.
  - Fix: Align the operation schema with the design by allowing `null` for non-mutation lifecycle operations and `composite` for composite closeout. Add cross-field fixtures proving read-only operations require no mutation authority/attempt, composite parents require authoritative substeps with null parent authority/approval, and ordinary mutation records retain exactly one mutation class. If schema evolution is intentionally deferred, update design/plan ownership before accepting p01.
  - Requirement: FR4, FR5, FR10, FR15, NFR3

### Important

- **Doctor accepts provider-divergent portable metadata and operational state** (`packages/cli/src/commands/pjm/remote/doctor.ts:217`)
  - Issue: The metadata/state disagreement check compares only `metadataUpdatedAt` for records sharing a binding ID. It never compares `metadata.provider` with `state.provider` (or, when present, the snapshot/capability identity context with portable remote identity). A GitHub metadata record and Linear operational state with the same timestamp pass `pjm:remote_metadata_state`, despite the design requiring portable/local state divergence and confused-provider identity to fail closed.
  - Fix: Compare provider and all identity/context evidence available on both sides, not only timestamps. Add same-ID/same-timestamp fixtures with mismatched provider and context and require a credential-safe failing diagnostic.
  - Requirement: FR5, NFR2, NFR3

### Medium

- **Duplicate-identity diagnostics still ignore provider context** (`packages/cli/src/commands/pjm/remote/doctor.ts:194`)
  - Issue: The duplicate key remains only `provider:stableId`; the design's uniqueness boundary is provider/context/stable-ID. Independent sites/workspaces/repositories can be falsely blocked as duplicates.
  - Fix: Canonicalize the provider-specific identity context into the duplicate key and add same-ID/different-context plus same-tuple fixtures.

- **Pre-rename atomic-write failures still leave temporary records behind** (`packages/cli/src/commands/pjm/remote/store.ts:398`)
  - Issue: Temp cleanup begins only after the write/sync/close block. Failure in `writeFile()`, file `sync()`, or `close()` exits before `unlink(tempPath)`, leaving potentially sensitive snapshot or journal content outside the managed record inventory.
  - Fix: Wrap the entire post-open lifecycle in one cleanup guard and unlink the temp path on write, sync, close, rename, or directory-sync failure without masking the primary error. Add injected failures at each pre-rename boundary.

- **Unconfigured fail-closed policy values remain absent from effective config** (`packages/cli/src/config/resolve.ts:47`)
  - Issue: `DEFAULT_SHARED_CONFIG` still has no `pjm.remote` defaults. Transport defaults are materialized separately, but unconfigured policy/storage child keys are absent, so `config get/list/dump` cannot expose resolved `none`, `read-only`, and local storage with default source attribution as required by the design.
  - Fix: Add the remote policy/storage defaults to effective config resolution and test `get`, `list`, and `dump` before any remote configuration exists.

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** discovery, specification, design, plan, implementation, the prior review artifact, the authoritative 20-file code delta, and the exact 10-file fix delta.

### Requirements Coverage

| Requirement | Phase p01 status         | Notes                                                                                                                                                         |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR2         | implemented contribution | Local storage remains independent of provider availability; full offline lifecycle remains assigned later.                                                    |
| FR5         | partial / blocked        | Most required durable fields are now present, but the operation domain cannot represent all designed lifecycle records and doctor misses provider divergence. |
| FR7         | partial / blocked        | Recognized malformed values clamp closed, but unknown narrowing keys can still be erased under permissive defaults.                                           |
| FR8         | partial / blocked        | Four modes exist, but unknown provider/operation restrictions can still disappear before authority resolution.                                                |
| FR10        | partial / blocked        | Batch evidence exists, but the operation schema cannot encode the composite per-binding closeout model.                                                       |
| FR12        | implemented contribution | Storage classes, bounded descriptions/extensions, and redaction evidence fields are present; sanitization behavior is assigned later.                         |
| FR13        | implemented contribution | Identity history and remote lifecycle conditions are now representable.                                                                                       |
| FR14        | implemented contribution | Create intent is exclusive, retained, and coupled to verified materialization; duplicate-search/recovery execution remains later work.                        |
| FR16        | implemented contribution | Local > user > built-in transport replacement, deduplication, and explicit disablement remain aligned.                                                        |
| NFR1        | partial                  | Storage separation and value-safe diagnostics are present; complete sanitization/security scanning remains later work.                                        |
| NFR2        | partial / blocked        | Unknown policy restrictions and provider-divergent records are not fail-closed in the runtime/doctor contracts.                                               |
| NFR3        | partial / blocked        | Durable evidence fields exist, but the lifecycle operation schema is incomplete and doctor misses state/metadata provider divergence.                         |
| NFR4        | implemented contribution | The common local operational store remains usable across worktrees.                                                                                           |
| NFR7        | implemented contribution | Legacy associations and local PJM behavior remain compatible; the full CLI suite passes.                                                                      |

### Design Alignment

- Storage separation, common-Git-dir discovery, known-value policy clamping, create-intent coupling, identity history, snapshots, baselines, batch digests, and retained operation evidence align materially better after the fix.
- Unknown policy handling, the operation record discriminant, and metadata/state provider agreement still contradict explicit design contracts. These are implementation defects rather than defensible artifact drift because p01 owns closed config parsing, strict record shapes, and foundational divergence diagnostics.

### Extra Work (not in declared requirements)

None.

## Test and Verification Assessment

- Independently reran the combined Phase 1 suite: **10 files, 422 tests passed**.
- Independently reran the forced uncached CLI suite: **317 files, 4,693 tests passed**, 3/3 Turbo tasks successful, 0 cached; Vitest duration 78.98s and Turbo wall time 1m21.542s.
- `pnpm --filter @open-agent-toolkit/cli type-check` passed.
- `pnpm --filter @open-agent-toolkit/cli lint` passed with zero warnings/errors.
- `pnpm --filter @open-agent-toolkit/cli check` passed, including formatting.
- `git diff --check` passed for the authoritative Phase 1 implementation surface.
- The new tests meaningfully cover recognized malformed values, raw-policy doctor paths, the newly required schema fields, create-journal field matching, and the real Git-common-dir command path.
- Blocking coverage gaps remain: no direct-runtime test proves unknown provider/operation narrowing keys clamp or block; no schema fixture represents `null` read-only or `composite` operations; and no doctor fixture uses same-timestamp metadata/state with different providers.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts src/commands/pjm/remote/schema.test.ts src/commands/pjm/remote/storage-locator.test.ts src/commands/pjm/remote/store.test.ts src/commands/pjm/remote/association.test.ts src/commands/backlog/new.test.ts src/commands/pjm/remote/doctor.test.ts src/commands/pjm/doctor.test.ts
pnpm exec turbo run test --filter=@open-agent-toolkit/cli --force
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli check
git diff --check 2c6005d64f45a19e8b9eedbc977959b066d3eda0..7b927ed8ae86de80e61f32bf50b3b2df0a9da2a8 -- packages/cli/src/config packages/cli/src/commands/config packages/cli/src/commands/pjm/remote packages/cli/src/commands/backlog/new.ts packages/cli/src/commands/backlog/new.test.ts packages/cli/src/commands/pjm/doctor.ts packages/cli/src/commands/pjm/doctor.test.ts
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the remaining Critical and Important findings into bounded Phase 1 repair tasks, then re-review p01 at the repaired head.
