---
id: BL-261025-make-oat-docs-generators
title: Make OAT docs generators and writers predictable
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T13:57:30.123Z
updated: 2026-10-25T13:57:30.123Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

OAT commands that generate or rewrite docs and config files cannot run
read-only, report misleading counts, churn under the repository formatter, emit
navigation that may render wrongly, and leave config shape hard to read or
validate. This item consolidates seven follow-ups filed on 2026-10-25 from the
OAT docs tooling 0.3.31 pilot and 0.3.32 read-only conformance runs on consumer
repositories, as follow-ups to
[BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md)
and issue #367. The archived source records keep their original wording:

- [BL-261025-add-a-check-or-stdout-mode — Add a check or stdout mode to oat docs generate-index](../archived/BL-261025-add-a-check-or-stdout-mode.md) (medium, S)
- [BL-261025-correct-oat-docs-generate — Correct oat docs generate-index counts, header wording and drift guidance](../archived/BL-261025-correct-oat-docs-generate.md) (low, S)
- [BL-261025-keep-files-oat-writes-or — Keep files OAT writes or rewrites stable under the repository formatter](../archived/BL-261025-keep-files-oat-writes-or.md) (medium, M)
- [BL-261025-stop-nav-sync-adding-index — Stop nav sync adding index beside a link-form pagesIndex](../archived/BL-261025-stop-nav-sync-adding-index.md) (medium, S)
- [BL-261025-verify-nav-sync-cross — Verify nav sync cross-directory link items under a docs base path](../archived/BL-261025-verify-nav-sync-cross.md) (low, S)
- [BL-261025-let-oat-config-get-read — Let oat config get read the whole documentation block](../archived/BL-261025-let-oat-config-get-read.md) (low, XS)
- [BL-261025-define-and-validate-the-base — Define and validate the base of documentation.ia track paths](../archived/BL-261025-define-and-validate-the-base.md) (low, S)

### generate-index freshness and output

- `oat docs generate-index` can only write its output file. Freshness checks
  therefore regenerate the committed manifest and diff it (the repository's own
  gate runs generate-index then `git diff --exit-code`), which dirties the
  working tree and cannot run read-only, for example inside oat-docs-analyze.
  A `--check` mode (exit 1 and name the output when it would change, writing
  nothing) or a stdout mode would mirror `oat docs nav sync --check`.
- Since 0.3.32, manifest links are relative to `--output`, so regenerating into
  `/tmp` and diffing (a common read-only workaround) produces links such as
  `../../<absolute path>/docs/index.md` and cannot show the real in-repository
  diff; a same-layout copy is needed. A check or stdout mode must compute links
  relative to the configured output location, not the temporary one.
- "Generated index with N entries"
  (`packages/cli/src/commands/docs/index-generate/index.ts`) counts top-level
  items; a manifest with 63 page links reported 3.
- The header "Fresh Fumadocs apps regenerate this manifest in
  predev/prebuild." is emitted for every Fumadocs app, including long-standing
  ones, and the header line changes depending on whether the root config is
  found.
- Moving to 0.3.32 changes manifests beyond the documented link prefix:
  ordering follows Contents instead of alphabetical, group labels use child
  index titles, and the banner is new. oat-docs-analyze (Step 6,
  generated-manifest comparison) mentions only the link prefix, so analysts
  report expected regeneration as content drift.

### Formatter-stable writes

Files OAT writes or rewrites are not stable under the repository formatter, so
consumer repositories that run oxfmt fail their format check after an ordinary
OAT command.

- `oat config set` rewrites the whole `.oat/config.json` in its own JSON style
  (for example expanding unrelated short arrays).
- `oat docs nav sync` writes `meta.json` with one array item per line; `--check`
  compares by meaning, so it passes, but the formatter rewrites the file.
- `oat decision new` rewrites the whole `decisions/index.md` table unpadded
  (about 65 lines of churn per record in a consumer repository; this repository
  saw a 636-line diff for two records until oxfmt restored it).

### Nav sync output

- `hasImplicitIndex` in `packages/cli/src/commands/docs/nav/fumadocs.ts` treats
  any `pagesIndex` other than `"index"` as "no implicit index", so nav sync
  writes `"index"` into `pages` for a folder whose `meta.json` has a link-form
  `pagesIndex` such as `"[Overview](/engineering)"`. In fumadocs-core 16.10.2
  (`buildFolder` in the loader), a link-form `pagesIndex` makes the link the
  folder index and attaches no `index` page, so the listed `"index"` becomes a
  second Overview row beside the folder link. Ten folders in one consumer
  repository have this shape. Worked out from the loader source; not yet
  confirmed in a rendered sidebar. The hand-authored membership comparison
  already treats a link-form `pagesIndex` to the folder's own URL as reaching
  the landing page (`DR-261025-hand-authored-navigation-is`); only nav-sync
  generation is affected.
- Suspected, not rendered: nav sync turns a cross-directory Contents link into a
  root-absolute Fumadocs link item such as
  `[Model Runtime](/engineering/architecture/model-runtime)`. When the site is
  deployed under a base path (`NEXT_PUBLIC_BASE_PATH`), the link item may not
  receive the base path.

### Documentation config read and validation

- `oat config get documentation --json` returns
  `Unknown config key: documentation`; the whole block is readable only through
  `oat config dump`. Agents checking config shape during analysis need the block
  in one call.
- The base of `documentation.ia.tracks[].path` is undefined. The validator
  rejects only absolute, URL and `..` paths, nothing reads `tracks`, preset
  scaffolds write content-root-relative names, and the configuration reference
  documents only `decision` as repository-relative. Adopters cannot tell which
  base to use.

## Acceptance Criteria

None of the seven sources was high priority. Each group names its source
priority.

generate-index check or stdout mode (medium):

- [ ] `oat docs generate-index` offers a mode that compares the would-be output with the existing file and writes nothing, exiting 1 and naming the output when it is stale (or prints the manifest to stdout for external comparison).
- [ ] The repository gate and docs (`AGENTS.md` step 9, docs-tooling commands page) use the new mode where it replaces regenerate-and-diff.
- [ ] oat-docs-analyze can check manifest freshness without writing.
- [ ] The comparison uses links relative to the configured output path, so it works without writing to that path.

generate-index counts, header and drift guidance (low):

- [ ] The success message counts page links (or names both counts).
- [ ] Header wording is accurate for existing apps and does not depend on config discovery.
- [ ] oat-docs-analyze describes the full 0.3.32 manifest change set so it is not reported as drift.

Formatter-stable writes (medium):

- [ ] Commands that rewrite tracked files either preserve untouched bytes (minimal diff) or emit the formatter's canonical shape.
- [ ] Tests cover a config set, a nav sync and a decision index regeneration followed by a formatter check.

Nav sync link-form `pagesIndex` (medium):

- [ ] A built or loader-level fixture confirms the duplicate row.
- [ ] Nav sync omits `"index"` when a link-form `pagesIndex` points at the folder's own URL (and keeps current behavior for path-form values), with `--check` freshness consistent.
- [ ] oat-docs-analyze's expected-output description (Step 6, nav-sync `meta.json`) covers the link-form `pagesIndex` case.

Nav sync link items under a base path (low):

- [ ] A built fixture under a base path confirms whether link items resolve; if not, nav sync emits base-path-safe items or the docs state the limitation.

`oat config get documentation` (low):

- [ ] `oat config get documentation` returns the resolved documentation block (read-only aggregate view, like other aggregate keys), documented in the CLI reference.

Track path base (low):

- [ ] The configuration reference states that track paths are content-root-relative (matching preset scaffolds), and validation rejects values that do not resolve under the content root.
