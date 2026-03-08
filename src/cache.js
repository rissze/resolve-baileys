import NodeCache from 'node-cache';

// lid → jid
export const lidCache = new NodeCache({ stdTTL: 21600, checkperiod: 600 });

// jid → lid
export const jidCache = new NodeCache({ stdTTL: 21600, checkperiod: 600 });

/**
 * Simpan mapping LID ↔ JID ke kedua cache sekaligus
 * @param {string} lid - format: xxx@lid
 * @param {string} jid - format: xxx@s.whatsapp.net
 */
export function storeMapping(lid, jid) {
  if (!lid || !jid) return;
  if (!lid.endsWith('@lid') || jid.endsWith('@lid')) return;
  lidCache.set(lid, jid);
  jidCache.set(jid, lid);
}
