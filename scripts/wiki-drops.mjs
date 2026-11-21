#!/usr/bin/env node
/**
 * Developer tool: print a monster's drop table from the Old School RuneScape
 * Wiki as JSON, for writing boss loot configs. Only ever run by hand; the
 * site never calls it and the build never runs it.
 *
 *   node scripts/wiki-drops.mjs "Cerberus"            parsed drop lines
 *   node scripts/wiki-drops.mjs "Cerberus" --raw      the page's wikitext
 *   node scripts/wiki-drops.mjs "Cerberus" --section Drops   one section's wikitext
 *
 * Pages are cached in scripts/.wiki-cache for a day so repeated runs don't
 * hit the wiki again.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.wiki-cache');
const UA = 'old-school-runescape-tools data research (github.com/HogChampTV/old-school-runescape-tools)';
const DAY = 24 * 60 * 60 * 1000;

async function wikitext(page) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${page.replace(/[^\w.'() -]/g, '_')}.wikitext`);
  if (existsSync(file) && Date.now() - statSync(file).mtimeMs < DAY) return readFileSync(file, 'utf8');
  const url = `https://oldschool.runescape.wiki/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${page}`);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`);
  writeFileSync(file, json.parse.wikitext);
  return json.parse.wikitext;
}

// Every {{Name ...}} template in the text, with nested templates kept whole.
function* templates(text, name) {
  const open = new RegExp(`\\{\\{\\s*${name}\\s*[|}]`, 'gi');
  let m;
  while ((m = open.exec(text))) {
    let depth = 0;
    let i = m.index;
    for (; i < text.length - 1; i++) {
      if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; } else if (text[i] === '}' && text[i + 1] === '}') {
        depth--; i++;
        if (depth === 0) break;
      }
    }
    yield { start: m.index, body: text.slice(m.index + 2, i - 1) };
    open.lastIndex = i;
  }
}

// Template parameters, splitting only on top-level pipes: {{Name|a=1|b={{x|y}}}}.
function params(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const out = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf('=');
    // Some pages write Rarity= / Quantity=; names are matched lowercased.
    if (eq > 0) out[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  return out;
}

// Footnotes are noise inside a value; keep their text separately.
const stripRefs = (s) => s?.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').trim();

// "1/128", "3/128", "2 × 1/512", "Always", "1/5,000" -> probability or null.
export function parseRarity(raw) {
  if (!raw) return null;
  const s = raw.replace(/,/g, '').replace(/<[^>]+>/g, '').trim();
  if (/^always$/i.test(s)) return 1;
  const times = s.match(/^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (times) return (Number(times[1]) * Number(times[2])) / Number(times[3]);
  const frac = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return null;
}

// "1", "15-25", "250 (noted)", "5–10", "3,000" -> { min, max, noted }.
// "a,b" with b not exactly three digits is two quantities, not a thousands
// separator: DT2 pages write "normal kill, perfect kill" (e.g. 11,17).
export function parseQuantity(raw) {
  if (!raw) return { min: 1, max: 1, noted: false };
  const noted = /noted/i.test(raw);
  const bare = raw.replace(/\(.*?\)/g, '').trim();
  const pair = bare.match(/^(\d+(?:-\d+)?),\s*(\d+(?:-\d+)?)$/);
  if (pair && !/^\d{3}$/.test(pair[2])) {
    return { ...parseQuantity(pair[1]), noted, alt: parseQuantity(pair[2]), altNote: 'second value: perfect kill' };
  }
  const s = bare.replace(/,/g, '').replace(/–/g, '-').trim();
  const range = s.match(/^(\d+)\s*-\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]), noted };
  const one = s.match(/^(\d+)/);
  if (one) return { min: Number(one[1]), max: Number(one[1]), noted };
  return { min: 1, max: 1, noted, raw };
}

function parseDrops(text) {
  // Section heading in force at each offset.
  const heads = [...text.matchAll(/^(=+)\s*(.+?)\s*\1\s*$/gm)].map((m) => ({ at: m.index, name: m[2] }));
  const sectionAt = (at) => heads.filter((h) => h.at < at).pop()?.name ?? '';
  // Drop tables for several variants (e.g. pre/post quest) are labelled by
  // the DropsTableHead before them.
  const versions = [...templates(text, 'DropsTableHead')].map((t) => ({ at: t.start, v: params(t.body).dropversion }));
  const versionAt = (at) => versions.filter((h) => h.at < at).pop()?.v;

  const lines = [];
  const push = (start, p, name, quantity) => {
    const rarity = stripRefs(p.rarity);
    const version = versionAt(start);
    lines.push({
      at: start,
      section: sectionAt(start),
      ...(version ? { version } : {}),
      name,
      quantity: stripRefs(quantity),
      rarity,
      p: parseRarity(rarity),
      qty: parseQuantity(stripRefs(quantity)),
      ...(p.rolls ? { rolls: Number(p.rolls) || p.rolls } : {}),
      ...(p.altrarity ? { altrarity: stripRefs(p.altrarity), altp: parseRarity(stripRefs(p.altrarity)) } : {}),
      ...(p.namenotes ? { namenotes: stripRefs(p.namenotes) || p.namenotes } : {}),
      ...(p.raritynotes ? { raritynotes: p.raritynotes } : {}),
    });
  };
  // DropsLineReward: a reward/sub-table line (e.g. "Gem drop table 20/128").
  for (const name of ['DropsLine', 'DropsLineReward']) {
    for (const t of templates(text, name)) {
      const p = params(t.body);
      push(t.start, p, stripRefs(p.name), p.quantity);
    }
  }
  lines.sort((a, b) => a.at - b.at);
  // {{DropsLineClue|type=elite|rarity=1/100}} is a clue scroll drop.
  for (const t of templates(text, 'DropsLineClue')) {
    const p = params(t.body);
    push(t.start, p, `Clue scroll (${p.type})`, '1');
  }
  // Page order, without the internal offset.
  return lines.sort((a, b) => a.at - b.at).map(({ at, ...rest }) => rest);
}

function section(text, name) {
  const re = new RegExp(`^(=+)\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\1\\s*$`, 'mi');
  const m = text.match(re);
  if (!m) return null;
  const level = m[1].length;
  const rest = text.slice(m.index + m[0].length);
  const end = rest.search(new RegExp(`^={1,${level}}[^=]`, 'm'));
  return end === -1 ? rest : rest.slice(0, end);
}

const [page, flag, arg] = process.argv.slice(2);
if (!page) {
  console.error('usage: node scripts/wiki-drops.mjs "<Page name>" [--raw | --section <name>]');
  process.exit(1);
}
const text = await wikitext(page);
if (flag === '--raw') console.log(text);
else if (flag === '--section') console.log(section(text, arg) ?? `(no section "${arg}")`);
else console.log(JSON.stringify(parseDrops(text), null, 1));
