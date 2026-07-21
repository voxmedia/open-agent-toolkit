# Revision 1 W6 Acceptance

## Scope

This record captures the sanitized first-consumer acceptance of the packaged
explainer revision against the retained Wave 6 project recap inputs. Execution
used a copied working fixture; the restored source archive remained read-only.

## Candidate Identity

| Component                     | Identity                                                                  |
| ----------------------------- | ------------------------------------------------------------------------- |
| Source commit                 | `aa74980faf91223b506e8e58eaac300bc8d74802`                                |
| Candidate identity            | `sha256:4f76f60800e1e9224963b919987eb0e679955e36a8a6a9e05f4cf1401d49af9a` |
| CLI package                   | `@open-agent-toolkit/cli@0.2.10`                                          |
| CLI tarball SHA-256           | `c47edfe19e70f69446ad1c076be43ec29616d54f000778c03f71eac780d209a9`        |
| Control-plane package         | `@open-agent-toolkit/control-plane@0.2.10`                                |
| Control-plane tarball SHA-256 | `e71ff657be1f51849421398a1120b1ffa3b09c61115af32e99a796be693f30e8`        |
| Core skill                    | `explainer-kit@1.0.2`                                                     |
| Adapter skill                 | `oat-explainer-kit@1.0.1`                                                 |
| Recipe                        | `project-recap@1`                                                         |
| Curated style                 | `clean-neutral`                                                           |

The candidate was installed into an isolated temporary consumer from the two
recorded tarballs. `oat --version` and the installed package manifest both
reported `0.2.10`.

## Retained Inputs

The sanitized supplied fact base cited three restored Wave 6 lifecycle inputs.
Their hashes matched before and after acceptance:

| Input               | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `plan.md`           | `333044f28ea6a72e65861378fad940ef6f8af7b0727bbee653b65950b332ab11` |
| `implementation.md` | `c89e5112a2c5eafc836de49759de06793fd431ec6a97843f966698cc6adedf0d` |
| `summary.md`        | `d402b7ee7cd29c5360aeb9a5f9ce22de9dc9abf28a0fb18b01dbd397db39dec2` |

The complete restored archive contained 18 files and retained the same
path-and-byte composite SHA-256 before and after acceptance:
`c8d48555b552c714596f1caa5ee84c60e4900b2fbafa251a46561f80e6ab503c`.

## Authored Recap

- Run ID: `run-b384ae83-b499-4c95-b317-9ac120cbb3c4`
- Outcome: `built-not-durable`
- Approval: `approved`
- Warnings: none
- Authored sections: six exact recipe sections
- Author ID: `w6-acceptance-provider-neutral-author`
- Author method: `structured-evidence-synthesis`
- Author model label: `provider-neutral-author-module/v1`
- Generated output in copied fixture:
  `.oat/projects/archived/wave-6-execution/explainers/wave-6-execution-recap`
- Verified archive export:
  `.oat/repo/reference/project-recaps/20260721-wave-6-execution`

The authored result contains section-specific prose for the original request,
key agent decisions, as-built architecture, implementation record, validation
evidence, and outcome. Each section was checked for substantive narrative
length, and the retained author result preserves non-secret provenance.

## Hash and Visual Verification

The manifest covered exactly eight immutable package paths. Every recorded
immutable hash was recomputed from the serialized file bytes and matched.
Rendered artifact consistency also passed:

| Evidence                   | SHA-256                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| Canonical fact-base object | `1c1a526b9a593b1dbb7241abf83699c32a36affaf2857bf92717d9f5ec815f49` |
| Serialized fact-base bytes | `965a985fa2cd7880b5729696f064064eae8cc5826b30ada01f2016e6db3bf2ad` |
| Canonical theme object     | `483ad6f5121e8645f454feefbf8547e11c995fa9ad23343cd1ccfd43f487801f` |
| Serialized theme bytes     | `82c4bf82ac817bb8c04c83bb971d2c2b22aa621384689fb4e0d0fa3a62498f27` |
| Rendered recap HTML        | `29d0ee984291c5577ba145619acb92a97a464bd40fdcfdb7791751c2dd762d78` |

The distinct canonical and serialized hashes exercise the intended contract:
canonical hashes identify normalized objects, while `immutableHashes` verifies
the actual retained bytes. Validate, fact-base, content, theme, render, and QA
stages all passed. Durability and publication were intentionally skipped by the
acceptance request. Repository visual validation separately passed all 65
measurements.

## Archive Result

The packaged command
`oat project archive --project-recap-run explainers/wave-6-execution-recap`
completed successfully against the copied fixture. It:

- moved only the copied active project to its fixture archive;
- exported only the selected recap package;
- verified eight immutable artifacts;
- produced no warnings;
- preserved byte-equivalence between the selected run and exported recap; and
- made no changes to the restored source archive.

## Verification

The following gates passed serially:

- targeted archive regression: 44 tests;
- packaged-layout smoke: 4 tests;
- private-wrapper compatibility smoke: 2 tests;
- isolated prior timeout regression: 18 tests;
- `pnpm format`;
- `pnpm lint`;
- `pnpm type-check`;
- `pnpm test` (including 3,284 CLI tests plus repository
  smoke tests); and
- `pnpm release:validate` for all five public packages and the 65-measurement
  visual gate.

The archive regression also retains negative coverage proving that omitted
immutable paths are rejected.
