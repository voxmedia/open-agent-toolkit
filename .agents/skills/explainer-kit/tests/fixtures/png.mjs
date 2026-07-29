import { crc32, deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const cache = new Map();

export function png(width, height, options = {}) {
  const {
    colorType = 6,
    filter = 0,
    splitIdat = false,
    pixels = defaultPixels(width, height, colorType),
  } = options;
  const channels = colorType === 2 ? 3 : 4;
  if (!Buffer.isBuffer(pixels) || pixels.length !== width * height * channels) {
    throw new TypeError(
      'PNG fixture pixels must match width, height, and color type.',
    );
  }
  const cacheKey =
    Object.keys(options).length === 0 ? `${width}x${height}` : undefined;
  if (cacheKey && cache.has(cacheKey)) return Buffer.from(cache.get(cacheKey));

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const raw = filteredScanlines(pixels, width, height, channels, filter);
  const compressed = deflateSync(raw);
  const idatChunks = splitIdat
    ? [
        pngChunk(
          'IDAT',
          compressed.subarray(0, Math.ceil(compressed.length / 2)),
        ),
        pngChunk('IDAT', compressed.subarray(Math.ceil(compressed.length / 2))),
      ]
    : [pngChunk('IDAT', compressed)];
  const result = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    ...idatChunks,
    pngChunk('IEND'),
  ]);
  if (cacheKey) cache.set(cacheKey, result);
  return Buffer.from(result);
}

export function pngChunk(type, data = Buffer.alloc(0), crc = undefined) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(
    crc ?? crc32(Buffer.concat([typeBytes, data])),
    8 + data.length,
  );
  return chunk;
}

export function pngFromChunks(chunks) {
  return Buffer.concat([PNG_SIGNATURE, ...chunks]);
}

function defaultPixels(width, height, colorType) {
  const channels = colorType === 2 ? 3 : 4;
  const pixels = Buffer.alloc(width * height * channels);
  for (let offset = 0; offset < pixels.length; offset += channels) {
    pixels[offset] = width & 0xff;
    pixels[offset + 1] = height & 0xff;
    pixels[offset + 2] = (width + height) & 0xff;
    if (channels === 4) pixels[offset + 3] = 0xff;
  }
  return pixels;
}

function filteredScanlines(pixels, width, height, channels, filter) {
  const rowBytes = width * channels;
  const scanlines = Buffer.alloc((rowBytes + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const inputOffset = row * rowBytes;
    const outputOffset = row * (rowBytes + 1);
    scanlines[outputOffset] = filter;
    for (let column = 0; column < rowBytes; column += 1) {
      const value = pixels[inputOffset + column];
      const left =
        column >= channels ? pixels[inputOffset + column - channels] : 0;
      const up = row > 0 ? pixels[inputOffset - rowBytes + column] : 0;
      const upLeft =
        row > 0 && column >= channels
          ? pixels[inputOffset - rowBytes + column - channels]
          : 0;
      scanlines[outputOffset + 1 + column] =
        (value - filterPrediction(filter, left, up, upLeft) + 256) & 0xff;
    }
  }
  return scanlines;
}

function filterPrediction(filter, left, up, upLeft) {
  if (filter === 0) return 0;
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return Math.floor((left + up) / 2);
  if (filter !== 4)
    throw new TypeError(`Unsupported fixture filter ${filter}.`);
  const estimate = left + up - upLeft;
  const distances = [
    Math.abs(estimate - left),
    Math.abs(estimate - up),
    Math.abs(estimate - upLeft),
  ];
  const minimum = Math.min(...distances);
  return distances[0] === minimum
    ? left
    : distances[1] === minimum
      ? up
      : upLeft;
}
