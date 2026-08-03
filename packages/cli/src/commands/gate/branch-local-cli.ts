import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface GateCliLaunch {
  command: string;
  args: string[];
  cwd: string;
}

export interface BranchLocalGateCli {
  cliPath: string;
  cliRoot: string;
  routeReceiptPath: string;
  shimRoot: string;
}

export interface ValidatedGateRouteEnvelope {
  route: 'inline' | 'delegate-sync' | 'refuse';
  reason: string;
  cliRoot: string;
}

export interface GateRouteReceipt extends ValidatedGateRouteEnvelope {
  runtime: string;
}

export function currentGateCliRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
}

export function currentGateCliLaunch(
  input: {
    argv?: string[];
    execArgv?: string[];
    execPath?: string;
    cwd?: string;
  } = {},
): GateCliLaunch {
  const entrypoint = (input.argv ?? process.argv)[1];
  if (!entrypoint) {
    throw new Error('Unable to resolve the running OAT CLI entrypoint.');
  }
  return {
    command: input.execPath ?? process.execPath,
    args: [
      ...resolveCurrentLoaderArgs(input.execArgv ?? process.execArgv),
      entrypoint,
    ],
    cwd: resolve(input.cwd ?? process.cwd()),
  };
}

export function resolveCurrentLoaderArgs(args: readonly string[]): string[] {
  const resolved: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === '--import' || argument === '--require') {
      const specifier = args[index + 1];
      resolved.push(argument);
      if (specifier) {
        resolved.push(resolveLoaderSpecifier(argument, specifier));
        index += 1;
      }
      continue;
    }
    const inline = argument.match(/^(--import|--require)=(.+)$/);
    if (inline) {
      resolved.push(
        `${inline[1]}=${resolveLoaderSpecifier(inline[1]!, inline[2]!)}`,
      );
      continue;
    }
    resolved.push(argument);
  }
  return resolved;
}

function resolveLoaderSpecifier(flag: string, specifier: string): string {
  if (
    specifier.startsWith('/') ||
    specifier.startsWith('.') ||
    specifier.startsWith('file:')
  ) {
    return specifier;
  }
  try {
    return flag === '--require'
      ? createRequire(import.meta.url).resolve(specifier)
      : import.meta.resolve(specifier);
  } catch {
    return specifier;
  }
}

export async function createBranchLocalGateCli(input: {
  runId: string;
  launch: GateCliLaunch;
  cliRoot?: string;
  tempRoot?: string;
}): Promise<BranchLocalGateCli> {
  const cliRoot = input.cliRoot ?? currentGateCliRoot();
  const shimRoot = join(
    input.tempRoot ?? tmpdir(),
    'oat-gate-runs',
    input.runId,
  );
  const cliPath = join(shimRoot, 'bin', 'oat');
  const routeReceiptPath = join(shimRoot, 'route-receipt.json');
  await mkdir(dirname(cliPath), { recursive: true });
  await writeFile(
    cliPath,
    [
      '#!/usr/bin/env node',
      "import { spawnSync } from 'node:child_process';",
      `const command = ${JSON.stringify(input.launch.command)};`,
      `const args = ${JSON.stringify(input.launch.args)};`,
      'const result = spawnSync(command, [...args, ...process.argv.slice(2)], {',
      "  stdio: 'inherit',",
      '  env: process.env,',
      `  cwd: ${JSON.stringify(input.launch.cwd)},`,
      '});',
      'if (result.error) {',
      '  process.stderr.write(`${result.error.message}\\n`);',
      '}',
      'process.exit(result.status ?? 1);',
      '',
    ].join('\n'),
  );
  await chmod(cliPath, 0o700);
  return { cliPath, cliRoot, routeReceiptPath, shimRoot };
}

export async function removeBranchLocalGateCli(
  shim: BranchLocalGateCli,
): Promise<void> {
  await rm(shim.shimRoot, { recursive: true, force: true });
}

export function validateGateRouteEnvelope(
  output: string,
  expectedCliRoot: string,
): ValidatedGateRouteEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error('Branch-local gate route did not return JSON.', {
      cause: error,
    });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Branch-local gate route returned no decision envelope.');
  }
  const envelope = parsed as Record<string, unknown>;
  if (
    !['inline', 'delegate-sync', 'refuse'].includes(String(envelope.route)) ||
    typeof envelope.reason !== 'string'
  ) {
    throw new Error(
      'Branch-local gate route returned help or an invalid decision envelope.',
    );
  }
  if (envelope.cliRoot !== expectedCliRoot) {
    throw new Error(
      `Branch-local gate route resolved outside the expected checkout (${String(envelope.cliRoot)} != ${expectedCliRoot}).`,
    );
  }
  return envelope as unknown as ValidatedGateRouteEnvelope;
}

export async function readGateRouteReceipt(
  path: string,
  expectedCliRoot: string,
  expectedRuntime: string,
): Promise<GateRouteReceipt> {
  const output = await readFile(path, 'utf8').catch(() => '');
  const envelope = validateGateRouteEnvelope(output, expectedCliRoot);
  const parsed = JSON.parse(output) as Record<string, unknown>;
  if (parsed.runtime !== expectedRuntime) {
    throw new Error(
      `Branch-local gate route receipt runtime did not match (${String(parsed.runtime)} != ${expectedRuntime}).`,
    );
  }
  return { ...envelope, runtime: expectedRuntime };
}
