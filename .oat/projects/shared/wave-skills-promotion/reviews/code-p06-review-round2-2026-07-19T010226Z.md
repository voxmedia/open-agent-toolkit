---
oat_generated: true
oat_generated_at: 2026-07-19T01:02:26Z
oat_review_scope: p06
oat_review_round: 2
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
oat_commit_range: 1860cc77..38e843fb
oat_prior_review: reviews/code-p06-review-2026-07-19T004731Z.md
---

# Code Review: p06 (round 2 — scope-extension range)

**Reviewed:** 2026-07-19T01:02:26Z
**Scope:** Operator-confirmed p06-t03 scope extension — installable wrapper scaffold, acceptance harness, runbook rewrite, scope-boundary notes
**Files reviewed:** 7 changed files
**Commits:** 5 (`1860cc77` plan amendment + `ce473258`, `70dfb97f`, `08e3c516`, `38e843fb`)
**Verdict:** FAIL (1 Important)

## Summary

The scaffold, runbook, and scope-boundary notes match the amended p06-t03 plan body and the vendored frozen RC: schema ids and required-key lists are byte-accurate, publishing is genuinely human-gated, sanitization is implemented (not just claimed), and the fresh-agent executor model is coherent end-to-end. One Important defect: the acceptance harness's opt-in publish leg constructs an `explainer-kit.publish-request/v1` that is missing two schema-required keys (`provider`, `awsRegion`), so the packaged connector's pre-network validation will deterministically reject it whenever the operator enables `allowPublish` — a harness defect that would contaminate the acceptance record with a false wrapper failure.

Findings: 0 critical, 1 important, 0 medium, 1 minor

## Findings

### Critical

None

### Important

- **Publish leg constructs a schema-invalid publish request** (`.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs:205`)
  - Issue: `testPersonalDestinations` builds the request with `schemaVersion, manifestPath, siteRoot, s3Uri, publicBaseUrl` only. The vendored `publish-request.schema.json` requires seven keys — the harness omits `provider` (const `"s3-static"`) and `awsRegion`. Per `destination-contract.md`, the connector validates the request before any network access, so the end-to-end publish test fails deterministically once the operator sets `acceptance.allowPublish: true`. Because this is the load-bearing acceptance artifact whose result feeds RC promotion, a guaranteed harness-side failure on one of the six coverage legs would misattribute the defect to the wrapper. The default `allowPublish: false` path is unaffected (leg correctly reports `skipped`), which is why this is Important rather than Critical.
  - Fix: add `provider: 's3-static'` to the constructed request and source `awsRegion` from a new config seam (e.g. `publish.awsRegion`, added to `config.seams.example.json` with a `_notes` provenance entry pointing at the 0.4.1 backup's destination config). Optionally validate the constructed request's key set against the vendored schema in the test itself, mirroring `testManifestConsumption`.
  - Requirement: FR10 / amended p06-t03 (acceptance must cover personal destinations)

### Medium

None

### Minor

- **Sanitizer skips seam values shorter than 4 characters** (`.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs:50`)
  - Issue: `collectSeams` only registers string seams with `length >= 4`. A very short personal value (e.g. a 3-character bucket name or document id fragment) would survive into evidence unredacted. The guard is a reasonable trade-off (it prevents redacting ubiquitous short strings like `"1"`), and `$HOME` plus absolute-path redaction still apply, so real-world exposure is unlikely.
  - Suggestion: document the threshold in the seams `_notes` (operators should know values under 4 characters are not redacted), or lower the threshold for keys under `publish.` and `googleDocs.`.

## Requirements/Design Alignment

**Evidence sources used:** amended `plan.md` p06-t03 body (commit `1860cc77` — the scope-extension paragraph and Files list are the contract); `design.md` component 8; `implementation.md`; vendored RC `references/explainer-rc-f212d630/` (run-request, fact-base, manifest, publish-request schemas; `contracts.md`; `destination-contract.md`; `rc.json`); prior round-1 artifact for the pre-extension baseline.

### Requirements Coverage

| Contract item                                     | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffold: SKILL.md contract fidelity              | implemented | Re-ran the schema-fidelity pattern: all three schema ids and in-order required-key lists byte-match the vendored schemas. Destination routing defers to `destination-contract.md`; run flow invokes only the packaged `run.mjs` entry point.                                                                                                                                                                                                                                                                                                            |
| Scaffold: publishing human-gated                  | implemented | Verified in code, not prose: `testPersonalDestinations` returns `status: 'skipped'` unless `acceptance.allowPublish === true`; seams example ships `allowPublish: false`; SKILL.md requires the explicit confirmation flag and preserves the connector's own `--confirm-publish` gate.                                                                                                                                                                                                                                                                  |
| acceptance.mjs: quality bar                       | partial     | Node builtins only (all imports `node:`-prefixed; zero external); `node --check` passes; all six tests present; report-all semantics verified (per-test try/catch, `overall` from any `fail`); manifest test checks all 12 required keys plus path-safe `immutableHashes` byte verification; output schema `{rcId, commit, startedAt, finishedAt, results[], overall}` with `finalRc` pins read from config; git mode 100755. Partial due to the Important publish-request finding.                                                                     |
| acceptance.mjs: sanitization actually implemented | implemented | Read the redaction code: `collectSeams` walks the config (skipping `_notes`), sorts seams longest-first to avoid partial-replacement leaks, replaces each value with `<seam:path>`, then redacts `$HOME` and any remaining `/Users/...` or `/home/...` absolute paths. Applied to every `evidence` string before write.                                                                                                                                                                                                                                 |
| Seams file                                        | implemented | Valid JSON; every operator value has a `_notes` provenance entry (packagedSkillRoot, vaultRoot, googleDocs, publish, backupPath, acceptance, finalRc); placeholders only — no real credentials, paths, bucket names, or distribution ids.                                                                                                                                                                                                                                                                                                               |
| Runbook coherence                                 | implemented | Install flow (copy tree → fill seams → pin finalRc at freeze → acceptance → fan-out) matches the scaffold as shipped, including the `config.json` location and `finalRc` key names. Executor-model section is consistent: fresh agent executes cold, operator supplies/blesses seams and result, explainer agent freezes the RC and consumes the blessed result. Subtree pin `2cf98952…`, rebuild locator (worktree at `534a408e` → build → `build-explainer-rc.mjs`), tarball-divergence note, and rollback path all preserved from the prior version. |
| Scope-boundary notes (`08e3c516`)                 | implemented | W6 runbook §4 states all three required elements: phrasing-restore applies only to the 1.4.0+§2 surface, p06 additions are ordinary-defect handling, and W6 pins the version current at kickoff (realistically 0.2.2 — consistent with the round-1-verified manifests). Equivalence checklist carries the matching boundary section as a pure 11-line addition; all 75 existing table rows unaltered (0 deletions in the diff).                                                                                                                         |
| Boundaries/hygiene                                | implemented | All writes confined to the project `references/` tree plus the operator-confirmed `plan.md` amendment; 5 conventional commit subjects; checklist and W6 runbook changes are append-only; `git diff --check` clean; no deletions in range.                                                                                                                                                                                                                                                                                                               |

### Extra Work (not in declared requirements)

None. Every file in the range maps to the amended p06-t03 Files list, the scope-boundary follow-through, or the plan amendment itself.

## Verification Commands

```bash
node --check .oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs
git ls-files -s -- .oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs
python3 - <<'PY'
import json
base = '.oat/projects/shared/wave-skills-promotion/references/explainer-rc-f212d630/schemas/'
pub = json.load(open(base + 'publish-request.schema.json'))['required']
src = open('.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/scripts/acceptance.mjs').read()
assert "provider: 's3-static'" in src or '"provider"' in src, 'publish request still missing provider'
assert 'awsRegion' in src, 'publish request still missing awsRegion'
print('publish-request required keys now constructed:', pub)
PY
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important finding into a fix task (add `provider` + `awsRegion` seam to the publish leg), then re-review this range.
