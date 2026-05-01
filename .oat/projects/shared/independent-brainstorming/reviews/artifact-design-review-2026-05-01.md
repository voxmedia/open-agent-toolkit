---
oat_generated: true
oat_generated_at: 2026-05-01
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/independent-brainstorming
---

# Artifact Review: design

**Reviewed:** 2026-05-01
**Scope:** Design artifact for quick-mode project `independent-brainstorming`
**Files reviewed:** 2
**Commits:** n/a

## Summary

The design is broadly aligned with discovery: it chooses a dedicated `oat-brainstorm` skill, a dedicated `brainstorm` pack, canonical `tools.<pack>` pack detection, always-available inline/doc-to-path outcomes, and pack-gated downstream handoffs. It is detailed enough to plan, but one acceptance-critical default-scope behavior is underspecified against the current installer, and the active-project fold-back commit flow needs a tighter dirty-tree contract before implementation.

Artifacts used:

- `.oat/projects/shared/independent-brainstorming/discovery.md`
- `.oat/projects/shared/independent-brainstorming/design.md`

## Findings

### Critical

None.

### Important

1. **Default user-scope behavior for the new pack is not designed against the current installer defaults.**

   Discovery requires the brainstorming entry point to be broadly available and records `brainstorm` as user-eligible with default user scope so the always-on trigger works across directories (`discovery.md:66`, `discovery.md:72`, `design.md:15`, `design.md:276`). The design lists adding `brainstorm` to pack unions, picker descriptions, and default-on setup (`design.md:278`), but it does not specify the installer change that makes a newly installed user-eligible pack default to user scope. Current installer behavior only prechecks user scope when a user-eligible pack is already installed in user/both scope (`packages/cli/src/commands/init/tools/index.ts:357`), and non-interactive eligible-pack installs default to project scope (`packages/cli/src/commands/init/tools/index.ts:462`). If implementation follows the existing generic path, `brainstorm` can become default-on but project-scoped, breaking the main always-on availability rationale.

   **Fix guidance:** Add an explicit design task for `brainstorm` default-scope behavior: either special-case `brainstorm` in user-scope choice defaults and non-interactive scope resolution, or introduce pack metadata with `defaultScope: 'user'` and drive both picker and non-interactive behavior from that metadata. Include tests for fresh install, existing project install migration, and non-interactive/default setup.

### Medium

1. **The active-project fold-back commit path lacks a dirty-tree and staging contract.**

   The design requires fold-back to append to `design.md` or `discovery.md` and commit immediately, with the commit hash referenced in the handoff prompt (`design.md:148`, `design.md:149`, `design.md:150`, `design.md:264`). It does not define the preflight behavior when the chosen artifact is already modified, nor does it state that the commit must stage only the selected upstream artifact. Since this skill can run during active project work, an implementation could either accidentally include unrelated edits or fail late after mutating the artifact.

   **Fix guidance:** Specify that fold-back must check the selected artifact's git status before mutation, append only after a clean-or-user-confirmed baseline, stage only the selected artifact, and abort with a clear message if unrelated changes make an atomic artifact commit impossible. The handoff prompt should only be printed after that exact-scoped commit succeeds.

### Minor

1. **Dogfood scenario count is inconsistent.**

   The testing section says "all eight terminal states are covered" but lists ten numbered scenarios (`design.md:539`, `design.md:541`, `design.md:543`). This is easy to fix, but leaving it inconsistent will make the plan ambiguous about whether active-project fold-back and active-project reference file are terminal states or subroutes under the active-project destination.

   **Fix guidance:** Either say "ten dogfood scenarios covering eight destination families plus active-project subroutes" or renumber/group the active-project cases under one destination family.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                            | Status  | Notes                                                                                                                                   |
| ------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dedicated brainstorming entry point                    | aligned | Design chooses `oat-brainstorm` and keeps it separate from idea/project lifecycle skills.                                               |
| Always-on activation                                   | partial | Skill frontmatter and user-scope rationale are present, but default user-scope installer behavior needs the Important finding resolved. |
| Pack-aware terminal states                             | aligned | Design uses canonical `oat config get tools.<pack>` checks and a destinations playbook.                                                 |
| Always-available inline/doc-to-path outcomes           | aligned | Both base outcomes are explicitly modeled and do not require another pack.                                                              |
| External/off-repo destinations                         | aligned | Path validation and out-of-repo confirmation are covered.                                                                               |
| Distinguish brainstorming from formal discovery/design | aligned | The dispatcher hands off rather than replacing idea/project lifecycle skills.                                                           |
| Project-level and user-level brainstorming             | partial | User/project destination behavior is described, but active-project fold-back needs a stronger commit-safety contract.                   |
| Dogfood every available terminal state                 | partial | Coverage intent is present; count/list inconsistency should be cleaned up before planning.                                              |

### Extra Work (not in requirements)

None requiring removal. The visual companion is larger than the backlog's minimum, but it is explicitly framed as a port of the referenced Superpowers brainstorming capability and scoped through attribution, path, and bundle decisions.

## Verification Commands

Review fixes should be verified by re-running:

```bash
oat-project-review-provide artifact design
```

Implementation planning that follows this design should include targeted tests around:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into design revision tasks.
