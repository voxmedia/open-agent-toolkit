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

## Clarifying Questions

### Priority and collaboration

**User direction:** First converge on a proposed navigation/IA structure. Codex drives; Fable advises. Use bounded reconnaissance and inspect the rendered docs, not just source Markdown.

**Implication:** Preserve peer consensus as a recommendation for user review, not as user approval. Cross-scope judgment stays with the lead agent.

### Workflow stage

**User direction:** We are currently in discovery and brainstorming; scaffold a quick project to retain the evidence.

**Implication:** Discovery remains `in_progress`. The generated plan and implementation files are placeholders, not a runnable plan or an implementation handoff.

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

**User validated:** Not yet. The user approved starting this quick project and retaining discovery, not the proposed IA or its implementation.

## Options Considered

- **Navigation authority:** Derive Fumadocs metadata from Contents (agent recommendation) versus explicitly author framework metadata under a revised contract. No implementation choice approved yet.
- **Skill coverage:** One page per skill versus canonical family guides with per-skill anchors. Agents recommend family guides with enough per-skill detail to distinguish invocation, prerequisites, and outcomes; avoid dozens of duplicated skill specifications.
- **Discovery taxonomy:** Standalone-only versus all supported user-facing skills. Agents recommend universal discovery, organized by task rather than install pack or lifecycle membership.

## Key Decisions

1. **User-approved workflow:** Quick mode; discovery and brainstorming only for now.
2. **User-approved collaboration:** Codex leads, Fable 5.1 advises, and direct peer communication is authorized.
3. **User-approved evidence retention:** Store initial evaluations and proposed IA under project references.
4. **Agent consensus, pending user approval:** Overview Home separate from Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference, and Contributing. See [IA proposal](references/ia-consensus.md).

## Constraints

- Preserve existing information and compatibility routes during moves; do not quietly delete content under a readability claim.
- Keep one canonical owner per guide, with multiple discovery paths rather than duplicated prose.
- Do not infer prerequisites or public support from lifecycle names or pack membership. Current prerequisites are prose, not structured frontmatter.
- Use approved analyze/apply recommendations for the eventual broad docs pass. A navigation capability change is not a docs-only apply action.
- Judge the rendered experience as well as source contracts; retain evidence levels and unresolved classification intent.
- Follow task-class dispatch guidance; user requested Sol 6.1 medium/high and Luna xhigh for bounded recon.

## Success Criteria

Proposed criteria to confirm before planning:

- A newcomer can find installation and first success without learning OAT's internal architecture first.
- Readers can discover a supported named skill or choose a skill for a task without assuming they need an active project.
- Each supported skill resolves to useful canonical guidance, with prerequisites and related variants distinguished.
- Authored order, labels, groups, and cross-section discovery links appear as intended in the rendered site.
- Workflow entrypoints distinguish choosing a mode, executing a project, capturing ideas, planning a backlog, and operating waves.
- Compatibility links continue to resolve, with obsolete migration language removed from primary reader paths.
- Coverage and navigation validation make future drift detectable rather than relying on another periodic reorganization.

## Out of Scope

- Implementing the proposed navigation or rewriting docs during this discovery checkpoint.
- Changing skill runtime behavior or project lifecycle semantics as an incidental docs fix.
- Merging, deploying, or treating the separate Orc skill PR as OAT project completion.

## Deferred Ideas

- Generated skill catalog and navigation metadata: candidate design work after IA approval, not existing capabilities.
- Lightweight design: likely useful for navigation ownership and content coverage contracts; no depth decision requested yet because discovery is still open.

## Open Questions

- Does the user approve the seven-section IA and canonical family-guide approach?
- Should Contents remain the single authored navigation authority through generated Fumadocs metadata, or should the contract change to framework-native metadata?
- Which unshipped/repo-only skills are intentionally internal, and what defines the supported catalog?
- How much new skill-guide authoring belongs in this overhaul versus a separately tracked follow-up?
- What evidence and enforcement should prevent recurrence: catalog coverage, navigation parity, link compatibility, and rendered journey checks?

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

Review the [proposed navigation](references/ia-consensus.md) with the user, then continue discovery on the open choices. Keep [initial evaluations](references/initial-evaluations.md), [skill findings](references/skill-inventory-advisory.md), and the [orchestration log](references/orchestration-log.md) as evidence. Do not mark discovery complete or generate execution tasks until the user is ready to converge.
