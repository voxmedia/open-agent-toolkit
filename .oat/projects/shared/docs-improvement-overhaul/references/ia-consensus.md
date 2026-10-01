# Navigation and IA consensus proposal

**Status:** Codex/Fable consensus, pending user approval. Discovery, not an implementation plan.

## Proposed primary navigation

Home is a separate overview, not an eighth topic section. It explains what OAT offers and routes readers to a first success or an existing task.

```text
Home — overview and task entrypoints

Getting Started
  Installation and bootstrap
  Quickstart / first success
  Choose capabilities and tool packs
  Essential concepts
Skills
  Find a skill by task
  All supported user-facing skills
  Canonical family guides or links to their owning sections
Workflows
  Choose a workflow — lite, quick, spec-driven, import
  Projects — lifecycle, execution, reviews, PRs, resume and closeout
  Ideas — capture, explore, summarize, promote
  Backlog and planning — local and remote project management
  Waves — coordinated work across projects
  Advanced — dispatch, autonomy, worktrees, execution contracts
Provider Sync
  Portability, setup, provider behavior, troubleshooting
Docs Tooling
  Bootstrap, analyze, apply, authoring, maintenance
Reference
  CLI command map
  Configuration and local state
  Technical contracts
Contributing
  Develop OAT
  Author skills and docs
```

This establishes seven labels and their responsibilities, not final file paths or exhaustive leaf-page order. “Choose a workflow” avoids confusing the workflow-mode chooser with Getting Started.

## Skill discovery and canonical ownership

- Skills discovers **all supported user-facing skills**, including project lifecycle skills. It is not a standalone-only catalog.
- Organize discovery by user task, not by installation pack. Packs ship capabilities; they do not define reader intent.
- Each skill has an addressable anchor in one canonical capability/family guide. Link to that owner from every relevant catalog and workflow entrypoint.
- Write common when-to-use, outcomes, and next-step guidance once per family. Add enough per-skill invocation and prerequisite detail to distinguish variants without copying entire SKILL.md instructions.
- Generate only actual source fields, such as name, description, and declared visibility where available. Prerequisites are currently prose. A “requires active project” indicator needs an explicitly verified per-skill mapping; lifecycle membership is insufficient.
- Exclude genuinely internal helpers from default discovery, but resolve unknown distribution intent before declaring a final supported inventory.

### Ownership exceptions agreed by the agents

| Family or skill                                     | Proposed owner                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Four ad-hoc reviews and four project reviews        | One Review family in the existing project reviews guide; preserve the Project vs ad-hoc distinction |
| `oat-brainstorm`                                    | Skills-owned guide, cross-linked from idea/backlog/project entrypoints                              |
| `oat-explainer-kit`                                 | Existing Explainer Kit family, alongside `explainer-kit`                                            |
| `oat-worktree-bootstrap`                            | Workflows advanced; applicability is project-optional                                               |
| `oat-cursor-cloud-projects`                         | Existing Cursor Cloud guide                                                                         |
| Docs bootstrap/analyze/apply                        | Docs Tooling, discovered through Skills as well                                                     |
| Agent-instructions analyze/apply                    | One capability family, not split by workflow status                                                 |
| Maintainability review → repo improve → import plan | Linked journey across canonical families; not forced into standalone vs lifecycle buckets           |

## Rehome existing sections without deleting content

Retire User Guide from primary navigation while preserving useful content and compatibility routes.

Dissolve CLI Utilities as a primary bucket and rehome its eight leaf topics by intent:

| Existing topic                               | Proposed destination             |
| -------------------------------------------- | -------------------------------- |
| Bootstrap; tool packs                        | Getting Started                  |
| Configuration; config and local state        | Reference                        |
| Workflow gates; project log                  | Workflows                        |
| Backlog lifecycle; remote project management | Workflows → Backlog and planning |

The CLI command reference remains reachable under Reference. “No removal” means preserving information and compatibility, not keeping redundant copies of every paragraph.

## Navigation prerequisite

The current authored Contents graph does not control the rendered Fumadocs sidebar. Index-body links alone cannot deliver the proposed ordering, grouping, or cross-section sidebar discovery.

**Agent recommendation:** Keep Contents authoritative and derive framework metadata deterministically. Scope this as navigation/tooling work with explicit semantics for order, labels, cross-links, groups, and unsupported cases. It may touch CLI/package behavior and authoring guidance; do not disguise it as a docs-only apply pass.

**Alternative:** Revise the authoring contract and hand-author Fumadocs metadata, as the skills repo does. This offers immediate framework control but needs an explicit ownership/parity policy.

No generator, schema extension, separator syntax, or command change is approved here. Decide these after the user accepts the IA direction.

## Proposed reader journeys for validation

1. Install provider sync only, without entering a project workflow.
2. Compare options or research a question without an active OAT project.
3. Choose a workflow mode and start the appropriate project.
4. Find `oat-project-reconcile` by name and understand when it is safe/useful.
5. Bootstrap and maintain a docs app through the docs skill family.
6. Connect remote project management from backlog/planning entrypoints.
7. Follow an old User Guide URL without losing the destination or essential information.

Validate actual rendered navigation and content, not only a source tree or successful build. Navigation changes, content relocation, and new coverage should have distinct evidence and review scopes.
