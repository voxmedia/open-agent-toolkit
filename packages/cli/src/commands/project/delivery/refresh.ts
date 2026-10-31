import { writeFile } from 'node:fs/promises';

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
import { CliError } from '@errors/cli-error';
import {
  normalizeMilestoneId,
  type DeliveryMember,
  type DeliveryMemberStatus,
  type GoalDelivery,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import YAML, { isMap, isScalar, isSeq } from 'yaml';

import {
  DEFAULT_DELIVERY_PROJECT_DEPENDENCIES,
  deliveryEffectiveScope,
  loadGoalDeliveryProject,
  type DeliveryProjectDependencies,
  type GoalDeliveryProject,
} from './check';
import {
  deliveryEvidenceScope,
  evaluateDeliveryExitCarrier,
  evaluateDeliveryReview,
  latestDeliveryForMilestone,
  type CarrierEvaluation,
  type EvidenceScope,
  type ReviewEvaluation,
} from './evidence';

/**
 * `oat project delivery refresh` (design "Endpoint observation and
 * refresh"). It observes every registered delivery member through `gh pr
 * view <url> --json state,headRefOid,baseRefOid` and persists observations
 * and derived freshness only:
 *
 * - member `observed_head`, `observed_base` and `status`;
 * - delivery `status: at_endpoint` once the agreed endpoint is observed, and
 *   the first observed attainment in `endpoint_attainment`;
 * - `integrated_review.disposition: stale` and the milestone exit carrier's
 *   `freshness: stale` with `freshness_reason` when the shared evaluator
 *   finds the evidence no longer covers the observation.
 *
 * It never writes `oat_milestone_status` or `oat_goal_recovery`, never
 * rewrites a reviewed revision, a member base or the first endpoint
 * attainment, and never manufactures a passed review or a fresh carrier.
 * Observation is atomic: if any member cannot be observed nothing is written.
 */

export interface MemberObservation {
  head: string;
  base: string;
  status: DeliveryMemberStatus;
}

export type ObservationWriteMode = 'observe' | 'once';

/**
 * A path segment: a literal key or index, or a symbolic delivery/milestone
 * reference resolved against the raw YAML when the write is applied.
 */
export type ObservationPathSegment =
  | string
  | number
  | { deliveryId: string }
  | { milestone: string };

/**
 * One state write. `observe` writes may replace a stored observation; `once`
 * writes apply only while the stored value is unset. The never-overwrite rule
 * in `mayReplaceStoredValue` decides which stored values a write may replace.
 */
export interface ObservationWrite {
  path: ObservationPathSegment[];
  value: unknown;
  mode: ObservationWriteMode;
}

/** The only frontmatter keys a refresh writes under. */
const REFRESH_WRITE_ROOTS = new Set(['oat_deliveries', 'oat_milestone_gates']);

const MEMBER_OBSERVATION_LEAVES = new Set([
  'observed_head',
  'observed_base',
  'status',
]);
const CARRIER_FRESHNESS_LEAVES = new Set(['freshness', 'freshness_reason']);

/**
 * The never-overwrite rule (A4), structural rather than by leaf name: a
 * stored value may be replaced only by an `observe` write at one of the
 * observation paths —
 *
 * - `oat_deliveries[d].members[i].{observed_head, observed_base, status}`;
 * - `oat_deliveries[d].status`, only while the stored value is `open`;
 * - `oat_deliveries[d].integrated_review.disposition`;
 * - `oat_milestone_gates[m].{plan, exit}.{freshness, freshness_reason}`.
 *
 * Every other path — reviewed revisions, member bases, frozen scopes, review
 * identities, carrier outcomes and the first endpoint attainment — is
 * historical evidence and is written only while unset.
 */
function mayReplaceStoredValue(
  write: ObservationWrite,
  stored: unknown,
): boolean {
  if (write.mode !== 'observe') return false;
  const [root, , ...rest] = write.path;
  if (root === 'oat_deliveries') {
    if (
      rest.length === 3 &&
      rest[0] === 'members' &&
      typeof rest[1] === 'number' &&
      typeof rest[2] === 'string' &&
      MEMBER_OBSERVATION_LEAVES.has(rest[2])
    ) {
      return true;
    }
    if (rest.length === 1 && rest[0] === 'status') {
      return stored === 'open';
    }
    return (
      rest.length === 2 &&
      rest[0] === 'integrated_review' &&
      rest[1] === 'disposition'
    );
  }
  if (root === 'oat_milestone_gates') {
    return (
      rest.length === 2 &&
      (rest[0] === 'exit' || rest[0] === 'plan') &&
      typeof rest[1] === 'string' &&
      CARRIER_FRESHNESS_LEAVES.has(rest[1])
    );
  }
  return false;
}

export interface DeliveryRefreshResult {
  deliveryId: string;
  milestone: string | null;
  status: GoalDelivery['status'];
  endpointSatisfied: boolean;
  members: {
    url: string | null;
    observed_head: string | null;
    observed_base: string | null;
    status: DeliveryMemberStatus | null;
  }[];
  review: ReviewEvaluation;
}

export interface RefreshReport {
  deliveries: DeliveryRefreshResult[];
  exitCarriers: {
    milestone: string;
    delivery: string;
    evaluation: CarrierEvaluation;
  }[];
  writes: ObservationWrite[];
  changed: boolean;
}

const PR_STATES: Record<string, DeliveryMemberStatus> = {
  OPEN: 'open',
  MERGED: 'merged',
  CLOSED: 'closed',
};

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export async function observeMember(
  gh: GhRunner,
  url: string,
): Promise<MemberObservation | string> {
  const viewed = await gh.run([
    'pr',
    'view',
    url,
    '--json',
    'state,headRefOid,baseRefOid',
  ]);
  if (viewed.code !== 0) {
    return viewed.missing
      ? 'the GitHub CLI is unavailable'
      : `gh pr view failed: ${viewed.stderr || viewed.stdout || `exit ${viewed.code}`}`;
  }
  try {
    const parsed = JSON.parse(viewed.stdout) as Record<string, unknown>;
    const status = PR_STATES[String(parsed['state'] ?? '')];
    const head = parsed['headRefOid'];
    const base = parsed['baseRefOid'];
    if (
      status === undefined ||
      typeof head !== 'string' ||
      typeof base !== 'string' ||
      !SHA_PATTERN.test(head) ||
      !SHA_PATTERN.test(base)
    ) {
      return 'gh returned an incomplete observation';
    }
    return { head, base, status };
  } catch {
    return 'gh returned output that is not JSON';
  }
}

/** Endpoint satisfaction on observed member state (design "Endpoint satisfaction"). */
export function endpointSatisfied(
  endpoint: GoalDelivery['endpoint'],
  members: readonly Pick<DeliveryMember, 'status'>[],
): boolean {
  if (members.length === 0 || endpoint === null) return false;
  return endpoint === 'merged'
    ? members.every((member) => member.status === 'merged')
    : members.every(
        (member) => member.status === 'open' || member.status === 'merged',
      );
}

/** Deliveries a refresh observes: registered and not replaced. */
function isObservable(delivery: GoalDelivery): boolean {
  return delivery.status === 'open' || delivery.status === 'at_endpoint';
}

/**
 * Compute the refresh for a loaded goal project: observe members, derive
 * endpoint and freshness, and return the state writes. Pure apart from the
 * injected `gh` and `git` runners.
 */
export async function planDeliveryRefresh(
  project: GoalDeliveryProject,
  runners: { gh: GhRunner; git: GitRunner; now: () => Date },
): Promise<RefreshReport | { failures: string[] }> {
  const deliveries = project.state.deliveries ?? [];
  const observations = new Map<string, (MemberObservation | null)[]>();
  const failures: string[] = [];

  for (const delivery of deliveries.filter(isObservable)) {
    const observed: (MemberObservation | null)[] = [];
    for (const member of delivery.members) {
      if (member.url === null) {
        failures.push(
          `${delivery.delivery_id}: a member has no URL to observe`,
        );
        observed.push(null);
        continue;
      }
      const result = await observeMember(runners.gh, member.url);
      if (typeof result === 'string') {
        failures.push(`${delivery.delivery_id} ${member.url}: ${result}`);
        observed.push(null);
      } else {
        observed.push(result);
      }
    }
    observations.set(delivery.delivery_id, observed);
  }
  if (failures.length > 0) {
    // Failure to observe a required member is never endpoint success, and a
    // partial refresh would mix observations from different moments.
    return { failures };
  }

  const writes: ObservationWrite[] = [];
  const results: DeliveryRefreshResult[] = [];
  const observedById = new Map<string, GoalDelivery>();
  const deliveryPath = (delivery: GoalDelivery): ObservationPathSegment[] => [
    'oat_deliveries',
    { deliveryId: delivery.delivery_id },
  ];

  for (const delivery of deliveries.filter(isObservable)) {
    const observed = observations.get(delivery.delivery_id) ?? [];
    const members: DeliveryMember[] = delivery.members.map((member, index) => {
      const observation = observed[index];
      return observation
        ? {
            ...member,
            observed_head: observation.head,
            observed_base: observation.base,
            status: observation.status,
          }
        : member;
    });
    for (const [index, observation] of observed.entries()) {
      if (!observation) continue;
      const memberPath = [...deliveryPath(delivery), 'members', index];
      writes.push(
        {
          path: [...memberPath, 'observed_head'],
          value: observation.head,
          mode: 'observe',
        },
        {
          path: [...memberPath, 'observed_base'],
          value: observation.base,
          mode: 'observe',
        },
        {
          path: [...memberPath, 'status'],
          value: observation.status,
          mode: 'observe',
        },
      );
    }

    const satisfied = endpointSatisfied(delivery.endpoint, members);
    let status = delivery.status;
    if (satisfied) {
      if (status === 'open') {
        status = 'at_endpoint';
        writes.push({
          path: [...deliveryPath(delivery), 'status'],
          value: 'at_endpoint',
          mode: 'observe',
        });
      }
      writes.push({
        path: [...deliveryPath(delivery), 'endpoint_attainment'],
        value: {
          observed_at: runners.now().toISOString(),
          members: members.map((member) => ({
            url: member.url,
            head: member.observed_head,
            base: member.observed_base,
            status: member.status,
          })),
        },
        mode: 'once',
      });
    }

    const observedDelivery: GoalDelivery = { ...delivery, members, status };
    observedById.set(delivery.delivery_id, observedDelivery);
    const review = await evaluateDeliveryReview(
      runners.git,
      evidenceScope(project, observedDelivery),
      observedDelivery,
      deliveryEffectiveScope(deliveries, observedDelivery),
    );
    if (
      delivery.integrated_review !== null &&
      !review.fresh &&
      delivery.integrated_review.disposition === 'passed'
    ) {
      writes.push({
        path: [...deliveryPath(delivery), 'integrated_review', 'disposition'],
        value: 'stale',
        mode: 'observe',
      });
    }
    results.push({
      deliveryId: delivery.delivery_id,
      milestone: delivery.milestone,
      status,
      endpointSatisfied: satisfied,
      members: members.map((member) => ({
        url: member.url,
        observed_head: member.observed_head,
        observed_base: member.observed_base,
        status: member.status,
      })),
      review,
    });
  }

  // The milestone exit carrier is judged for each milestone's latest
  // registered delivery. Refresh records only staleness: it never upgrades a
  // carrier to fresh, which only implement's scoped closeout writes.
  const exitCarriers: RefreshReport['exitCarriers'] = [];
  const observedDeliveries = [...observedById.values()];
  const milestones = new Set(
    observedDeliveries
      .map((delivery) => delivery.milestone)
      .filter((milestone): milestone is string => milestone !== null),
  );
  for (const milestone of milestones) {
    const delivery = latestDeliveryForMilestone(observedDeliveries, milestone)!;
    const carrier = project.state.milestoneGates?.[milestone]?.exit ?? null;
    if (carrier === null) continue;
    const scope = evidenceScope(project, delivery);
    const evaluation = await evaluateDeliveryExitCarrier(
      carrier,
      {
        kind: 'code',
        scope: deliveryEffectiveScope(deliveries, delivery),
        match: 'covers',
        overrideDisabled: project.exitGateDisabled,
      },
      { git: runners.git, scope, delivery },
    );
    exitCarriers.push({
      milestone,
      delivery: delivery.delivery_id,
      evaluation,
    });
    if (evaluation.freshness === 'stale') {
      const carrierPath: ObservationPathSegment[] = [
        'oat_milestone_gates',
        { milestone },
        'exit',
      ];
      writes.push(
        {
          path: [...carrierPath, 'freshness'],
          value: 'stale',
          mode: 'observe',
        },
        {
          path: [...carrierPath, 'freshness_reason'],
          value: `delivery refresh (${delivery.delivery_id}): ${evaluation.reason ?? 'stale'}`,
          mode: 'observe',
        },
      );
    }
  }

  return { deliveries: results, exitCarriers, writes, changed: false };
}

function evidenceScope(
  project: GoalDeliveryProject,
  delivery: GoalDelivery,
): EvidenceScope {
  return deliveryEvidenceScope(
    project,
    project.state.deliveries ?? [],
    delivery,
  );
}

// ---------------------------------------------------------------------------
// Applying writes to state.md frontmatter
// ---------------------------------------------------------------------------

function isUnsetNode(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isScalar(value) && (value.value === null || value.value === ''))
  );
}

/**
 * Resolve the symbolic path segments (`{ deliveryId }`, `{ milestone }`) to
 * the raw YAML indices and keys, so a write lands on the entry the reader
 * parsed even when the raw list holds unparseable entries or `m1` spelling.
 */
function resolvePath(
  document: YAML.Document,
  path: readonly ObservationPathSegment[],
): (string | number)[] | null {
  const resolved: (string | number)[] = [];
  for (const segment of path) {
    if (typeof segment !== 'object') {
      resolved.push(segment);
      continue;
    }
    const parent = document.getIn(resolved, true);
    if ('deliveryId' in segment) {
      if (!isSeq(parent)) return null;
      const index = parent.items.findIndex(
        (item) =>
          isMap(item) && String(item.get('delivery_id')) === segment.deliveryId,
      );
      if (index < 0) return null;
      resolved.push(index);
    } else {
      if (!isMap(parent)) return null;
      const key = parent.items
        .map((pair) => (isScalar(pair.key) ? String(pair.key.value) : null))
        .find(
          (raw) =>
            raw !== null && normalizeMilestoneId(raw) === segment.milestone,
        );
      if (key === undefined || key === null) return null;
      resolved.push(key);
    }
  }
  return resolved;
}

/**
 * Apply refresh writes to `state.md` under the never-overwrite rule
 * (`mayReplaceStoredValue`). Returns the new content, or the original when
 * nothing changed.
 */
export function applyObservationWrites(
  stateContent: string,
  writes: readonly ObservationWrite[],
): { content: string; changed: boolean; applied: ObservationWrite[] } {
  const block = getFrontmatterBlock(stateContent);
  if (block === null) {
    throw new CliError('state.md has no frontmatter to refresh', 1);
  }
  const document = YAML.parseDocument(block, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new CliError(
      `state.md frontmatter is malformed: ${document.errors[0]?.message ?? 'YAML error'}`,
      1,
    );
  }

  const applied: ObservationWrite[] = [];
  for (const write of writes) {
    const [root] = write.path;
    if (typeof root !== 'string' || !REFRESH_WRITE_ROOTS.has(root)) {
      // Refresh never writes milestone status, recovery or any other key.
      throw new CliError(
        `delivery refresh may not write ${String(root)}; it records delivery observations and derived freshness only`,
        2,
      );
    }
    const path = resolvePath(document, write.path);
    if (path === null) continue;
    const current = document.getIn(path, true);
    if (
      !isUnsetNode(current) &&
      !mayReplaceStoredValue(
        write,
        isScalar(current) ? current.value : document.getIn(path),
      )
    ) {
      continue;
    }
    const previous = document.getIn(path);
    if (JSON.stringify(previous) === JSON.stringify(write.value)) continue;
    document.setIn(path, document.createNode(write.value, { flow: false }));
    applied.push({ ...write, path });
  }

  if (applied.length === 0) {
    return { content: stateContent, changed: false, applied };
  }
  const nextBlock = document.toString({ lineWidth: 0 }).replace(/\n$/, '');
  return {
    content: replaceFrontmatter(stateContent, nextBlock),
    changed: true,
    applied,
  };
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export interface DeliveryRefreshDependencies extends DeliveryProjectDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  gh: GhRunner;
  git: GitRunner;
  writeFile: (path: string, content: string) => Promise<void>;
  now: () => Date;
}

const DEFAULT_REFRESH_DEPENDENCIES: DeliveryRefreshDependencies = {
  ...DEFAULT_DELIVERY_PROJECT_DEPENDENCIES,
  buildCommandContext,
  gh: defaultGhRunner,
  git: defaultGitRunner,
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  now: () => new Date(),
};

export async function refreshDeliveries(
  projectArgument: string,
  cwd: string,
  dependencies: DeliveryRefreshDependencies,
): Promise<RefreshReport | { failures: string[] }> {
  const project = await loadGoalDeliveryProject(
    projectArgument,
    cwd,
    dependencies,
  );
  const planned = await planDeliveryRefresh(project, dependencies);
  if ('failures' in planned) {
    return planned;
  }
  const result = applyObservationWrites(project.stateContent, planned.writes);
  if (result.changed) {
    await dependencies.writeFile(project.statePath, result.content);
  }
  return { ...planned, writes: result.applied, changed: result.changed };
}

export function createProjectDeliveryRefreshCommand(
  overrides: Partial<DeliveryRefreshDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_REFRESH_DEPENDENCIES, ...overrides };
  return new Command('refresh')
    .description(
      'Observe registered goal delivery members with gh and persist observations, endpoint attainment and derived staleness in state.md',
    )
    .requiredOption('--project <path>', 'Goal project path')
    .action(async (options: { project: string }, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const report = await refreshDeliveries(
          options.project,
          context.cwd,
          dependencies,
        );
        if ('failures' in report) {
          const message = `Delivery refresh observed nothing: ${report.failures.join('; ')}`;
          if (context.json) {
            context.logger.json({
              status: 'failed',
              failures: report.failures,
              message,
            });
          } else {
            context.logger.error(message);
          }
          process.exitCode = 1;
          return;
        }
        if (context.json) {
          context.logger.json({ status: 'ok', ...report });
        } else {
          context.logger.info(
            [
              `Refreshed ${report.deliveries.length} delivery(ies)${report.changed ? '' : '; state.md unchanged'}.`,
              ...report.deliveries.map(
                (delivery) =>
                  `  ${delivery.deliveryId}: ${delivery.status ?? 'unknown'}${delivery.endpointSatisfied ? ' (endpoint observed)' : ''}; review ${delivery.review.fresh ? 'fresh' : `stale: ${delivery.review.reason ?? 'unknown'}`}`,
              ),
              ...report.exitCarriers.map(
                (carrier) =>
                  `  ${carrier.milestone} exit carrier: ${carrier.evaluation.freshness}${carrier.evaluation.reason ? ` (${carrier.evaluation.reason})` : ''}`,
              ),
            ].join('\n'),
          );
        }
        process.exitCode = 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = error instanceof CliError ? error.exitCode : 1;
      }
    });
}
