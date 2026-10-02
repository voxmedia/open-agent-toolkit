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
  failure: unknown;
}

export type CloseoutInvariant =
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
  | { kind: 'sequence-status'; skill: string };

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
      route: typeof RECOVERY_SKILL;
      nextOwner: CloseoutNextOwner;
      inputs: CloseoutInputs;
    };

export interface EvaluateCloseoutOptions {
  stateContent: string;
  autonomousFlag: boolean;
  env: NodeJS.ProcessEnv;
  /** Resolves the effective layered `workflow.postImplementSequence`; called only when needed. */
  resolveConfigured: () => Promise<boolean>;
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

export function parseCloseoutSnapshot(value: unknown): CloseoutSnapshot {
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

  if (snapshotPresent) {
    let snapshot: CloseoutSnapshot;
    try {
      snapshot = parseCloseoutSnapshot(rawSnapshot);
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
