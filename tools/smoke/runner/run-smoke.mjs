import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs } from './args.mjs';
import { cleanupSmoke } from './cleanup.mjs';
import { runPreflight } from './preflight.mjs';
import { provisionSmoke } from './provision.mjs';

const runnerDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(runnerDirectory, '../../..');
const runRoot = join(repositoryRoot, 'tools/smoke/.runs');
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143 };

export class HandlerUnavailableError extends Error {
  constructor(stage) {
    super(`Smoke runner stage "${stage}" is unavailable.`);
    this.name = 'HandlerUnavailableError';
  }
}

export class SmokeInterruptedError extends Error {
  constructor(signal) {
    super(`Smoke runner interrupted by ${signal}.`);
    this.name = 'SmokeInterruptedError';
    this.signal = signal;
    this.exitCode = SIGNAL_EXIT_CODES[signal] ?? 1;
  }
}

export class SmokeQuiescenceError extends Error {
  constructor(signal, gracePeriodMs) {
    super(
      `Smoke runner could not quiesce after ${signal} within ${gracePeriodMs}ms.`,
    );
    this.name = 'SmokeQuiescenceError';
    this.signal = signal;
  }
}

async function listManifestPaths(runsDirectory) {
  let entries;
  try {
    entries = await readdir(runsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('smoke-'))
    .map((entry) =>
      join(runsDirectory, entry.name, 'provisioning-manifest.json'),
    );
}

async function readOnlyNewManifest(runsDirectory, pathsBefore) {
  const before = new Set(pathsBefore);
  const candidates = (await listManifestPaths(runsDirectory)).filter(
    (path) => !before.has(path),
  );

  if (candidates.length !== 1) {
    return null;
  }

  try {
    return JSON.parse(await readFile(candidates[0], 'utf8'));
  } catch {
    return null;
  }
}

function adoptManifest(context, result) {
  const candidate = result?.manifest ?? result;
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.manifestPath === 'string' &&
    typeof candidate.worktreePath === 'string'
  ) {
    context.manifest = candidate;
  }
}

// Stage handlers receive context.signal, registerAbortable(), and
// registerSubprocess(). Registered resources must finish their abort() work
// before recovery can mutate the run; subprocesses are terminated with SIGTERM.
function createResourceRegistry() {
  const resources = new Set();
  let cancellation = null;

  function registerAbortable(resource) {
    if (!resource || typeof resource.abort !== 'function') {
      throw new TypeError(
        'Abortable resources must provide an abort() method.',
      );
    }
    resources.add(resource);
    if (cancellation) {
      void resource.abort(cancellation);
    }
    return () => resources.delete(resource);
  }

  function registerSubprocess(child) {
    if (!child || typeof child.kill !== 'function') {
      throw new TypeError('Subprocess resources must provide a kill() method.');
    }
    let resolveExit;
    const exited = new Promise((resolvePromise) => {
      resolveExit = resolvePromise;
    });
    const finish = () => resolveExit();
    child.once('exit', finish);
    const unregister = registerAbortable({
      abort() {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGTERM');
        }
        return exited;
      },
    });
    return () => {
      child.off('exit', finish);
      unregister();
    };
  }

  return {
    registerAbortable,
    registerSubprocess,
    requestCancellation(reason) {
      cancellation ??= reason;
      return Promise.allSettled(
        [...resources].map((resource) => resource.abort(cancellation)),
      );
    },
  };
}

function waitForQuiescence(promises, gracePeriodMs) {
  let timeout;
  const timedOut = new Promise((resolvePromise) => {
    timeout = setTimeout(resolvePromise, gracePeriodMs, 'timeout');
  });
  return Promise.race([
    Promise.allSettled(promises).then(() => 'quiescent'),
    timedOut,
  ]).finally(() => clearTimeout(timeout));
}

async function runStage(stage, handler, options, context, signalState) {
  const cancellationSignal = signalState?.signal;
  if (cancellationSignal && stage !== 'collect-recovery') {
    await waitForQuiescence([context.cancellation], context.abortGracePeriodMs);
    throw new SmokeInterruptedError(cancellationSignal);
  }
  const stageResult = Promise.resolve().then(() => handler(options, context));

  if (!signalState || signalState.signal) {
    return stageResult;
  }

  const outcome = await Promise.race([
    stageResult.then(
      (value) => ({ type: 'result', value }),
      (error) => ({ error, type: 'error' }),
    ),
    signalState.promise.then((signal) => ({ signal, type: 'signal' })),
  ]);

  if (outcome.type === 'signal') {
    const quiescence = await waitForQuiescence(
      [stageResult, context.cancellation],
      context.abortGracePeriodMs,
    );
    if (quiescence !== 'quiescent') {
      context.cleanupSafe = false;
      const interrupted = new SmokeInterruptedError(outcome.signal);
      interrupted.quiescenceError = new SmokeQuiescenceError(
        outcome.signal,
        context.abortGracePeriodMs,
      );
      throw interrupted;
    }
    throw new SmokeInterruptedError(outcome.signal);
  }

  if (outcome.type === 'error') {
    throw outcome.error;
  }

  return outcome.value;
}

function isCompleteLifecycle(stages) {
  return (
    stages.length === 3 &&
    stages[0] === 'prepare' &&
    stages[1] === 'drive' &&
    stages[2] === 'collect'
  );
}

export async function runSmoke(
  options,
  {
    abortGracePeriodMs = 5_000,
    cleanup,
    handlers = {},
    preflight,
    signalState,
  } = {},
) {
  const results = {};
  const abortController = new AbortController();
  const resources = createResourceRegistry();
  const context = {
    abortGracePeriodMs,
    manifest: null,
    recoverManifest: null,
    registerAbortable: resources.registerAbortable,
    registerSubprocess: resources.registerSubprocess,
    results,
    signal: abortController.signal,
    cleanupSafe: true,
  };
  context.cancellation = new Promise((resolvePromise) => {
    context.requestCancellation = (signal) => {
      if (!abortController.signal.aborted) {
        abortController.abort(new SmokeInterruptedError(signal));
      }
      resolvePromise(resources.requestCancellation(signal));
    };
  }).then((result) => result);
  signalState?.setCancellationHandler(context.requestCancellation);
  let runError = null;
  let failedStage = null;

  try {
    if (typeof preflight === 'function') {
      results.preflight = await runStage(
        'preflight',
        preflight,
        options,
        context,
        signalState,
      );
    }

    for (const stage of options.stages) {
      const handler = handlers[stage];

      if (typeof handler !== 'function') {
        throw new HandlerUnavailableError(stage);
      }

      try {
        results[stage] = await runStage(
          stage,
          handler,
          options,
          context,
          signalState,
        );
      } catch (error) {
        failedStage = stage;
        throw error;
      }
      if (stage === 'prepare') {
        adoptManifest(context, results[stage]);
      }
    }
  } catch (error) {
    runError = error;
  }

  let collectionError = null;
  let manifestRecoveryError = null;
  if (
    runError &&
    failedStage === 'drive' &&
    !context.manifest &&
    typeof context.recoverManifest === 'function'
  ) {
    try {
      context.manifest = await context.recoverManifest();
    } catch (error) {
      manifestRecoveryError = error;
    }
  }
  if (
    runError &&
    failedStage === 'drive' &&
    context.manifest &&
    context.cleanupSafe &&
    options.stages.includes('collect') &&
    typeof handlers.collect === 'function'
  ) {
    try {
      results.collect = await runStage(
        'collect-recovery',
        handlers.collect,
        options,
        context,
        signalState,
      );
    } catch (error) {
      collectionError = error;
    }
  }

  const shouldCleanup =
    context.manifest &&
    context.cleanupSafe &&
    !options.keep &&
    typeof cleanup === 'function' &&
    (runError !== null || isCompleteLifecycle(options.stages));
  let cleanupError = null;

  if (shouldCleanup) {
    try {
      results.cleanup = await cleanup(context.manifest, options);
    } catch (error) {
      cleanupError = error;
    }
  }

  if (!runError && signalState?.signal) {
    runError = new SmokeInterruptedError(signalState.signal);
  }

  if (runError) {
    if (manifestRecoveryError) {
      runError.manifestRecoveryError = manifestRecoveryError;
    }
    if (collectionError) {
      runError.collectionError = collectionError;
    }
    if (cleanupError) {
      runError.cleanupError = cleanupError;
    }
    throw runError;
  }

  if (cleanupError) {
    throw cleanupError;
  }

  return results;
}

function createSignalState(processObject) {
  let resolveSignal;
  let signal = null;
  let cancellationHandler = null;
  const promise = new Promise((resolvePromise) => {
    resolveSignal = resolvePromise;
  });
  const listeners = {};

  for (const signalName of Object.keys(SIGNAL_EXIT_CODES)) {
    listeners[signalName] = () => {
      if (!signal) {
        signal = signalName;
        cancellationHandler?.(signalName);
        resolveSignal(signalName);
      }
    };
    processObject.on(signalName, listeners[signalName]);
  }

  return {
    dispose() {
      for (const [signalName, listener] of Object.entries(listeners)) {
        processObject.off(signalName, listener);
      }
    },
    get signal() {
      return signal;
    },
    promise,
    setCancellationHandler(handler) {
      cancellationHandler = handler;
      if (signal) {
        cancellationHandler(signal);
      }
    },
  };
}

function dryRunProbes() {
  return {
    auth: async () => ({
      command: 'dry-run auth probe',
      result: 'authenticated',
    }),
    runtime: async () => ({
      command: 'dry-run runtime probe',
      result: 'installed',
    }),
  };
}

export async function main(
  argv = process.argv.slice(2),
  {
    cleanup: cleanupOverride,
    abortGracePeriodMs,
    handlers: handlerOverrides = {},
    preflight,
    processObject = process,
    provision = (provisionOptions) => provisionSmoke(provisionOptions),
    repository = repositoryRoot,
    runsDirectory = runRoot,
  } = {},
) {
  const options = parseArgs(argv);
  const signalState = createSignalState(processObject);
  const cleanup =
    cleanupOverride ??
    ((manifest) =>
      cleanupSmoke(manifest, {
        repository,
        runsDirectory,
      }));
  const defaultHandlers = {
    async collect(collectOptions) {
      if (!collectOptions.dryRun) {
        throw new HandlerUnavailableError('collect');
      }
      return { evidence: 'empty', status: 'dry-run-stub' };
    },
    async drive(driveOptions) {
      if (!driveOptions.dryRun) {
        throw new HandlerUnavailableError('drive');
      }
      return { action: 'none', status: 'dry-run-stub' };
    },
    async prepare(prepareOptions, context) {
      const pathsBefore = await listManifestPaths(runsDirectory);
      context.recoverManifest = () =>
        readOnlyNewManifest(runsDirectory, pathsBefore);
      try {
        const manifest = await provision(prepareOptions, context);
        context.manifest = manifest;
        return manifest;
      } catch (error) {
        context.manifest ??= await context.recoverManifest();
        throw error;
      }
    },
  };

  try {
    return await runSmoke(options, {
      abortGracePeriodMs,
      cleanup: (manifest, cleanupOptions) =>
        cleanup(manifest, cleanupOptions, { repository, runsDirectory }),
      handlers: { ...defaultHandlers, ...handlerOverrides },
      preflight:
        preflight ??
        ((preflightOptions) =>
          runPreflight(preflightOptions, {
            probes: preflightOptions.dryRun ? dryRunProbes() : {},
            reporter: console.log,
          })),
      signalState,
    });
  } finally {
    signalState.dispose();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    if (error.cleanupError) {
      console.error(`Cleanup failed: ${error.cleanupError.message}`);
    }
    if (error.collectionError) {
      console.error(
        `Evidence collection failed: ${error.collectionError.message}`,
      );
    }
    process.exitCode = error.exitCode ?? 1;
  });
}
