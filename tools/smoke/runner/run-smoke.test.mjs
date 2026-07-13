import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { main, runSmoke, SmokeInterruptedError } from './run-smoke.mjs';

const options = {
  keep: false,
  stages: ['prepare', 'drive', 'collect'],
};
const manifest = {
  manifestPath: '/tmp/smoke/provisioning-manifest.json',
  worktreePath: '/tmp/smoke/worktree',
};

function handlers(overrides = {}) {
  return {
    async collect() {
      return { evidence: 'collected' };
    },
    async drive() {
      return { driven: true };
    },
    async prepare() {
      return manifest;
    },
    ...overrides,
  };
}

test('collects and cleans after drive failure without masking the drive error', async () => {
  const calls = [];
  const driveError = new Error('drive failed');

  await assert.rejects(
    () =>
      runSmoke(options, {
        cleanup: async () => calls.push('cleanup'),
        handlers: handlers({
          async collect(collectionOptions) {
            assert.equal(collectionOptions.collectionMode, 'recovery');
            calls.push('collect');
            return { recovery: { path: '/tmp/recovery' } };
          },
          async drive() {
            throw driveError;
          },
        }),
      }),
    (error) =>
      error === driveError &&
      error.recoveryCollection.recovery.path === '/tmp/recovery',
  );
  assert.deepEqual(calls, ['collect', 'cleanup']);
});

test('retains a drive error when recovery collection also fails', async () => {
  const driveError = new Error('drive failed');
  const collectionError = new Error('collection failed');

  await assert.rejects(
    () =>
      runSmoke(options, {
        cleanup: async () => {},
        handlers: handlers({
          async collect() {
            throw collectionError;
          },
          async drive() {
            throw driveError;
          },
        }),
      }),
    (error) =>
      error === driveError && error.collectionError === collectionError,
  );
});

test('recovers a manifest before collecting after a drive failure', async () => {
  const calls = [];

  await assert.rejects(
    () =>
      runSmoke(options, {
        cleanup: async (recoveredManifest) => {
          assert.equal(recoveredManifest, manifest);
          calls.push('cleanup');
        },
        handlers: handlers({
          async collect() {
            calls.push('collect');
          },
          async drive() {
            throw new Error('drive failed');
          },
          async prepare(_options, context) {
            context.recoverManifest = async () => manifest;
            return null;
          },
        }),
      }),
    /drive failed/,
  );
  assert.deepEqual(calls, ['collect', 'cleanup']);
});

test('SIGTERM terminates registered children before recovery collection and cleanup', async () => {
  const processObject = new EventEmitter();
  const signalState = (() => {
    const listeners = {};
    let signal = null;
    let resolveSignal;
    const promise = new Promise((resolvePromise) => {
      resolveSignal = resolvePromise;
    });
    for (const signalName of ['SIGINT', 'SIGTERM']) {
      listeners[signalName] = () => {
        signal ??= signalName;
        resolveSignal(signalName);
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
        processObject.once('SIGTERM', () => handler('SIGTERM'));
      },
    };
  })();
  const calls = [];
  let childExited = false;

  try {
    await assert.rejects(
      () =>
        runSmoke(options, {
          cleanup: async () => {
            assert.equal(childExited, true);
            calls.push('cleanup');
          },
          handlers: handlers({
            async collect() {
              assert.equal(childExited, true);
              calls.push('collect');
            },
            async drive(_options, context) {
              const child = spawn(process.execPath, [
                '-e',
                'setInterval(() => {}, 1_000)',
              ]);
              context.registerSubprocess(child);
              await new Promise((resolvePromise) =>
                child.once('spawn', resolvePromise),
              );
              processObject.emit('SIGTERM');
              await new Promise((resolvePromise) => {
                child.once('exit', () => {
                  childExited = true;
                  resolvePromise();
                });
              });
            },
          }),
          signalState,
        }),
      SmokeInterruptedError,
    );
    assert.deepEqual(calls, ['collect', 'cleanup']);
  } finally {
    signalState.dispose();
  }
});

test('an unquiesced stage preserves resources and skips cleanup', async () => {
  const processObject = new EventEmitter();
  const startListeners = processObject.listenerCount('SIGTERM');
  const events = [];

  await assert.rejects(
    () =>
      main(['--harness', 'codex', '--scenario', 'implement', '--dry-run'], {
        abortGracePeriodMs: 10,
        cleanup: async () => events.push('cleanup'),
        handlers: {
          async prepare() {
            return manifest;
          },
          async drive(_options) {
            processObject.emit('SIGTERM');
            await new Promise(() => {});
          },
          async collect() {
            events.push('collect');
          },
        },
        preflight: async () => {},
        processObject,
      }),
    (error) =>
      error instanceof SmokeInterruptedError &&
      error.quiescenceError !== undefined,
  );
  assert.deepEqual(events, []);
  assert.equal(processObject.listenerCount('SIGTERM'), startListeners);
  assert.equal(processObject.listenerCount('SIGINT'), 0);
});

test('SIGTERM during preflight prevents prepare and drive before provisioning', async () => {
  const processObject = new EventEmitter();
  const initialTermListeners = processObject.listenerCount('SIGTERM');
  const calls = [];

  await assert.rejects(
    () =>
      main(['--harness', 'codex', '--scenario', 'implement', '--dry-run'], {
        handlers: {
          async prepare() {
            calls.push('prepare');
          },
          async drive() {
            calls.push('drive');
          },
        },
        preflight: async () => {
          calls.push('preflight');
          processObject.emit('SIGTERM');
          await new Promise((resolvePromise) => setImmediate(resolvePromise));
        },
        processObject,
      }),
    SmokeInterruptedError,
  );

  assert.deepEqual(calls, ['preflight']);
  assert.equal(processObject.listenerCount('SIGTERM'), initialTermListeners);
  assert.equal(processObject.listenerCount('SIGINT'), 0);
});
