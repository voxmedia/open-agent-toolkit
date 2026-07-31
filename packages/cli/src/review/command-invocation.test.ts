import { describe, expect, it } from 'vitest';

import { executeCommandInvocation } from './command-invocation';

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
        argv: ['-e', 'process.exit(0)'],
        stdin: 'review-plan-json',
      }),
    ).rejects.toThrow(/stdin is required/);
  });

  it('never exposes validation signing authority to reviewer children', async () => {
    const result = await executeCommandInvocation(
      {
        executable: process.execPath,
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
});
