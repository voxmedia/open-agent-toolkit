# Independent finished-site native visual QA

## Provenance and limits

- Built source: `c0f10a8f8d3a05cd9ac4d1f2265e8bb0f7e7c697` on `amphipod`; `pnpm build:docs` exited 0. Turbo reused four dependency tasks; two docs-app tasks actually executed. Build log: `/tmp/docs-overhaul-resume-build.log`.
- Server and display: Mac mini, `tstang-mini.local`; local static export at `http://127.0.0.1:54571/open-agent-toolkit/`. Browser: dedicated native Zen window, operated through `cua_repl`, not Playwright or an HTTP-only reader.
- Reviewer: root Codex, not the Fable author of phases 3–6 and the later theme changes. Root authored earlier navigation/migration work; this is independent of the finished editorial/theme author, not a claim that root authored no part of the project. The separate final native source reviewer authored none of these changes.
- Desktop screenshots: 1880×925 window capture. Firefox Responsive Design Mode controls requested 390×844, DPR 1; actual CSS viewport dimensions were not independently measured. Site light/dark modes were switched through its visible theme control.
- Screenshots are in `../references/native-final-qa/`. This is a bounded human-style tour, not an exhaustive route crawl, screen-reader audit or new persona evaluation. Failed intermediate navigation/index attempts were corrected and are not counted as passes.

## Journeys

| Journey                        | Actual actions and observed result                                                                                                                                                                                          | Evidence                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Provider-sync-only adoption    | Home → Provider Sync → team pilot. Explicit project scope, home-directory/all-scope warning and generated-view overwrite warning are visible; workflow adoption is not required.                                            | `01-home-dark.png`, `02-provider-warning-dark.png`                                      |
| Project-free research          | Skills catalog → Compare link. The canonical anchor opens with prerequisite, example scenario and next-step guidance, without requiring an active project.                                                                  | `03-compare-anchor-dark.png`                                                            |
| Choose/start a workflow        | Workflows → Choose a Workflow → approvals guidance. Mode comparison and automatic commit/push/publication warnings are readable. The late brainstorm pointer belongs to Skills rather than creating another workflow owner. | `04-approvals-light.png`                                                                |
| Named reconciliation lookup    | Keyboard search for `oat-project-reconcile` → execution/reconciliation result. Search returns the owner and its anchor; the guide describes state reconciliation, side effects and a scenario.                              | `05-reconcile-search-light.png`, `06-reconcile-guide-light.png`                         |
| Docs bootstrap and maintenance | Docs Tooling → workflows → typical flow. Bootstrap, plain-Markdown/site alternatives, analyze, approval and apply are rendered as a Mermaid diagram with adjacent text.                                                     | `07-docs-flow-light.png`, `08-docs-flow-lower-light.png`, `09-docs-flow-lower-dark.png` |
| Remote backlog planning        | Workflows → Backlog and planning → Remote Project Management. Binding choices, read-only defaults and write/overwrite cautions are visible.                                                                                 | `10-remote-planning-dark.png`                                                           |
| Retired-route recovery         | Directly opened `/guide/concepts`; observed useful 404 rather than an alias. Home recovery is visible and Search opens its dialog.                                                                                          | `11-old-route-recovery-dark.png`                                                        |

## Visuals and narrow layout

All four docs Mermaid diagrams rendered without an error placeholder in both themes: adoption (`12`–`13`), docs flow (`07`–`09`), provider drift (`14`–`16`) and ideas (`17`–`18`). Native screenshots record the visible diagram portions rather than claiming every node was separately inspected. Adjacent textual equivalents remain available. No desktop text clipping or unreadable theme contrast was observed in the inspected regions.

Ideas was also inspected in narrow responsive mode, with the navigation drawer and theme controls operated (`19`–`21`). Its diagram text is too small to use comfortably on a phone-sized view; the existing residual remains open, not fixed by this tour. The adjacent prose is readable. No general WCAG certification is implied.

The actual published branch README was opened at `https://github.com/voxmedia/open-agent-toolkit/blob/amphipod/README.md`. Its SVG was inspected in two scroll positions in each theme, including all four cards and the scope/invocation text equivalent (`22`–`25`). There was no clipping or overflow. GitHub's logged-out appearance menu offered contrast rather than a theme selector; Zen's visible Website appearance preference was temporarily switched from Dark to Light, and restored to Dark with the selected radio button verified. This supplies independent actual GitHub light and dark evidence without changing OS or account settings.

## Bounded correction supplement

After the main tour, p06-t06 landed at `bf7c157c953080f12b033b2999e25ce8f5d58c65`; p06-t07's prepared, uncommitted one-row prose correction was rebuilt with `pnpm build:docs`, exit 0, all six tasks executed, before its required smoke. Root explicitly loaded `/provider-sync/manifest-and-drift/#choosing-a-stray-disposition`, read the complete Adopt row and inspected it in light and dark (`26`–`27`). The Cursor/Copilot exception is visible and the table has no observed clipping. Root returned smoke PASS before the author committed `64a48da1e699b587feef4b6a7fcf1fcbd0ee1d86`; that commit contains the same inspected row only. Build log: `/tmp/docs-final-fixes-build.log`.

## Outcome

The seven journeys, inspected site light/dark visual treatments and actual GitHub light/dark README rendering pass this bounded native tour. Phone-width ideas legibility remains an explicitly recorded residual. This supplements, rather than relabels, the earlier non-independent author QA at `e1c6b7d94`. No user waiver of independent QA, final review, final approval, merge or release is inferred.
