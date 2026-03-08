import { lidCache, jidCache, storeMapping } from './cache.js';
import { decodeJid, toJid } from './utils.js';

/**
 * Resolve LID ke JID/PN
 * Urutan: cache → signalRepository → scan conn.chats participants
 *
 * @param {import('baileys').WASocket} conn
 * @param {string} sender - bisa berformat xxx@lid atau xxx@s.whatsapp.net
 * @returns {string} JID (xxx@s.whatsapp.net) atau sender as-is jika tidak ketemu
 */
export function getJid(conn, sender) {
  sender = decodeJid(sender);
  if (!sender) return sender;
  if (!sender.endsWith('@lid')) return sender;

  // 1. Cache hit
  const cached = lidCache.get(sender);
  if (cached) return cached;

  // 2. signalRepository (Baileys v7+)
  try {
    const pn = conn.signalRepository?.lidMapping?.getPNForLID?.(sender);
    if (pn) {
      const jid = toJid(pn);
      if (!jid.endsWith('@lid')) {
        storeMapping(sender, jid);
        return jid;
      }
    }
  } catch {}

  // 3. Scan conn.chats participants
  if (conn.chats) {
    for (const chat of Object.values(conn.chats)) {
      if (!chat?.metadata?.participants) continue;
      const user = chat.metadata.participants.find(
        (p) => decodeJid(p.lid) === sender || decodeJid(p.id) === sender
      );
      if (user) {
        const jid = decodeJid(user.phoneNumber || user.jid || user.id);
        if (jid && !jid.endsWith('@lid')) {
          storeMapping(sender, jid);
          return jid;
        }
      }
    }
  }

  return sender;
}

/**
 * Resolve JID/PN ke LID
 * Kebalikan dari getJid
 *
 * @param {import('baileys').WASocket} conn
 * @param {string} sender - bisa berformat xxx@s.whatsapp.net atau xxx@lid
 * @returns {string} LID (xxx@lid) atau sender as-is jika tidak ketemu
 */
export function getLid(conn, sender) {
  sender = decodeJid(sender);
  if (!sender) return sender;
  if (sender.endsWith('@lid')) return sender;

  // 1. Cache hit
  const cached = jidCache.get(sender);
  if (cached) return cached;

  // 2. signalRepository (Baileys v7+)
  try {
    const lid = conn.signalRepository?.lidMapping?.getLIDForPN?.(sender);
    if (lid?.endsWith('@lid')) {
      storeMapping(lid, sender);
      return lid;
    }
  } catch {}

  // 3. Scan conn.chats participants
  if (conn.chats) {
    for (const chat of Object.values(conn.chats)) {
      if (!chat?.metadata?.participants) continue;
      const user = chat.metadata.participants.find((p) => {
        const id = decodeJid(p.id);
        const pn = decodeJid(p.phoneNumber);
        const jid = decodeJid(p.jid);
        return id === sender || pn === sender || jid === sender;
      });
      if (user) {
        const lid = decodeJid(user.lid) || (user.id?.endsWith('@lid') ? decodeJid(user.id) : null);
        if (lid) {
          storeMapping(lid, sender);
          return lid;
        }
      }
    }
  }

  return sender;
}
