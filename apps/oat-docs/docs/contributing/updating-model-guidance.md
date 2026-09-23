---
title: Updating Model Guidance
description: How to verify provider model IDs, update supported dispatch targets and preferred ladders, sync agent views, and validate a model refresh.
---

# Updating Model Guidance

A model refresh crosses several independently owned surfaces. First establish the
provider's exact model ID and effort controls; then update the runtime's supported
targets, the optional preferred dispatch ladder, and the human selection guidance.
A model appearing in a provider's catalog does not by itself establish that a
subagent pin resolves to it. Keep an explicit user's dispatch cells intact unless
they choose to adopt a newer recommendation.

## Source Ownership

| Concern                                | Canonical source                                                                                                                                                        | Effect                                                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex model and effort support         | `packages/cli/src/providers/codex/codec/shared.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.ts`, and `packages/cli/src/providers/ceiling/registry.ts` | The catalogue materializes role variants; candidate validation accepts supported efforts through `ultra`, while the scalar ceiling in `packages/cli/src/config/oat-config.ts` stops at `max`. |
| Claude generation and effort support   | `packages/cli/src/providers/claude/targets.ts` and `packages/cli/src/providers/claude/dispatch-envelope.ts`                                                             | Resolver validates the versioned model and permitted efforts, including the schema for a dispatch envelope.                                                                                   |
| Cursor flat ID to frontmatter selector | `packages/cli/src/providers/cursor/codec/catalog.ts`                                                                                                                    | Approved, evidence-backed mappings can be materialized; flat IDs are not derived from selector syntax.                                                                                        |
| Bundled preferred ladder               | `packages/cli/config/dispatch-matrix-recommendation.json`                                                                                                               | Ordered candidates per provider and tier; it is a preference, not the entire support catalog.                                                                                                 |
| Dispatch advice                        | `.agents/skills/subagent-orchestration/SKILL.md` and `references/provider-{codex,claude,cursor}.md`                                                                     | Agents learn the task-class routes and evidence limits. Increment `metadata.version` when bundled skill content changes.                                                                      |
| Published CLI asset                    | `packages/cli/assets/config/dispatch-matrix-recommendation.json`                                                                                                        | Generated copy of the canonical recommendation; regenerate via the CLI asset build.                                                                                                           |
| Generated project agent views          | `.codex/agents`, `.codex/config.toml`, `.claude/agents`, `.cursor/agents`                                                                                               | Outputs of `oat sync`; never use them as catalog sources.                                                                                                                                     |

A model can remain supported for a user's explicit configuration without being
recommended by the new ladder. For example, this refresh keeps GPT-5.6 Codex
and Cursor targets available while preferring GPT-6 in Codex. Claude Opus 4.8
and 5.0 have left current supported generations and recommendations; historical
probe records can still describe past behavior, clearly labeled as historical.

## Establish Provider Evidence

Check the provider's official model documentation and the local runtime before
editing an ID or effort range. The [OpenAI model catalog](https://developers.openai.com/api/docs/models)
lists GPT-6 Sol and Luna; compare it with the installed Codex runtime model
cache for the exact names and local effort set. The
[Anthropic Opus 5.5 documentation](https://www.anthropic.com/claude-opus-5-5)
names `claude-opus-5-5`; confirm a Claude Code invocation reports that exact
assistant model before admitting it to the Claude catalog. Claude subagent
`model` and `effort` frontmatter select a per-agent route; see the
[Claude Code subagent fields](https://code.claude.com/docs/en/sub-agents).
An API model announcement alone does not prove a third-party harness supports
or resolves that model.

Cursor requires an additional mapping-specific native desktop probe. Follow
[Verifying Cursor Pins](verifying-cursor-pins.md): launch a temporary subagent
in Cursor Agent Chat and compare the `subagentStart.subagent_model` hook value
with the proposed flat ID, using positive and unknown-family/effort controls.
Record the submitted selector, resolved model, time, and evidence path in the
mapping. `agent models` proves catalog visibility only; CLI `agent -p` and
remote runs do not emit the required native subagent hook. During this refresh,
`agent models` listed `claude-opus-5-5-*` flat IDs, but
`agent -p --mode ask --model 'claude-opus-5-5[effort=low]'` returned
`Cannot use this model`; the flat `claude-opus-5-5-high` CLI call
succeeded but reported no resolved model in its JSON result, and the desktop UI
was signed out. The Opus 5.5 Cursor mapping therefore remains deferred. Do not infer one from the spelling of an
existing Opus mapping. Likewise, do not add GPT-6 Cursor targets until that
runtime lists and verifies them. See [Dispatch Policy](../workflows/projects/dispatch-ceiling.md#cursor-evidence-authority)
for the distinction between catalog, configured mapping, and runtime identity.

## Change and Validate

1. Update the supported catalog for each verified runtime and its tests. Preserve
   old model targets that are intentionally still supported; remove retired
   generations from active support and recommendations, while retaining
   historically sourced fixtures when they are explicitly testing history.
2. Update the bundled recommendation's ordered candidate cells and version.
   Check the _last_ candidate in each tier: it determines that tier's pinned
   self-review target. Keep the ladder within its provider's supported catalog.
3. Update the provider selection references and bump the canonical skill
   version once for the PR. Search the repository for the old and new IDs,
   including schemas, fixtures, examples, and generated projections. Replace
   current guidance; do not rewrite clearly marked historical evidence.
4. Build the CLI to regenerate its bundled asset, run project sync, and inspect
   the generated role definitions and configuration diff. Use `oat sync --scope project --dry-run` afterward to verify source/output parity.
5. Run the focused catalog, recommendation, sync, and asset tests, followed by
   the repository gates in `AGENTS.md`: `pnpm check`, `pnpm type-check`,
   `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`,
   `pnpm release:check-versions`, `pnpm release:validate`, and
   `pnpm build:docs`. Fetch `origin/main` before the version check. For
   `.agents/skills` changes also run `pnpm lint` and `pnpm format`.
   Inspect cache replay in Turborepo output; force fresh tests when the
   evidence matters. Record exact failures and distinguish an unavailable
   native provider probe from a successful one.

Changes to shipped skills, generated agents, CLI assets, or docs require the
public packages' lockstep version bump under the repository release policy.
Follow [Contributing Code](code.md) for the current validation and PR workflow.

## Adoption Is Separate

The bundled ladder is a default for missing provider/tier cells. `oat config
adopt dispatch-matrix --shared`, `--local`, or `--user` fills missing cells but
does not replace populated explicit cells, even when its recommendation version
changes. A user who wants the new model ordering must edit those cells or
clear and re-adopt them deliberately. The active project's named ceiling is a
separate policy in its `state.md`; a model update must not silently change it.
See [Dispatch Policy](../workflows/projects/dispatch-ceiling.md#ownership-and-adoption)
for config precedence and examples.
