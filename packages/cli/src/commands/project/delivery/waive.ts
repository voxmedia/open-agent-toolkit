import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  defaultGhRunner,
  type GhRunner,
} from '@commands/project/links/refresh';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveEffectiveConfig, resolveGate } from '@config/resolve';
import { CliError } from '@errors/cli-error';
import type {
  DeliveryFreshnessWaiver,
  DeliveryMember,
  GoalDelivery,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import YAML, { isMap, isScalar, isSeq } from 'yaml';

import {
  DEFAULT_DELIVERY_PROJECT_DEPENDENCIES,
  deliveryEffectiveScope,
  EXIT_GATE_SKILL,
  loadGoalDeliveryProject,
  type DeliveryProjectDependencies,
  type GoalDeliveryProject,
} from './check';
import {
  deliveryEvidenceScope,
  evaluateDeliveryExitCarrier,
  evaluateDeliveryReview,
  latestDeliveryForMilestone,
  reviewRowsFor,
  type CarrierEvaluation,
  type ReviewEvaluation,
} from './evidence';
import {
  endpointSatisfied,
  observeMember,
  resolvePath,
  type MemberObservation,
} from './refresh';

/**
 * `oat project delivery waive` (brief contract 12.7, Operator waiver). The
 * operator-only writer of a delivery's `freshness_waivers`: it observes the
 * delivery's members live, as `delivery refresh` does, and when the only
 * reason the delivery is not fresh is head movement it writes, in one
 * `state.md` write, the member observations, a new waiver bound to the
 * observed heads, `integrated_review.disposition: passed`, the milestone
 * working carrier's `freshness: fresh` (only for the milestone's latest
 * registered delivery) and the clearing of an `oat_goal_recovery` that targets
 * the delivery. It never writes the set-once `exit_gate`, a reviewed
 * revision, a member base or an earlier waiver, and it never commits.
 */

/** Every stable `--json` refusal code `delivery waive` can return. */
export const WAIVE_REFUSAL_CODES = [
  'autonomous',
  'reason-missing',
  'author-missing',
  'unknown-delivery',
  'delivery-not-observable',
  'observation-failed',
  'missing-object',
  'review-not-passed',
  'carrier-not-allowed',
  'configuration-changed',
  'already-fresh',
  'not-head-movement',
] as const;

export type WaiveRefusalCode = (typeof WAIVE_REFUSAL_CODES)[number];

export interface WaiveRefusal {
  code: WaiveRefusalCode;
  message: string;
  failures?: string[];
}

/** The consumers' verdicts for one delivery, before or after the waiver. */
export interface WaiverEvidence {
  /** The review as `delivery check` and `refresh` judge it (working scope). */
  review: ReviewEvaluation;
  /** The review as the closeout boundary judges it (binding scope). */
  closeoutReview: ReviewEvaluation;
  /** `oat_milestone_gates[mNN].exit`, judged for this delivery. */
  workingCarrier: CarrierEvaluation;
  /** The delivery's persisted `exit_gate`. */
  deliveryBinding: CarrierEvaluation;
}

export interface WaiverPlan {
  deliveryId: string;
  milestone: string | null;
  waiver: DeliveryFreshnessWaiver;
  observations: MemberObservation[];
  /** `status: at_endpoint` and the first attainment, as refresh derives them. */
  endpoint: { status: GoalDelivery['status']; satisfied: boolean };
  restoresWorkingCarrier: boolean;
  clearsRecovery: boolean;
  restoresMilestoneStatus: boolean;
  before: WaiverEvidence;
  after: WaiverEvidence;
}

export interface WaiveInput {
  deliveryId: string;
  reason: string;
  by: string | null;
}

export interface WaiveRunners {
  gh: GhRunner;
  git: GitRunner;
  now: () => Date;
  env: NodeJS.ProcessEnv;
  /**
   * The exit gate's current resolution in carrier vocabulary (see
   * `exitGateCarrierResolution`): the carriers' recorded `resolution` must
   * equal it. `null` when a project override disables a configured gate,
   * which the override guard judges instead.
   */
  exitGateResolution: ExitGateCarrierResolution;
}

export type ExitGateCarrierResolution = 'configured' | 'no_gate' | null;

/** The shared, tracked gate configuration file the resolver reads. */
const SHARED_GATE_CONFIG_PATH = '.oat/config.json';

/**
 * Map the current resolution of `oat-project-implement`'s gate (the gate the
 * milestone exit carrier and each delivery's `exit_gate` record) onto the
 * carrier vocabulary, as the gate resolver decides it: no gate resolves as
 * `no_gate` (`not_configured`), a configured gate as `configured`, and a
 * configured gate the project override disables yields `null`
 * (`configured_disabled_by_project`), which producers record either as
 * `resolution: project_disabled` or as `disposition: project_disabled`, so
 * the evaluator's override guard judges it.
 */
export async function exitGateCarrierResolution(
  repoRoot: string,
  userConfigDir: string,
  env: NodeJS.ProcessEnv,
  exitGateDisabled: boolean,
  resolve: typeof resolveEffectiveConfig = resolveEffectiveConfig,
): Promise<ExitGateCarrierResolution> {
  const gate = resolveGate(
    await resolve(repoRoot, userConfigDir, env),
    EXIT_GATE_SKILL,
  );
  if (gate === null) return 'no_gate';
  return exitGateDisabled ? null : 'configured';
}

const AUTONOMOUS_MESSAGE =
  'A freshness waiver is operator-only; delivery waive refuses under OAT_AUTONOMOUS=1. Hand the stale delivery back to the operator.';

function refusal(
  code: WaiveRefusalCode,
  message: string,
  failures?: string[],
): { refusal: WaiveRefusal } {
  return {
    refusal:
      failures === undefined ? { code, message } : { code, message, failures },
  };
}

function sameArtifact(left: string | null, right: string | null): boolean {
  const canonical = (value: string | null) =>
    value?.replace(/^\.\//, '').replace(/^reviews\/archived\//, 'reviews/') ??
    null;
  return (
    left !== null && right !== null && canonical(left) === canonical(right)
  );
}

function pullHint(url: string): string {
  const number = url.match(/\/pull\/(\d+)/)?.[1];
  return number === undefined
    ? 'fetch the pull request head'
    : `fetch the pull request head (for example \`git fetch origin pull/${number}/head\`)`;
}

async function commitExists(
  git: GitRunner,
  repoRoot: string,
  sha: string,
): Promise<boolean> {
  const result = await git.run(
    ['rev-parse', '--verify', '--quiet', `${sha}^{commit}`],
    { cwd: repoRoot, allowFailure: true },
  );
  return result.code === 0;
}

/** Every consumer's verdict for `delivery` within `deliveries`. */
async function judgeDelivery(
  project: GoalDeliveryProject,
  deliveries: readonly GoalDelivery[],
  delivery: GoalDelivery,
  git: GitRunner,
  resolution: ExitGateCarrierResolution,
): Promise<WaiverEvidence> {
  const scope = deliveryEffectiveScope(deliveries, delivery);
  const working =
    delivery.milestone === null
      ? null
      : (project.state.milestoneGates?.[delivery.milestone]?.exit ?? null);
  const expected = {
    kind: 'code' as const,
    scope,
    match: 'covers' as const,
    overrideDisabled: project.exitGateDisabled,
    resolution,
  };
  const workingScope = deliveryEvidenceScope(
    { ...project, evidenceCarrier: working },
    deliveries,
    delivery,
  );
  const bindingScope = deliveryEvidenceScope(
    { ...project, evidenceCarrier: delivery.exit_gate },
    deliveries,
    delivery,
  );
  return {
    review: await evaluateDeliveryReview(git, workingScope, delivery, scope),
    closeoutReview: await evaluateDeliveryReview(
      git,
      bindingScope,
      delivery,
      scope,
    ),
    workingCarrier: await evaluateDeliveryExitCarrier(working, expected, {
      git,
      scope: workingScope,
      delivery,
    }),
    deliveryBinding: await evaluateDeliveryExitCarrier(
      delivery.exit_gate,
      expected,
      { git, scope: bindingScope, delivery },
    ),
  };
}

/**
 * A waived head would also skip a commit that changed the tracked shared gate
 * configuration, which no recorded resolution can reveal when a configured
 * gate stays configured. Compare `.oat/config.json` across exactly the walks
 * the freshness evaluators judge and the waiver would move: each member's
 * reviewed head (its `reviewed_head`, else its bound revision in
 * `integrated_review.bound_revisions`, as the review walk anchors it) to its
 * observed head (the integrated review), and a configured
 * carrier's reviewed head to the tip member's observed head for a stack, or to
 * every member's observed head for any other kind (`evaluateDeliveryExitCarrier`).
 * Returns the reason to refuse, or `null` when the file is unchanged; an
 * inspection failure refuses.
 */
async function sharedGateConfigurationChange(
  git: GitRunner,
  repoRoot: string,
  delivery: GoalDelivery,
  members: readonly DeliveryMember[],
  carriers: readonly (GoalDelivery['exit_gate'] | null)[],
): Promise<string | null> {
  const pairs: { anchor: string; head: string }[] = [];
  for (const [index, member] of members.entries()) {
    const anchor =
      member.reviewed_head ??
      delivery.integrated_review?.bound_revisions.find(
        (revision) => revision.member === index,
      )?.head ??
      null;
    if (anchor && member.observed_head) {
      pairs.push({ anchor, head: member.observed_head });
    }
  }
  const carrierMembers =
    delivery.kind === 'stack' ? members.slice(-1) : members;
  for (const carrier of carriers) {
    if (!carrier?.reviewed_head) continue;
    for (const member of carrierMembers) {
      if (member.observed_head) {
        pairs.push({
          anchor: carrier.reviewed_head,
          head: member.observed_head,
        });
      }
    }
  }
  const judged = new Set<string>();
  for (const { anchor, head } of pairs) {
    if (judged.has(`${anchor}..${head}`)) continue;
    judged.add(`${anchor}..${head}`);
    const diff = await git.run(
      ['diff', '--name-only', anchor, head, '--', SHARED_GATE_CONFIG_PATH],
      { cwd: repoRoot, allowFailure: true },
    );
    if (diff.code !== 0) {
      return `Cannot confirm ${SHARED_GATE_CONFIG_PATH} is unchanged between ${anchor} and ${delivery.delivery_id}'s observed head ${head}: ${diff.stderr.trim() || `git exited ${diff.code}`}`;
    }
    if (diff.stdout.trim() !== '') {
      return `${SHARED_GATE_CONFIG_PATH} changed between ${anchor} and ${delivery.delivery_id}'s observed head ${head}, so the gate configuration may differ from what the carriers recorded`;
    }
  }
  return null;
}

function staleReasons(evidence: WaiverEvidence): string[] {
  const reasons: string[] = [];
  if (!evidence.review.fresh) {
    reasons.push(`integrated review: ${evidence.review.reason ?? 'stale'}`);
  } else if (!evidence.closeoutReview.fresh) {
    reasons.push(
      `integrated review (closeout scope): ${evidence.closeoutReview.reason ?? 'stale'}`,
    );
  }
  if (evidence.workingCarrier.freshness !== 'fresh') {
    reasons.push(
      `milestone exit carrier: ${evidence.workingCarrier.reason ?? 'stale'}`,
    );
  }
  if (evidence.deliveryBinding.freshness !== 'fresh') {
    reasons.push(
      `delivery exit_gate: ${evidence.deliveryBinding.reason ?? 'stale'}`,
    );
  }
  return reasons;
}

/** Read the raw recovery record: the projection drops malformed entries. */
function rawFrontmatter(content: string): Record<string, unknown> {
  const parsed: unknown = YAML.parse(getFrontmatterBlock(content) ?? '');
  return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

/**
 * Decide the waiver for one delivery. Pure apart from the injected runners;
 * every refusal returns before anything is written.
 */
export async function planDeliveryWaiver(
  project: GoalDeliveryProject,
  input: WaiveInput,
  runners: WaiveRunners,
): Promise<{ plan: WaiverPlan } | { refusal: WaiveRefusal }> {
  if (runners.env.OAT_AUTONOMOUS === '1') {
    return refusal('autonomous', AUTONOMOUS_MESSAGE);
  }
  const reason = input.reason.trim();
  if (reason === '') {
    return refusal('reason-missing', 'A freshness waiver needs a --reason.');
  }
  let author = input.by?.trim() ?? '';
  if (author === '') {
    const configured = await runners.git.run(['config', 'user.name'], {
      cwd: project.repoRoot,
      allowFailure: true,
    });
    author = configured.code === 0 ? configured.stdout.trim() : '';
  }
  if (author === '') {
    return refusal(
      'author-missing',
      'No waiver author: pass --by <name> or set git user.name.',
    );
  }

  const deliveries = project.state.deliveries ?? [];
  const delivery = deliveries.find(
    (entry) => entry.delivery_id === input.deliveryId,
  );
  if (delivery === undefined) {
    return refusal(
      'unknown-delivery',
      `No registered delivery ${input.deliveryId} in oat_deliveries.`,
    );
  }
  if (delivery.status !== 'open' && delivery.status !== 'at_endpoint') {
    return refusal(
      'delivery-not-observable',
      `${delivery.delivery_id} is ${delivery.status ?? 'without a status'}; only an open or at-endpoint delivery can be observed and waived.`,
    );
  }

  // Observe every member live; any failure writes nothing.
  const observations: MemberObservation[] = [];
  const failures: string[] = [];
  for (const member of delivery.members) {
    if (member.url === null) {
      failures.push(`${delivery.delivery_id}: a member has no URL to observe`);
      continue;
    }
    const observed = await observeMember(runners.gh, member.url);
    if (typeof observed === 'string') {
      failures.push(`${delivery.delivery_id} ${member.url}: ${observed}`);
    } else {
      observations.push(observed);
    }
  }
  if (failures.length > 0 || delivery.members.length === 0) {
    return refusal(
      'observation-failed',
      `Delivery waive observed nothing: ${failures.join('; ') || 'the delivery has no members'}`,
      failures,
    );
  }
  for (const [index, observation] of observations.entries()) {
    if (
      !(await commitExists(runners.git, project.repoRoot, observation.head))
    ) {
      const url = delivery.members[index]!.url!;
      return refusal(
        'missing-object',
        `Observed head ${observation.head} of ${url} is not available locally; ${pullHint(url)} and run delivery waive again.`,
      );
    }
  }

  const members: DeliveryMember[] = delivery.members.map((member, index) => ({
    ...member,
    observed_head: observations[index]!.head,
    observed_base: observations[index]!.base,
    status: observations[index]!.status,
  }));
  const satisfied = endpointSatisfied(delivery.endpoint, members);
  const status =
    satisfied && delivery.status === 'open' ? 'at_endpoint' : delivery.status;
  const observedDelivery: GoalDelivery = { ...delivery, members, status };
  const observedDeliveries = deliveries.map((entry) =>
    entry.delivery_id === delivery.delivery_id ? observedDelivery : entry,
  );

  // A waiver covers head movement only: never a missing, failed or unpassed
  // review, and never a missing, blocked or invalid carrier.
  const rows = reviewRowsFor(project.state.reviews, [
    delivery.delivery_id,
    ...(delivery.milestone === null ? [] : [delivery.milestone]),
  ]);
  const governing = rows.at(-1);
  const recorded = delivery.integrated_review;
  if (
    governing === undefined ||
    governing.status.toLowerCase() !== 'passed' ||
    recorded === null ||
    recorded.disposition === 'failed' ||
    !sameArtifact(governing.artifact, recorded.artifact)
  ) {
    return refusal(
      'review-not-passed',
      governing === undefined
        ? `No ${delivery.delivery_id} code review row governs this delivery; a waiver never replaces a missing review.`
        : `The governing ${governing.scope} review row (${governing.artifact || 'no artifact'}, status ${governing.status}) is not a passed review of ${delivery.delivery_id}'s recorded artifact ${recorded?.artifact ?? 'none'}${recorded?.disposition === 'failed' ? ' (recorded disposition failed)' : ''}; a waiver never replaces a missing, failed or unreceived review.`,
    );
  }

  const working =
    delivery.milestone === null
      ? null
      : (project.state.milestoneGates?.[delivery.milestone]?.exit ?? null);
  const before = await judgeDelivery(
    project,
    observedDeliveries,
    observedDelivery,
    runners.git,
    runners.exitGateResolution,
  );
  for (const [label, evaluation] of [
    ['milestone exit carrier', before.workingCarrier],
    ['delivery exit_gate', before.deliveryBinding],
  ] as const) {
    if (evaluation.outcome !== 'allowed') {
      return refusal(
        'carrier-not-allowed',
        `The ${label} for ${delivery.delivery_id} is ${evaluation.outcome}${evaluation.reason ? ` (${evaluation.reason})` : ''}; a waiver never covers a missing, blocked or invalid carrier.`,
      );
    }
  }
  // A waiver never covers a reconfigured carrier: the gate must still
  // resolve as each carrier recorded it.
  for (const [label, evaluation] of [
    ['milestone exit carrier', before.workingCarrier],
    ['delivery exit_gate', before.deliveryBinding],
  ] as const) {
    if (evaluation.reason?.startsWith('configuration-changed') === true) {
      return refusal(
        'configuration-changed',
        `The ${label} for ${delivery.delivery_id} no longer matches the gate configuration (${evaluation.reason}); a waiver never covers a reconfigured carrier. Run the milestone exit gate again.`,
      );
    }
  }
  if (staleReasons(before).length === 0) {
    // Every consumer's live evaluation reads fresh. A stored `stale`
    // disposition then still makes `delivery check` report the delivery
    // undeliverable, and refresh never writes `passed`, so name the recovery
    // instead of a bare refusal. The waiver does not restore that record: it
    // covers head movement only.
    return refusal(
      'already-fresh',
      recorded.disposition === 'passed'
        ? `${delivery.delivery_id} is already fresh for every consumer; there is nothing to waive.`
        : `${delivery.delivery_id}'s live evidence already reads fresh for every consumer, so there is no head movement to waive, but its recorded integrated_review.disposition is ${recorded.disposition}, so delivery check still reports it undeliverable. Record a new integrated review of ${delivery.delivery_id} and receive it clean (oat-project-review-provide, then oat-project-review-receive), which rewrites the disposition to passed; delivery refresh never restores it.`,
    );
  }

  const changedConfiguration = await sharedGateConfigurationChange(
    runners.git,
    project.repoRoot,
    delivery,
    members,
    [working, delivery.exit_gate],
  );
  if (changedConfiguration !== null) {
    return refusal(
      'configuration-changed',
      `${changedConfiguration}; a waiver never covers a reconfigured carrier. Run the milestone exit gate again.`,
    );
  }

  const waiver: DeliveryFreshnessWaiver = {
    waived_by: author,
    reason,
    waived_at: runners.now().toISOString(),
    members: members.map((member) => ({
      url: member.url,
      waived_head: member.observed_head,
    })),
  };
  const waivedDelivery: GoalDelivery = {
    ...observedDelivery,
    freshness_waivers: [...(delivery.freshness_waivers ?? []), waiver],
  };
  const after = await judgeDelivery(
    project,
    observedDeliveries.map((entry) =>
      entry.delivery_id === delivery.delivery_id ? waivedDelivery : entry,
    ),
    waivedDelivery,
    runners.git,
    runners.exitGateResolution,
  );
  const remaining = staleReasons(after);
  if (remaining.length > 0) {
    return refusal(
      'not-head-movement',
      `${delivery.delivery_id} stays stale with the observed heads waived, so a waiver cannot cover it: ${remaining.join('; ')}`,
    );
  }

  const raw = rawFrontmatter(project.stateContent);
  const recovery = raw['oat_goal_recovery'];
  const clearsRecovery =
    recovery !== null &&
    typeof recovery === 'object' &&
    !Array.isArray(recovery) &&
    (recovery as Record<string, unknown>)['delivery_id'] ===
      delivery.delivery_id;
  const latest =
    delivery.milestone === null
      ? undefined
      : latestDeliveryForMilestone(observedDeliveries, delivery.milestone);
  return {
    plan: {
      deliveryId: delivery.delivery_id,
      milestone: delivery.milestone,
      waiver,
      observations,
      endpoint: { status, satisfied },
      restoresWorkingCarrier:
        latest?.delivery_id === delivery.delivery_id &&
        (project.state.milestoneGates?.[delivery.milestone!]?.exit ?? null) !==
          null,
      clearsRecovery,
      // The recovery contract (12.6): for the active milestone's own
      // delivery, clearing the record and writing `delivered` are one step.
      restoresMilestoneStatus:
        clearsRecovery && project.state.milestone === delivery.milestone,
      before,
      after,
    },
  };
}

function isUnsetNode(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isScalar(value) && (value.value === null || value.value === ''))
  );
}

/** Apply a waiver plan to `state.md` content in one frontmatter write. */
export function applyWaiverPlan(
  stateContent: string,
  plan: WaiverPlan,
): string {
  const block = getFrontmatterBlock(stateContent);
  if (block === null) {
    throw new CliError('state.md has no frontmatter to write', 1);
  }
  const document = YAML.parseDocument(block, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new CliError(
      `state.md frontmatter is malformed: ${document.errors[0]?.message ?? 'YAML error'}`,
      1,
    );
  }
  const delivery = resolvePath(document, [
    'oat_deliveries',
    { deliveryId: plan.deliveryId },
  ]);
  if (delivery === null) {
    throw new CliError(
      `oat_deliveries has no entry ${plan.deliveryId} to waive`,
      1,
    );
  }
  const set = (path: (string | number)[], value: unknown) =>
    document.setIn(path, document.createNode(value, { flow: false }));

  for (const [index, observation] of plan.observations.entries()) {
    const member = [...delivery, 'members', index];
    set([...member, 'observed_head'], observation.head);
    set([...member, 'observed_base'], observation.base);
    set([...member, 'status'], observation.status);
  }
  if (plan.endpoint.status === 'at_endpoint') {
    set([...delivery, 'status'], 'at_endpoint');
  }
  if (
    plan.endpoint.satisfied &&
    isUnsetNode(document.getIn([...delivery, 'endpoint_attainment'], true))
  ) {
    set([...delivery, 'endpoint_attainment'], {
      observed_at: plan.waiver.waived_at,
      members: plan.observations.map((observation, index) => ({
        url: plan.waiver.members[index]?.url ?? null,
        head: observation.head,
        base: observation.base,
        status: observation.status,
      })),
    });
  }

  const waivers = document.getIn([...delivery, 'freshness_waivers'], true);
  if (isSeq(waivers)) {
    waivers.add(document.createNode(plan.waiver, { flow: false }));
  } else if (isUnsetNode(waivers)) {
    set([...delivery, 'freshness_waivers'], [plan.waiver]);
  } else {
    throw new CliError(
      `${plan.deliveryId} freshness_waivers is not a list; repair state.md before waiving`,
      1,
    );
  }
  if (!isMap(document.getIn([...delivery, 'integrated_review'], true))) {
    throw new CliError(
      `${plan.deliveryId} has no integrated_review record to restore`,
      1,
    );
  }
  set([...delivery, 'integrated_review', 'disposition'], 'passed');

  if (plan.restoresWorkingCarrier && plan.milestone !== null) {
    const carrier = resolvePath(document, [
      'oat_milestone_gates',
      { milestone: plan.milestone },
      'exit',
    ]);
    if (carrier !== null) {
      set([...carrier, 'freshness'], 'fresh');
      set([...carrier, 'freshness_reason'], null);
    }
  }
  if (plan.clearsRecovery) {
    document.set('oat_goal_recovery', null);
  }
  if (plan.restoresMilestoneStatus) {
    document.set('oat_milestone_status', 'delivered');
  }

  const nextBlock = document.toString({ lineWidth: 0 }).replace(/\n$/, '');
  return replaceFrontmatter(stateContent, nextBlock);
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export interface DeliveryWaiveDependencies extends DeliveryProjectDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  gh: GhRunner;
  git: GitRunner;
  writeFile: (path: string, content: string) => Promise<void>;
  now: () => Date;
  env: NodeJS.ProcessEnv;
  resolveEffectiveConfig: typeof resolveEffectiveConfig;
}

const DEFAULT_WAIVE_DEPENDENCIES: DeliveryWaiveDependencies = {
  ...DEFAULT_DELIVERY_PROJECT_DEPENDENCIES,
  buildCommandContext,
  gh: defaultGhRunner,
  git: defaultGitRunner,
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  now: () => new Date(),
  env: process.env,
  resolveEffectiveConfig,
};

export async function waiveDelivery(
  projectArgument: string,
  cwd: string,
  input: WaiveInput,
  dependencies: DeliveryWaiveDependencies,
  userConfigDir: string,
): Promise<
  { plan: WaiverPlan; statePath: string } | { refusal: WaiveRefusal }
> {
  // Refuse an autonomous run before reading anything.
  if (dependencies.env.OAT_AUTONOMOUS === '1') {
    return refusal('autonomous', AUTONOMOUS_MESSAGE);
  }
  const project = await loadGoalDeliveryProject(
    projectArgument,
    cwd,
    dependencies,
  );
  const exitGateResolution = await exitGateCarrierResolution(
    project.repoRoot,
    userConfigDir,
    dependencies.env,
    project.exitGateDisabled,
    dependencies.resolveEffectiveConfig,
  );
  const planned = await planDeliveryWaiver(project, input, {
    ...dependencies,
    exitGateResolution,
  });
  if ('refusal' in planned) return planned;
  await dependencies.writeFile(
    project.statePath,
    applyWaiverPlan(project.stateContent, planned.plan),
  );
  return { plan: planned.plan, statePath: project.statePath };
}

export function createProjectDeliveryWaiveCommand(
  overrides: Partial<DeliveryWaiveDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_WAIVE_DEPENDENCIES, ...overrides };
  return new Command('waive')
    .description(
      'Operator only: record a head-bound freshness waiver for a registered goal delivery that is stale only through head movement, restoring its passed review in state.md (refuses under OAT_AUTONOMOUS=1)',
    )
    .requiredOption('--project <path>', 'Goal project path')
    .requiredOption('--delivery <id>', 'Registered delivery (dNN) to waive')
    .requiredOption('--reason <text>', 'Why the stale delivery is accepted')
    .option('--by <name>', 'Who waives it (default: git user.name)')
    .action(
      async (
        options: {
          project: string;
          delivery: string;
          reason: string;
          by?: string;
        },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        try {
          const result = await waiveDelivery(
            options.project,
            context.cwd,
            {
              deliveryId: options.delivery,
              reason: options.reason,
              by: options.by ?? null,
            },
            dependencies,
            join(context.home, '.oat'),
          );
          if ('refusal' in result) {
            if (context.json) {
              context.logger.json({ status: 'refused', ...result.refusal });
            } else {
              context.logger.error(
                `Delivery waive refused (${result.refusal.code}): ${result.refusal.message}`,
              );
            }
            process.exitCode = 1;
            return;
          }
          const { plan } = result;
          if (context.json) {
            context.logger.json({
              status: 'waived',
              deliveryId: plan.deliveryId,
              milestone: plan.milestone,
              waiver: plan.waiver,
              restoredDisposition: 'passed',
              restoredWorkingCarrier: plan.restoresWorkingCarrier,
              clearedRecovery: plan.clearsRecovery,
              restoredMilestoneStatus: plan.restoresMilestoneStatus
                ? 'delivered'
                : null,
              before: plan.before,
              after: plan.after,
              statePath: result.statePath,
            });
          } else {
            context.logger.info(
              [
                `Waived ${plan.deliveryId} at ${plan.waiver.members.map((member) => member.waived_head).join(', ')} (by ${plan.waiver.waived_by}: ${plan.waiver.reason}).`,
                `  was stale: ${staleReasons(plan.before).join('; ')}`,
                `  restored integrated_review.disposition: passed${plan.restoresWorkingCarrier ? `; ${plan.milestone} exit carrier freshness: fresh` : ''}${plan.clearsRecovery ? '; cleared oat_goal_recovery' : ''}${plan.restoresMilestoneStatus ? '; oat_milestone_status: delivered' : ''}`,
                `  next: commit ${result.statePath}, then run oat project delivery check --subject ${plan.deliveryId}`,
              ].join('\n'),
            );
          }
          process.exitCode = 0;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = error instanceof CliError ? error.exitCode : 1;
        }
      },
    );
}
