---
oat_generated: true
oat_generated_at: {YYYY-MM-DD}
oat_analysis_type: agent-instructions
oat_analysis_mode: {full|delta}
oat_analysis_providers: [{providers}]
oat_analysis_commit: {commitHash}
---

# Agent Instructions Analysis: {repo-name}

**Date:** {YYYY-MM-DD}
**Mode:** {full|delta}
**Providers:** {agents_md, claude, cursor, ...}
**Commit:** {short-hash}

## Summary

- **Files evaluated:** {N}
- **Coverage:** {N}% of assessed directories have instruction files
- **Findings:** {N} Critical, {N} High, {N} Medium, {N} Low
- **Delta scope:** {N/A or "N files changed since {base-commit}"}
- **Evidence-backed recommendations:** {N}
- **Open questions / ask-user items:** {N}

## Instruction File Inventory

| # | Provider | Format | Path | Lines | Quality |
|---|----------|--------|------|-------|---------|
| 1 | agents_md | AGENTS.md | `AGENTS.md` | {N} | {pass/issues} |
| 2 | agents_md | AGENTS.md | `packages/cli/AGENTS.md` | {N} | {pass/issues} |
| 3 | claude | CLAUDE.md | `CLAUDE.md` | {N} | {pass/issues} |
| ... | | | | | |

## Findings

### Critical

{Findings that actively mislead agents or miss security non-negotiables.}

None | {numbered list}

1. **{Title}**
   - File: `{path}:{line}`
   - Issue: {description}
   - Evidence: {exact file refs, config/docs, or representative code samples}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Fix: {specific guidance}

### High

{Significant gaps — important directories without coverage, major drift.}

None | {numbered list}

### Medium

{Quality issues — over size budget, duplication, stale commands, cross-format body divergence.}

None | {numbered list}

### Low

{Polish — could be better structured, minor staleness.}

None | {numbered list}

## Coverage Gaps

### Directory Coverage

Directories assessed as needing instruction files but currently uncovered.

| # | Directory | Reason | Evidence | Disclosure | Link Target | Severity |
|---|-----------|--------|----------|------------|-------------|----------|
| 1 | `{path/}` | {Has own package.json / distinct domain / ...} | {exact refs} | {inline/link_only/omit/ask_user} | {path/URL or N/A} | {High/Medium} |
| ... | | | | | | |

{Or: "No directory coverage gaps identified."}

### Glob-Scoped Rule Opportunities

File-type patterns with recurring conventions that would benefit from targeted rules files. These are cross-cutting concerns that span multiple directories — best addressed with glob-scoped rules rather than directory-level AGENTS.md files.

| # | Pattern | Count | Convention Summary | Evidence | Disclosure | Severity |
|---|---------|-------|--------------------|----------|------------|----------|
| 1 | `{glob}` | {N} | {brief description of conventions agents should follow} | {exact refs} | {inline/link_only/omit/ask_user} | {Medium/Low} |
| ... | | | | | | |

{Or: "No glob-scoped rule opportunities identified."}

## Cross-Format Consistency

{For repos with multiple providers: body divergence between glob-scoped rules targeting the same paths.}

| Rule Target | Claude Body Hash | Cursor Body Hash | Copilot Body Hash | Status |
|-------------|-----------------|-----------------|-------------------|--------|
| `{glob}` | {hash/N/A} | {hash/N/A} | {hash/N/A} | {match/diverged} |

{Or: "Single provider — cross-format check not applicable."}

## Progressive Disclosure Decisions

Capture which details should live in always-on instructions versus linked documentation/config.

| Topic | Decision | Keep Inline In | Link Target | Evidence |
|-------|----------|----------------|-------------|----------|
| `{topic}` | {inline/link_only/omit/ask_user} | `{AGENTS.md / scoped file / rule}` | `{path or URL}` | {exact refs} |
| ... | | | | |

{Or: "No additional progressive disclosure decisions beyond the findings/recommendations below."}

## Recommendations

Prioritized actions based on findings above.

1. **{Action}** — {rationale} (addresses finding #{N})
   - Target: `{path}`
   - Provider/Format: {provider / format}
   - Evidence: {exact refs}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Targets: {path/URL or N/A}
2. **{Action}** — {rationale} (addresses gap #{N})
   - Target: `{path}`
   - Provider/Format: {provider / format}
   - Evidence: {exact refs}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Targets: {path/URL or N/A}
3. ...

## Apply Contract

- `oat-agent-instructions-apply` may only implement recommendations backed by evidence in this artifact.
- Recommendations marked `omit` must stay out of generated instructions.
- Recommendations marked `ask_user` require explicit user confirmation before generation.
- If cited config/docs/files are missing at apply time, stop and re-run analyze or ask the user rather than inventing a replacement rule.
- If formatter/linter config already enforces a style rule, generated instructions should prefer commands and links over prose restatement.

## Next Step

Run `oat-agent-instructions-apply` with this artifact to generate or update instruction files.
