---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: false
---

# Discovery: docs-improvement-overhaul

## Initial Request

Improve the documentation's organization, skill coverage, and human reading experience. The user finds the current docs substantially less consumable than their `~/Code/skills` repository despite the recent readability reorganization. Start by having Codex and Fable 5.1 reach consensus on a proposed navigation/IA structure, informed by the archived `docs-readability-reorg` project and the rendered site, before applying a broad sweep.

On 2026-10-01 the user selected quick mode and named this project `docs-improvement-overhaul`, explicitly keeping the work in discovery and brainstorming. Initial evaluations belong in this project's `references/` directory. This is not implementation approval.

Later in the same session, the user authorized continuation through lightweight design and planning until the plan is ready, with Fable reviewing throughout. Resume this project in place; do not start implementation. The [planning reconnaissance](references/planning-recon.md) captures the next technical evidence pass.

The user also explicitly expanded the overhaul to substantially improve the root README and add useful visuals throughout the docs. Inspect SVG/Mermaid precedents in `~/Code/vox/gizmo-slack-app` and selectively other relevant repositories. Treat this as reader-experience work, not incidental decoration.

## Clarifying Questions

### Priority and collaboration

**User direction:** First converge on a proposed navigation/IA structure. Codex drives; Fable advises. Use bounded reconnaissance and inspect the rendered docs, not just source Markdown.

**Implication:** Preserve peer consensus as a recommendation for user review, not as user approval. Cross-scope judgment stays with the lead agent.

### Workflow stage

**User direction:** We are currently in discovery and brainstorming; scaffold a quick project to retain the evidence.

**Later confirmation:** The user authorized lightweight design and plan readiness, chose draft-and-review with Fable, and added README/visual improvements. Discovery remains in progress until the reviewed design resolves the remaining route-compatibility choice. Implementation is still unauthorized.

### Orchestration feedback

**User direction:** Log friction and improve Orc's orchestration skill in a separate worktree/PR. The app runs on the laptop; both collaborating sessions execute on the Mini.

**Implication:** Treat app host, execution host, and answering runtime as distinct. The authorized Orc side task is independent of this project's docs implementation scope.

## Solution Space

This is exploratory: reader needs are clear, but scope, navigation ownership, and the content model still require decisions.

### Approach 1: Reader-first IA with enforceable navigation _(Recommended)_

Make entrypoints match user tasks, expose every supported user-facing skill through one discovery surface, and give each capability one canonical guide. Address the gap between authored navigation intent and the rendered sidebar as a separately scoped prerequisite. Separate content moves from new coverage.

**When appropriate:** The goal is durable discovery and a coherent rendered experience, not merely cleaner Markdown.

**Tradeoff:** Requires navigation/tooling work and governance changes in addition to editorial work. Scope and validation must make those boundaries explicit.

### Approach 2: Editorial repair within the current sections

Improve landing pages, skill descriptions, and links without changing the navigation mechanism or main section structure.

**When appropriate:** Immediate, bounded readability relief matters more than structural change.

**Tradeoff:** Faster and lower migration risk, but preserves poor sidebar ordering and leaves universal discovery largely inside page bodies.

### Approach 3: Framework-native navigation ownership

Adopt the skills repo's manually authored Fumadocs metadata pattern, updating the OAT authoring contract so it no longer implies that Contents alone controls the sidebar.

**When appropriate:** Fast, explicit control of the rendered site is preferred over a portable navigation-authoring contract.

**Tradeoff:** Avoids building a generator first, but introduces separately maintained navigation surfaces unless their responsibilities are carefully redefined.

### Chosen Direction

**Proposed approach:** Approach 1. Codex and Fable agree on the seven-section IA and a separately scoped navigation prerequisite.

**Rationale:** The prior reorganization's adoption lanes remain useful, but independent skill discovery is buried and authored Contents do not drive the rendered sidebar. Repeating a source-only reorganization would not resolve both problems.

**User validated:** The user accepted proceeding with the agreed IA through lightweight design and planning, confirmed draft-and-review with Fable, and explicitly stopped authorization before implementation.

## Options Considered

- **Navigation authority:** Derive Fumadocs metadata from Contents under the agreed design direction, rather than hand-maintain two maps. Implementation remains a later approval.
- **Skill coverage:** One page per skill versus canonical family guides with per-skill anchors. Agents recommend family guides with enough per-skill detail to distinguish invocation, prerequisites, and outcomes; avoid dozens of duplicated skill specifications.
- **Discovery taxonomy:** Standalone-only versus all supported user-facing skills. Agents recommend universal discovery, organized by task rather than install pack or lifecycle membership.

## Key Decisions

1. **User-approved workflow:** Quick mode through lightweight design and plan readiness; no implementation. Draft-and-review with Fable supersedes the saved collaborative design preference.
2. **User-approved collaboration:** Codex leads, Fable 5.1 advises, and direct peer communication is authorized.
3. **User-approved evidence retention:** Store initial evaluations and proposed IA under project references.
4. **Agreed design direction:** Overview Home separate from Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference, and Contributing. See [IA proposal](references/ia-consensus.md) for the original consensus and [design](design.md) for current decisions.
5. **User-approved scope expansion:** Improve the root README and purposeful docs visuals; use Gizmo patterns as inspiration, not copied assets.
6. **Visual QA cadence:** Full independent reviewer computer-use tour after the final implementation phase. Focused implementer browser smoke checks follow navigation and migration. This does not change automated or source-review gates.

## Constraints

- Preserve existing information during moves; do not quietly delete content under a readability claim. Old-route compatibility is a separate user decision, not implicit authorization to build aliases.
- Keep one canonical owner per guide, with multiple discovery paths rather than duplicated prose.
- Do not infer prerequisites or public support from lifecycle names or pack membership. Current prerequisites are prose, not structured frontmatter.
- Use approved analyze/apply recommendations for the eventual broad docs pass. A navigation capability change is not a docs-only apply action.
- Judge the rendered experience as well as source contracts; retain evidence levels and unresolved classification intent.
- Follow task-class dispatch guidance; user requested Sol 6.1 medium/high and Luna xhigh for bounded recon.

## Success Criteria

Criteria for the reviewed design and plan:

- A newcomer can find installation and first success without learning OAT's internal architecture first.
- Readers can discover a supported named skill or choose a skill for a task without assuming they need an active project.
- Each supported skill resolves to useful canonical guidance, with prerequisites and related variants distinguished.
- Authored order, labels, groups, and cross-section discovery links appear as intended in the rendered site.
- Workflow entrypoints distinguish choosing a mode, executing a project, capturing ideas, planning a backlog, and operating waves.
- All repository links resolve to canonical destinations; remove obsolete migration language from primary reader paths. External old-route behavior follows the explicit compatibility decision.
- Coverage and navigation validation make future drift detectable rather than relying on another periodic reorganization.
- The README explains OAT's value, independent adoption choices, and a first success before contributor-oriented setup. It routes readers into the new docs IA without duplicating the docs site.
- Purposeful SVG/Mermaid visuals clarify adoption paths, skill/workflow relationships, and selected system flows. They remain readable in the actual GitHub and Fumadocs renderers, in light/dark themes and narrow layouts, with textual equivalents and accessible descriptions.

## Out of Scope

- Implementing the proposed navigation or rewriting product docs during this design/planning session.
- Changing skill runtime behavior or project lifecycle semantics as an incidental docs fix.
- Merging, deploying, or treating the separate Orc skill PR as OAT project completion.

## Deferred Ideas

- Distribution changes for currently unshipped skills and a machine-readable prerequisites field are separate future decisions.

## Open Questions

- Preserve old routes with static compatibility pages, or explicitly allow moved routes to break?
- Planning setup still needs the project dispatch policy and the independent configured-gate choices; these are not new product-scope questions.
- The five unshipped skills with unknown intent remain excluded as currently unshipped, not labeled permanently internal. Any promotion is outside this pass.

## Assumptions

- The useful pattern to borrow from the skills repo is one canonical capability guide with multiple discovery paths, not its entire product taxonomy.
- Fable's approximately 71 user-facing candidates are provisional; the inferred unshipped classifications include distribution-intent uncertainty.
- The deployed site inspection is evidence of the current reader experience, not proof of parity with this checkout's exact revision.

## Risks

- **Paper-only IA:** Changing Contents without connecting it to Fumadocs leaves sidebar UX unchanged. Verify the actual page tree and browser experience.
- **Catalog drift:** Repeating SKILL.md mechanically in many hand-written guides creates another stale inventory. Generate only fields that really exist; curate applicability and usage prose.
- **Scope expansion:** Navigation machinery, content migration, and new coverage are different workstreams. Scope and validate them separately before implementation.
- **Misleading classifications:** Project entry skills need no active project; review twins span ad-hoc and project contexts. Prefer task/family ownership and per-skill applicability.

## Next Steps

Review `design.md` with Fable, resolve the route choice, then complete discovery through the CLI and author/review `plan.md`. Keep initial evaluations and the orchestration log as evidence. Stop at plan readiness; do not enter implementation.
