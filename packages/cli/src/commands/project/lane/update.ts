import { CliError } from '@errors/cli-error';

import {
  CLOSED_LANE_STATES,
  formatDispatchId,
  formatUpdateId,
  LANE_ID_PATTERN,
  LANE_PLACEMENTS,
  LANE_REPORTS_DIRNAME,
  LANE_STATES,
  laneDispatch,
  WAITING_ON_KINDS,
  type LaneBlock,
  type LaneDispatch,
  type LaneField,
  type LaneLedger,
  type LaneState,
} from './ledger';

/** Fields `lane set` takes directly; the rest are derived by the update. */
export type SettableLaneField = Exclude<
  LaneField,
  'state' | 'dispatch' | 'report' | 'last_observed'
>;

export interface LaneUpdateRequest {
  lane: string;
  state?: LaneState;
  /** Open the lane's next dispatch; its last one must be closed. */
  dispatch?: boolean;
  /** File a report for the open dispatch, closing it. */
  report?: boolean;
  /** Close the open dispatch with no report (an interrupted turn). */
  noReport?: boolean;
  /** A message to the running lane that amends its open dispatch. */
  steer?: string;
  /** New values; an empty string clears a field. */
  fields: Partial<Record<SettableLaneField, string>>;
}

export interface LaneUpdateResult {
  ledger: LaneLedger;
  /** The lane as this update left it, also when it moved to `## Closed`. */
  block: LaneBlock;
  updateId: string;
  created: boolean;
  closed: boolean;
  dispatch: LaneDispatch;
  changes: string[];
  /** `lane-reports/<lane>-<dispatch>.md`, when the update files a report. */
  reportPath?: string;
}

/** UTC time to the second, as ledger lines record it. */
export function ledgerTimestamp(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function refuse(message: string): CliError {
  return new CliError(message, 1);
}

function nextUpdateNumber(ledger: LaneLedger): number {
  return (
    Math.max(0, ...ledger.history.map((line) => Number(line.id.slice(1)))) + 1
  );
}

function validateFields(
  lane: string,
  fields: LaneUpdateRequest['fields'],
): void {
  const waitingOn = fields.waiting_on;
  if (
    waitingOn &&
    !(WAITING_ON_KINDS as readonly string[]).includes(waitingOn)
  ) {
    throw refuse(
      `--waiting-on must be one of ${WAITING_ON_KINDS.join(', ')}; got ${waitingOn}.`,
    );
  }
  const replacedBy = fields.replaced_by;
  if (
    replacedBy &&
    (!LANE_ID_PATTERN.test(replacedBy) || replacedBy === lane)
  ) {
    throw refuse(
      `--replaced-by needs another lane ID such as l02; got ${replacedBy}.`,
    );
  }
  const round = fields.review_round;
  if (round && !/^\d+$/.test(round)) {
    throw refuse(`--review-round must be a whole number; got ${round}.`);
  }
  const placement = fields.placement;
  if (
    placement &&
    !(LANE_PLACEMENTS as readonly string[]).includes(placement)
  ) {
    throw refuse(`Unknown lane placement ${placement}.`);
  }
}

/**
 * Apply one `lane set` to the ledger, without touching the file. The order is
 * fixed: a report or no-report closes the open dispatch, `dispatch` opens the
 * next one, a steer amends the open one, then fields and the state change.
 * Every update appends one `## History` line with a new update ID. A terminal
 * state moves the lane from `## Active` to `## Closed`.
 */
export function applyLaneUpdate(
  ledger: LaneLedger,
  request: LaneUpdateRequest,
  now: Date,
): LaneUpdateResult {
  const lane = request.lane;
  if (!LANE_ID_PATTERN.test(lane)) {
    throw refuse(
      `Lane IDs are a lowercase l and a zero-padded number, such as l01; got ${lane}.`,
    );
  }
  if (request.state && !LANE_STATES.includes(request.state)) {
    throw refuse(
      `--state must be one of ${LANE_STATES.join(', ')}; got ${request.state}.`,
    );
  }
  if (ledger.closed.some((line) => line.id === lane)) {
    throw refuse(
      `Lane ${lane} is closed and cannot be reopened. Start a new lane instead.`,
    );
  }
  validateFields(lane, request.fields);

  const next: LaneLedger = structuredClone(ledger);
  const stamp = ledgerTimestamp(now);
  const changes: string[] = [];
  let block = next.active.find((candidate) => candidate.id === lane);
  const created = block === undefined;
  if (!block) {
    block = { id: lane, fields: { dispatch: `${formatDispatchId(1)} open` } };
    next.active.push(block);
    changes.push('created', `${formatDispatchId(1)} opened`);
  }
  const before = { ...block.fields };
  let dispatch = laneDispatch(block);
  let impliedState: LaneState | undefined = created ? 'dispatched' : undefined;
  let reportPath: string | undefined;

  if (request.report || request.noReport) {
    if (dispatch.status !== 'open') {
      throw refuse(
        `Lane ${lane}'s dispatch ${dispatch.id} is already closed (${dispatch.status}); open the next one with --dispatch first.`,
      );
    }
    if (request.report) {
      reportPath = `${LANE_REPORTS_DIRNAME}/${lane}-${dispatch.id}.md`;
      block.fields.report = reportPath;
      dispatch = { ...dispatch, status: 'reported' };
      changes.push(`${dispatch.id} reported (${reportPath})`);
    } else {
      dispatch = { ...dispatch, status: 'no-report' };
      changes.push(`${dispatch.id} closed with no report`);
    }
    impliedState = 'turn-finished';
  }

  if (request.dispatch && !created) {
    if (dispatch.status === 'open') {
      throw refuse(
        `Lane ${lane}'s dispatch ${dispatch.id} is still open; file its report with --report, or close it with --no-report, before opening the next.`,
      );
    }
    dispatch = {
      id: formatDispatchId(dispatch.number + 1),
      number: dispatch.number + 1,
      status: 'open',
    };
    changes.push(`${dispatch.id} opened`);
    impliedState = 'dispatched';
  }
  block.fields.dispatch = `${dispatch.id} ${dispatch.status}`;

  if (request.steer !== undefined) {
    if (dispatch.status !== 'open') {
      throw refuse(
        `Lane ${lane} has no open dispatch to steer (${dispatch.id} is ${dispatch.status}); a message after the turn ended is a new dispatch (--dispatch).`,
      );
    }
    changes.push(`steer: ${request.steer}`);
  }

  for (const [field, value] of Object.entries(request.fields) as [
    SettableLaneField,
    string | undefined,
  ][]) {
    if (value === undefined) {
      continue;
    }
    if (value === '') {
      if (block.fields[field] !== undefined) {
        delete block.fields[field];
        changes.push(`${field} cleared`);
      }
    } else if (block.fields[field] !== value) {
      block.fields[field] = value;
      changes.push(`${field}: ${value}`);
    }
  }

  const state = request.state ?? impliedState ?? (before.state as LaneState);
  if (state === 'completed' && dispatch.status === 'open') {
    throw refuse(
      `Lane ${lane}'s dispatch ${dispatch.id} is still open. File its report with --report or settle it with --no-report before completing the lane.`,
    );
  }
  if (state !== before.state) {
    block.fields.state = state;
    changes.push(
      before.state === undefined
        ? `state ${state}`
        : `state ${before.state} → ${state}`,
    );
  }
  if (before.state === 'blocked' && state !== 'blocked') {
    for (const field of ['waiting_on', 'blocker'] as const) {
      if (
        request.fields[field] === undefined &&
        block.fields[field] !== undefined
      ) {
        delete block.fields[field];
        changes.push(`${field} cleared`);
      }
    }
  }
  if (state === 'blocked' && !block.fields.waiting_on) {
    throw refuse(
      `A blocked lane needs --waiting-on (${WAITING_ON_KINDS.join(', ')}).`,
    );
  }
  if (state !== 'blocked' && request.fields.waiting_on) {
    throw refuse('--waiting-on applies only to a blocked lane.');
  }
  if (state === 'superseded' && !block.fields.replaced_by) {
    throw refuse('A superseded lane needs --replaced-by <lane>.');
  }
  if (state !== 'superseded' && request.fields.replaced_by) {
    throw refuse('--replaced-by applies only to a superseded lane.');
  }
  block.fields.last_observed = stamp;

  const closed = CLOSED_LANE_STATES.includes(state);
  if (closed) {
    next.active = next.active.filter((candidate) => candidate.id !== lane);
    next.closed.push({
      id: lane,
      text: [
        state === 'superseded'
          ? `superseded by ${block.fields.replaced_by}`
          : state,
        stamp,
        `branch ${block.fields.branch ?? '-'}`,
        `head ${block.fields.head ?? '-'}`,
        `report ${block.fields.report ?? '-'}`,
      ].join(' · '),
    });
    changes.push('closed');
  }

  const updateId = formatUpdateId(nextUpdateNumber(next));
  next.history.push({
    id: updateId,
    text: [
      stamp,
      `${lane} ${dispatch.id}`,
      changes
        .filter((change) => !/^(?:task|thread)(?::| cleared$)/.test(change))
        .join('; ') ||
        (changes.length > 0 ? 'handles updated' : 'observed, no change'),
    ].join(' · '),
  });

  return {
    ledger: next,
    block,
    updateId,
    created,
    closed,
    dispatch,
    changes,
    ...(reportPath ? { reportPath } : {}),
  };
}
