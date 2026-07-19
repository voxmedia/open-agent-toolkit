# Explainer Kit v1 Release Candidate

## Frozen identity

- Code commit: `da1e7a713adac4743368addf206aa780a94871ba`
- RC ID: `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`
- Identity record: `rc.json`
- Retained local artifacts: `dist/explainer-kit-rc/`
- Candidate changes reported by the builder: none

The retained tarballs are local, ignored build outputs. The tracked `rc.json`
record is the canonical release-candidate identity. No credentials, private
request content, environment values, or publish configuration are recorded
here.

## Packages

| Package                               | Version | Retained artifact                              | SHA-256                                                            |
| ------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `@open-agent-toolkit/cli`             | `0.2.3` | `open-agent-toolkit-cli-0.2.3.tgz`             | `dc1f2d82885f21d2aa649330c6b6f75962e79e689f47138aafb539caae5793b1` |
| `@open-agent-toolkit/control-plane`   | `0.2.3` | `open-agent-toolkit-control-plane-0.2.3.tgz`   | `59a708f7caae17b8255aecf9659152c588578b5ef7a4892ecb48bc78664ea0f5` |
| `@open-agent-toolkit/docs-config`     | `0.2.3` | `open-agent-toolkit-docs-config-0.2.3.tgz`     | `3b9d42d38a29be41fe3cca8a8ed3fc4606f7688035d2c85355c65934353dbd0f` |
| `@open-agent-toolkit/docs-theme`      | `0.2.3` | `open-agent-toolkit-docs-theme-0.2.3.tgz`      | `493993025bd639909200695a499fd8bb4d2edc192563c05dbfdbbdf90236c9b0` |
| `@open-agent-toolkit/docs-transforms` | `0.2.3` | `open-agent-toolkit-docs-transforms-0.2.3.tgz` | `a77344ba084e3c267ddf485febd280661e9487e4ff5b29b07753869250f7a2dd` |

## Skills

| Skill               | Version | Bundled path                              | Tree SHA-256                                                       |
| ------------------- | ------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `explainer-kit`     | `1.0.0` | `package/assets/skills/explainer-kit`     | `ea933187cfca91d475770391f49fd93446153fb1a69a41c54087ea8c977fa03a` |
| `oat-explainer-kit` | `1.0.0` | `package/assets/skills/oat-explainer-kit` | `2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654` |

## Schemas

| Schema ID                              | Bundled path                              | SHA-256                                                            |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `explainer-kit.build-record/v1`        | `schemas/build-record.schema.json`        | `42127bb527b0471c167370b74777d6b27228ab1ae4000cbf377ca8ccbd21be89` |
| `explainer-kit.durability-evidence/v1` | `schemas/durability-evidence.schema.json` | `4ffbccdd0892cf6d823379c03105d2f4407dec1015ae5ccad35c3e5d0a740c78` |
| `explainer-kit.fact-base/v1`           | `schemas/fact-base.schema.json`           | `3481220c807f4c7879d9b9c8f0e37079b0b4b28d0834fb636b4c76d13ab9b476` |
| `explainer-kit.manifest/v1`            | `schemas/manifest.schema.json`            | `a3ba804ef0e35618d2245e1838ad97fd7b017a6d4a11f271c151990bf8aea5d9` |
| `explainer-kit.publish-receipt/v1`     | `schemas/publish-receipt.schema.json`     | `c6fd4c0f33842f04da8b9077b03998c11b90e436183b8d5c0ca7a658c86d45c1` |
| `explainer-kit.publish-request/v1`     | `schemas/publish-request.schema.json`     | `41197c9a16f22ee5696480676a1c6c7649eeec1c674b30f5fd3331f00b60a845` |
| `explainer-kit.run-request/v1`         | `schemas/run-request.schema.json`         | `ae07ca6485130b7359888e3d5afe164e5faa8cb42f8739599c8f53093e0a6ff1` |
| `explainer-kit.theme/v1`               | `schemas/theme.schema.json`               | `f2a6959eb834146596bd5264f2cfc7d48584e5408625d028a92c8400f45808ca` |

## Recipes

| Recipe ID           | Version | Schema version            | Bundled path                     | SHA-256                                                            |
| ------------------- | ------- | ------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `engineer-tour`     | `1`     | `explainer-kit.recipe/v1` | `recipes/engineer-tour.json`     | `041a1c5201d7e72c0aef8a097c0389088001ac0cc11fede9e8b8c64f477be0fd` |
| `program-recap`     | `1`     | `explainer-kit.recipe/v1` | `recipes/program-recap.json`     | `705ed786fff8f4af69542ac326257fc52de466229a60fe164bd42b4f64a51274` |
| `project-explainer` | `1`     | `explainer-kit.recipe/v1` | `recipes/project-explainer.json` | `0202736cccacc5b9f7a26c6783148aadcc6ad66e7dc9f78e85fc133127651535` |
| `project-recap`     | `1`     | `explainer-kit.recipe/v1` | `recipes/project-recap.json`     | `1881b9a7ff9e4d4afcbe1ca96df5e396f32017fec0d44af16390f208112c2866` |

## Operator notes

This final candidate was refrozen after PR #161/p06 reconciliation. It
supersedes RC
`sha256:f212d630a2e1f8dfeb42f7d1aa4a4522f485848143dd43a702313c792050b854`
at code commit `534a408eed0080bcf653a6dde3abc1dd612f0ccb`. External acceptance must use the
new RC ID and retained `0.2.3` package tarballs; evidence for the superseded RC
does not apply.

The operator-owned wrapper runbook must pin:

```json
{
  "rcId": "sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb",
  "commit": "da1e7a713adac4743368addf206aa780a94871ba",
  "subtreeSha256": "sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654"
}
```

Two same-machine builds produced byte-identical records and all five tarballs.
A cache-bypassed Mini rebuild matched four package tarballs, every archive
entry, 1,254 of 1,257 CLI file hashes, both skill subtrees, all eight schemas,
and all four recipes. The only differences were ordering within three generated
`.d.ts` files: one string-literal union, inferred Zod object properties, and one
effort union. Node `22.17.0`, pnpm `10.13.1`, and TypeScript `5.9.3` matched;
runtime JavaScript and declaration maps were byte-identical.

The cross-machine difference is therefore recorded as semantically benign
declaration-emission ordering outside the explainer surfaces. It does not
change the frozen identity: acceptance must consume the exact retained
`dc1f2d82…93b1` CLI tarball bytes and verify the `2cf98952…b654`
`oat-explainer-kit` subtree, rather than substitute a rebuilt whole tarball.
Normalized Mini evidence is tracked on `origin/wave-skills-promotion` at
`36e98b05`.

## Operator verification

Build and freeze the candidate:

```bash
pnpm release:validate
node tools/release/build-explainer-rc.mjs \
  --output dist/explainer-kit-rc \
  --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.json
```

Rebuild the unchanged candidate and compare its identity:

```bash
node tools/release/build-explainer-rc.mjs \
  --output dist/explainer-kit-rc \
  --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json
cmp \
  .oat/repo/reference/explainer-kit-acceptance/v1/rc.json \
  .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json
rm .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json
```

Verify retained tarballs against `rc.json` before external acceptance:

```bash
shasum -a 256 dist/explainer-kit-rc/*.tgz
```
