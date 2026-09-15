# Flow fixture inputs

These files are byte copies of live repository artifacts, taken from commit
`8845103ec48625ce8a24f52e4d3986db8e52105d` — the same commit recorded as the
source content commit inside `../program-recap.html`:

- `2026-08-31-execution-program.md`
  ← `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- `summaries/20260909-wave-6-execution.md`
  ← `.oat/repo/reference/project-summaries/20260909-wave-6-execution.md`
- `summaries/20260909-wave-7-execution.md`
  ← `.oat/repo/reference/project-summaries/20260909-wave-7-execution.md`

`flow.e2e.test.mjs` reads these copies instead of the live PJM artifacts. The
authored page `../program-recap.html` observes the anchor ledger derived from
this exact content, so editing the live artifacts must not be able to break the
flow suite. Refresh these copies only alongside a re-authored `program-recap.html`,
and update the commit recorded above and in that page.
