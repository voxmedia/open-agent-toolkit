---
id: BL-260908-retire-the-top-level-skill
title: Retire the top-level skill version alias on the recorded schedule
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - versioning
  - spec-conformance
  - migration
assignee: null
created: 2026-09-08T11:15:21.665Z
updated: 2026-09-08T23:45:00.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-tighten-the-skill-version-validators.md
---

## Description

Follow-up to `DR-260908-bundled-skills-declare` and the migration that moved all
82 bundled canonical skills to `metadata.version` (CLI 0.2.65). The top-level
`version:` key remains a supported deprecated alias in
`resolveSkillVersion` (`packages/cli/src/commands/shared/frontmatter.ts`)
because third-party skills installed from packs may still carry it. The decision
record fixes the retirement schedule; this item owns executing it.

Recon on 2026-09-08 found no provider, sync, drift, manifest, or docs surface
that reads the top-level field of a projected copy, so nothing outside OAT is
known to depend on the alias.

Two release-relative steps, in order:

1. **Promote the warning to an error.** In the first release after 0.2.65 that
   changes the validator, change the `skill-version-alias` finding in
   `collectSkillVersionSourceFindings`
   (`packages/cli/src/validation/skills.ts`) from `warning` to `error`. The
   bundled tree is already clean, so this should produce no findings on it; it
   is advance notice for third-party skills.
2. **Remove the top-level read.** One release after that error has produced no
   findings on the bundled tree, delete the alias branch from
   `resolveSkillVersion` so `metadata.version` is the only declaration OAT
   reads, and retire the now-unreachable alias finding.

Agent roles under `.agents/agents` still declare the top-level field and are
outside both enforcement surfaces. Removing the resolver's top-level read would
break their identity resolution, so step 2 must either migrate the agent roles
first or scope the removal to skills. Confirm which before doing the removal.

## Notes

- Final review of `migrate-skill-versions` (2026-09-08, m2): the frontmatter walk exists in five test-helper copies — three pinned byte-identical by `tools/smoke/skill-version/reader-sameness.test.mjs`, plus `readSkillVersionSites` in `tools/smoke/explainer-kit/packaged-layout.test.mjs` and `withDeclaredVersion` in `packages/cli/src/__tests__/skills/skill-version.ts`, which are unpinned. When the top-level read is removed, collapse the copies or extend the sameness pin.
- Exit gate of `migrate-skill-versions` (2026-09-08, Medium, deferred): `check-core.mjs` `keyIdentity` normalizes integer, float, boolean, and null key spellings for duplicate detection but not YAML infinity spellings, so a frontmatter block with both `.inf:` and `.Inf:` (or `-.inf:`/`-.INF:`) is malformed to the canonical parser yet readable to the bundled reader (fail-open for a shape no skill produces). Fix: normalize signed and case-varied `.inf` in `keyIdentity` and add root/nested duplicate-infinity fixtures to `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`; the consumer result must stay `null` whenever the canonical parser marks the block malformed.

## Split (2026-09-08 triage)

This item now covers step 1 only: the `skill-version-alias` warning becomes an error in the first validator-changing release after 0.2.65. Step 2 (removing the top-level read, the agent-role migration, the frontmatter-walk collapse, and the `.inf` key normalization) moved to `BL-260908-remove-the-top-level-skill`.

## Step 1 implemented (2026-09-08)

Step 1 is implemented and rides the wave-7 release; it is not released until
that PR merges and the release ships, so step 2's one-release wait starts from
the release, not from this note. Wave 7 is the first release after 0.2.65 that
changes the validator: PR #273 took the lockstep from 0.2.65 to 0.2.66 without
touching `packages/cli/src/validation/skills.ts`, so the schedule slot was
still open. The bundled tree was verified clean immediately before the
promotion — `oat internal validate-oat-skills` returned 65 skills and zero
findings — so the promotion produces no finding on `.agents/skills`.

This item stays `status: open`: step 2 is owned by
`BL-260908-remove-the-top-level-skill` and lands one release later.

Step 2 gained a dependency here. The same change gave canonical agent roles
under `.agents/agents/*.md` their first enforcement surface: `check:skill-bumps`
now diffs them and requires their version to move. Per
`DR-260908-bundled-skills-declare` they deliberately still declare the
**top-level** `version:`, and the gate accepts that shape rather than demanding
`metadata.version`. Removing the resolver's top-level read would therefore
break the gate this change created, so `BL-260908-remove-the-top-level-skill`
must migrate the agent roles first or scope the removal to skills.

## Acceptance Criteria

- [x] Step 1 has landed: `skill-version-alias` is reported at `error` severity, in
      the first release after 0.2.65 that changes the validator, with a test
      covering the promoted severity. Implemented in the wave-7 lane; the
      release itself is the wave fan-in's to ship.
- [x] Step 1 produced no findings on the bundled tree: `pnpm oat:validate-skills`
      still exits 0 on `.agents/skills`.
- [ ] Step 2 has landed one release after step 1 was quiet: the top-level branch is
      gone from `resolveSkillVersion` and the alias finding is retired.
- [ ] Before step 2, the agent roles under `.agents/agents` are either migrated to
      `metadata.version` or the removal is explicitly scoped to skills, with the
      choice recorded.
- [ ] `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` fixtures are
      updated in the same change as any resolver precedence change, per
      `DR-260908-bundled-skills-declare`. Step 1 changed a finding's severity,
      not `resolveSkillVersion`'s precedence, so the fixtures stayed untouched.
