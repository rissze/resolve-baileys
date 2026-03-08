'use strict';

// Baileys adalah ESM-only (v6.8+), sehingga CJS wajib pakai dynamic import().
// Semua fungsi otomatis async di CJS.

let _mod = null;

async function load() {
  if (_mod) return _mod;
  _mod = await import('./src/index.js');
  return _mod;
}

async function getJid(conn, sender)   { return (await load()).getJid(conn, sender); }
async function getLid(conn, sender)   { return (await load()).getLid(conn, sender); }
async function bindStore(conn)        { return (await load()).bindStore(conn); }
async function attachToConn(conn)     { return (await load()).attachToConn(conn); }
async function storeMapping(lid, jid) { return (await load()).storeMapping(lid, jid); }
async function decodeJid(jid)         { return (await load()).decodeJid(jid); }
async function toJid(pn)              { return (await load()).toJid(pn); }
async function getLidCache()          { return (await load()).lidCache; }
async function getJidCache()          { return (await load()).jidCache; }

module.exports = {
  getJid,
  getLid,
  bindStore,
  attachToConn,
  storeMapping,
  decodeJid,
  toJid,
  getLidCache,
  getJidCache,
};
