import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { type ValidationRunState, ValidationStore } from './validation-store';

export interface IssuedCommandCapabilities {
  checkpointToken: string;
  planToken: string;
}

function digest(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export async function issueCommandCapabilities(
  store: ValidationStore,
  runId: string,
): Promise<IssuedCommandCapabilities> {
  const checkpointToken = randomBytes(32).toString('base64url');
  const planToken = randomBytes(32).toString('base64url');
  await store.updateRun(runId, (state) => {
    if (state.capabilities !== null) {
      throw new Error('command capabilities already issued');
    }
    state.capabilities = {
      checkpointDigest: digest(checkpointToken),
      planDigest: digest(planToken),
      checkpointUsed: false,
      planUsed: false,
    };
    return state;
  });
  return { checkpointToken, planToken };
}

export async function bindAcceptedHandle(
  store: ValidationStore,
  runId: string,
  handleId: string,
): Promise<string> {
  if (handleId.length === 0) throw new Error('accepted handle ID is required');
  const handleDigest = digest(handleId);
  await store.updateRun(runId, (state) => {
    if (state.acceptedHandleDigest !== null) {
      throw new Error('accepted handle is already bound');
    }
    state.acceptedHandleDigest = handleDigest;
    return state;
  });
  return handleDigest;
}

export async function consumeCommandCapability(
  store: ValidationStore,
  runId: string,
  kind: 'checkpoint' | 'plan',
  token: string,
): Promise<void> {
  await store.updateRun(runId, (state) => {
    verifyAndConsumeCommandCapability(state, kind, token);
    return state;
  });
}

export function verifyAndConsumeCommandCapability(
  state: ValidationRunState,
  kind: 'checkpoint' | 'plan',
  token: string,
): void {
  verifyCommandCapability(state, kind, token);
  if (kind === 'checkpoint') state.capabilities!.checkpointUsed = true;
  else state.capabilities!.planUsed = true;
}

export function verifyCommandCapability(
  state: ValidationRunState,
  kind: 'checkpoint' | 'plan',
  token: string,
): void {
  if (state.acceptedHandleDigest === null) {
    throw new Error('accepted handle must be bound before mutation');
  }
  if (state.capabilities === null) {
    throw new Error('command capabilities were not issued');
  }
  const expected =
    kind === 'checkpoint'
      ? state.capabilities.checkpointDigest
      : state.capabilities.planDigest;
  const used =
    kind === 'checkpoint'
      ? state.capabilities.checkpointUsed
      : state.capabilities.planUsed;
  const actual = digest(token);
  if (
    used ||
    expected.length !== actual.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  ) {
    throw new Error(`invalid or consumed ${kind} capability`);
  }
}

function quoteArgument(argument: string): string {
  return `'${argument.replaceAll("'", "'\"'\"'")}'`;
}

export function renderReviewCommands(input: {
  cli: string;
  runId: string;
  checkpointToken: string;
  planToken: string;
}): {
  checkpointArtifacts: string;
  validatePlan: string;
  beginEvidence: string;
} {
  const command = (args: string[]) =>
    [input.cli, ...args].map(quoteArgument).join(' ');
  return {
    checkpointArtifacts: command([
      'review',
      'checkpoint-artifacts',
      '--run-id',
      input.runId,
      '--checkpoint-token',
      input.checkpointToken,
      '--json',
    ]),
    validatePlan: command([
      'review',
      'validate-plan',
      '--run-id',
      input.runId,
      '--command-token',
      input.planToken,
      '--stdin',
      '--json',
    ]),
    beginEvidence: command([
      'review',
      'begin-evidence',
      '--run-id',
      input.runId,
      '--receipt',
      '__OAT_PLAN_RECEIPT__',
      '--json',
    ]),
  };
}
