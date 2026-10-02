# README adoption illustration (draft, revision 3)

File: `readme-adoption.svg`. It replaces the Mermaid block under `## Capability Layers` in `README.md`, lines 15-19.

Revision history:

- **Revision 2** added `oat init` to the Workflows and Docs cards, showed skills as `/name` in a separate light "skill" box, and added a "pick providers" step to Provider Sync.
- **Revision 3** (reader safety): every command now carries an explicit `--scope`. A bare `oat init`, `oat sync` or `oat tools install` defaults to scope `all`, which also writes under the reader's home directory. The "Agentic Workflows" card is renamed "Workflows". The Reusable Skills description now says "for all your repos", to match `--scope user`.

## 1. Embed snippet

Final path: `.github/assets/readme/adoption.svg`. From the repo-root `README.md`:

```markdown
![Four independent OAT starting points shown as equal cards. Provider Sync: oat init --scope project, pick providers, then oat sync --scope project. Reusable Skills: oat tools install --scope user. Workflows: oat init --scope project, oat tools install workflows --scope project, then the /oat-project-quick-start skill in your agent. Docs Tooling: oat init --scope project, oat tools install docs --scope project, then the /oat-docs-bootstrap skill in your agent. Use one alone, or add others any time.](.github/assets/readme/adoption.svg)
```

Suggested integration, which is outside this file's scope:

- Rename `## Capability Layers` (`README.md:13`) to something like `## Choose a Starting Point`.
- Replace `README.md:21` with the text equivalent below.

## 2. Text equivalent (place under the image)

Start with any one. Each works on its own.

These commands assume the `oat` CLI is installed. `--scope project` keeps changes inside the repository, while `--scope user` installs for you across all your repositories. Dark boxes are terminal commands. Items written as `/name` are agent skills that you invoke in your coding agent, not shell commands.

- **Provider Sync:** define skills and rules once and sync them across providers. Run `oat init --scope project`, choose your providers when prompted, then run `oat sync --scope project`.
- **Reusable Skills:** research, review and idea skills for all your repositories. No `oat init` is needed. Run `oat tools install --scope user`.
- **Workflows:** tracked, resumable projects with plans, reviews and PRs. Run `oat init --scope project`, then `oat tools install workflows --scope project`, then invoke `/oat-project-quick-start` in your agent. New projects default to the synced project scope, which needs a Git remote named `origin`. In a repository without one, the first `/oat-project-quick-start` fails until you add a remote or configure a different project scope.
- **Docs Tooling:** bootstrap and maintain a docs site for your repository. Run `oat init --scope project`, then `oat tools install docs --scope project`, then invoke `/oat-docs-bootstrap` in your agent.

Use one alone, or add others any time.

## 3. Citations

Paths are repo-relative to the `amphipod` worktree. Revision 3 did not re-read the repository: the worktree is mid-merge. File line numbers below come from reads made before the merge began and may shift after it. Two kinds of evidence come from the coordinator's independent verifier instead: the `--scope` flags (installed CLI help) and the `origin` behavior.

| Label or claim                                                                                                                                                                             | Evidence                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading "Start with any one. Each works on its own."                                                                                                                                       | `apps/oat-docs/docs/getting-started/quickstart.md:88`; `apps/oat-docs/docs/index.md:10`, `:34`; `apps/oat-docs/docs/provider-sync/index.md:12`; `apps/oat-docs/docs/workflows/choose-workflow.md:10`                                                                                                             |
| `--scope project` / `--scope user` flags (choices project, user, all; default all) on `oat init`, `oat sync`, `oat tools install`, `oat tools install workflows`, `oat tools install docs` | Verifier: installed CLI `--help` for each command. Scope model: `apps/oat-docs/docs/getting-started/concepts.md:50`                                                                                                                                                                                              |
| A bare command (scope `all`) also writes under home, hence explicit scopes                                                                                                                 | Verifier finding; `apps/oat-docs/docs/getting-started/concepts.md:50` (`all` evaluates project and user)                                                                                                                                                                                                         |
| Card name "Provider Sync"                                                                                                                                                                  | `apps/oat-docs/docs/provider-sync/index.md:2`, `:8`; `apps/oat-docs/docs/getting-started/quickstart.md:23`                                                                                                                                                                                                       |
| "Define skills and rules once, sync them across providers"                                                                                                                                 | `README.md:7-8`; `apps/oat-docs/docs/provider-sync/index.md:8-10`; `apps/oat-docs/docs/getting-started/quickstart.md:25`; `apps/oat-docs/docs/getting-started/concepts.md:20`                                                                                                                                    |
| `oat init --scope project` / `# pick providers`                                                                                                                                            | `apps/oat-docs/docs/provider-sync/index.md:52-54`; `packages/cli/src/commands/init/index.ts:989-1003` (interactive provider prompt), `:985-987` with `packages/cli/src/commands/shared/messages.ts:1-2` (non-interactive `oat providers set` hint); verifier: `oat sync` does nothing until a provider is chosen |
| `oat sync --scope project`                                                                                                                                                                 | `apps/oat-docs/docs/provider-sync/index.md:55`; `apps/oat-docs/docs/provider-sync/commands.md:24`                                                                                                                                                                                                                |
| Card name "Reusable Skills"                                                                                                                                                                | `apps/oat-docs/docs/index.md:13`, `:31`; `apps/oat-docs/docs/getting-started/concepts.md:8`                                                                                                                                                                                                                      |
| "Research, review and idea skills"                                                                                                                                                         | `packages/cli/src/commands/tools/shared/pack-manifest.ts:322-329`, `:278-289`, `:187-192`; `apps/oat-docs/docs/skills/index.md:24`, `:41-47`                                                                                                                                                                     |
| "for all your repos" / `oat tools install --scope user`, no `oat init`                                                                                                                     | `apps/oat-docs/docs/getting-started/tool-packs.md:710-714`, `:737` (a user-only install needs no Git repository), `:887` (`--scope user` form); `apps/oat-docs/docs/getting-started/concepts.md:50` (user scope targets user-level installations); verifier                                                      |
| Card name "Workflows"                                                                                                                                                                      | `apps/oat-docs/docs/index.md:20` ("Workflows" section); `apps/oat-docs/docs/workflows/choose-workflow.md:2`                                                                                                                                                                                                      |
| "Tracked, resumable projects with plans, reviews and PRs"                                                                                                                                  | `apps/oat-docs/docs/getting-started/quickstart.md:39`, `:44`; `apps/oat-docs/docs/index.md:14`; `README.md:11`                                                                                                                                                                                                   |
| Workflows needs `oat init` first                                                                                                                                                           | `.agents/skills/oat-project-quick-start/SKILL.md:17-19`                                                                                                                                                                                                                                                          |
| `oat tools install workflows --scope project`                                                                                                                                              | `apps/oat-docs/docs/getting-started/tool-packs.md:79`, `:719`; `packages/cli/src/commands/tools/shared/pack-manifest.ts:227`; verifier                                                                                                                                                                           |
| `/oat-project-quick-start` (skill)                                                                                                                                                         | `packages/cli/src/commands/tools/shared/pack-manifest.ts:148`; `packages/cli/src/commands/init/index.ts:930`; `apps/oat-docs/docs/skills/index.md:18`                                                                                                                                                            |
| Text equivalent only: quick-start needs an `origin` remote under the default synced project scope                                                                                          | `packages/cli/src/commands/shared/project-scope.ts:171-196` (per the coordinator; not read by me); verifier reproduced `oat project new` failing without `origin` and succeeding with it                                                                                                                         |
| Card name "Docs Tooling"                                                                                                                                                                   | `apps/oat-docs/docs/docs-tooling/index.md:2`, `:8`; `apps/oat-docs/docs/getting-started/quickstart.md:51`                                                                                                                                                                                                        |
| "Bootstrap and maintain a docs site for your repo"                                                                                                                                         | `apps/oat-docs/docs/docs-tooling/index.md:8`, `:24`; `apps/oat-docs/docs/getting-started/quickstart.md:53`                                                                                                                                                                                                       |
| Docs needs `oat init` first                                                                                                                                                                | `.agents/skills/oat-docs-bootstrap/SKILL.md:16-18`; `apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md:21-27` (step 1 is `oat init --scope project`)                                                                                                                                                         |
| `oat tools install docs --scope project`                                                                                                                                                   | `apps/oat-docs/docs/getting-started/tool-packs.md:944`; `packages/cli/src/commands/tools/shared/pack-manifest.ts:208`; verifier                                                                                                                                                                                  |
| `/oat-docs-bootstrap` (skill)                                                                                                                                                              | `packages/cli/src/commands/tools/shared/pack-manifest.ts:219`; `apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md:58-64` (shows `/oat-docs-bootstrap` at `:61`)                                                                                                                                              |
| Skills shown as `/name`, apart from shell commands                                                                                                                                         | `apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md:61`; `apps/oat-docs/docs/getting-started/concepts.md:59`                                                                                                                                                                                                  |
| Plus sign and footer "Use one alone, or add others any time."                                                                                                                              | `apps/oat-docs/docs/getting-started/quickstart.md:88`; `apps/oat-docs/docs/getting-started/tool-packs.md:721` (installs are additive)                                                                                                                                                                            |
| No arrows between cards                                                                                                                                                                    | `apps/oat-docs/docs/index.md:10`, `:34`; `apps/oat-docs/docs/provider-sync/index.md:12`                                                                                                                                                                                                                          |

## 4. Contrast (WCAG 2.x relative luminance)

| Element                                                         | Foreground                                    | Background | Ratio                       |
| --------------------------------------------------------------- | --------------------------------------------- | ---------- | --------------------------- |
| Heading text on panel                                           | `#1f2328`                                     | `#f7f5f0`  | 14.50:1                     |
| Footer text on panel                                            | `#4b535d`                                     | `#f7f5f0`  | 7.15:1                      |
| Card names on card                                              | `#1f2328`                                     | `#ffffff`  | 15.80:1                     |
| Benefit lines on card                                           | `#4b535d`                                     | `#ffffff`  | 7.79:1                      |
| Commands on terminal box                                        | `#f6f8fa`                                     | `#1f2328`  | 14.84:1                     |
| `# pick providers` comment on terminal box                      | `#b6bec8`                                     | `#1f2328`  | 8.42:1                      |
| Skill name on skill box                                         | `#1f2328`                                     | `#eef1f5`  | 13.94:1                     |
| "skill" label on skill box                                      | `#4b535d`                                     | `#eef1f5`  | 6.88:1                      |
| Plus glyph on disc                                              | `#1f2328`                                     | `#ffffff`  | 15.80:1                     |
| Panel edge vs white page                                        | `#6e7781`                                     | `#ffffff`  | 4.55:1                      |
| Panel edge vs GitHub dark page                                  | `#6e7781`                                     | `#0d1117`  | 4.16:1                      |
| Panel fill vs GitHub dark page                                  | `#f7f5f0`                                     | `#0d1117`  | 17.37:1                     |
| Panel fill vs white page (the edge stroke carries the boundary) | `#f7f5f0`                                     | `#ffffff`  | 1.09:1                      |
| Skill-box outline vs card (decorative)                          | `#8c959f`                                     | `#ffffff`  | 3.04:1                      |
| Accent bands vs card (decorative, no text)                      | `#0f766e` / `#1f5fbf` / `#6f42c1` / `#a35200` | `#ffffff`  | 5.47 / 6.09 / 6.51 / 5.58:1 |

All text pairs pass AA (4.5:1). The panel is opaque, and the file has no `currentColor`, media queries, opacity, links or embedded images.

## 5. Verification

Verified by rendering:

- `xmllint --noout` exited 0.
- `rsvg-convert` 2.62.3 rendered four PNGs, each viewed: 830 px and 360 px wide, each on `#ffffff` and on `#0d1117`.
- At 830 px nothing is clipped, overlaps or overflows. The widest line is `oat tools install --scope user`, which ends about 16 px inside its box. The two install lines in the bottom row wrap with a shell continuation (`\`) onto an indented `--scope project` line. Skill names keep a clear gap before the right-aligned "skill" label. The panel edge is visible on both page colors.
- At 360 px the heading and card names are readable. Benefit lines are about 8.6 px. Commands and skill names are about 7.8 px: legible but small, so the text equivalent must sit under the image.

Fit changes:

- Monospace dropped from 21 to 20. That was needed for `oat tools install --scope user` (30 characters) to fit on one line with a safe margin.
- Terminal and skill boxes widened from 386 to 394 units. Text inset dropped from 16 to 14.
- Cards grew from 272 to 302 units tall. All four stay the same size. The viewBox is now 920×776, about 1.19:1.
- Sans text sizes are unchanged.

Not verified:

- GitHub's own rendering (camo proxy, browser).
- Windows and Linux font fallbacks. Generic 0.6 em monospace puts the 30-character line at 360 of 380 available units.
- How a screen reader announces the image.
- I did not run the CLI. The scope flags, their default and the `origin` failure come from the coordinator's verifier.

## 6. Notes, caveats and conflicts

1. **`core` pack scope.** Even with `--scope project`, the `core` pack installs at user scope; per the pack table it allows only user scope (`apps/oat-docs/docs/getting-started/tool-packs.md`, "Bundled packs at a glance"). So `oat init --scope project` and the project-scoped installs may still write the `core` pack under the reader's home directory. The image and text equivalent do not mention this.
2. **The `origin` requirement** is in the text equivalent only, not in the image. A reader who skips the text and runs `/oat-project-quick-start` in a repository with no `origin` will hit the failure.
3. **README wording.** `README.md:13` ("Capability Layers"), `:21` ("adopt any layer") and `:11` ("on top") still frame the capabilities as layers. So does `concepts.md:66-74` ("These layers stack"). The README Quick Start (`README.md:25-42`) uses `pnpm run cli -- ...` without scopes. `pnpm run cli -- init --scope project` is scoped, but `status --scope all` and `sync --scope all` at `:29` and `:34` deliberately touch user scope. That is not wrong, but it differs from the image's project-only advice.
4. **The sibling docs-site diagram (`01-adoption-paths.md`) is stale.** It uses unscoped commands. It has no provider-choice step and no `oat init` on the workflows and docs paths. Its skills appear without a leading slash. Its lane is named "Agentic Workflows" (also the quickstart lane title, `quickstart.md:37`), where this image now says "Workflows".
5. **Three capabilities or four starting points.** README and `index.md:10-14` name three capabilities. This image shows four starting points: Docs Tooling is its own card, and Reusable Skills stands in for the quickstart's "CLI Utilities" lane.
6. **"Each works on its own."** Three cards begin with `oat init --scope project`. That is setup, not adopting provider sync. `oat tools install` also auto-syncs provider views unless you pass `--no-sync` (`tool-packs.md:743`).
7. **Within-card dependency.** The `research` pack pulls in utility assets (`pack-manifest.ts:337-345`). This dependency stays inside the Reusable Skills card.
