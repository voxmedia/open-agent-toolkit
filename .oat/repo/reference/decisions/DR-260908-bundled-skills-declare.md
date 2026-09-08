---
id: DR-260908-bundled-skills-declare
title: Bundled skills declare metadata.version only; the top-level alias retires
  on a fixed schedule
date: 2026-09-08
status: accepted
legacy_id: null
---

# Bundled skills declare metadata.version only; the top-level alias retires on a fixed schedule

## Context

The Agent Skills spec places a skill's version under `metadata`. Wave-6 p04
(GitHub issue #258) made `metadata.version` the canonical declaration in
`resolveSkillVersion`, kept the top-level `version:` key as a deprecated alias,
and added a non-blocking `skill-version-alias` warning. Every one of the 82
bundled canonical skills still carried only the alias, so `oat:validate-skills`
printed 82 warnings per run while the shipped authoring templates already
emitted the metadata-only shape that two release-tool readers could not parse.
This project migrated all 82 bundled skills.

Recon on 2026-09-08 enumerated every reader of the top-level field outside the
shared resolver and found no provider, sync, drift, manifest, or docs surface
that reads the top-level field of a projected copy: the provider-view
diagnostic, `oat tools` scan/inventory/doctor, and canonical role resolution all
go through `resolveSkillVersion`. The Claude projection is a symlink to the
canonical tree, and the Cursor codec strips the version property entirely. The
only non-resolver readers were `tools/release/build-explainer-rc.mjs` and the
bundled `oat-explainer-kit/scripts/check-core.mjs`, both fixed in Phase 1.

Agent roles under `.agents/agents` carry the same top-level field but fall
outside both enforcement surfaces: the alias warning walks only
`.agents/skills`, and the bump gate's diff pathspec is
`.agents/skills/*/SKILL.md`. They emit no warning and break no test.

## Decision

Bundled canonical skills declare `metadata.version` only, from CLI 0.2.65. The
top-level `version:` key is removed from every bundled skill and is not
reintroduced.

The alias itself is retired on a fixed, release-relative schedule rather than
immediately, because third-party skills installed from packs may still carry
it:

1. The `skill-version-alias` warning becomes an error in the first release
   after 0.2.65 that changes the validator.
2. The resolver's top-level read is removed one release after that error has
   produced no findings on the bundled tree.

A follow-up backlog item owns both steps. Nothing in this project changes how a
foreign skill resolves today.

Agent roles under `.agents/agents` are deliberately not migrated. They migrate
when their own enforcement surface exists, which is a separate decision.

The release RC builder consumes the CLI's built resolver
(`packages/cli/dist/commands/shared/frontmatter.js`), loaded lazily after the
builder's own `pnpm build`, so no second implementation of the precedence rule
exists there.

ACCEPTED EXCEPTION: the bundled `oat-explainer-kit/scripts/check-core.mjs`
keeps a self-contained version reader. It is installed into user projects by
pack install and can import neither this repository nor `yaml`. The exception is
bound by the parity contract test
`tools/smoke/explainer-kit/check-core-version-parity.test.mjs`, which runs a
shared fixture corpus through both that reader and the canonical resolver and
requires them to agree.

## Consequences

The follow-up backlog item owns both retirement steps, so the schedule is
tracked rather than remembered.

Third-party skills installed from packs keep resolving through the alias until
the top-level read is removed, with the promoted error as advance notice.

Any change to the resolver's precedence must update the parity fixtures in
`tools/smoke/explainer-kit/check-core-version-parity.test.mjs`; the exception
above is only safe while that test keeps the two readers in agreement.

`pnpm oat:validate-skills` now exits 0 with zero alias warnings on the bundled
tree, so a newly introduced alias is visible instead of being lost among 82
standing warnings. The corpus sweeps in
`packages/cli/src/validation/skills.test.ts` assert `source === 'metadata'` and
no column-0 `version:` line for every bundled skill, which is what keeps a
regression from reintroducing the alias silently.

Every bundled skill took one patch bump in this migration, consistent with
`DR-260906-one-version-bump-per-changed`.
