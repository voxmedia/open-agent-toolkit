---
skill: deep-research
schema: comparative
topic: 'EveryInc/compound-engineering-plugin — competitive analysis, adoption recommendations, and OAT plugin-packaging strategy'
model: claude-opus-4-7
generated_at: 2026-04-23
depth: standard
focus: adoption + plugin packaging
---

# Compound Engineering Plugin — Competitive Analysis & OAT Plugin Packaging Strategy

## Executive Summary

EveryInc's [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) is the reference implementation of Every.to's "compound engineering" philosophy — a mature (v3.0.1, ~15.4k stars), multi-harness agent bundle that ships **36 skills, 50 sub-agents, zero hooks, zero MCP servers**, distributed via npm (`@every-env/compound-plugin`) and the Claude Code + Codex + Cursor marketplaces. The product-market-fit signal is strong; the shipped artifact is almost pure skills+agents, and the authored source of truth is translated into Codex, Gemini, Pi, Kiro, and OpenCode via a Bun-based converter CLI.

There is substantial overlap with OAT's skill surface — both codify a brainstorm→plan→implement→review cycle — but the two projects are **complementary, not competitive**. The compound-engineering-plugin optimizes for _a single compounding feedback loop with multi-reviewer fan-out_, while OAT optimizes for _formal project lifecycle management with phase-subagent dispatch and HiLL checkpoints_. Compound is execution-loop-centric; OAT is artifact-and-state-centric.

**Top three adoption recommendations (high-confidence):**

1. **Add a "Compound" step to OAT's project lifecycle.** The plugin's `ce-compound` skill writes structured YAML-frontmatter solutions into `docs/solutions/`, which `ce-learnings-researcher` then reads on every future review. OAT's `oat-project-summary` already produces institutional memory, but it is retrospective, not agent-searchable. Promote summaries into a searchable knowledge surface that the review agents consult. (Gap we already track: see `feedback_oat_skill_conventions.md`.)
2. **Adopt the tiered fan-out code-review pattern with a JSON findings contract.** Compound's `ce-code-review` dispatches 6 always-on + N conditional reviewers in parallel, each returning JSON conforming to a strict schema (severity P0-P3, `autofix_class`, `owner`, `confidence`, `pre_existing`, `evidence[]`). This is measurably better than OAT's current single-reviewer `oat-project-review-provide`. Implement as an opt-in mode behind a config flag.
3. **Ship OAT as a dual Claude Code + Codex plugin.** OAT's existing `.agents/skills/` layout is _already_ Codex's native auto-discovery path. Two thin manifests (`.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`) pointing at the same skill tree is the minimum-viable distribution path, and makes OAT one of the first officially-dual plugins in the ecosystem.

**What to skip:** The named-persona reviewers (`ce-dhh-rails-reviewer`, `ce-kieran-python-reviewer`) embed specific humans' taste and don't generalize. The `/lfg` autopilot skill inverts OAT's "confirm before destructive actions" posture. OAT should not adopt these.

---

## Methodology

Three parallel research angles dispatched as sub-agents:

1. Repo survey of EveryInc/compound-engineering-plugin (gh CLI + raw fetch of manifests, SKILL.md, and agent files)
2. Compound-engineering philosophy (Every.to essays + third-party critiques)
3. Authoritative Claude Code + Codex plugin-packaging formats (docs.claude.com + developers.openai.com)

Plus a local Explore pass on OAT's skill/agent/CLI surface for baseline. All citations link to primary sources.

---

## 1. What is compound-engineering-plugin?

**Shape**: Monorepo containing two Claude Code plugins in a marketplace (`compound-engineering` + `coding-tutor`). Installed via `/plugin marketplace add EveryInc/compound-engineering-plugin` then `/plugin install compound-engineering`. Package is `@every-env/compound-plugin`, v3.0.1, MIT, TypeScript/Bun.

**Manifest** (`plugins/compound-engineering/.claude-plugin/plugin.json`):

```json
{
  "name": "compound-engineering",
  "version": "3.0.1",
  "description": "AI-powered development tools for code review, research, design, and workflow automation.",
  "author": { "name": "Kieran Klaassen", "email": "kieran@every.to" },
  "homepage": "https://every.to/source-code/my-ai-had-already-fixed-the-code-before-i-saw-it",
  "license": "MIT"
}
```

The manifest is _metadata only_ — skills and agents are discovered by directory convention (`skills/ce-*/SKILL.md`, `agents/ce-*.agent.md`). The Codex variant adds `"skills": "./skills/"` and an `"interface"` block (displayName, category, capabilities, defaultPrompt).

**Multi-harness targets** (via `src/targets/*.ts` converter): Claude Code (native), Codex (native + Bun install), Cursor (native), GitHub Copilot, Factory Droid, Qwen Code, Gemini CLI, OpenCode, Pi, Kiro. The converter rewrites authored skills into each harness's consumption format.

**Surface area (36 skills)**:

- **Core loop**: `/ce-ideate`, `/ce-brainstorm`, `/ce-plan`, `/ce-work`, `/ce-code-review`, `/ce-debug`, `/ce-compound`, `/ce-compound-refresh`, `/ce-optimize`, `/lfg`
- **Research**: `/ce-sessions`, `/ce-slack-research`, `/ce-session-extract`, `/ce-session-inventory`
- **Git**: `/ce-pr-description`, `/ce-clean-gone-branches`, `/ce-commit`, `/ce-commit-push-pr`, `/ce-worktree`, `/ce-resolve-pr-feedback`
- **Utilities**: `/ce-demo-reel`, `/ce-report-bug`, `/ce-test-browser`, `/ce-test-xcode`, `/ce-setup`, `/ce-update`, `/ce-release-notes`
- **Frameworks**: `/ce-agent-native-architecture`, `/ce-agent-native-audit`, `/ce-dhh-rails-style`, `/ce-frontend-design`
- **Review/quality**: `/ce-doc-review`, `/ce-proof`
- **Automation**: `/ce-gemini-imagegen`
- **Beta**: `/ce-polish-beta`, `/ce-work-beta`

**Agents (50, all in `agents/ce-*.agent.md`, `model: inherit`)**: 6 always-on code reviewers + ~15 conditional cross-cutting reviewers + ~10 research agents + ~10 persona/stack reviewers + design/workflow specialists. All dispatched by skills, never user-invoked.

**Not shipped**: no hooks, no MCP servers, no native settings.json.

---

## 2. What is "compound engineering" the philosophy?

Term coined by **Kieran Klaassen** (GM of Cora at Every), popularized with **Dan Shipper**. Canonical definition ([every.to/guides/compound-engineering](https://every.to/guides/compound-engineering)):

> "Each unit of engineering work should make subsequent units easier — not harder. Rather than features accumulating complexity, they teach systems new capabilities. Patterns become reusable tools. Bug fixes prevent entire categories of future problems."

**Eight tenets** (verbatim from the guide):

1. Every unit of work makes subsequent work easier.
2. Taste belongs in systems, not in review.
3. Teach the system, don't do the work yourself.
4. Build safety nets, not review processes.
5. Make environments agent-native.
6. Apply compound thinking everywhere.
7. Embrace the discomfort of letting go.
8. Ship more value. Type less code.

**Time heuristics**: 80% plan-and-review / 20% work-and-compound. 50% feature-building / 50% system-improvement.

**Canonical essays**:

- [Compound Engineering: How Every Codes With Agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents) — Shipper & Klaassen
- [The Definitive Guide](https://every.to/source-code/compound-engineering-the-definitive-guide) — Every editorial
- [My AI Had Already Fixed the Code Before I Saw It](https://every.to/source-code/my-ai-had-already-fixed-the-code-before-i-saw-it) — Klaassen (the plugin's `homepage`)
- [Learning from Every's Compound Engineering](https://lethain.com/everyinc-compound-engineering/) — Will Larson (best third-party critique)

**Critiques worth noting**:

- **Low standardization** (Larson): results vary with codebase maturity.
- **Ephemeral moat** (Larson): IDEs will absorb these patterns within months.
- **Context-understanding ceiling** (Augment): compound and spec-driven approaches both top out ~65-68% on standardized tasks because the real bottleneck is contextual understanding, not coordination.
- **System-prompt bloat / discipline cost**: maintaining compound notes is overhead that decays fast without enforcement.

**Adjacent framings**: agentic engineering, spec-driven development (GitHub Spec Kit, Amazon Kiro), agentic swarm, subagent-driven development (Superpowers), Ralph Loop. Compound is distinct in its _post-implementation codification_ step.

---

## 3. Comparison — compound-engineering-plugin vs OAT

### 3.1 Dimensional matrix

| Dimension                      | compound-engineering-plugin                                                                                                     | OAT (current)                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Primary primitive**          | Skills (36) + Agents (50)                                                                                                       | Skills (62) + Agents (4) + CLI (17 subcommands) + Templates                                      |
| **Organizing metaphor**        | Compound loop: Brainstorm → Plan → Work → Review → Compound                                                                     | Project lifecycle: Discovery → Spec → Design → Plan → Implement → Review → Complete              |
| **State surface**              | `docs/{brainstorms,plans,solutions,specs}/` — flat, skill-managed                                                               | `.oat/projects/<scope>/<project>/` with state.md, plan.md, implementation.md, reviews/           |
| **Review model**               | Tiered fan-out: 6 always-on + N conditional reviewers, JSON findings schema, 4 modes (interactive/autofix/report-only/headless) | Single reviewer (`oat-project-review-provide`); lifecycle-scoped; findings as markdown           |
| **Parallelism**                | Parallel reviewer fan-out inside a single skill                                                                                 | Phase-subagent dispatch in separate worktrees (`oat-plan-parallel-groups`)                       |
| **Hooks**                      | None shipped                                                                                                                    | None in `.claude/`; `.oat/config.json` has workflow hooks (HiLL autoreview, archive-on-complete) |
| **MCP**                        | None                                                                                                                            | None bundled                                                                                     |
| **Distribution**               | npm + Claude marketplace + Codex marketplace + Cursor + Bun converter to 6 more harnesses                                       | Not yet distributable; no plugin manifest                                                        |
| **Harness coverage**           | 10+ (Claude, Codex, Cursor, Gemini, Kiro, OpenCode, Pi, Copilot, Factory Droid, Qwen)                                           | Claude Code + Codex config files exist but no plugin manifest                                    |
| **Philosophy**                 | Each unit teaches the system; 80/20 plan-review/work                                                                            | Formal spec-driven or quick-start lifecycle; bookkeeping discipline                              |
| **Versioning**                 | release-please governs manifest+changelog lockstep                                                                              | Manual lockstep across 5 public packages (documented in AGENTS.md)                               |
| **Agent-native discipline**    | High (explicit `ce-agent-native-architecture` + `ce-agent-native-audit` skills)                                                 | Medium (enforced via AGENTS.md + CLAUDE.md conventions)                                          |
| **Blocking question contract** | Explicit per-harness mapping: `AskUserQuestion` / `request_user_input` / `ask_user`                                             | Implicit; assumes Claude Code `AskUserQuestion`                                                  |
| **Post-impl codification**     | `ce-compound` → `docs/solutions/` → searched by `ce-learnings-researcher` on future reviews                                     | `oat-project-summary` (retrospective, not agent-searchable) + `oat-wrap-up` (digest)             |
| **Autopilot**                  | `/lfg` — plan→work→review-autofix→test→DONE with GATE checkpoints                                                               | `oat-project-implement` phase-subagent with bounded fix loops; opt-in HiLL gates                 |

### 3.2 Where OAT is stronger

- **Formal lifecycle + state machine**: OAT's `state.md`/`plan.md`/`implementation.md` triad, HiLL checkpoints, and workflow mode contract (`spec-driven`/`quick`/`imported`) provide stronger cross-session continuity than flat `docs/` files. The plugin doesn't have a "resume this in-flight work" story beyond re-reading markdown.
- **Phase-subagent model with worktree isolation**: OAT's `oat-phase-implementer` dispatches fresh subagents per phase in isolated worktrees. The plugin's `/lfg` runs in-session and cannot parallelize phases across worktrees.
- **Mandatory bookkeeping commit discipline**: OAT separates code commits from state commits, which matters for review/resume. The plugin relies on implicit hygiene.
- **Retroactive workflows**: `oat-project-capture`, `oat-project-reconcile`, `oat-project-promote-spec-driven` have no equivalent in the plugin. OAT handles the messy reality that work often starts outside the workflow.
- **Docs-pack**: `oat-docs-*` (bootstrap, analyze, apply, gap-review) is a full vertical the plugin lacks.
- **Provider sync / drift**: OAT's manifest-based drift detection for external tools has no plugin counterpart.

### 3.3 Where the plugin is stronger

- **Fan-out review with JSON schema**: The signature pattern. 6 always-on + conditional reviewers, strict findings contract, autofix routing. OAT review is comparatively thin.
- **Codification loop closed**: `ce-compound` writes solutions; `ce-learnings-researcher` reads them on future reviews. This is the _actual_ compounding behavior — OAT has the ingredients (`oat-project-summary`) but no consumer closes the loop.
- **Multi-harness distribution at scale**: 10+ targets from a single source via a Bun converter CLI. OAT is effectively Claude-Code-only today.
- **Harness-aware interaction contract**: Plugin skills name the correct blocking-question tool per host with fallback rules. OAT assumes Claude.
- **Shipping discipline**: release-please governs all manifest + changelog updates in lockstep; manual version bumps are forbidden. OAT's lockstep is documented but manual.
- **Persona reviewers**: Named taste-encoders (`ce-dhh-rails-reviewer`). Opinionated and don't generalize, but signal that taste _can_ be encoded — not just rules.
- **Agent-native audit skill**: `/ce-agent-native-audit` periodically evaluates whether a repo is agent-friendly. OAT has `oat-agent-instructions-analyze` but it's narrower (instructions files only, not whole-repo).

### 3.4 Honest contradictions

- Every's 80/20 plan-review/work ratio is aspirational, not measured. Larson notes results are uneven.
- "Taste in systems, not review" is partially contradicted by the persona reviewers — those _are_ taste-in-review, just codified.
- The plugin ships no hooks; Every's own CLAUDE.md practice (per the essays) clearly uses hooks internally. The gap between the philosophy and the distributed plugin is real.

---

## 4. Patterns to Adopt (ranked)

### ADOPT — high confidence

**A1. Compound learnings loop.**
Create an `oat-project-compound` (or extend `oat-project-summary`) that writes a YAML-frontmatter solution file per project into a searchable knowledge surface (e.g., `docs/solutions/` or the existing docs app). Then wire `oat-project-review-provide` (and ad-hoc `oat-review-provide`) to query that surface before reviewing. This closes the compounding loop that OAT has the ingredients for but doesn't currently close.

Effort: Medium. Risk: Low. Reuses existing summary data.

**A2. Tiered fan-out code review with JSON findings contract.**
Port the `ce-code-review` schema (severity P0-P3, `autofix_class: safe_auto|gated_auto|manual|advisory`, `owner`, `confidence`, `pre_existing`, `evidence[]`, `requires_verification`) into `oat-project-review-provide`. Split the single reviewer into 5-6 always-on reviewer agents (correctness, testing, maintainability, standards, agent-native, learnings-researcher) plus conditional reviewers (security, performance, data-migration). Add four modes (interactive/autofix/report-only/headless).

Effort: Medium-High. Risk: Low (opt-in via config flag).

**A3. Harness-aware blocking-question contract.**
Codify an OAT convention that every skill names the correct blocking-question tool per harness (`AskUserQuestion` / `request_user_input` / `ask_user`), with fallback rules and a "numbered-list fallback is a bug" guardrail. The `create-oat-skill` scaffold should emit this block automatically.

Effort: Low. Risk: Low.

**A4. Release-please-governed lockstep.**
Switch OAT's five public packages from manual lockstep to release-please-governed lockstep. The plugin enforces this with `bun run release:validate`; OAT has `pnpm release:validate` already.

Effort: Low-Medium. Risk: Low (infrastructure change, not runtime).

### ADAPT — medium confidence

**B1. Agent-native audit as a recurring skill.**
`ce-agent-native-audit` periodically scores whether the repo is still agent-friendly. OAT already has `oat-repo-maintainability-review`; add a companion `oat-repo-agent-native-audit` that checks AGENTS.md freshness, SKILL.md drift, command discoverability, and hook coverage.

Effort: Medium. Risk: Low. Fits existing `oat-repo-*` family.

**B2. `/lfg`-style autopilot as an opt-in mode, not default.**
Create an opt-in autopilot variant of `oat-project-implement` that chains through review-autofix without HiLL gates, for trusted projects only. Must be off by default. Keep the HiLL-at-default invariant.

Effort: Medium. Risk: Medium — conflicts with OAT's "confirm before destructive actions" default.

**B3. Research agent constellation.**
The plugin has ~10 specialized research agents (web, best-practices, framework-docs, learnings, repo-analyst, slack, session-historian, git-history, issue-intelligence, pattern-recognition). OAT's `skeptical-evaluator` and `oat-codebase-mapper` are the only equivalents. Consider adding 2-3: a `repo-history-analyst` (git blame patterns), an `issue-intelligence-analyst` (GitHub issues scraper), and a `framework-docs-researcher` (via context7 MCP, already present in our tool list).

Effort: Medium. Risk: Low.

### SKIP

**C1. Named persona reviewers** (`ce-dhh-rails-reviewer`, etc.). These encode specific humans' taste. For an open-source toolkit serving arbitrary teams, they're noise — teams should author their own persona reviewers if they want them, which argues for a persona-reviewer _template_ rather than specific personas.

**C2. Full autopilot as default.** See B2 — keep OAT's confirm-before-act posture intact.

**C3. Non-Claude harness skills with host-specific assumptions.** The plugin has skills that assume specific harnesses (Pi-only, Xcode-only). OAT's scope is narrower; don't dilute it.

---

## 5. Plugin Packaging Strategy — OAT as Claude Code + Codex Plugin

### 5.1 Authoritative format summary

**Claude Code** (April 2026, [plugins-reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)):

- Manifest: `.claude-plugin/plugin.json` (optional but required for marketplace install).
- Required: `name`. Optional: `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, plus component paths (`skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`, `monitors`, `outputStyles`, `themes`). Each path replaces the default when set.
- Default auto-discovery: `skills/<name>/SKILL.md`, `commands/*.md`, `agents/*.md`, `hooks/hooks.json`, `.mcp.json`.
- Marketplace: `.claude-plugin/marketplace.json` with `name`, `owner`, `plugins[]`. User invokes `/plugin marketplace add <owner>/<repo>` then `/plugin install <plugin>@<marketplace>`.

**Codex CLI** (April 2026, [Codex Build plugins](https://developers.openai.com/codex/plugins/build)):

- Manifest: `.codex-plugin/plugin.json`. Required: `name`, `version`, `description`.
- Component pointers: `skills` (e.g. `"./skills/"`), `mcpServers` (`./.mcp.json`), `apps` (`./.app.json`), `interface` (displayName, category, capabilities, defaultPrompt, etc.).
- **Gap**: No native `commands/`, no native `agents/`, no native `hooks/`. Subagents are emulated via `AGENTS.md` + `~/.codex/config.toml`.
- **Key bridge**: Codex auto-discovers skills at `$CWD/.agents/skills`, `$REPO_ROOT/.agents/skills`, `$HOME/.agents/skills`, `/etc/codex/skills`. **OAT's canonical `.agents/skills/` path is already Codex-native.**
- Marketplaces: repo at `$REPO_ROOT/.agents/plugins/marketplace.json`, personal at `~/.agents/plugins/marketplace.json`. Install via `/plugins`.

### 5.2 Recommended repo layout

A single repo carries both manifests with zero conflict:

```
open-agent-toolkit/
├── .claude-plugin/
│   ├── plugin.json          # skills: "./.agents/skills", agents: "./.agents/agents",
│   │                        #  commands: "./commands", hooks: "./hooks/hooks.json"
│   └── marketplace.json     # lists oat plugin
├── .codex-plugin/
│   └── plugin.json          # skills: "./.agents/skills", mcpServers: "./.mcp.json"
├── .agents/
│   ├── skills/              # single source of truth (already exists)
│   ├── agents/              # Claude-only (Codex won't load as subagents)
│   └── plugins/
│       └── marketplace.json # Codex marketplace
├── commands/                # Claude-only; maps Claude slash commands → oat skills
├── hooks/hooks.json         # Claude-only
└── .mcp.json                # shared (both hosts consume)
```

### 5.3 Sequencing

1. **Audit SKILL.md frontmatter** for agentskills.io common subset (`name`, `description`, optional `when_to_use`). Claude-only frontmatter (`allowed-tools`, `hooks`, `context: fork`, `user-invocable`) is ignored-not-errored by Codex — keep it additive.
2. **Add `.claude-plugin/plugin.json`** with explicit paths to `.agents/skills/`, `.agents/agents/`, `commands/`, `hooks/hooks.json`. Add `.claude-plugin/marketplace.json`.
3. **Add `.codex-plugin/plugin.json`** with `skills: "./.agents/skills"`. Add `.agents/plugins/marketplace.json` for Codex.
4. **Populate `commands/`** for Claude-only slash-command routing. For parity, also expose skills by their direct names (Codex consumes those as `/<skill-name>`).
5. **Emit versioning hooks**: `pnpm release:validate` must verify both manifests are lockstep; extend release automation to bump both.
6. **Publish** — push to GitHub; users install via `/plugin marketplace add vox-open-agent-toolkit/oat` (Claude) or the Codex equivalent.

### 5.4 Harness portability matrix

| OAT primitive                        | Claude Code    | Codex            | Notes                                            |
| ------------------------------------ | -------------- | ---------------- | ------------------------------------------------ |
| Skill (SKILL.md)                     | ✅ native      | ✅ native        | Keep frontmatter to agentskills.io common subset |
| Agent (`.agents/agents/*.md`)        | ✅ native      | ❌ not supported | Emulate via `AGENTS.md` + config.toml for Codex  |
| Slash command (`commands/*.md`)      | ✅ native      | ❌ (deprecated)  | Expose as skills for Codex                       |
| Hook (`hooks/hooks.json`)            | ✅ native      | ❌ not supported | Claude-only                                      |
| MCP server (`.mcp.json`)             | ✅ native      | ✅ native        | Shared                                           |
| Workflow config (`.oat/config.json`) | ✅ read by CLI | ✅ read by CLI   | OAT CLI is the consumer, not the host            |

### 5.5 Real-world precedents

- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — canonical marketplace
- [anthropics/claude-code/plugins](https://github.com/anthropics/claude-code/tree/main/plugins) — reference implementations
- [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) — cross-ecosystem reference (Claude plugin that delegates to Codex)
- [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) — the most mature dual-manifest example

No fully-official dual-manifest repo exists in the wild yet. OAT would be an early mover.

### 5.6 Gotchas

- Codex `version` is **required** and semver-strict. Claude's is optional.
- Subagents don't port to Codex — plan for OAT's `.agents/agents/*.md` to activate under Claude only. For Codex users, rely on skill-level orchestration (skills calling skills) or emulate via `AGENTS.md`.
- The `oat-project-implement` phase-subagent model won't work under Codex as-is. Options: (a) document Codex as "skill-level execution only, no subagent isolation," (b) fall back to sequential execution in a single Codex session, or (c) invoke OAT's CLI to dispatch Codex subprocesses (the plugin does this with `/ce-work-beta`).
- Hooks don't port. HiLL checkpoints today rely on `.oat/config.json` not on host-level hooks, so this is OK for OAT.
- Distributable permissions: Claude plugins don't ship `settings.json`; users layer permissions locally. Document the expected permission allowlist in the OAT plugin README.

---

## 6. Concrete Next Steps

Ordered by value × confidence. Everything below is proposal, not commitment.

1. **Spin up `oat-project-compound` (or extend `oat-project-summary`) + searchable solutions index.** Delivers A1. Touches `oat-project-summary` skill + `oat-project-review-provide` reader. Est: 1-2 days.
2. **JSON-findings-schema review fan-out (opt-in).** Delivers A2. New fixtures under `.agents/skills/oat-project-review-provide/references/findings-schema.json`, new reviewer sub-agents under `.agents/agents/`. Est: 3-5 days, opt-in flag in `.oat/config.json`.
3. **Dual-plugin manifest pilot.** Delivers §5. Two manifests + two marketplace.json + release validation. Est: 1 day scaffold + 1-2 days release-automation integration.
4. **Harness-aware blocking-question guardrail in `create-oat-skill`.** Delivers A3. Est: half-day.
5. **Release-please lockstep evaluation.** Delivers A4. Est: 1-2 days for config + integration tests. Discuss before adopting — may conflict with current manual-lockstep review culture.
6. **Parking lot**: persona-reviewer template (C1-as-template), agent-native-audit skill (B1), autopilot mode (B2), research-agent constellation (B3).

---

## 7. Risks & Mitigations

| Risk                                                                       | Mitigation                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adoption of fan-out review balloons reviewer-agent count and slows reviews | Opt-in flag; start with 3 always-on reviewers; measure wall-clock before expanding                                                                                              |
| Compound-solutions corpus decays / rots                                    | Mandatory touch-on-reference (like Stoa `memory_touch`); periodic audit via a new `oat-solutions-audit` skill                                                                   |
| Dual-plugin distribution doubles release surface                           | Script the manifest lockstep in `release:validate`; release-please automates the version bumps                                                                                  |
| Codex users hit "subagents don't work here" surprise                       | Document explicitly in the OAT plugin README; implement graceful fallback in `oat-project-implement`                                                                            |
| Compound philosophy becomes aspirational / unmeasured                      | Ship a lightweight metrics skill (`oat-project-compound-metrics`?) that tracks whether solutions are being queried by future reviews; cut the practice if the usage rate is low |
| Persona reviewers leak team-specific taste into upstream OAT               | Ship as template only; require users to author their own; never bundle a specific person's persona                                                                              |

---

## 8. Open Questions

1. **Do we want a "compound" step for every project, or only opt-in?** The plugin makes it a first-class step. OAT could make it the tail of `oat-project-complete`, or gate it behind a scope threshold.
2. **JSON findings schema adoption — incremental or big-bang?** Incremental (one reviewer at a time) is safer but takes longer to see benefits.
3. **Should `oat-agent-instructions-analyze` absorb the `ce-agent-native-audit` scope, or is that a new skill?** Audit scope is broader (structural repo-level signals); analyze scope is narrower (instructions files). Leaning toward separate skill.
4. **Codex subagent emulation — do we invest?** If users will actually run OAT under Codex, yes; if Codex is a secondary harness for discoverability, document the gap and move on.
5. **Marketplace naming**: `oat` vs `open-agent-toolkit` vs `vox-oat`. Worth a brief naming discussion.

---

## 9. Sources & References

### Primary — compound-engineering-plugin

- [Repo root](https://github.com/EveryInc/compound-engineering-plugin)
- [README](https://github.com/EveryInc/compound-engineering-plugin/blob/main/README.md)
- [Plugin manifest](https://github.com/EveryInc/compound-engineering-plugin/blob/main/plugins/compound-engineering/.claude-plugin/plugin.json)
- [Marketplace manifest](https://github.com/EveryInc/compound-engineering-plugin/blob/main/.claude-plugin/marketplace.json)
- [`ce-code-review` findings schema](https://github.com/EveryInc/compound-engineering-plugin/blob/main/plugins/compound-engineering/skills/ce-code-review/references/findings-schema.json)
- [`/lfg` skill](https://github.com/EveryInc/compound-engineering-plugin/blob/main/plugins/compound-engineering/skills/lfg/SKILL.md)
- [AGENTS.md contributor rules](https://github.com/EveryInc/compound-engineering-plugin/blob/main/plugins/compound-engineering/AGENTS.md)
- [Converter targets](https://github.com/EveryInc/compound-engineering-plugin/tree/main/src/targets)

### Primary — compound engineering philosophy

- [Every — Definitive Guide](https://every.to/source-code/compound-engineering-the-definitive-guide)
- [Every — Guides/Compound Engineering](https://every.to/guides/compound-engineering)
- [Shipper & Klaassen — How Every Codes With Agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)
- [Klaassen — My AI Had Already Fixed the Code](https://every.to/source-code/my-ai-had-already-fixed-the-code-before-i-saw-it)
- [Compound Engineering Camp: Every Step From Scratch](https://every.to/source-code/compound-engineering-camp-every-step-from-scratch)
- [Larson — Learning from Every's Compound Engineering](https://lethain.com/everyinc-compound-engineering/)
- [Augment — Agentic Swarm vs Spec-Driven Coding](https://www.augmentcode.com/learn/agentic-swarm-vs-spec-driven-coding)
- [Ralph Loop & Compound Engineering](https://www.vincirufus.com/en/posts/ralph-loop-compound-engineering-future-software-development/)

### Primary — plugin packaging

- [Claude Code — plugins-reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- [Claude Code — plugin-marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Claude Code — skills](https://docs.claude.com/en/docs/claude-code/skills)
- [Claude Code — agent-sdk/plugins](https://docs.claude.com/en/docs/agent-sdk/plugins)
- [Codex — plugins](https://developers.openai.com/codex/plugins)
- [Codex — plugins/build](https://developers.openai.com/codex/plugins/build)
- [Codex — skills](https://developers.openai.com/codex/skills)
- [Codex — agents-md guide](https://developers.openai.com/codex/guides/agents-md)
- [Codex — config reference](https://developers.openai.com/codex/config-reference)

### Real-world examples

- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
- [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)

---

## Appendix A — OAT skill surface snapshot (for diff comparison)

62 canonical skills across: analysis & research (5), skill/workflow creation (3), utility (3), documentation (5), ideas/brainstorming (4), backlog/portfolio (3), project lifecycle scaffold (6), discovery/spec (3), design/planning (4), implementation/review (9), reconciliation/completion (4), repo/knowledge (2), OAT utilities (3), worktree bootstrap (2), ad-hoc review (2), wrap-up/reporting (2).

4 canonical agents: `oat-phase-implementer`, `oat-codebase-mapper`, `oat-reviewer`, `skeptical-evaluator`.

17 CLI subcommands under `oat`.

No plugin manifest in tree today.
