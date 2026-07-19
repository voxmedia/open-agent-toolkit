---
oat_generated: true
oat_generated_at: 2026-07-19T01:08:26Z
oat_review_scope: p06
oat_review_round: 3
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
oat_commit_range: ed5ca542
oat_prior_review: reviews/code-p06-review-round2-2026-07-19T010226Z.md
---

# Code Review: p06 (round 3 — fix verification)

**Reviewed:** 2026-07-19T01:08:26Z
**Scope:** Bounded verification of fix commit `ed5ca542` against round-2 findings (1 Important: publish-request required keys; 1 Minor: sanitizer-threshold documentation)
**Files reviewed:** 2 changed files
**Commits:** 1 (`ed5ca542`)
**Verdict:** PASS

## Summary

Both round-2 findings are resolved. The publish request now carries all seven schema-required keys in the vendored schema's order with the `provider: 's3-static'` const and a new `publish.awsRegion` seam (placeholder plus `_notes` provenance); a `PUBLISH_REQUEST_REQUIRED_KEYS` constant with a `requireKeys` assertion guards harness-side drift before the request is written or the connector invoked; and the seams file documents the 4-character sanitization threshold. One new low-impact Minor observed on the guard's value coverage; it does not block the pass.

Findings: 0 critical, 0 important, 0 medium, 1 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Drift guard checks key presence, not value definedness** (`.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs:116`)
  - Issue: `requireKeys` uses the `in` operator, so a constructed property whose value is `undefined` (e.g. an operator running an old filled `config.json` that predates the `publish.awsRegion` seam) passes the guard, and `JSON.stringify` then drops the key from the written request — that failure would surface connector-attributed. The guard fully covers its stated purpose (harness-edit drift on the constructed literal fails harness-attributed), and a fresh install from the current seams example always carries the seam, so impact is low.
  - Suggestion: additionally assert each required value is a non-empty string in the publish test, or add `publish.awsRegion` to a nested config `requireKeys` check.

## Requirements/Design Alignment

**Evidence sources used:** round-2 review artifact (finding baseline); fix commit `ed5ca542` diff; vendored `references/explainer-rc-f212d630/schemas/publish-request.schema.json`; current worktree state of both changed files.

### Round-2 Finding Disposition

| Round-2 finding                                       | Status   | Verification                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Important: publish request missing provider/awsRegion | resolved | Constructed request now enumerates all seven keys in the schema's `required` order; `provider` matches the schema const `s3-static`; `awsRegion` sources from the new `publish.awsRegion` seam. Re-ran the key-set check against the vendored schema: constant, literal, and schema all agree. |
| Minor: sanitizer threshold undocumented               | resolved | `config.seams.example.json` `_notes.sanitization` documents the 4-character redaction threshold and advises against shorter personal values.                                                                                                                                                   |

### Bounded Round-3 Checks

| Check                                      | Result | Notes                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix commit file boundary                   | Pass   | `ed5ca542` touches exactly `acceptance.mjs` and `config.seams.example.json`; conventional subject; `git diff --check` clean.                                                                                                                                                                |
| Publish-request key-set vs vendored schema | Pass   | `PUBLISH_REQUEST_REQUIRED_KEYS` and the constructed literal both match the schema `required` array in order.                                                                                                                                                                                |
| Drift failure attribution                  | Pass   | The `requireKeys` guard sits before the request write and the `publish.mjs` invocation inside `testPersonalDestinations`; a drifted literal throws `publish request missing required keys: …`, caught by the matrix try/catch as a harness-labeled `fail` — the connector is never reached. |
| Syntax, mode, seams validity               | Pass   | `node --check` clean; git mode 100755; seams example parses as valid JSON with placeholder-only values.                                                                                                                                                                                     |

### Extra Work (not in declared requirements)

None.

## Verification Commands

```bash
node --check .oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs
git ls-files -s -- .oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs
python3 - <<'PY'
import json, re
required = json.load(open('.oat/projects/shared/wave-skills-promotion/references/explainer-rc-f212d630/schemas/publish-request.schema.json'))['required']
src = open('.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs').read()
const_keys = re.findall(r"'([^']+)'", re.search(r'const PUBLISH_REQUEST_REQUIRED_KEYS = \[(.*?)\];', src, re.S).group(1))
built = re.findall(r'^\s*(\w+):', re.search(r'const publishRequest = \{(.*?)\};', src, re.S).group(1), re.M)
assert const_keys == required and built == required
json.load(open('.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/config.seams.example.json'))
print('publish-request keys aligned with vendored schema; seams JSON valid')
PY
```

## Recommended Next Step

Round-2 findings are closed; the phase-p06 scope-extension range now passes. The remaining Minor is fix-if-time and can ride a later touch of the harness.
