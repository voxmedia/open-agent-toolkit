---
oat_generated: true
oat_generated_at: {YYYY-MM-DD}
oat_analysis_type: docs
oat_analysis_mode: {full|delta}
oat_docs_target: {docs-target-path}
oat_analysis_commit: {commitHash}
---

# Docs Analysis: {repo-name}

**Date:** {YYYY-MM-DD}
**Mode:** {full|delta}
**Docs Target:** `{docs-target-path}`
**Surface Type:** {mkdocs-app|docs-tree|root-markdown}
**Commit:** {short-hash}

## Summary

- **Files evaluated:** {N}
- **Directories assessed:** {N}
- **Index coverage:** {N}% of docs directories contain `index.md`
- **Findings:** {N} Critical, {N} High, {N} Medium, {N} Low
- **Delta scope:** {N/A or "N files changed since {base-commit}"}
- **Evidence-backed recommendations:** {N}
- **Open questions / ask-user items:** {N}
- **Contradicted claims:** {N}
- **Coverage gaps / content opportunities:** {N}

## Docs Inventory

| # | Type | Path | Status | Notes |
|---|------|------|--------|-------|
| 1 | index | `docs/index.md` | pass | Root index present |
| 2 | page | `docs/getting-started.md` | pass | Linked from root index |
| 3 | directory | `docs/reference/` | issues | Missing `index.md` |
| ... | | | | |

## Findings

### Critical

{Findings that could mislead agents into unsafe or destructive behavior.}

1. **{Title}**
   - File: `{path}:{line}`
   - Issue: {description}
   - Evidence: {exact file refs, config/docs, or representative docs-tree examples}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Target: {path or URL when disclosure is link_only; otherwise "N/A"}
   - Fix: {specific guidance}

None | {numbered list}

### High

{Broken or missing docs structure that blocks reliable discovery or usage.}

1. **{Title}**
   - File: `{path}:{line}`
   - Issue: {description}
   - Evidence: {exact file refs, config/docs, or representative docs-tree examples}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Target: {path or URL when disclosure is link_only; otherwise "N/A"}
   - Fix: {specific guidance}

None | {numbered list}

### Medium

{Contract, navigation, or contributor-guidance issues that materially reduce quality.}

1. **{Title}**
   - File: `{path}:{line}`
   - Issue: {description}
   - Evidence: {exact file refs, config/docs, or representative docs-tree examples}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Target: {path or URL when disclosure is link_only; otherwise "N/A"}
   - Fix: {specific guidance}

None | {numbered list}

### Low

{Polish, wording, and smaller organizational issues.}

1. **{Title}**
   - File: `{path}:{line}`
   - Issue: {description}
   - Evidence: {exact file refs, config/docs, or representative docs-tree examples}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Target: {path or URL when disclosure is link_only; otherwise "N/A"}
   - Fix: {specific guidance}

None | {numbered list}

## Directory Contract Gaps

| # | Directory | Gap | Evidence | Disclosure | Link Target | Severity | Recommended Fix |
|---|-----------|-----|----------|------------|-------------|----------|-----------------|
| 1 | `docs/api/` | Missing `index.md` | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | High | Add `index.md` with `## Contents` |
| 2 | `docs/cli/` | `overview.md` still present | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | Medium | Convert to `index.md` or linked topic page |
| ... | | | | | | | |

{Or: "No directory contract gaps identified."}

## Accuracy Verification

Check only claims that are verifiable from repo sources such as code, config, schemas,
scripts, route definitions, and checked-in setup files. Do not include external URLs or
runtime-only behavior here.

| # | Docs Claim | Docs Ref | Canonical Source Ref | Verdict | Severity | Notes |
|---|------------|----------|----------------------|---------|----------|-------|
| 1 | `{claim text}` | `{docs/path.md:line}` | `{src/path.ts:line}` | {verified \| unverified \| contradicted} | {Critical \| High \| Medium \| Low \| N/A} | {why it was judged this way} |
| 2 | `{claim text}` | `{docs/path.md:line}` | `{config/file:line}` | {verified \| unverified \| contradicted} | {Critical \| High \| Medium \| Low \| N/A} | {source missing, ambiguous, or contradicts docs} |
| ... | | | | | | |

{Or: "No repo-checkable substantive claims required accuracy verification."}

## Content Opportunities

Surface only repo-checkable coverage gaps based on routers, services, models, schemas,
config, and application entrypoints. Do not speculate about roadmap items or external
integrations that are not represented in the repository.

| # | Capability Area | Coverage State | Codebase Evidence | Suggested Docs Location | Severity | Subtopics To Cover |
|---|------------------|----------------|-------------------|-------------------------|----------|--------------------|
| 1 | `{feature or capability area}` | {no coverage \| thin coverage} | `{router/service/model refs and key signatures}` | `{new page / existing page / section}` | {High \| Medium \| Low} | `{specific subtopics implied by the code}` |
| 2 | `{feature or capability area}` | {no coverage \| thin coverage} | `{router/service/model refs and key signatures}` | `{new page / existing page / section}` | {High \| Medium \| Low} | `{specific subtopics implied by the code}` |
| ... | | | | | | |

{Or: "No significant repo-backed content opportunities identified."}

## Navigation and Drift

| # | Surface | Issue | Evidence | Disclosure | Link Target | Severity | Notes |
|---|---------|-------|----------|------------|-------------|----------|-------|
| 1 | `mkdocs.yml` | Nav points to missing page | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | High | `reference/troubleshooting.md` removed |
| 2 | `docs/index.md` | `## Contents` missing subtree mapping | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | Medium | Child directory not described |
| ... | | | | | | | |

{Or: "No navigation or drift issues identified."}

## Progressive Disclosure Decisions

Capture which details should stay inline in docs indexes/contributor pages versus link to
canonical docs/config/examples.

| Topic | Decision | Keep Inline In | Link Target | Evidence |
|-------|----------|----------------|-------------|----------|
| `{topic}` | {inline/link_only/omit/ask_user} | `{index.md / contributing.md / page}` | `{path or URL}` | {exact refs} |
| ... | | | | |

{Or: "No additional progressive disclosure decisions beyond the findings/recommendations below."}

## Recommendations

1. **{Action}** — {rationale}
   - Target: `{path}`
   - Action Type: {create / update / move / scaffold / sync-nav}
   - Evidence: {exact refs}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Targets: {path or URL / N/A}
2. **{Action}** — {rationale}
   - Target: `{path}`
   - Action Type: {create / update / move / scaffold / sync-nav}
   - Evidence: {exact refs}
   - Confidence: {high | medium | low}
   - Disclosure: {inline | link_only | omit | ask_user}
   - Link Targets: {path or URL / N/A}
3. ...

## Apply Contract

- `oat-docs-apply` may only implement recommendations backed by evidence in this artifact.
- Findings based on contradicted claims must be resolved against cited repo sources before `oat-docs-apply` acts on them.
- Content opportunity recommendations require `oat-docs-apply` to read the cited router/service/model files before generating prose; it must not synthesize feature coverage from memory.
- Recommendations marked `omit` must stay out of generated docs changes.
- Recommendations marked `ask_user` require explicit user confirmation before generation.
- Recommendations marked `link_only` must include a canonical link target.
- If cited config/docs/files are missing at apply time, stop and re-run analyze or ask the user rather than inventing a replacement convention.
- When docs guidance already lives in canonical setup/config docs, generated changes should prefer concise links over duplicating the full detail inline.

## Next Step

Run `oat-docs-apply` with this artifact to approve and apply the recommended documentation changes.
