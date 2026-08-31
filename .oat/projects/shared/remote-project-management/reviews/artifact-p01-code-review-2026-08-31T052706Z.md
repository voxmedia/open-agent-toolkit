---
oat_generated: true
oat_generated_at: 2026-08-31T05:27:06Z
oat_review_scope: p01
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: d9b9a40c546ef95da258584fbe1646cb95f50660
---

# Code Review: p01

**Reviewed:** 2026-08-31T05:27:06Z  
**Scope:** Phase p01 — Domain, Configuration, and Persistence (`p01-t01` through `p01-t10`)  
**Files reviewed:** 20 implementation and test files  
**Authoritative effective delta:** `origin/main..d9b9a40c546ef95da258584fbe1646cb95f50660`  
**Phase implementation history:** `44547bd26d621891e25b3e05f2c1662ee1423058..a7e8068989a66ae84866dcc4dded337bddd160c5`  
**Integration evidence:** `4fa5390d1` merged `origin/main` at `2c6005d64f45a19e8b9eedbc977959b066d3eda0`; the review head is `d9b9a40c546ef95da258584fbe1646cb95f50660`.

## Summary

Phase p01 has substantial, well-tested foundations, and both the 417-test focused suite and the uncached 4,688-test CLI suite pass. The phase is nevertheless blocked: malformed security policy is silently discarded rather than failing closed, the persisted record schemas omit load-bearing evidence explicitly assigned to p01, pre-create materialization is not coupled to its durable intent, and the shipped PJM doctor does not inspect the default operational store.

Findings: 2 critical, 2 important, 3 medium, 0 minor

**Terminal disposition:** BLOCKED — the phase does not meet the required zero-Critical/zero-Important pass condition.

## Evidence Sources Used

- `.oat/projects/shared/remote-project-management/discovery.md`
- `.oat/projects/shared/remote-project-management/spec.md`
- `.oat/projects/shared/remote-project-management/design.md`
- `.oat/projects/shared/remote-project-management/plan.md`
- `.oat/projects/shared/remote-project-management/implementation.md`
- The 20 phase code/test files in the authoritative effective delta
- Commit and diff evidence from `origin/main`, `44547bd2`, `a7e80689`, `4fa5390d`, and the exact review head

## Findings

### Critical

- **Malformed policy restrictions are silently removed, which can broaden mutation authority** (`packages/cli/src/config/oat-config.ts:1041`)
  - Issue: `normalizePjmRemoteAuthorityPolicy()` copies only recognized values and silently omits invalid operation entries; provider descriptions and provider authority entries are handled the same way at lines 1089-1114. For example, a repository default of `autonomous` plus a misspelled `update-fields` restriction normalizes to the permissive default instead of a fail-closed `read-only` decision. `isValidRemotePolicy()` also checks only the top-level description and authority default (`packages/cli/src/commands/pjm/remote/doctor.ts:252`), so invalid operation/provider policy can still be reported as valid. This directly contradicts the design rule that invalid values become `read-only` with an actionable finding (`design.md:482`) and violates P0 FR7, FR8, and NFR2.
  - Fix: Parse the complete shared remote policy as a closed schema. Reject malformed repository/provider description and authority entries at read time, or preserve an explicit invalid-value sentinel that the policy resolver clamps to `read-only`; make doctor validate every known operation/provider field and unknown key. Add cases with a permissive default plus malformed narrowing overrides and prove the effective result is `read-only` with a diagnostic.
  - Requirement: FR7, FR8, NFR2

- **The p01 schemas omit required durable identity, recovery, and lifecycle evidence** (`packages/cli/src/commands/pjm/remote/schema.ts:117`)
  - Issue: Task p01-t04 requires closed schemas “matching the design,” but the binding metadata has no `identityHistory`; binding state has no local projection, capability evidence, redaction summary, or creation time (`schema.ts:222`); snapshots have no remote identity or lifecycle condition (`schema.ts:168`); operations omit lifecycle operation, reason, authority/approval, attempts, observations, verification, and retry disposition (`schema.ts:269`); and batches omit immutable membership/preview digests and authority/approval (`schema.ts:342`). Because these schemas are strict, later code cannot durably retain the evidence required by the design data models and P0 restart/lifecycle requirements without revising the supposedly completed domain contract. No later plan task declares schema ownership other than p01-t10.
  - Fix: Bring each p01 record schema into alignment with the design’s data models and cross-record invariants, including identity history, provider context, lifecycle anomalies, capability/revision evidence, attempt/receipt/verification evidence, retry disposition, and immutable batch preview/membership fields. Add negative fixtures for missing evidence and cross-record binding/provider mismatches. If intentional staging is preferred, revise the plan/design and assign explicit later schema tasks before accepting p01; do not leave the current implementation documented as design-complete.
  - Requirement: FR5, FR10, FR13, NFR3

### Important

- **Binding materialization is not tied to the durable pre-create journal** (`packages/cli/src/commands/pjm/remote/store.ts:152`)
  - Issue: `materializeVerifiedBinding()` delegates directly to `writeBindingMetadata()` and never loads or validates a create journal. It therefore accepts any binding metadata whose provider/stable ID matches a supplied verification object, even if no intent exists or the intent belongs to another binding/target. The test demonstrates this bypass by creating intent `bnd_binding_789` and then successfully materializing unrelated `bnd_binding_123` (`packages/cli/src/commands/pjm/remote/store.test.ts:293`, materialization at line 349). This breaks the P0 FR14 guarantee that every create begins with durable local intent and weakens duplicate recovery.
  - Fix: Require the create operation ID when materializing, load the exclusive journal, require a `createIntent`, and compare binding ID, provider, target, provider context, purposes, restrictions, projection, and provenance before writing metadata. Permit materialization only from an eligible post-verification state and retain the original journal.
  - Requirement: FR14, NFR3

- **The shipped PJM doctor cannot see the default machine-local operational store** (`packages/cli/src/commands/pjm/doctor.ts:559`)
  - Issue: `runPjmDoctorChecks()` defaults operational diagnostics to `<repoRoot>/pjm/remote/state`, but `resolveRemoteStorageLocations()` places the default state under `<git-common-dir>/oat/pjm-remote/<fingerprint>` (`packages/cli/src/commands/pjm/remote/storage-locator.ts:41`). Current CLI callers do not provide `options.remote`, so ordinary `oat pjm doctor` misses default binding state, operation journals, and concurrent intents. The p01-t09 diagnostics pass only when tests inject the correct directories directly, leaving the actual safety command blind to the default storage class.
  - Fix: Resolve repository identity, Git common dir, configured storage class, and each owning target in the doctor command, then invoke the remote checks for all applicable portable and operational roots. Add command-level fixtures using default local storage and prove malformed state/concurrent journals fail doctor.

### Medium

- **Duplicate-identity diagnostics ignore provider context** (`packages/cli/src/commands/pjm/remote/doctor.ts:191`)
  - Issue: The duplicate key is only `provider:stableId`. The design defines uniqueness over provider/context/stable-ID, so records from different Jira sites, GitHub hosts, or other independent contexts can be falsely diagnosed as duplicate and blocked.
  - Fix: Canonicalize the provider-specific identity context and include it in the duplicate key; add same-ID/different-context and same-tuple fixtures.

- **Atomic-write failures before rename leave sensitive temporary records behind** (`packages/cli/src/commands/pjm/remote/store.ts:367`)
  - Issue: Cleanup begins only in the rename catch block. If `writeFile()`, file `sync()`, or `close()` fails, the unique `.tmp` file remains in the destination directory, potentially retaining snapshot or journal content outside the managed record inventory.
  - Fix: Wrap every step after successful temp-file creation in an outer cleanup guard and unlink the temp path on write, sync, close, rename, or directory-sync failure without masking the primary error. Add injected failures at each pre-rename point and assert no temp file remains.

- **Unconfigured fail-closed policy values are not exposed as resolved defaults** (`packages/cli/src/config/resolve.ts:47`)
  - Issue: `DEFAULT_SHARED_CONFIG` contains no `pjm.remote` defaults, so an unconfigured `oat config get/dump` reports `null` for policy/storage child keys even though the design requires resolved `none`, `read-only`, and local storage values and source attribution. Transport defaults are injected separately, but policy defaults are not.
  - Fix: Add the fail-closed remote policy/storage defaults to effective config resolution and test `get`, `list`, and `dump` before any remote configuration exists.

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** discovery, spec, design, plan, implementation, authoritative code delta, and current `origin/main` integration state.

### Requirements Coverage

| Requirement | Phase p01 status         | Notes                                                                                                                     |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| FR2         | implemented contribution | Local storage resolution is independent of provider availability. Full offline workflow remains assigned to later phases. |
| FR5         | partial / blocked        | Split storage and exclusive journals exist, but the persisted schemas omit required evidence.                             |
| FR7         | partial / blocked        | Types and command ownership exist; malformed restrictions can be normalized away instead of failing closed.               |
| FR8         | partial / blocked        | Authority vocabulary exists; malformed operation/provider values can broaden to a permissive default.                     |
| FR10        | partial / blocked        | Per-binding IDs exist, but batch and operation schemas do not yet represent the designed atomic evidence.                 |
| FR12        | implemented contribution | Local/shared location boundaries and bounded description/extension sizes exist; redaction behavior is assigned later.     |
| FR13        | partial / blocked        | Lifecycle enums exist, but snapshot lifecycle conditions and identity history are absent.                                 |
| FR14        | partial / blocked        | Exclusive create intent is durable, but materialization can bypass or mismatch it.                                        |
| FR16        | implemented contribution | Local > user > built-in transport replacement, deduplication, and empty disablement are implemented.                      |
| NFR1        | partial                  | Storage separation and non-value doctor output are present; complete redaction/security scanning remains later work.      |
| NFR3        | partial / blocked        | Atomic files and journals exist, but required restart evidence and intent coupling are incomplete.                        |
| NFR4        | implemented contribution | Machine-local storage supports offline state; full disconnected workflows remain later work.                              |
| NFR7        | implemented contribution | Legacy associations remain reference-only and the current full CLI suite passes.                                          |

### Design Alignment

- Configuration surface ownership and transport precedence align with the design for valid inputs.
- Portable versus operational storage layout, local-project shared-state rejection, exclusive operation creation, and concurrent-journal preservation align with the design.
- Record data models, invalid-policy handling, create-intent enforcement, and default doctor routing do not align; these are implementation defects rather than defensible artifact drift because the plan explicitly assigns them to p01.

### Extra Work (not in declared requirements)

None. PR #249 changes are excluded from the implementation review surface and used only as integration/test evidence.

## Test and Verification Assessment

- Independently rerun focused Phase p01 suite: **10 files, 417 tests passed**.
- Independently rerun uncached CLI suite: **317 files, 4,688 tests passed**, 3/3 Turbo tasks successful, 0 cached; Vitest duration 134.18s and Turbo wall time 2m17.261s.
- `git diff --check origin/main..d9b9a40c546ef95da258584fbe1646cb95f50660` passed for the scoped implementation files.
- The uncached run rebuilt `@open-agent-toolkit/control-plane` and `@open-agent-toolkit/cli` successfully before testing.
- Coverage gap: no test combines a permissive authority/description default with a malformed narrowing value; no test requires binding materialization to match the created intent; no command-level doctor test uses the default Git-common-dir store; and no failure-injection test covers temp cleanup before rename.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts src/commands/pjm/remote/schema.test.ts src/commands/pjm/remote/storage-locator.test.ts src/commands/pjm/remote/store.test.ts src/commands/pjm/remote/association.test.ts src/commands/pjm/remote/doctor.test.ts src/commands/backlog/new.test.ts src/commands/pjm/doctor.test.ts
pnpm exec turbo run test --filter=@open-agent-toolkit/cli --force
git diff --check origin/main..d9b9a40c546ef95da258584fbe1646cb95f50660 -- packages/cli/src/config packages/cli/src/commands/config packages/cli/src/commands/pjm/remote packages/cli/src/commands/backlog/new.ts packages/cli/src/commands/backlog/new.test.ts packages/cli/src/commands/pjm/doctor.ts packages/cli/src/commands/pjm/doctor.test.ts
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the blocking findings into repair tasks. Re-review p01 after the Critical and Important findings are fixed and the added safety fixtures pass.
