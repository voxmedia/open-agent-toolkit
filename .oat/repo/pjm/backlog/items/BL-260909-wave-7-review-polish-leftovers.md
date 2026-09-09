---
id: BL-260909-wave-7-review-polish-leftovers
title: Wave-7 review polish leftovers
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - polish
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:47.659Z
updated: 2026-09-09T10:55:11.000Z
associated_issues: []
external_plans: []
---

## Description

Minor findings deferred by wave-7 reviews, none behavior-affecting; sweep in one change. p03: check `OXFMT_BINARY` exists before spawning (round-2 m2). p05: redundant set-then-get in the aggregate walk (m3). p09: dangling / file / circular symlink exclusions still receive the frozen case-sensitivity hint (m2). p11: comment that `hopCapError`'s `other` role is unreachable; docs bullet to say the empty-manifest line is human-output only. p12: the `useDiskManifestPersistence` cwd guard is unexercised by any test (m2). p13: `validatedSkillCount` reports `oat-*` only while the promoted pass iterates all 83 skills (m3). p04 brief carry-over: an optional CLI case for a non-zero-exit `oat` stub → exit 1 with `Unable to clear the active project pointer`. p19: the emitted `skill-template.md` carries a repo-internal backstop path inside the four-backtick template (move the citation below the fence; prescribed by its plan). p20: the `keeps external-plan writes on the caller's model class` test title named in the `oat-repo-improve` prose is not pinned — renaming the `it()` fails nothing; pin the title (for example a case that greps the prose for the title and asserts the test exists). Final review m4: five residual prototype-named lookups in p05's files, each shown non-exploitable — `commands/gate/index.ts:1016` (unreachable with a prototype id; `resolveSelectedExecTarget` rejects first) and `:3407` (compares a string constant), `commands/project/dispatch-ceiling/index.ts:1176` and `:1226` (filtered by `isValidProviderValue`), `config/resolve.ts:585` (inside `resolveEnvOverride`, returns undefined for every reachable environment) — route them through `getOwnKey` or comment why each is provably safe. Final review m5: the comment at `commands/config/index.ts:3000-3006` says the targeted shared surface is re-validated "on the rewrite"; the actual barrier is each repair reader's own strict `normalizeOatConfig` (`config/oat-config.ts:1906`, `:1990`, `:2022`) — rewrite the comment.

## Acceptance Criteria

- Each listed item is either fixed or explicitly rejected with a reason in the closing note.
- No item changes accepted or rejected inputs (weaker-anywhere rule).
