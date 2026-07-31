import { createHash } from 'node:crypto';
import { crc32, inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const SUPPORTED_COLOR_TYPES = new Map([
  [2, 3],
  [6, 4],
]);
const KNOWN_CRITICAL_CHUNKS = new Set(['IHDR', 'IDAT', 'IEND']);

export const MAX_PNG_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_PNG_DECODED_BYTES = 64 * 1024 * 1024;
export const MAX_PNG_DIMENSION = 16_384;

export function decodeBrowserPng(bytes) {
  if (!Buffer.isBuffer(bytes)) {
    throw pngError('PNG input must be a Buffer.');
  }
  if (
    bytes.length < PNG_SIGNATURE.length + 12 ||
    bytes.length > MAX_PNG_INPUT_BYTES
  ) {
    throw pngError(
      `PNG input must be between ${PNG_SIGNATURE.length + 12} and ${MAX_PNG_INPUT_BYTES} bytes.`,
    );
  }
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw pngError('PNG signature is invalid.');
  }

  let offset = PNG_SIGNATURE.length;
  let ihdr = null;
  let sawIdat = false;
  let idatEnded = false;
  let sawIend = false;
  const idatParts = [];
  let idatLength = 0;

  while (offset < bytes.length) {
    if (bytes.length - offset < 12) {
      throw pngError('PNG chunk boundary is truncated.');
    }
    const length = bytes.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > bytes.length) {
      throw pngError('PNG chunk length exceeds the input boundary.');
    }

    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    if (
      typeBytes.some(
        (byte) => !((byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)),
      ) ||
      (typeBytes[2] & 0x20) !== 0
    ) {
      throw pngError('PNG chunk type is invalid.');
    }
    const type = typeBytes.toString('ascii');
    const expectedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (actualCrc !== expectedCrc) {
      throw pngError(`PNG ${type} chunk CRC is invalid.`);
    }
    if (!KNOWN_CRITICAL_CHUNKS.has(type) && (typeBytes[0] & 0x20) === 0) {
      throw pngError(`PNG critical chunk ${type} is unsupported.`);
    }

    const data = bytes.subarray(dataStart, dataEnd);
    if (ihdr === null && type !== 'IHDR') {
      throw pngError('PNG IHDR must be the first chunk.');
    }
    if (type === 'IHDR') {
      if (ihdr !== null || offset !== PNG_SIGNATURE.length || length !== 13) {
        throw pngError('PNG must contain exactly one 13-byte IHDR first.');
      }
      ihdr = parseIhdr(data);
    } else if (type === 'IDAT') {
      if (sawIend || idatEnded) {
        throw pngError('PNG IDAT chunks must be contiguous.');
      }
      sawIdat = true;
      idatLength = boundedAdd(idatLength, length, MAX_PNG_INPUT_BYTES);
      idatParts.push(data);
    } else if (type === 'IEND') {
      if (!sawIdat || sawIend || length !== 0) {
        throw pngError('PNG must contain one empty IEND after IDAT.');
      }
      sawIend = true;
      if (chunkEnd !== bytes.length) {
        throw pngError('PNG contains trailing bytes after IEND.');
      }
    } else if (sawIdat) {
      idatEnded = true;
    }

    offset = chunkEnd;
  }

  if (ihdr === null || !sawIdat || idatLength === 0 || !sawIend) {
    throw pngError(
      'PNG requires IHDR, non-empty contiguous IDAT, and IEND chunks.',
    );
  }

  const { width, height, bitDepth, channels, colorType } = ihdr;
  const rowBytes = boundedMultiply(width, channels, MAX_PNG_DECODED_BYTES);
  const scanlineBytes = boundedMultiply(
    height,
    boundedAdd(rowBytes, 1, MAX_PNG_DECODED_BYTES),
    MAX_PNG_DECODED_BYTES,
  );
  const compressed = Buffer.concat(idatParts, idatLength);
  let inflated;
  let consumed;
  try {
    const result = inflateSync(compressed, {
      info: true,
      maxOutputLength: scanlineBytes,
    });
    inflated = result.buffer;
    consumed = result.engine.bytesWritten;
  } catch (error) {
    throw pngError(`PNG IDAT zlib stream is invalid: ${error.message}`);
  }
  if (consumed !== compressed.length) {
    throw pngError('PNG IDAT contains trailing zlib data.');
  }
  if (inflated.length !== scanlineBytes) {
    throw pngError('PNG inflated scanline length is invalid.');
  }

  const pixels = reconstructScanlines(inflated, {
    width,
    height,
    channels,
    rowBytes,
  });
  const pixelHash = hashBytes(pixels);
  const decodedHash = hashDecodedIdentity({
    width,
    height,
    bitDepth,
    colorType,
    channels,
    pixels,
  });
  return {
    width,
    height,
    bitDepth,
    colorType,
    channels,
    pixels,
    pixelHash,
    decodedHash,
  };
}

function parseIhdr(data) {
  const width = data.readUInt32BE(0);
  const height = data.readUInt32BE(4);
  const bitDepth = data[8];
  const colorType = data[9];
  const channels = SUPPORTED_COLOR_TYPES.get(colorType);
  if (
    width === 0 ||
    height === 0 ||
    width > MAX_PNG_DIMENSION ||
    height > MAX_PNG_DIMENSION
  ) {
    throw pngError(`PNG dimensions must be within 1..${MAX_PNG_DIMENSION}.`);
  }
  if (
    bitDepth !== 8 ||
    channels === undefined ||
    data[10] !== 0 ||
    data[11] !== 0 ||
    data[12] !== 0
  ) {
    throw pngError(
      'PNG browser profile must be non-interlaced 8-bit RGB or RGBA.',
    );
  }
  return { width, height, bitDepth, channels, colorType };
}

function hashDecodedIdentity({
  width,
  height,
  bitDepth,
  colorType,
  channels,
  pixels,
}) {
  const descriptor = Buffer.alloc(11);
  descriptor.writeUInt32BE(width, 0);
  descriptor.writeUInt32BE(height, 4);
  descriptor[8] = bitDepth;
  descriptor[9] = colorType;
  descriptor[10] = channels;
  return `sha256:${createHash('sha256')
    .update('explainer-kit.decoded-png/v1\0', 'utf8')
    .update(descriptor)
    .update(pixels)
    .digest('hex')}`;
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function reconstructScanlines(inflated, { height, channels, rowBytes }) {
  const pixels = Buffer.allocUnsafe(rowBytes * height);
  let inputOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    if (filter > 4) {
      throw pngError(`PNG scanline filter ${filter} is unsupported.`);
    }
    const rowOffset = row * rowBytes;
    for (let column = 0; column < rowBytes; column += 1) {
      const encoded = inflated[inputOffset + column];
      const left =
        column >= channels ? pixels[rowOffset + column - channels] : 0;
      const up = row > 0 ? pixels[rowOffset - rowBytes + column] : 0;
      const upLeft =
        row > 0 && column >= channels
          ? pixels[rowOffset - rowBytes + column - channels]
          : 0;
      pixels[rowOffset + column] =
        (encoded + filterPrediction(filter, left, up, upLeft)) & 0xff;
    }
    inputOffset += rowBytes;
  }
  return pixels;
}

function filterPrediction(filter, left, up, upLeft) {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4:
      return paeth(left, up, upLeft);
    default:
      throw pngError(`PNG scanline filter ${filter} is unsupported.`);
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}

function boundedAdd(left, right, maximum) {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result > maximum) {
    throw pngError('PNG size exceeds the configured bounds.');
  }
  return result;
}

function boundedMultiply(left, right, maximum) {
  const result = left * right;
  if (!Number.isSafeInteger(result) || result > maximum) {
    throw pngError('PNG decoded size exceeds the configured bounds.');
  }
  return result;
}

function pngError(message) {
  const error = new Error(message);
  error.code = 'E_PNG';
  return error;
}
