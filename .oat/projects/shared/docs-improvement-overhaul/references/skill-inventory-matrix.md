# Skill inventory matrix and sidebar probe (advisory, unverified in full)

Provenance: two read-only Opus 5.5 recon lanes dispatched by Fable (advisor) on
2026-10-01 against worktree `amphipod` @ `98d1d5246`. The lanes wrote no
artifact; this file is Fable's transcription of their returned reports.
Fable spot-checked only: the four `user-invocable: false` flags, absence of
seven skills from `workflows/skills/index.md`, the legacy note at :184,
`triage-oat-issues` `distribution: repository-only`, absence of `meta.*` and
`.source`, and the cited `apps/oat-docs/AGENTS.md` and
`docs-index-contract.md` lines. Everything else is the lane's reading.

Class is the lane's reading of each `SKILL.md` description and Prerequisites
prose; no machine-readable "no project needed" field exists. Pack membership is
from `packages/cli/src/commands/tools/shared/pack-manifest.ts:125-352`; "—"
means in no pack. Doc paths are relative to `apps/oat-docs/docs/`
(`skills/` = `workflows/skills/`, `projects/` = `workflows/projects/`,
`ideas/` = `workflows/ideas/`; bare filenames are under `cli-utilities/`).

## 1. Inventory (83)

| skill                              | class             | pack       | best existing page                               | note                                                            |
| ---------------------------------- | ----------------- | ---------- | ------------------------------------------------ | --------------------------------------------------------------- |
| analyze                            | standalone        | research   | skills/index.md:45; recon.md:28                  | one-liners                                                      |
| authoring-docs                     | standalone        | docs       | docs-tooling/workflows.md:24                     | general docs baseline                                           |
| codex-skill                        | internal          | —          | none (catalog only)                              | unshipped                                                       |
| compare                            | standalone        | research   | skills/index.md:46                               |                                                                 |
| create-agnostic-skill              | standalone        | utility    | contributing/skills.md                           | skill authors                                                   |
| create-oat-skill                   | internal          | —          | contributing/skills.md                           | contributor                                                     |
| create-pr-description              | internal          | —          | none                                             | works standalone, but unshipped                                 |
| create-ticket                      | internal          | —          | none                                             | only for the DWP Jira project (`create-ticket/SKILL.md:53`)     |
| deep-research                      | standalone        | research   | skills/index.md:43; recon.md:30                  |                                                                 |
| docs-completed-projects-gap-review | internal          | —          | none                                             | maintainer                                                      |
| explainer-kit                      | standalone        | utility    | skills/explainer-kit.md                          |                                                                 |
| oat-agent-instructions-analyze     | docs-lane         | docs       | docs-tooling/add-docs-to-a-repo.md               | one mention, no project needed                                  |
| oat-agent-instructions-apply       | docs-lane         | docs       | same                                             |                                                                 |
| oat-brainstorm                     | ambiguous         | brainstorm | tool-packs.md:949; ideas/lifecycle.md:28         |                                                                 |
| oat-cursor-cloud-projects          | ambiguous         | workflows  | projects/cursor-cloud.md                         | orientation only                                                |
| oat-dispatch-subagents             | internal          | utility    | tool-packs.md:40                                 | not user-invocable                                              |
| oat-docs                           | standalone        | core       | tool-packs.md:904                                |                                                                 |
| oat-docs-analyze                   | docs-lane         | docs       | docs-tooling/workflows.md                        |                                                                 |
| oat-docs-apply                     | docs-lane         | docs       | same                                             |                                                                 |
| oat-docs-authoring                 | standalone        | docs       | docs-tooling/workflows.md:24                     | needs an OAT docs app                                           |
| oat-docs-bootstrap                 | docs-lane         | docs       | docs-tooling/add-docs-to-a-repo.md               |                                                                 |
| oat-doctor                         | standalone        | core       | config-and-local-state.md:293                    |                                                                 |
| oat-explainer-kit                  | ambiguous         | workflows  | skills/explainer-kit.md                          |                                                                 |
| oat-idea-ideate                    | lifecycle-idea    | ideas      | ideas/lifecycle.md                               |                                                                 |
| oat-idea-new                       | lifecycle-idea    | ideas      | ideas/lifecycle.md                               | entry point                                                     |
| oat-idea-scratchpad                | lifecycle-idea    | ideas      | ideas/lifecycle.md                               |                                                                 |
| oat-idea-summarize                 | lifecycle-idea    | ideas      | ideas/lifecycle.md                               |                                                                 |
| oat-pjm-add-backlog-item           | pjm               | pm         | skills/index.md:31 only                          |                                                                 |
| oat-pjm-decision                   | pjm               | pm         | config-and-local-state.md:101 (CLI)              | skill mentioned once                                            |
| oat-pjm-remote                     | pjm               | pm         | skills/index.md:52; remote-project-management.md |                                                                 |
| oat-pjm-review-backlog             | pjm               | pm         | skills/index.md:32 only                          |                                                                 |
| oat-pjm-update-repo-reference      | pjm               | pm         | projects/lifecycle.md:21                         | chained from project-document                                   |
| oat-project-autonomous             | lifecycle-project | workflows  | projects/autonomy.md                             |                                                                 |
| oat-project-capture                | lifecycle-project | workflows  | projects/lifecycle.md                            | entry, no project needed                                        |
| oat-project-clear-active           | lifecycle-project | workflows  | none                                             | name appears in Skills index catalog only                       |
| oat-project-complete               | lifecycle-project | workflows  | projects/lifecycle.md                            |                                                                 |
| oat-project-design                 | lifecycle-project | workflows  | projects/design-modes.md                         |                                                                 |
| oat-project-discover               | lifecycle-project | workflows  | projects/lifecycle.md                            |                                                                 |
| oat-project-dispatch-subagents     | internal          | workflows  | projects/orchestration-model.md                  | not user-invocable                                              |
| oat-project-document               | lifecycle-project | workflows  | projects/lifecycle.md                            |                                                                 |
| oat-project-implement              | lifecycle-project | workflows  | projects/lifecycle.md; workflow-gates.md         |                                                                 |
| oat-project-import-plan            | lifecycle-project | workflows  | projects/lifecycle.md                            | entry; creates a project if none is active (`SKILL.md:107-116`) |
| oat-project-lite                   | lifecycle-project | workflows  | projects/lifecycle.md                            | entry                                                           |
| oat-project-new                    | lifecycle-project | workflows  | projects/lifecycle.md                            | entry                                                           |
| oat-project-next                   | lifecycle-project | workflows  | projects/picking-up-projects.md                  |                                                                 |
| oat-project-open                   | lifecycle-project | workflows  | none (index only)                                |                                                                 |
| oat-project-plan                   | lifecycle-project | workflows  | projects/lifecycle.md                            |                                                                 |
| oat-project-plan-writing           | internal          | workflows  | none                                             | not user-invocable                                              |
| oat-project-pr-final               | lifecycle-project | workflows  | projects/pr-flow.md                              |                                                                 |
| oat-project-pr-progress            | lifecycle-project | workflows  | projects/pr-flow.md                              |                                                                 |
| oat-project-progress               | lifecycle-project | workflows  | projects/picking-up-projects.md:42               |                                                                 |
| oat-project-promote-spec-driven    | lifecycle-project | workflows  | projects/lifecycle.md                            |                                                                 |
| oat-project-quick-start            | lifecycle-project | workflows  | projects/lifecycle.md                            | entry                                                           |
| oat-project-reconcile              | lifecycle-project | workflows  | none                                             | name appears in Skills index catalog only                       |
| oat-project-retro                  | lifecycle-project | workflows  | projects/retro.md                                |                                                                 |
| oat-project-retro-file             | lifecycle-project | workflows  | projects/retro.md                                |                                                                 |
| oat-project-review-provide         | lifecycle-project | workflows  | projects/reviews.md                              |                                                                 |
| oat-project-review-provide-remote  | lifecycle-project | workflows  | projects/reviews.md:73                           |                                                                 |
| oat-project-review-receive         | lifecycle-project | workflows  | projects/reviews.md                              |                                                                 |
| oat-project-review-receive-remote  | lifecycle-project | workflows  | projects/reviews.md                              |                                                                 |
| oat-project-revise                 | lifecycle-project | workflows  | projects/lifecycle.md; pr-flow.md                |                                                                 |
| oat-project-spec                   | lifecycle-project | workflows  | projects/lifecycle.md (one line)                 |                                                                 |
| oat-project-split                  | lifecycle-project | workflows  | projects/splitting.md                            | also runs from a brainstorm (`SKILL.md:23`)                     |
| oat-project-summary                | lifecycle-project | workflows  | projects/lifecycle.md; artifacts.md              |                                                                 |
| oat-repo-improve                   | standalone        | utility    | skills/repo-improve.md                           | feeds import-plan                                               |
| oat-repo-knowledge-index           | standalone        | workflows  | none (catalog only)                              |                                                                 |
| oat-repo-maintainability-review    | standalone        | utility    | repo-improve.md:15                               |                                                                 |
| oat-review-provide                 | standalone        | utility    | projects/reviews.md:44                           | ad-hoc twin                                                     |
| oat-review-provide-remote          | standalone        | utility    | projects/reviews.md:44                           |                                                                 |
| oat-review-receive                 | standalone        | utility    | projects/reviews.md:44                           |                                                                 |
| oat-review-receive-remote          | standalone        | utility    | projects/reviews.md:44                           |                                                                 |
| oat-wave-execute                   | lifecycle-wave    | workflows  | workflows/wave-workflows.md                      |                                                                 |
| oat-wave-program                   | lifecycle-wave    | workflows  | workflows/wave-workflows.md                      |                                                                 |
| oat-worktree-bootstrap             | ambiguous         | workflows  | projects/implementation-execution.md             |                                                                 |
| oat-worktree-bootstrap-auto        | internal          | workflows  | implementation-execution.md:441                  | not user-invocable                                              |
| oat-wrap-up                        | standalone        | workflows  | configuration.md:104 (config key)                | reads summaries across projects                                 |
| recon                              | standalone        | research   | skills/recon.md                                  | standalone per recon.md:18                                      |
| review-backlog                     | internal          | —          | skills/index.md:184                              | retired                                                         |
| skeptic                            | standalone        | research   | skills/index.md:47                               |                                                                 |
| subagent-orchestration             | standalone        | utility    | tool-packs.md:40; skills/index.md:38             |                                                                 |
| synthesize                         | standalone        | research   | skills/index.md:48                               |                                                                 |
| triage-oat-issues                  | internal          | —          | none                                             | repository-only (frontmatter `distribution`)                    |
| update-repo-reference              | internal          | —          | skills/index.md:184                              | retired                                                         |

## 2. Counts

21 standalone, 30 lifecycle-project, 4 lifecycle-idea, 2 lifecycle-wave,
5 docs-lane, 5 pjm, 12 internal, 4 ambiguous = 83.

Ambiguous:

- `oat-brainstorm`: no project dependency, but starts idea, backlog and split
  flows and can fold results into an active project (`oat-brainstorm/SKILL.md:303`).
- `oat-explainer-kit`: directly callable and called from lifecycle steps; covers
  project recaps and wave program recaps (`SKILL.md:46`).
- `oat-worktree-bootstrap`: active project optional (`SKILL.md:90`).
- `oat-cursor-cloud-projects`: orientation only (`SKILL.md:29`).

Structural breaks in a standalone-vs-lifecycle split:

- Entry skills (new, quick-start, lite, import-plan, capture) run with no
  active project.
- Project-free multi-step chains: docs bootstrap → analyze → apply;
  agent-instructions analyze → apply; maintainability-review → repo-improve →
  import-plan.
- Review twins (4 ad-hoc, 4 project) are documented together at
  `projects/reviews.md:44`.
- Packs do not map to classes (workflows pack ships `oat-wrap-up`,
  `oat-repo-knowledge-index`).

Unknown: whether `create-pr-description`, `codex-skill`, `create-ticket` are
intentionally repo-only or omitted from the pack manifest.

## 3. Catalog drift (`workflows/skills/index.md:86-178`)

- Not mentioned anywhere on the page (10): oat-cursor-cloud-projects,
  oat-dispatch-subagents, oat-docs, oat-doctor, oat-pjm-decision,
  oat-project-autonomous, oat-project-dispatch-subagents, oat-project-revise,
  oat-project-summary, triage-oat-issues.
- Only in the legacy note at :184 (2): review-backlog, update-repo-reference.
- Catalog names with no matching directory: none.

## 4. Standalone guide-readiness

- Already have a page: explainer-kit, recon, oat-repo-improve.
- Solid section elsewhere: 4 oat-review-\* (reviews.md:44-84), oat-doctor
  (config-and-local-state.md:293, tool-packs.md:904), authoring-docs and
  oat-docs-authoring (docs-tooling/workflows.md:24).
- Partial: oat-docs (tool-packs.md:904), subagent-orchestration (tool-packs.md:40).
- One-line mention only: analyze, compare, deep-research, skeptic, synthesize,
  oat-repo-maintainability-review, oat-wrap-up, create-agnostic-skill.
- Catalog entry only: oat-repo-knowledge-index.

## 5. Sidebar probe

Method: installed fumadocs-core 16.10.2 page-tree builder run in memory against
the real docs files with a simplified frontmatter parse; no build, nothing
written. `<fc>` = `fumadocs-core/dist/loader-DrgsG18J.js`.

- `apps/oat-docs/lib/source.ts:4-7` calls `loader()` with no sort option;
  `packages/docs-config/src/source-config.ts:24` only sets `./docs`.
- Default sort `<fc>:276, 370-378`: index first, files by path, then folders.
  Titles from frontmatter `title` (`<fc>:542`).
- `oat docs nav sync` (`packages/cli/src/commands/docs/nav/contents.ts:139-203`)
  writes only `mkdocs.yml` (`nav/sync.ts:73-83`). `generate-index` sorts by
  path (`index-generate/generator.ts:261-273`) and never reads Contents.
- Rendered top level: Home, Quickstart, cli-utilities, contributing,
  docs-tooling, guide, provider-sync, reference, workflows.
- Rendered `workflows/`: wave-workflows, ideas, projects, skills.
- Rendered `workflows/projects/`: alphabetical by filename (artifacts,
  autonomy, cursor-cloud, design-modes, dispatch-ceiling, evidence-layers,
  hill-checkpoints, implementation-execution, lifecycle, …, state-machine).
- Rendered `workflows/skills/`: Explainer Kit, Recon, Repo Improve
  (cross-section Contents entries not rendered).
- Rendered `cli-utilities/`: backlog-lifecycle, bootstrap,
  config-and-local-state, configuration, project-log,
  remote-project-management, tool-packs, workflow-gates.
- Fumadocs `meta.json` `pages` supports link items `[Title](/path)`
  (`<fc>:261, 380-397`) and separators `---Label---` (`<fc>:262, 398-412`);
  listing a page by path moves it to one owner (`<fc>:319-343, 454`). Whether
  a `../` path in `pages` resolves was not checked.
- Not determined: browser render, full build, non-default locale collation.
