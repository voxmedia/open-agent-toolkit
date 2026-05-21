# Resume Dogfood

Date: 2026-05-21

## Scenario

Resume was exercised in a temporary OAT repo so Phase 5 would not add undeclared tracked project artifacts beyond this note.

Partial split:

- Parent: `dogfood-resume-partial-split`
- Existing child before resume: `dogfood-resume-foundation`
- Missing child before resume: `dogfood-resume-docs`

The partial state was created by calling the real `writeCoordinationParent` helper and then `seedChildren` for only the foundation child. That simulates an interruption during child seeding while preserving the full `references/split-plan.json` document on the coordination parent.

## Commands Exercised

```bash
pnpm exec tsx --tsconfig packages/cli/tsconfig.json /tmp/oat-resume-setup.ts /tmp/oat-resume-dogfood-mttWtE "$PWD"
pnpm run cli -- --cwd /tmp/oat-resume-dogfood-mttWtE project split run --plan-file /tmp/oat-resume-dogfood-mttWtE/.oat/projects/shared/dogfood-resume-partial-split/references/split-plan.json --resume
```

## Evidence

The resume command printed:

```text
Recovered partial split plan:
Parent: .oat/projects/shared/dogfood-resume-partial-split
Children: dogfood-resume-foundation, dogfood-resume-docs
Missing children: dogfood-resume-docs
Dependencies: dogfood-resume-foundation -> none; dogfood-resume-docs -> dogfood-resume-foundation
Active child: dogfood-resume-foundation
Split completed.
```

Post-resume checks:

- Missing child `dogfood-resume-docs` was created with `state.md`, `discovery.md`, `plan.md`, and `implementation.md`.
- `dogfood-resume-docs/discovery.md` contains the required split seed sections and `oat_inherited_context_revalidated: false`.
- Parent `state.md` reached `oat_kind: coordination`, `oat_phase: decomposition`, and `oat_phase_status: complete`.
- `.oat/config.local.json.activeProject` in the temp repo points to `.oat/projects/shared/dogfood-resume-foundation`.

## Limitations

This did not use a live Ctrl-C interruption in the middle of one CLI process. The interruption was constructed at the helper boundary with the real parent writer and child seeder so the resume CLI saw the same durable partial state: a coordination parent with a full `references/split-plan.json` and a missing child directory.

## Followups / Rough Edges

- The same stale coordination-parent `state.md` body wording observed in declared dogfood is present after resume: the frontmatter and filesystem are correct, but the prose still describes ordinary quick-mode execution artifacts.
- Resume preview wording is useful and correctly surfaces missing children and dependencies.
