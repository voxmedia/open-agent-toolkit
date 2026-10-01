# Initial documentation evaluations

**Date:** 2026-10-01. **Stage:** Preliminary discovery. No full docs-analysis run or local build is represented by this note.

## Prior readability reorganization

Read `.oat/projects/archived/docs-readability-reorg/discovery.md`, `summary.md`, and `references/imported-plan.md` (April 2026). There is no `design.md` in that archived project.

The prior effort intentionally moved toward adoption lanes, a concise overview Home, Quickstart as a path chooser, and shorter README entrypoints linking to fuller guides. It aimed to retire the broad User Guide from primary navigation while preserving information and compatibility routes. It did not authorize indiscriminate deletion or compression.

The current problem is not proven to be a wholesale regression after a completed IA migration. Evidence points to a combination of incomplete retirement of transitional entrypoints, later content/skill growth, and a mismatch between the authored Contents contract and rendered navigation.

## Comparison with the skills repo

Bounded Luna xhigh reconnaissance compared OAT with `/Users/tstang/Code/skills/documentation/docs` and returned source references. Useful patterns:

- Task-oriented “I want to…” entrypoints rather than an initial dump of internal terms.
- Clear explanation of plugin versus standalone consumption.
- A canonical capability guide reachable from multiple relevant catalogs, instead of repeated copies.
- Skill guides that explain a task and how to use the capability, not only a list of names.

Example sources: skills `documentation/docs/index.md:11`, `documentation/docs/user-guide/index.md:12`, `documentation/docs/user-guide/skills/index.md:14`, and `documentation/docs/user-guide/consensus/index.md:23`; OAT `apps/oat-docs/docs/index.md:18`, `apps/oat-docs/docs/workflows/index.md:12`, and `apps/oat-docs/docs/workflows/skills/index.md:10`.

OAT's 83 canonical skill directories versus three local leaf guides in the Skills subtree is a path-count contrast, **not a coverage ratio**: canonical guidance also exists in other sections.

## Rendered site inspection

The lead inspected the deployed site through an Orca embedded browser, including a screenshot and a page snapshot at `https://voxmedia.github.io/open-agent-toolkit/` and `/workflows/skills`. This was the Mini-local browser runtime, not the laptop's collaborating panes; it is still evidence of the deployed docs experience.

Observed sidebar: Home, Quickstart, CLI Utilities, Contributing, Docs Tooling, User Guide, Provider Sync, Reference, and Agentic Workflows. The Skills subtree exposed only Explainer Kit, Recon, and Repo Improve. This does not match a curated user journey or the broader cross-section skills list in the page body.

No screenshot artifact was retained in this project. These are contemporaneous observations; repeat the browser journeys and preserve before/after evidence during the implementation stage. Deployed/local revision parity is unverified.

## Sidebar mechanism and contract mismatch

Root-checked source:

- `apps/oat-docs/lib/source.ts:4` uses the Fumadocs loader over `docs.toFumadocsSource()`.
- No authored Fumadocs `meta.*` files were found under the docs tree during the initial inventory.
- `apps/oat-docs/docs/reference/docs-index-contract.md:40` distinguishes the rendered file/source pipeline from the generated app-root agent manifest. Line 49 explicitly says not to use `oat docs nav sync` as the Fumadocs regeneration step.
- `packages/cli/src/commands/docs/nav/sync.ts:73` constructs `mkdocs.yml`, reads it at line 76, and writes it at line 83. This is a MkDocs operation, not Fumadocs sidebar generation. Calling it here is not correctly described as a no-op.
- `apps/oat-docs/AGENTS.md` nevertheless instructs authors to maintain Contents as authoritative, run nav sync or a framework equivalent, and avoid independent navigation configuration. There is no implemented Contents-to-Fumadocs bridge to fulfill that implication.

Fable additionally ran the installed Fumadocs tree builder in memory, reporting index first, files alphabetically, then folders alphabetically, with labels from frontmatter. Projects put Lifecycle ninth. This is an in-memory probe, not a full site build; its script/output was not delivered as a retained artifact.

Keep two sorts distinct: the agent manifest's documented directories-before-files order is not evidence for the sidebar's files-before-folders order. Cross-section Contents links are ignored by sidebar construction, not deleted from Markdown or necessarily broken in rendered page bodies.

## Coverage and reader experience

The current Skills index mixes task discovery, long name lists, and operational detail. It sits under Agentic Workflows despite many skills being project-free. Root Home still exposes migration/source-of-truth language that is more useful to maintainers than first-time readers.

Fable's inventory and content-gap candidates are retained separately in [skill inventory advisory](skill-inventory-advisory.md). They support a coverage workstream, but require a per-skill owner map and verified applicability before final catalog generation or authoring.

## Implications for the next discovery round

- Agree on reader-facing IA before deciding file moves.
- Resolve navigation authority before assuming a new Contents tree will render correctly.
- Distinguish moves, new user-guide content, generated inventories, and enforcement.
- Run the formal docs-analysis workflow before a broad apply pass, interpreting framework readiness accurately rather than blindly running a MkDocs command against Fumadocs.
