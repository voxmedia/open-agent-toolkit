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
manifest-shipped skill with a syntax-aware extractor, resolves each shipped
skill to its owning pack, and fails when the referenced script is absent from
that pack's manifest, naming the skill, reference, and pack. Canonical skill
directories that no pack ships are classified separately (reported, never
resolved to a pack, never a failure by themselves), so the owning-pack error
fires only for a skill the manifest claims to ship. A mutation proof shows the
test fails when a script is removed or renamed. The one-off
`resolve-tracking.sh` check is subsumed by the general mechanism.

## Source and live evidence

- Source backlog item:
  [BL-260902-validate-every-shipped-skill — Validate every shipped skill-to-script reference against its pack manifest](../../pjm/backlog/items/BL-260902-validate-every-shipped-skill.md)
- Source issue: [#199](https://github.com/voxmedia/open-agent-toolkit/issues/199)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence (PR #255 rewrote the contract-test file after planning;
  no line number cited into it below survives, so resolve every anchor by
  symbol or test title: `listSkillDirs` is now `:140`, `manifestFixture`
  `:888`, the tracking-script case `:1613`):
  - `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts:1812-1848`
    — `resolves shared tracking scripts from each loaded skill scope` is a bare
    substring gate on `resolve-tracking.sh` that never consults the manifest.
  - `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts:377-380`
    — checks manifest → bundle only; never enumerates skill-declared paths.
  - `packages/cli/src/commands/tools/shared/pack-manifest.ts:89-96` —
    `script(name, sharedOwner?)` yields `destination: .oat/scripts/<name>`,
    the join key.
  - `pack-manifest.ts:222` and the workflows-pack entries — the docs pack ships
    one script; the workflows pack ships three. PR #248 added pack
    dependencies (+124 lines) and the recon skill, which ships its own
    `scripts/` inside the skill directory and references no `.oat/scripts/`
    path; re-anchor the workflows-pack lines before editing.
  - Live sweep: 11 references to `.oat/scripts/resolve-tracking.sh` across
    five skills (four docs-pack, one workflows-pack:
    `oat-repo-knowledge-index`); no references to the other two scripts; two bare `.oat/scripts/` prose mentions (negative
    cases).
  - `types.ts:28-45` — `PackAssetDefinition` with `kind: 'script'`; no
    owning-pack helper exists anywhere in `packages/cli/src`.
  - `skills-bundled-docs-contract.test.ts:140-144` — `listSkillDirs()`
    enumerates every directory under `.agents/skills` (81 on the review
    baseline), which includes repository-local utility and authoring skills
    (`analyze`, `codex-skill`, `triage-oat-issues`, `subagent-orchestration`,
    and others) that appear in no pack's skill list; `pack-manifest.ts:125+`
    declares the shipped set through per-pack name arrays such as
    `WORKFLOW_SKILL_NAMES`. "Every skill directory" is therefore a superset of
    the shipped surface, and a resolver that errors on an unowned skill would
    fail on the live tree.
  - `skills-bundled-docs-contract.test.ts:183`, `:191-195`, `:605-638`,
    `:963-1090`, `:1093-1102` — the skill lister, per-skill file lister,
    manifest-derived surface selector, table-driven extraction tests, and
    `manifestFixture` to reuse.
- Constraining decisions: none govern script-reference integrity.

## Dependencies

| Type             | Dependency                                                                                                                                        | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Current state                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Soft integration | [Require executable backstops for contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md)                              | Independent; this plan is an instance of that authoring rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pending (W3).                                                                                              |
| Soft ordering    | W2 group 1 plan [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md)                           | Runs before this plan; both edit `packages/cli/src/commands/tools/shared/pack-manifest.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Pending.                                                                                                   |
| Soft ordering    | W5 group 3 plan [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md) | Runs after this plan; both add cases to `skills-bundled-docs-contract.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pending.                                                                                                   |
| Soft ordering    | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                        | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                   | Required update                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | Yes      | `skills-bundled-docs-contract.test.ts` (rewritten, −287 net lines on its branch). | Rebase, then re-locate `listSkillDirs`, the extraction table, `manifestFixture`, and the `:1812` case before editing; the manifest join key is unchanged. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190) merges                                        | No       | None.                                                                             | None.                                                                                                                                                                                                                                                      |

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
  behavior, so the integrated change carries a lockstep bump (fan-in owned in
  lane mode; see Scope). No skill prose changes, so no skill `version:` bump;
  confirm with `pnpm run check:skill-bumps`.

## Scope

### In scope

- New `packages/cli/src/commands/init/tools/shared/skill-script-references.ts`
  — `extractScriptReferences(text)` (bare, `$SCOPE_ROOT/`-prefixed,
  backticked, link-form), `listShippedSkills(manifest)` (the union of every
  pack's skill assets), `classifyCanonicalSkillDir(name, manifest)` returning
  `shipped | canonical-unshipped`, and `resolveOwningPack(skillName, manifest)`,
  which errors only for a name that is not in any pack (a caller bug, since
  callers pass shipped names).
- New `skill-script-references.test.ts` — extraction table and mutation proof.
- `skills-bundled-docs-contract.test.ts` — the general contract case; fold or
  retain `:1812` so its `$SCOPE_ROOT` shell-shape assertions survive.
- Optional `findPackForAsset` export in `pack-manifest.ts` (no data change).
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- `bundle-consistency.test.ts` — complementary direction, already passing.
- `.agents/skills/**` — no reference is broken today.
- `resolve-tracking-script.test.ts` and the shipped scripts.

## Current state

Five skills reference one script; both owning packs ship it because commit
`4eed6fa7` added it to the workflows pack. Nothing prevents a future skill
from naming a script its pack does not ship. `sharedOwner` means one script
can legitimately live in two packs, so the check must accept membership in
the owning pack, not uniqueness.

## Implementation steps

### 1. Add the extractor and pack resolver

Create `skill-script-references.ts` with a line-aware extractor,
`listShippedSkills`, `classifyCanonicalSkillDir`, and `resolveOwningPack`.
`resolveOwningPack` errors when the name belongs to no pack; the contract
case never passes it an unshipped directory. A skill shipped by two packs via
`sharedOwner` resolves to both and membership in either satisfies the check.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/skill-script-references.test.ts`
→ table passes including negatives (`.oat/scripts/` prose mention yields no
reference).

### 2. Add the general contract case

Drive the case from `listShippedSkills(manifest)`, not from `listSkillDirs()`:
for every shipped skill, every extracted reference must equal a `destination`
of a `kind: 'script'` asset in the owning pack; failure names skill,
reference, and pack. Add a sibling case that intersects `listSkillDirs()`
with the manifest and asserts every directory classifies as `shipped` or
`canonical-unshipped` (a directory the manifest names but that does not exist
is a failure; an unshipped directory with script references is reported in
the assertion message as informational, not failed). A skill directory whose
`SKILL.md` yields zero references is skipped explicitly, not treated as an
error.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
→ passes on the live tree, with the unshipped set listed in test output.

### 3. Add the mutation proof

Using a `manifestFixture` with the script removed, assert the checker reports
the missing path and owning pack.

**Verify:** same command → mutation case passes.

### 4. Fold the legacy case and verify

Keep the `$SCOPE_ROOT` shape assertions from `:1812`.

**Verify (lane mode, the default under the execution program):** run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` (no skill bump expected) with captured exit
codes. Do not edit lockstep release files or run `pnpm release:check-versions`
/ `pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md
gates in order.

## Test plan

- `extracts $SCOPE_ROOT-prefixed script references`; `ignores a bare
.oat/scripts/ prose mention`; `every shipped skill's script references
exist in its owning pack`; `reports skill, reference, and pack when the
script is absent`; `fails when a referenced script is renamed`.
- `classifies every canonical skill directory as shipped or
canonical-unshipped`; `does not resolve an unshipped canonical skill to a
pack` (a fixture skill dir outside every pack with a `.oat/scripts/` reference
  is reported, not failed); `resolveOwningPack throws for a name in no pack`;
  `accepts a sharedOwner script from either owning pack`.
- Regression proved: the #199 class, pack-boundary drift when a skill moves
  packs, and silent breakage if the workflows-pack script entry were removed.

## Done criteria

- [ ] General extractor and owning-pack resolver exist with unit tests.
- [ ] The contract case passes live and fails under mutation.
- [ ] Legacy `$SCOPE_ROOT` assertions retained.
- [ ] The shipped surface is manifest-derived; unshipped canonical
      directories are classified, never failed, and the no-owner policy is
      tested.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.
- [ ] Clean tree.

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
- The contract iterates the manifest's shipped set; `listSkillDirs()` is used
  only for the classification cross-check.
