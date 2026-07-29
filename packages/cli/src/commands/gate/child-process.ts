import { spawn } from 'node:child_process';

import type {
  GateActivityEvidence,
  GateActivityProbe,
  GateActivityProbeStatus,
} from './activity-probes';

// Keep these safety bounds fixed rather than environment-tunable. In particular,
// changing the force-kill fallback would alter the hard-timeout contract.
// Revisit the observation grace only if field evidence shows large transcript
// directories routinely exceed it.
const FORCE_KILL_GRACE_MS = 5_000;
const ACTIVITY_OBSERVATION_GRACE_MS = 1_000;

export interface ProcessRunOptions {
  activityProbe?: GateActivityProbe;
  cwd: string;
  env: NodeJS.ProcessEnv;
  livenessIntervalMs?: number;
  onLiveness?: (snapshot: GateLivenessSnapshot) => void;
  purpose: 'host-detection' | 'availability' | 'execute';
  stdin: 'ignore' | 'inherit';
  stdio: 'ignore' | 'inherit' | 'pipe';
  stdoutDestination?: 'stdout' | 'stderr';
  timeoutMs: number;
}

export interface ProcessRunResult {
  activityEvidence?: GateActivityEvidence;
  exitCode: number;
  refusal?: string;
  stderrBytes: number;
  stdoutBytes: number;
  timedOut?: boolean;
}

export interface GateLivenessSnapshot {
  elapsedMs: number;
  hardBudgetMs: number;
  idleMs: number;
  processAlive: boolean;
  activityProbeStatus?: GateActivityProbeStatus;
  lastActivityEvidence?: GateActivityEvidence;
}

export async function runChildProcess(
  command: string,
  args: string[],
  options: ProcessRunOptions,
): Promise<ProcessRunResult> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    let suppressLiveness = false;
    let killTimeout: NodeJS.Timeout | null = null;
    let stderrBytes = 0;
    let stdoutBytes = 0;
    let refusal: string | undefined;
    let stdoutLineBuffer = '';
    let stderrLineBuffer = '';
    let latestActivityEvidence: GateActivityEvidence | undefined;
    let latestActivityProbeStatus: GateActivityProbeStatus | undefined;
    let activityObservationSequence = 0;
    let latestActivityEvidenceSequence = 0;
    let livenessProbePending = false;
    let pendingPeriodicObservation: Promise<void> | undefined;
    let finalActivityObservation:
      | Promise<GateActivityProbeStatus | undefined>
      | undefined;
    const startedAt = Date.now();
    let lastActivityAt = startedAt;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio:
        options.stdio === 'pipe'
          ? [options.stdin, 'pipe', 'pipe']
          : options.stdio,
    });
    const recordActivity = (): void => {
      lastActivityAt = Date.now();
    };
    const scanChunk = (buffer: string, chunk: Buffer): string => {
      const combined = buffer + chunk.toString('utf8');
      const lines = combined.split('\n');
      const remainder = lines.pop() ?? '';
      if (!refusal) {
        for (const line of lines) {
          refusal = extractStructuredRefusal(line.replace(/\r$/, ''));
          if (refusal) {
            break;
          }
        }
      }
      return remainder;
    };
    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      stdoutLineBuffer = scanChunk(stdoutLineBuffer, chunk);
      recordActivity();
      const destination =
        options.stdoutDestination === 'stderr'
          ? process.stderr
          : process.stdout;
      destination.write(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      stderrLineBuffer = scanChunk(stderrLineBuffer, chunk);
      recordActivity();
      process.stderr.write(chunk);
    });
    const processAlive = (): boolean => {
      if (child.pid === undefined) return false;
      try {
        process.kill(child.pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    const observeActivity = async (
      observedAt: number,
    ): Promise<GateActivityProbeStatus | undefined> => {
      if (!options.activityProbe) return undefined;
      const sequence = ++activityObservationSequence;
      try {
        const activityProbeStatus =
          await options.activityProbe.observe(observedAt);
        const evidence = activityProbeStatus.evidence;
        if (evidence && sequence > latestActivityEvidenceSequence) {
          latestActivityEvidence = evidence;
          latestActivityEvidenceSequence = sequence;
        }
        return activityProbeStatus;
      } catch {
        // Activity evidence is diagnostic only. Preserve the last valid sample.
        return undefined;
      }
    };
    const settleWithinActivityGrace = (
      observation: Promise<unknown>,
    ): Promise<void> =>
      new Promise((resolveObservation) => {
        // Keep this timer referenced so a closed child cannot end the process
        // before the bounded diagnostic observation settles.
        const graceTimeout = setTimeout(
          resolveObservation,
          ACTIVITY_OBSERVATION_GRACE_MS,
        );
        const settle = (): void => {
          clearTimeout(graceTimeout);
          resolveObservation();
        };
        void observation.then(settle, settle);
      });
    const livenessInterval =
      options.onLiveness && options.livenessIntervalMs
        ? setInterval(() => {
            if (livenessProbePending) return;
            livenessProbePending = true;
            const now = Date.now();
            const observation = (async () => {
              const activityProbeStatus = await observeActivity(now);
              if (activityProbeStatus) {
                latestActivityProbeStatus = activityProbeStatus;
              }
              if (suppressLiveness) return;
              options.onLiveness?.({
                elapsedMs: now - startedAt,
                hardBudgetMs: options.timeoutMs,
                idleMs: now - lastActivityAt,
                processAlive: processAlive(),
                ...(latestActivityProbeStatus
                  ? { activityProbeStatus: latestActivityProbeStatus }
                  : {}),
                ...(latestActivityEvidence
                  ? { lastActivityEvidence: latestActivityEvidence }
                  : {}),
              });
            })();
            pendingPeriodicObservation = observation;
            const clearPending = (): void => {
              if (pendingPeriodicObservation === observation) {
                pendingPeriodicObservation = undefined;
              }
              livenessProbePending = false;
            };
            void observation.then(clearPending, clearPending);
          }, options.livenessIntervalMs)
        : null;
    livenessInterval?.unref();
    const timeout = setTimeout(() => {
      timedOut = true;
      suppressLiveness = true;
      if (livenessInterval) {
        clearInterval(livenessInterval);
      }
      child.kill('SIGTERM');
      killTimeout = setTimeout(() => {
        child.kill('SIGKILL');
      }, FORCE_KILL_GRACE_MS);
      killTimeout.unref();
      finalActivityObservation = observeActivity(Date.now());
    }, options.timeoutMs);
    timeout.unref();

    child.on('error', (error) => {
      clearTimeout(timeout);
      if (livenessInterval) {
        clearInterval(livenessInterval);
      }
      if (killTimeout) {
        clearTimeout(killTimeout);
      }
      reject(error);
    });
    child.on('close', (code) => {
      suppressLiveness = true;
      clearTimeout(timeout);
      if (livenessInterval) {
        clearInterval(livenessInterval);
      }
      if (killTimeout) {
        clearTimeout(killTimeout);
      }
      void (async () => {
        if (finalActivityObservation) {
          const periodicObservation = pendingPeriodicObservation;
          const finalThenFallback = finalActivityObservation.then(
            async (activityProbeStatus) => {
              if (!activityProbeStatus?.evidence && periodicObservation) {
                await periodicObservation;
              }
            },
          );
          await settleWithinActivityGrace(finalThenFallback);
        } else if (pendingPeriodicObservation) {
          // Preserve evidence already in flight on a normal close. This can add
          // up to the bounded grace to an otherwise successful execution.
          await settleWithinActivityGrace(pendingPeriodicObservation);
        }
        refusal ??=
          extractStructuredRefusal(stdoutLineBuffer.replace(/\r$/, '')) ??
          extractStructuredRefusal(stderrLineBuffer.replace(/\r$/, ''));
        resolve({
          ...(latestActivityEvidence
            ? { activityEvidence: latestActivityEvidence }
            : {}),
          exitCode: timedOut ? 124 : (code ?? 1),
          ...(refusal ? { refusal } : {}),
          stderrBytes,
          stdoutBytes,
          ...(timedOut ? { timedOut: true } : {}),
        });
      })();
    });
  });
}

export function extractStructuredRefusal(output: string): string | undefined {
  const match = output.match(/^OAT_GATE_REFUSAL: (.*)$/m);
  return match?.[1]?.replace(/\r$/, '');
}
