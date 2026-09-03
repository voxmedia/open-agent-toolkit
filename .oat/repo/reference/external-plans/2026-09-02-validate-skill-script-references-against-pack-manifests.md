---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-validate-every-shipped-skill.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-validate-every-shipped-skill
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/199
created: '2026-09-02T23:59:00Z'
---

# Validate every shipped skill-to-script reference against its pack manifest

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The in-flight
> truthfulness branch rewrites the contract-test file this plan extends; see
> the landing-event table and re-anchor the pattern tests after it merges.

## Outcome

A contract test extracts every `.oat/scripts/<name>` reference from every
shipped skill with a syntax-aware extractor, resolves each skill to its
owning pack, and fails when the referenced script is absent from that pack's
manifest, naming the skill, reference, and pack. A mutation proof shows the
test fails when a script is removed or renamed. The one-off
`resolve-tracking.sh` check is subsumed by the general mechanism.

## Source and live evidence

- Source backlog item:
  [BL-260902-validate-every-shipped-skill — Validate every shipped skill-to-script reference against its pack manifest](../../pjm/backlog/items/BL-260902-validate-every-shipped-skill.md)
- Source issue: [#199](https://github.com/voxmedia/open-agent-toolkit/issues/199)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts:1812-1848`
    — `resolves shared tracking scripts from each loaded skill scope` is a bare
    substring gate on `resolve-tracking.sh` that never consults the manifest.
  - `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts:377-380`
    — checks manifest → bundle only; never enumerates skill-declared paths.
  - `packages/cli/src/commands/tools/shared/pack-manifest.ts:83-94` —
    `script(name, sharedOwner?)` yields `destination: .oat/scripts/<name>`,
    the join key.
  - `pack-manifest.ts:216`, `:242-251` — the docs pack ships one script; the
    workflows pack ships three.
  - Live sweep: 11 references to `.oat/scripts/resolve-tracking.sh` across
    six skills (four docs-pack, two workflows-pack); no references to the
    other two scripts; two bare `.oat/scripts/` prose mentions (negative
    cases).
  - `types.ts:28-45` — `PackAssetDefinition` with `kind: 'script'`; no
    owning-pack helper exists anywhere in `packages/cli/src`.
  - `skills-bundled-docs-contract.test.ts:183`, `:191-195`, `:605-638`,
    `:963-1090`, `:1093-1102` — the skill lister, per-skill file lister,
    manifest-derived surface selector, table-driven extraction tests, and
    `manifestFixture` to reuse.
- Constraining decisions: none govern script-reference integrity.

## Dependencies

| Type             | Dependency                                                                                                           | Required state                                                | Current state |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------- |
| Soft integration | [Require executable backstops for contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md) | Independent; this plan is an instance of that authoring rule. | Pending (W3). |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                          | Affected | Files in common                                                                   | Required update                                                                                                                                           |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` merges | Yes      | `skills-bundled-docs-contract.test.ts` (rewritten, −287 net lines on its branch). | Rebase, then re-locate `listSkillDirs`, the extraction table, `manifestFixture`, and the `:1812` case before editing; the manifest join key is unchanged. |
| `review-plan-workflow` (draft PR #190) merges  | No       | None.                                                                             | None.                                                                                                                                                     |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/types.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/commands/init/tools/shared/skill-manifest.ts .agents/skills .oat/scripts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

A rewritten contract-test file is expected drift from the truthfulness
merge; re-anchor rather than STOP. A changed `script()` destination shape is
a STOP.

## Repository conventions

- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/skill-script-references.test.ts`.
- Implementation pattern: the manifest-derived surface selector at `:605-638`
  and the `it.each` extraction table at `:963-1090`.
- Release note: a new non-test module under `packages/cli/src` is shipped
  behavior; bump the five lockstep packages. No skill prose changes, so no
  skill `version:` bump; confirm with `pnpm run check:skill-bumps`.

## Scope

### In scope

- New `packages/cli/src/commands/init/tools/shared/skill-script-references.ts`
  — `extractScriptReferences(text)` (bare, `$SCOPE_ROOT/`-prefixed,
  backticked, link-form) and `resolveOwningPack(skillName, manifest)`.
- New `skill-script-references.test.ts` — extraction table and mutation proof.
- `skills-bundled-docs-contract.test.ts` — the general contract case; fold or
  retain `:1812` so its `$SCOPE_ROOT` shell-shape assertions survive.
- Optional `findPackForAsset` export in `pack-manifest.ts` (no data change).
- Five public package manifests.

### Out of scope

- `bundle-consistency.test.ts` — complementary direction, already passing.
- `.agents/skills/**` — no reference is broken today.
- `resolve-tracking-script.test.ts` and the shipped scripts.

## Current state

Six skills reference one script; both owning packs ship it because commit
`4eed6fa7` added it to the workflows pack. Nothing prevents a future skill
from naming a script its pack does not ship. `sharedOwner` means one script
can legitimately live in two packs, so the check must accept membership in
the owning pack, not uniqueness.

## Implementation steps

### 1. Add the extractor and pack resolver

Create `skill-script-references.ts` with a line-aware extractor and
`resolveOwningPack`; error when a skill belongs to no pack.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/skill-script-references.test.ts`
→ table passes including negatives (`.oat/scripts/` prose mention yields no
reference).

### 2. Add the general contract case

For every skill directory, every extracted reference must equal a
`destination` of a `kind: 'script'` asset in the owning pack; failure names
skill, reference, and pack.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
→ passes on the live tree.

### 3. Add the mutation proof

Using a `manifestFixture` with the script removed, assert the checker reports
the missing path and owning pack.

**Verify:** same command → mutation case passes.

### 4. Fold the legacy case, bump, gate

Keep the `$SCOPE_ROOT` shape assertions from `:1812`; bump the five
packages.

**Verify:** `pnpm run check:skill-bumps` (no skill bump expected), then the
eight AGENTS.md gates in order.

## Test plan

- `extracts $SCOPE_ROOT-prefixed script references`; `ignores a bare
.oat/scripts/ prose mention`; `every shipped skill's script references
exist in its owning pack`; `reports skill, reference, and pack when the
script is absent`; `fails when a referenced script is renamed`.
- Regression proved: the #199 class, pack-boundary drift when a skill moves
  packs, and silent breakage if the workflows-pack script entry were removed.

## Done criteria

- [ ] General extractor and owning-pack resolver exist with unit tests.
- [ ] The contract case passes live and fails under mutation.
- [ ] Legacy `$SCOPE_ROOT` assertions retained.
- [ ] Lockstep bump and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- the new check fails on the current tree (a real shipped defect to report
  before softening the test);
- a skill legitimately references another pack's script by design (needs a
  decision record on cross-pack ownership first);
- the `script()` destination shape changed; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #199, the
pack manifest, and the contract-test file when substantial time passes, main
advances materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, the
truthfulness project lands (rewrites the test file), cited contracts change,
or a load-bearing claim cannot be reproduced. Apply the landing-event table
above.

## Review focus

- Extraction negatives are load-bearing; false positives would block CI.
- `sharedOwner` membership semantics are honored.
