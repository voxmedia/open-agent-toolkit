# P24 source verification prototype

Public synthetic evidence only. This implements Outcome 10/P24 as judgment in
`oat-docs-analyze` plus the read-only `oat docs literals` occurrence helper;
there is no new checker rule or config schema. No surveyed/private repository
was inspected. Detailed probes, commands and outputs remain in ignored
`analysis/p08/`; canonical CLI acceptance controls live in
`packages/cli/src/commands/docs/literals/literals.test.ts` (repository-relative).

## Prototype and fixed controls

The readiness probe used the existing Markdown AST, Contents parser, exclusion
matcher and strict entity decoder. Exact, named and numeric entity literals
matched; once-decoded double encoding, wrong case, generated-only stale copy,
JS escapes and interpolated runtime text did not. Fences and prose concepts
produced no inline-code candidate. Partial/comment occurrences demonstrated why
found is not a runtime verdict. The command acceptance tests add real argument,
global JSON/cwd, exit, matching app/content-root, renamed-page, source inventory,
reader exclusion, symlink, binary/non-UTF8 and containment controls. Invalid
selected inputs fail; contained valid controls pass. Non-triad invocations with
invalid selections return not-applicable before those inputs are read. This is
new-feature acceptance evidence, not a claim that a prior checker enforced P24.

Reproduce from the repository root:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/literals
```

## Manual six-check walkthrough

This is a manual reasoning walkthrough by the implementer over an authored
public synthetic fixture, **not an autonomous-agent evaluation**. Fixture paths
below are relative to the ignored `analysis/p08/verification/manual-synthetic/`.
The accepted synthetic `decisions/ia.md:3–6`, local
`manual/contributing.md:3–5` and `.oat/config.json` agree on triad. The mirror
lists QA before Engineering before Product; roles come from prose, not order.
A conflicting mirror or missing acceptance would stop these assessments as
unverified/ask_user while ordinary analysis continues. A grouped flat record
without feature peers would instead record not applicable; it would not acquire
invented directories.

| Assessment           | Manual result and evidence                                                                                                                                                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slug parity          | `experience/save.md`, `verify/save.md` and `build/features/save.md` share `save`. `build/domains/storage.md` is explicitly a shared domain contract, so hybrid Engineering produces no missing peer finding. Removing the mapping would leave this unverified/ask_user.                                                       |
| Paired documentation | Product `:6–8` and Engineering `:5–7` link to the correct peers and existing `save` / `scope` anchors. QA `verify/save.md:3–5` links to Product and Engineering under Scope: accepted canonical pairing. A heading or unrelated resolving page would not suffice; missing anchors would be a finding.                         |
| Literals / concepts  | Real CLI output finds Product `:3` at `src/ui.ts:1`; the documented decoded label agrees with canonical synthetic copy. Prose explains workspace as a concept; backticked `workspace concept` at `:4` remains ambiguous/unverified, requiring clarification. Not-found alone is not contradiction.                            |
| Registry             | The actual synthetic registry `src/test-ids.ts:1` contains exact member `save-action`, matching QA `:6`. `save-action-old` is absent and contradicts the stated locator against this registry. With the registry absent or ambiguous, membership would be unverified/ask_user, even if arbitrary source contained the string. |
| Scoped scenarios     | QA `:12–13` repeats SAVE-1 with identical feature/seed alpha/desktop/online Given+When and differing succeeds/fails Then: unresolved duplicate and contradiction candidates. `:14` has seed beta/mobile/offline and queues: explained scope difference, no automatic contradiction.                                           |
| Raw Contents         | `manual/index.md:6` links to `contributing/templates/example.md`, explicitly drafting material and excluded by nonReaderPaths. Flag the authored reader link even though nav/check exclusions hide its target.                                                                                                                |

These findings retain existing docs/source citations, harm-based severity and
recommendation approval classes. This walkthrough tests the documented reasoning
against fixed examples; it does not measure agent reliability or infer a real
repository registry/scenario format.

## Limits

One strict HTML entity decode per inline-code value and physical source line;
case-sensitive substring matching, first lexical file/physical line. CommonMark
may normalize multiline spans; the shared parser's observed multiline value is
preserved, and source matching never crosses a physical line. No whitespace or
Unicode folding, JS escapes, interpolation, i18n or runtime evaluation. Comments,
dead code and longer values can match; source relevance remains judgment.
Explicit narrow implementation roots/exclusions keep docs/generated/fixture
matches out of the chosen evidence scope. Skipped symlink/binary/non-UTF8 paths
and searched files are visible; unreadable traversal and empty effective source
inventory are input errors. This is bounded source selection, not a generic
permission framework. Missing mapping, source or registry remains unverified.
