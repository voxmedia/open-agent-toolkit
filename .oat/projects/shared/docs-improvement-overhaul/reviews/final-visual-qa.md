# Final visual QA

Recorded by Fable on 2026-10-02. Gates and the scripted tour ran on `e1c6b7d94`, the last commit that changes the site.

## Scope, stated honestly

- **What ran:** a scripted tour in Playwright Chromium on the Mac Mini against a static export of the built site, served over HTTP under the `/open-agent-toolkit` base path. Seven reader journeys, a crawl of every page reachable from Home, four diagrams in light and dark at 1440px and 390px, and a keyboard-focus pass.
- **Who ran it:** the same agent that drove the editorial work. It is not an independent review.
- **Laptop Zen:** confirmed only that the preview was reachable and that Home and Getting Started render in dark mode. The window held the user's own tabs, so the tour was moved to Playwright.
- **Not checked:** Safari and Firefox; a screen reader.
- **README on GitHub:** checked after push with the same Playwright setup. The adoption image loads and is legible in GitHub's light and dark themes at 1280px.

## Results

| Check                                                                                          | Result                                                                |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Pages crawled from Home                                                                        | 89, all HTTP 200                                                      |
| Exactly one H1 per page                                                                        | 89 of 89, after `7f508e58a` added four missing headings               |
| Horizontal overflow at 1440px                                                                  | none                                                                  |
| Horizontal overflow at 390px                                                                   | none                                                                  |
| Console or network errors                                                                      | only the 404s requested on purpose for old routes                     |
| Old routes (`cli-utilities/`, `guide/`, `guide/concepts/`, `quickstart/`, `workflows/skills/`) | 404 page with Home link and search                                    |
| Search for `oat-project-reconcile`                                                             | returns the Skills catalog and the Execution and Reconciliation guide |
| Keyboard focus                                                                                 | visible outline or ring on the first eight tab stops                  |
| Light and dark themes                                                                          | both render; warning callouts legible in both                         |

## Diagrams

Smallest rendered text, in CSS pixels:

| Diagram                                             | Desktop | 390px |
| --------------------------------------------------- | ------- | ----- |
| Adoption paths (`getting-started/concepts`)         | 16      | 8.4   |
| Sync and drift (`provider-sync/manifest-and-drift`) | 16      | 11.6  |
| Docs flow (`docs-tooling/workflows`)                | 16      | 10.8  |
| Ideas lifecycle (`workflows/ideas/lifecycle`)       | 16      | 7.7   |

The adoption diagram was 5.8px at 390px in a top-down layout; `e1c6b7d94` changed it to left-to-right. The ideas-lifecycle diagram is still hard to read on a phone. Every diagram has a text equivalent directly beside it, so no information depends on the image.

## Journeys

Each journey's clicks landed on the intended page, confirmed from the recorded URLs and screenshots. The script's automatic content assertions are not evidence: several read the previous page because they ran before client-side navigation finished, and report `MISSING` or `false` for content that is present. The presence of that content was confirmed separately by the crawl and by reading the pages.

1. Provider-sync-only install: Home → Provider Sync (home-directory warning in the first screen) → Pilot with One Team.
2. Project-free research: Skills → catalog → `compare` section with scenario and side effects.
3. Choose a workflow: Workflows → Choose a Workflow → Approvals and Automation.
4. Named lookup: search → `oat-project-reconcile`.
5. Docs maintenance: Docs Tooling → Docs Workflows, diagram rendered.
6. Remote planning: Workflows → Backlog and planning → Remote Project Management.
7. Old route: 404 with recovery.

## Gates on the same commit

All eight Definition-of-Done gates exit 0 on `e1c6b7d94`: `pnpm check`, `pnpm type-check`, `turbo run test --force` under an isolated HOME (11 tasks, 0 cached), `pnpm build`, `check:skill-bumps`, `release:check-versions` after fetching `origin/main`, `release:validate`, `pnpm build:docs`.
