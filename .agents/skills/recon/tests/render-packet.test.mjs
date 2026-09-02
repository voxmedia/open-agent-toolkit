import assert from 'node:assert/strict';
import {
  copyFile,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { hashFile } from '../scripts/lib/canonical-json.mjs';
import {
  renderPacket,
  renderPacketDocument,
  renderValidatedPacket,
} from '../scripts/render-packet.mjs';
import { compileValidatedRun } from '../scripts/validate-packet.mjs';
import { createPacketFixture } from './fixtures/packet-fixture.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function markIneligibleAudit(fixture, validationState) {
  const source = fixture.manifest.sources[0];
  source.validationState = validationState;
  source.available = validationState !== 'unavailable';
  fixture.ledger.evidence[0].locatorValidation.status =
    validationState === 'unavailable' ? 'invalid' : validationState;
  for (const claim of fixture.ledger.claims) claim.status = 'contested';
  fixture.ledger.transitions = fixture.ledger.claims.map((claim) => ({
    claimId: claim.id,
    from: 'provisional',
    to: 'contested',
  }));
  fixture.manifest.run.status = 'partial';
  fixture.manifest.gaps.push({
    id: `gap-${validationState}-audit`,
    code: 'SOURCE_INELIGIBLE',
    message: `${validationState} source retained only for audit.`,
    material: true,
    sourceIds: ['source-1'],
    claimIds: fixture.ledger.claims.map((claim) => claim.id),
    coverageFindingIds: [],
  });
  await fixture.persist();
}

async function aliasSourcePath(fixture, sourceKind) {
  const source = fixture.manifest.sources[0];
  if (sourceKind === 'repository') {
    const alias = join(fixture.tempRoot, 'repository-audit-alias');
    await symlink(fixture.sourceRoot, alias, 'dir');
    source.root = alias;
  } else if (sourceKind === 'file') {
    const alias = join(fixture.tempRoot, 'file-audit-alias.txt');
    await symlink(fixture.sourcePath, alias, 'file');
    source.path = alias;
    fixture.ledger.evidence[0].locator.path = alias;
  } else {
    const aliasName = `${sourceKind}-audit-alias.txt`;
    const alias = join(fixture.packetRoot, 'raw', 'captures', aliasName);
    await symlink(fixture.sourcePath, alias, 'file');
    if (sourceKind === 'command-output') {
      source.outputPath = `raw/captures/${aliasName}`;
      fixture.ledger.evidence[0].locator.artifactPath = source.outputPath;
    } else {
      source.capturePath = `raw/captures/${aliasName}`;
    }
  }
  await fixture.persist();
}

async function retargetSourcePath(fixture, sourceKind) {
  const original =
    sourceKind === 'repository' ? fixture.sourceRoot : fixture.sourcePath;
  const moved = join(fixture.tempRoot, `${sourceKind}-audit-moved`);
  await rename(original, moved);
  await symlink(moved, original, sourceKind === 'repository' ? 'dir' : 'file');
}

async function declareDualUrlCapture(fixture) {
  const validatorPath = join(
    fixture.packetRoot,
    'raw',
    'captures',
    'url-validator.txt',
  );
  await copyFile(fixture.sourcePath, validatorPath);
  const source = fixture.manifest.sources[0];
  source.validatorState = {
    capturePath: 'raw/captures/url-validator.txt',
    captureDigest: source.captureDigest,
  };
  await fixture.persist();
  return {
    direct: fixture.sourcePath,
    validator: validatorPath,
  };
}

test('packet rendering is deterministic and contains the complete consumer view', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  const first = renderPacketDocument(validation.validatedRun);
  const second = renderPacketDocument(validation.validatedRun);
  assert.equal(first, second);
  for (const heading of [
    '# Recon Evidence Packet',
    '## Synthesis',
    '## Key Claims',
    '## Contradictions and Qualifications',
    '## Unresolved Questions',
    '## Coverage Gaps',
    '## Failed or Omitted Passes',
    '## Provenance',
  ]) {
    assert.match(first, new RegExp(heading));
  }
  assert.match(first, /\*\*verified\*\*/i);
  assert.match(first, /source\.txt:1/i);
  assert.doesNotMatch(first, /raw\/dossiers|gather\.json|compiler reasoning/i);
});

test('render core rejects raw or partially validated packet data', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  assert.throws(
    () => renderPacketDocument(fixture.manifest, fixture.ledger),
    /ValidatedRun/,
  );
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(Object.isFrozen(validation.validatedRun), true);
  assert.equal(Object.isFrozen(validation.validatedRun.manifest), true);
  assert.doesNotThrow(() => renderPacketDocument(validation.validatedRun));
});

test('publication rejects a packet root retargeted after validation', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  const moved = join(fixture.tempRoot, 'packet-moved');
  await rename(fixture.packetRoot, moved);
  await symlink(moved, fixture.packetRoot, 'dir');
  await assert.rejects(
    renderValidatedPacket(validation.validatedRun),
    /root|symlink/i,
  );
});

for (const sourceKind of [
  'repository',
  'file',
  'url',
  'command-output',
  'connected-resource',
]) {
  test(`validation rejects a declared ${sourceKind} filesystem alias`, async () => {
    const fixture = await createPacketFixture({
      profile: 'quick',
      sourceKind,
    });
    tempRoots.push(fixture.tempRoot);
    const source = fixture.manifest.sources[0];
    if (sourceKind === 'repository') {
      const alias = join(fixture.tempRoot, 'repository-alias');
      await symlink(fixture.sourceRoot, alias, 'dir');
      source.root = alias;
    } else if (sourceKind === 'file') {
      const alias = join(fixture.tempRoot, 'file-alias.txt');
      await symlink(fixture.sourcePath, alias, 'file');
      source.path = alias;
      fixture.ledger.evidence[0].locator.path = alias;
    } else {
      const aliasName = `${sourceKind}-alias.txt`;
      const alias = join(fixture.packetRoot, 'raw', 'captures', aliasName);
      await symlink(fixture.sourcePath, alias, 'file');
      if (sourceKind === 'command-output') {
        source.outputPath = `raw/captures/${aliasName}`;
        fixture.ledger.evidence[0].locator.artifactPath = source.outputPath;
      } else {
        source.capturePath = `raw/captures/${aliasName}`;
      }
    }
    await fixture.persist();
    const validation = await compileValidatedRun(fixture.packetRoot);
    assert.equal(validation.valid, false, JSON.stringify(validation, null, 2));
    assert.ok(
      validation.errors.some((error) => error.code === 'SYMLINK_ESCAPE'),
      JSON.stringify(validation, null, 2),
    );
  });

  test(`publication rejects ${sourceKind} identity retargeted after compilation`, async () => {
    const fixture = await createPacketFixture({
      profile: 'quick',
      sourceKind,
    });
    tempRoots.push(fixture.tempRoot);
    const validation = await compileValidatedRun(fixture.packetRoot);
    assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
    const original =
      sourceKind === 'repository' ? fixture.sourceRoot : fixture.sourcePath;
    const moved = join(fixture.tempRoot, `${sourceKind}-moved`);
    await rename(original, moved);
    await symlink(
      moved,
      original,
      sourceKind === 'repository' ? 'dir' : 'file',
    );
    await assert.rejects(
      renderValidatedPacket(validation.validatedRun),
      /identity|root|symlink/i,
    );
  });
}

for (const validationState of ['stale', 'invalid', 'unavailable']) {
  for (const sourceKind of [
    'repository',
    'file',
    'url',
    'command-output',
    'connected-resource',
  ]) {
    test(`${validationState} ${sourceKind} audit source rejects a declared filesystem alias`, async () => {
      const fixture = await createPacketFixture({
        profile: 'quick',
        sourceKind,
      });
      tempRoots.push(fixture.tempRoot);
      await markIneligibleAudit(fixture, validationState);
      await aliasSourcePath(fixture, sourceKind);
      const validation = await compileValidatedRun(fixture.packetRoot);
      assert.equal(
        validation.valid,
        false,
        JSON.stringify(validation, null, 2),
      );
      assert.ok(
        validation.errors.some((error) => error.code === 'SYMLINK_ESCAPE'),
        JSON.stringify(validation, null, 2),
      );
    });

    test(`publication rejects ${validationState} ${sourceKind} audit identity retargeted after compilation`, async () => {
      const fixture = await createPacketFixture({
        profile: 'quick',
        sourceKind,
      });
      tempRoots.push(fixture.tempRoot);
      await markIneligibleAudit(fixture, validationState);
      const validation = await compileValidatedRun(fixture.packetRoot);
      assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
      await retargetSourcePath(fixture, sourceKind);
      await assert.rejects(
        renderValidatedPacket(validation.validatedRun),
        /identity|root|symlink/i,
      );
    });
  }

  test(`${validationState} command-output audit source rejects a working-directory alias`, async () => {
    const fixture = await createPacketFixture({
      profile: 'quick',
      sourceKind: 'command-output',
    });
    tempRoots.push(fixture.tempRoot);
    await markIneligibleAudit(fixture, validationState);
    const alias = join(fixture.tempRoot, 'command-cwd-audit-alias');
    await symlink(fixture.sourceRoot, alias, 'dir');
    fixture.manifest.sources[0].cwd = alias;
    await fixture.persist();
    const validation = await compileValidatedRun(fixture.packetRoot);
    assert.equal(validation.valid, false, JSON.stringify(validation, null, 2));
    assert.ok(
      validation.errors.some((error) => error.code === 'SYMLINK_ESCAPE'),
      JSON.stringify(validation, null, 2),
    );
  });

  test(`publication rejects ${validationState} command-output working-directory retarget`, async () => {
    const fixture = await createPacketFixture({
      profile: 'quick',
      sourceKind: 'command-output',
    });
    tempRoots.push(fixture.tempRoot);
    await markIneligibleAudit(fixture, validationState);
    const validation = await compileValidatedRun(fixture.packetRoot);
    assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
    const moved = join(fixture.tempRoot, 'command-cwd-audit-moved');
    await rename(fixture.sourceRoot, moved);
    await symlink(moved, fixture.sourceRoot, 'dir');
    await assert.rejects(
      renderValidatedPacket(validation.validatedRun),
      /identity|root|symlink/i,
    );
  });

  for (const captureForm of ['direct', 'validator']) {
    test(`${validationState} dual-form URL audit rejects an alias in its ${captureForm} capture`, async () => {
      const fixture = await createPacketFixture({
        profile: 'quick',
        sourceKind: 'url',
      });
      tempRoots.push(fixture.tempRoot);
      await markIneligibleAudit(fixture, validationState);
      const captures = await declareDualUrlCapture(fixture);
      const aliasName = `url-${captureForm}-dual-alias.txt`;
      const alias = join(fixture.packetRoot, 'raw', 'captures', aliasName);
      await symlink(captures[captureForm], alias, 'file');
      const source = fixture.manifest.sources[0];
      if (captureForm === 'direct') {
        source.capturePath = `raw/captures/${aliasName}`;
      } else {
        source.validatorState.capturePath = `raw/captures/${aliasName}`;
      }
      await fixture.persist();
      const validation = await compileValidatedRun(fixture.packetRoot);
      assert.equal(
        validation.valid,
        false,
        JSON.stringify(validation, null, 2),
      );
      assert.ok(
        validation.errors.some((error) => error.code === 'DUAL_URL_CAPTURE'),
        JSON.stringify(validation, null, 2),
      );
    });

    test(`${validationState} dual-form URL audit cannot reach publication before a ${captureForm} capture retarget`, async () => {
      const fixture = await createPacketFixture({
        profile: 'quick',
        sourceKind: 'url',
      });
      tempRoots.push(fixture.tempRoot);
      await markIneligibleAudit(fixture, validationState);
      const captures = await declareDualUrlCapture(fixture);
      const validation = await compileValidatedRun(fixture.packetRoot);
      assert.equal(
        validation.valid,
        false,
        JSON.stringify(validation, null, 2),
      );
      assert.ok(
        validation.errors.some((error) => error.code === 'DUAL_URL_CAPTURE'),
        JSON.stringify(validation, null, 2),
      );
      assert.equal(validation.validatedRun, undefined);
      const moved = join(
        fixture.tempRoot,
        `url-${captureForm}-dual-retargeted.txt`,
      );
      await rename(captures[captureForm], moved);
      await symlink(moved, captures[captureForm], 'file');
      await assert.rejects(
        renderValidatedPacket(validation.validatedRun),
        /ValidatedRun/,
      );
    });
  }
}

test('validation binds the declared output path to the canonical packet root', async () => {
  const fixture = await createPacketFixture({ profile: 'quick' });
  tempRoots.push(fixture.tempRoot);
  const alias = join(fixture.tempRoot, 'packet-output-alias');
  await symlink(fixture.packetRoot, alias, 'dir');
  fixture.manifest.request.outputPath = alias;
  await fixture.persist();
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, false, JSON.stringify(validation, null, 2));
  assert.ok(
    validation.errors.some((error) => error.code === 'OUTPUT_ROOT_MISMATCH'),
    JSON.stringify(validation, null, 2),
  );
});

test('renderer validates then atomically publishes stable bytes and digest', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const first = await renderPacket(fixture.packetRoot);
  const firstBytes = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  const second = await renderPacket(fixture.packetRoot);
  const secondBytes = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  assert.equal(first.digest, second.digest);
  assert.equal(firstBytes, secondBytes);
  assert.equal(
    second.digest,
    await hashFile(join(fixture.packetRoot, 'packet.md')),
  );
  assert.equal(first.directory, fixture.packetRoot);
  assert.equal(first.status, 'complete');
  assert.equal(first.requestedProfile, 'standard');
  assert.equal(first.achievedProfile, 'standard');
  assert.deepEqual(first.claimCounts, { contested: 1, verified: 1 });
  assert.equal(Object.hasOwn(first, 'raw'), false);
  const files = await readdir(fixture.packetRoot);
  assert.equal(
    files.some((name) => name.includes('.tmp')),
    false,
  );
});

test('structural validation failure leaves no packet entry point', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  fixture.manifest.schemaVersion = 99;
  await fixture.persist();
  await assert.rejects(
    renderPacket(fixture.packetRoot),
    /packet validation failed/i,
  );
  await assert.rejects(readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'));
});

test('validation failure withdraws a previously published packet', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  await renderPacket(fixture.packetRoot);
  fixture.ledger.synthesis.keyClaimIds = null;
  await fixture.persist();
  await assert.rejects(renderPacket(fixture.packetRoot));
  await assert.rejects(readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'));
  assert.equal(
    JSON.parse(await readFile(fixture.claimsPath, 'utf8')).synthesis
      .keyClaimIds,
    null,
  );
});

test('promotion failure withdraws the published packet and removes the temp file', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  await renderPacket(fixture.packetRoot);
  const validation = await compileValidatedRun(fixture.packetRoot);

  await assert.rejects(
    renderValidatedPacket(validation.validatedRun, {
      promote: async () => {
        throw new Error('injected promotion failure');
      },
    }),
    /injected promotion failure/,
  );
  await assert.rejects(readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'));
  assert.equal(
    (await readdir(fixture.packetRoot)).some((name) => name.endsWith('.tmp')),
    false,
  );
});

test('temporary path replacement after hashing cannot publish different bytes', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  await renderPacket(fixture.packetRoot);
  fixture.ledger.synthesis.answer = 'A candidate synthesis.';
  await fixture.persist();
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));

  await assert.rejects(
    renderValidatedPacket(validation.validatedRun, {
      promote: async (temporary, target) => {
        await rm(temporary);
        await writeFile(temporary, 'replacement bytes', 'utf8');
        await rename(temporary, target);
      },
    }),
    /identity|digest/i,
  );
  await assert.rejects(readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'));
  assert.equal(
    (await readdir(fixture.packetRoot)).some(
      (name) => name.includes('.tmp') || name.includes('.backup'),
    ),
    false,
  );
});

test('successful promotion replaces the previously published packet', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  await renderPacket(fixture.packetRoot);
  const published = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  fixture.ledger.synthesis.answer = 'A replacement synthesis.';
  await fixture.persist();

  await renderPacket(fixture.packetRoot);
  const replacement = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  assert.notEqual(replacement, published);
  assert.match(replacement, /A replacement synthesis\./);
});

test('consumer handoff contains only directory and compact status', async () => {
  const fixture = await createPacketFixture({ profile: 'quick' });
  tempRoots.push(fixture.tempRoot);
  const result = await renderPacket(fixture.packetRoot);
  assert.deepEqual(Object.keys(result).sort(), [
    'achievedProfile',
    'claimCounts',
    'digest',
    'directory',
    'failedOrOmittedPasses',
    'gapCount',
    'requestedProfile',
    'status',
  ]);
  assert.doesNotMatch(JSON.stringify(result), /alpha evidence|raw\/dossiers/i);
});

test('partial rendering reports normalized failed and omitted stage outcomes', async () => {
  const fixture = await createPacketFixture({
    profile: 'standard',
    requestedProfile: 'standard',
    achievedProfile: 'quick',
    status: 'partial',
    failedStageMode: 'semantic-verification',
  });
  tempRoots.push(fixture.tempRoot);
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  const normalizedOutcomes = validation.validatedRun.topology.stages
    .map(({ stage }) => stage)
    .filter((stage) => stage.status !== 'complete');
  const result = await renderValidatedPacket(validation.validatedRun);
  assert.deepEqual(
    result.failedOrOmittedPasses.filter((value) => !value.startsWith('PASS_')),
    normalizedOutcomes.map((stage) => stage.mode),
  );
  const document = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  for (const stage of normalizedOutcomes) {
    assert.match(document, new RegExp(`${stage.mode}.*${stage.status}`, 'i'));
  }
});
