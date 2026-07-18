# Explainer Kit v1 Release Candidate

## Frozen identity

- Code commit: `534a408eed0080bcf653a6dde3abc1dd612f0ccb`
- RC ID: `sha256:f212d630a2e1f8dfeb42f7d1aa4a4522f485848143dd43a702313c792050b854`
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
| `@open-agent-toolkit/cli`             | `0.2.1` | `open-agent-toolkit-cli-0.2.1.tgz`             | `3229470321f278183158e320380c93a05d06081b4a74007fe91cd8dbf755d5dc` |
| `@open-agent-toolkit/control-plane`   | `0.2.1` | `open-agent-toolkit-control-plane-0.2.1.tgz`   | `6ebfcde0d79e26de137578c6b8955ab9f20b5f2dda23daf3d371a8b107f2ca76` |
| `@open-agent-toolkit/docs-config`     | `0.2.1` | `open-agent-toolkit-docs-config-0.2.1.tgz`     | `6677634b3ff32b488688d25433cb125758b64ffc357f7260842067da998f5695` |
| `@open-agent-toolkit/docs-theme`      | `0.2.1` | `open-agent-toolkit-docs-theme-0.2.1.tgz`      | `efa30129492972206949a00411114482198c8353d002acb229eedf47e853c60e` |
| `@open-agent-toolkit/docs-transforms` | `0.2.1` | `open-agent-toolkit-docs-transforms-0.2.1.tgz` | `0bce3e640bceacfeb565f1efdc905ffda2fe70f9fe8a2060927398197f5ae79a` |

## Skills

| Skill               | Version | Bundled path                              | Tree SHA-256                                                       |
| ------------------- | ------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `explainer-kit`     | `1.0.0` | `package/assets/skills/explainer-kit`     | `58579e5c02d284168e2245e1ef1cd6b1cb49f2dd82ee3eeedec4e4170e8a48da` |
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
| `project-explainer` | `1`     | `explainer-kit.recipe/v1` | `recipes/project-explainer.json` | `0202736cccacc5b9f7a26c6783148aadcc6ad66e7dc9f78e85fc133127651535` |
| `project-recap`     | `1`     | `explainer-kit.recipe/v1` | `recipes/project-recap.json`     | `1881b9a7ff9e4d4afcbe1ca96df5e396f32017fec0d44af16390f208112c2866` |

## Operator notes

This candidate was refrozen after wave promotion reconciliation. It supersedes
the prior tracked RC
`sha256:a7f90d1ccf98d390389e32a11bb7a994db9e03b67fab475f26e16ee2ed395348`
at code commit `c485b784cf6c9269514b769d78c192fe4b80393f`. External acceptance must use the
new RC ID and retained `0.2.1` package tarballs; evidence for the superseded RC
does not apply.

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
