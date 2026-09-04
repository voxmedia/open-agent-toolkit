---
oat_triage_record: true
schema_version: 1
status: post_merge_complete
scope: GitHub issue #258 only
baseline_sha: dd41adb9bed53aa2389e911b601615fc2b26f0b7
triage_pr: 257
created: 2026-09-04
updated: 2026-09-04
---

# Issue #258: skill versioning against the Agent Skills specification

## Scope and exclusions

- In scope: issue #258 only, filed by the operator on 2026-09-04 with the
  request to work it into the execution program.
- Excluded: every other open issue; the 2026-09-02 program-intake record is
  complete.
- Branch note: recorded on the PR #257 branch (docs-only, based on
  `origin/main`) rather than a fresh branch; binds to PR #257.

## Evidence baseline

- `origin/main` at `dd41adb9bed53aa2389e911b601615fc2b26f0b7` (PR #253 merged), fetched 2026-09-04.
- Anchors re-verified live: `frontmatter.ts:146-156`,
  `validation/skills.ts:922-925,1063`, `agents/canonical/resolve.ts:176`,
  `create-agnostic-skill/SKILL.md:101`, `create-oat-skill/SKILL.md:20,70`,
  `contributing/skills.md:156-165`; 80 bundled skills carry a top-level
  `version`, none carries `metadata.version`.

## Disposition ledger

### GH-258 — Skill versioning should honor the Agent Skills spec's metadata.version

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/258
- Claim: OAT reads only a non-standard top-level `version`; spec-conformant
  skills are unversioned to OAT.
- Verification: Confirmed enhancement.
- Confidence: 97%.
- Evidence: every version read is a top-level scalar read (`getSkillVersion`,
  the bump and semver checks, canonical role resolution); no nested accessor
  exists; templates and docs teach the top-level field.
- Existing coverage: None.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment linking
  both items and the plan.
- Backlog action: Created `BL-260904-honor-metadata-version` (medium /
  feature / M) with an external plan scheduled as W6 group 2, and
  `BL-260904-migrate-bundled-skills-from` (low / task / M) for the bulk
  migration and alias decision.
- Priority and size rationale: medium because a workaround (carry both
  fields) exists; M because the resolver touches three read sites, validation
  findings, two templates, docs, and runtime consumers.
- Approval: Approved by the operator on 2026-09-04 ("work it into one of the
  waves").
- Post-merge result: Applied 2026-09-04 after PR #257 merged (`83d8c9f2e`): `tracked-in-backlog` and a linking comment on #258; receipt posted on PR #257.

## Open concerns

- Whether any host outside OAT reads the top-level field decides if the alias
  is ever removed; recorded in the migration item, not this plan.

## Resume instructions

After PR #257 merges, invoke:

```text
/triage-oat-issues resume post-merge PR #257
```
