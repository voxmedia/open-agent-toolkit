---
title: OAT docs analysis improvement recommendations
description: Recommendations for improving oat-docs-analyze and OAT docs-app agent guidance based on existing Fumadocs app audits.
---

# OAT docs analysis improvement recommendations

## Agent prompt for implementation

You are implementing improvements to OAT documentation analysis based on audits of existing OAT Fumadocs docs apps. Treat this file as the implementation handoff.

### Goal

Improve `oat-docs-analyze`, related reference checklists, and docs-app authoring guidance so future analyses reliably catch the drift patterns found across existing Fumadocs docs apps.

### Primary hypothesis about generated index drift

The generated index issues are probably not one single bug. Treat them as four related failure modes:

1. **Generation is not run at the right time.** Most Fumadocs apps regenerate the root manifest through `predev` or `prebuild`, so ordinary docs edits can leave `index.md` stale until someone runs a docs command.
2. **Generated files may be ignored or local-only.** Some repos intentionally ignore generated manifests, but stale local files can still mislead agents that read them directly.
3. **Analyzer guidance does not yet require freshness checks.** Existing guidance tells agents not to hand-edit generated files, but often does not require comparing generated output to authored `## Contents` before using it as evidence.
4. **Generator semantics may be unclear or incomplete.** Some mismatches look like stale files, while others may reflect ordering behavior, skipped leaf links, extensionless links, or generated-index semantics that are not documented well enough.

Do not assume generation drift is always caused by a generator bug. First distinguish stale output from unclear generator semantics and from authored-source contract violations.

### Required implementation themes

1. Add a generated-artifact freshness check to `oat-docs-analyze`.
   - Detect Fumadocs/OAT docs apps with generated root manifests such as `index.md`.
   - Identify the docs source path and generated index path from OAT config, package scripts, or local guidance.
   - Compare the generated manifest against the authored `## Contents` graph.
   - Flag missing generated entries, stale links to deleted files, order mismatches, and generated entries not reachable from authored Contents.
   - Distinguish “generated artifact missing,” “generated artifact ignored/local,” “generated artifact stale,” and “generator semantics unclear.”
   - In analyze mode, do not hand-edit or regenerate docs content. Recommend regeneration or tool investigation as findings.

2. Expand authored-link checks beyond `## Contents`.
   - Resolve every local relative Markdown link from the page where it appears.
   - Flag missing targets.
   - Flag extensionless local links when the docs app follows OAT/Fumadocs `.md`-suffixed link conventions.
   - Accept anchors on `.md` links.
   - Avoid false positives for placeholder links shown inside inline code or intentional syntax examples.

3. Improve `index.md` / `## Contents` contract checks.
   - Continue checking every Markdown-bearing directory for `index.md`.
   - Continue checking every `index.md` for `## Contents`.
   - Add detection for placeholder-only Contents sections, such as comments or generic “add links here” text.
   - Check that parent `## Contents` entries include immediate child directories that contain docs.
   - Check that single-page directories still provide useful local maps or section maps.

4. Add generated-navigation semantics checks.
   - Compare generated index ordering to authored Contents ordering and classify mismatches separately from missing links.
   - Check `meta.json` or other sidebar metadata against authored Contents when present.
   - Report when generated artifacts behave as unordered inventories rather than navigational maps.
   - Recommend documentation updates when tooling behavior is intentional but ambiguous.

5. Add Markdown hygiene checks.
   - Flag opening code fences without language identifiers.
   - Suggest `sh` for shell command examples unless a repo explicitly documents `bash` as local convention or the block uses Bash-only syntax.
   - Flag empty headings and multiple document-level H1s outside intentional imported README contexts.
   - Flag overlong frontmatter descriptions where local guidance declares a limit.
   - Flag ellipsis-truncated descriptions and README-style titles in generated-nav/search contexts.

6. Add docs-app authoring guidance checks.
   - Verify docs app `AGENTS.md` or contributing docs tells agents:
     - authored docs live under the docs source tree;
     - generated root manifests are not hand-edited;
     - every content directory needs `index.md`;
     - every `index.md` needs useful `## Contents`;
     - internal links should use `.md`-suffixed relative targets, including `subdir/index.md`;
     - plain `.md` is preferred unless JSX/components require `.mdx`;
     - broad audits should use `oat-docs-analyze` and approved changes should use `oat-docs-apply`;
     - generated manifests should be regenerated or freshness-checked after docs source changes.
   - Flag local guidance that references older aliases without mapping them to the current analyze/apply flow.

7. Add app/service, API, CLI, and operations coverage checks.
   - For app/service docs, check for purpose, audience, local setup, testing, configuration, deployment/release, observability, runbooks, rollback, ownership, support/escalation, and troubleshooting.
   - For API docs, check whether large API surfaces have navigable contract-grade reference pages instead of only a broad overview.
   - For CLI docs, check that command groups, flags, output modes, destructive behavior, dry-run/force options, and scripting/exit-code behavior are discoverable.
   - For operations docs, flag “Future Topics” placeholders that should become concrete pages or owner-reviewed tracked gaps.

8. Update templates and references.
   - Update `.agents/skills/oat-docs-analyze/references/quality-checklist.md` with the checks above.
   - Update `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md` with placeholder Contents and generated-index freshness criteria.
   - Update `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` with clearer generated-index lifecycle guidance.
   - If appropriate, update `apps/oat-docs/docs/reference/docs-index-contract.md` to distinguish Fumadocs generated-index behavior from MkDocs nav-sync behavior.
   - Consider adding a focused `oat docs` check command if existing CLI support cannot perform generated-index freshness checks without mutating files.

### Acceptance criteria

- `oat-docs-analyze` artifacts can classify generated index problems as stale output, missing output, unclear generator semantics, or authored-source contract drift.
- Analysis artifacts include exact evidence for generated-manifest mismatches and do not instruct agents to hand-edit generated files.
- The analyzer catches the recurring issues found in the seven existing Fumadocs audits: stale generated indexes, missing or placeholder Contents, extensionless links, broken links outside Contents, README-copy metadata, ellipsis descriptions, missing code-fence languages, shell fence convention drift, disabled docs checks, operations coverage gaps, and stale authoring guidance.
- Updated docs-app guidance tells future agents when to regenerate or validate generated artifacts after editing docs source.
- Analyze mode remains read-only except for writing the analysis artifact.

## Background from existing docs-app audits

Seven existing OAT Fumadocs docs apps were analyzed:

- Open Agent Toolkit docs
- Gizmo Slack App documentation
- Honeycomb docs
- Duet docs
- Vox Mobile App documentation
- Cyclone App documentation
- Stoa documentation

Across the audits, generated index drift appeared in several forms:

- Generated manifests omitted pages that were present in authored `## Contents`.
- Generated manifests pointed to old deleted paths.
- Generated manifest order differed from authored Contents order.
- Generated output exposed legacy pages not clearly reachable from current authored maps.
- Ignored/generated local files remained stale even though build hooks would regenerate them later.

The safest interpretation is that generated artifacts need an explicit lifecycle in both tooling and guidance: agents should treat authored `docs/**/index.md` maps as source, generated manifests as derived output, and freshness as something to verify before relying on the generated file.

## Recommended implementation phases

### Phase 1: Analyzer checks

Implement read-only checks in `oat-docs-analyze` for generated manifest freshness, authored link resolution, placeholder Contents, and generated/order drift. This gives immediate value without changing docs-app content.

### Phase 2: Reference and template updates

Update the quality checklist, directory assessment criteria, and bootstrap `AGENTS.md` template so new docs apps encode the generated-index lifecycle and `.md` link contract from the start.

### Phase 3: Docs contract clarification

Clarify OAT docs contract pages so Fumadocs generated-index behavior and MkDocs nav-sync behavior are described separately. Do not imply Fumadocs currently uses MkDocs nav sync.

### Phase 4: Optional CLI support

If analyzer implementation needs a reusable primitive, add or extend an `oat docs` command that compares generated manifests to authored Contents without mutating files. Keep mutation/regeneration in existing generation commands or apply flows.

## Repo-specific source artifacts

The per-repo generated artifacts in `existing-oat-fumadocs-improvements/` now begin with `# Agent prompt` sections. Those sections can be handed to agents working in the target repositories to fix local docs issues while preserving the full evidence-backed analysis below each prompt.
