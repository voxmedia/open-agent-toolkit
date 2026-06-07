---
oat_generated: true
oat_generated_at: { YYYY-MM-DD }
oat_analysis_type: docs
oat_analysis_mode: { full|delta }
oat_docs_target: { docs-target-path }
oat_analysis_commit: { commitHash }
---

# Docs Analysis: {repo-name}

**Date:** {YYYY-MM-DD}
**Mode:** {full|delta}
**Docs Target:** `{docs-target-path}`
**Surface Type:** {mkdocs-app|oat-fumadocs-app|docs-tree|root-markdown}
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
- **Generated index findings:** {N}
- **Broken or extensionless local docs links:** {N}
- **Markdown hygiene findings:** {N}
- **Local guidance gaps:** {N}
- **Owner-review gaps:** {N}

## Docs Inventory

| #   | Type      | Path                      | Status | Notes                  |
| --- | --------- | ------------------------- | ------ | ---------------------- |
| 1   | index     | `docs/index.md`           | pass   | Root index present     |
| 2   | page      | `docs/getting-started.md` | pass   | Linked from root index |
| 3   | directory | `docs/reference/`         | issues | Missing `index.md`     |
| ... |           |                           |        |                        |

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

| #   | Directory   | Gap                         | Evidence     | Disclosure                       | Link Target         | Severity | Recommended Fix                            |
| --- | ----------- | --------------------------- | ------------ | -------------------------------- | ------------------- | -------- | ------------------------------------------ |
| 1   | `docs/api/` | Missing `index.md`          | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | High     | Add `index.md` with `## Contents`          |
| 2   | `docs/cli/` | `overview.md` still present | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | Medium   | Convert to `index.md` or linked topic page |
| ... |             |                             |              |                                  |                     |          |                                            |

{Or: "No directory contract gaps identified."}

## Generated Index and Local Map Findings

Use this section for OAT/Fumadocs docs apps or any docs surface with generated
root indexes, generated manifests, `meta.json`, or comparable derived navigation
files. Treat authored `docs/**/index.md` `## Contents` maps as source unless
local configuration or guidance proves a different source of truth.

| #   | Classification                   | Generated Artifact       | Authored Source Evidence        | Issue                         | Severity | Recommended Fix                         |
| --- | -------------------------------- | ------------------------ | ------------------------------- | ----------------------------- | -------- | --------------------------------------- |
| 1   | {missing output}                 | `{index.md or manifest}` | `{config/script/guidance refs}` | Generated output is absent    | Medium   | Run or document the generation workflow |
| 2   | {ignored/local output}           | `{index.md or manifest}` | `{gitignore/config refs}`       | Local generated file is stale | Medium   | Regenerate locally or clarify lifecycle |
| 3   | {stale output}                   | `{index.md or manifest}` | `{docs/**/index.md refs}`       | Deleted path still appears    | High     | Regenerate derived output               |
| 4   | {authored-source contract drift} | `{index.md or manifest}` | `{parent index.md refs}`        | Source map omits child docs   | Medium   | Fix authored `## Contents` map          |
| 5   | {unclear generator semantics}    | `{index.md or manifest}` | `{generator/config refs}`       | Ordering or inclusion unclear | Low      | Document or investigate semantics       |

{Or: "No generated index or local-map findings identified."}

For every generated-index finding:

- Cite exact generated artifact paths and authored source-map paths.
- Distinguish missing entries, stale entries, ordering drift, unreachable
  generated entries, and unclear generator behavior.
- State whether generated warning banners are present, absent, or not expected.
- Do not recommend hand-editing generated artifacts; recommend source-map fixes,
  regeneration, local guidance updates, or generator investigation.

## Authored Links, Contents, and Markdown Hygiene

Use this section for local Markdown links, `## Contents` quality, page-extension
conventions, and Markdown syntax issues that affect rendering, navigation, or
search quality.

| #   | Category                   | File Ref          | Issue                                           | Evidence                             | Severity | Recommended Fix                         |
| --- | -------------------------- | ----------------- | ----------------------------------------------- | ------------------------------------ | -------- | --------------------------------------- |
| 1   | {broken local link}        | `{docs/path.md}`  | Target does not exist                           | `{source line and target path}`      | High     | Update or remove the link               |
| 2   | {extensionless local link} | `{docs/path.md}`  | Link omits `.md` suffix                         | `{source line}`                      | Medium   | Use `.md` or `subdir/index.md`          |
| 3   | {placeholder Contents}     | `{docs/index.md}` | `## Contents` is scaffold                       | `{source line}`                      | Medium   | Replace with useful local map           |
| 4   | {overview.md}              | `{docs/topic/}`   | Legacy entrypoint remains                       | `{overview.md refs}`                 | Medium   | Convert to `index.md` or topic page     |
| 5   | {unexpected mdx}           | `{docs/page.mdx}` | Plain content uses `.mdx`                       | `{page and local guidance}`          | Medium   | Convert to `.md` or document exception  |
| 6   | {unlabeled code fence}     | `{docs/path.md}`  | Code fence has no language                      | `{source line}`                      | Low      | Add a language identifier               |
| 7   | {shell fence drift}        | `{docs/path.md}`  | Shell fence convention drifts                   | `{source line and guidance}`         | Low      | Use the documented shell fence language |
| 8   | {heading hygiene}          | `{docs/path.md}`  | Empty heading or extra H1                       | `{source line}`                      | Low      | Fix heading hierarchy                   |
| 9   | {metadata hygiene}         | `{docs/path.md}`  | Description too long, truncated, or README-like | `{frontmatter refs and local limit}` | Low      | Rewrite concise metadata                |

{Or: "No authored link, Contents, or Markdown hygiene findings identified."}

False-positive guardrails:

- Ignore external URLs, anchors-only links, `mailto:` links, image links, and
  asset/file links that are not docs pages.
- Accept anchors on `.md` links, such as `page.md#section`.
- Ignore link syntax shown inside inline code, fenced snippets, placeholder
  templates, or intentional examples.
- Only enforce frontmatter description length limits when local guidance,
  schemas, or generators define the limit.
- Do not flag multiple H1s in intentional imported README/generated contexts
  unless local guidance says those files are authored docs.

## Local Docs-App Guidance

Use this section when the repository has docs-app `AGENTS.md`, contributing
docs, authoring guides, generated-index docs, or legacy docs workflow guidance.

| #   | Guidance Area              | Source Ref             | Status                        | Evidence       | Severity | Recommended Fix                     |
| --- | -------------------------- | ---------------------- | ----------------------------- | -------------- | -------- | ----------------------------------- |
| 1   | Authored docs source root  | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Medium   | Document the source root            |
| 2   | Generated root index       | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Medium   | Explain derived output lifecycle    |
| 3   | `index.md` / `## Contents` | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Medium   | Add local map contract guidance     |
| 4   | `.md` links                | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Medium   | Document `.md` relative links       |
| 5   | `.md` vs `.mdx`            | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Low      | Explain when `.mdx` is allowed      |
| 6   | Analyze/apply boundaries   | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Medium   | Route audits/apply work correctly   |
| 7   | Freshness checks           | `{AGENTS.md or guide}` | {covered \| missing \| stale} | `{exact refs}` | Medium   | Add regeneration/freshness guidance |

{Or: "No local docs-app guidance gaps identified."}

## Accuracy Verification

Check only claims that are verifiable from repo sources such as code, config, schemas,
scripts, route definitions, and checked-in setup files. Do not include external URLs or
runtime-only behavior here.

| #   | Docs Claim     | Docs Ref              | Canonical Source Ref | Verdict                                  | Severity                                   | Notes                                            |
| --- | -------------- | --------------------- | -------------------- | ---------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| 1   | `{claim text}` | `{docs/path.md:line}` | `{src/path.ts:line}` | {verified \| unverified \| contradicted} | {Critical \| High \| Medium \| Low \| N/A} | {why it was judged this way}                     |
| 2   | `{claim text}` | `{docs/path.md:line}` | `{config/file:line}` | {verified \| unverified \| contradicted} | {Critical \| High \| Medium \| Low \| N/A} | {source missing, ambiguous, or contradicts docs} |
| ... |                |                       |                      |                                          |                                            |                                                  |

{Or: "No repo-checkable substantive claims required accuracy verification."}

## Coverage Review by Surface

Summarize which documentable surfaces were proven by repo evidence and how well
the docs cover them. Mark owner-review gaps instead of guessing when claims
depend on unsupported ownership, support, deployment, observability, rollback,
external integration, or production behavior.

| #   | Surface     | Repo Evidence                      | Docs Coverage State                      | Missing or Thin Areas                                      | Owner Review Needed |
| --- | ----------- | ---------------------------------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------- |
| 1   | App/service | `{entrypoint/service/config refs}` | {adequate \| thin \| no coverage \| N/A} | `{setup/testing/config/deploy/observability/runbook refs}` | {yes/no + reason}   |
| 2   | API         | `{router/schema refs}`             | {adequate \| thin \| no coverage \| N/A} | `{contracts/auth/errors/examples/versioning}`              | {yes/no + reason}   |
| 3   | CLI         | `{command/flag/test refs}`         | {adequate \| thin \| no coverage \| N/A} | `{flags/output/dry-run/force/scripting/exit-codes}`        | {yes/no + reason}   |
| 4   | Operations  | `{deploy/monitoring/runbook refs}` | {adequate \| thin \| no coverage \| N/A} | `{release/rollback/support/escalation/troubleshooting}`    | {yes/no + reason}   |

{Or: "No app/service, API, CLI, or operations surface required coverage review."}

## Content Opportunities

Surface only repo-checkable coverage gaps based on routers, services, models, schemas,
config, and application entrypoints. Do not speculate about roadmap items or external
integrations that are not represented in the repository.

| #   | Capability Area                | Coverage State                 | Codebase Evidence                                | Suggested Docs Location                | Severity                | Subtopics To Cover                         |
| --- | ------------------------------ | ------------------------------ | ------------------------------------------------ | -------------------------------------- | ----------------------- | ------------------------------------------ |
| 1   | `{feature or capability area}` | {no coverage \| thin coverage} | `{router/service/model refs and key signatures}` | `{new page / existing page / section}` | {High \| Medium \| Low} | `{specific subtopics implied by the code}` |
| 2   | `{feature or capability area}` | {no coverage \| thin coverage} | `{router/service/model refs and key signatures}` | `{new page / existing page / section}` | {High \| Medium \| Low} | `{specific subtopics implied by the code}` |
| ... |                                |                                |                                                  |                                        |                         |                                            |

{Or: "No significant repo-backed content opportunities identified."}

## Navigation and Drift

| #   | Surface         | Issue                                 | Evidence     | Disclosure                       | Link Target         | Severity | Notes                                  |
| --- | --------------- | ------------------------------------- | ------------ | -------------------------------- | ------------------- | -------- | -------------------------------------- |
| 1   | `mkdocs.yml`    | Nav points to missing page            | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | High     | `reference/troubleshooting.md` removed |
| 2   | `docs/index.md` | `## Contents` missing subtree mapping | {exact refs} | {inline/link_only/omit/ask_user} | {path or URL / N/A} | Medium   | Child directory not described          |
| ... |                 |                                       |              |                                  |                     |          |                                        |

{Or: "No navigation or drift issues identified."}

## Progressive Disclosure Decisions

Capture which details should stay inline in docs indexes/contributor pages versus link to
canonical docs/config/examples.

| Topic     | Decision                         | Keep Inline In                        | Link Target     | Evidence     |
| --------- | -------------------------------- | ------------------------------------- | --------------- | ------------ |
| `{topic}` | {inline/link_only/omit/ask_user} | `{index.md / contributing.md / page}` | `{path or URL}` | {exact refs} |
| ...       |                                  |                                       |                 |              |

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
- Generated artifacts must not be hand-edited by `oat-docs-apply`. If a
  generated-index finding requires output changes, apply should update authored
  source maps or run the documented generator only after user approval and local
  workflow confirmation.
- Content opportunity recommendations require `oat-docs-apply` to read the cited router/service/model files before generating prose; it must not synthesize feature coverage from memory.
- Recommendations marked `omit` must stay out of generated docs changes.
- Recommendations marked `ask_user` require explicit user confirmation before generation.
- Recommendations marked `link_only` must include a canonical link target.
- If cited config/docs/files are missing at apply time, stop and re-run analyze or ask the user rather than inventing a replacement convention.
- When docs guidance already lives in canonical setup/config docs, generated changes should prefer concise links over duplicating the full detail inline.

## Next Step

Run `oat-docs-apply` with this artifact to approve and apply the recommended documentation changes.
