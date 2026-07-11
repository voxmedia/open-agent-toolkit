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

async function runStage(stage, handler, options, context, signalState) {
  const stageResult = Promise.resolve().then(() => handler(options, context));

  if (!signalState) {
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
    if (!context.manifest && typeof context.recoverManifest === 'function') {
      context.manifest = await context.recoverManifest();
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
  { cleanup, handlers = {}, preflight, signalState } = {},
) {
  const results = {};
  const context = { manifest: null, recoverManifest: null, results };
  let runError = null;

  try {
    if (typeof preflight === 'function') {
      results.preflight = await preflight(options);
    }

    for (const stage of options.stages) {
      const handler = handlers[stage];

      if (typeof handler !== 'function') {
        throw new HandlerUnavailableError(stage);
      }

      results[stage] = await runStage(
        stage,
        handler,
        options,
        context,
        signalState,
      );
      if (stage === 'prepare') {
        adoptManifest(context, results[stage]);
      }
    }
  } catch (error) {
    runError = error;
  }

  const shouldCleanup =
    context.manifest &&
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
  const promise = new Promise((resolvePromise) => {
    resolveSignal = resolvePromise;
  });
  const listeners = {};

  for (const signalName of Object.keys(SIGNAL_EXIT_CODES)) {
    listeners[signalName] = () => {
      if (!signal) {
        signal = signalName;
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

const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) : null;
if (invokedPath === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    if (error.cleanupError) {
      console.error(`Cleanup failed: ${error.cleanupError.message}`);
    }
    process.exitCode = error.exitCode ?? 1;
  });
}
