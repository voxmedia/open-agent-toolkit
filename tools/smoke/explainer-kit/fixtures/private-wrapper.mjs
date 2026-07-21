import { readFile } from 'node:fs/promises';

import { runExplainer } from '../../../../.agents/skills/explainer-kit/scripts/run.mjs';

export const PERSONAL_PRESETS_EXAMPLE = Object.freeze({
  'personal-oat': Object.freeze({
    publicBaseUrl: 'https://dy4vzrzaexuy5.cloudfront.net',
    publish: Object.freeze({
      provider: 's3-static',
      s3Uri: 's3://tkstang-open-agent-toolkit/explainers',
      awsRegion: 'us-east-1',
    }),
  }),
});

export function preResolvePrivateWrapper({
  presetName,
  presets,
  invocation,
  privateLanes = {},
}) {
  const preset = presets?.[presetName];
  if (!preset) {
    throw new Error(`Unknown private wrapper preset: ${presetName}.`);
  }
  if (!invocation?.outputRoot || !invocation?.factBasePath) {
    throw new Error(
      'Private wrapper invocation requires outputRoot and factBasePath.',
    );
  }

  return {
    preset: structuredClone(preset),
    privateLanes: structuredClone(privateLanes),
    request: {
      schemaVersion: 'explainer-kit.run-request/v1',
      recipe: structuredClone(invocation.recipe),
      slug: invocation.slug,
      outputRoot: invocation.outputRoot,
      factBase: {
        mode: 'supplied',
        path: invocation.factBasePath,
        freshnessPolicy: 'live-wins',
      },
      theme: {
        palette: invocation.palette ?? 'neutral',
        visualProfile: invocation.visualProfile ?? 'clean',
        renderStrategy: invocation.renderStrategy ?? 'default-only',
      },
      publicBaseUrl: preset.publicBaseUrl,
      durability: { strategy: 'none' },
      privacy: { retainRawArtDirection: false },
      mode: 'unattended',
    },
  };
}

export async function runPrivateWrapper({
  presetName,
  presets,
  invocation,
  privateLanes,
  publishManifest,
  writeStoaNote,
  syncGoogleDoc,
  coreOptions = {},
}) {
  const preResolved = preResolvePrivateWrapper({
    presetName,
    presets,
    invocation,
    privateLanes,
  });
  const result = await runExplainer(preResolved.request, coreOptions);
  if (result.outcome === 'failed' || result.outcome === 'incomplete') {
    throw new Error(
      `Core run did not produce a consumable manifest: ${result.outcome}.`,
    );
  }

  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  assertConsumableManifest(manifest, result, preResolved.request);
  const authorProvenance = await readAuthorProvenance(
    result.runRoot,
    manifest.source?.authorResultPaths,
  );
  if (typeof publishManifest !== 'function') {
    throw new Error('The wrapper post-run stage requires publishManifest.');
  }
  const publishReceipt = await publishManifest({
    publish: preResolved.preset.publish,
    publicBaseUrl: preResolved.preset.publicBaseUrl,
    manifestPath: result.manifestPath,
    manifest: structuredClone(manifest),
  });
  assertConsumableReceipt(publishReceipt, manifest);
  const links = manifest.artifacts
    .filter(
      ({ status, renderedPath }) =>
        status === 'built' && typeof renderedPath === 'string',
    )
    .map(({ id, type, renderedPath }) => {
      if (!renderedPath.startsWith('site/')) {
        throw new Error(
          `Manifest rendered path is outside the publish mirror: ${renderedPath}.`,
        );
      }
      return {
        id,
        type,
        url: `${preResolved.preset.publicBaseUrl}/${renderedPath.slice('site/'.length)}`,
      };
    });
  const postRun = [];

  if (preResolved.privateLanes.stoa) {
    if (typeof writeStoaNote !== 'function') {
      throw new Error('The Stoa lane requires writeStoaNote.');
    }
    postRun.push(
      await writeStoaNote({
        ...preResolved.privateLanes.stoa,
        slug: manifest.slug,
        manifestPath: result.manifestPath,
        publishReceipt: structuredClone(publishReceipt),
        links,
      }),
    );
  }
  if (preResolved.privateLanes.gdocs) {
    if (typeof syncGoogleDoc !== 'function') {
      throw new Error('The Google Docs lane requires syncGoogleDoc.');
    }
    postRun.push(
      await syncGoogleDoc({
        ...preResolved.privateLanes.gdocs,
        slug: manifest.slug,
        manifestPath: result.manifestPath,
        publishReceipt: structuredClone(publishReceipt),
        links,
      }),
    );
  }

  return {
    preResolved,
    request: preResolved.request,
    result,
    manifest,
    authorProvenance,
    publishReceipt,
    links,
    postRun,
  };
}

async function readAuthorProvenance(runRoot, authorResultPaths) {
  if (!Array.isArray(authorResultPaths) || authorResultPaths.length === 0) {
    throw new Error('Unattended wrapper run did not retain author provenance.');
  }
  return Promise.all(
    authorResultPaths.map(async (relativePath) => {
      const result = JSON.parse(
        await readFile(`${runRoot}/${relativePath}`, 'utf8'),
      );
      if (
        typeof result.provenance?.authorId !== 'string' ||
        typeof result.provenance?.method !== 'string'
      ) {
        throw new Error(
          `Retained author result is missing provenance: ${relativePath}.`,
        );
      }
      return structuredClone(result.provenance);
    }),
  );
}

function assertConsumableReceipt(receipt, manifest) {
  const manifestArtifacts = new Map(
    manifest.artifacts
      .filter(({ status }) => status === 'built')
      .map(({ renderedPath, hash }) => [renderedPath, hash]),
  );
  if (
    receipt?.schemaVersion !== 'explainer-kit.publish-receipt/v1' ||
    !receipt.sentinel?.relativePath?.includes(manifest.runId) ||
    receipt.sentinel.uploadVerified !== true ||
    receipt.sentinel.publicVerified !== true ||
    receipt.sentinel.deleted !== true ||
    !Array.isArray(receipt.artifacts) ||
    receipt.artifacts.length !== manifestArtifacts.size ||
    !receipt.artifacts.every(
      ({ relativePath, hash }) => manifestArtifacts.get(relativePath) === hash,
    )
  ) {
    throw new Error('Publish receipt does not match the wrapper core run.');
  }
}

function assertConsumableManifest(manifest, result, request) {
  if (manifest.schemaVersion !== 'explainer-kit.manifest/v1') {
    throw new Error(
      `Unsupported manifest version: ${manifest.schemaVersion ?? 'missing'}.`,
    );
  }
  if (
    manifest.runId !== result.runId ||
    manifest.slug !== request.slug ||
    manifest.recipe?.id !== request.recipe.id ||
    manifest.recipe?.version !== request.recipe.version
  ) {
    throw new Error('Manifest identity does not match the wrapper core run.');
  }
}
