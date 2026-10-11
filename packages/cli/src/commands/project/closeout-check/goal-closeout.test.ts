import {
  parseTaskProgress,
  type GoalDelivery,
} from '@open-agent-toolkit/control-plane';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  evaluateCloseout,
  resolveDeliveryGraph,
  type CloseoutResult,
  type DeliveryEvidenceFact,
  type ExtractedChildFact,
  type GoalCloseoutInputs,
} from './closeout-invariant';

/**
 * The goal closeout boundary over in-memory inputs (A3, A4). Every fixture is
 * a five-phase goal: p01–p04 delivered through the replacement chain
 * d01 → d02 → d03, p05 extracted to the child `child`.
 */

const OUTCOME_TEXT = '**Goal works** — Evidence: tests';

interface PhaseSpec {
  provisional?: boolean;
  /** Plan `**Extracted to:**` target. */
  planExtracted?: string;
}

function plan(
  phases: Record<string, PhaseSpec> = {},
  outcomes = `1. ${OUTCOME_TEXT}`,
): string {
  const sections = ['p01', 'p02', 'p03', 'p04', 'p05']
    .map((phaseId) => {
      const spec = phases[phaseId] ?? {};
      const extracted =
        spec.planExtracted ?? (phaseId === 'p05' ? 'child' : undefined);
      return `## Phase ${phaseId}: Work ${phaseId}

**Intent:** ${phaseId}.
**Exit evidence:** ${phaseId} done.
**Provisional:** ${spec.provisional ? 'yes' : 'no'}
${extracted ? `**Extracted to:** ${extracted}\n` : ''}`;
    })
    .join('\n');
  return `---
oat_status: complete
oat_plan_source: goal
---

# Project Brief: goal

## Outcomes

${outcomes}

## Milestones

| Milestone | Phases |
| --------- | ------ |
| m01 | p01, p02, p03 |
| m02 | p04 |

${sections}`;
}

function journal(
  statuses: Record<string, string> = {},
  extractedTo = 'child',
): string {
  return `---
oat_current_task_id: null
---

${['p01', 'p02', 'p03', 'p04', 'p05']
  .map((phaseId) => {
    const status =
      statuses[phaseId] ?? (phaseId === 'p05' ? 'extracted' : 'completed');
    return `## Phase ${phaseId}: Work ${phaseId}

**Status:** ${status}
${status === 'extracted' ? `**Extracted to:** ${extractedTo}\n` : ''}`;
  })
  .join('\n')}`;
}

type PhaseEntry = {
  disposition: string;
  reason?: string | null;
  scope_decision_ref?: string | null;
};

function audit(
  overrides: {
    disposition?: string;
    phases?: Record<string, PhaseEntry | undefined>;
    outcomes?: Record<string, unknown>;
  } = {},
): Record<string, unknown> {
  const phases: Record<string, PhaseEntry | undefined> = {
    p01: { disposition: 'accepted' },
    p02: { disposition: 'accepted' },
    p03: { disposition: 'accepted' },
    p04: { disposition: 'accepted' },
    p05: { disposition: 'extracted' },
    ...overrides.phases,
  };
  return {
    disposition: overrides.disposition ?? 'met',
    decided_at: '2026-10-11T12:00:00Z',
    declaration_ref: 'project-log.md#declared',
    brief_identity: 'plan.md@abc1234',
    phases: Object.fromEntries(
      Object.entries(phases)
        .filter(
          (entry): entry is [string, PhaseEntry] => entry[1] !== undefined,
        )
        .map(([phaseId, entry]) => [
          phaseId,
          {
            reason: null,
            scope_decision_ref: null,
            ...entry,
          },
        ]),
    ),
    outcomes: overrides.outcomes ?? {
      1: { disposition: 'met', evidence_or_ref: 'tests', text: OUTCOME_TEXT },
    },
  };
}

const COMPLETE_SNAPSHOT = {
  status: 'complete',
  source: 'configured',
  pre_approval: ['summary', 'pr'],
  pre_approval_completed: ['summary', 'pr'],
  approval: 'not_required',
  post_approval: [],
  post_approval_completed: [],
  satisfied_by: { pr: 'delivery-coverage' },
};

function state(overrides: Record<string, unknown> = {}, mode = 'goal'): string {
  const frontmatter: Record<string, unknown> = {
    oat_lifecycle: 'active',
    oat_workflow_mode: mode,
    oat_milestone: 'm02',
    oat_milestone_status: 'delivered',
    oat_goal_status: 'declared_met',
    oat_goal_outcome_audit: audit(),
    oat_post_implement_sequence: COMPLETE_SNAPSHOT,
    ...overrides,
  };
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) delete frontmatter[key];
  }
  return `---\n${YAML.stringify(frontmatter)}---\n`;
}

function delivery(
  id: string,
  overrides: Partial<GoalDelivery> = {},
  memberStatus: 'open' | 'merged' | 'closed' = 'merged',
): GoalDelivery {
  return {
    delivery_id: id,
    milestone: 'm01',
    scope: [],
    endpoint: 'merged',
    kind: 'pr',
    status: 'at_endpoint',
    superseded_by: null,
    corrects_delivery_id: null,
    covers_scope_of: null,
    lookup: null,
    members: [
      {
        url: `https://github.com/owner/name/pull/${id}`,
        base: 'b'.repeat(40),
        reviewed_head: 'a'.repeat(40),
        observed_head: 'a'.repeat(40),
        observed_base: 'b'.repeat(40),
        status: memberStatus,
      },
    ],
    integrated_review: null,
    exit_gate: null,
    endpoint_attainment: null,
    ...overrides,
  };
}

/** The valid chain: d01 → d02 → d03, terminal d03 inherits every phase once. */
function chain(): GoalDelivery[] {
  return [
    delivery('d01', {
      scope: ['p01', 'p02'],
      status: 'superseded',
      superseded_by: 'd02',
    }),
    delivery('d02', {
      scope: ['p03'],
      status: 'superseded',
      superseded_by: 'd03',
      covers_scope_of: 'd01',
    }),
    delivery('d03', { scope: ['p04'], covers_scope_of: 'd02' }),
  ];
}

function fresh(scope: string[]): DeliveryEvidenceFact {
  return {
    scope,
    review: {
      artifact: 'reviews/archived/d03-review.md',
      disposition: 'passed',
      fresh: true,
      reason: null,
      members: [{ member: 0, fresh: true, reason: null }],
    },
    exit: { outcome: 'allowed', freshness: 'fresh', reason: null },
  };
}

const FULL_SCOPE = ['p01', 'p02', 'p03', 'p04'];
const COMPLETE_CHILD: ExtractedChildFact = {
  slug: 'child',
  status: 'found',
  lifecycle: 'complete',
  extractedFrom: 'goal',
};

function goalInputs(
  overrides: Partial<GoalCloseoutInputs> = {},
): GoalCloseoutInputs {
  return {
    goalSlug: 'goal',
    planContent: plan(),
    implementationContent: journal(),
    deliveries: chain(),
    observationFailures: [],
    children: [COMPLETE_CHILD],
    evidence: { d03: fresh(FULL_SCOPE) },
    ...overrides,
  };
}

async function evaluate(
  stateContent: string,
  goal: GoalCloseoutInputs | 'not-loaded' = goalInputs(),
  configured = false,
): Promise<CloseoutResult> {
  return evaluateCloseout({
    stateContent,
    autonomousFlag: false,
    env: {},
    resolveConfigured: async () => configured,
    ...(goal === 'not-loaded' ? {} : { goal }),
  });
}

/**
 * The landed (pre-goal) boundary: the same evaluator over the same state with
 * the goal facts invisible to it, which is how it treated a goal project. The
 * landed snapshot parser ignored the goal-only `satisfied_by` record.
 */
async function oldBoundary(stateContent: string): Promise<CloseoutResult> {
  const frontmatter = YAML.parse(
    stateContent.match(/^---\n([\s\S]*?)---/)![1]!,
  ) as Record<string, Record<string, unknown> | string>;
  const snapshot = frontmatter['oat_post_implement_sequence'];
  if (typeof snapshot === 'object' && snapshot !== null) {
    delete snapshot['satisfied_by'];
  }
  frontmatter['oat_workflow_mode'] = 'quick';
  return evaluate(`---\n${YAML.stringify(frontmatter)}---\n`, 'not-loaded');
}

function refusal(result: CloseoutResult) {
  expect(result.status).toBe('incomplete');
  if (result.status !== 'incomplete') throw new Error('unreachable');
  const owner = result.nextOwner;
  return {
    invariant: result.invariant,
    route: result.route,
    codes:
      owner.kind === 'goal' ? owner.reasons.map((entry) => entry.code) : [],
    detail: result.detail,
  };
}

describe('goal closeout boundary', () => {
  describe('valid controls', () => {
    it('completes d01 → d02 → d03 with full effective-scope evidence on d03, counting each inherited phase once', async () => {
      const graph = resolveDeliveryGraph(chain(), [
        'p01',
        'p02',
        'p03',
        'p04',
        'p05',
      ]);
      expect(graph.errors).toEqual([]);
      expect(graph.terminals).toHaveLength(1);
      expect(graph.terminals[0]).toMatchObject({
        delivery: { delivery_id: 'd03' },
        effectiveScope: FULL_SCOPE,
        inherits: ['d02', 'd01'],
      });

      await expect(evaluate(state())).resolves.toMatchObject({
        status: 'complete',
      });
    });

    it('returns not_required for a covered goal without a snapshot', async () => {
      await expect(
        evaluate(state({ oat_post_implement_sequence: undefined })),
      ).resolves.toMatchObject({ status: 'not_required' });
    });

    it('accepts an exhaustive met_with_deferrals audit without fabricating phase completion', async () => {
      const journalContent = journal({ p04: 'pending' });
      const result = await evaluate(
        state({
          oat_goal_outcome_audit: audit({
            disposition: 'met_with_deferrals',
            phases: {
              p04: {
                disposition: 'deferred',
                reason: 'moved to the next goal',
                scope_decision_ref: 'decisions/DR-1',
              },
            },
          }),
        }),
        goalInputs({
          implementationContent: journalContent,
          deliveries: chain()
            .slice(0, 2)
            .map((entry) =>
              entry.delivery_id === 'd02'
                ? { ...entry, status: 'at_endpoint', superseded_by: null }
                : entry,
            ),
          evidence: { d02: fresh(['p01', 'p02', 'p03']) },
        }),
      );
      expect(result).toMatchObject({ status: 'complete' });
      const p04 = parseTaskProgress(plan(), journalContent, {
        phaseUnits: true,
        extractedUnits: true,
      }).phases.find((phase) => phase.phaseId === 'p04');
      expect(p04).toMatchObject({ completed: 0, total: 1 });
    });
  });

  describe('A3: declaration and audit before either success return', () => {
    it('refuses an omitted declaration that the old boundary accepts with a completed snapshot', async () => {
      const content = state({ oat_goal_status: 'active' });
      await expect(oldBoundary(content)).resolves.toMatchObject({
        status: 'complete',
      });
      expect(refusal(await evaluate(content))).toMatchObject({
        invariant: 'goal_not_declared',
        route: 'oat-project-goal',
        codes: ['not-declared'],
      });
    });

    it('refuses an omitted declaration through the not_required path', async () => {
      const content = state({
        oat_goal_status: 'active',
        oat_post_implement_sequence: undefined,
      });
      await expect(oldBoundary(content)).resolves.toMatchObject({
        status: 'not_required',
      });
      expect(refusal(await evaluate(content))).toMatchObject({
        invariant: 'goal_not_declared',
        route: 'oat-project-goal',
      });
    });

    it('refuses a pending/provisional phase omitted from the audit', async () => {
      const planContent = plan({ p04: { provisional: true } });
      const content = state({
        oat_goal_outcome_audit: audit({ phases: { p04: undefined } }),
      });
      await expect(oldBoundary(content)).resolves.toMatchObject({
        status: 'complete',
      });
      const result = refusal(
        await evaluate(content, goalInputs({ planContent })),
      );
      expect(result).toMatchObject({
        invariant: 'goal_audit_invalid',
        route: 'oat-project-goal',
      });
      expect(result.detail).toContain('audit-phase-omitted');
    });

    it('refuses an outcome omitted from the audit', async () => {
      const content = state({
        oat_goal_outcome_audit: audit({ outcomes: {} }),
      });
      await expect(oldBoundary(content)).resolves.toMatchObject({
        status: 'complete',
      });
      const result = refusal(await evaluate(content));
      expect(result.invariant).toBe('goal_audit_invalid');
      expect(result.detail).toContain('audit-outcome-omitted');
    });

    it('refuses when the goal inputs were not loaded', async () => {
      expect(refusal(await evaluate(state(), 'not-loaded'))).toMatchObject({
        invariant: 'goal_inputs_unreadable',
      });
    });
  });

  describe('guard goal-audit-integrity', () => {
    const cases: [
      string,
      Record<string, unknown>,
      string,
      Partial<GoalCloseoutInputs>?,
    ][] = [
      [
        'an unknown phase reference',
        { phases: { p09: { disposition: 'accepted' } } },
        'audit-phase-unknown',
      ],
      [
        'a duplicate phase reference',
        { phases: { p1: { disposition: 'accepted' } } },
        'audit-phase-duplicate',
      ],
      [
        'a contradictory reference (extracted phase claimed accepted)',
        { phases: { p05: { disposition: 'accepted' } } },
        'audit-phase-contradictory',
      ],
      [
        'changed outcome text',
        {
          outcomes: {
            1: {
              disposition: 'met',
              evidence_or_ref: 'tests',
              text: 'Something else',
            },
          },
        },
        'audit-outcome-text-changed',
      ],
      [
        'changed outcome numbering',
        {
          outcomes: {
            2: {
              disposition: 'met',
              evidence_or_ref: 'tests',
              text: OUTCOME_TEXT,
            },
          },
        },
        'audit-outcome-unknown',
      ],
      [
        'provisional work claimed accepted',
        {},
        'audit-phase-not-accepted',
        { planContent: plan({ p04: { provisional: true } }) },
      ],
      [
        'a deferral without reason or approval',
        {
          disposition: 'met_with_deferrals',
          phases: { p04: { disposition: 'deferred' } },
        },
        'audit-deferral-reason-missing',
        { implementationContent: journal({ p04: 'pending' }) },
      ],
      [
        '`met` with a deferred obligation',
        {
          phases: {
            p04: {
              disposition: 'deferred',
              reason: 'later',
              scope_decision_ref: 'DR-1',
            },
          },
        },
        'audit-met-with-deferrals',
        { implementationContent: journal({ p04: 'pending' }) },
      ],
    ];

    it.each(cases)(
      'refuses %s',
      async (_label, auditOverrides, code, inputs) => {
        const result = refusal(
          await evaluate(
            state({ oat_goal_outcome_audit: audit(auditOverrides) }),
            goalInputs(inputs),
          ),
        );
        expect(result.invariant).toBe('goal_audit_invalid');
        expect(result.route).toBe('oat-project-goal');
        expect(result.detail).toContain(code);
      },
    );

    it('refuses mismatched extraction targets between brief and journal', async () => {
      const result = refusal(
        await evaluate(
          state(),
          goalInputs({
            planContent: plan({ p05: { planExtracted: 'other' } }),
          }),
        ),
      );
      expect(result).toMatchObject({
        invariant: 'goal_extraction_unresolved',
        codes: ['extraction-target-mismatch'],
        route: 'oat-project-goal',
      });
    });

    it('refuses a wrong child backlink and accepts the matching completed child', async () => {
      expect(
        refusal(
          await evaluate(
            state(),
            goalInputs({
              children: [{ ...COMPLETE_CHILD, extractedFrom: 'another-goal' }],
            }),
          ),
        ).codes,
      ).toEqual(['child-backlink-mismatch']);
      expect(
        refusal(await evaluate(state(), goalInputs({ children: [] }))).codes,
      ).toEqual(['child-missing']);
      await expect(evaluate(state(), goalInputs())).resolves.toMatchObject({
        status: 'complete',
      });
    });

    it('refuses an incomplete child without an approved deferral, and accepts one under met_with_deferrals', async () => {
      const active = goalInputs({
        children: [{ ...COMPLETE_CHILD, lifecycle: 'active' }],
      });
      expect(refusal(await evaluate(state(), active)).codes).toEqual([
        'child-incomplete',
      ]);

      const deferredChild = {
        p05: {
          disposition: 'extracted',
          reason: 'child continues after this goal',
          scope_decision_ref: 'DR-2',
        },
      };
      expect(
        refusal(
          await evaluate(
            state({
              oat_goal_outcome_audit: audit({ phases: deferredChild }),
            }),
            active,
          ),
        ).codes,
      ).toEqual(['child-deferral-under-met']);
      await expect(
        evaluate(
          state({
            oat_goal_outcome_audit: audit({
              disposition: 'met_with_deferrals',
              phases: deferredChild,
            }),
          }),
          active,
        ),
      ).resolves.toMatchObject({ status: 'complete' });
    });
  });

  describe('A4: transitive coverage', () => {
    /**
     * The one-hop predicate the A4 negative control names: coverage counts
     * every registered scope, but a terminal delivery's evidence is checked
     * only against its own frozen scope.
     */
    function oneHopAccepts(
      deliveries: GoalDelivery[],
      evidence: Record<string, DeliveryEvidenceFact>,
      accepted: string[],
    ): boolean {
      const covered = new Set(deliveries.flatMap((entry) => entry.scope));
      const terminalsFresh = deliveries
        .filter((entry) => entry.status !== 'superseded')
        .every((entry) => {
          const fact = evidence[entry.delivery_id];
          return (
            fact !== undefined &&
            entry.scope.every((phaseId) => fact.scope.includes(phaseId)) &&
            fact.review.fresh &&
            fact.exit.freshness === 'fresh'
          );
        });
      return (
        terminalsFresh && accepted.every((phaseId) => covered.has(phaseId))
      );
    }

    it('refuses a terminal replacement whose review lists only its new phase, which a one-hop predicate accepts', async () => {
      const ownScopeOnly = { d03: fresh(['p04']) };
      expect(oneHopAccepts(chain(), ownScopeOnly, FULL_SCOPE)).toBe(true);
      expect(
        refusal(await evaluate(state(), goalInputs({ evidence: ownScopeOnly })))
          .codes,
      ).toEqual(['evidence-unevaluated']);

      // Evaluated against the effective scope, the narrow review is not fresh.
      const narrow: DeliveryEvidenceFact = {
        ...fresh(FULL_SCOPE),
        review: {
          ...fresh(FULL_SCOPE).review,
          fresh: false,
          reason:
            'review-scope-narrow: the integrated review does not bind p01, p02, p03',
        },
      };
      const result = refusal(
        await evaluate(state(), goalInputs({ evidence: { d03: narrow } })),
      );
      expect(result).toMatchObject({
        invariant: 'goal_coverage_incomplete',
        codes: ['review-not-fresh'],
        route: 'oat-project-review-provide',
      });
    });

    const graphCases: [string, () => GoalDelivery[], string][] = [
      [
        'a cycle',
        () => [
          delivery('d01', {
            scope: ['p01', 'p02'],
            status: 'superseded',
            superseded_by: 'd02',
            covers_scope_of: 'd02',
          }),
          delivery('d02', {
            scope: ['p03', 'p04'],
            status: 'superseded',
            superseded_by: 'd01',
            covers_scope_of: 'd01',
          }),
        ],
        'delivery-cycle',
      ],
      [
        'a missing link',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd02'
              ? { ...entry, superseded_by: null }
              : entry,
          ),
        'delivery-missing-link',
      ],
      [
        'a mismatched reciprocal link',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd01'
              ? { ...entry, superseded_by: 'd03' }
              : entry,
          ),
        'delivery-link-mismatch',
      ],
      [
        'overlapping terminal scopes',
        () => [
          ...chain(),
          delivery('d04', { scope: ['p04'], milestone: 'm02' }),
        ],
        'terminal-scopes-overlap',
      ],
    ];

    it.each(graphCases)('refuses %s', async (_label, deliveries, code) => {
      const result = refusal(
        await evaluate(
          state(),
          goalInputs({
            deliveries: deliveries(),
            evidence: { d03: fresh(FULL_SCOPE), d04: fresh(['p04']) },
          }),
        ),
      );
      expect(result.invariant).toBe('goal_coverage_incomplete');
      expect(result.codes).toContain(code);
    });
  });

  describe('guard goal-supersession-integrity', () => {
    const cases: [string, () => GoalDelivery[], string][] = [
      [
        'duplicate delivery ids',
        () => [...chain(), delivery('d03', { scope: ['p04'] })],
        'delivery-duplicate-id',
      ],
      [
        'a self-link',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd03'
              ? { ...entry, covers_scope_of: 'd03' }
              : entry,
          ),
        'delivery-self-link',
      ],
      [
        'conflicting predecessors',
        () => [
          ...chain().map((entry) =>
            entry.delivery_id === 'd03' ? { ...entry, scope: ['p04'] } : entry,
          ),
          delivery('d04', { scope: [], covers_scope_of: 'd02' }),
        ],
        'delivery-conflicting-predecessor',
      ],
      [
        'a non-superseded source',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd02' ? { ...entry, status: 'open' } : entry,
          ),
        'delivery-source-not-superseded',
      ],
      [
        'replacement after historical endpoint attainment',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd01'
              ? {
                  ...entry,
                  endpoint_attainment: {
                    observed_at: '2026-10-01T00:00:00Z',
                    members: [],
                  },
                }
              : entry,
          ),
        'delivery-replaced-after-endpoint',
      ],
      [
        'an additive correction claiming inherited scope',
        () => [
          ...chain(),
          delivery('d04', { scope: ['p02'], corrects_delivery_id: 'd03' }),
        ],
        'correction-claims-inherited-scope',
      ],
      [
        'a registering entry',
        () => [
          ...chain(),
          delivery('d04', { scope: [], status: 'registering' }),
        ],
        'delivery-registering',
      ],
      [
        'an unmet endpoint',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd03'
              ? delivery(
                  'd03',
                  { scope: ['p04'], covers_scope_of: 'd02' },
                  'open',
                )
              : entry,
          ),
        'endpoint-unmet',
      ],
      [
        'an unknown scope claim',
        () =>
          chain().map((entry) =>
            entry.delivery_id === 'd03'
              ? { ...entry, scope: ['p04', 'p09'] }
              : entry,
          ),
        'scope-claim-unknown',
      ],
    ];

    it.each(cases)('refuses %s', async (_label, deliveries, code) => {
      const registry = deliveries();
      const terminals = resolveDeliveryGraph(registry, [
        'p01',
        'p02',
        'p03',
        'p04',
        'p05',
      ]).terminals;
      const evidence = Object.fromEntries(
        terminals.map((terminal) => [
          terminal.delivery.delivery_id,
          fresh(terminal.effectiveScope),
        ]),
      );
      const result = refusal(
        await evaluate(
          state(),
          goalInputs({
            deliveries: registry,
            evidence: { d03: fresh(FULL_SCOPE), ...evidence },
          }),
        ),
      );
      expect(result.invariant).toBe('goal_coverage_incomplete');
      expect(result.codes).toContain(code);
    });

    it('refuses an unaccepted scope claim', async () => {
      const result = refusal(
        await evaluate(
          state({
            oat_goal_outcome_audit: audit({
              disposition: 'met_with_deferrals',
              phases: {
                p04: {
                  disposition: 'deferred',
                  reason: 'later',
                  scope_decision_ref: 'DR-1',
                },
              },
            }),
          }),
          goalInputs({ implementationContent: journal({ p04: 'pending' }) }),
        ),
      );
      expect(result.codes).toEqual(['scope-claim-unaccepted']);
    });

    it('refuses an accepted phase no terminal delivery covers and names the terminal delivery owner', async () => {
      const result = refusal(
        await evaluate(
          state(),
          goalInputs({
            deliveries: chain().map((entry) =>
              entry.delivery_id === 'd03' ? { ...entry, scope: [] } : entry,
            ),
            evidence: { d03: fresh(['p01', 'p02', 'p03']) },
          }),
        ),
      );
      expect(result).toMatchObject({
        codes: ['phase-uncovered'],
        route: 'oat-project-pr-final',
      });
    });

    it('accepts an additive correction that uses new phase ids', async () => {
      const registry = [
        delivery('d01', { scope: ['p01', 'p02', 'p03'] }),
        delivery('d02', {
          scope: ['p04'],
          corrects_delivery_id: 'd01',
          milestone: 'm02',
        }),
      ];
      await expect(
        evaluate(
          state(),
          goalInputs({
            deliveries: registry,
            evidence: {
              d01: fresh(['p01', 'p02', 'p03']),
              d02: fresh(['p04']),
            },
          }),
        ),
      ).resolves.toMatchObject({ status: 'complete' });
    });
  });

  describe('guard goal-terminal-observation (pure boundary)', () => {
    it('refuses unreadable required inputs', async () => {
      for (const [inputs, code] of [
        [{ planContent: null }, 'plan-unreadable'],
        [{ implementationContent: null }, 'journal-unreadable'],
        [{ deliveries: null }, 'registry-unreadable'],
      ] as const) {
        expect(
          refusal(await evaluate(state(), goalInputs(inputs))),
        ).toMatchObject({
          invariant: 'goal_inputs_unreadable',
          codes: [code],
        });
      }
    });

    it('refuses a failed member observation, which is never endpoint success', async () => {
      expect(
        refusal(
          await evaluate(
            state(),
            goalInputs({ observationFailures: ['d03 url: HTTP 502'] }),
          ),
        ),
      ).toMatchObject({
        invariant: 'goal_observation_failed',
        codes: ['member-unobserved'],
        route: 'oat-project-pr-progress',
      });
    });

    it('accepts snapshot pr satisfaction only at its configured position', async () => {
      const early = refusal(
        await evaluate(
          state({
            oat_post_implement_sequence: {
              ...COMPLETE_SNAPSHOT,
              status: 'pre_approval',
              pre_approval_completed: ['summary'],
            },
          }),
        ),
      );
      expect(early.invariant).toBe('snapshot_malformed');
      expect(early.detail).toContain('before the `pr` step');

      const pending = await evaluate(
        state({
          oat_post_implement_sequence: {
            ...COMPLETE_SNAPSHOT,
            status: 'pre_approval',
            pre_approval_completed: ['summary'],
            satisfied_by: null,
          },
        }),
      );
      expect(pending).toMatchObject({
        status: 'incomplete',
        invariant: 'pre_approval_step_pending',
      });

      await expect(evaluate(state())).resolves.toMatchObject({
        status: 'complete',
      });
    });

    it('rejects delivery-coverage satisfaction outside goal mode', async () => {
      const result = await evaluate(state({}, 'quick'), 'not-loaded');
      expect(result).toMatchObject({
        status: 'incomplete',
        invariant: 'snapshot_malformed',
      });
    });
  });

  it('distinguishes identical state with different journal or child facts', async () => {
    const content = state();
    await expect(evaluate(content, goalInputs())).resolves.toMatchObject({
      status: 'complete',
    });
    expect(
      refusal(
        await evaluate(
          content,
          goalInputs({
            implementationContent: journal({ p03: 'in_progress' }),
          }),
        ),
      ).invariant,
    ).toBe('goal_audit_invalid');
    expect(
      refusal(
        await evaluate(
          content,
          goalInputs({
            children: [{ ...COMPLETE_CHILD, lifecycle: 'paused' }],
          }),
        ),
      ).invariant,
    ).toBe('goal_extraction_unresolved');
  });
});
