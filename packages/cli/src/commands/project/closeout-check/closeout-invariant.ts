import type {
  CarrierEvaluation,
  ReviewEvaluation,
} from '@commands/project/delivery/evidence';
import {
  parseBriefOutcomes,
  parsePhaseMarkers,
  parseTaskProgress,
  validateGoalOutcomeAudit,
  type GoalDelivery,
  type GoalOutcomeAudit,
} from '@open-agent-toolkit/control-plane';
import YAML, { isMap } from 'yaml';

/**
 * The closeout invariant shared by `oat project closeout-check` and
 * `oat project complete-state` (BL-260806-fail-closed-when-configured).
 *
 * A closeout that the implement skill must snapshot (configured
 * `workflow.postImplementSequence`, autonomous, or lite) cannot reach terminal
 * completion until its durable `oat_post_implement_sequence` snapshot exists,
 * every stored step is recorded complete, approval is recorded, and the
 * snapshot reached `status: complete`. The snapshot schema is the one
 * `oat-project-implement/references/completion-and-closeout.md` Step 15
 * persists. Once a snapshot exists it is authoritative: current configuration
 * is never consulted, so a later config change cannot invalidate a persisted
 * run.
 *
 * A goal project additionally passes the goal terminal boundary before either
 * success return (`complete` or `not_required`): the terminal declaration, an
 * exhaustive outcome audit validated by the control plane's single audit
 * predicate, resolved extraction and delivery coverage over current
 * observations. A complete snapshot cannot waive it, and every refusal names
 * the actual next owner.
 */

export const SEQUENCE_FIELD = 'oat_post_implement_sequence';
export const RECOVERY_SKILL = 'oat-project-implement';
const APPROVAL_WRITES = [
  'approval: approved',
  'approval: not_required',
] as const;

const PRE_APPROVAL_STEPS = ['summary', 'document', 'pr'] as const;
const POST_APPROVAL_STEPS = ['summary', 'document', 'pr', 'retro'] as const;
const SEQUENCE_STATUSES = [
  'pre_approval',
  'awaiting_approval',
  'post_approval',
  'failed',
  'complete',
] as const;
const APPROVALS = ['pending', 'approved', 'not_required'] as const;
const SOURCES = ['configured', 'autonomous-default'] as const;
const APPROVAL_SOURCES = ['user', 'oat-autonomous'] as const;

export type SequenceStep = (typeof POST_APPROVAL_STEPS)[number];
export type SequencePhase = 'pre_approval' | 'post_approval';

export const STEP_SKILLS: Record<SequenceStep, string> = {
  summary: 'oat-project-summary',
  document: 'oat-project-document',
  pr: 'oat-project-pr-final',
  retro: 'oat-project-retro',
};

export interface CloseoutSnapshot {
  status: (typeof SEQUENCE_STATUSES)[number];
  source: (typeof SOURCES)[number] | null;
  preApproval: SequenceStep[];
  preApprovalCompleted: SequenceStep[];
  approval: (typeof APPROVALS)[number];
  postApproval: SequenceStep[];
  postApprovalCompleted: SequenceStep[];
  /**
   * Goal only: steps recorded complete by delivery coverage rather than by
   * their skill (`satisfied_by: { pr: delivery-coverage }`). Recorded only
   * once the step's position in the stored order is reached.
   */
  satisfiedBy: Partial<Record<SequenceStep, 'delivery-coverage'>>;
  failure: unknown;
}

export type CloseoutInvariant =
  | 'goal_inputs_unreadable'
  | 'goal_not_declared'
  | 'goal_audit_invalid'
  | 'goal_extraction_unresolved'
  | 'goal_observation_failed'
  | 'goal_coverage_incomplete'
  | 'snapshot_missing'
  | 'snapshot_malformed'
  | 'sequence_failed'
  | 'pre_approval_step_pending'
  | 'approval_pending'
  | 'post_approval_step_pending'
  | 'sequence_not_complete';

export type CloseoutNextOwner =
  | { kind: 'snapshot'; skill: string }
  | { kind: 'step'; phase: SequencePhase; step: SequenceStep; skill: string }
  | {
      kind: 'approval';
      skill: string;
      /**
       * The two valid approval writes: `approved` after final HiLL sign-off,
       * `not_required` when no final checkpoint exists (Step 15 item 5).
       */
      writes: readonly ['approval: approved', 'approval: not_required'];
    }
  | { kind: 'sequence-status'; skill: string }
  | {
      /** Goal boundary refusals name the actual next owner (A3). */
      kind: 'goal';
      skill: string;
      reasons: GoalCloseoutReason[];
    };

export type SnapshotRequirementReason = 'lite' | 'autonomous' | 'configured';

export interface CloseoutInputs {
  workflowMode: string;
  lite: boolean;
  autonomous: boolean;
  autonomousSource: 'flag' | 'env' | null;
  /** Null when configuration was not consulted (snapshot present, or lite/autonomous already decided). */
  configured: boolean | null;
  snapshot: 'absent' | 'present';
  snapshotSource: string | null;
}

export type CloseoutResult =
  | {
      status: 'complete';
      inputs: CloseoutInputs;
    }
  | {
      status: 'not_required';
      inputs: CloseoutInputs;
    }
  | {
      status: 'incomplete';
      invariant: CloseoutInvariant;
      detail: string;
      /** The skill that owns recovery: implement, or the goal boundary's next owner. */
      route: string;
      nextOwner: CloseoutNextOwner;
      inputs: CloseoutInputs;
    };

export interface EvaluateCloseoutOptions {
  stateContent: string;
  autonomousFlag: boolean;
  env: NodeJS.ProcessEnv;
  /** Resolves the effective layered `workflow.postImplementSequence`; called only when needed. */
  resolveConfigured: () => Promise<boolean>;
  /**
   * Goal mode only: the boundary inputs loaded read-only by
   * `checkProjectCloseout`. A goal project evaluated without them refuses.
   */
  goal?: GoalCloseoutInputs;
}

// ---------------------------------------------------------------------------
// Goal closeout boundary (design "Delivery registry and closeout boundary")
// ---------------------------------------------------------------------------

/** One extracted phase's child project, as observed on disk. */
export interface ExtractedChildFact {
  slug: string;
  /** `found` only when exactly one project directory carries the slug. */
  status: 'found' | 'missing' | 'ambiguous' | 'unreadable';
  lifecycle: string | null;
  /** The child's `oat_extracted_from` backlink. */
  extractedFrom: string | null;
}

/** The shared evaluator's verdict for one terminal delivery's effective scope. */
export interface DeliveryEvidenceFact {
  /** The effective scope the evidence was evaluated against. */
  scope: string[];
  review: ReviewEvaluation;
  exit: CarrierEvaluation;
}

/**
 * Everything the goal boundary needs, as data: the brief, the journal, the
 * registry with current host observations merged into its members, the
 * observation failures, each extracted child's identity, backlink and
 * lifecycle, and the evidence evaluated for each terminal delivery. Null
 * contents mean the input could not be read.
 */
export interface GoalCloseoutInputs {
  goalSlug: string;
  planContent: string | null;
  implementationContent: string | null;
  deliveries: GoalDelivery[] | null;
  observationFailures: string[];
  children: ExtractedChildFact[];
  evidence: Record<string, DeliveryEvidenceFact>;
}

export type GoalCloseoutReasonCode =
  | 'plan-unreadable'
  | 'journal-unreadable'
  | 'registry-unreadable'
  | 'not-declared'
  | 'audit-invalid'
  | 'extraction-target-mismatch'
  | 'child-missing'
  | 'child-backlink-mismatch'
  | 'child-incomplete'
  | 'child-deferral-under-met'
  | 'member-unobserved'
  | 'delivery-duplicate-id'
  | 'delivery-self-link'
  | 'delivery-missing-target'
  | 'delivery-link-mismatch'
  | 'delivery-conflicting-predecessor'
  | 'delivery-source-not-superseded'
  | 'delivery-missing-link'
  | 'delivery-cycle'
  | 'delivery-replaced-after-endpoint'
  | 'correction-claims-inherited-scope'
  | 'delivery-registering'
  | 'terminal-scopes-overlap'
  | 'endpoint-unmet'
  | 'evidence-unevaluated'
  | 'review-not-fresh'
  | 'exit-carrier-not-fresh'
  | 'scope-claim-unknown'
  | 'scope-claim-unaccepted'
  | 'phase-uncovered';

export interface GoalCloseoutReason {
  code: GoalCloseoutReasonCode;
  message: string;
  /** Phase, delivery or child the reason is about, when it has one. */
  subject?: string;
}

const GOAL_SKILL = 'oat-project-goal';
const DELIVERY_SKILL = 'oat-project-pr-progress';
const TERMINAL_DELIVERY_SKILL = 'oat-project-pr-final';
const REVIEW_SKILL = 'oat-project-review-provide';

/** The next owner for each refusal reason (A3 diagnostics). */
const REASON_OWNERS: Record<GoalCloseoutReasonCode, string> = {
  'plan-unreadable': GOAL_SKILL,
  'journal-unreadable': GOAL_SKILL,
  'registry-unreadable': DELIVERY_SKILL,
  'not-declared': GOAL_SKILL,
  'audit-invalid': GOAL_SKILL,
  'extraction-target-mismatch': GOAL_SKILL,
  'child-missing': GOAL_SKILL,
  'child-backlink-mismatch': GOAL_SKILL,
  'child-incomplete': GOAL_SKILL,
  'child-deferral-under-met': GOAL_SKILL,
  'member-unobserved': DELIVERY_SKILL,
  'delivery-duplicate-id': DELIVERY_SKILL,
  'delivery-self-link': DELIVERY_SKILL,
  'delivery-missing-target': DELIVERY_SKILL,
  'delivery-link-mismatch': DELIVERY_SKILL,
  'delivery-conflicting-predecessor': DELIVERY_SKILL,
  'delivery-source-not-superseded': DELIVERY_SKILL,
  'delivery-missing-link': DELIVERY_SKILL,
  'delivery-cycle': DELIVERY_SKILL,
  'delivery-replaced-after-endpoint': DELIVERY_SKILL,
  'correction-claims-inherited-scope': DELIVERY_SKILL,
  'delivery-registering': DELIVERY_SKILL,
  'terminal-scopes-overlap': DELIVERY_SKILL,
  'endpoint-unmet': DELIVERY_SKILL,
  'evidence-unevaluated': DELIVERY_SKILL,
  'review-not-fresh': REVIEW_SKILL,
  'exit-carrier-not-fresh': RECOVERY_SKILL,
  'scope-claim-unknown': DELIVERY_SKILL,
  'scope-claim-unaccepted': DELIVERY_SKILL,
  'phase-uncovered': TERMINAL_DELIVERY_SKILL,
};

/** A terminal delivery and its effective scope after transitive resolution. */
export interface TerminalDelivery {
  delivery: GoalDelivery;
  /** Its frozen scope plus every predecessor's, ordered by the brief. */
  effectiveScope: string[];
  /** The superseded predecessors whose obligations it inherits. */
  inherits: string[];
}

export interface DeliveryGraph {
  terminals: TerminalDelivery[];
  errors: GoalCloseoutReason[];
}

function goalReason(
  code: GoalCloseoutReasonCode,
  message: string,
  subject?: string,
): GoalCloseoutReason {
  return subject === undefined ? { code, message } : { code, message, subject };
}

/**
 * Validate the supersession graph and resolve every replacement chain to its
 * terminal delivery (A4). In v1.5 each replacement has at most one direct
 * predecessor: `covers_scope_of` names it and the predecessor's
 * `superseded_by` points back. Missing targets, self-links, cycles,
 * conflicting predecessors, mismatched links, a non-superseded source and a
 * replacement of a delivery that already reached its endpoint are refused.
 * `corrects_delivery_id` is additive and inherits no coverage, so a
 * correction may not claim its target's scope.
 */
export function resolveDeliveryGraph(
  deliveries: readonly GoalDelivery[],
  phaseOrder: readonly string[] = [],
): DeliveryGraph {
  const errors: GoalCloseoutReason[] = [];
  const byId = new Map<string, GoalDelivery>();
  for (const delivery of deliveries) {
    if (byId.has(delivery.delivery_id)) {
      errors.push(
        goalReason(
          'delivery-duplicate-id',
          `delivery id ${delivery.delivery_id} is registered more than once`,
          delivery.delivery_id,
        ),
      );
      continue;
    }
    byId.set(delivery.delivery_id, delivery);
  }

  const replacedBy = new Map<string, string>();
  for (const delivery of byId.values()) {
    const id = delivery.delivery_id;
    const predecessorId = delivery.covers_scope_of;
    if (predecessorId !== null) {
      const predecessor = byId.get(predecessorId);
      if (predecessorId === id) {
        errors.push(
          goalReason('delivery-self-link', `${id} covers its own scope`, id),
        );
      } else if (predecessor === undefined) {
        errors.push(
          goalReason(
            'delivery-missing-target',
            `${id} covers the scope of ${predecessorId}, which is not registered`,
            id,
          ),
        );
      } else {
        const existing = replacedBy.get(predecessorId);
        if (existing !== undefined) {
          errors.push(
            goalReason(
              'delivery-conflicting-predecessor',
              `${predecessorId} is replaced by both ${existing} and ${id}`,
              predecessorId,
            ),
          );
        } else {
          replacedBy.set(predecessorId, id);
        }
        if (predecessor.superseded_by !== id) {
          errors.push(
            goalReason(
              'delivery-link-mismatch',
              `${id} covers ${predecessorId}, but ${predecessorId} records superseded_by ${predecessor.superseded_by ?? 'null'}`,
              id,
            ),
          );
        }
        if (predecessor.status !== 'superseded') {
          errors.push(
            goalReason(
              'delivery-source-not-superseded',
              `${id} replaces ${predecessorId}, whose status is ${predecessor.status ?? 'unrecorded'}, not superseded`,
              predecessorId,
            ),
          );
        }
        if (predecessor.endpoint_attainment !== null) {
          errors.push(
            goalReason(
              'delivery-replaced-after-endpoint',
              `${predecessorId} already reached its agreed endpoint; later corrections are additive and may not replace it`,
              predecessorId,
            ),
          );
        }
      }
    }

    const successorId = delivery.superseded_by;
    if (successorId !== null) {
      const successor = byId.get(successorId);
      if (successorId === id) {
        errors.push(
          goalReason('delivery-self-link', `${id} supersedes itself`, id),
        );
      } else if (successor === undefined) {
        errors.push(
          goalReason(
            'delivery-missing-target',
            `${id} is superseded by ${successorId}, which is not registered`,
            id,
          ),
        );
      } else if (successor.covers_scope_of !== id) {
        errors.push(
          goalReason(
            'delivery-link-mismatch',
            `${id} is superseded by ${successorId}, but ${successorId} covers ${successor.covers_scope_of ?? 'nothing'}`,
            id,
          ),
        );
      }
    } else if (delivery.status === 'superseded') {
      errors.push(
        goalReason(
          'delivery-missing-link',
          `${id} is superseded but names no replacement`,
          id,
        ),
      );
    }
  }

  // Cycles: follow each predecessor chain.
  for (const delivery of byId.values()) {
    const seen = new Set<string>();
    let current: GoalDelivery | undefined = delivery;
    while (current !== undefined && current.covers_scope_of !== null) {
      if (seen.has(current.delivery_id)) {
        errors.push(
          goalReason(
            'delivery-cycle',
            `the replacement chain through ${delivery.delivery_id} is a cycle`,
            delivery.delivery_id,
          ),
        );
        break;
      }
      seen.add(current.delivery_id);
      current = byId.get(current.covers_scope_of);
    }
  }
  if (errors.length > 0) {
    return { terminals: [], errors: dedupe(errors) };
  }

  const order = new Map(phaseOrder.map((phaseId, index) => [phaseId, index]));
  const rank = (phaseId: string) => order.get(phaseId) ?? order.size;
  const terminals: TerminalDelivery[] = [];
  for (const delivery of byId.values()) {
    if (delivery.status === 'superseded') continue;
    const scope = new Set<string>(delivery.scope);
    const inherits: string[] = [];
    let predecessorId = delivery.covers_scope_of;
    while (predecessorId !== null) {
      const predecessor = byId.get(predecessorId)!;
      inherits.push(predecessorId);
      for (const phaseId of predecessor.scope) scope.add(phaseId);
      predecessorId = predecessor.covers_scope_of;
    }
    terminals.push({
      delivery,
      effectiveScope: [...scope].sort(
        (left, right) => rank(left) - rank(right),
      ),
      inherits,
    });
  }

  for (const delivery of byId.values()) {
    const targetId = delivery.corrects_delivery_id;
    if (targetId === null) continue;
    const target = byId.get(targetId);
    if (targetId === delivery.delivery_id) {
      errors.push(
        goalReason(
          'delivery-self-link',
          `${delivery.delivery_id} corrects itself`,
          delivery.delivery_id,
        ),
      );
      continue;
    }
    if (target === undefined) {
      errors.push(
        goalReason(
          'delivery-missing-target',
          `${delivery.delivery_id} corrects ${targetId}, which is not registered`,
          delivery.delivery_id,
        ),
      );
      continue;
    }
    const targetScope = new Set(target.scope);
    for (const terminal of terminals) {
      if (
        terminal.delivery.delivery_id === targetId ||
        terminal.inherits.includes(targetId)
      ) {
        for (const phaseId of terminal.effectiveScope) targetScope.add(phaseId);
      }
    }
    const claimed = delivery.scope.filter((phaseId) =>
      targetScope.has(phaseId),
    );
    if (claimed.length > 0) {
      errors.push(
        goalReason(
          'correction-claims-inherited-scope',
          `${delivery.delivery_id} is an additive correction of ${targetId} but claims its scope (${claimed.join(', ')}); corrections use new phase ids`,
          delivery.delivery_id,
        ),
      );
    }
  }

  return { terminals: errors.length > 0 ? [] : terminals, errors };
}

function dedupe(reasons: GoalCloseoutReason[]): GoalCloseoutReason[] {
  const seen = new Set<string>();
  return reasons.filter((entry) => {
    const key = `${entry.code}:${entry.subject ?? ''}:${entry.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameMembers(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    [...left].sort().join(',') === [...right].sort().join(',')
  );
}

/** Endpoint satisfaction on observed member state (design "Endpoint satisfaction"). */
function endpointObserved(delivery: GoalDelivery): boolean {
  const { endpoint, members } = delivery;
  if (members.length === 0 || endpoint === null) return false;
  return endpoint === 'merged'
    ? members.every((member) => member.status === 'merged')
    : members.every(
        (member) => member.status === 'open' || member.status === 'merged',
      );
}

/**
 * The goal delivery coverage predicate (A4), over current observations:
 * no registering entries; a valid supersession graph whose terminal
 * deliveries have disjoint effective scopes; every terminal delivery at its
 * agreed endpoint with a passed, fresh integrated review and an allowed,
 * fresh exit-gate result evaluated against its entire effective scope; and
 * every audited-accepted phase in exactly one terminal effective scope, with
 * no claim of an unknown or unaccepted phase.
 */
export function evaluateGoalCoverage(input: {
  deliveries: readonly GoalDelivery[];
  phaseOrder: readonly string[];
  acceptedPhases: ReadonlySet<string>;
  evidence: Readonly<Record<string, DeliveryEvidenceFact>>;
}): GoalCloseoutReason[] {
  const reasons: GoalCloseoutReason[] = [];
  for (const delivery of input.deliveries) {
    if (delivery.status === 'registering') {
      reasons.push(
        goalReason(
          'delivery-registering',
          `${delivery.delivery_id} is still registering; resume its idempotent registration`,
          delivery.delivery_id,
        ),
      );
    }
  }

  const graph = resolveDeliveryGraph(input.deliveries, input.phaseOrder);
  if (graph.errors.length > 0) {
    return [...reasons, ...graph.errors];
  }

  const owners = new Map<string, string>();
  const known = new Set(input.phaseOrder);
  for (const terminal of graph.terminals) {
    const id = terminal.delivery.delivery_id;
    if (terminal.delivery.status === 'registering') continue;
    for (const phaseId of terminal.effectiveScope) {
      const owner = owners.get(phaseId);
      if (owner !== undefined) {
        reasons.push(
          goalReason(
            'terminal-scopes-overlap',
            `${phaseId} is in the effective scope of both ${owner} and ${id}`,
            phaseId,
          ),
        );
      } else {
        owners.set(phaseId, id);
      }
      if (!known.has(phaseId)) {
        reasons.push(
          goalReason(
            'scope-claim-unknown',
            `${id} claims ${phaseId}, which the brief does not declare`,
            phaseId,
          ),
        );
      } else if (!input.acceptedPhases.has(phaseId)) {
        reasons.push(
          goalReason(
            'scope-claim-unaccepted',
            `${id} claims ${phaseId}, which the audit does not record as accepted`,
            phaseId,
          ),
        );
      }
    }

    if (!endpointObserved(terminal.delivery)) {
      reasons.push(
        goalReason(
          'endpoint-unmet',
          `${id} is not observed at its agreed endpoint (${terminal.delivery.endpoint ?? 'unrecorded'})`,
          id,
        ),
      );
    }

    const fact = input.evidence[id];
    if (
      fact === undefined ||
      !sameMembers(fact.scope, terminal.effectiveScope)
    ) {
      reasons.push(
        goalReason(
          'evidence-unevaluated',
          `${id}'s evidence was not evaluated against its effective scope (${terminal.effectiveScope.join(', ')})`,
          id,
        ),
      );
      continue;
    }
    if (!fact.review.fresh || fact.review.disposition !== 'passed') {
      reasons.push(
        goalReason(
          'review-not-fresh',
          `${id} has no passed, fresh integrated review over ${terminal.effectiveScope.join(', ')}: ${fact.review.reason ?? `disposition ${fact.review.disposition ?? 'unrecorded'}`}`,
          id,
        ),
      );
    }
    if (fact.exit.outcome !== 'allowed' || fact.exit.freshness !== 'fresh') {
      reasons.push(
        goalReason(
          'exit-carrier-not-fresh',
          `${id}'s exit-gate result is ${fact.exit.outcome}, ${fact.exit.freshness}${fact.exit.reason ? `: ${fact.exit.reason}` : ''}`,
          id,
        ),
      );
    }
  }

  for (const phaseId of input.phaseOrder) {
    if (input.acceptedPhases.has(phaseId) && !owners.has(phaseId)) {
      reasons.push(
        goalReason(
          'phase-uncovered',
          `accepted phase ${phaseId} is in no terminal delivery's effective scope`,
          phaseId,
        ),
      );
    }
  }
  return reasons;
}

interface GoalBoundaryVerdict {
  invariant: CloseoutInvariant;
  reasons: GoalCloseoutReason[];
}

/**
 * The goal terminal boundary (A3, A4): declaration, an exhaustive audit
 * validated through the single audit predicate, resolved extraction, member
 * observation and delivery coverage, in that order. Returns null when every
 * check holds. Pure: every input arrives as data.
 */
export function evaluateGoalBoundary(
  frontmatter: Record<string, unknown>,
  goal: GoalCloseoutInputs | undefined,
): GoalBoundaryVerdict | null {
  if (goal === undefined) {
    return {
      invariant: 'goal_inputs_unreadable',
      reasons: [
        goalReason(
          'registry-unreadable',
          'the goal boundary inputs were not loaded',
        ),
      ],
    };
  }
  const unreadable: GoalCloseoutReason[] = [];
  if (goal.planContent === null) {
    unreadable.push(goalReason('plan-unreadable', 'plan.md could not be read'));
  }
  if (goal.implementationContent === null) {
    unreadable.push(
      goalReason('journal-unreadable', 'implementation.md could not be read'),
    );
  }
  if (goal.deliveries === null) {
    unreadable.push(
      goalReason(
        'registry-unreadable',
        'the delivery registry could not be read',
      ),
    );
  }
  if (
    unreadable.length > 0 ||
    goal.planContent === null ||
    goal.implementationContent === null ||
    goal.deliveries === null
  ) {
    return { invariant: 'goal_inputs_unreadable', reasons: unreadable };
  }

  if (frontmatter.oat_goal_status !== 'declared_met') {
    return {
      invariant: 'goal_not_declared',
      reasons: [
        goalReason(
          'not-declared',
          '`oat_goal_status` is not `declared_met`; only oat-project-goal records the terminal declaration',
        ),
      ],
    };
  }

  const inventory = parseTaskProgress(
    goal.planContent,
    goal.implementationContent,
    { phaseUnits: true, extractedUnits: true },
  ).phases;
  const validation = validateGoalOutcomeAudit(
    frontmatter.oat_goal_outcome_audit,
    inventory,
    parseBriefOutcomes(goal.planContent),
  );
  if (!validation.valid || validation.audit === null) {
    return {
      invariant: 'goal_audit_invalid',
      reasons: validation.errors.map((error) =>
        goalReason(
          'audit-invalid',
          `${error.code}: ${error.message}`,
          error.subject,
        ),
      ),
    };
  }

  const extraction = evaluateExtraction(
    goal,
    goal.planContent,
    inventory,
    validation.audit,
  );
  if (extraction.length > 0) {
    return { invariant: 'goal_extraction_unresolved', reasons: extraction };
  }

  if (goal.observationFailures.length > 0) {
    return {
      invariant: 'goal_observation_failed',
      reasons: goal.observationFailures.map((failure) =>
        goalReason(
          'member-unobserved',
          `${failure}; failure to observe a member is not endpoint success`,
        ),
      ),
    };
  }

  const acceptedPhases = new Set(
    Object.entries(validation.audit.phases)
      .filter(([, entry]) => entry.disposition === 'accepted')
      .map(([phaseId]) => phaseId),
  );
  const coverage = evaluateGoalCoverage({
    deliveries: goal.deliveries,
    phaseOrder: inventory.map((phase) => phase.phaseId),
    acceptedPhases,
    evidence: goal.evidence,
  });
  return coverage.length > 0
    ? { invariant: 'goal_coverage_incomplete', reasons: coverage }
    : null;
}

/**
 * Every extracted phase needs matching plan and journal targets and a child
 * carrying the matching `oat_extracted_from` backlink that is complete, or
 * whose outstanding obligation the audit defers with a reason and scope
 * decision under `met_with_deferrals`.
 */
function evaluateExtraction(
  goal: GoalCloseoutInputs,
  planContent: string,
  inventory: ReturnType<typeof parseTaskProgress>['phases'],
  audit: GoalOutcomeAudit,
): GoalCloseoutReason[] {
  const reasons: GoalCloseoutReason[] = [];
  const planMarkers = parsePhaseMarkers(planContent);
  for (const phase of inventory) {
    const planTarget = planMarkers.get(phase.phaseId)?.extractedTo ?? null;
    const journalTarget = phase.extracted?.to ?? null;
    if (planTarget !== journalTarget) {
      reasons.push(
        goalReason(
          'extraction-target-mismatch',
          `${phase.phaseId}: the brief names ${planTarget ?? 'no extraction target'} but the journal names ${journalTarget ?? 'none'}`,
          phase.phaseId,
        ),
      );
      continue;
    }
    if (journalTarget === null) continue;

    const child = goal.children.find((entry) => entry.slug === journalTarget);
    if (child === undefined || child.status !== 'found') {
      reasons.push(
        goalReason(
          'child-missing',
          `${phase.phaseId} is extracted to ${journalTarget}, but that child project is ${child?.status ?? 'missing'}`,
          phase.phaseId,
        ),
      );
      continue;
    }
    if (child.extractedFrom !== goal.goalSlug) {
      reasons.push(
        goalReason(
          'child-backlink-mismatch',
          `${journalTarget} records oat_extracted_from ${child.extractedFrom ?? 'null'}, not ${goal.goalSlug}`,
          phase.phaseId,
        ),
      );
      continue;
    }
    if (child.lifecycle === 'complete') continue;

    const entry = audit.phases[phase.phaseId];
    const deferred =
      entry !== undefined &&
      (entry.reason ?? '').trim() !== '' &&
      (entry.scope_decision_ref ?? '').trim() !== '';
    if (!deferred) {
      reasons.push(
        goalReason(
          'child-incomplete',
          `${journalTarget} is ${child.lifecycle ?? 'not complete'} and the audit records no approved deferral (reason and scope_decision_ref) for ${phase.phaseId}`,
          phase.phaseId,
        ),
      );
    } else if (audit.disposition === 'met') {
      reasons.push(
        goalReason(
          'child-deferral-under-met',
          `${phase.phaseId}'s child obligation is deferred, so the audit must be met_with_deferrals`,
          phase.phaseId,
        ),
      );
    }
  }
  return reasons;
}

function goalRefusal(
  verdict: GoalBoundaryVerdict,
  inputs: CloseoutInputs,
): CloseoutResult {
  const skill =
    REASON_OWNERS[verdict.reasons[0]?.code ?? 'registry-unreadable'];
  return {
    status: 'incomplete',
    invariant: verdict.invariant,
    detail: `the goal closeout boundary refuses: ${verdict.reasons
      .map((entry) => `${entry.code} (${entry.message})`)
      .join('; ')}`,
    route: skill,
    nextOwner: { kind: 'goal', skill, reasons: verdict.reasons },
    inputs,
  };
}

class MalformedSnapshotError extends Error {}

function malformed(detail: string): never {
  throw new MalformedSnapshotError(detail);
}

function readFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error('state.md is missing frontmatter');
  }
  const document = YAML.parseDocument(match[1]!, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(
      `state.md frontmatter is malformed (${document.errors[0]?.message ?? 'YAML parse error'})`,
    );
  }
  if (!isMap(document.contents)) {
    throw new Error('state.md frontmatter root is not a YAML map');
  }
  const value: unknown = document.toJS();
  return value as Record<string, unknown>;
}

/** The state's `oat_workflow_mode`, or null when the frontmatter cannot be read. */
export function readStateWorkflowMode(stateContent: string): string | null {
  try {
    const mode = readFrontmatter(stateContent).oat_workflow_mode;
    return typeof mode === 'string' ? mode : null;
  } catch {
    return null;
  }
}

function readEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  options: { optional?: boolean; nullable?: boolean } = {},
): T | null {
  if (!(key in record)) {
    if (options.optional) return null;
    malformed(`\`${key}\` is missing`);
  }
  const value = record[key];
  if (value === null && options.nullable) return null;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    malformed(
      `\`${key}\` must be one of ${allowed.join(', ')}${options.nullable ? ', or null' : ''}`,
    );
  }
  return value as T;
}

function readSteps(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly SequenceStep[],
): SequenceStep[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    malformed(`\`${key}\` must be an array`);
  }
  const steps: SequenceStep[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !allowed.includes(entry as SequenceStep)) {
      malformed(
        `\`${key}\` contains \`${String(entry)}\`; allowed steps are ${allowed.join(', ')}`,
      );
    }
    if (steps.includes(entry as SequenceStep)) {
      malformed(`\`${key}\` lists \`${entry}\` more than once`);
    }
    steps.push(entry as SequenceStep);
  }
  return steps;
}

/**
 * Completed steps must be exactly the first N stored steps: the implement
 * skill dispatches in stored order, so a gap or a foreign step is a
 * contradiction, not progress.
 */
function assertCompletedPrefix(
  stored: SequenceStep[],
  completed: SequenceStep[],
  storedKey: string,
  completedKey: string,
): void {
  for (const step of completed) {
    if (!stored.includes(step)) {
      malformed(
        `\`${completedKey}\` lists \`${step}\`, which \`${storedKey}\` does not`,
      );
    }
  }
  const prefix = stored.slice(0, completed.length);
  if (!prefix.every((step) => completed.includes(step))) {
    malformed(
      `\`${completedKey}\` is not a prefix of the stored \`${storedKey}\` order`,
    );
  }
}

const SATISFIED_BY_VALUES = ['delivery-coverage'] as const;

/**
 * Goal only: `satisfied_by` records a step completed by delivery coverage.
 * Only the `pr` step may be satisfied that way, and only once execution of
 * the stored order reached it, so the record must name a completed step.
 */
function readSatisfiedBy(
  record: Record<string, unknown>,
  workflowMode: string | null,
  completed: readonly SequenceStep[],
): CloseoutSnapshot['satisfiedBy'] {
  if (!('satisfied_by' in record) || record.satisfied_by === null) {
    return {};
  }
  const value = record.satisfied_by;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    malformed('`satisfied_by` must be a map of step to `delivery-coverage`');
  }
  if (workflowMode !== 'goal') {
    malformed('`satisfied_by` is recorded only by a goal closeout');
  }
  const satisfiedBy: CloseoutSnapshot['satisfiedBy'] = {};
  for (const [step, source] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (step !== 'pr') {
      malformed(
        `\`satisfied_by\` names \`${step}\`; only the \`pr\` step is satisfied by delivery coverage`,
      );
    }
    if (
      typeof source !== 'string' ||
      !SATISFIED_BY_VALUES.includes(source as 'delivery-coverage')
    ) {
      malformed('`satisfied_by.pr` must be `delivery-coverage`');
    }
    if (!completed.includes('pr')) {
      malformed(
        "`satisfied_by.pr` is recorded before the `pr` step's position in the stored order was reached",
      );
    }
    satisfiedBy.pr = 'delivery-coverage';
  }
  return satisfiedBy;
}

export function parseCloseoutSnapshot(
  value: unknown,
  workflowMode: string | null = null,
): CloseoutSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    malformed('the snapshot must be a map');
  }
  const record = value as Record<string, unknown>;
  const status = readEnum(record, 'status', SEQUENCE_STATUSES)!;
  // `source` and `approval_source` are additive provenance; an older snapshot
  // without them stays valid.
  const source = readEnum(record, 'source', SOURCES, {
    optional: true,
    nullable: true,
  });
  readEnum(record, 'approval_source', APPROVAL_SOURCES, {
    optional: true,
    nullable: true,
  });
  if (
    'final_phase' in record &&
    record.final_phase !== null &&
    typeof record.final_phase !== 'string'
  ) {
    malformed('`final_phase` must be a phase ID string');
  }
  const preApproval = readSteps(record, 'pre_approval', PRE_APPROVAL_STEPS);
  const postApproval = readSteps(record, 'post_approval', POST_APPROVAL_STEPS);
  for (const step of postApproval) {
    if (preApproval.includes(step)) {
      malformed(`\`${step}\` appears in both pre_approval and post_approval`);
    }
  }
  const preApprovalCompleted = readSteps(
    record,
    'pre_approval_completed',
    PRE_APPROVAL_STEPS,
  );
  const postApprovalCompleted = readSteps(
    record,
    'post_approval_completed',
    POST_APPROVAL_STEPS,
  );
  assertCompletedPrefix(
    preApproval,
    preApprovalCompleted,
    'pre_approval',
    'pre_approval_completed',
  );
  assertCompletedPrefix(
    postApproval,
    postApprovalCompleted,
    'post_approval',
    'post_approval_completed',
  );
  const approval = readEnum(record, 'approval', APPROVALS)!;
  if (postApprovalCompleted.length > 0 && approval === 'pending') {
    malformed(
      '`post_approval_completed` records work while `approval` is still pending',
    );
  }

  const snapshot: CloseoutSnapshot = {
    status,
    source,
    preApproval,
    preApprovalCompleted,
    approval,
    postApproval,
    postApprovalCompleted,
    satisfiedBy: readSatisfiedBy(record, workflowMode, [
      ...preApprovalCompleted,
      ...postApprovalCompleted,
    ]),
    failure: record.failure ?? null,
  };

  if (status === 'complete') {
    const pending =
      firstPending(preApproval, preApprovalCompleted) ??
      firstPending(postApproval, postApprovalCompleted);
    if (pending || approval === 'pending') {
      malformed(
        '`status: complete` contradicts pending steps or a pending approval',
      );
    }
  }

  return snapshot;
}

function firstPending(
  stored: SequenceStep[],
  completed: SequenceStep[],
): SequenceStep | undefined {
  return stored.find((step) => !completed.includes(step));
}

function stepOwner(
  phase: SequencePhase,
  step: SequenceStep,
): CloseoutNextOwner {
  return { kind: 'step', phase, step, skill: STEP_SKILLS[step] };
}

function approvalOwner(): CloseoutNextOwner {
  return { kind: 'approval', skill: RECOVERY_SKILL, writes: APPROVAL_WRITES };
}

function evaluateSnapshot(
  snapshot: CloseoutSnapshot,
  inputs: CloseoutInputs,
): CloseoutResult {
  const prePending = firstPending(
    snapshot.preApproval,
    snapshot.preApprovalCompleted,
  );
  const postPending = firstPending(
    snapshot.postApproval,
    snapshot.postApprovalCompleted,
  );
  const incomplete = (
    invariant: CloseoutInvariant,
    detail: string,
    nextOwner: CloseoutNextOwner,
  ): CloseoutResult => ({
    status: 'incomplete',
    invariant,
    detail,
    route: RECOVERY_SKILL,
    nextOwner,
    inputs,
  });

  if (snapshot.status === 'failed') {
    // Approval-aware order: pending pre-approval work, then the pending
    // approval boundary, then post-approval work, then status repair. A
    // post-approval step is never named while approval is pending.
    const approvalPending = snapshot.approval === 'pending';
    const owner: CloseoutNextOwner = prePending
      ? stepOwner('pre_approval', prePending)
      : approvalPending
        ? approvalOwner()
        : postPending
          ? stepOwner('post_approval', postPending)
          : { kind: 'sequence-status', skill: RECOVERY_SKILL };
    const at =
      owner.kind === 'step'
        ? ` at \`${owner.step}\``
        : owner.kind === 'approval'
          ? ' at the approval boundary'
          : '';
    return incomplete(
      'sequence_failed',
      `the post-implementation sequence recorded a failure${at}`,
      owner,
    );
  }
  if (prePending) {
    return incomplete(
      'pre_approval_step_pending',
      `pre-approval step \`${prePending}\` is not recorded complete (stored order: ${snapshot.preApproval.join(', ')})`,
      stepOwner('pre_approval', prePending),
    );
  }
  if (snapshot.approval === 'pending') {
    return incomplete(
      'approval_pending',
      'final approval is not recorded',
      approvalOwner(),
    );
  }
  if (postPending) {
    return incomplete(
      'post_approval_step_pending',
      `post-approval step \`${postPending}\` is not recorded complete (stored order: ${snapshot.postApproval.join(', ')})`,
      stepOwner('post_approval', postPending),
    );
  }
  if (snapshot.status !== 'complete') {
    return incomplete(
      'sequence_not_complete',
      `every step and approval is recorded but the snapshot status is \`${snapshot.status}\`, not \`complete\``,
      { kind: 'sequence-status', skill: RECOVERY_SKILL },
    );
  }
  return { status: 'complete', inputs };
}

export async function evaluateCloseout(
  options: EvaluateCloseoutOptions,
): Promise<CloseoutResult> {
  const frontmatter = readFrontmatter(options.stateContent);
  const workflowMode =
    typeof frontmatter.oat_workflow_mode === 'string'
      ? frontmatter.oat_workflow_mode
      : 'spec-driven';
  const autonomousSource = options.autonomousFlag
    ? 'flag'
    : options.env.OAT_AUTONOMOUS === '1'
      ? 'env'
      : null;
  const rawSnapshot = frontmatter[SEQUENCE_FIELD];
  // An explicit null carries no snapshot, exactly like an absent key.
  const snapshotPresent = SEQUENCE_FIELD in frontmatter && rawSnapshot !== null;
  const inputs: CloseoutInputs = {
    workflowMode,
    lite: workflowMode === 'lite',
    autonomous: autonomousSource !== null,
    autonomousSource,
    configured: null,
    snapshot: snapshotPresent ? 'present' : 'absent',
    snapshotSource: null,
  };

  // Goal: declaration, an exhaustive audit and delivery coverage are required
  // before either success return; a complete snapshot cannot waive them.
  if (workflowMode === 'goal') {
    const verdict = evaluateGoalBoundary(frontmatter, options.goal);
    if (verdict !== null) {
      return goalRefusal(verdict, inputs);
    }
  }

  if (snapshotPresent) {
    let snapshot: CloseoutSnapshot;
    try {
      snapshot = parseCloseoutSnapshot(rawSnapshot, workflowMode);
    } catch (error) {
      if (!(error instanceof MalformedSnapshotError)) throw error;
      return {
        status: 'incomplete',
        invariant: 'snapshot_malformed',
        detail: `\`${SEQUENCE_FIELD}\` is malformed: ${error.message}`,
        route: RECOVERY_SKILL,
        nextOwner: { kind: 'snapshot', skill: RECOVERY_SKILL },
        inputs,
      };
    }
    inputs.snapshotSource = snapshot.source;
    return evaluateSnapshot(snapshot, inputs);
  }

  let reason: SnapshotRequirementReason | null = null;
  if (inputs.lite) {
    reason = 'lite';
  } else if (inputs.autonomous) {
    reason = 'autonomous';
  } else {
    inputs.configured = await options.resolveConfigured();
    if (inputs.configured) reason = 'configured';
  }

  if (!reason) {
    return { status: 'not_required', inputs };
  }

  const why = {
    lite: '`oat_workflow_mode: lite` always snapshots its closeout',
    autonomous:
      'an autonomous closeout (`--autonomous` or `OAT_AUTONOMOUS=1`) always snapshots its closeout',
    configured: 'the effective `workflow.postImplementSequence` is configured',
  }[reason];
  return {
    status: 'incomplete',
    invariant: 'snapshot_missing',
    detail: `\`${SEQUENCE_FIELD}\` is absent, but ${why}`,
    route: RECOVERY_SKILL,
    nextOwner: { kind: 'snapshot', skill: RECOVERY_SKILL },
    inputs,
  };
}

/**
 * The one refusal message both commands print, so a skill or operator sees the
 * same invariant and recovery route from either.
 */
export function formatCloseoutRefusal(
  projectPath: string,
  result: Extract<CloseoutResult, { status: 'incomplete' }>,
): string {
  const owner = result.nextOwner;
  if (owner.kind === 'goal') {
    return `Closeout invariant not satisfied for ${projectPath} (${result.invariant}): ${result.detail}. Resume with ${owner.skill}.`;
  }
  const next =
    owner.kind === 'step'
      ? ` Next stored step: \`${owner.step}\` (${owner.skill}).`
      : owner.kind === 'approval'
        ? ' Next: record the final approval decision: `approval: approved` after final HiLL sign-off, or `approval: not_required` when no final checkpoint exists.'
        : '';
  return [
    `Closeout invariant not satisfied for ${projectPath} (${result.invariant}): ${result.detail}.${next}`,
    `Resume with ${RECOVERY_SKILL}; it persists the ${SEQUENCE_FIELD} snapshot (completion-and-closeout.md Step 15) and completes every stored step before completion.`,
  ].join(' ');
}
