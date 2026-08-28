---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-08-28
oat_generated: false
---

# Discovery: portable-skill-references

## Initial Request

Turn the portable-skill-reference follow-ups from the completed
`user-scope-tool-packs` project into a bounded quick-workflow project. Replace
the remaining repository-relative sibling-skill reads, correct the brainstorm
handoff reference, and strengthen the regression ratchet that prevents the
same portability defect from returning.

Associated backlog item:
`BL-260827-make-packaged-skill-references`.

## Request Classification

**Well-understood.** The completed project review identified the exact
offenders, the repository already contains an installed-scope resolution
contract in `oat-brainstorm`, and the existing bundled-docs contract test is
the natural enforcement point. No new architecture or data-model decision is
required, so this quick project goes straight to plan without a lightweight
design.

## Chosen Direction

Use one consistent installed-scope sibling resolution contract across the
affected skills:

1. derive the sibling skills root from the directory containing the loaded
   `SKILL.md`;
2. otherwise probe user scope before project scope;
3. require the requested sibling `SKILL.md` to exist; and
4. stop with an actionable message when no candidate resolves rather than
   reading a repository-relative path or improvising the downstream process.

Extend the existing ratchet to scan every authored Markdown surface shipped by
user-default packs, recognize unsupported paths independent of Markdown
backticks, and retain only an explicit, reviewable baseline for deliberately
historical examples. Remove baseline entries as executable references are
remediated.

## Key Decisions

1. **One portability contract:** idea, workflow, and brainstorm skills use the
   same loaded-scope-first resolution order already established by
   `oat-brainstorm`.
2. **Executable prose is in scope:** both `SKILL.md` files and operational
   reference files are scanned; repository-internal historical evidence may
   remain only behind an explicit baseline.
3. **No lightweight design:** this is a localized contract and test change,
   not a component-boundary redesign.
4. **Release-shaped delivery:** every changed canonical skill gets one
   PR-scoped version bump, all five public packages advance in lockstep, and
   the bundled public-package version inventory stays synchronized.

## Constraints

- Preserve project-scope installs while making user-scope installs work.
- Do not weaken mandatory skill-loading or dispatch instructions when replacing
  their paths.
- The ratchet must not depend on one Markdown quoting style and must not silently
  exclude authored reference files.
- Do not add new legacy baseline entries for executable paths. Any retained
  historical example must be explicit and justified in the test.
- Skill version bumps are exactly once per changed skill in the final PR diff.
- Fetch `origin/main` before choosing the lockstep public package version; the
  branch version must be strictly greater than the current main version.
- Run `pnpm lint` and `pnpm format` because canonical skills are touched, in
  addition to the complete Definition of Done gate sequence.

## Success Criteria

- `oat-idea-ideate`, `oat-idea-new`, `oat-idea-summarize`,
  `oat-project-implement`, and `oat-project-plan-writing` no longer execute
  chained reads through bare `.agents/skills/...` paths.
- The operational `oat-brainstorm/references/destinations.md` handoff resolves
  sibling skills through the installed scope.
- User-scope and project-scope candidates are both represented in the written
  contract, with a fail-closed missing-sibling outcome.
- The ratchet recursively scans authored Markdown under user-default packaged
  skills, catches quoted, unquoted, `./`, and `../` repo-relative cross-skill
  paths, and reports exact file/target evidence.
- Loaded-scope, user-scope, and project-scope candidates are asserted in strict
  fallback order, and only the exact materialized `references/docs/` subtree is
  excluded from authored-reference scanning.
- Any deliberately retained historical references have an explicit baseline;
  all executable-reference baseline entries are removed.
- Focused portability and bundle tests pass, skill and public-package version
  gates pass, and every repository Definition of Done command passes in the
  documented order.

## Out of Scope

- Changing pack membership, default scope, install/update semantics, or tool
  discovery.
- The separate PJM adoption and scope-diagnostic follow-ups tracked by
  `scope-adoption-diagnostics`.
- Rewriting historical dogfood reports solely to modernize non-executable
  evidence paths.
- Porting residual bare sibling reads in user-default agent surfaces or widening
  the ratchet from sibling `SKILL.md` targets to cross-skill `references/*.md`;
  those surfaces are deferred to the next portability follow-up after merge.
- Publishing packages or opening/merging a PR.

## Risks

- **Prose-only false confidence:** a path may look portable but omit a required
  fallback or missing-skill stop.
  - **Mitigation:** assert the full contract in focused tests and inspect the
    bundled copy, not only the source file.
- **Scanner noise from historical evidence:** recursive scanning may surface
  examples that are not executable instructions.
  - **Mitigation:** use an exact file/target baseline with rationale rather than
    excluding reference directories or weakening the matcher.
- **Version drift from main:** another release may land before implementation.
  - **Mitigation:** fetch `origin/main` immediately before selecting the
    lockstep version and run `release:check-versions` after committing it.

## Open Questions

None block planning. The implementer may choose the smallest test-helper shape
that makes syntax variants independently testable, provided the repository
ratchet still scans the real packaged surfaces.

## References

- Backlog: `.oat/repo/pjm/backlog/archived/BL-260827-make-packaged-skill-references.md`
- Source project residue:
  `.oat/projects/shared/user-scope-tool-packs/implementation.md#known-deferred-work`
- Existing contract test:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
