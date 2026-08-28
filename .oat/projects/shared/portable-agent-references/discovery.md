---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-08-28
oat_generated: false
---

# Discovery: portable-agent-references

## Initial Request

Create a quick-workflow follow-up to the merged
`portable-skill-references` project. Port the remaining user-default workflow
agents and utility dispatch surface away from executable repository-relative
sibling reads, then remove the validation exemption that currently preserves
the phase implementer's bare paths. Broaden the regression ratchet in the same
project so every user-default skill and agent is checked for executable
cross-skill `SKILL.md` and `references/*.md` reads, and port every live
violation the stronger rule exposes.

The project starts from merged `origin/main` on
`feat/portable-agent-references`.

## Request Classification

**Well-understood.** The independent exit review for PR #226 identified the
exact residual surfaces and the existing portable resolver supplies the
behavioral model. Reconnaissance resolved the one uncertainty: OAT does not
provide a reliable loaded-agent source path across Codex, Claude, and Cursor,
so agent instructions cannot safely derive a sibling skills root from their
materialized file location.

**Design depth:** lightweight draft design, selected by the user after the
global ratchet scope was accepted. The design records the distinct skill and
agent resolver contracts plus the manifest-driven ratchet boundary before task
planning.

## Chosen Direction

Use two related resolver contracts:

1. The loaded `oat-dispatch-subagents` skill keeps the established loaded-skill,
   user-scope, then project-scope resolution order for its cross-skill
   dependency.
2. The materialized `oat-phase-implementer` and `oat-reviewer` agents resolve
   each required sibling independently from user scope, then project scope.
   They do not invent an `${AGENT_DIR}` or depend on provider-specific
   materialization paths.

Every resolver validates the exact `SKILL.md` or reference file it needs,
names the owning pack on failure, provides install/update recovery for the
intended scope, and stops before dispatch instead of using ambient discovery.

Generalize the shipped portability ratchet across Markdown owned by every
user-default pack, including agent assets. Match executable cross-skill
`SKILL.md` and `references/**/*.md` targets across repository-relative spelling
variants. Port all live executable violations surfaced by that rule; retain
only exact file-and-target entries for self-references or historical evidence.
Positive contract tests will prove the portable reads and delete the phase
implementer's special-case expectation for bare paths.

## Key Decisions

1. **No loaded-agent-root assumption:** Codex receives agent content as
   developer instructions, while Claude and Cursor materialize provider views
   in different directories. No common loaded-agent path contract exists.
2. **Independent dependency roots:** `workflows` and `utility` may be installed
   at different scopes, so each sibling is bound independently rather than
   freezing one root for all reads.
3. **User-first agent fallback:** agents probe `${HOME}/.agents/skills` before
   `<repo-root>/.agents/skills`; this matches the packs' user-default behavior
   while preserving project-scope installs.
4. **Remove the exemption, do not merely annotate it:** once
   `oat-phase-implementer` is portable, the validation branch that requires its
   bare paths must disappear and normal portable assertions must cover it.
5. **Global user-default ratchet:** scan both skill and agent Markdown for
   cross-skill `SKILL.md` and `references/*.md` reads. Remediate every
   executable hit in user-default packs rather than weakening the rule with a
   broad baseline.
6. **Exact non-executable baselines:** self-references and historical evidence
   may remain only when pinned by exact source and target with a rationale.

## Constraints

- Preserve mandatory dispatch-loading order, provider selection, launch
  safeguards, and effective-target disclosure.
- Do not rely on a provider-specific agent path, current working directory, or
  ambient skill discovery.
- Preserve both user-scope and project-scope installs, including mixed-scope
  `workflows` and `utility` packs.
- Fail closed with `oat tools install` and `oat tools update --pack` recovery
  commands that name the owning pack and intended scope.
- Verify canonical and bundled/materialized copies so source-only portability
  cannot pass.
- Treat all executable violations surfaced in user-default packs as remediation
  scope, including workflow, utility, and research callers and workflow agents.
- Bump every changed canonical skill or agent version once in the final PR and
  advance the five public packages in lockstep because agents and skills are
  shipped CLI assets.
- Run `pnpm lint` and `pnpm format` in addition to the complete repository
  Definition of Done gate sequence.

## Success Criteria

- `oat-phase-implementer` and `oat-reviewer` contain no executable bare
  `.agents/skills/...` sibling reads in their dispatch-loading contracts.
- `oat-dispatch-subagents` resolves its `subagent-orchestration` dependency and
  provider references through an installed-scope root rather than a
  repository-relative path.
- Every required dependency is resolved independently, exact target existence
  is checked, and a missing dependency stops before dispatch with correct
  `workflows` or `utility` recovery commands.
- Tests cover user-first/project fallback order for agents, loaded/user/project
  order for the utility skill, mixed-scope independent bindings, missing-pack
  recovery, and absence of executable bare reads.
- The `oat-phase-implementer` special branch in the dispatch-consumer test is
  removed; phase implementer and reviewer use positive portable-contract
  assertions.
- The portability ratchet enumerates user-default skill and agent Markdown,
  detects cross-skill `SKILL.md` plus `references/**/*.md` targets across
  quoted, linked, `./`, and `../` forms, and reports exact source/target
  evidence.
- All executable violations found by the generalized ratchet are ported,
  including current workflow, utility, research, and codebase-mapper surfaces;
  only exact self-reference or historical baselines remain.
- Provider/bundled views contain the updated agent and utility instructions.
- Focused contract tests, agent/skill version assertions, public-package
  release checks, and every repository gate pass.

## Out of Scope

- Adding provider-specific loaded-agent-path metadata or changing agent
  materialization architecture.
- Changing pack membership, default scopes, install/update semantics, or
  dispatch policy.
- Porting repository-only or non-user-default surfaces that the manifest-driven
  ratchet does not ship through a user-default pack.
- Rewriting self-references that already travel with their owning skill, or
  historical reports solely to eliminate evidence paths; those may use exact
  reviewed baselines.
- Publishing packages, opening a PR, or merging the implementation PR.

## Risks

- **Materialized-agent ambiguity:** generated provider roles do not share a
  stable source-path API.
  - **Mitigation:** use only user and project candidates in agent instructions
    and verify generated provider views.
- **Transitive portability regression:** the entry skill may resolve while its
  selected mechanics or provider reference still uses a bare path.
  - **Mitigation:** validate every concrete required target and assert the full
    chained read contract.
- **Matcher noise:** broadening the regex will reveal self-references and
  historical evidence alongside executable defects.
  - **Mitigation:** classify every hit, remediate executable cross-skill reads,
    and keep any non-executable allowance exact by file and target.

## Open Questions

None block planning. The implementation may choose the smallest reusable test
helper that expresses the distinct skill and agent candidate orders without
claiming a loaded-agent-root contract.

## References

- Prior project record:
  `.oat/repo/reference/project-summaries/20260828-portable-skill-references.md`
- Prior exit review:
  `.oat/projects/archived/portable-skill-references/reviews/archived/final-review-2026-08-28T175129Z.md`
- User-default pack definitions:
  `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- Existing portability ratchet:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Existing dispatch-consumer exemption:
  `packages/cli/src/validation/skills.test.ts`
