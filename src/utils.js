import { jidDecode } from 'baileys';

/**
 * Decode JID ke format standar, strip device suffix (xxx:device@server → xxx@server)
 * @param {string} jid
 * @returns {string|null}
 */
export function decodeJid(jid) {
  if (!jid || typeof jid !== 'string') return null;
  if (/:\d+@/gi.test(jid)) {
    const decoded = jidDecode(jid) || {};
    return (decoded.user && decoded.server && `${decoded.user}@${decoded.server}`) || jid;
  }
  return jid.trim();
}

/**
 * Normalisasi PN ke format JID jika belum ada @
 * @param {string} pn
 * @returns {string}
 */
export function toJid(pn) {
  if (!pn) return pn;
  return pn.includes('@') ? pn : `${pn}@s.whatsapp.net`;
}
