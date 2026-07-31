import { createReadStream } from 'node:fs';

import {
  startPreparedValidationAuthorityBroker,
  type BrokerStartup,
} from '@review/validation-authority-broker';
import { Command } from 'commander';

interface AuthorityBrokerCommandDependencies {
  readStartup: () => Promise<BrokerStartup>;
  readKey: () => Promise<Buffer>;
  write: (output: string) => void;
  start: typeof startPreparedValidationAuthorityBroker;
}

const DEFAULT_DEPENDENCIES: AuthorityBrokerCommandDependencies = {
  readStartup: async () => JSON.parse(await readDescriptor(3)) as BrokerStartup,
  readKey: async () =>
    Buffer.from((await readDescriptor(4)).trim(), 'base64url'),
  write: (output) => process.stdout.write(output),
  start: startPreparedValidationAuthorityBroker,
};

async function readDescriptor(fd: number): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of createReadStream('', { fd, autoClose: false })) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createReviewAuthorityBrokerCommand(
  overrides: Partial<AuthorityBrokerCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('authority-broker')
    .description('Run the launcher-owned review authority broker')
    .requiredOption('--socket <path>', 'Private broker socket path')
    .action(async (options: { socket: string }) => {
      const key = await dependencies.readKey();
      try {
        const broker = await dependencies.start({
          socketPath: options.socket,
          key,
          startup: await dependencies.readStartup(),
        });
        dependencies.write(
          `${JSON.stringify({ ok: true, result: broker.preparation })}\n`,
        );
        await broker.closed;
      } finally {
        key.fill(0);
      }
    });
}
