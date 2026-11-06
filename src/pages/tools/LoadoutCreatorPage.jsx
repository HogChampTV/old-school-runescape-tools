import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { ST, statOf, weaponStyleSet, PRAYERS, prayersConflict, SPELLBOOKS } from './loadout-combat.js';
import './LoadoutCreatorPage.css';

// Equipment slot order; also the order used in share links.
const EQUIP_SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];
const SLOT_LABEL = {
  head: 'Head', cape: 'Cape', neck: 'Neck', ammo: 'Ammo', weapon: 'Weapon', body: 'Body',
  shield: 'Shield', legs: 'Legs', hands: 'Hands', feet: 'Feet', ring: 'Ring',
};
const WEAPON = EQUIP_SLOTS.indexOf('weapon');
const SHIELD = EQUIP_SLOTS.indexOf('shield');
const CAPE = EQUIP_SLOTS.indexOf('cape');
const AMMO = EQUIP_SLOTS.indexOf('ammo');
const EXTRA_AMMO = EQUIP_SLOTS.length; // 12th gear position: the quiver's extra ammo slot
const GEAR_LEN = EQUIP_SLOTS.length + 1;
const TWO_HANDED = 11; // item slot code: occupies weapon, blocks shield
const INV_SIZE = 28;
const MAX_RESULTS = 48;
const MAX_POUCH = 4;

// Item interactions keyed off names, so they survive data refreshes.
const isQuiver = (name) => /dizana's (quiver|max cape)/i.test(name);
const isRunePouch = (name) => /^(divine )?rune pouch$/i.test(name);
const pouchCapacityOf = (name) => (/^divine/i.test(name) ? 4 : 3);
const isRune = (name) => / rune$/.test(name);

const dataUrl = (file) => `${import.meta.env.BASE_URL}loadout/${file}`;

// item = [id, name, slotCode, stats?]
const itemId = (it) => it[0];
const itemName = (it) => it[1];
const itemSlot = (it) => it[2];
const itemStats = (it) => it[3] ?? null;
const equipSlotFor = (it) => (itemSlot(it) === TWO_HANDED ? WEAPON : itemSlot(it));

function encodeLoadout(equip, inv, pouch, setup, items) {
  const enc = (arr) => arr.map((ix) => (ix == null ? '' : itemId(items[ix]).toString(36))).join('.');
  let out = `g=${enc(equip)}&i=${enc(inv)}`;
  if (pouch.length) out += `&p=${pouch.map((ix) => itemId(items[ix]).toString(36)).join('.')}`;
  if (setup.style) out += `&s=${setup.style}`;
  if (setup.prayers.length) out += `&y=${setup.prayers.join('.')}`;
  if (setup.book) out += `&b=${setup.book}`;
  if (setup.spell != null) out += `&c=${setup.spell}`;
  return out;
}

function decodeLoadout(hash, idToIndex) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const dec = (text, len) => {
    const out = Array(len).fill(null);
    if (!text) return out;
    text.split('.').slice(0, len).forEach((part, i) => {
      if (!part) return;
      const ix = idToIndex.get(parseInt(part, 36));
      if (ix !== undefined) out[i] = ix;
    });
    return out;
  };
  const int = (text) => {
    const n = parseInt(text ?? '', 10);
    return Number.isNaN(n) ? null : n;
  };
  const book = Math.min(Math.max(int(params.get('b')) ?? 0, 0), SPELLBOOKS.length - 1);
  const spell = int(params.get('c'));
  return {
    equip: dec(params.get('g'), GEAR_LEN),
    inv: dec(params.get('i'), INV_SIZE),
    pouch: dec(params.get('p'), MAX_POUCH).filter((ix) => ix != null),
    style: Math.max(int(params.get('s')) ?? 0, 0),
    prayers: [...new Set((params.get('y') ?? '').split('.').map((x) => parseInt(x, 10)))]
      .filter((n) => Number.isInteger(n) && n >= 0 && n < PRAYERS.length),
    book,
    spell: spell != null && spell >= 0 && spell < SPELLBOOKS[book].spells.length ? spell : null,
  };
}

function StatRow({ name, v, pct = false }) {
  const text = pct ? `${v >= 0 ? '+' : ''}${(v / 10).toFixed(1)}%` : `${v >= 0 ? '+' : ''}${v}`;
  return (
    <div className="loadout-stat">
      <span>{name}</span>
      <span className={`v ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}`}>{text}</span>
    </div>
  );
}

function ItemIcon({ data, index }) {
  const { tile, cols } = data;
  return (
    <span
      className="loadout-icon"
      style={{
        width: tile.w,
        height: tile.h,
        backgroundImage: `url(${dataUrl('icons.png')})`,
        backgroundPosition: `${-(index % cols) * tile.w}px ${-Math.floor(index / cols) * tile.h}px`,
      }}
    />
  );
}

function Slot({ data, itemIndex, label, className = '', targeted = false, onClick, onClear, onDragStart, onDrop, title, filledTitle, children }) {
  const item = itemIndex == null ? null : data.items[itemIndex];
  return (
    <div className={`loadout-slot-wrap ${className}`}>
      <button
        type="button"
        className={`loadout-slot ${item ? 'filled' : ''} ${targeted ? 'targeted' : ''}`}
        title={item ? (filledTitle || `${itemName(item)} — click to move, right-click to remove`) : title}
        onClick={onClick}
        onContextMenu={(e) => { e.preventDefault(); if (item) onClear(); }}
        draggable={!!item && !!onDragStart}
        onDragStart={onDragStart}
        onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
        onDrop={onDrop}
      >
        {item ? <ItemIcon data={data} index={itemIndex} /> : <span className="loadout-slot-label">{label}</span>}
      </button>
      {children}
    </div>
  );
}

const POPOVER_CHUNK = 60; // rows rendered at once; scrolling to the bottom loads more

/** Search dropdown rendered below a targeted slot. With nothing typed it lists everything that fits the slot. */
function SlotSearch({ data, equipSlot = null, onPick, onClose }) {
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(POPOVER_CHUNK);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setLimit(POPOVER_CHUNK); }, [q]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const fits = (it) => {
      if (equipSlot == null) return true;
      const s = itemSlot(it);
      return equipSlot === WEAPON ? s === WEAPON || s === TWO_HANDED : s === equipSlot;
    };
    const starts = [];
    const contains = [];
    for (let ix = 0; ix < data.items.length; ix++) {
      if (!fits(data.items[ix])) continue;
      if (!t) { starts.push(ix); continue; }
      const name = itemName(data.items[ix]).toLowerCase();
      const at = name.indexOf(t);
      if (at === 0) starts.push(ix);
      else if (at > 0) contains.push(ix);
    }
    return starts.concat(contains);
  }, [data, q, equipSlot]);

  const onScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 80) {
      setLimit((l) => (l < results.length ? l + 2 * POPOVER_CHUNK : l));
    }
  };

  return (
    <div
      className="loadout-slot-search"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'Enter' && results.length) onPick(results[0]);
      }}
    >
      <input
        ref={inputRef}
        type="search"
        placeholder="Type to filter..."
        value={q}
        autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
      />
      <ul onScroll={onScroll}>
        {results.length === 0 && <li className="empty">No matches.</li>}
        {results.slice(0, limit).map((ix) => (
          <li key={itemId(data.items[ix])}>
            <button type="button" onClick={() => onPick(ix)}>
              <ItemIcon data={data} index={ix} />
              <span className="n">{itemName(data.items[ix])}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="loadout-slot-count">{results.length.toLocaleString()} item{results.length === 1 ? '' : 's'}</div>
    </div>
  );
}

/** Grid of all runes, toggled in and out of an equipped rune pouch. */
function RunePicker({ data, runes, chosen, capacity, onToggle, onClose }) {
  return (
    <div className="loadout-slot-search loadout-rune-picker" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="loadout-rune-head">Pouch runes ({chosen.length}/{capacity})</div>
      <div className="loadout-rune-grid">
        {runes.map((ix) => (
          <button
            key={itemId(data.items[ix])}
            type="button"
            className={chosen.includes(ix) ? 'picked' : ''}
            title={itemName(data.items[ix])}
            onClick={() => onToggle(ix)}
          >
            <ItemIcon data={data} index={ix} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoadoutCreatorPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [equip, setEquip] = useState(() => Array(GEAR_LEN).fill(null));
  const [inv, setInv] = useState(() => Array(INV_SIZE).fill(null));
  const [pouch, setPouch] = useState([]); // item indexes of runes in an equipped rune pouch
  const [style, setStyle] = useState(0); // index into the weapon's style set
  const [prayers, setPrayers] = useState([]); // indexes into PRAYERS
  const [book, setBook] = useState(0); // index into SPELLBOOKS
  const [spellIx, setSpellIx] = useState(null); // index into SPELLBOOKS[book].spells
  const [query, setQuery] = useState('');
  // Slot being filled via its inline popover: { kind: 'equip', slot }, { kind: 'inv', at } or { kind: 'pouch', at }.
  const [target, setTarget] = useState(null);
  const dragFrom = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    fetch(dataUrl('items.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  const idToIndex = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.items.map((it, ix) => [itemId(it), ix]));
  }, [data]);

  // Restore a shared loadout from the URL once the data is in.
  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    if (window.location.hash.length > 1) {
      const { equip: e, inv: i, pouch: p, style: s, prayers: y, book: b, spell: c } = decodeLoadout(window.location.hash, idToIndex);
      setEquip(e);
      setInv(i);
      setPouch([...new Set(p)].filter((ix) => isRune(itemName(data.items[ix]))).slice(0, MAX_POUCH));
      const wStats = e[WEAPON] != null ? itemStats(data.items[e[WEAPON]]) : null;
      setStyle(s < weaponStyleSet(wStats).styles.length ? s : 0);
      setPrayers(y);
      setBook(b);
      setSpellIx(c);
    }
  }, [data, idToIndex]);

  // Keep the URL in sync so the address bar is always shareable.
  useEffect(() => {
    if (!data || !loaded.current) return;
    const empty = equip.every((s) => s == null) && inv.every((s) => s == null) && pouch.length === 0
      && style === 0 && prayers.length === 0 && book === 0 && spellIx == null;
    const setup = { style, prayers, book, spell: spellIx };
    const url = window.location.pathname + window.location.search + (empty ? '' : `#${encodeLoadout(equip, inv, pouch, setup, data.items)}`);
    window.history.replaceState(null, '', url);
  }, [data, equip, inv, pouch, style, prayers, book, spellIx]);

  const hasQuiver = !!data && equip[CAPE] != null && isQuiver(itemName(data.items[equip[CAPE]]));
  const pouchAt = useMemo(
    () => (data ? inv.findIndex((ix) => ix != null && isRunePouch(itemName(data.items[ix]))) : -1),
    [data, inv],
  );
  const pouchCapacity = pouchAt === -1 ? 0 : pouchCapacityOf(itemName(data.items[inv[pouchAt]]));
  const runeIndexes = useMemo(
    () => (data ? data.items.map((_, ix) => ix).filter((ix) => isRune(itemName(data.items[ix]))) : []),
    [data],
  );

  const weaponStats = data && equip[WEAPON] != null ? itemStats(data.items[equip[WEAPON]]) : null;
  const styleSet = useMemo(() => weaponStyleSet(weaponStats), [weaponStats]);
  const pickedStyle = styleSet.styles[style] ?? styleSet.styles[0];
  const speed = (weaponStats ? statOf(weaponStats, ST.SPEED) : 4) - (pickedStyle.cls === 'Rapid' ? 1 : 0);

  // Summed bonuses of everything worn (the quiver's spare ammo doesn't count,
  // like in game — only the ammo being fired does).
  const totals = useMemo(() => {
    const t = Array(15).fill(0);
    if (!data) return t;
    for (let s = 0; s < EQUIP_SLOTS.length; s++) {
      if (equip[s] == null) continue;
      const st = itemStats(data.items[equip[s]]);
      if (!st) continue;
      for (let k = 0; k < 15; k++) t[k] += st[k] ?? 0;
    }
    return t;
  }, [data, equip]);

  // Dependent state stays consistent: quiver ammo needs a quiver, pouch runes need a pouch with room.
  useEffect(() => {
    if (!data) return;
    if (!hasQuiver && equip[EXTRA_AMMO] != null) {
      const ammoIx = equip[EXTRA_AMMO];
      const at = inv.indexOf(null);
      setEquip((prev) => { const next = [...prev]; next[EXTRA_AMMO] = null; return next; });
      if (at !== -1) setInv((prev) => { const next = [...prev]; next[at] = ammoIx; return next; });
      else toast.error('Inventory full — the quiver ammo was removed');
    }
    if (pouch.length > pouchCapacity) setPouch((prev) => prev.slice(0, pouchCapacity));
    if (style >= styleSet.styles.length) setStyle(0);
  }, [data, hasQuiver, equip, inv, pouch, pouchCapacity, style, styleSet, toast]);

  const results = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const starts = [];
    const contains = [];
    for (let ix = 0; ix < data.items.length; ix++) {
      const name = itemName(data.items[ix]).toLowerCase();
      const at = name.indexOf(q);
      if (at === 0) starts.push(ix);
      else if (at > 0) contains.push(ix);
      if (starts.length >= MAX_RESULTS) break;
    }
    return starts.concat(contains).slice(0, MAX_RESULTS);
  }, [data, query]);

  const addToInventory = useCallback((itemIndex) => {
    const at = inv.indexOf(null);
    if (at === -1) return false;
    const next = [...inv];
    next[at] = itemIndex;
    setInv(next);
    return true;
  }, [inv]);

  /** Equip an item; anything displaced goes to `homeSlot` in the inventory (or the first free spot). */
  const equipItem = useCallback((itemIndex, homeSlot = null) => {
    const item = data.items[itemIndex];
    const slot = equipSlotFor(item);
    const twoHanded = itemSlot(item) === TWO_HANDED;

    const displaced = [];
    const nextEquip = [...equip];
    if (nextEquip[slot] != null) displaced.push(nextEquip[slot]);
    nextEquip[slot] = itemIndex;
    if (twoHanded && nextEquip[SHIELD] != null) { displaced.push(nextEquip[SHIELD]); nextEquip[SHIELD] = null; }
    if (slot === SHIELD && nextEquip[WEAPON] != null && itemSlot(data.items[nextEquip[WEAPON]]) === TWO_HANDED) {
      displaced.push(nextEquip[WEAPON]);
      nextEquip[WEAPON] = null;
    }

    const nextInv = [...inv];
    if (homeSlot != null) nextInv[homeSlot] = null;
    let dropped = 0;
    for (const d of displaced) {
      const at = homeSlot != null && nextInv[homeSlot] == null ? homeSlot : nextInv.indexOf(null);
      if (at === -1) dropped++;
      else nextInv[at] = d;
    }
    setEquip(nextEquip);
    setInv(nextInv);
    if (dropped) toast.error('Inventory full — displaced gear was removed');
  }, [data, equip, inv, toast]);

  /** Click an empty slot to open its search popover; click it again to close. */
  const toggleTarget = (t) => {
    setTarget((prev) => (prev && prev.kind === t.kind && prev.slot === t.slot && prev.at === t.at ? null : t));
  };

  // Close the popover when clicking anywhere that isn't a slot or the popover itself.
  useEffect(() => {
    if (!target) return undefined;
    const onDown = (e) => {
      if (e.target.closest?.('.loadout-slot-search') || e.target.closest?.('.loadout-slot')) return;
      setTarget(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [target]);

  /** Place a popover pick into the targeted slot. */
  const fillTarget = (itemIndex) => {
    if (!target) return;
    if (target.kind === 'inv') {
      const at = inv[target.at] == null ? target.at : inv.indexOf(null);
      if (at === -1) { toast.error('Inventory is full'); return; }
      const next = [...inv];
      next[at] = itemIndex;
      setInv(next);
    } else if (target.slot === EXTRA_AMMO) {
      setEquip((prev) => { const next = [...prev]; next[EXTRA_AMMO] = itemIndex; return next; });
    } else {
      equipItem(itemIndex); // popover results are filtered to this slot already
    }
    setTarget(null);
  };

  /** Toggle a prayer; turning one on turns off anything it conflicts with, like in game. */
  const togglePrayer = (i) => {
    setPrayers((prev) => (prev.includes(i)
      ? prev.filter((x) => x !== i)
      : [...prev.filter((x) => !prayersConflict(x, i)), i]));
  };

  const pickBook = (b) => {
    setBook(b);
    setSpellIx(null);
  };

  const togglePouchRune = (ix) => {
    if (pouch.includes(ix)) setPouch(pouch.filter((x) => x !== ix));
    else if (pouch.length >= pouchCapacity) toast.error(`This pouch holds ${pouchCapacity} rune types`);
    else setPouch([...pouch, ix]);
  };

  const onResultClick = (itemIndex, e) => {
    const item = data.items[itemIndex];
    if (itemSlot(item) >= 0 && !e.shiftKey) equipItem(itemIndex);
    else if (!addToInventory(itemIndex)) toast.error('Inventory is full');
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'Enter' && results.length) onResultClick(results[0], e);
  };

  const onInvClick = (at) => {
    const itemIndex = inv[at];
    if (itemIndex == null) { toggleTarget({ kind: 'inv', at }); return; }
    if (isRunePouch(itemName(data.items[itemIndex]))) { toggleTarget({ kind: 'pouch', at }); return; }
    if (itemSlot(data.items[itemIndex]) < 0) return;
    equipItem(itemIndex, at);
  };

  const onEquipClick = (slot) => {
    const itemIndex = equip[slot];
    if (itemIndex == null) { toggleTarget({ kind: 'equip', slot }); return; }
    if (!addToInventory(itemIndex)) { toast.error('Inventory is full'); return; }
    setEquip((prev) => { const next = [...prev]; next[slot] = null; return next; });
  };

  const clearInvSlot = (at) => setInv((prev) => { const next = [...prev]; next[at] = null; return next; });
  const clearEquipSlot = (slot) => setEquip((prev) => { const next = [...prev]; next[slot] = null; return next; });

  const onInvDrop = (to) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from == null || from === to) return;
    setInv((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const copyLink = () => {
    const url = window.location.href;
    const ok = () => toast.success('Loadout link copied');
    const fail = () => toast.error('Clipboard blocked — copy the address bar URL instead');
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(ok).catch(fail);
      else fail();
    } catch { fail(); }
  };

  if (loadError) {
    return (
      <div className="page-content">
        <div className="loadout">
          <h2>Loadout Creator</h2>
          <p className="loadout-error">
            Item data hasn't been generated for this deployment. Run <code>npm run fetch:loadout-data</code> and redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="loadout">
        <header className="loadout-head">
          <h2>Loadout Creator</h2>
          <p>
            Plan gear and inventory setups. Click an empty slot and type to fill it, or search for an item to
            equip it (shift-click sends gear to the inventory instead). Click inventory items to equip them,
            right-click to remove, drag to rearrange. Equipment bonuses total up as you gear, and you can pick
            an attack style, prayers and a spell. The URL always holds the whole setup — copy it to share.
          </p>
        </header>

        <div className="loadout-panels">
          <section className="loadout-panel" aria-label="Equipment">
            <h3>Equipment</h3>
            <div className="loadout-gear">
              {EQUIP_SLOTS.map((name, slot) => (
                <Slot
                  key={name}
                  data={data || { items: [] }}
                  itemIndex={equip[slot]}
                  label={SLOT_LABEL[name]}
                  className={`gear-${name}`}
                  targeted={target?.kind === 'equip' && target.slot === slot}
                  title={`${SLOT_LABEL[name]} slot — click to search`}
                  onClick={() => onEquipClick(slot)}
                  onClear={() => clearEquipSlot(slot)}
                >
                  {target?.kind === 'equip' && target.slot === slot && data && (
                    <SlotSearch data={data} equipSlot={slot} onPick={fillTarget} onClose={() => setTarget(null)} />
                  )}
                </Slot>
              ))}
              {hasQuiver && (
                <Slot
                  data={data}
                  itemIndex={equip[EXTRA_AMMO]}
                  label="Ammo"
                  className="gear-ammo2"
                  targeted={target?.kind === 'equip' && target.slot === EXTRA_AMMO}
                  title="Quiver ammo slot — click to search"
                  onClick={() => onEquipClick(EXTRA_AMMO)}
                  onClear={() => clearEquipSlot(EXTRA_AMMO)}
                >
                  {target?.kind === 'equip' && target.slot === EXTRA_AMMO && (
                    <SlotSearch data={data} equipSlot={AMMO} onPick={fillTarget} onClose={() => setTarget(null)} />
                  )}
                </Slot>
              )}
            </div>
            <button type="button" className="loadout-btn" onClick={() => setEquip(Array(GEAR_LEN).fill(null))}>
              Clear equipment
            </button>
          </section>

          <section className="loadout-panel loadout-stats" aria-label="Equipment bonuses">
            <h3>Bonuses</h3>
            <div className="loadout-stats-cols">
              <div>
                <h4>Attack</h4>
                {['Stab', 'Slash', 'Crush', 'Magic', 'Range'].map((n, i) => (
                  <StatRow key={n} name={n} v={totals[ST.A_STAB + i]} />
                ))}
              </div>
              <div>
                <h4>Defence</h4>
                {['Stab', 'Slash', 'Crush', 'Magic', 'Range'].map((n, i) => (
                  <StatRow key={n} name={n} v={totals[ST.D_STAB + i]} />
                ))}
              </div>
            </div>
            <div className="loadout-stats-other">
              <h4>Other</h4>
              <StatRow name="Melee strength" v={totals[ST.STR]} />
              <StatRow name="Ranged strength" v={totals[ST.RSTR]} />
              <StatRow name="Magic damage" v={totals[ST.MDMG]} pct />
              <StatRow name="Prayer" v={totals[ST.PRAYER]} />
            </div>
          </section>

          <section className="loadout-panel" aria-label="Inventory">
            <h3>Inventory</h3>
            <div className="loadout-inv">
              {inv.map((itemIndex, at) => (
                <Slot
                  key={at}
                  data={data || { items: [] }}
                  itemIndex={itemIndex}
                  label=""
                  targeted={(target?.kind === 'inv' || target?.kind === 'pouch') && target.at === at}
                  title="Empty inventory slot — click to search"
                  filledTitle={at === pouchAt
                    ? `${itemName(data.items[itemIndex])} — click to choose runes, right-click to remove`
                    : undefined}
                  onClick={() => onInvClick(at)}
                  onClear={() => clearInvSlot(at)}
                  onDragStart={() => { dragFrom.current = at; }}
                  onDrop={() => onInvDrop(at)}
                >
                  {at === pouchAt && pouch.length > 0 && (
                    <div className="loadout-pouch-overlay">
                      {pouch.map((ix) => (
                        <span className="loadout-mini-icon" key={ix}><ItemIcon data={data} index={ix} /></span>
                      ))}
                    </div>
                  )}
                  {target?.kind === 'inv' && target.at === at && data && (
                    <SlotSearch data={data} onPick={fillTarget} onClose={() => setTarget(null)} />
                  )}
                  {target?.kind === 'pouch' && target.at === at && data && (
                    <RunePicker
                      data={data}
                      runes={runeIndexes}
                      chosen={pouch}
                      capacity={pouchCapacity}
                      onToggle={togglePouchRune}
                      onClose={() => setTarget(null)}
                    />
                  )}
                </Slot>
              ))}
            </div>
            <div className="loadout-inv-foot">
              <span>{inv.filter((s) => s != null).length}/{INV_SIZE}</span>
              <button type="button" className="loadout-btn" onClick={() => setInv(Array(INV_SIZE).fill(null))}>
                Clear inventory
              </button>
            </div>
          </section>

          <section className="loadout-panel loadout-search" aria-label="Item search">
            <h3>Items</h3>
            <input
              type="search"
              placeholder={data ? `Search ${data.items.length.toLocaleString()} items...` : 'Loading items...'}
              value={query}
              autoComplete="off"
              disabled={!data}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <ul className="loadout-results">
              {query.trim().length >= 2 && results.length === 0 && <li className="empty">No items match.</li>}
              {query.trim().length < 2 && <li className="empty">Type at least two letters.</li>}
              {results.map((ix) => {
                const item = data.items[ix];
                const slot = itemSlot(item);
                return (
                  <li key={itemId(item)}>
                    <button type="button" onClick={(e) => onResultClick(ix, e)} title={slot >= 0 ? 'Click to equip, shift-click for inventory' : 'Click to add to inventory'}>
                      <ItemIcon data={data} index={ix} />
                      <span className="n">{itemName(item)}</span>
                      {slot >= 0 && <span className="s">{slot === TWO_HANDED ? '2h' : SLOT_LABEL[EQUIP_SLOTS[slot]]}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="loadout-panels">
          <section className="loadout-panel loadout-style" aria-label="Attack style">
            <h3>Attack style</h3>
            <div className="loadout-style-weapon">
              {data && equip[WEAPON] != null ? itemName(data.items[equip[WEAPON]]) : 'Unarmed'}
              {' · '}{styleSet.label} · Speed {speed} ({(speed * 0.6).toFixed(1)}s)
            </div>
            <div className="loadout-style-grid">
              {styleSet.styles.map((st, i) => (
                <button
                  key={st.name}
                  type="button"
                  className={i === style ? 'picked' : ''}
                  onClick={() => setStyle(i)}
                >
                  <span className="n">{st.name}</span>
                  <span className="d">{st.type === 'None' ? st.cls : `${st.type} · ${st.cls}`}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="loadout-panel loadout-spells" aria-label="Spellbook">
            <h3>Spellbook</h3>
            <div className="loadout-book-tabs">
              {SPELLBOOKS.map((bk, i) => (
                <button key={bk.name} type="button" className={i === book ? 'picked' : ''} onClick={() => pickBook(i)}>
                  {bk.name}
                </button>
              ))}
            </div>
            {SPELLBOOKS[book].spells.length === 0 ? (
              <p className="loadout-note">The Lunar book has no combat spells.</p>
            ) : (
              <ul className="loadout-spell-list">
                {SPELLBOOKS[book].spells.map((sp, i) => (
                  <li key={sp.name}>
                    <button
                      type="button"
                      className={i === spellIx ? 'picked' : ''}
                      title={`Level ${sp.level} Magic`}
                      onClick={() => setSpellIx(i === spellIx ? null : i)}
                    >
                      <span className="n">{sp.name}</span>
                      <span className="lv">{sp.level}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="loadout-panel loadout-prayers" aria-label="Prayers">
            <h3>Prayers</h3>
            <div className="loadout-prayer-grid">
              {PRAYERS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  className={prayers.includes(i) ? 'picked' : ''}
                  title={`Level ${p.level} — ${p.effect}`}
                  onClick={() => togglePrayer(i)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="loadout-actions">
          <button type="button" className="loadout-btn primary" onClick={copyLink}>Copy share link</button>
        </div>

        <p className="loadout-credit">
          Item data decoded from the Old School RuneScape game cache, icons via{' '}
          <a href="https://runelite.net/" target="_blank" rel="noopener noreferrer">RuneLite</a>
          {data ? ` — last updated ${data.updated}.` : '.'}
        </p>
      </div>
    </div>
  );
}
