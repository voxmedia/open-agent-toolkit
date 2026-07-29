import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { test } from 'node:test';

import {
  MAX_PNG_INPUT_BYTES,
  decodeBrowserPng,
} from '../scripts/lib/png.mjs';
import { png, pngChunk, pngFromChunks } from './fixtures/png.mjs';

test('decodes non-interlaced 8-bit RGB and RGBA scanlines with filters 0-4', () => {
  for (const colorType of [2, 6]) {
    const channels = colorType === 2 ? 3 : 4;
    const pixels = Buffer.from(
      Array.from({ length: 3 * 2 * channels }, (_, index) => (index * 37) & 0xff),
    );
    for (let filter = 0; filter <= 4; filter += 1) {
      const decoded = decodeBrowserPng(
        png(3, 2, { colorType, filter, pixels, splitIdat: true }),
      );
      assert.deepEqual(decoded.pixels, pixels);
      assert.equal(decoded.width, 3);
      assert.equal(decoded.height, 2);
      assert.equal(decoded.colorType, colorType);
      assert.match(decoded.pixelHash, /^sha256:[a-f0-9]{64}$/);
    }
  }
});

test('rejects pseudo-PNGs, bad signatures, chunk boundaries, and CRC failures', () => {
  const pseudo = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(pseudo);
  pseudo.writeUInt32BE(320, 16);
  pseudo.writeUInt32BE(640, 20);
  Buffer.from('0000000049454e44ae426082', 'hex').copy(pseudo, 33);
  assert.throws(() => decodeBrowserPng(pseudo), /CRC|profile|IDAT/i);

  const valid = png(3, 2);
  const badSignature = Buffer.from(valid);
  badSignature[0] ^= 0xff;
  assert.throws(() => decodeBrowserPng(badSignature), /signature/i);

  assert.throws(() => decodeBrowserPng(valid.subarray(0, -2)), /boundary|IEND/i);
  const badLength = Buffer.from(valid);
  badLength.writeUInt32BE(0xffff_ffff, 8);
  assert.throws(() => decodeBrowserPng(badLength), /boundary/i);

  const badCrc = Buffer.from(valid);
  badCrc[29] ^= 0xff;
  assert.throws(() => decodeBrowserPng(badCrc), /CRC/i);
});

test('requires one IHDR, contiguous non-empty IDAT, and exactly one final IEND', () => {
  const ihdr = pngChunk('IHDR', ihdrData(1, 1));
  const compressed = deflateSync(Buffer.from([0, 1, 2, 3, 255]));
  const idat = pngChunk('IDAT', compressed);
  const iend = pngChunk('IEND');

  assert.throws(
    () => decodeBrowserPng(pngFromChunks([ihdr, iend])),
    /IDAT/i,
  );
  assert.throws(
    () => decodeBrowserPng(pngFromChunks([ihdr, pngChunk('IDAT'), iend])),
    /non-empty/i,
  );
  assert.throws(
    () =>
      decodeBrowserPng(
        pngFromChunks([
          ihdr,
          pngChunk('IDAT', compressed.subarray(0, 2)),
          pngChunk('tEXt', Buffer.from('gap')),
          pngChunk('IDAT', compressed.subarray(2)),
          iend,
        ]),
      ),
    /contiguous/i,
  );
  assert.throws(
    () => decodeBrowserPng(pngFromChunks([ihdr, ihdr, idat, iend])),
    /exactly one/i,
  );
  assert.throws(
    () => decodeBrowserPng(pngFromChunks([ihdr, idat])),
    /IEND/i,
  );
  assert.throws(
    () => decodeBrowserPng(pngFromChunks([ihdr, idat, pngChunk('IEND', Buffer.of(1))])),
    /empty IEND/i,
  );
  assert.throws(
    () => decodeBrowserPng(Buffer.concat([pngFromChunks([ihdr, idat, iend]), Buffer.of(0)])),
    /trailing bytes/i,
  );
});

test('requires an exact bounded zlib stream and valid inflated scanlines', () => {
  const ihdr = pngChunk('IHDR', ihdrData(1, 1));
  const iend = pngChunk('IEND');
  const image = (compressed) =>
    pngFromChunks([ihdr, pngChunk('IDAT', compressed), iend]);

  assert.throws(() => decodeBrowserPng(image(Buffer.from('not-zlib'))), /zlib/i);
  const validStream = deflateSync(Buffer.from([0, 1, 2, 3, 255]));
  assert.throws(
    () => decodeBrowserPng(image(Buffer.concat([validStream, Buffer.of(0)]))),
    /trailing zlib/i,
  );
  assert.throws(
    () => decodeBrowserPng(image(deflateSync(Buffer.from([0, 1, 2, 3])))),
    /scanline length/i,
  );
  assert.throws(
    () => decodeBrowserPng(image(deflateSync(Buffer.from([5, 1, 2, 3, 255])))),
    /filter 5/i,
  );
});

test('rejects unsupported browser profiles and bounded input or output sizes', () => {
  for (const [index, value] of [
    [8, 16],
    [9, 3],
    [10, 1],
    [11, 1],
    [12, 1],
  ]) {
    const profile = ihdrData(1, 1);
    profile[index] = value;
    assert.throws(
      () =>
        decodeBrowserPng(
          pngFromChunks([
            pngChunk('IHDR', profile),
            pngChunk('IDAT', deflateSync(Buffer.from([0, 1, 2, 3, 255]))),
            pngChunk('IEND'),
          ]),
        ),
      /browser profile/i,
    );
  }

  assert.throws(
    () => decodeBrowserPng(Buffer.alloc(MAX_PNG_INPUT_BYTES + 1)),
    /between/i,
  );
  assert.throws(
    () =>
      decodeBrowserPng(
        pngFromChunks([
          pngChunk('IHDR', ihdrData(16_384, 1_025)),
          pngChunk('IDAT', deflateSync(Buffer.from([0]))),
          pngChunk('IEND'),
        ]),
      ),
    /decoded size/i,
  );
});

function ihdrData(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  return data;
}
