# Phase p01 Browser Smoke

## Provenance

- Date: 2026-10-01; implementer-owned smoke, not independent phase review or final browser QA.
- Source HEAD: `4973e8c37640a3f2339a584eacfa87e991d44c12` plus the uncommitted p01-t03 guidance/versioned-skill diff. The eventual task commit did not exist when this export was built.
- Build: `pnpm exec turbo run build --filter=oat-docs --force`, exit 0; all six build tasks executed, none replayed. Log: `/tmp/docs-p01-t03-build.log`.
- Export: `/Users/tstang/orca/workspaces/open-agent-toolkit/amphipod/apps/oat-docs/out`.
- Execution/display host: native Mini, `tstang-mini.local`, ComputerName `tstang-mini`; local Zen PID 435, executable `/Applications/Zen.app/Contents/MacOS/zen`.
- Computer-use capability: actual `mcp__cua_repl` native application API, bound with `cua.getApp('app.zen-browser.zen')`. No laptop relay, scripted desktop input, or Playwright substitution for visual proof.
- Viewport: native window screenshot 1880 × 923, desktop dark theme. Retained PNGs crop to the 1620 × 843 documentation area, excluding unrelated native browser chrome/tabs.
- Preview URL: `http://100.98.33.81:65263/open-agent-toolkit/`.
- Root-owned server: `node /tmp/oat-docs-preview-server.mjs /Users/tstang/orca/workspaces/open-agent-toolkit/amphipod/apps/oat-docs/out 100.98.33.81`; PID 61724, execution session 38210. Script SHA-256: `5397b794b7cd98eb57246888747d3d152665d4b473c4b7ad059e1a57c774a104`.
- Server binds only Mini tailnet IP, selects its available port, serves exported files/file.html/directory indexes under `/open-agent-toolkit/`, and returns real 404s without SPA fallback. Independent smoke `curl` checks returned home 200 and `/p01-missing-route-control/` 404.

## Performed Native Actions

Every action was followed by a fresh native accessibility observation before choosing subsequent targets. Screenshots were captured with native `getScreenshot`, cropped, and visually inspected.

| Action                                                            | Observed result                                                                                                                                                                                                                             | Evidence                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Reload preview home through native Zen `super+r`                  | Root landing appears once. Authored sidebar order is OAT Documentation, Quickstart, User Guide, Provider Sync, Agentic Workflows, Docs Tooling, CLI Utilities, Contributing, Reference. Current User Guide prominence remains unchanged.    | [Home](p01-browser-smoke/home.png)                               |
| Click Agentic Workflows sidebar link                              | `/workflows/` landing appears once; children remain Ideas Workflow, Workflow & Projects, Wave Workflows, Skills in authored order. Footer follows canonical traversal, not body cross-links.                                                | Fresh native AX observation                                      |
| Click Workflow & Projects sidebar link                            | `/workflows/projects/` displays Agentic Workflows breadcrumb, Workflow & Projects title, and repaired full HiLL label in the owned sidebar.                                                                                                 | Fresh native AX observation                                      |
| Click Human-in-the-Loop Lifecycle (HiLL) Checkpoints sidebar link | Canonical breadcrumbs are Agentic Workflows → Workflow & Projects. Frontmatter title and sidebar label agree; wrapped label remains readable.                                                                                               | [HiLL breadcrumbs](p01-browser-smoke/hill-breadcrumbs.png)       |
| Scroll HiLL article to footer                                     | Previous is Design Modes; next is Dispatch Policy, matching physical-parent Contents ordering. Neither fragments nor cross-family links become traversal stops.                                                                             | [HiLL neighbours](p01-browser-smoke/hill-neighbours.png)         |
| Click actual next-page Dispatch Policy footer card                | Dispatch Policy renders with canonical Agentic Workflows → Workflow & Projects breadcrumbs.                                                                                                                                                 | Fresh native AX observation                                      |
| Click Skills sidebar link                                         | Skills landing has Agentic Workflows breadcrumb. Writing Skills and Docs Workflows remain readable body Contents links but are absent from Skills sidebar children; owned children are Explainer Kit, Repo Improve, Recon Evidence Packets. | [Skills family links](p01-browser-smoke/skills-family-links.png) |
| Click Writing Skills body Contents link                           | `/contributing/skills/` renders Writing Skills with canonical Contributing breadcrumb, not Skills ancestry.                                                                                                                                 | [Family destination](p01-browser-smoke/family-destination.png)   |

Observed links use `/open-agent-toolkit/` exactly once, including sidebar, body links, breadcrumbs, and footer cards. Actual native clicks reached the intended pages. No visible broken-page/error state or horizontal overflow appeared in this bounded desktop smoke. Devtools console was not inspected; no clean-console claim is made.

## Automated Companion Evidence

- `pnpm docs:validate`: exit 0, source-only navigation and source-route/anchor validation.
- `pnpm docs:test`: exit 0, four executed self-contained real MDX/installed-loader tests; no app output fixture dependency.
- `pnpm test:skills`: exit 0, 660 executed tests after canonical bundle regeneration.
- `pnpm oat:validate-skills`: exit 0, 65 canonical skills validated.
- `pnpm lint`: exit 0, six executed and four cached Turbo tasks, followed by successful root oxlint pass.
- `pnpm format`: exit 0. Generated metadata/sidecar excluded from write formatting.
- `pnpm docs:check-links --url http://100.98.33.81:65263/open-agent-toolkit/ --no-external --output .oat/projects/shared/docs-improvement-overhaul/reviews/p01-browser-smoke/link-check.json`: exit 0; 70 pages crawled, 848 links checked, zero broken. Companion exported-site report retained alongside screenshots. This automated crawl is separate from native visual proof.

The initial crawl launch failed because the installed Playwright headless-shell binary was absent. `pnpm exec playwright install chromium` exited 0 and installed the matching official binary; the same command was rerun without a source change. This was runtime fixture preparation, not code recovery.

## Scope and Handoff

This smoke verifies the current p01 foundation only. It does not claim deployed acceptance, mobile/light-theme coverage, a whole-site independent tour, catalog correctness before p04, or later migration/persona/editorial outcomes. Root owns the independent phase review, release closure gates, and subsequent phase scheduling.
