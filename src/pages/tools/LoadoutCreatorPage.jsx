import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import './LoadoutCreatorPage.css';

// Equipment slot order; also the order used in share links.
const EQUIP_SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];
const SLOT_LABEL = {
  head: 'Head', cape: 'Cape', neck: 'Neck', ammo: 'Ammo', weapon: 'Weapon', body: 'Body',
  shield: 'Shield', legs: 'Legs', hands: 'Hands', feet: 'Feet', ring: 'Ring',
};
const WEAPON = EQUIP_SLOTS.indexOf('weapon');
const SHIELD = EQUIP_SLOTS.indexOf('shield');
const TWO_HANDED = 11; // item slot code: occupies weapon, blocks shield
const INV_SIZE = 28;
const MAX_RESULTS = 48;

const dataUrl = (file) => `${import.meta.env.BASE_URL}loadout/${file}`;

// item = [id, name, slotCode]
const itemId = (it) => it[0];
const itemName = (it) => it[1];
const itemSlot = (it) => it[2];
const equipSlotFor = (it) => (itemSlot(it) === TWO_HANDED ? WEAPON : itemSlot(it));

function encodeLoadout(equip, inv, items) {
  const enc = (arr) => arr.map((ix) => (ix == null ? '' : itemId(items[ix]).toString(36))).join('.');
  return `g=${enc(equip)}&i=${enc(inv)}`;
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
  return { equip: dec(params.get('g'), EQUIP_SLOTS.length), inv: dec(params.get('i'), INV_SIZE) };
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

function Slot({ data, itemIndex, label, className = '', onClick, onClear, onDragStart, onDrop, title }) {
  const item = itemIndex == null ? null : data.items[itemIndex];
  return (
    <button
      type="button"
      className={`loadout-slot ${className} ${item ? 'filled' : ''}`}
      title={item ? `${itemName(item)} — click to move, right-click to remove` : title}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); if (item) onClear(); }}
      draggable={!!item && !!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop}
    >
      {item ? <ItemIcon data={data} index={itemIndex} /> : <span className="loadout-slot-label">{label}</span>}
    </button>
  );
}

export default function LoadoutCreatorPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [equip, setEquip] = useState(() => Array(EQUIP_SLOTS.length).fill(null));
  const [inv, setInv] = useState(() => Array(INV_SIZE).fill(null));
  const [query, setQuery] = useState('');
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
      const { equip: e, inv: i } = decodeLoadout(window.location.hash, idToIndex);
      setEquip(e);
      setInv(i);
    }
  }, [data, idToIndex]);

  // Keep the URL in sync so the address bar is always shareable.
  useEffect(() => {
    if (!data || !loaded.current) return;
    const empty = equip.every((s) => s == null) && inv.every((s) => s == null);
    const url = window.location.pathname + window.location.search + (empty ? '' : `#${encodeLoadout(equip, inv, data.items)}`);
    window.history.replaceState(null, '', url);
  }, [data, equip, inv]);

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

  const onResultClick = (itemIndex, e) => {
    const item = data.items[itemIndex];
    if (itemSlot(item) >= 0 && !e.shiftKey) equipItem(itemIndex);
    else if (!addToInventory(itemIndex)) toast.error('Inventory is full');
  };

  const onInvClick = (at) => {
    const itemIndex = inv[at];
    if (itemIndex == null || itemSlot(data.items[itemIndex]) < 0) return;
    equipItem(itemIndex, at);
  };

  const onEquipClick = (slot) => {
    const itemIndex = equip[slot];
    if (itemIndex == null) return;
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
            Plan gear and inventory setups. Search for an item to equip it (shift-click sends gear to the
            inventory instead), click inventory items to equip them, right-click to remove, drag to rearrange.
            The URL always holds your current loadout — copy it to share.
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
                  title={`${SLOT_LABEL[name]} slot`}
                  onClick={() => onEquipClick(slot)}
                  onClear={() => clearEquipSlot(slot)}
                />
              ))}
            </div>
            <button type="button" className="loadout-btn" onClick={() => setEquip(Array(EQUIP_SLOTS.length).fill(null))}>
              Clear equipment
            </button>
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
                  title="Empty inventory slot"
                  onClick={() => onInvClick(at)}
                  onClear={() => clearInvSlot(at)}
                  onDragStart={() => { dragFrom.current = at; }}
                  onDrop={() => onInvDrop(at)}
                />
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

        <div className="loadout-actions">
          <button type="button" className="loadout-btn primary" onClick={copyLink}>Copy share link</button>
        </div>

        <p className="loadout-credit">
          Item data decoded from the OSRS game cache, icons via{' '}
          <a href="https://runelite.net/" target="_blank" rel="noopener noreferrer">RuneLite</a>,
          bundled with this site{data ? ` (last updated ${data.updated})` : ''} — nothing is fetched from anywhere else when you use this page.
        </p>
      </div>
    </div>
  );
}
