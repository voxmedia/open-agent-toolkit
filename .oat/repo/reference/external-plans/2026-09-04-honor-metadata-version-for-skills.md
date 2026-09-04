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
    scalar-only top-level read; `getAgentVersion` (`:158`) is the same
    shape. No helper in that module reads nested `metadata` keys.
  - Call sites: `init/tools/shared/copy-helpers.ts:124-125`,
    `tools/shared/scan-tools.ts:115-118`, `doctor/index.ts:330-331`.
  - `packages/cli/src/validation/skills.ts:922-925` — bump enforcement reads
    `getFrontmatterScalar(fm, 'version')` for current and base; null on
    either side skips the check rather than enforcing it. `:1063-1068` —
    semver validation runs only when the top-level key exists.
  - `packages/cli/src/commands/internal/validate-skill-version-bumps.ts:106`
    — the `check:skill-bumps` gate is the CLI wrapper over that validation.
  - `packages/cli/src/agents/canonical/resolve.ts:176-181` — a missing or
    empty top-level `version` makes a canonical role identity invalid.
  - `.agents/skills/create-agnostic-skill/SKILL.md:101,175,177,203` and
    `create-oat-skill/SKILL.md:20,70` — templates teach top-level
    `version: 1.0.0`.
  - `apps/oat-docs/docs/contributing/skills.md:156-165` — documents the
    top-level field and the bump gate.
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

| Type           | Dependency                                                                                                   | Required state                                                                                                    | Current state |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| Soft ordering  | W6 group 1 plan [Validate review-ledger paths](./2026-09-03-validate-review-ledger-paths-before-final-pr.md) | Land first; it updates version pins in `validation/skills.test.ts`, which this plan also edits.                   | Pending (W6). |
| Soft follow-up | `BL-260904-migrate-bundled-skills-from`                                                                      | Runs after the program; migrates the 80 bundled skills and decides whether the alias can be removed.              | Open.         |
| Open question  | Whether any host outside OAT reads the top-level field                                                       | If one does, the alias stays permanently and the warning is downgraded to informational; decide in the follow-up. | Unresolved.   |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common | Required update |
| --------------------------------------------- | -------- | --------------- | --------------- |
| `review-plan-workflow` (draft PR #190) merges | No       | None.           | None.           |

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
  shared `resolveSkillVersion(frontmatter)` used by all three read sites so
  the precedence cannot diverge.
- Shipped CLI and bundled-skill change: five-package lockstep bump above
  `0.2.53`.

## Scope

### In scope

- `packages/cli/src/commands/shared/frontmatter.ts` — a nested-aware
  `resolveSkillVersion` returning `{ version, source: 'metadata' | 'top-level', conflict?: { metadata, topLevel } }`;
  `getSkillVersion` and `getAgentVersion` route through it.
- `packages/cli/src/validation/skills.ts` — bump enforcement and semver
  checks use the resolver; new findings: `skill-version-conflict` (both
  present, differ; error) and `skill-version-alias` (top-level only;
  warning).
- `packages/cli/src/agents/canonical/resolve.ts:176` — accept
  `metadata.version`.
- Templates `create-agnostic-skill` and `create-oat-skill` — emit
  `metadata.version`; `version:` bumps for both.
- `apps/oat-docs/docs/contributing/skills.md` — resolution order, alias
  status, and the bump gate wording.
- Tests named in the test plan; five public package manifests.

### Out of scope

- Migrating the 80 bundled skills (`BL-260904-migrate-bundled-skills-from`).
- Removing the top-level alias or making the warning an error.
- The pinned version tuples in `validation/skills.test.ts` beyond the two
  template skills bumped here.
- Agent frontmatter schema beyond routing `getAgentVersion` through the
  resolver.

## Current state

Every version read is a top-level scalar read. The frontmatter helper
module has no nested-key accessor, so the resolver needs a small YAML-aware
read of the `metadata` block (the validation module already parses full
frontmatter; reuse its parser rather than adding one). The bump gate depends
on the validation reads, so precedence must be identical there and in the
runtime helper.

## Implementation steps

### 1. Add the shared resolver

In `frontmatter.ts` add `resolveSkillVersion` with precedence
`metadata.version` → top-level `version`, returning source and any
conflict; route `getSkillVersion` and `getAgentVersion` through it,
preserving the null contract.

**Verify:** `pnpm exec vitest run src/commands/shared/frontmatter.test.ts` →
new precedence, conflict, and null cases pass.

### 2. Use it in validation and add the two findings

Replace the reads at `skills.ts:922-925` and `:1063` with the resolver;
emit `skill-version-conflict` as an error and `skill-version-alias` as a
warning; keep bump enforcement semantics unchanged for resolved versions.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts` → existing
pins pass; new cases pass; `pnpm run check:skill-bumps` still passes on the
current tree (all skills are alias-only, so warnings only).

### 3. Accept metadata.version in canonical role resolution

Update `resolve.ts:176` to use the resolver.

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

### 6. Bump and gate

Five-package lockstep bump; the eight AGENTS.md gates in order with captured
exit codes.

## Test plan

- `frontmatter.test.ts`: metadata-only resolves; top-level-only resolves
  with `source: 'top-level'`; both equal resolves without conflict; both
  differ reports the conflict; neither returns null.
- `skills.test.ts`: conflict is an error finding; alias-only is a warning;
  bump enforcement works for a metadata-only skill; semver check runs on
  `metadata.version`.
- `agents/canonical`: metadata-only role identity is valid.
- `scan-tools.test.ts`, `doctor/index.test.ts`: installed-versus-bundled
  comparison with mixed forms.
- Regression proved: spec-conformant skills get version tracking and bump
  enforcement; divergent dual fields are caught rather than silently chosen.

## Done criteria

- [ ] One resolver governs every version read with metadata-first
      precedence.
- [ ] Conflict is an error finding; alias-only is a warning; the current
      tree passes the bump gate with warnings only.
- [ ] Templates emit `metadata.version`; docs describe the order.
- [ ] Two skill bumps, lockstep bump, format, and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- the alias warning would fail the bump gate on the current tree (it must
  stay a warning until the migration item lands);
- the resolver would need a second YAML parser instead of the one validation
  already uses;
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

- Precedence identical in the runtime helper and the validation module.
- Warnings never fail the existing bump gate.
- Templates and docs agree with the resolver.
