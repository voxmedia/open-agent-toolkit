---
title: Use OAT Skills in Hosted Amp
description: Copy selected bundled OAT skills into Amp personal or workspace repositories while preserving their source owner and execution prerequisites.
---

# Use OAT Skills in Hosted Amp

Use this guide to prepare selected OAT skills for Amp's hosted personal or
workspace skills repository. OAT remains the canonical owner; the hosted
repository holds a distribution copy. OAT does not currently have an Amp sync
adapter or a verified Amp path for its managed agent roles.

## Choose the right skill location

Amp reads project skills from `.agents/skills/`. An OAT project installation can
therefore supply that discovery layout without adding an Amp provider to OAT.
Hosted repositories use a different layout: each skill must be an immediate
child of the repository root, with `SKILL.md` directly inside it and matching
directory/frontmatter names.

For example, a hosted copy of `authoring-docs` looks like:

```text
<hosted-skills-repository>/
└── authoring-docs/
    ├── SKILL.md
    └── references/
```

Do not copy an OAT checkout, `.agents/`, or an enclosing `skills/` directory
into the hosted root. Machine-local installation is also distinct from a hosted
personal import. See Amp's [Skills](https://ampcode.com/docs/customize/skills)
and [Global Plugins & Skills](https://ampcode.com/docs/customize/global-plugins-and-skills)
documentation for its location and scope contracts.

## Start with a small selection

These two bundled skills are suitable starting points based on static inspection:

| Skill            | Intended task                                                         | Prerequisites                                                                                             |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `authoring-docs` | Write or improve technical documentation from evidence.               | Access to the target files and its documentation tools; retain all eight reference files.                 |
| `synthesize`     | Reconcile existing analysis artifacts, or return an inline synthesis. | At least two suitable inputs for the normal path, readable files, and a writable destination when saving. |

Neither requires OAT CLI execution or native agent dispatch for those tasks.
Use a natural-language request naming the skill; do not assume another host's
slash-command syntax works in Amp. For example: “Use authoring-docs to improve
this repository's setup guide using its actual package scripts.”

This is a static suitability assessment, not a live Amp discovery or execution
test. Inspect the loaded instructions and exercise the intended task in your
own environment before sharing more broadly.

## Obtain complete bundled directories

OAT authors skills under `.agents/skills/`. The CLI bundles a declared subset
under `assets/skills/` in its package. In a built OAT checkout that directory is
`packages/cli/assets/skills/`; `packages/cli/scripts/bundle-inputs.mjs` declares
the shipped selection. The bundler dereferences shared-resource symlinks and
excludes each skill's `tests/` directory. Provider-generated views are not
authoring sources.

Use the complete skill directory from a chosen CLI package version or a built
OAT checkout. To build a checkout, follow the
[contributor setup](../contributing/code.md). Record the package version and,
for a source build, commit SHA. Copying raw source symlinks into a standalone
hosted repository can leave their targets outside the copy. Preserve scripts,
templates, and references; reducing a skill to `SKILL.md` can break it.

For the starting selection above, set these paths to an existing bundle and
your cloned hosted repository. This example refuses to replace an existing
skill and only prepares local files:

```bash
OAT_BUNDLED_SKILLS=/path/to/cli-package/assets/skills
AMP_HOSTED_SKILLS=/path/to/hosted-skills-checkout

(
  set -eu
  test -d "$OAT_BUNDLED_SKILLS"
  test -d "$AMP_HOSTED_SKILLS/.git" || test -f "$AMP_HOSTED_SKILLS/.git"
  for skill in authoring-docs synthesize; do
    test -f "$OAT_BUNDLED_SKILLS/$skill/SKILL.md"
    if test -e "$AMP_HOSTED_SKILLS/$skill" || test -L "$AMP_HOSTED_SKILLS/$skill"; then
      echo "Review the existing $skill before replacing it." >&2
      exit 1
    fi
  done
  for skill in authoring-docs synthesize; do
    cp -R "$OAT_BUNDLED_SKILLS/$skill" "$AMP_HOSTED_SKILLS/$skill"
  done
)
```

Retain applicable license and attribution material, including OAT's
`NOTICES.md` for skills that incorporate attributed material.

## Import, verify, and update

1. Start in a personal hosted repository. Ask Amp to copy the selected project
   skills into personal skills, or use `amp skills repositories` and
   `amp clone user-skills` for direct Git access. Workspace administrators can
   use `amp clone workspace-skills` for the shared scope.
2. Review the complete prepared diff and the limits below before committing
   and pushing. Pushing publishes the hosted copy; the preparation example
   above does not publish anything.
3. Open a new Amp thread or ask the current thread to reload its skills. Ask
   it to list each skill and its source, then load the intended copy. Local
   and built-in names take precedence over hosted names; personal hosted
   names take precedence over workspace hosted names. Listing in a separate
   shell does not reload an existing thread.
4. Run a small representative task and check its required resources. A listed
   skill proves discovery, not CLI availability, resource resolution, or
   workflow execution.

An Amp shared-skill URL can be imported into a personal or workspace repository
through Amp; it is distinct from OAT's upstream GitHub URL. For shared imports,
Amp records provenance and supports `amp skill update <name>` from the hosted
checkout. Review, commit, and push updates to publish them.

For a direct OAT bundle copy, keep an explicit record of the upstream version
and selection. Obtain a newer bundle, compare each complete directory, reconcile
local changes, and review the update before publication. Do not assume Amp's
shared-import updater tracks a manual copy, or that `oat sync` / `oat tools
update` publishes to hosted repositories. Make upstream corrections in OAT's
canonical skill, then refresh the distribution copy deliberately.

## Check hosted limits

Amp's official limits, checked on 2026-10-04, apply separately to each hosted
personal/workspace repository:

| Resource                              | Maximum |
| ------------------------------------- | ------- |
| Skills per repository                 | 200     |
| Files per skill, including `SKILL.md` | 200     |
| One file                              | 10 MiB  |
| One skill                             | 25 MiB  |
| Entire repository                     | 25 MiB  |

Hosted files must be text. A push above the skill count can succeed while only
the first 200 skill directories alphabetically are considered; other limits
can reduce the available set further. Count the destination's existing content
as well as the new selection. Do not remove required resources to fit a limit.

At OAT commit `6ec5313b91e2595893eb89bb6372c028c0284ab4` (CLI `0.3.16`), the
generated skill payload contained 76 skills, 279 text files, and 5,306,288 bytes
(about 5.06 MiB). Its maximum was 49 files in one skill, 580,860 bytes for one
skill, and 319,771 bytes for one file. Names matched directories and there were
no duplicate names or symlinks in that payload. It fits these static limits;
recheck the chosen version and the complete destination before an import.

## Keep execution prerequisites explicit

| Capability                              | What the hosted copy still needs                                                                                                                                                                                                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill discovery                         | Correct hosted layout, accepted text resources, and the intended name/source selected in the thread.                                                                                                                                                                                                                                          |
| CLI-backed workflows                    | A compatible `oat` executable in the environment running commands; templates, `.oat/scripts`, config, and project artifacts required by the chosen workflow. These are separate CLI/project assets, not supplied by copying a skill. See [CLI Bootstrap](../getting-started/bootstrap.md) and [Tool Packs](../getting-started/tool-packs.md). |
| Sibling skills                          | The dependency's actual files at a path the skill can resolve. For example, saved `compare` results and `analyze` artifacts need `deep-research` schema files; a hosted listing alone does not prove sibling filesystem access.                                                                                                               |
| Helper scripts and integrations         | The script's runtime, tools, filesystem access, credentials, and approved side effects in the execution environment. Text-only packaging does not provide these.                                                                                                                                                                              |
| Native mapper and managed-role dispatch | A verified host route that can select the requested role and target. OAT has no verified Amp route for `oat-codebase-mapper`, phase implementers, or reviewers.                                                                                                                                                                               |

In particular, `oat-repo-knowledge-index` requests the native
`oat-codebase-mapper` role. Importing its Markdown does not install or register
that role in Amp. Do not invoke it on existing knowledge outputs until its
required dispatch capability is established. The separate preflight defect is
tracked in [OAT issue #355](https://github.com/voxmedia/open-agent-toolkit/issues/355).
Managed implementation/review and orchestration skills likewise remain outside
the verified Amp compatibility boundary.

OAT's provider-specific frontmatter, role files, and tool names are not an Amp
execution contract. Keep the small instruction-based selection separate from
those workflows until their prerequisites and host behavior are verified.
