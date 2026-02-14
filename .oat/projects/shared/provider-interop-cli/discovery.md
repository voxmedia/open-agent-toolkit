---
oat_status: complete
oat_ready_for: oat-spec
oat_blockers: []
oat_last_updated: 2026-02-13
oat_generated: false
---

# Discovery: provider-interop-cli

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Build a CLI tool (`oat`) to enable provider interoperability for agent skills across Claude Code, Cursor, and Codex CLI.

**Core Problem:** Agent skills are currently stored in provider-specific directories (`.claude/`, `.cursor/`, `.codex/`), leading to duplication, drift, and manual sync burden when maintaining skills across multiple AI development tools.

**Proposed Solution:** Create a CLI that:
- Establishes `.agents/` as the canonical source of truth for skills (replacing `.agent/`)
- Generates provider-specific views (symlinks, with copy fallback) automatically
- Detects drift between canonical source and provider directories
- Provides safe sync operations with dry-run by default
- Tracks managed files via manifest to prevent accidental deletions
- Replaces the need for `npx openskills` / `npx skills` by owning sync natively

**Reference:**
- Phase 8 roadmap: `.oat/internal-project-reference/roadmap.md`
- Skills research: `.oat/internal-project-reference/research/skills-reference.md`
- Architecture reference: `.oat/internal-project-reference/research/skills-reference-architecture.md`
- Provider docs: `.oat/internal-project-reference/research/provider-documentation-reference.md`

## Clarifying Questions

### Question 1: Scope & MVP Definition

**Q:** Should v1 include all P0 items from the roadmap, or start smaller? Which P1 items should be promoted?

**A:** Include all P0 and P1 items from Phase 8 roadmap in v1.

**Decision:** V1 is a full-featured provider interop CLI, not a minimal MVP. This includes:
- All CLI commands (init, status, sync, doctor)
- Provider adapters with all sync strategies (auto/symlink/copy)
- Sync manifest for drift safety
- Template sourcing and generated views contract
- Optional git hooks

### Question 2: Canonical Directory

**Q:** Should the CLI use `.agents` (plural) from day one, or support both `.agent`/`.agents` during a transition period?

**A:** `.agents` from day one.

**Decision:** `.agents/` is the canonical directory. Rationale:
- `.agents/skills/` is already recognized by the skills ecosystem (Amp uses it natively, `npx skills` CLI discovers from it)
- Codex reads `.agents/skills/` natively at project level (no symlink needed)
- Less ambiguity with the established `.agents/` convention than the legacy `.agent/`
- The CLI replaces openskills, so openskills' dependency on `.agent/` becomes irrelevant
- Migration of existing `.agent/` content to `.agents/` happens as a follow-up after the CLI is functional

### Question 3: Target Providers (v1)

**Q:** Which providers should v1 support?

**A:** Claude Code, Cursor, and Codex CLI (three providers).

**Decision:** Three providers for v1. Gemini CLI and GitHub Copilot can be added later (the architecture should be extensible). Notably:
- Cursor reads `.claude/skills/` natively (cross-compatibility), so a single Claude symlink covers both Claude Code and Cursor
- Codex reads `.agents/skills/` natively at project level (no symlink needed)
- **Net result for v1:** Only one symlink per skill (`.agents/skills/<name>` → `.claude/skills/<name>`) serves all three providers
- Subagent sync proceeds for all three providers, with Codex agent path support treated as best-effort until Codex agent release/docs stabilize

### Question 4: Sync Strategy

**Q:** Should the tool support both symlink and copy modes?

**A:** Symlink default, copy as fallback.

**Decision:** Symlinks are the primary mechanism. Copy mode exists for environments where symlinks aren't viable (Windows, restricted filesystems). Strategy is configurable per-provider.

### Question 5: Init Behavior

**Q:** What should `oat init` do?

**A:** Bootstrap new structure + adopt existing provider-local skills.

**Decision:** `oat init` should:
- Create `.agents/` directory structure (project-level)
- Create `~/.agents/skills/` and `~/.agents/agents/` structure (user-level, if not already present)
- Detect existing provider-local skills (in `.claude/skills/`, `.codex/skills/`, etc.)
- Offer to adopt provider-local skills into `.agents/` (move to canonical location + create symlinks back)
- NOT handle `.agent/` → `.agents/` migration (that's a separate follow-up task)

### Question 6: Sync Scopes

**Q:** Should v1 handle project-level only, or also user-level (global) skill sync?

**A:** Both project-level and user-level.

**Decision:** Two sync scopes in v1:
- **Project-level:** `.agents/skills/` and `.agents/agents/` → provider project paths
- **User-level:** `~/.agents/skills/` and `~/.agents/agents/` → provider personal paths (`~/.claude/skills/`, `~/.cursor/skills/`, etc.)

`~/.agents/` is the canonical user-level location. Codex reads `~/.agents/skills/` natively (per Codex docs: `$HOME/.agents/skills`), so no symlink needed for user-level Codex skills. The CLI syncs from `~/.agents/` to other providers' personal paths.

### Question 7: CLI Name

**Q:** What is the CLI command name?

**A:** `oat`

### Question 8: Runtime

**Q:** What language/runtime for the CLI?

**A:** TypeScript + Node.js. Consistent with the existing codebase; distributed as npm package.

### Question 9: Sync Scope

**Q:** Should sync handle rules/instructions mapping too, or just skills/agents?

**A:** Skills and agents only. Provider-specific instruction files (CLAUDE.md, .cursorrules, GEMINI.md) are out of scope — those are inherently provider-specific.

## Options Considered

### Option A: Replace openskills with native OAT sync

**Description:** Build sync management directly into the `oat` CLI. The CLI owns the entire lifecycle: init, status, sync, doctor. No dependency on third-party skill package managers.

**Pros:**
- Full control over sync behavior, manifest format, and drift detection
- Single tool for the entire OAT workflow (skills + workflow + sync)
- Can handle `.agents/` as canonical with provider-aware symlink strategy
- Eliminates external dependency (openskills / `npx skills`)

**Cons:**
- More development work than wrapping an existing tool
- Need to maintain provider adapter logic ourselves

### Option B: Wrap/extend `npx skills` CLI

**Description:** Use Vercel's `npx skills` CLI as the sync backend, wrapping it with OAT-specific commands and manifest tracking.

**Pros:**
- Less sync logic to implement
- Leverages maintained ecosystem tooling

**Cons:**
- External dependency on Vercel's CLI
- Less control over behavior, especially for drift detection and manifest management
- `npx skills` doesn't understand `.agents/` as canonical source (it treats each agent directory independently)

**Chosen:** Option A

**Summary:** Native OAT sync gives us full control over the canonical `.agents/` → provider symlink model, manifest-based drift safety, and tight integration with the existing OAT workflow. The sync logic is well-understood (research has mapped exact provider paths and requirements).

## Key Decisions

1. **Canonical directory is `.agents/`:** Not `.agent/`. Aligns with ecosystem conventions (Amp, Codex, `npx skills` discovery). Migration of existing `.agent/` content is a follow-up task.
2. **Tool replaces openskills:** The `oat` CLI owns sync natively. No dependency on `npx openskills` or `npx skills`.
3. **Symlink-first strategy:** Symlinks from provider directories → `.agents/` canonical source. Copy mode as fallback only.
4. **Minimal symlinks needed (project-level):** For v1's three providers, only `.claude/skills/` needs symlinks. Cursor reads `.claude/skills/` natively; Codex reads `.agents/skills/` natively.
5. **Skills + agents, not rules:** Sync covers skills and agent definitions. Provider-specific instruction files are out of scope.
6. **Dry-run by default:** `oat sync` shows what would change; explicit `--apply` flag to execute.
7. **Manifest tracks managed files:** Destructive operations (deletes, prune) only apply to files the manifest tracks, preventing accidental deletion of user content.
8. **Two sync scopes:** Both project-level (`.agents/`) and user-level (`~/.agents/`) as canonical sources, synced to their respective provider paths. Codex reads `~/.agents/skills/` natively at user level too.
9. **Subagents synced as-is with Codex caveat:** No frontmatter translation. Canonical in `.agents/agents/`, synced to provider dirs. Provider-specific fields only work in their native provider. Codex subagent sync is best-effort while Codex agent support remains experimental/release-pending.
10. **Manifest in `.oat/`:** `.oat/sync/manifest.json` keeps tool state separate from skill content.
11. **Interactive stray adoption:** `oat status` prompts to adopt untracked provider-local skills interactively.
12. **Pre-commit drift warning:** Optional git hook warns on drift but doesn't block commits.

## Constraints

- Must work on macOS and Linux (Windows copy-mode fallback is nice-to-have, not required for v1)
- Must not break existing workflow skills during development (`.agent/` stays functional until explicit migration)
- Sync operations must be safe by default (dry-run, manifest-scoped deletes)
- Provider adapter behavior must match documented provider paths from research (see skills-reference.md Q&A section)
- Skills must follow the Agent Skills open standard (SKILL.md frontmatter + directory structure)

## Success Criteria

- `oat init` can bootstrap a repo with `.agents/` structure and user-level `~/.agents/`, and detect/adopt existing provider-local skills
- `oat status` shows which providers are detected, what's in sync vs. drifted vs. stray — for both project and user scopes
- `oat sync` creates correct symlinks at both scopes: project-level (`.claude/skills/` → `.agents/skills/`, Codex native) and user-level (`~/.claude/skills/` etc. → `~/.agents/skills/`, Codex native)
- `oat sync` handles subagents at project scope for Claude/Cursor and attempts Codex; if Codex subagent support is unavailable in the installed Codex version, the CLI reports a non-blocking warning and continues
- `oat doctor` validates the environment and provides actionable fix steps
- Can successfully sync skills between all three v1 providers without manual file management
- Manifest tracks all managed mappings; no untracked deletions
- Drift detection identifies when a provider-local copy has diverged from canonical source

## Out of Scope

- **Gemini CLI and GitHub Copilot providers** — extensible architecture allows adding later, but v1 targets Claude Code, Cursor, Codex only
- **Rules/instructions sync** — CLAUDE.md, .cursorrules, GEMINI.md are inherently provider-specific
- **`.agent/` → `.agents/` migration** — follow-up task after CLI is functional
- **User-level subagent sync** — user-level agent definitions are more provider-specific; defer until subagent standards stabilize
- **Subagent frontmatter translation** — subagent schemas differ across providers; v1 syncs files as-is without transforming frontmatter
- **CI/CD integration** — automated sync in pipelines is a future enhancement
- **Skill publishing / registry** — no npm/GitHub-based skill distribution in v1

## Deferred Ideas

- **Frontmatter translation for subagents** — When a cross-tool subagent standard emerges, add translation between provider schemas. Currently premature.
- **User-level subagent management** — Personal subagent definitions across providers need different sync mechanics due to differing frontmatter schemas.
- **Branch-aware sync** — Different branches having different skill sets (ties into Phase 9 multi-project model). Defer.
- **Skill testing framework** — Automated smoke tests for skill discovery/invocation across providers. No standard exists yet.
- **`.agents/docs/` sync** — Shared agent-operational reference docs don't need provider-specific distribution currently.

## Resolved Open Questions

### Subagent sync strategy
**Q:** Should v1 sync subagent definitions across providers given no cross-tool standard?

**A:** Sync files as-is. Canonical subagent definitions live in `.agents/agents/` and are symlinked/copied to provider directories (`.claude/agents/`, `.cursor/agents/`, `.codex/agents/`). No frontmatter translation — unknown keys are generally ignored by providers. Users accept that provider-specific frontmatter (e.g., Claude's `skills` field, Cursor's `readonly`) only works in the native provider.

Codex caveat: Codex subagent support is experimental/release-pending, so `.codex/agents/` sync is best-effort. If unavailable, `oat sync/status/doctor` should surface a clear warning and continue syncing supported providers.

### Manifest storage location
**Q:** Where does the sync manifest live?

**A:** `.oat/sync/manifest.json` (project-level), `~/.oat/sync/manifest.json` (user-level). Rationale: the manifest is OAT tool state, not skill content. Keeping `.agents/` free of tool-specific metadata means it stays clean for non-OAT consumers (e.g., `npx skills`, manual workflows).

### Stray detection UX
**Q:** How should `oat status` handle provider-local skills not tracked in `.agents/`?

**A:** Interactive prompt. When strays are detected, `oat status` lists them and offers to adopt each one interactively (move to `.agents/` canonical location + create symlink back). Users can skip individual strays or skip all.

### Git hooks scope
**Q:** What do optional git hooks do?

**A:** Pre-commit: warn on drift. The hook checks whether provider directories are in sync with `.agents/` canonical source and warns (but does not block) if drift is detected. Post-checkout sync and other hook behaviors deferred to v2.

## Assumptions

- Provider skill paths documented in research are current and accurate (Claude: `.claude/skills/`, Cursor reads `.claude/skills/` cross-compat, Codex scans `.agents/skills/` from CWD up to repo root plus user/admin/system locations)
- Symlinks work reliably on macOS and Linux for the target use case (directory symlinks for skill folders)
- Users are comfortable with a single canonical source model (no "I want to author directly in `.claude/skills/`" workflow — that's adoption/stray detection territory)
- The Agent Skills open standard will remain stable (frontmatter schema, directory structure)

## Risks

- **Provider path changes:** A provider updates their skill discovery paths, breaking our adapter logic.
  - **Likelihood:** Low (paths have been stable; standard is adopted)
  - **Impact:** Medium (sync breaks for that provider until adapter is updated)
  - **Mitigation Ideas:** Config-driven adapter paths (not hardcoded); `oat doctor` validates paths at runtime

- **Symlink compatibility edge cases:** Some git workflows (sparse checkout, worktrees) may not handle symlinks well.
  - **Likelihood:** Medium
  - **Impact:** Low (copy fallback exists)
  - **Mitigation Ideas:** `oat doctor` detects symlink issues; copy mode as explicit fallback

- **Subagent standard emerges mid-development:** A cross-tool subagent spec could change our sync model.
  - **Likelihood:** Low (no standard in sight as of Feb 2026)
  - **Impact:** Low (we can adapt; v1 syncs files as-is)
  - **Mitigation Ideas:** Keep subagent sync simple and extensible

- **Codex subagent support availability:** Codex agent support may be unavailable or partially documented in the installed release.
  - **Likelihood:** Medium
  - **Impact:** Medium (Codex subagent projection may be skipped while skills sync still works)
  - **Mitigation Ideas:** Capability detection in `oat doctor`; non-blocking warnings in `oat status/sync`; continue syncing Claude/Cursor subagents

## Next Steps

Ready for `/oat:spec` to create formal specification.
