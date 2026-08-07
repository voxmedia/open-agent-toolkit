import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CliError } from '@errors/cli-error';
import { resolveAssetsRoot } from '@fs/assets';

const TERMINAL_EVIDENCE_VERSION = 'explainer-kit.terminal-evidence/v1';

export interface ExplainerTerminalEvidence {
  TERMINAL_EVIDENCE_VERSION: typeof TERMINAL_EVIDENCE_VERSION;
  assertTerminalEvidence: (
    evidence: unknown,
    context: { manifest: unknown },
  ) => unknown;
  readTerminalEvidenceFile: (
    runRoot: string,
    context: {
      manifest: unknown;
      expectedBytes?: Uint8Array;
      expectedHash?: string;
    },
  ) => Promise<{ evidence: unknown; bytes: Buffer; hash: string }>;
  writeTerminalEvidence: (
    run: { runId: string; slug: string; runRoot: string },
    input: {
      outcome: string;
      manifest: unknown;
      findings?: unknown[];
      error?: unknown;
      evidenceDisposition: string;
    },
  ) => Promise<string>;
}

let cachedTerminalEvidence: Promise<ExplainerTerminalEvidence> | undefined;

export function loadExplainerTerminalEvidence(): Promise<ExplainerTerminalEvidence> {
  cachedTerminalEvidence ??= loadGeneratedTerminalEvidence();
  return cachedTerminalEvidence;
}

async function loadGeneratedTerminalEvidence(): Promise<ExplainerTerminalEvidence> {
  const assetsRoot = await resolveAssetsRoot();
  const skillRoot = join(assetsRoot, 'skills', 'explainer-kit');
  let contract: Record<string, unknown>;
  let records: Record<string, unknown>;
  try {
    [contract, records] = await Promise.all([
      import(
        pathToFileURL(
          join(skillRoot, 'scripts', 'lib', 'terminal-evidence.mjs'),
        ).href
      ) as Promise<Record<string, unknown>>,
      import(
        pathToFileURL(join(skillRoot, 'scripts', 'lib', 'records.mjs')).href
      ) as Promise<Record<string, unknown>>,
    ]);
  } catch (error) {
    throw new CliError(
      `Bundled explainer terminal evidence could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
      2,
    );
  }
  if (
    contract.TERMINAL_EVIDENCE_VERSION !== TERMINAL_EVIDENCE_VERSION ||
    typeof contract.assertTerminalEvidence !== 'function' ||
    typeof contract.readTerminalEvidenceFile !== 'function' ||
    typeof records.writeTerminalEvidence !== 'function'
  ) {
    throw new CliError(
      `Bundled assets must provide ${TERMINAL_EVIDENCE_VERSION} validation and writing.`,
      2,
    );
  }
  return {
    TERMINAL_EVIDENCE_VERSION,
    assertTerminalEvidence:
      contract.assertTerminalEvidence as ExplainerTerminalEvidence['assertTerminalEvidence'],
    readTerminalEvidenceFile:
      contract.readTerminalEvidenceFile as ExplainerTerminalEvidence['readTerminalEvidenceFile'],
    writeTerminalEvidence:
      records.writeTerminalEvidence as ExplainerTerminalEvidence['writeTerminalEvidence'],
  };
}
