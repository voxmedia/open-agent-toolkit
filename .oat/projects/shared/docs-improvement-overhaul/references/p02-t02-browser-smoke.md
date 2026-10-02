# p02-t02 Mini Browser Smoke

## Provenance

- Performed 2026-10-02 on the Mini through the available native `mcp__cua_repl` executor, using the dedicated existing Zen docs tab; no laptop control.
- Served the current checkout's `apps/oat-docs/out` through `serve-export.mjs`, bound to `127.0.0.1:54824` only, with `/open-agent-toolkit/` deployment base path and the built 404 fallback.
- Build: `pnpm build:docs`, exit 0, six executed tasks, zero cached tasks. Exact build-log/source hashes are in `p02-t02-verification.json`; route and search hashes are in `p02-t02-export-search.json`.
- Source baseline: `8b78d9a935b31ef50e65713b03a022a5d022aa59`. Approved map SHA256: `ff02a3ebec2373f88cb47917bd6aeafeb35149b7e9680e768d0a4e0a5674a438`.
- Screenshot: `p02-t02-browser-home.jpg`, SHA256 `685c6deafa5875e565c7e8e952b961da50831055f28285abda3a8fd7574afcb5`. CUA captured with `emit:false`; `sips --cropToHeightWidth 823 1600 --cropOffset 100 280` cropped the 1880×923 native image to the docs viewport. The temporary uncropped image was removed; no pinned tabs, private browser chrome or authentication URLs are retained in this artifact.
- Screenshot URL: `http://127.0.0.1:54824/open-agent-toolkit/`. Native AX observations after actions confirmed the rendered page; subsequent state outputs were filtered to docs content.

## Executed Actions

| Action                                        | Actual URL under the loopback base                             | Observed result                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open Home                                     | `/`                                                            | Home H1, seven sidebar labels and seven body Contents links in approved order.                                                                                                    |
| Click Workflows                               | `/workflows/`                                                  | Choose a Workflow, Projects, Ideas Workflow, Backlog and planning, Waves and Advanced are real sidebar families.                                                                  |
| Click Projects                                | `/workflows/projects/`                                         | Projects H1; Lifecycle, Reviews, Planning, Execution and Closeout; body Project Artifacts and State Machine links.                                                                |
| Click Execution                               | `/workflows/projects/execution/`                               | Project Log, Implementation Execution and Picking Up a Project Contents links.                                                                                                    |
| Click Project Log                             | `/workflows/projects/execution/project-log/`                   | Project Log H1, retained headings and Workflows → Projects → Execution breadcrumbs.                                                                                               |
| Click leaf Workflow Gates link                | `/workflows/advanced/workflow-gates/#project-log-finalization` | Canonical Advanced owner and Workflow Gates H1; the clicked link retained its fragment. Specific fragment scroll alignment is not claimed.                                        |
| Open retired Project Log URL                  | `/cli-utilities/project-log/`                                  | Page Not Found H1, Home link and Search documentation button; no redirect or alias.                                                                                               |
| Click Search documentation, enter Project Log | retired URL while search dialog open                           | Existing search dialog returned Home → Workflows → Projects → Execution Project Log.                                                                                              |
| Click canonical search result                 | `/workflows/projects/execution/project-log/`                   | Canonical moved page and Project Log H1 rendered.                                                                                                                                 |
| Open Skills                                   | `/skills/`                                                     | Skills H1; only Explainer Kit, Repo Improve and Recon Evidence Packets in the owned sidebar; Writing Skills, Docs Workflows and Repository PR Comment Analysis in body discovery. |
| Click body Docs Workflows                     | `/docs-tooling/workflows/`                                     | Docs Workflows H1 with Docs Tooling breadcrumb.                                                                                                                                   |
| Open Choose a Workflow                        | `/workflows/choose-workflow/`                                  | Approved Choose a Workflow H1, Workflow Modes In Practice heading and canonical Projects body link.                                                                               |
| Return Home and capture                       | `/`                                                            | Seven labels and Contents rendered; cropped screenshot inspected before retention.                                                                                                |

This is the required author Mini hierarchy/moved-leaf/recovery smoke, not final independent Fable QA. Mobile layout, theme permutations, diagrams, browser-console audit and p06 editorial cleanup are not claimed.
