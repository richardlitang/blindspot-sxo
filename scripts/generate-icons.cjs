// Generate placeholder PNG icons for the extension
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Minimal PNG generator - creates solid color squares
function createPNG(size, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = createIHDRChunk(size, size);

  // IDAT chunk (image data)
  const idat = createIDATChunk(size, size, r, g, b);

  // IEND chunk
  const iend = createIENDChunk();

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDRChunk(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 2;  // color type (RGB)
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace

  return createChunk('IHDR', data);
}

function createIDATChunk(width, height, r, g, b) {
  const zlib = require('zlib');

  // Create raw image data (filter byte + RGB for each pixel per row)
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter type: none

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // Create a simple gradient/icon look
      const centerX = width / 2;
      const centerY = height / 2;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
      const factor = 1 - (dist / maxDist) * 0.3;

      raw[pixelOffset] = Math.min(255, Math.round(r * factor));
      raw[pixelOffset + 1] = Math.min(255, Math.round(g * factor));
      raw[pixelOffset + 2] = Math.min(255, Math.round(b * factor));
    }
  }

  const compressed = zlib.deflateSync(raw);
  return createChunk('IDAT', compressed);
}

function createIENDChunk() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(data) {
  let crc = 0xffffffff;
  const table = getCRC32Table();

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  return crcTable;
}

// Generate icons with a purple/blue color (Blindspot brand)
const publicDir = path.join(__dirname, '..', 'public');

const sizes = [16, 48, 128];
const color = { r: 99, g: 102, b: 241 }; // Indigo-500

sizes.forEach(size => {
  const png = createPNG(size, color.r, color.g, color.b);
  const filename = `icon-${size}.png`;
  fs.writeFileSync(path.join(publicDir, filename), png);
  console.log(`Created ${filename}`);
});

console.log('\nPlaceholder icons generated in /public');
console.log('Replace these with proper branded icons before publishing.');
