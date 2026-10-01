---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: false
oat_template: false
---

# Discovery: Markdown Docs Bootstrap

## Initial Request

Make plain Markdown documentation an explicit docs bootstrap option, with `documentation.tooling: "markdown"`, while retaining all applicable OAT documentation best practices. Support both new documentation and safe adoption of an existing populated docs directory.

The user selected the quick workflow. This project covers the Markdown portion of `BL-260911-make-docs-bootstrap-a-front` (Make docs bootstrap a front door for existing docs and support the docs-directory convention); it does not complete that broader item.

## Clarifying Questions

### Bootstrap and Config Support

**Q:** Should plain Markdown be a first-class bootstrap and configuration option?
**A:** Yes; bootstrap must offer it and docs config must support tooling as `markdown`.
**Decision:** Give Markdown an explicit supported mode rather than relying solely on existing plain-directory fallback discovery.

### Documentation Quality

**Q:** Should Markdown mode retain OAT documentation practices?
**A:** Yes, including index files and context.
**Decision:** Retain the applicable structure, navigation, content metadata, context, and agent/contributor guidance contracts.

### Project Scope

**Q:** Are package drift detection and tooling approval changes part of this work?
**A:** The user proceeded with quick-start after the recommendation to separate those existing backlog concerns.
**Decision:** Scope this project to Markdown support. Leave package drift and approval policy changes as follow-up work under the broader backlog item.

## Chosen Direction

Extend the existing docs bootstrap/config/docs workflows with a Markdown mode, reusing the established documentation contract and analysis/apply capabilities. Do not introduce a separate documentation engine.

## Key Decisions

1. Plain Markdown is an explicit bootstrap option alongside the existing site frameworks.
2. Use the canonical config key `documentation.tooling` with value `markdown`; default the docs root to `docs` and support a chosen root.
3. Markdown documentation needs no site framework, app package, install step, or site build.
4. Existing documentation is adopted or repaired safely, preserving content and local ownership/audience guidance.
5. Authored context/index pages and generated discovery artifacts have distinct ownership and must not overwrite one another.
6. Analyze/apply retain the same applicable OAT quality and structure requirements in Markdown mode.

## Constraints

- Preserve Fumadocs and MkDocs behavior and existing plain-directory fallback support.
- Follow the existing config contract rather than inventing a separate `docs` configuration namespace.
- Preserve populated directory content; replacement requires an explicit separate choice.
- Keep context entrypoints useful to people and agents, with populated Contents maps and relative Markdown navigation links.
- Preserve the generated-artifact boundary and asset-only directory exemptions.
- Keep changes on the current execution host and worktree.

## Success Criteria

- Bootstrap offers plain Markdown for both fresh setup and an existing docs surface.
- The resulting config records tooling, root, and the appropriate index entrypoint consistently.
- Documentation directories have authored index entrypoints with useful context and Contents maps linking sibling pages and immediate child directories.
- Applicable title/description metadata and authoring guidance are established without fabricating repository-specific content.
- Agent/contributor guidance identifies the docs root, context entrypoints, authoring conventions, and analyze/apply workflow.
- Re-running bootstrap against existing content is safe and does not clobber authored or generated files.
- Config resolution, detection, analyze/apply, and applicable index tooling handle Markdown mode consistently.
- Markdown verification does not require site tooling; existing framework behavior remains intact.

## Out of Scope

- Docs app package-version drift detection or dependency upgrades.
- New explicit-approval classes or changes to unattended approval policy.
- Changes to pntr automation or other repositories.
- A renderer, hosting, preview server, or new docs engine.
- Archiving the broader backlog item before its remaining acceptance criteria ship.

## Deferred Ideas

Package drift and tooling approval work remain in the existing broader backlog record.

## Open Questions

None for quick planning. The lightweight design resolves index ownership, the explicit adoption boundary, and the minimal scaffold.

## Design Decisions Confirmed After Review

- Agent guidance uses the managed repository-root Documentation section and the contributing page; bootstrap does not create docs-root AGENTS.md.
- Markdown detection stays in bootstrap preflight; general oat init is unchanged.
- Markdown adoption requires explicit adopt; existing framework replacement semantics remain intact.
- Generated manifests must stay outside the full configured content tree and cannot overwrite its authored index even with narrowed source flags.
- Markdown bootstrap requires a dedicated docs directory; root-level Markdown analysis remains supported.
- Dry-run reports planned changes and predicted guidance without writes, with explicit partial and no-change outcomes.

## Assumptions

- The existing permissive tooling config, content-root resolution, and plain Markdown analyze/apply paths can be reused.
- Existing content is authoritative; missing structure should produce scoped repair recommendations rather than broad rewrites.

## Risks

- **Content preservation:** The current app scaffolder rejects nonempty targets; a Markdown adoption path must avoid overwriting existing content.
- **Index collision:** Authored root indexes and generated manifests can resolve to the same path unless the mode defines their ownership explicitly.
- **Framework assumptions:** App prompts, package patches, setup commands, guidance, and verification currently assume a rendered docs application.

## References

- [Source backlog item](../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md)
- Current docs bootstrap, analyze/apply, and authoring skills.
- Current CLI docs init, config resolution, docs detection, and index generation implementation.

## Next Steps

The user selected lightweight design, requested a full draft plus independent review, and approved the root dispositions. Those revisions are complete; continue quick-start with executable plan generation.
