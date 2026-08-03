import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createConnection, createServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';

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
import type {
  PrepareReviewContextResultV1,
  ReviewPlanV1,
  WorkerDossierV1,
} from './types';
import { ValidationStore } from './validation-store';
import {
  consumeLauncherValidationAuthorityKey,
  launcherValidationStoreRoot,
  reviewerSafeEnvironment,
  ValidationStoreAuthority,
} from './validation-store-authority';
import { parseWorkerDossierV1 } from './worker-dossier';

const MAX_BROKER_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_CONNECTION_READ_TIMEOUT_MS = 10_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 1_000;
const BROKER_DIRECTORY_PREFIX = 'oat-review-authority-';
const BROKER_SOCKET_FILENAME = 'broker.sock';

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
    }
  | {
      action: 'bind-worker-dossier';
      runId: string;
      receipt: string;
      dossier: WorkerDossierV1;
    };

type VersionedBrokerRequest = BrokerRequest & { schemaVersion: 1 };

interface BrokerStartup {
  input: PrepareReviewContextInput;
  launcherInvocation: {
    executable: string;
    argvPrefix: string[];
    cwd: string;
  };
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

function readSocketJson(
  socket: Socket,
  timeoutMs = DEFAULT_CONNECTION_READ_TIMEOUT_MS,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const cleanup = () => {
      socket.setTimeout(0);
      socket.removeListener('data', onData);
      socket.removeListener('end', onEnd);
      socket.removeListener('error', onError);
      socket.removeListener('close', onClose);
      socket.removeListener('timeout', onTimeout);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > MAX_BROKER_REQUEST_BYTES) {
        fail(new Error('validation authority broker request is too large'));
        socket.destroy();
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      if (settled) return;
      try {
        const value = parseStrictJson(Buffer.concat(chunks).toString('utf8'));
        settled = true;
        cleanup();
        resolve(value);
      } catch (error) {
        fail(error);
      }
    };
    const onError = (error: Error) => fail(error);
    const onClose = () =>
      fail(new Error('validation authority broker connection closed'));
    const onTimeout = () => {
      fail(new Error('validation authority broker request timed out'));
      socket.destroy();
    };
    socket.on('data', onData);
    socket.on('end', onEnd);
    socket.on('error', onError);
    socket.on('close', onClose);
    socket.on('timeout', onTimeout);
    socket.setTimeout(timeoutMs);
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

interface StartPreparedBrokerInput {
  socketPath: string;
  key: Uint8Array;
  startup: BrokerStartup;
  acceptedContinuation: AcceptedContinuationBinding;
  validationRoot?: string;
  timings?: {
    connectionReadTimeoutMs?: number;
    shutdownTimeoutMs?: number;
    expiryMs?: number;
  };
}

interface PreparedBroker {
  preparation: PrepareReviewContextResultV1;
  closed: Promise<void>;
  close: () => Promise<void>;
}

export async function startPreparedValidationAuthorityBroker(
  input: StartPreparedBrokerInput,
): Promise<PreparedBroker> {
  try {
    return await startPreparedValidationAuthorityBrokerInternal(input);
  } catch (error) {
    await cleanupBrokerSocketPath(input.socketPath);
    throw error;
  }
}

async function startPreparedValidationAuthorityBrokerInternal(
  input: StartPreparedBrokerInput,
): Promise<PreparedBroker> {
  if (!isAbsolute(input.startup.launcherInvocation.cwd)) {
    throw new Error('validation authority launcher cwd must be absolute');
  }
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
      commandCwd: input.startup.launcherInvocation.cwd,
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
  let finishPromise: Promise<void> | undefined;
  const finish = () => {
    finishPromise ??= (async () => {
      try {
        await cleanupBrokerSocketPath(input.socketPath);
      } finally {
        resolveClosed();
      }
    })();
    return finishPromise;
  };
  const server = createServer({ allowHalfOpen: true });
  const sockets = new Set<Socket>();
  const shutdownTimeoutMs =
    input.timings?.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  let shutdownPromise: Promise<void> | undefined;
  const closeBroker = () => {
    shutdownPromise ??= new Promise<void>((resolve, reject) => {
      let completed = false;
      const complete = (error?: Error | null) => {
        if (completed) return;
        completed = true;
        clearTimeout(deadline);
        finish().then(() => (error ? reject(error) : resolve()), reject);
      };
      const deadline = setTimeout(() => {
        for (const socket of sockets) socket.destroy();
        complete();
      }, shutdownTimeoutMs);
      deadline.unref();
      server.close((error) => complete(error));
      for (const socket of sockets) socket.destroy();
    });
    return shutdownPromise;
  };
  const handleConnection = async (socket: Socket) => {
    let response: BrokerResponse;
    let closeAfterResponse = false;
    try {
      const request = await readBrokerRequest(
        socket,
        input.timings?.connectionReadTimeoutMs,
      );
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
          {
            const result = await beginEvidence(request, lifecycle);
            const run = await store.readRun(request.runId);
            response = {
              schemaVersion: 1,
              ok: true,
              result,
            };
            closeAfterResponse =
              run.state.plan?.lanes.every((lane) => !lane.delegated) ?? true;
          }
          break;
        case 'bind-worker-dossier':
          response = {
            schemaVersion: 1,
            ok: true,
            result: await store.bindValidatedWorkerDossier(request.runId, {
              receipt: request.receipt,
              dossier: request.dossier,
            }),
          };
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
    await writeSocketResponse(socket, response);
    if (closeAfterResponse) {
      await closeBroker();
    }
  };
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    handleConnection(socket).catch((error: unknown) => {
      const response: BrokerResponse = {
        schemaVersion: 1,
        ok: false,
        error: serializeReviewError(error),
      };
      if (socket.destroyed) return;
      writeSocketResponse(socket, response).catch(() => socket.destroy());
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(input.socketPath, resolve);
  });
  const expiresInMs =
    input.timings?.expiryMs ??
    Math.max(1, Date.parse(preparation.preparation.expiresAt) - Date.now());
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
  launcherInvocation: {
    executable: string;
    argvPrefix: string[];
    cwd: string;
  };
  environment?: NodeJS.ProcessEnv;
}): Promise<PrepareReviewContextResultV1> {
  if (!isAbsolute(input.launcherInvocation.cwd)) {
    throw new Error('validation authority launcher cwd must be absolute');
  }
  const environment = input.environment ?? process.env;
  const key = consumeLauncherValidationAuthorityKey(environment);
  let socketDirectory: string | undefined;
  let child: ReturnType<typeof spawn> | undefined;
  try {
    socketDirectory = await mkdtemp(join(tmpdir(), BROKER_DIRECTORY_PREFIX));
    await chmod(socketDirectory, 0o700);
    const socketPath = join(socketDirectory, BROKER_SOCKET_FILENAME);
    child = spawn(
      input.launcherInvocation.executable,
      [
        ...input.launcherInvocation.argvPrefix,
        'review',
        'authority-broker',
        '--socket',
        socketPath,
      ],
      {
        cwd: input.launcherInvocation.cwd,
        detached: true,
        env: reviewerSafeEnvironment(environment),
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe', 'pipe'],
      },
    );
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
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
    if (socketDirectory) {
      await rm(socketDirectory, { force: true, recursive: true });
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

async function cleanupBrokerSocketPath(socketPath: string): Promise<void> {
  const socketDirectory = dirname(socketPath);
  const target =
    basename(socketPath) === BROKER_SOCKET_FILENAME &&
    basename(socketDirectory).startsWith(BROKER_DIRECTORY_PREFIX)
      ? socketDirectory
      : socketPath;
  await rm(target, { force: true, recursive: true });
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
  timeoutMs?: number,
): Promise<VersionedBrokerRequest> {
  try {
    return parseBrokerRequest(await readSocketJson(socket, timeoutMs));
  } catch {
    throw new ReviewDomainError({
      category: 'input',
      code: 'validation-authority-broker-request-invalid',
      message: 'validation authority broker request is invalid',
    });
  }
}

async function writeSocketResponse(
  socket: Socket,
  response: BrokerResponse,
): Promise<void> {
  if (socket.destroyed) {
    throw new Error('validation authority broker connection is closed');
  }
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      socket.removeListener('finish', onFinish);
      socket.removeListener('error', onError);
      socket.removeListener('close', onClose);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onFinish = () => finish();
    const onError = (error: Error) => finish(error);
    const onClose = () =>
      finish(new Error('validation authority broker response was interrupted'));
    socket.once('finish', onFinish);
    socket.once('error', onError);
    socket.once('close', onClose);
    socket.end(JSON.stringify(response));
  });
}

function parseBrokerRequest(value: unknown): VersionedBrokerRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('broker request must be an object');
  }
  const request = value as Record<string, unknown>;
  if (request.schemaVersion !== 1) {
    throw new Error('broker request schema version is invalid');
  }
  if (
    !['checkpoint', 'validate', 'begin', 'bind-worker-dossier'].includes(
      String(request.action),
    )
  ) {
    throw new Error('broker request action is invalid');
  }
  const action = request.action as BrokerRequest['action'];
  const expectedKeys = {
    checkpoint: 'action,checkpointToken,runId,schemaVersion',
    validate: 'action,commandToken,plan,runId,schemaVersion',
    begin: 'action,receipt,runId,schemaVersion',
    'bind-worker-dossier': 'action,dossier,receipt,runId,schemaVersion',
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
  if (action === 'bind-worker-dossier') {
    assertBrokerToken(request.receipt);
    return {
      schemaVersion: 1,
      action,
      runId: request.runId,
      receipt: request.receipt,
      dossier: parseWorkerDossierV1(request.dossier),
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
