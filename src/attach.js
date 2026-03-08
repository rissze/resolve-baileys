import { getJid, getLid } from './resolver.js';
import { storeMapping } from './cache.js';
import { decodeJid } from './utils.js';
import { bindStore } from './store.js';

/**
 * Inject getJid, getLid, setLidMapping, dan decodeJid langsung ke conn.
 * Sekaligus bind contact store supaya cache auto-populate dari events.
 *
 * @param {import('baileys').WASocket} conn
 * @returns {import('baileys').WASocket} conn yang sama (untuk chaining)
 *
 * @example
 * import { attachToConn } from 'resolve-baileys';
 * attachToConn(conn);
 *
 * conn.getJid('xxx@lid')  // → 'xxx@s.whatsapp.net'
 * conn.getLid('xxx@s.whatsapp.net') // → 'xxx@lid'
 */
export function attachToConn(conn) {
  bindStore(conn);

  Object.defineProperties(conn, {
    getJid: {
      /**
       * Resolve LID ke JID/PN.
       * @param {string} sender
       * @returns {string}
       */
      value(sender) {
        return getJid(conn, sender);
      },
      enumerable: true,
      configurable: true,
    },

    getLid: {
      /**
       * Resolve JID/PN ke LID.
       * @param {string} sender
       * @returns {string}
       */
      value(sender) {
        return getLid(conn, sender);
      },
      enumerable: true,
      configurable: true,
    },

    setLidMapping: {
      /**
       * Simpan mapping LID ↔ JID ke cache secara manual.
       * @param {string} lid - format: xxx@lid
       * @param {string} jid - format: xxx@s.whatsapp.net
       */
      value(lid, jid) {
        lid = decodeJid(lid);
        jid = decodeJid(jid);
        storeMapping(lid, jid);
      },
      enumerable: true,
      configurable: true,
    },

    decodeJid: {
      /**
       * Strip device suffix dari JID.
       * @param {string} jid
       * @returns {string|null}
       */
      value(jid) {
        return decodeJid(jid);
      },
      enumerable: true,
      configurable: true,
    },
  });

  return conn;
}
