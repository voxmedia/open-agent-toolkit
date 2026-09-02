import { createReadStream } from 'node:fs';

import { parseStrictJson } from '@review/canonical-json';
import {
  parseCoordinatorBrokerCapabilities,
  startPreparedValidationAuthorityBroker,
  type BrokerStartup,
  type CoordinatorBrokerCapabilities,
} from '@review/validation-authority-broker';
import { Command } from 'commander';

interface AuthorityBrokerCommandDependencies {
  readStartup: () => Promise<BrokerStartup>;
  readKey: () => Promise<Buffer>;
  readCoordinatorCapabilities: () => Promise<CoordinatorBrokerCapabilities>;
  write: (output: string) => void;
  start: typeof startPreparedValidationAuthorityBroker;
}

const DEFAULT_DEPENDENCIES: AuthorityBrokerCommandDependencies = {
  readStartup: async () =>
    parseStrictJson(await readDescriptor(3)) as BrokerStartup,
  readKey: async () =>
    Buffer.from((await readDescriptor(4)).trim(), 'base64url'),
  readCoordinatorCapabilities: async () =>
    parseCoordinatorBrokerCapabilities(
      parseStrictJson(await readDescriptor(5)),
    ),
  write: (output) => process.stdout.write(output),
  start: startPreparedValidationAuthorityBroker,
};

async function readDescriptor(fd: number): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of createReadStream('', { fd, autoClose: true })) {
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
          coordinatorCapabilities:
            await dependencies.readCoordinatorCapabilities(),
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
