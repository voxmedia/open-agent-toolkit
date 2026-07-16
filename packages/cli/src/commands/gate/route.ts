import type { CommandContext, GlobalOptions } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

export type GateRoute = 'inline' | 'delegate-sync' | 'refuse';

export interface GateRouteDecision {
  route: GateRoute;
  reason: string;
}

interface GateRouteInput {
  expectRuntime: string;
  expectModel: string;
  canAwait: boolean;
  env: NodeJS.ProcessEnv;
}

interface GateRouteCommandDependencies {
  processEnv: NodeJS.ProcessEnv;
  buildCommandContext: (options: GlobalOptions) => CommandContext;
}

interface GateRouteOptions {
  expectRuntime?: string;
  expectModel?: string;
  canAwait?: string;
}

const PROVIDER_MARKERS = [
  { runtime: 'claude', keys: ['CLAUDECODE'] },
  { runtime: 'cursor', keys: ['CURSOR_AGENT'] },
  { runtime: 'codex', keys: ['CODEX_THREAD_ID', 'CODEX_SESSION_ID'] },
] as const;

const MODEL_EVIDENCE_KEYS = [
  'OAT_CURRENT_MODEL',
  'OAT_MODEL',
  'ANTHROPIC_MODEL',
  'CLAUDE_MODEL',
  'CURSOR_MODEL',
  'CODEX_MODEL',
] as const;

function nonEmptyEnvValue(
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function fallbackRoute(canAwait: boolean, reason: string): GateRouteDecision {
  return canAwait
    ? { route: 'delegate-sync', reason }
    : { route: 'refuse', reason };
}

export function resolveGateRoute(input: GateRouteInput): GateRouteDecision {
  const expectedRuntime = input.expectRuntime.trim().toLowerCase();
  const expectedModel = input.expectModel.trim();
  const activeMarkers = PROVIDER_MARKERS.flatMap(({ keys, runtime }) => {
    const activeKeys = keys.filter((key) => nonEmptyEnvValue(input.env, key));
    return activeKeys.length > 0 ? [{ keys: activeKeys, runtime }] : [];
  });
  const expectedRuntimeMarker = activeMarkers.find(
    ({ runtime }) => runtime === expectedRuntime,
  );

  if (!expectedRuntimeMarker && activeMarkers.length !== 1) {
    return fallbackRoute(
      input.canAwait,
      activeMarkers.length === 0
        ? 'No provider runtime marker is available; inline reviewer identity is ambiguous.'
        : `Multiple provider runtime markers are present (${activeMarkers.flatMap(({ keys }) => keys).join(', ')}), but none identifies expected runtime ${expectedRuntime}.`,
    );
  }

  if (!expectedRuntimeMarker) {
    const activeRuntime = activeMarkers[0]!.runtime;
    return fallbackRoute(
      input.canAwait,
      `Provider runtime marker identifies ${activeRuntime}, not expected runtime ${expectedRuntime}.`,
    );
  }

  const modelEvidence = MODEL_EVIDENCE_KEYS.flatMap((key) => {
    const value = nonEmptyEnvValue(input.env, key);
    return value ? [{ key, value }] : [];
  });
  const enforceExpectedModel =
    expectedModel !== 'unknown' && expectedModel !== 'provider-default';
  const contradictoryModel = enforceExpectedModel
    ? modelEvidence.find(({ value }) => value !== expectedModel)
    : undefined;
  if (contradictoryModel) {
    return fallbackRoute(
      input.canAwait,
      `Model evidence ${contradictoryModel.key}=${contradictoryModel.value} contradicts expected model ${expectedModel}.`,
    );
  }

  return {
    route: 'inline',
    reason:
      modelEvidence.length > 0
        ? `Provider runtime marker matches expected runtime ${expectedRuntime}; available model evidence matches ${expectedModel}.`
        : `Provider runtime marker matches expected runtime ${expectedRuntime}; model evidence is unavailable.`,
  };
}

function parseRequiredOption(value: string | undefined, name: string): string {
  const parsed = value?.trim();
  if (!parsed) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return parsed;
}

function parseCanAwait(value: string | undefined): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error('--can-await must be true or false.');
}

export function createGateRouteCommand(
  dependencies: GateRouteCommandDependencies,
): Command {
  return new Command('route')
    .description('Choose a headless-safe reviewer execution route')
    .requiredOption(
      '--expect-runtime <runtime>',
      'Expected reviewer runtime from gate invocation metadata',
    )
    .requiredOption(
      '--expect-model <model>',
      'Expected reviewer model from gate invocation metadata',
    )
    .requiredOption(
      '--can-await <boolean>',
      'Whether the host can synchronously await a delegated reviewer',
    )
    .option('--json', 'Print the route decision as JSON')
    .action((options: GateRouteOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const decision = resolveGateRoute({
        expectRuntime: parseRequiredOption(
          options.expectRuntime,
          '--expect-runtime',
        ),
        expectModel: parseRequiredOption(options.expectModel, '--expect-model'),
        canAwait: parseCanAwait(options.canAwait),
        env: dependencies.processEnv,
      });
      if (context.json) {
        context.logger.json(decision);
      } else {
        context.logger.info(`${decision.route}: ${decision.reason}`);
      }
    });
}
