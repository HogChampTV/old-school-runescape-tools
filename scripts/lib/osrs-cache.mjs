/**
 * Minimal pure-Node reader ("decompiler") for the OSRS game cache (Jagex JS5
 * disk format) - the same cache RuneLite and the official client download.
 * No Java, no dependencies beyond node:zlib.
 *
 * It reads straight from a local client cache (RuneLite's by default), so
 * extracting data costs zero network requests and is exactly as current as
 * the game build you last launched.
 *
 * Format knowledge ported from RuneLite's open-source cache module
 * (net.runelite.cache; BSD-2) and the OpenRS2 documentation:
 *  - disk layout: main_file_cache.dat2 (520-byte sectors) + .idx<n> files
 *  - containers: [type u8][compressedLen i32][uncompressedLen i32?][data]
 *    with type 0 = raw, 1 = bzip2, 2 = gzip
 *  - reference table (index 255) protocols 5-7
 *  - multi-file group packing with chunked size trailer
 *  - item config opcodes (index 2, group 10, one file per item id)
 *
 * Exposed API, usable by any future tool in this repo:
 *   readItemDefinitions({ cacheDir }) -> Map<id, itemDef>
 *   findLocalCacheDir() -> string | null
 *   DiskCache, decodeItem, WEAR_POS_TO_SLOT for lower-level use
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import Bzip2 from 'seek-bzip';

// ---------- byte stream ----------

// Jagex's take on cp1252: bytes 128-159 map to these characters.
const CP1252_SPECIALS = [
  0x20ac, 0, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039,
  0x152, 0, 0x17d, 0, 0, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc,
  0x2122, 0x161, 0x203a, 0x153, 0, 0x17e, 0x178,
];

export class ByteStream {
  constructor(buf) {
    this.b = buf;
    this.o = 0;
  }
  get remaining() { return this.b.length - this.o; }
  u8() { return this.b[this.o++]; }
  i8() { return this.b.readInt8(this.o++); }
  peekU8() { return this.b[this.o]; }
  u16() { const v = this.b.readUInt16BE(this.o); this.o += 2; return v; }
  i16() { const v = this.b.readInt16BE(this.o); this.o += 2; return v; }
  u24() { const v = this.b.readUIntBE(this.o, 3); this.o += 3; return v; }
  i32() { const v = this.b.readInt32BE(this.o); this.o += 4; return v; }
  i64() { const v = this.b.readBigInt64BE(this.o); this.o += 8; return v; }
  bigSmart() { return this.peekU8() & 0x80 ? this.i32() & 0x7fffffff : this.u16(); }
  string() {
    let s = '';
    for (;;) {
      const ch = this.u8();
      if (ch === 0) break;
      if (ch >= 128 && ch < 160) s += String.fromCharCode(CP1252_SPECIALS[ch - 128] || 0x3f);
      else s += String.fromCharCode(ch);
    }
    return s;
  }
  params() {
    const out = {};
    const size = this.u8();
    for (let i = 0; i < size; i++) {
      const type = this.u8();
      const key = this.u24();
      out[key] = type === 1 ? this.string() : type === 2 ? Number(this.i64()) : this.i32();
    }
    return out;
  }
}

// ---------- disk cache (dat2 + idx files) ----------

const SECTOR_SIZE = 520;

export class DiskCache {
  constructor(dir) {
    this.dir = dir;
    this.dat = fs.readFileSync(path.join(dir, 'main_file_cache.dat2'));
    this.idx = new Map();
  }

  #index(indexId) {
    if (!this.idx.has(indexId)) {
      this.idx.set(indexId, fs.readFileSync(path.join(this.dir, `main_file_cache.idx${indexId}`)));
    }
    return this.idx.get(indexId);
  }

  /** Raw (still-compressed) container bytes for a group. */
  readGroup(indexId, groupId) {
    const idx = this.#index(indexId);
    const entry = groupId * 6;
    if (entry + 6 > idx.length) throw new Error(`group ${groupId} not in idx${indexId}`);
    const size = idx.readUIntBE(entry, 3);
    let sector = idx.readUIntBE(entry + 3, 3);
    if (size === 0 || sector === 0) throw new Error(`group ${groupId} missing from idx${indexId}`);

    const extended = groupId > 0xffff;
    const headerLen = extended ? 10 : 8;
    const dataLen = SECTOR_SIZE - headerLen;
    const out = Buffer.alloc(size);
    let read = 0;
    for (let chunk = 0; read < size; chunk++) {
      const base = sector * SECTOR_SIZE;
      if (sector === 0 || base + SECTOR_SIZE > this.dat.length) throw new Error('broken sector chain');
      const curGroup = extended ? this.dat.readUInt32BE(base) : this.dat.readUInt16BE(base);
      const curChunk = this.dat.readUInt16BE(base + (extended ? 4 : 2));
      const nextSector = this.dat.readUIntBE(base + (extended ? 6 : 4), 3);
      const curIndex = this.dat[base + (extended ? 9 : 7)];
      if (curGroup !== groupId || curChunk !== chunk || curIndex !== indexId) {
        throw new Error(`sector mismatch reading ${indexId}/${groupId} (got ${curIndex}/${curGroup} chunk ${curChunk})`);
      }
      const n = Math.min(dataLen, size - read);
      this.dat.copy(out, read, base + headerLen, base + headerLen + n);
      read += n;
      sector = nextSector;
    }
    return out;
  }
}

/** Container -> plain bytes. */
export function decompressContainer(buf) {
  const type = buf[0];
  const compLen = buf.readInt32BE(1);
  if (type === 0) return buf.subarray(5, 5 + compLen);
  const uncompressedLen = buf.readInt32BE(5);
  const comp = buf.subarray(9, 9 + compLen);
  let out;
  if (type === 2) out = zlib.gunzipSync(comp);
  // Jagex strips the "BZh1" magic from bzip2 streams; restore it.
  else if (type === 1) out = Buffer.from(Bzip2.decode(Buffer.concat([Buffer.from('BZh1'), comp])));
  else throw new Error(`unknown container compression type ${type}`);
  if (out.length !== uncompressedLen) throw new Error('container length mismatch');
  return out;
}

/** Reference table (index 255, group = archive id): group -> file layout. */
export function parseRefTable(buf) {
  const s = new ByteStream(buf);
  const protocol = s.u8();
  if (protocol < 5 || protocol > 7) throw new Error(`unsupported reference table protocol ${protocol}`);
  const revision = protocol >= 6 ? s.i32() : 0;
  const flags = s.u8();
  const named = (flags & 0x1) !== 0;
  if (flags & ~0xf) throw new Error(`unsupported reference table flags ${flags}`);
  const readCount = () => (protocol >= 7 ? s.bigSmart() : s.u16());

  const groupCount = readCount();
  const groupIds = [];
  for (let i = 0, id = 0; i < groupCount; i++) groupIds.push((id += readCount()));
  if (named) s.o += 4 * groupCount; // group name hashes
  s.o += 4 * groupCount; // crcs
  if (flags & 0x8) s.o += 4 * groupCount; // uncompressed crcs
  if (flags & 0x2) s.o += 64 * groupCount; // whirlpool digests
  if (flags & 0x4) s.o += 8 * groupCount; // compressed + uncompressed lengths
  s.o += 4 * groupCount; // versions
  const fileCounts = groupIds.map(() => readCount());
  const groups = new Map();
  for (let i = 0; i < groupCount; i++) {
    const fileIds = [];
    for (let j = 0, id = 0; j < fileCounts[i]; j++) fileIds.push((id += readCount()));
    groups.set(groupIds[i], { fileIds });
  }
  return { protocol, revision, groups };
}

/** Split a multi-file group's data into its files. */
export function unpackGroup(data, fileIds) {
  if (fileIds.length === 1) return new Map([[fileIds[0], data]]);
  const files = new Map();
  const chunks = data[data.length - 1];
  let o = data.length - 1 - chunks * fileIds.length * 4;
  const chunkSizes = [];
  for (let c = 0; c < chunks; c++) {
    let size = 0;
    chunkSizes.push(fileIds.map(() => {
      size += data.readInt32BE(o);
      o += 4;
      return size;
    }));
  }
  const parts = new Map(fileIds.map((id) => [id, []]));
  let pos = 0;
  for (let c = 0; c < chunks; c++) {
    for (let f = 0; f < fileIds.length; f++) {
      const n = chunkSizes[c][f];
      parts.get(fileIds[f]).push(data.subarray(pos, pos + n));
      pos += n;
    }
  }
  for (const [id, list] of parts) files.set(id, Buffer.concat(list));
  return files;
}

// ---------- item config decoding ----------

// wearPos1 -> player kit slot -> our equipment slot name. A two-handed weapon
// has wearPos1 = 3 (weapon) and wearPos2 = 5 (also occupies shield).
export const WEAR_POS_TO_SLOT = {
  0: 'head', 1: 'cape', 2: 'neck', 3: 'weapon', 4: 'body', 5: 'shield',
  7: 'legs', 9: 'hands', 10: 'feet', 12: 'ring', 13: 'ammo',
};

/** Port of RuneLite's ItemLoader. Consumes every opcode; keeps what we use. */
export function decodeItem(id, buf) {
  const s = new ByteStream(buf);
  const def = {
    id, name: 'null', cost: 1, stackable: 0, members: false,
    tradeable: true, geTradeable: false,
    wearPos1: -1, wearPos2: -1, wearPos3: -1,
    notedTemplate: -1, placeholderTemplate: -1, boughtTemplate: -1,
  };
  const skipSubOps = () => {
    s.u8(); // op index
    for (;;) {
      if (s.u8() - 1 === -1) break;
      s.string();
    }
  };
  for (;;) {
    const op = s.u8();
    if (op === 0) break;
    if (op === 1) s.u16();
    else if (op === 2) def.name = s.string();
    else if (op === 3) def.examine = s.string();
    else if (op >= 4 && op <= 6) s.u16();
    else if (op === 7 || op === 8) s.u16();
    else if (op === 9) s.string();
    else if (op === 11) def.stackable = 1;
    else if (op === 12) def.cost = s.i32();
    else if (op === 13) def.wearPos1 = s.i8();
    else if (op === 14) def.wearPos2 = s.i8();
    else if (op === 15) def.tradeable = false;
    else if (op === 16) def.members = true;
    else if (op === 23) { s.u16(); s.u8(); }
    else if (op === 24) s.u16();
    else if (op === 25) { s.u16(); s.u8(); }
    else if (op === 26) s.u16();
    else if (op === 27) def.wearPos3 = s.i8();
    else if (op >= 30 && op < 35) s.string(); // ground option
    else if (op >= 35 && op < 40) s.string(); // interface option
    else if (op === 40 || op === 41) { const n = s.u8(); s.o += n * 4; } // (re)colors / textures
    else if (op === 42) s.i8();
    else if (op === 43) skipSubOps();
    else if (op === 44) s.i32();
    else if (op === 45 || op === 48) { s.i32(); s.u8(); }
    else if (op >= 46 && op <= 54) s.i32(); // models (46,47,49..54)
    else if (op === 65) def.geTradeable = true;
    else if (op === 75) s.i16(); // weight
    else if (op >= 78 && op <= 79) s.u16();
    else if (op >= 90 && op <= 93) s.u16();
    else if (op === 94) s.u16(); // category
    else if (op === 95) s.u16();
    else if (op === 97) s.u16(); // noted id
    else if (op === 98) def.notedTemplate = s.u16();
    else if (op === 99) s.u16(); // full recolor
    else if (op >= 100 && op < 110) { s.u16(); s.u16(); } // stack count variants
    else if (op >= 110 && op <= 112) s.u16();
    else if (op === 113 || op === 114) s.i8();
    else if (op === 115) s.u8(); // team
    else if (op === 139) s.u16(); // bought id
    else if (op === 140) def.boughtTemplate = s.u16();
    else if (op === 148) s.u16(); // placeholder id
    else if (op === 149) def.placeholderTemplate = s.u16();
    else if (op === 160) def.stackable = 2;
    else if (op === 161) { const n = s.u16(); s.o += n * 2; } // holding whitelist
    else if (op === 200) { s.u8(); s.u8(); s.string(); } // sub op
    else if (op === 201) { s.u8(); s.u16(); s.u16(); s.i32(); s.i32(); s.string(); } // conditional op
    else if (op === 202) { s.u8(); s.u16(); s.u16(); s.u16(); s.i32(); s.i32(); s.string(); } // conditional sub op
    else if (op === 249) def.params = s.params();
    else if (op === 251) {} // bronzeman flag
    else throw new Error(`item ${id}: unrecognized opcode ${op} at offset ${s.o - 1}`);
  }
  return def;
}

// ---------- high level ----------

const CONFIG_INDEX = 2;
const ITEM_GROUP = 10;

export function findLocalCacheDir() {
  const candidates = [
    path.join(os.homedir(), '.runelite', 'jagexcache', 'oldschool', 'LIVE'),
    path.join(os.homedir(), 'jagexcache', 'oldschool', 'LIVE'),
  ];
  return candidates.find((d) => fs.existsSync(path.join(d, 'main_file_cache.dat2'))) ?? null;
}

function decodeItemGroup(refTableContainer, itemGroupContainer) {
  const refTable = parseRefTable(decompressContainer(refTableContainer));
  const group = refTable.groups.get(ITEM_GROUP);
  if (!group) throw new Error('item config group missing from reference table');
  const files = unpackGroup(decompressContainer(itemGroupContainer), group.fileIds);
  const items = new Map();
  for (const [id, buf] of files) items.set(id, decodeItem(id, buf));
  return items;
}

/** Read and decode every item definition from a local game cache. */
export function readItemDefinitions({ cacheDir = findLocalCacheDir() } = {}) {
  if (!cacheDir) {
    throw new Error(
      'No local OSRS cache found. Launch RuneLite once (it downloads the cache), or pass --cache <dir>.',
    );
  }
  const cache = new DiskCache(cacheDir);
  return decodeItemGroup(cache.readGroup(255, CONFIG_INDEX), cache.readGroup(CONFIG_INDEX, ITEM_GROUP));
}

/**
 * Same result without a local cache: fetch just the two needed groups
 * (~0.7 MB total, two requests) from the OpenRS2 archive's newest OSRS cache.
 */
export async function fetchOpenRS2ItemDefinitions({ userAgent = 'osrs-cache.mjs' } = {}) {
  const headers = { 'User-Agent': userAgent };
  const get = async (url) => {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return res;
  };
  const caches = await (await get('https://archive.openrs2.org/caches.json')).json();
  const newest = caches
    .filter((c) => c.game === 'oldschool' && c.environment === 'live' && c.timestamp)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  if (!newest) throw new Error('no OSRS cache found on OpenRS2');
  const base = `https://archive.openrs2.org/caches/${newest.scope}/${newest.id}/archives`;
  const group = async (a, g) => Buffer.from(await (await get(`${base}/${a}/groups/${g}.dat`)).arrayBuffer());
  console.log(`  using OpenRS2 cache ${newest.id} (${newest.timestamp.slice(0, 10)}, build ${newest.builds?.[0]?.major})`);
  return decodeItemGroup(await group(255, CONFIG_INDEX), await group(CONFIG_INDEX, ITEM_GROUP));
}
