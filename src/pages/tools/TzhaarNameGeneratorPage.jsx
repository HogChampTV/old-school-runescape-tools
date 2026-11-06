import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import './TzhaarNameGeneratorPage.css';

// ----- Real TzHaar material (from the Volcanic creatures roster) -----
const PREFIX = ['Tz', 'Jal', 'Yt', 'Tok', 'Ket', 'TzTok', 'JalTok', 'TzRek', 'JalRek', 'TzKal', 'TzHaar', 'Jad', 'Zuk'];
const SYL = ['Kih', 'Kek', 'Xil', 'Mej', 'Kot', 'Zek', 'Jad', 'Hur', 'Nib', 'Rah', 'Ak', 'Im', 'Jak', 'Rek', 'Ket', 'Tok', 'Zuk', 'Kal', 'Keh', 'Haar', 'Yt', 'Jal', 'Nar', 'Kor', 'Mol', 'Vek', 'Zil', 'Ruk', 'Tol', 'Ozh', 'Ukh', 'Dur', 'Gok'];

// ----- Contaminated material -----
const VERB = ['Suk', 'Lik', 'Eet', 'Tug', 'Jurk', 'Smel', 'Kis', 'Rub', 'Hug', 'Spank', 'Slap', 'Snif', 'Munch', 'Grab', 'Bonk', 'Fap', 'Honk'];
const OBJ = ['Nob', 'Cok', 'Bum', 'Arse', 'Butt', 'Balz', 'Nutz', 'Dong', 'Wang', 'Tit', 'Boob', 'Fart', 'Poo', 'Pee', 'Wee', 'Krotch', 'Weener', 'Pecker', 'Toosh', 'Krack', 'Peen', 'Schlong', 'Wiener', 'Buttz', 'Turd', 'Bussy', 'Cheeks'];
const PRON = ['Me', 'Mi', 'Ma', 'My', 'Ur', 'Yo', 'Dat', 'Dis', 'Dem', 'Mah'];
const TARGET = ['Mum', 'Mom', 'Dad', 'Nan', 'Gran', 'Dog', 'Self', 'Bro', 'Sis', 'Boss'];
const ADJ = ['Big', 'Fat', 'Wet', 'Stinky', 'Hairy', 'Smol', 'Sweaty', 'Saggy', 'Moist', 'Crusty', 'Thicc', 'Dusty', 'Soggy', 'Loose'];
const HUNTERS = ['TzHaar-Xil', 'TzHaar-Ket', 'TzHaar-Hur', 'TzHaar-Mej', 'TzKal-Zuk', 'a JalYt with a blowpipe'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

const PHRASES = [
  () => [pick(VERB), pick(PRON), pick(OBJ)],
  () => [pick(PRON), pick(OBJ)],
  () => [pick(ADJ), pick(OBJ)],
  () => [pick(VERB), pick(PRON), pick(TARGET)],
  () => [pick(OBJ), pick(OBJ)],
  () => [pick(VERB), pick(OBJ)],
  () => [pick(VERB), pick(PRON), pick(ADJ), pick(OBJ)],
  () => [pick(PRON), pick(TARGET), pick(OBJ)],
  () => [pick(ADJ), pick(PRON), pick(OBJ)],
  () => [pick(OBJ), pick(VERB)],
];

function loreChunks() {
  // Mirror real shapes: P-S, P-SS, P-SS-S, PS-S, P-S-Jad
  const r = Math.random();
  const p = pick(PREFIX);
  if (r < 0.28) return [p, pick(SYL)];
  if (r < 0.55) return [p, pick(SYL) + pick(SYL)];
  if (r < 0.75) return [p, pick(SYL) + pick(SYL), pick(SYL)];
  if (r < 0.88) return [p + pick(SYL), pick(SYL)];
  return [p, pick(SYL), 'Jad'];
}

function crudeChunks() {
  const words = pick(PHRASES)();
  const p = pick(PREFIX);
  if (chance(0.18)) return [p + words[0], ...words.slice(1)];
  if (chance(0.2)) return [p, ...words, pick(SYL)];
  return [p, ...words];
}

function splicedChunks() {
  const c = loreChunks();
  const i = 1 + Math.floor(Math.random() * (c.length - 1));
  const swap = chance(0.7) ? pick(OBJ) : pick(VERB);
  if (chance(0.4) && c[i].length > 3) c[i] = swap + c[i].slice(-3);
  else c[i] = swap;
  return c;
}

function baseForms(raw) {
  const clean = raw.replace(/[^a-z]/gi, '');
  if (!clean) return [];
  const cap = clean[0].toUpperCase() + clean.slice(1).toLowerCase();
  const forms = [cap, cap];
  if (cap.length > 3) forms.push(cap.slice(0, 3));
  if (cap.length > 4) forms.push(cap.slice(0, 1) + cap.slice(-2));
  return forms;
}

function graft(chunks, raw) {
  const forms = baseForms(raw);
  if (!forms.length) return chunks;
  const b = pick(forms);
  const r = Math.random();
  if (r < 0.3) chunks[0] = b;
  else if (r < 0.5) chunks[0] = chunks[0] + b;
  else if (r < 0.65) chunks.push(b);
  else if (r < 0.8) chunks.splice(1, 0, b);
  else { const i = 1 + Math.floor(Math.random() * (chunks.length - 1)); chunks[i] = b + chunks[i]; }
  return chunks;
}

// OSRS display names: 12 characters max (letters, digits, spaces, hyphens).
const OSRS_MAX = 12;

function rollChunks(crude, base) {
  let chunks;
  const r = Math.random();
  if (r < crude * 0.78) chunks = crudeChunks();
  else if (r < crude * 0.78 + crude * 0.5) chunks = splicedChunks();
  else chunks = loreChunks();
  return graft(chunks, base || '');
}

// Hyphenated if it fits, otherwise the CamelCase join the real roster also
// uses (JalTok-Jad, Yt-MejKot), otherwise null.
function fitName(chunks) {
  const hyphen = chunks.join('-');
  if (hyphen.length <= OSRS_MAX) return hyphen;
  const joined = chunks.join('');
  if (joined.length <= OSRS_MAX) return joined;
  return null;
}

let last = '';
function generate(crude, base, fit) {
  for (let i = 0; i < 80; i++) {
    const chunks = rollChunks(crude, base);
    const name = fit ? fitName(chunks) : chunks.join('-');
    if (!name || name === last) continue;
    last = name;
    return name;
  }
  // Nothing fit (long base name, mostly): shed chunks from the end until it does.
  const chunks = rollChunks(crude, base);
  while (chunks.length > 1 && !fitName(chunks)) chunks.pop();
  const name = fitName(chunks) || chunks.join('').slice(0, OSRS_MAX);
  last = name;
  return name;
}

function stats(name) {
  // Longer, dumber names hit harder. Tz-Kih is 22, JalTok-Jad is 900.
  const base = 20 + name.replace(/-/g, '').length * 23;
  const lvl = Math.min(900, Math.round(base + Math.random() * 180));
  const inferno = lvl > 300 || chance(0.35);
  return {
    lvl,
    where: inferno ? 'Inferno' : 'Fight Caves',
    wave: inferno ? 1 + Math.floor(Math.random() * 69) : 1 + Math.floor(Math.random() * 63),
    hunter: pick(HUNTERS),
  };
}

const LABELS = [[0, 'Lore accurate'], [15, 'Faintly off'], [35, 'Something slipped in'], [60, 'Suspicious'], [80, 'Full gutter'], [96, 'Banned from Mor Ul Rek']];
const labelFor = (v) => LABELS.reduce((out, [t, l]) => (v >= t ? l : out), LABELS[0][1]);

const readStore = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
const writeStore = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function makeEgg(crude, base, fit) {
  const name = generate(crude, base, fit);
  return { name, ...stats(name) };
}

export default function TzhaarNameGeneratorPage() {
  const toast = useToast();
  const [crude, setCrude] = useState(() => Number(readStore('hatchery-crude', 85)));
  const [base, setBase] = useState(() => readStore('hatchery-base', ''));
  const [fit, setFit] = useState(() => readStore('hatchery-fit', '1') === '1');
  const [egg, setEgg] = useState(() => makeEgg(0.85, '', true));
  const [brood, setBrood] = useState([]);

  const hatch = useCallback(() => setEgg(makeEgg(crude / 100, base.trim(), fit)), [crude, base, fit]);
  const spawn = (n) => setBrood(Array.from({ length: n }, () => makeEgg(crude / 100, base.trim(), fit)));

  useEffect(() => { writeStore('hatchery-crude', String(crude)); }, [crude]);
  useEffect(() => { writeStore('hatchery-base', base); }, [base]);
  useEffect(() => { writeStore('hatchery-fit', fit ? '1' : '0'); }, [fit]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && !['INPUT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName)) { e.preventDefault(); hatch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hatch]);

  const copy = (text) => {
    const ok = () => toast.success(`Copied ${text}`);
    const fail = () => toast.error('Clipboard blocked; select the name and copy it manually');
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok).catch(fail);
      else fail();
    } catch { fail(); }
  };

  return (
    <div className="page-content">
      <div className="hatchery">
        <header className="hatchery-head">
          <h2>TzHaar Name Generator</h2>
          <p>Hatches volcanic creature names from the same syllables as Tz-Kih, Yt-MejKot and JalTok-Jad. Press Space to hatch another.</p>
        </header>
      <section className="hatchery-stage" aria-live="polite">
        <div className="hatchery-name">{egg.name}</div>
        <div className="hatchery-stats">
          <span className={egg.name.length > OSRS_MAX ? 'over' : ''}>
            <b>{egg.name.length}</b>/{OSRS_MAX} chars{egg.name.length > OSRS_MAX ? ', too long for Old School RuneScape' : ''}
          </span>
          <span>Combat level <b>{egg.lvl}</b></span>
          <span>{egg.where}, wave <b>{egg.wave}</b></span>
          <span>Hunted by <b>{egg.hunter}</b></span>
        </div>
        <div className="hatchery-actions">
          <button type="button" className="hatchery-btn primary" onClick={hatch}>Hatch another</button>
          <button type="button" className="hatchery-btn" onClick={() => copy(egg.name)}>Copy name</button>
        </div>
      </section>

      <section className="hatchery-controls">
        <div className="hatchery-control">
          <label htmlFor="hatchery-crude">Egg contamination <span>{labelFor(crude)}</span></label>
          <input id="hatchery-crude" type="range" min="0" max="100" value={crude} onChange={(e) => setCrude(Number(e.target.value))} />
          <div className="hatchery-ends"><span>Lore accurate</span><span>Fight Cave graffiti</span></div>
        </div>
        <div className="hatchery-control">
          <label htmlFor="hatchery-base">Base name <span>Optional. Gets grafted into every egg.</span></label>
          <input
            id="hatchery-base"
            type="text"
            placeholder="e.g. Jake, Dave, Gary"
            autoComplete="off"
            maxLength={24}
            value={base}
            onChange={(e) => setBase(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); hatch(); } }}
          />
        </div>
        <label className="hatchery-check" htmlFor="hatchery-fit">
          <input id="hatchery-fit" type="checkbox" checked={fit} onChange={(e) => setFit(e.target.checked)} />
          <span>Fit the Old School RuneScape display-name limit ({OSRS_MAX} characters). Off = longer, dumber, unusable.</span>
        </label>
        <div className="hatchery-actions start">
          <button type="button" className="hatchery-btn" onClick={() => spawn(10)}>Spawn a wave of 10</button>
          <button type="button" className="hatchery-btn" onClick={() => spawn(63)}>Spawn all 63 waves</button>
        </div>
      </section>

      <section className="hatchery-brood">
        <h2>The brood</h2>
        <p>Click any one to copy it.</p>
        <ul>
          {brood.length === 0 && <li className="empty">Nothing hatched yet.</li>}
          {brood.map((b, i) => (
            <li key={`${b.name}-${i}`} onClick={() => copy(b.name)} title={`Copy ${b.name}`}>
              <span className="n">{b.name}</span>
              <span className="lvl">{b.name.length} chars · lvl {b.lvl}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="hatchery-credit">
        Syllables lifted from the real roster (Tz-Kih, Yt-MejKot, Jal-AkRek-Ket, JalTok-Jad) on the{' '}
        <a href="https://oldschool.runescape.wiki/w/Volcanic_creatures" target="_blank" rel="noopener noreferrer">Old School RuneScape Wiki</a>. Everything else is your fault.
      </p>
      </div>
    </div>
  );
}

