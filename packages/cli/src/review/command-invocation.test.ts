import { describe, expect, it } from 'vitest';

import {
  executeCommandInvocation,
  executeCoordinatorCommandInvocation,
} from './command-invocation';

describe('portable command invocation', () => {
  it('round-trips shell metacharacters without a shell', async () => {
    const argumentsWithMetacharacters = [
      "posix'$(touch nope)",
      'powershell`$env:PATH',
      'cmd&echo %PATH%',
      'space separated',
    ];
    const result = await executeCommandInvocation({
      executable: process.execPath,
      cwd: process.cwd(),
      argv: [
        '-e',
        'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
        ...argumentsWithMetacharacters,
      ],
      stdin: 'none',
    });

    expect(result).toMatchObject({ exitCode: 0, signal: null, stderr: '' });
    expect(JSON.parse(result.stdout)).toEqual(argumentsWithMetacharacters);
  });

  it('enforces the declared stdin mode', async () => {
    await expect(
      executeCommandInvocation({
        executable: process.execPath,
        cwd: process.cwd(),
        argv: ['-e', 'process.exit(0)'],
        stdin: 'review-plan-json',
      }),
    ).rejects.toThrow(/stdin is required/);
    await expect(
      executeCoordinatorCommandInvocation({
        executable: process.execPath,
        cwd: process.cwd(),
        argv: ['-e', 'process.exit(0)'],
        stdin: 'accepted-continuation-json',
      }),
    ).rejects.toThrow(/stdin is required/);
  });

  it('never exposes validation signing authority to reviewer children', async () => {
    const result = await executeCommandInvocation(
      {
        executable: process.execPath,
        cwd: process.cwd(),
        argv: [
          '-e',
          "process.stdout.write(process.env.OAT_REVIEW_AUTHORITY_KEY ?? 'absent')",
        ],
        stdin: 'none',
      },
      {
        environment: {
          ...process.env,
          OAT_REVIEW_AUTHORITY_KEY: 'synthetic-secret',
        },
      },
    );
    expect(result).toMatchObject({ exitCode: 0, stdout: 'absent' });
  });

  it('uses descriptor cwd and rejects out-of-band drift', async () => {
    const invocation = {
      executable: process.execPath,
      argv: ['-e', 'process.stdout.write(process.cwd())'],
      cwd: '/',
      stdin: 'none' as const,
    };
    await expect(executeCommandInvocation(invocation)).resolves.toMatchObject({
      exitCode: 0,
      stdout: '/',
    });
    await expect(
      executeCommandInvocation(invocation, { cwd: process.cwd() }),
    ).rejects.toThrow(/cwd mismatch/);
  });
});
