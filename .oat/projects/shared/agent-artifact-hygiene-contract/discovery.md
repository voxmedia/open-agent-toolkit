---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: agent-artifact-hygiene-contract

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

From a downstream operator's feedback packet (Stoa repo, full orchestrated OAT lifecycle run on oat CLI 0.1.55→0.1.59, 2026-07-13), item 1 — flagged as highest leverage:

Dispatched agents (implementers, reviewers, gate reviewers) and lifecycle skills that write artifacts (review-provide, review-receive, summary, document, pr-final, quick-start) produce markdown files that repeatedly fail repos' own whole-tree format gates. In the exemplar run, integration verification failed twice on unformatted review artifacts, and the orchestrator had to add per-run brief instructions ("run `oxfmt --write` on your artifact before finishing") as a workaround. The requested outcome: output hygiene becomes part of the role contracts and skill steps — repo-agnostically — rather than being left to per-run briefs.

## Recon Findings (verified 2026-07-13 against current main)

A read-only survey of the artifact-writing surface confirmed the gap is total — 7 of 7 surveyed roles/skills plus the CLI-side gate artifact scaffolding contain no format-command instruction:

| Role / Skill                                                                                           | Writes                                                                  | Formatting instruction?                                   |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| `oat-phase-implementer` (`.agents/agents/oat-phase-implementer.md`)                                    | Source/test files per task                                              | No — self-review runs declared verification commands only |
| `oat-reviewer` (`.agents/agents/oat-reviewer.md`)                                                      | Review artifacts under `{project}/reviews/` (Step 8)                    | No                                                        |
| `oat-project-review-provide`                                                                           | Dispatches reviewer; updates `plan.md` Reviews table                    | No                                                        |
| `oat gate review` context note (`packages/cli/src/commands/gate/index.ts`, `REVIEW_GATE_CONTEXT_NOTE`) | Injects reviewer prompt; mandates heading structure only                | No                                                        |
| `oat-project-review-receive`                                                                           | Updates `plan.md`, `implementation.md`, `state.md`; moves review files  | No                                                        |
| `oat-project-summary`                                                                                  | `summary.md`; decision records                                          | No                                                        |
| `oat-project-document`                                                                                 | READMEs, `pjm/*`, `reference/decisions/*`                               | No                                                        |
| `oat-project-pr-final`                                                                                 | PR description artifact under `pr/`                                     | No                                                        |
| `oat-project-quick-start`                                                                              | `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md` | No                                                        |

A grep of the whole `.agents/` tree for `pnpm format|oxfmt|format:fix` returns only unrelated hits (docs-app scaffolding config, static formatter-detection recon in `oat-codebase-mapper`).

## Requirements

- Add a repo-agnostic output-hygiene contract to the agent role definitions (`oat-phase-implementer`, `oat-reviewer`) and to every lifecycle skill step that writes or edits an artifact: before finishing/committing, run the repository's documented format command (and relevant DoD gates) on files the agent created or edited.
- The format command must be **discovered from repo instructions** (AGENTS.md / CLAUDE.md, package manifests) — never hardcode a specific formatter.
- When no format command is discoverable: **warn once, then no-op** — a one-line "no format command discovered in repo instructions; skipping" in the agent's output. (Operator answer, 2026-07-13: silent no-op hides misconfiguration; failing would be worse than the disease.)
- The phase-implementer contract should state the general form: task completion includes the repo's full gate set over the produced diff, **explicitly including artifact writes**, which agents tend to treat as exempt.
- The `oat gate review` injected context note (CLI source) should carry the same contract line for gate-dispatched reviewers.

## Key Decisions

1. **Contract over per-run briefs:** hygiene lives in role definitions and skill steps so it applies to every run without orchestrator intervention. (Operator evidence: the per-brief workaround worked but had to be re-added manually per dispatch.)
2. **Repo-agnostic discovery:** the contract instructs discovering the format command, not naming one. Rationale: OAT ships to arbitrary repos.
3. **Ignore-patterns rejected as a substitute (operator answer, 2026-07-13):** artifacts must actually be formatted. Project artifacts under `.oat/projects/shared/` are tracked, PR-reviewed content — carving them out creates a permanent unformatted zone inside the diff; and the reviews directory is only one instance of the class (summary/document/pr-final/receive also write tracked markdown outside `.oat/projects/`, where an ignore-pattern can't follow). Consuming repos may add ignore-patterns as local belt-and-suspenders, but the upstream fix is the role contract.

## Constraints

- Canonical skills live in `.agents/skills/`; each changed skill requires a frontmatter `version:` bump in the same PR (repo policy).
- Bundled skill/agent assets count as shipped CLI functionality → the lockstep five-package public version bump applies (`packages/cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`), and `pnpm release:validate` must pass.
- Provider views (`.claude/`, `.cursor/`) are managed by sync tooling — edit canonical sources only, then `oat sync`.

## Success Criteria

- Every role definition and lifecycle skill step that writes an artifact carries the hygiene contract line.
- The contract is phrased repo-agnostically (discover the command; graceful behavior when no format command is documented).
- The `oat gate review` context note includes the contract for gate-dispatched reviewers.
- A repo with a whole-tree format gate no longer fails on lifecycle-skill-written artifacts without per-run brief instructions.

## Out of Scope

- Changing any repo's format-gate configuration or ignore patterns (that is a consuming-repo decision).
- The run-log feature (tracked as a separate project); its "every appender formats the log" requirement will inherit this contract.

## Open Questions

- **Contract placement:** one shared reference document that role definitions and skills cite, vs. duplicating the contract line in each artifact-writing step? (Lightweight design decision — weigh drift risk against skill self-containedness.)
- **DoD gate scope:** "relevant DoD gates" beyond formatting — lint? For markdown artifacts formatting is usually the only applicable gate; the contract wording should avoid implying agents run full test suites on prose artifacts.

_Resolved 2026-07-13 (operator answers): no-format-command repos → warn once then no-op; ignore-patterns → rejected as substitute (see Key Decisions 3)._

## Assumptions

- Prose contract lines in role/skill definitions are sufficient — no CLI enforcement mechanism is required in this pass.

## Risks

- **Contract drift across many touchpoints:** ~9+ files carry the line; wording divergence over time.
  - **Likelihood:** Medium / **Impact:** Low
  - **Mitigation Ideas:** shared reference doc + short pointer lines, or identical canonical sentence everywhere (design decision).

## Next Steps

Quick mode → **optional lightweight design** (recommended): settle contract placement/wording and the discovery-of-format-command procedure, then plan. Run `oat-project-quick-start` to continue.
