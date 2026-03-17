---
oat_generated: true
oat_generated_at: { YYYY-MM-DD }
oat_analysis_type: agent-instructions
oat_analysis_mode: { full|delta }
oat_analysis_providers: [{ providers }]
oat_analysis_commit: { commitHash }
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

## Documentation Inventory

Available documentation surfaces discovered in this repository. Used to populate link targets for `link_only` disclosure decisions and to evaluate Criterion 14 (Available Documentation Is Referenced).

| #   | Type                                   | Path     | Topics/Scope     | Current?            | Notes                                              |
| --- | -------------------------------------- | -------- | ---------------- | ------------------- | -------------------------------------------------- |
| 1   | {docs-app/readme/knowledge/standalone} | `{path}` | {topics covered} | {current/stale/N/A} | {e.g., OAT config root, package-level, thin index} |
| ... |                                        |          |                  |                     |                                                    |

{Or: "No documentation surfaces discovered."}

## Instruction File Inventory

| #   | Provider  | Format    | Path                     | Lines | Quality       |
| --- | --------- | --------- | ------------------------ | ----- | ------------- |
| 1   | agents_md | AGENTS.md | `AGENTS.md`              | {N}   | {pass/issues} |
| 2   | agents_md | AGENTS.md | `packages/cli/AGENTS.md` | {N}   | {pass/issues} |
| 3   | claude    | CLAUDE.md | `CLAUDE.md`              | {N}   | {pass/issues} |
| ... |           |           |                          |       |               |

## Instruction Load Budget

Computed task-load scenarios used to evaluate instruction size in practice.

| Scenario                | Includes                                            | Size  | Assessment              | Notes                                      |
| ----------------------- | --------------------------------------------------- | ----- | ----------------------- | ------------------------------------------ |
| Always-on baseline load | {e.g., root `AGENTS.md` + root compatibility shim}  | {N} B | {healthy / high / over} | {what loads at task start}                 |
| Typical task load       | {root + one realistic scoped file + matching rules} | {N} B | {healthy / high / over} | {most common working set}                  |
| Worst-case task load    | {heaviest realistic scope + matching rules}         | {N} B | {healthy / high / over} | {deepest realistic working set}            |
| Aggregate repo total    | {all instruction files across all formats}          | {N} B | {awareness only}        | {report separately; not the operative cap} |

{Or: "Load budget not computed."}

## Existing Rule Validation

Validation status for already-checked-in glob-scoped rules. Every numeric or named-file claim should be exhaustively verified here before the analysis recommends a correction.

| #   | Rule Path | Target Globs | Validation Status                     | Claim Corrections                     | Evidence     | Severity          |
| --- | --------- | ------------ | ------------------------------------- | ------------------------------------- | ------------ | ----------------- |
| 1   | `{path}`  | `{glob}`     | {verified / needs update / conflicts} | {`old claim -> verified replacement`} | {exact refs} | {High/Medium/Low} |
| ... |           |              |                                       |                                       |              |                   |

{Or: "No existing glob-scoped rules to validate."}

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

## Provider Baseline Gaps

Missing always-on provider compatibility files that should exist even when no corresponding file was discovered during inventory.

| #   | Provider  | Required Path                     | Format             | Reason                                             | Evidence     | Severity      |
| --- | --------- | --------------------------------- | ------------------ | -------------------------------------------------- | ------------ | ------------- |
| 1   | `claude`  | `CLAUDE.md`                       | Claude import shim | {claude active + AGENTS.md present + shim missing} | {exact refs} | {High/Medium} |
| 2   | `copilot` | `.github/copilot-instructions.md` | Copilot shim       | {copilot active + shim missing}                    | {exact refs} | {High/Medium} |
| ... |           |                                   |                    |                                                    |              |               |

{Or: "No provider baseline gaps identified."}

## Coverage Gaps

### Directory Coverage

Directories assessed as needing instruction files but currently uncovered.

| #   | Directory | Reason                                         | Evidence     | Disclosure                       | Link Target       | Severity      |
| --- | --------- | ---------------------------------------------- | ------------ | -------------------------------- | ----------------- | ------------- |
| 1   | `{path/}` | {Has own package.json / distinct domain / ...} | {exact refs} | {inline/link_only/omit/ask_user} | {path/URL or N/A} | {High/Medium} |
| ... |           |                                                |              |                                  |                   |               |

{Or: "No directory coverage gaps identified."}

### Glob-Scoped Rule Opportunities

File-type patterns with recurring conventions that would benefit from targeted rules files. These are cross-cutting structural concerns that often span multiple directories, but they can also be concentrated in one architectural area and still justify glob-scoped rules.

Discovered using the systematic file-type pattern discovery process from `references/file-type-discovery-checklist.md`.

High/Medium opportunities that warrant creating, updating, or splitting a rule should also appear as explicit entries in **Recommendations** below. Do not rely on this table alone as the apply contract.

| #   | Pattern  | Count | Consistency | Competing Sub-Patterns                                        | Convention Summary                                      | Correctness Impact                        | Exception to Project Rule? | Recommended Action                          | Evidence     | Disclosure                       | Severity          |
| --- | -------- | ----- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------- | -------------------------- | ------------------------------------------- | ------------ | -------------------------------- | ----------------- |
| 1   | `{glob}` | {N}   | {N/M files} | {none / `A: 9/18, B: 9/18` / version split / directory split} | {brief description of conventions agents should follow} | {crashes/visual bugs/security/lint/style} | {yes: which rule / no}     | {create rule / update rule / split / watch} | {exact refs} | {inline/link_only/omit/ask_user} | {High/Medium/Low} |
| ... |          |       |             |                                                               |                                                         |                                           |                            |                                             |              |

**Severity calibration:**

- **High:** `40–60%` split with correctness/security impact; OR security-sensitive exception pattern; OR exception to project-wide rule AND code breaks/fails lint; OR >20 files AND correctness impact (crashes, visual bugs)
- **Medium:** `40–60%` split with lint/behavioral differences only; OR >20 files AND lint/CI failures; OR 5–20 files with correctness impact
- **Low:** Style consistency only, no correctness impact

{Or: "No glob-scoped rule opportunities identified."}

## Cross-Format Consistency

{For repos with multiple providers: body divergence between glob-scoped rules targeting the same paths.}

| Rule Target | Claude Body Hash | Cursor Body Hash | Copilot Body Hash | Status           |
| ----------- | ---------------- | ---------------- | ----------------- | ---------------- |
| `{glob}`    | {hash/N/A}       | {hash/N/A}       | {hash/N/A}        | {match/diverged} |

{Or: "Single provider — cross-format check not applicable."}

## Progressive Disclosure Decisions

Capture which details should live in always-on instructions versus linked documentation/config.

| Topic     | Decision                         | Keep Inline In                     | Link Target     | Evidence     |
| --------- | -------------------------------- | ---------------------------------- | --------------- | ------------ |
| `{topic}` | {inline/link_only/omit/ask_user} | `{AGENTS.md / scoped file / rule}` | `{path or URL}` | {exact refs} |
| ...       |                                  |                                    |                 |              |

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
   - Content Guidance: {high-level generation guidance}
   - Must Include: {claims, commands, references, or examples that must survive generation}
   - Must Not Include: {unsupported claims or stale guidance to avoid}
   - Preferred Default for New Files: {pattern A / pattern B / N/A}
   - Claim Corrections: {`old claim -> verified replacement` or `none`}
2. **{Action}** — {rationale} (addresses provider baseline gap #{N})
   - Target: `{path}`
   - Provider/Format: {provider / format}
   - Evidence: {exact refs}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Targets: {path/URL or N/A}
   - Content Guidance: {high-level generation guidance}
   - Must Include: {claims, commands, references, or examples that must survive generation}
   - Must Not Include: {unsupported claims or stale guidance to avoid}
   - Preferred Default for New Files: {pattern A / pattern B / N/A}
   - Claim Corrections: {`old claim -> verified replacement` or `none`}
3. **{Action}** — {rationale} (addresses gap #{N})
   - Target: `{path}`
   - Provider/Format: {provider / format}
   - Evidence: {exact refs}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Targets: {path/URL or N/A}
   - Content Guidance: {high-level generation guidance}
   - Must Include: {claims, commands, references, or examples that must survive generation}
   - Must Not Include: {unsupported claims or stale guidance to avoid}
   - Preferred Default for New Files: {pattern A / pattern B / N/A}
   - Claim Corrections: {`old claim -> verified replacement` or `none`}
4. ...

## Apply Contract

- `oat-agent-instructions-apply` may only implement recommendations backed by evidence in this artifact.
- Recommendations marked `omit` must stay out of generated instructions.
- Recommendations marked `ask_user` require explicit user confirmation before generation.
- If cited config/docs/files are missing at apply time, stop and re-run analyze or ask the user rather than inventing a replacement rule.
- If formatter/linter config already enforces a style rule, generated instructions should prefer commands and links over prose restatement.
- If a recommendation updates or contradicts an existing rule, apply should follow the `Claim Corrections`,
  `Must Include`, `Must Not Include`, and `Preferred Default for New Files` fields rather than improvising.

## Next Step

Run `oat-agent-instructions-apply` with this artifact to generate or update instruction files.
