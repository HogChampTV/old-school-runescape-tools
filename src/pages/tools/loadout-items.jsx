/**
 * Shared access to the Loadout Creator's item data (public/loadout/items.json
 * + icons.png spritesheet), so other tools — like the raid loot simulator —
 * can render any item by name without their own data pipeline.
 */
import { useState, useEffect, useMemo } from 'react';

export const dataUrl = (file) => `${import.meta.env.BASE_URL}loadout/${file}`;

// item = [id, name, slotCode, stats?]
export const itemId = (it) => it[0];
export const itemName = (it) => it[1];
export const itemSlot = (it) => it[2];
export const itemStats = (it) => it[3] ?? null;

let itemDataPromise = null;
export function fetchItemData() {
  itemDataPromise ??= fetch(dataUrl('items.json')).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
  return itemDataPromise;
}

/** Loads the item data once per session; returns { data, error }. */
export function useItemData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let on = true;
    fetchItemData().then((d) => on && setData(d)).catch(() => on && setError(true));
    return () => { on = false; };
  }, []);
  return { data, error };
}

/** Map of lowercased item name -> item index, for name-keyed lookups. */
export function useNameIndex(data) {
  return useMemo(() => {
    if (!data) return new Map();
    const m = new Map();
    data.items.forEach((it, ix) => {
      const key = itemName(it).toLowerCase();
      if (!m.has(key)) m.set(key, ix);
    });
    return m;
  }, [data]);
}

let uiDataPromise = null;
export function fetchUiData() {
  uiDataPromise ??= fetch(dataUrl('ui.json')).then((r) => (r.ok ? r.json() : null));
  return uiDataPromise;
}

/** Prayer/spell/invocation icon sheet metadata; null while loading or if absent. */
export function useUiData() {
  const [ui, setUi] = useState(null);
  useEffect(() => {
    let on = true;
    fetchUiData().then((d) => on && setUi(d)).catch(() => {});
    return () => { on = false; };
  }, []);
  return ui;
}

/** One tile of the ui-icons.png sheet (same layout trick as ItemIcon). */
export function UiIcon({ ui, index }) {
  const { tile, cols } = ui;
  return (
    <span
      className="loadout-icon"
      style={{
        width: tile.w,
        height: tile.h,
        backgroundImage: `url(${dataUrl('ui-icons.png')})`,
        backgroundPosition: `${-(index % cols) * tile.w}px ${-Math.floor(index / cols) * tile.h}px`,
      }}
    />
  );
}

/** One tile of the item spritesheet. Sized by the sheet's tile dimensions. */
export function ItemIcon({ data, index }) {
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
