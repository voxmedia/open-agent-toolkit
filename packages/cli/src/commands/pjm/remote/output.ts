import type { ExternalActionEnvelope } from './external-action';
import type { BindingPreview } from './preview';

export type RemoteCommandStatus =
  | 'ok'
  | 'pending'
  | 'needs-review'
  | 'partial'
  | 'uncertain'
  | 'blocked'
  | 'rejected'
  | 'failed';

export interface RemoteCommandEnvelope {
  schemaVersion: 1;
  status: RemoteCommandStatus;
  operation: string;
  projectRoot: string;
  persisted: boolean;
  results: Array<{
    bindingId: string;
    provider: 'github' | 'linear' | 'jira';
    target: string;
    status: RemoteCommandStatus;
    freshness: string;
    authority: string;
    diagnosticCode: string | null;
  }>;
  externalAction: ExternalActionEnvelope | null;
  approvalPreview?: {
    operationId: string;
    digest: string;
    operationClass: BindingPreview['operationClass'];
    fieldMask: BindingPreview['fieldMask'];
    renderedFields: Partial<BindingPreview['renderedFields']>;
    authority: string;
    revision: {
      digest: string;
      evidenceDigest: string;
      observedAt: string;
    };
  };
  recovery: Array<{ code: string; instruction: string }>;
}

export interface RenderedRemoteCommand {
  stdout: string;
  stderr: string;
  exitCode: 0 | 1 | 2;
}

export function renderRemoteCommand(
  envelope: RemoteCommandEnvelope,
  options: { json: boolean },
): RenderedRemoteCommand {
  validateEnvelope(envelope);
  const exitCode =
    envelope.status === 'ok' ? 0 : envelope.status === 'failed' ? 2 : 1;
  if (options.json) {
    return { stdout: `${JSON.stringify(envelope)}\n`, stderr: '', exitCode };
  }
  const lines = [
    `${envelope.operation}: ${envelope.status}`,
    `persisted: ${envelope.persisted ? 'yes' : 'no'}`,
    ...envelope.results.map(
      (result) =>
        `${result.provider} ${result.target} [${result.bindingId}]: ${result.status}; freshness=${result.freshness}; authority=${result.authority}${result.diagnosticCode ? `; code=${result.diagnosticCode}` : ''}`,
    ),
    ...envelope.recovery.map(
      (item) => `recovery ${item.code}: ${item.instruction}`,
    ),
  ];
  if (envelope.externalAction)
    lines.push('external action: durable handoff required');
  if (envelope.approvalPreview) {
    const preview = envelope.approvalPreview;
    lines.push(
      `preview ${preview.operationId}: ${preview.operationClass}; fields=${preview.fieldMask.join(',')}; authority=${preview.authority}; revision=${preview.revision.digest}; revision-evidence=${preview.revision.evidenceDigest}; observed=${preview.revision.observedAt}`,
    );
    for (const field of preview.fieldMask) {
      const rendered = preview.renderedFields[field];
      if (!rendered) {
        throw new Error(
          `Approval preview is missing rendered field '${field}'.`,
        );
      }
      lines.push(
        rendered.kind === 'hash'
          ? `preview field ${field}: hash=${rendered.digest}; bytes=${rendered.bytes}`
          : `preview field ${field}: value=${JSON.stringify(rendered.value)}`,
      );
    }
  }
  const rendered = `${lines.join('\n')}\n`;
  return envelope.status === 'failed'
    ? { stdout: '', stderr: rendered, exitCode }
    : { stdout: rendered, stderr: '', exitCode };
}

function validateEnvelope(envelope: RemoteCommandEnvelope): void {
  if (envelope.schemaVersion !== 1)
    throw new Error('Unsupported remote command envelope version.');
  if (envelope.status === 'ok' && !envelope.persisted) {
    throw new Error('A verified remote outcome must be durably persisted.');
  }
  if (
    envelope.externalAction &&
    (!envelope.persisted || envelope.status !== 'pending')
  ) {
    throw new Error('An external action requires a persisted pending handoff.');
  }
}
