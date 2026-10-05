---
id: BL-260927-export-only-the-recap-page
title: Export only the recap page to project-recaps and fix its broken source links
status: closed
priority: medium
scope: feature
scope_estimate: M
labels:
  - explainers
  - archive
  - completion
  - oat-project-complete
assignee: null
created: 2026-09-27T12:50:13.379Z
updated: '2026-10-05T03:05:31Z'
associated_issues: []
external_plans: []
---

## Description

When a shared or synced project completes with a selected final `project-recap`, `oat project archive --project-recap-run <run>` copies the COMPLETE run package into tracked `.oat/repo/reference/project-recaps/<YYYYMMDD-slug>/` (`packages/cli/src/commands/project/archive/archive-utils.ts` export root ~1305-1320, per-file copy ~1366-1377, hash verification `verifyProjectRecapImmutableHashes` ~1151). The package includes `site/index.html` plus `manifest.json`, `theme.resolved.json`, `source/fact-base.json`, `source/fact-base.md`, `source/ledger.json`, and QA evidence `qa/{320,768,1440}.png` and `qa/result.json`. This is the documented contract (`apps/oat-docs/docs/reference/project-artifacts.md:101-104`: "archive copies the complete selected run"), and `oat-project-complete` Step 8 requires `projectRecapExport.manifest.relativePath === "manifest.json"` (`.agents/skills/oat-project-complete/SKILL.md:1196-1204`). `DR-260911-explainers-are-agent-authored` only says the selected archive export is the durable completion copy; it does not require the full package.

Problems observed on the triage-correctness-wave completion (PR #331, merged 2026-09-27):

1. Tracked bloat with no consumer. The export is 6.1 MB, of which 5.3 MB is three QA PNGs; the page itself is ~52 KB. The four exports now in the repo total ~8.6 MB (20260721-explainer-kit 552K, 20260722-wave-skills-promotion 356K, 20260914-agent-authored-recap 1.6M, 20260927-triage-correctness-wave 6.1M). After archive nothing reads the exported `qa/`, `source/`, `manifest.json`, or `theme.resolved.json`: hash verification runs once at archive time, and the only downstream consumers (summary export `Explainer Outcome` link, PR References) point at `site/index.html`. Per the repository's no-artifact-without-a-consumer rule, the durable reference copy should be the page; the provenance and QA evidence belong in the gitignored project archive (`.oat/projects/archived/<slug>/explainers/...`), which already keeps the full run.

2. Broken source links in the exported page. The current authoring flow emits relative links from the page back to project artifacts (`href="../../../discovery.md"`, `../../../implementation.md`, `../../../plan.md`, `../../../project-log.md`, `../../../summary.md`, `../../../references/project-retro.md`). Those resolve inside `<project>/explainers/<run>/site/`, but from `.oat/repo/reference/project-recaps/<slug>/site/index.html` they point at nonexistent paths under `.oat/repo/reference/`, so every source link in the tracked recap on `main` is broken. The three older exports have no relative links (earlier recipe versions), so this is new with the agent-authored flow.

Design constraint: re-running archive treats an existing export as already present by comparing the exported `manifest.json` (`archive-utils.ts` ~1313-1330, test "fails without overwrite when the recap destination already exists"). A page-only export needs another stable identity (for example the manifest's `site/index.html` hash recorded in the archive report and summary export, or a small non-bulky marker) so retry/resume and synced-archive recovery (`resolve-synced-archive-entry.mjs`, `finalize-synced-archive.mjs`) stay idempotent. Related surfaces that read the export report: `push-runner.ts` (`projectRecapExport` printing), `oat-project-complete` Steps 8, 8.5, 12, and the synced archive scripts under `.agents/skills/oat-project-complete/scripts/`. Related: `BL-260912-evaluate-replacing-explainer` (authoring layer; separate), `DR-260911-explainers-are-agent-authored`.

## Acceptance Criteria

- `oat project archive --project-recap-run <run>` exports only the rendered page, as a single file named like the project summaries: `.oat/repo/reference/project-recaps/<YYYYMMDD>-<project>.html` (mirroring `.oat/repo/reference/project-summaries/<YYYYMMDD>-<project>.md`; operator direction 2026-09-27). No per-project directory, and no `qa/`, `source/`, `theme.resolved.json`, or run `manifest.json` is tracked. If re-archive idempotency needs an identity, record the page sha256 and run id in the archive report and the summary export rather than in a tracked sidecar file.
- Before the page is copied, archive still verifies every package file's recorded hash against the source run (`verifyProjectRecapImmutableHashes`); a tampered QA image or fact base still blocks archive even though it is no longer exported. The full verified run stays in the archived project (`.oat/projects/archived/<slug>/explainers/<run>/`), including when the local archive is later synced to S3.
- Re-running archive against an existing export is idempotent when the exported page matches the run, fails without `--overwrite`-style consent when it differs, and rollback on a failed archive removes only what this run wrote (update the existing "fails without overwrite when the recap destination already exists" test family in `archive-utils.test.ts` rather than deleting it).
- The exported page has no broken relative links. Either the authoring contract stops emitting `../../../*.md` links to project artifacts, or the export rewrites/strips them, and a test fails when an exported page contains a relative `href`/`src` that does not resolve from the export location. Links to tracked targets (the summary export under `.oat/repo/reference/project-summaries/`, decision records, PR URLs) are allowed and resolve.
- The `projectRecapExport` report contract (archive JSON, `push-runner.ts` printing) no longer requires `manifest.relativePath === "manifest.json"`; `oat-project-complete` Steps 8, 8.5, and 12 (`SKILL.md` ~1058, 1196-1204, 1229, 1244) and the synced-archive scripts (`resolve-synced-archive-entry.mjs`, `finalize-synced-archive.mjs`) consume the new contract, and the summary export's `Explainer Outcome` link and PR References point at the exported page path. The skill's `metadata.version` is bumped.
- Docs describe the new split: `apps/oat-docs/docs/reference/project-artifacts.md` (~101-110) and `apps/oat-docs/docs/reference/cli-reference.md` say the tracked export is the page and the evidence stays with the archived project.
- All existing tracked recap packages are migrated in the same follow-up PR. Inventory `.oat/repo/reference/project-recaps/` at implementation start rather than limiting migration to the original four exports. As of 2026-10-03, this includes `20260721-explainer-kit`, `20260722-wave-skills-promotion`, `20260914-agent-authored-recap`, `20260927-triage-correctness-wave`, `20260928-backlog-wave-2`, `20261001-backlog-wave-3`, and `20261003-backlog-wave-4`. Each becomes one `<YYYYMMDD>-<project>.html` file; tracked supporting files and per-project directories are removed after evidence preservation is verified. Rewrite inbound links (summary exports' `Explainer Outcome`, docs, and maintained PR references) to the new paths, fix broken relative links in every migrated page, and remove the stray `2026-08-19-defect-wave-program.fact-base.json` or move it to where its consumer expects it. Record current before/after tracked size; the original four-export baseline was about 8.6 MB.
- Either `DR-260911-explainers-are-agent-authored` is amended or a new decision record states that the durable tracked recap is the rendered page and QA/source evidence is archive-only.
- Lockstep public package versions are bumped (bundled skill and docs changes), and the full Definition of Done passes, with a negative control showing the pre-fix export (full package) is rejected by the new export-contents test and the new export passes.

## Notes

- Operator direction 2026-10-03: merge Wave 4 PR #351 without delaying it for recap export cleanup. Deliver this backlog item's exporter fix and conversion of every existing tracked recap, including Wave 4, in a separate follow-up PR. The published references mirror `project-summaries`: one dated HTML file per recap, with no tracked evidence sidecars. Preserve source/QA evidence in the project archive rather than the tracked reference directory.
- Status 2026-09-27: deferred out of the Wave 2 batch by the operator; the single-file layout above is the chosen direction.
- Evidence (2026-09-27): `du -sh` on `20260927-triage-correctness-wave` is 6.1 MB, of which `qa/*.png` is about 5.3 MB (about 4.0 MB, 3.9 MB, 2.6 MB at 1440/768/320 widths); `site/index.html` is about 52 KB and has 6 relative links (`../../../discovery.md`, `implementation.md`, `plan.md`, `project-log.md`, `summary.md`, `references/project-retro.md`) that are broken at the export location. The three older exports have 0 relative links.
- Git history keeps every byte already committed, so slimming the existing exports reduces checkout size and future diffs, not clone size. Do not rewrite history.
- Out of scope: the authoring layer itself (`BL-260912-evaluate-replacing-explainer`), and whether completion should generate a recap at all.
