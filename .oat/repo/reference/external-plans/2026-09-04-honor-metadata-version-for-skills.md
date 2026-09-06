---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-04-issue-258-skill-versioning.md
  - .oat/repo/pjm/backlog/items/BL-260904-honor-metadata-version.md
oat_external_plan_commit: dd41adb9bed53aa2389e911b601615fc2b26f0b7
oat_external_plan_date: '2026-09-04'
oat_execution_status: READY
oat_backlog_items:
  - BL-260904-honor-metadata-version
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/258
created: '2026-09-04T04:40:00Z'
---

# Honor metadata.version as the canonical skill version

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This plan
> covers the resolver, validation, templates, docs, and the alias warning.
> The bulk migration of the 80 bundled skills is deliberately a separate
> item (`BL-260904-migrate-bundled-skills-from`) because every migrated
> skill needs a PR-scoped bump and would collide with every wave lane.

## Outcome

OAT resolves a skill's version from `metadata.version` first and from the
top-level `version` field second, everywhere it reads one: the shared
`getSkillVersion` helper (bundled-versus-installed comparison in
copy-helpers, scan-tools, and doctor), the bump-enforcement and semver checks
in skill validation, and canonical role resolution. When both fields are
present and differ, validation reports a finding instead of silently picking
one. When only the top-level alias is present, validation emits a
deprecation warning that does not fail the gate. `create-agnostic-skill`
and `create-oat-skill` teach new skills to emit `metadata.version`, and the
contributing docs describe the resolution order. Existing skills keep
working unchanged.

## Source and live evidence

- Source backlog item:
  [BL-260904-honor-metadata-version — Honor metadata.version as the canonical skill version](../../pjm/backlog/items/BL-260904-honor-metadata-version.md)
- Source issue: [#258](https://github.com/voxmedia/open-agent-toolkit/issues/258)
- Planned at: `origin/main` commit `dd41adb9bed53aa2389e911b601615fc2b26f0b7` on `2026-09-04`.
- Verified evidence:
  - `packages/cli/src/commands/shared/frontmatter.ts:146-156` —
    `getSkillVersion` calls `parseFrontmatterField(..., 'version')`, a
    regex line read (`getFrontmatterField`, `:73-80`); `getAgentVersion`
    (`:158`) is the same shape. No helper in that module reads nested
    `metadata` keys. The module already imports the `yaml` package
    (`import YAML, { isMap, isScalar } from 'yaml'`, `:4`;
    `packages/cli/package.json` pins `yaml@2.8.2`) and uses
    `YAML.parseDocument` in `parseFrontmatterScalarFields` (`:83-113`).
  - `packages/cli/src/validation/skills.ts:676-680` —
    `getFrontmatterScalar` is a `^key:\s*(.*)$` regex over the raw
    frontmatter block; the validation module does **not** parse YAML. The
    bump check (`:922-925`) and the semver check (`:1063-1068`) both read
    through it.
  - `packages/cli/src/agents/canonical/resolve.ts:174-181` — canonical
    roles go through `parseCanonicalAgentMarkdown`, which yields an
    already-parsed `frontmatter` object; the version read is
    `document.frontmatter.version`.
  - Call sites: `init/tools/shared/copy-helpers.ts:124-125`,
    `tools/shared/scan-tools.ts:115-118`, `doctor/index.ts:330-331`.
  - `packages/cli/src/validation/skills.ts:922-925` — bump enforcement reads
    `getFrontmatterScalar(fm, 'version')` for current and base; null on
    either side skips the check rather than enforcing it. `:1063-1068` —
    semver validation runs only when the top-level key exists.
  - `packages/cli/src/commands/internal/validate-skill-version-bumps.ts:62-66`
    — the `check:skill-bumps` wrapper sets `process.exitCode = 1` whenever
    `result.findings.length > 0`, regardless of `severity`; by contrast
    `validate-oat-skills.ts:59,125-133` treats `severity: 'warning'` as
    non-blocking. Any alias warning routed through the bump result fails the
    bump gate.
  - `packages/cli/src/agents/canonical/resolve.ts:176-181` — a missing or
    empty top-level `version` makes a canonical role identity invalid.
  - `.agents/skills/create-agnostic-skill/SKILL.md:101,175,177,203` and
    `create-oat-skill/SKILL.md:20,70` — templates teach top-level
    `version: 1.0.0`.
  - `apps/oat-docs/docs/contributing/skills.md:182-188` — documents the
    top-level field and the bump gate (PR #248 inserted pack-dependency
    guidance above it).
  - Live inventory: 80 bundled skills carry a top-level `version`; two
    (`oat-repo-improve`, `triage-oat-issues`) already carry a `metadata`
    block (author only). None carries `metadata.version`.
  - The specification (https://agentskills.io/specification) defines
    `name`, `description`, `license`, `compatibility`, `metadata`, and
    experimental `allowed-tools`; its example places `version` under
    `metadata`.
- Constraining decisions: none on point in `.oat/repo/reference/decisions/`.
  The consumer repository's `DR-260619-shipped-skills-carry` (tkstang/skills)
  and its `resolveEffectiveSkillVersion` are the reference implementation
  for step 1.

## Dependencies

| Type           | Dependency                                                                                                                 | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Current state                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft ordering  | W6 group 1 plan [Validate review-ledger paths](./2026-09-03-validate-review-ledger-paths-before-final-pr.md)               | Land first; it updates version pins in `validation/skills.test.ts`, which this plan also edits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Pending (W6).                                                                                              |
| Soft follow-up | `BL-260904-migrate-bundled-skills-from`                                                                                    | Runs after the program; migrates the 80 bundled skills and decides whether the alias can be removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Open.                                                                                                      |
| Open question  | Whether any host outside OAT reads the top-level field                                                                     | If one does, the alias stays permanently and the warning is downgraded to informational; decide in the follow-up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Unresolved.                                                                                                |
| Soft ordering  | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit) | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common                                                                                                                                                              | Required update                                                                                                                     |
| --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `review-plan-workflow` (draft PR #190) merges | Minor    | `packages/cli/src/validation/skills.test.ts` (PR #190 head `63161897dd40a66e1b29cf19e286665895c40dde` edits it; this plan adds cases and bumps the two template-skill pins). | Rebase; re-anchor the version-pin tuples and the new-case insertion points in the merged file before editing; no other plan change. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat dd41adb9bed53aa2389e911b601615fc2b26f0b7..origin/main -- packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts packages/cli/src/commands/internal/validate-skill-version-bumps.ts packages/cli/src/agents/canonical/resolve.ts packages/cli/src/commands/init/tools/shared/copy-helpers.ts packages/cli/src/commands/tools/shared/scan-tools.ts packages/cli/src/commands/doctor/index.ts .agents/skills/create-agnostic-skill/SKILL.md .agents/skills/create-oat-skill/SKILL.md apps/oat-docs/docs/contributing/skills.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `getSkillVersion` or the validation reads changed shape, or any bundled
skill gained `metadata.version`, re-anchor before editing.

## Repository conventions

- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/shared/frontmatter.test.ts src/validation/skills.test.ts src/agents/canonical src/commands/tools/shared/scan-tools.test.ts src/commands/doctor/index.test.ts`.
- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps`, `pnpm format` (two skills change, two
  bumps).
- Implementation pattern: keep `getSkillVersion`'s null contract; add one
  parsed-frontmatter resolver used by all three read sites so the precedence
  cannot diverge; parse with the `yaml` package already imported in
  `frontmatter.ts`, never a regex or indentation parser.
- Shipped CLI and bundled-skill change: in lane mode the wave fan-in owns
  the lockstep bump; only a standalone execution bumps the five packages
  itself.

## Scope

### In scope

- `packages/cli/src/commands/shared/frontmatter.ts` — one resolver contract
  with two layers: `parseSkillFrontmatter(block): ParsedSkillFrontmatter`
  (uses `YAML.parseDocument(block, { uniqueKeys: true })` from the `yaml`
  package already imported at `:4`; returns `{ version?: string, metadata?: { version?: string }, malformed: boolean }`
  with scalar-only, untagged, unanchored values, mirroring
  `parseFrontmatterScalarFields`) and
  `resolveSkillVersion(parsed: ParsedSkillFrontmatter)` returning
  `{ version, source: 'metadata' | 'top-level', conflict?: { metadata, topLevel } } | null`.
  `getSkillVersion` and `getAgentVersion` route file reads through both.
- `packages/cli/src/validation/skills.ts` — bump enforcement and semver
  checks build `ParsedSkillFrontmatter` from the raw block via
  `parseSkillFrontmatter` and call the same `resolveSkillVersion`;
  `getFrontmatterScalar(fm, 'version')` is no longer used for versions. New
  findings: `skill-version-conflict` (both present, differ; error) and
  `skill-version-alias` (top-level only; warning). The alias warning is
  emitted only by the structural validator (`validateOatSkills`, the
  `pnpm oat:validate-skills` path, which is already severity-aware); the
  bump validator (`validateChangedSkillVersionBumps`) consumes resolved
  versions and emits no alias finding.
- `packages/cli/src/commands/internal/validate-skill-version-bumps.ts` —
  unchanged in behavior; its test gains the three gate-outcome cases in the
  test plan.
- `packages/cli/src/agents/canonical/resolve.ts:176` — build
  `ParsedSkillFrontmatter` from the already-parsed
  `document.frontmatter` object (no re-parse) and call
  `resolveSkillVersion`.
- Templates `create-agnostic-skill` and `create-oat-skill` — emit
  `metadata.version`; `version:` bumps for both.
- `apps/oat-docs/docs/contributing/skills.md` — resolution order, alias
  status, and the bump gate wording.
- Tests named in the test plan, including
  `packages/cli/src/validation/skills.test.ts` (new cases; the two
  template-skill version pins) and
  `validate-skill-version-bumps.test.ts`.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Migrating the 80 bundled skills (`BL-260904-migrate-bundled-skills-from`).
- Removing the top-level alias or making the warning an error.
- The pinned version tuples in `validation/skills.test.ts` beyond the two
  template skills bumped here.
- Agent frontmatter schema beyond routing `getAgentVersion` through the
  resolver.

## Current state

Every version read is a top-level scalar read, and none of the three read
sites shares a parser: the runtime helper and the validation module both use
line regexes over the raw frontmatter block, and canonical-role resolution
receives an object parsed elsewhere. Reading `metadata.version` therefore
needs a real YAML read of the block. The `yaml` package is already a
dependency and already imported by `frontmatter.ts`, so the resolver parses
with `YAML.parseDocument` there and every consumer hands it either the raw
block (runtime reads, validator) or an already-parsed object (canonical
roles) through one `ParsedSkillFrontmatter` input shape. The bump gate
depends on the validation reads, so precedence must be identical there and
in the runtime helper, and the bump wrapper fails on any finding, so alias
warnings must never travel through the bump result.

## Implementation steps

### 1. Add the shared parser and resolver

In `frontmatter.ts` add `parseSkillFrontmatter(block)` built on
`YAML.parseDocument` (the `yaml@2.8.2` import at `:4`; accept only scalar,
untagged, unanchored string values for `version` and `metadata.version`;
set `malformed: true` when the document has errors or `metadata` is not a
map) and `resolveSkillVersion(parsed)` with precedence `metadata.version` →
top-level `version`, returning source and any conflict. Route
`getSkillVersion` and `getAgentVersion` through both, preserving the null
contract (unreadable, missing, malformed, or empty → `null`). Do not add a
regex or indentation-based reader for `metadata`.

**Verify:** `pnpm exec vitest run src/commands/shared/frontmatter.test.ts` →
new precedence, nested, quoted, malformed, alias-only, conflict, and null
cases pass.

### 2. Use it in validation and add the two findings

Replace the reads at `skills.ts:922-925` (bump enforcement) and `:1063`
(semver) with `parseSkillFrontmatter` + `resolveSkillVersion` over the raw
block. Emit `skill-version-conflict` (`severity: 'error'`) from both the
structural validator and the bump validator, because a conflicting skill has
no resolvable version. Emit `skill-version-alias` (`severity: 'warning'`)
only from the structural validator (`validateOatSkills`); the bump validator
compares resolved versions and pushes no alias finding, because
`validate-skill-version-bumps.ts:62` fails on any finding. Keep bump
enforcement semantics unchanged for resolved versions.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts src/commands/internal/validate-skill-version-bumps.test.ts`
→ existing pins pass; new cases pass; `pnpm run check:skill-bumps` and
`pnpm oat:validate-skills` both exit 0 on the current tree (every skill is
alias-only: warnings appear in the structural output, none in the bump
output).

### 3. Accept metadata.version in canonical role resolution

Update `resolve.ts:176` to build the parsed input from
`document.frontmatter` (a `version` string and an optional `metadata` map)
and call `resolveSkillVersion`; a conflict is an invalid identity.

**Verify:** `pnpm exec vitest run src/agents/canonical` → a role with only
`metadata.version` resolves.

### 4. Update templates and docs

Templates emit `metadata.version: 1.0.0` and describe the alias; bump both
template skills; update `contributing/skills.md`.

**Verify:** `pnpm oat:validate-skills`, `pnpm format`,
`pnpm run check:skill-bumps` → pass; `pnpm check` → markdownlint clean.

### 5. Prove the runtime consumers

Fixture a bundled skill with `metadata.version` only and confirm
scan-tools, copy-helpers, and doctor compare it correctly.

**Verify:** `pnpm exec vitest run src/commands/tools/shared/scan-tools.test.ts src/commands/doctor/index.test.ts src/commands/init/tools/shared` → pass.

### 6. Gate

**Verify (lane mode, the default under the execution program):** bump the
two changed template skills' `version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`,
`pnpm format`, and `pnpm oat:validate-skills` because this plan changes
`.agents/skills`. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in owns
the lockstep bump and the full definition-of-done sequence. **Standalone
mode only:** bump the five public packages above freshly fetched
`origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- `frontmatter.test.ts`: metadata-only resolves; top-level-only resolves
  with `source: 'top-level'`; both equal resolves without conflict; both
  differ reports the conflict; neither returns null; nested
  `metadata:\n  version: "1.2.3"` and quoted values resolve to the bare
  string; `metadata` that is a scalar or a broken document is `malformed`
  and resolves to null; a tagged or anchored value is ignored.
- `skills.test.ts`: conflict is an error finding in both validators;
  alias-only is a warning from the structural validator and absent from the
  bump result; bump enforcement works for a metadata-only skill; semver
  check runs on `metadata.version`; nested, quoted, and malformed metadata
  through the validator path.
- `validate-skill-version-bumps.test.ts`: an alias-only skill with a valid
  bump exits 0; a real missing bump exits 1; a conflicting skill exits 1.
  Neutralize the alias routing (push the warning into the bump result) and
  prove the first case fails.
- `agents/canonical`: metadata-only role identity is valid; nested and
  quoted forms resolve; a conflict is an invalid identity.
- `scan-tools.test.ts`, `doctor/index.test.ts`: installed-versus-bundled
  comparison with mixed forms.
- Regression proved: spec-conformant skills get version tracking and bump
  enforcement; divergent dual fields are caught rather than silently chosen.

## Done criteria

- [ ] One `ParsedSkillFrontmatter` → `resolveSkillVersion` contract governs
      every version read with metadata-first precedence; the only YAML
      parser involved is the `yaml` package already imported by
      `frontmatter.ts`.
- [ ] Conflict is an error finding; alias-only is a warning emitted only by
      structural validation; `pnpm run check:skill-bumps` exits 0 on the
      current tree with no alias finding in its output.
- [ ] Templates emit `metadata.version`; docs describe the order.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- the alias warning would fail the bump gate on the current tree (it must
  stay a warning until the migration item lands, and it must not travel
  through the bump result at all);
- the resolver cannot be built on the `yaml` package already imported by
  `frontmatter.ts`, or a consumer cannot hand it either the raw block or an
  already-parsed object (do not write a second parser or a regex reader);
- a host outside OAT is shown to read the top-level field (record it and
  keep the alias permanent; do not change scope here); or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #258, and
the three read sites when substantial time passes, main advances materially
from `dd41adb9bed53aa2389e911b601615fc2b26f0b7`, any bundled skill gains `metadata.version`,
the W6 pr-final lane changes the version pins, or a load-bearing claim
cannot be reproduced.

## Review focus

- Precedence identical in the runtime helper, the validation module, and
  canonical-role resolution, through one parsed-input contract.
- Alias warnings are emitted only by the structural validator; the bump
  wrapper's any-finding-fails boundary is unchanged and proven by the three
  gate-outcome cases.
- Templates and docs agree with the resolver.
