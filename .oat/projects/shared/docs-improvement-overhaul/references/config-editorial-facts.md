# Configuration guidance conservation facts

Baseline: `bb0f6120d16f89b29a52b8a954917f74beb5e637` in
`docs-overhaul-skill-mapping`. Scope: the eighteen assigned public pages below;
only named false statements are corrected. Existing keys, headings, commands,
examples, capability descriptions, and unrelated paragraphs remain at their
current destinations. New decision guidance is condensed from independently
verified Fable drafts A–F, then checked against this main-integrated source.
Historical intent is not inferred from a code default: recommendations and
unsupported default rationale are labelled explicitly.

## Per-page facts before editing

Paths below are relative to `apps/oat-docs/docs/`. Each destination is the same
page; there are no moves or capability removals.

| Page                                                          | Retained facts / sections                                                                                                                              | Bounded correction or addition                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference/configuration.md`                                  | Five config surfaces; complete key reference; dispatch ladders, candidates, enforcement and legacy compatibility; workflow preferences; sync ownership | Correct `github` provider example to `copilot`; include user config writes; clarify dispatch config overrides project state; warn beside legacy preset/bare-column examples rather than remove them; qualify shared remote storage and binding/purpose configurability. Add scope decision guidance. |
| `reference/config-and-local-state.md`                         | All backlog, decision, local, config, gate, instructions and internal-helper commands, flags and atomic behavior                                       | Decision init is an adoption-gated narrow scaffold, not an unadopted standalone route. Include user config writes. Link to config-scope decisions.                                                                                                                                                   |
| `getting-started/tool-packs.md`                               | Complete eight-pack contents, scope/intent/inventory distinctions, dependencies, seeds, lifecycle and install/update/remove/migrate commands           | Add pack selection/scope recommendations, core user-only exception, init-vs-pack scope independence, additive-install versus migration distinction, PJM adoption/config-wipe warning.                                                                                                                |
| `workflows/choose-workflow.md`                                | Existing routing, supported modes and entry skills                                                                                                     | Add bounded choice table; CLI scaffold default is spec-driven, but choose by clarity/risk rather than task count.                                                                                                                                                                                    |
| `workflows/projects/lifecycle.md`                             | Lifecycle, recap/archive/retirement, implementation modes, review receive, all lane diagrams, artifact progression, capability/adoption boundaries     | Correct workflow preference precedence: no generic workflow env layer. Qualify checkpoint auto-review default as unset/prompt-no, autonomous force-on. Preserve its misplaced paragraph rather than relocate/delete it. Add review/control ownership summary.                                        |
| `workflows/projects/planning/design-modes.md`                 | Collaborative/selective/draft behavior, needs-eyes signals, final recap, quick parity, configuration examples                                          | Add tradeoffs/default resolution and quick selective-to-collaborative caveat.                                                                                                                                                                                                                        |
| `workflows/projects/planning/hill-checkpoints.md`             | State and plan fields, empty-list semantics, lite bypass, first-run question, user preference command                                                  | Add every/specific/final choices, initial versus resumed config behavior, autonomous preservation/final-default distinction.                                                                                                                                                                         |
| `workflows/advanced/dispatch-ceiling.md`                      | All named policies, adoption, config shapes, candidates, provider enforcement, evidence, nested dispatch/report contracts and readable legacy fields   | Correct legacy presets: bare legacy ceilings, not complete named candidate tiers. Add override warning, cost/oversight recommendations and ladder-owner choices without exact price claims.                                                                                                          |
| `workflows/advanced/autonomy.md`                              | Explicit activation, gates, ladder ownership, review contract, learning loop and interactive takeover                                                  | Clarify autonomous final-checkpoint branch ignores configured checkpoint default; preserves existing valid plan fields. Add interactive/noninteractive/autonomous tradeoffs and stop boundaries.                                                                                                     |
| `workflows/advanced/workflow-gates.md`                        | All gate config/overrides, review producer identity, receipts, exec targets, command surfaces, failure/liveness and current limits                     | Qualify introductory same-family avoidance: best effort with recorded fallback, not guaranteed exclusion. Add gate failure/diversity/budget decision guidance without endorsing operational-failure continuation.                                                                                    |
| `workflows/projects/reviews/index.md`                         | Resolver/storage, bookkeeping, review variants, severity, phase gates, artifact loops, narrowing, execution and compatibility                          | Correct extra checkpoint review default to unset/prompt-no; autonomous force-on. Add severity, review separation, scope-narrowing and execution preferences.                                                                                                                                         |
| `provider-sync/config.md`                                     | Full schema and required fields, provider normalization, collection aliases, known strays and recommended management flow                              | Clarify enablement mutation versus direct strategy-file editing. Add true/false/unset and auto/symlink/copy choices, OS fallback and checkout-specific copy-marker caveat.                                                                                                                           |
| `provider-sync/scope-and-surface.md`                          | Canonical/provider locations, principles, all interop/adjacent command surfaces, enforcement/refresh evidence                                          | Add project/user/all scope choices and bare all-scope home-write warning.                                                                                                                                                                                                                            |
| `provider-sync/instruction-sync.md`                           | Full integrity/exclusion semantics, canonical model, all strategies, removal safety, Claude-only adoption, force/manual repair commands                | Add strategy choice/default rationale and copy force caveat; retain complete strategy table.                                                                                                                                                                                                         |
| `provider-sync/commands.md`                                   | All command purposes/options, collection ownership, Codex materialization, status/provider diagnostics and instruction integrity                       | Add visible bare-sync all-scope warning and scoped preview recommendation.                                                                                                                                                                                                                           |
| `provider-sync/manifest-and-drift.md`                         | Manifest locations/ownership, drift states, resolution-time views, strays and Cursor/Copilot migrations                                                | Add adopt/keep/later decisions and clarify Keep eligibility; do not promise that stale copies are detected by status.                                                                                                                                                                                |
| `workflows/backlog-and-planning/remote-project-management.md` | Adoption, every lifecycle operation, policy vocabulary, capability boundary, outbound safety, preview/recovery and offline behavior                    | Correct blanket replace-update approval, owner-based binding locations, local-project rejection and help-as-storage-preview statements. Qualify currently unavailable per-binding restriction setters. Add description/authority/provider/storage choices and exposure warnings.                     |
| `docs-tooling/add-docs-to-a-repo.md`                          | Full bootstrap/direct-CLI setup, Markdown adoption/config contract, gated patches, MkDocs migration, authoring/analyze/apply loop                      | Add Markdown/Fumadocs/MkDocs choice table, verified scaffold default, maintained nav/build distinctions. No scaffold capability is removed.                                                                                                                                                          |

## Source verification for corrections and choices

- Config defaults and three environment aliases:
  `packages/cli/src/config/resolve.ts:114`; permitted write surfaces/defaults:
  `packages/cli/src/commands/config/index.ts:1483` and `:1577`.
- Dispatch config-first resolution:
  `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2551`.
  Legacy preset writes are bare columns:
  `packages/cli/src/commands/config/index.ts:1949`; retain syntax but warn that
  it is not a complete ladder and can replace candidate columns.
- HiLL first-run/autonomous/resume rules:
  `.agents/skills/oat-project-implement/references/plan-and-resume.md:144`,
  `:171`, `:216`. Design precedence and quick parity are skill-owned, not
  general config environment aliases:
  `.agents/skills/oat-project-design/SKILL.md:87` and
  `.agents/skills/oat-project-quick-start/SKILL.md:425`.
- Gate default `same-family`/`high` and required failure policy:
  `packages/cli/src/commands/gate/index.ts:835`; same-family fallback:
  `packages/cli/src/commands/gate/index.ts:1882`.
  Review timeout resolution: `packages/cli/src/commands/gate/index.ts:911`.
  Operational failures must not become accepted review findings; keep the
  implementation/lite safety contract and disclose the weaker planning-skill
  wording as a product issue, not a docs-authorized repair.
- Sync defaults to all:
  `packages/cli/src/commands/shared/scope-option.ts:22`.
  OS symlink fallback: `packages/cli/src/fs/io.ts:112`.
  Absolute copy marker: `packages/cli/src/engine/execute-plan.ts:211`.
  Strategy/enabled config schema: `packages/cli/src/config/sync-config.ts:11`.
- Core is user-only:
  `packages/cli/src/commands/tools/shared/pack-manifest.ts:171`.
  Guided pack selection and per-pack scope:
  `packages/cli/src/commands/init/tools/index.ts:511` and `:629`.
  Installing capability does not adopt PJM:
  `packages/cli/src/commands/pjm/adoption.ts:43`.
- Decision write adoption guard:
  `packages/cli/src/commands/decision/index.ts:103`.
  PJM init replaces the shared `pjm` object (remote config loss):
  `packages/cli/src/commands/pjm/init.ts:224`.
- Remote create replacement approval floor:
  `packages/cli/src/commands/pjm/remote/service.ts:2719`; update-fields
  follows configured authority: `:3088`. Shared storage must use the preview
  command, not config set: `packages/cli/src/commands/config/index.ts:2115`.
  Production store binds every owner through the shared-backlog target:
  `packages/cli/src/commands/pjm/remote/service.ts:6508`. Do not claim the
  unconnected owner-specific locator design is enforced.
- Current main Markdown implementation:
  `packages/cli/src/commands/docs/init/index.ts:172` and
  `packages/cli/src/commands/docs/init/markdown.ts:303`; scaffold hooks:
  `.oat/templates/docs-app-fuma/package.json.template:8`.
  Fumadocs nav projection remains explicit/committed; Markdown keeps authored
  indexes and needs no site build. This is source inspection, not a fresh
  runtime bootstrap or live gate/provider test.

## Non-author handoff

Non-author root accepted this complete eighteen-page pre-edit ledger against
exact baseline `bb0f6120d16f89b29a52b8a954917f74beb5e637` before corrections.
Root checked scope/fact retention and current config-first dispatch,
diversity fallback, PJM init replacement, production remote store, autonomous
HiLL, and Markdown bootstrap source. Independently verified Fable A–F drafts
supply the other choice claims. This acceptance is read-only source inspection,
not new live provider, gate, or bootstrap execution. Condensed final public
prose remains subject to root/Fable non-author verification. No capability
removal is proposed.

## Scoped verification

- File-scoped `pnpm exec oxfmt --write` formatted all eighteen public pages
  and this ledger; exit 0.
- App-scoped `pnpm --dir apps/oat-docs exec markdownlint-cli2` checked all
  eighteen public pages; exit 0. The first root-scope invocation could not
  locate the app-only executable (exit 254); the correct package invocation
  above passed without changing tooling.
- `validateSourceRoutes` checked existing source paths and anchors; exit 0.
  Navigation registration and whole-site build remain root-owned.
- Baseline/current Markdown AST conservation passed: all baseline paragraphs,
  headings, code blocks, and key table rows remain except sixteen explicitly
  ledgered correction blocks. Net public reader-text addition: 2,345 words.
- `git diff --check` passed; exit 0. No tests, live provider/gate execution,
  or fresh framework bootstrap were performed for this prose-only slice.
