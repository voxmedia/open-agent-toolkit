import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { createConnection, createServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseStrictJson } from './canonical-json';
import { DefaultGitChangeMapAdapter } from './change-map';
import { bindAcceptedHandle } from './command-capabilities';
import {
  deserializeReviewError,
  ReviewDomainError,
  type ReviewErrorEnvelopeV1,
  serializeReviewError,
} from './errors';
import {
  type PrepareReviewContextInput,
  prepareReviewContext,
} from './prepare-context';
import {
  beginEvidence,
  checkpointArtifactsLoaded,
  validateAndReceiptPlan,
} from './review-lifecycle';
import { parseReviewPlanV1 } from './schemas';
import type { PrepareReviewContextResultV1, ReviewPlanV1 } from './types';
import { ValidationStore } from './validation-store';
import {
  consumeLauncherValidationAuthorityKey,
  launcherValidationStoreRoot,
  reviewerSafeEnvironment,
  ValidationStoreAuthority,
} from './validation-store-authority';

const MAX_BROKER_REQUEST_BYTES = 2 * 1024 * 1024;

type BrokerRequest =
  | {
      action: 'checkpoint';
      runId: string;
      checkpointToken: string;
    }
  | {
      action: 'validate';
      runId: string;
      commandToken: string;
      plan: ReviewPlanV1;
    }
  | {
      action: 'begin';
      runId: string;
      receipt: string;
    };

type VersionedBrokerRequest = BrokerRequest & { schemaVersion: 1 };

interface BrokerStartup {
  input: PrepareReviewContextInput;
  launcherInvocation: { executable: string; argvPrefix: string[] };
}

interface AcceptedContinuationBinding {
  schemaVersion: 1;
  handleId: string;
}

type BrokerResponse =
  | { schemaVersion: 1; ok: true; result: unknown }
  | {
      schemaVersion: 1;
      ok: false;
      error: ReviewErrorEnvelopeV1;
    };

interface BrokerStartupResponse {
  ok: boolean;
  result?: PrepareReviewContextResultV1;
  error?: string;
}

function brokerCommands(
  result: PrepareReviewContextResultV1,
  socketPath: string,
): PrepareReviewContextResultV1 {
  return {
    ...result,
    commands: Object.fromEntries(
      Object.entries(result.commands).map(([name, invocation]) => [
        name,
        {
          ...invocation,
          argv: [...invocation.argv, '--broker-socket', socketPath],
        },
      ]),
    ) as PrepareReviewContextResultV1['commands'],
  };
}

function readSocketJson(socket: Socket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    socket.on('data', (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > MAX_BROKER_REQUEST_BYTES) {
        reject(new Error('validation authority broker request is too large'));
        socket.destroy();
        return;
      }
      chunks.push(chunk);
    });
    socket.on('end', () => {
      try {
        resolve(parseStrictJson(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    socket.on('error', reject);
  });
}

export async function requestValidationAuthorityBroker<T>(
  socketPath: string,
  request: BrokerRequest,
): Promise<T> {
  const socket = createConnection(socketPath);
  socket.end(JSON.stringify({ schemaVersion: 1, ...request }));
  const response = parseBrokerResponse(await readSocketJson(socket));
  if (!response.ok) {
    throw deserializeReviewError(response.error);
  }
  return response.result as T;
}

export async function startPreparedValidationAuthorityBroker(input: {
  socketPath: string;
  key: Uint8Array;
  startup: BrokerStartup;
  acceptedContinuation: AcceptedContinuationBinding;
  validationRoot?: string;
}): Promise<{
  preparation: PrepareReviewContextResultV1;
  closed: Promise<void>;
  close: () => Promise<void>;
}> {
  const authority = new ValidationStoreAuthority(input.key);
  const store = new ValidationStore(
    input.validationRoot ??
      launcherValidationStoreRoot({ repoRoot: input.startup.input.repoRoot }),
    authority,
  );
  const preparation = brokerCommands(
    await prepareReviewContext(input.startup.input, {
      store,
      git: new DefaultGitChangeMapAdapter(),
      telemetryAdapter: null,
      telemetryAdapterId: null,
      commandExecutable: input.startup.launcherInvocation.executable,
      commandArgvPrefix: input.startup.launcherInvocation.argvPrefix,
    }),
    input.socketPath,
  );
  await bindAcceptedHandle(
    store,
    preparation.preparation.runId,
    input.acceptedContinuation.handleId,
  );
  await mkdir(join(input.socketPath, '..'), { recursive: true });
  await rm(input.socketPath, { force: true });
  let resolveClosed!: () => void;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  let finished = false;
  const finish = async () => {
    if (finished) return;
    finished = true;
    await rm(input.socketPath, { force: true });
    resolveClosed();
  };
  const server = createServer({ allowHalfOpen: true });
  const closeBroker = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        finish().then(resolve, reject);
      });
    });
  const handleConnection = async (socket: Socket) => {
    let response: BrokerResponse;
    let closeAfterResponse = false;
    try {
      const request = await readBrokerRequest(socket);
      const lifecycle = { store };
      switch (request.action) {
        case 'checkpoint':
          response = {
            schemaVersion: 1,
            ok: true,
            result: await checkpointArtifactsLoaded(request, {
              ...lifecycle,
              telemetryAdapter: null,
              telemetryAdapterId: null,
            }),
          };
          break;
        case 'validate':
          response = {
            schemaVersion: 1,
            ok: true,
            result: await validateAndReceiptPlan(request, lifecycle),
          };
          break;
        case 'begin':
          response = {
            schemaVersion: 1,
            ok: true,
            result: await beginEvidence(request, lifecycle),
          };
          closeAfterResponse = true;
          break;
        default:
          throw new Error('validation authority broker action is invalid');
      }
    } catch (error) {
      response = {
        schemaVersion: 1,
        ok: false,
        error: serializeReviewError(error),
      };
    }
    socket.end(JSON.stringify(response));
    if (closeAfterResponse) {
      await closeBroker();
    }
  };
  server.on('connection', (socket) => {
    handleConnection(socket).catch((error: unknown) => {
      const response: BrokerResponse = {
        schemaVersion: 1,
        ok: false,
        error: serializeReviewError(error),
      };
      if (socket.destroyed) return;
      socket.end(JSON.stringify(response));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(input.socketPath, resolve);
  });
  const expiresInMs = Math.max(
    1,
    Date.parse(preparation.preparation.expiresAt) - Date.now(),
  );
  const expiry = setTimeout(() => {
    closeBroker().catch(() => undefined);
  }, expiresInMs);
  expiry.unref();
  closed.finally(() => clearTimeout(expiry)).catch(() => undefined);
  return {
    preparation,
    closed,
    close: closeBroker,
  };
}

export async function launchValidationAuthorityBroker(input: {
  preparationInput: PrepareReviewContextInput;
  launcherInvocation: { executable: string; argvPrefix: string[] };
  environment?: NodeJS.ProcessEnv;
}): Promise<PrepareReviewContextResultV1> {
  const environment = input.environment ?? process.env;
  const key = consumeLauncherValidationAuthorityKey(environment);
  const socketPath = join(
    tmpdir(),
    `oat-review-authority-${process.pid}-${randomBytes(8).toString('hex')}.sock`,
  );
  const child = spawn(
    input.launcherInvocation.executable,
    [
      ...input.launcherInvocation.argvPrefix,
      'review',
      'authority-broker',
      '--socket',
      socketPath,
    ],
    {
      detached: true,
      env: reviewerSafeEnvironment(environment),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe', 'pipe'],
    },
  );
  try {
    const startup = child.stdio[3] as NodeJS.WritableStream | null;
    const authority = child.stdio[4] as NodeJS.WritableStream | null;
    const acceptedContinuation = (
      child.stdio as unknown as Array<
        NodeJS.ReadableStream | NodeJS.WritableStream | null | undefined
      >
    )[5] as NodeJS.WritableStream | null | undefined;
    if (!startup || !authority || !acceptedContinuation || !child.stdout) {
      throw new Error('validation authority broker pipes are unavailable');
    }
    await Promise.all([
      writeStartupPipe(
        startup,
        JSON.stringify({
          input: input.preparationInput,
          launcherInvocation: input.launcherInvocation,
        } satisfies BrokerStartup),
      ),
      writeStartupPipe(authority, key.toString('base64url')),
      writeStartupPipe(
        acceptedContinuation,
        JSON.stringify({
          schemaVersion: 1,
          handleId: randomBytes(32).toString('base64url'),
        } satisfies AcceptedContinuationBinding),
      ),
    ]);
    const result = await readBrokerStartupResponse(child);
    for (const stream of [
      startup,
      authority,
      acceptedContinuation,
      child.stdout,
      child.stderr,
    ]) {
      destroyAndUnref(stream);
    }
    child.unref();
    return result;
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
    throw error;
  } finally {
    key.fill(0);
  }
}

async function writeStartupPipe(
  stream: NodeJS.WritableStream,
  value: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.once('error', reject);
    stream.end(value, resolve);
  });
  destroyAndUnref(stream);
}

function destroyAndUnref(
  stream: NodeJS.ReadableStream | NodeJS.WritableStream | null,
): void {
  const detachable = stream as unknown as {
    destroy?: () => void;
    unref?: () => void;
  } | null;
  detachable?.destroy?.();
  detachable?.unref?.();
}

async function readBrokerStartupResponse(
  child: ReturnType<typeof spawn>,
): Promise<PrepareReviewContextResultV1> {
  if (!child.stdout) {
    throw new Error('validation authority broker stdout is unavailable');
  }
  return new Promise<PrepareReviewContextResultV1>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(
      () => reject(new Error('validation authority broker startup timed out')),
      10_000,
    );
    const finish = (
      outcome:
        | { ok: true; value: PrepareReviewContextResultV1 }
        | { ok: false; error: unknown },
    ) => {
      clearTimeout(timer);
      child.removeListener('error', reject);
      child.removeListener('exit', onExit);
      if (outcome.ok) resolve(outcome.value);
      else reject(outcome.error);
    };
    const onExit = (code: number | null) => {
      if (code !== null && code !== 0) {
        finish({
          ok: false,
          error: new Error(
            `validation authority broker exited with code ${code}`,
          ),
        });
      }
    };
    child.once('error', reject);
    child.once('exit', onExit);
    child.stdout!.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      const source = Buffer.concat(chunks).toString('utf8');
      const newline = source.indexOf('\n');
      if (newline < 0) return;
      const response = JSON.parse(
        source.slice(0, newline),
      ) as BrokerStartupResponse;
      if (!response.ok) {
        finish({
          ok: false,
          error: new Error(response.error ?? 'broker startup failed'),
        });
      } else {
        finish({
          ok: true,
          value: response.result!,
        });
      }
    });
  });
}

export type { AcceptedContinuationBinding, BrokerRequest, BrokerStartup };

async function readBrokerRequest(
  socket: Socket,
): Promise<VersionedBrokerRequest> {
  try {
    return parseBrokerRequest(await readSocketJson(socket));
  } catch {
    throw new ReviewDomainError({
      category: 'input',
      code: 'validation-authority-broker-request-invalid',
      message: 'validation authority broker request is invalid',
    });
  }
}

function parseBrokerRequest(value: unknown): VersionedBrokerRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('broker request must be an object');
  }
  const request = value as Record<string, unknown>;
  if (request.schemaVersion !== 1) {
    throw new Error('broker request schema version is invalid');
  }
  if (!['checkpoint', 'validate', 'begin'].includes(String(request.action))) {
    throw new Error('broker request action is invalid');
  }
  const action = request.action as BrokerRequest['action'];
  const expectedKeys = {
    checkpoint: 'action,checkpointToken,runId,schemaVersion',
    validate: 'action,commandToken,plan,runId,schemaVersion',
    begin: 'action,receipt,runId,schemaVersion',
  }[action];
  if (Object.keys(request).sort().join(',') !== expectedKeys) {
    throw new Error('broker request fields are invalid');
  }
  if (
    typeof request.runId !== 'string' ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(request.runId)
  ) {
    throw new Error('broker request run ID is invalid');
  }
  if (action === 'checkpoint') {
    assertBrokerToken(request.checkpointToken);
    return request as VersionedBrokerRequest;
  }
  if (action === 'validate') {
    assertBrokerToken(request.commandToken);
    return {
      schemaVersion: 1,
      action,
      runId: request.runId,
      commandToken: request.commandToken,
      plan: parseReviewPlanV1(request.plan),
    };
  }
  assertBrokerToken(request.receipt);
  return request as VersionedBrokerRequest;
}

function assertBrokerToken(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(value)) {
    throw new Error('broker request token is invalid');
  }
}

function parseBrokerResponse(value: unknown): BrokerResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('validation authority broker response is invalid');
  }
  const response = value as Record<string, unknown>;
  if (response.schemaVersion !== 1 || typeof response.ok !== 'boolean') {
    throw new Error('validation authority broker response is invalid');
  }
  const expectedKeys = response.ok
    ? 'ok,result,schemaVersion'
    : 'error,ok,schemaVersion';
  if (Object.keys(response).sort().join(',') !== expectedKeys) {
    throw new Error('validation authority broker response is invalid');
  }
  if (!response.ok) {
    deserializeReviewError(response.error);
  }
  return response as BrokerResponse;
}
