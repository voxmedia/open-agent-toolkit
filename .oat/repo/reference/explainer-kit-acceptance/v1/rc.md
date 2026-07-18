# Explainer Kit v1 Release Candidate

## Frozen identity

- Code commit: `c485b784cf6c9269514b769d78c192fe4b80393f`
- RC ID: `sha256:a7f90d1ccf98d390389e32a11bb7a994db9e03b67fab475f26e16ee2ed395348`
- Identity record: `rc.json`
- Retained local artifacts: `dist/explainer-kit-rc/`
- Candidate changes reported by the builder: none

The retained tarballs are local, ignored build outputs. The tracked `rc.json`
record is the canonical release-candidate identity. No credentials, private
request content, environment values, or publish configuration are recorded
here.

## Packages

| Package                               | Version  | Retained artifact                               | SHA-256                                                            |
| ------------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `@open-agent-toolkit/cli`             | `0.1.74` | `open-agent-toolkit-cli-0.1.74.tgz`             | `de1989d9bdb35036219153516bb497f7033fe538935f815b68f406de9a65d9e3` |
| `@open-agent-toolkit/control-plane`   | `0.1.74` | `open-agent-toolkit-control-plane-0.1.74.tgz`   | `98ab857624401d2c39af4b7f3d5b285dce31adec1ba0466b84eb3ebc1eadba25` |
| `@open-agent-toolkit/docs-config`     | `0.1.74` | `open-agent-toolkit-docs-config-0.1.74.tgz`     | `f5333a7f37a82f1038de9b3ae4fad026961f861f02f0020923e413c1577d52f4` |
| `@open-agent-toolkit/docs-theme`      | `0.1.74` | `open-agent-toolkit-docs-theme-0.1.74.tgz`      | `262cb04fa41aa438403673cf02ad11be2854ee79f399bf297e63780e925b00a7` |
| `@open-agent-toolkit/docs-transforms` | `0.1.74` | `open-agent-toolkit-docs-transforms-0.1.74.tgz` | `a5fffbd78bf6e2571d93b1e38b6d2332dd4dc25838c4392c5d5c78bbfe66e220` |

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
