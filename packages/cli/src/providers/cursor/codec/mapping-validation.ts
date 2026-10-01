import { CliError } from '@errors/index';

import type { CursorModelPinMapping } from './catalog';

/** Validate at both target collection and rendering, before any role writes. */
export function assertApprovedCursorModelPinMapping(
  mapping: CursorModelPinMapping,
): void {
  if (
    mapping.gateEvidence.gate !== 'g01' ||
    mapping.gateEvidence.disposition !== 'approved' ||
    !mapping.gateEvidence.probeName.trim()
  ) {
    throw new CliError(
      `Cannot materialize Cursor model ${mapping.ladderModelId}: mapping-specific gate g01 approval is required.`,
    );
  }

  if (mapping.syntaxFamily === 'explicit-model-id') {
    const record = mapping.gateEvidence.probeRecord;
    if (
      !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(mapping.frontmatterModel) ||
      mapping.frontmatterModel !== mapping.ladderModelId ||
      !record ||
      record.submittedSelector !== mapping.frontmatterModel ||
      record.resolvedModel !== mapping.ladderModelId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedAt) ||
      !record.evidencePath.trim()
    ) {
      throw new CliError(
        `Cannot materialize Cursor model ${mapping.ladderModelId}: explicit model ID requires matching mapping-specific native probe evidence.`,
      );
    }
    return;
  }

  if (!/\[[^\]]+\]$/.test(mapping.frontmatterModel)) {
    throw new CliError(
      `Cannot materialize Cursor model ${mapping.ladderModelId}: frontmatter model must include a non-empty bracket segment.`,
    );
  }
}
