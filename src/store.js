import { storeMapping } from './cache.js';
import { decodeJid } from './utils.js';

/**
 * Bind contact store ke conn.
 * Mengisi conn.chats dari berbagai event Baileys dan
 * sekaligus auto-populate LID ↔ JID cache.
 *
 * @param {import('baileys').WASocket} conn
 */
export function bindStore(conn) {
  if (!conn.chats) conn.chats = {};

  // ─── helpers ────────────────────────────────────────────────────────────────

  function upsertContact(contacts) {
    if (!contacts) return;
    contacts = contacts.contacts || contacts;
    if (!Array.isArray(contacts)) return;

    for (const contact of contacts) {
      const id = decodeJid(contact.id);
      if (!id || id === 'status@broadcast') continue;

      if (!conn.chats[id]) conn.chats[id] = { id };

      const isGroup = id.endsWith('@g.us');
      conn.chats[id] = {
        ...conn.chats[id],
        ...contact,
        id,
        ...(isGroup
          ? { subject: contact.subject || contact.name || conn.chats[id].subject || '' }
          : { name: contact.notify || contact.name || conn.chats[id].name || conn.chats[id].notify || '' }),
      };

      // Jika ada field lid di contact, populate cache sekalian
      if (contact.lid && !id.endsWith('@lid')) storeMapping(decodeJid(contact.lid), id);
      if (id.endsWith('@lid') && contact.phoneNumber) storeMapping(id, decodeJid(contact.phoneNumber));
    }
  }

  function extractMappingFromParticipants(participants = []) {
    for (const p of participants) {
      const id = decodeJid(p.id);
      const lid = decodeJid(p.lid);
      const pn = decodeJid(p.phoneNumber);

      if (id?.endsWith('@lid') && pn) storeMapping(id, pn);
      else if (lid && id && !id.endsWith('@lid')) storeMapping(lid, id);
    }
  }

  // ─── events ─────────────────────────────────────────────────────────────────

  conn.ev.on('contacts.upsert', upsertContact);
  conn.ev.on('contacts.set', upsertContact);

  conn.ev.on('groups.update', (updates) => {
    for (const update of updates) {
      const id = decodeJid(update.id);
      if (!id || id === 'status@broadcast' || !id.endsWith('@g.us')) continue;

      if (!conn.chats[id]) conn.chats[id] = { id };
      conn.chats[id].isChats = true;
      conn.chats[id].metadata = { ...(conn.chats[id].metadata || {}), ...update };
      if (update.subject) conn.chats[id].subject = update.subject;

      if (update.participants) extractMappingFromParticipants(update.participants);
    }
  });

  conn.ev.on('chats.set', async ({ chats }) => {
    for (let { id, name, readOnly } of chats) {
      id = decodeJid(id);
      if (!id || id === 'status@broadcast') continue;

      const isGroup = id.endsWith('@g.us');
      if (!conn.chats[id]) conn.chats[id] = { id };

      conn.chats[id].isChats = !readOnly;
      if (name) conn.chats[id][isGroup ? 'subject' : 'name'] = name;

      if (isGroup) {
        try {
          const metadata = await conn.groupMetadata(id);
          if (metadata) {
            conn.chats[id].metadata = metadata;
            conn.chats[id].subject = name || metadata.subject;
            extractMappingFromParticipants(metadata.participants);
          }
        } catch {}
      }
    }
  });

  conn.ev.on('chats.upsert', (chatsUpsert) => {
    const { id } = chatsUpsert;
    if (!id || id === 'status@broadcast') return;
    conn.chats[id] = { ...(conn.chats[id] || {}), ...chatsUpsert, isChats: true };
    if (id.endsWith('@g.us')) conn.insertAllGroup?.().catch?.(() => null);
  });

  conn.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!id) return;
    id = decodeJid(id);
    if (id === 'status@broadcast') return;

    if (!conn.chats[id]) conn.chats[id] = { id };
    conn.chats[id].isChats = true;

    let metadata = conn.chats[id].metadata;
    if (!metadata) {
      try {
        metadata = await conn.groupMetadata(id);
        conn.chats[id].metadata = metadata;
        conn.chats[id].subject = metadata.subject;
      } catch (e) {
        console.error('[resolve-baileys] Gagal ambil metadata grup:', e);
      }
    }

    if (!metadata) return;

    extractMappingFromParticipants(participants);

    switch (action) {
      case 'add':
      case 'revoked_membership_requests':
        for (const p of participants) {
          if (!metadata.participants.find((x) => x.id === p.id)) {
            metadata.participants.push(p);
          }
        }
        break;

      case 'promote':
      case 'demote':
        for (const p of participants) {
          const target = metadata.participants.find((x) => x.id === p.id);
          if (target) target.admin = action === 'promote' ? 'admin' : null;
        }
        break;

      case 'remove':
        metadata.participants = metadata.participants.filter(
          (a) => !participants.find((b) => b.id === a.id)
        );
        break;
    }
  });

  conn.ev.on('presence.update', ({ id, presences }) => {
    const sender = decodeJid(Object.keys(presences)[0] || id);
    if (!sender) return;

    if (!conn.chats[sender]) conn.chats[sender] = { id: sender };
    conn.chats[sender].presences = presences[Object.keys(presences)[0]]?.lastKnownPresence || 'available';

    if (id.endsWith('@g.us') && !conn.chats[id]) {
      conn.chats[id] = { id };
    }
  });

  // Auto-populate cache dari field Alt di MessageKey (Baileys v6.8+)
  conn.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      const key = msg.key;
      if (!key) continue;

      if (key.participantAlt && key.participant) {
        const a = decodeJid(key.participant);
        const b = decodeJid(key.participantAlt);
        if (a && b) {
          if (a.endsWith('@lid')) storeMapping(a, b);
          else if (b.endsWith('@lid')) storeMapping(b, a);
        }
      }

      if (key.remoteJidAlt && key.remoteJid) {
        const a = decodeJid(key.remoteJid);
        const b = decodeJid(key.remoteJidAlt);
        if (a && b) {
          if (a.endsWith('@lid')) storeMapping(a, b);
          else if (b.endsWith('@lid')) storeMapping(b, a);
        }
      }
    }
  });

  // Event resmi Baileys v7 untuk LID mapping update
  conn.ev.on('lid-mapping.update', (mappings) => {
    if (!Array.isArray(mappings)) return;
    for (const { lid, pn } of mappings) {
      const l = decodeJid(lid);
      const p = decodeJid(pn);
      if (l && p) storeMapping(l, p);
    }
  });

  // Auto-follow channel update resolve-baileys saat connect
  conn.ev.on('connection.update', ({ connection }) => {
    if (connection === 'open') {
      conn.newsletterFollow('120363339641966061@newsletter').catch(() => null);

      // Fetch semua grup supaya conn.chats tidak kosong
      conn.groupFetchAllParticipating()
        .then((groups) => {
          for (const [id, metadata] of Object.entries(groups)) {
            const gid = decodeJid(id);
            if (!gid || !gid.endsWith('@g.us')) continue;

            if (!conn.chats[gid]) conn.chats[gid] = { id: gid };
            conn.chats[gid].isChats = true;
            conn.chats[gid].metadata = metadata;
            conn.chats[gid].subject = metadata.subject || conn.chats[gid].subject || '';

            if (metadata.participants) extractMappingFromParticipants(metadata.participants);
          }
        })
        .catch(() => null);
    }
  });
}
