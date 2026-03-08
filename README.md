<div align="center">

# resolve-baileys

**LID ↔ JID resolver & contact store untuk [Baileys](https://github.com/WhiskeySockets/Baileys)**

[![npm](https://img.shields.io/npm/v/resolve-baileys?color=crimson&logo=npm&style=flat-square)](https://www.npmjs.com/package/resolve-baileys)
[![license](https://img.shields.io/github/license/rissze/resolve-baileys?style=flat-square)](LICENSE)
[![baileys](https://img.shields.io/badge/baileys-%3E%3D7.0.0--rc.9-green?style=flat-square&logo=whatsapp)](https://github.com/WhiskeySockets/Baileys)
[![ESM](https://img.shields.io/badge/ESM-supported-blue?style=flat-square)](https://nodejs.org/api/esm.html)
[![CJS](https://img.shields.io/badge/CJS-supported-blue?style=flat-square)](https://nodejs.org/api/modules.html)

> Menangani LID (Local Identifier) WhatsApp yang diperkenalkan di Baileys v7 — resolve dua arah antara `xxx@lid` dan `xxx@s.whatsapp.net` dengan cache, fallback otomatis, dan contact store bawaan.

</div>

---

## ✨ Fitur

- 🔁 **Resolve dua arah** — `LID → JID` dan `JID → LID`
- ⚡ **3 lapis fallback** — NodeCache → signalRepository → scan participants
- 🗃️ **Contact store bawaan** — listen semua event Baileys secara otomatis
- 🔌 **`attachToConn`** — inject langsung ke instance `conn` (`conn.getJid(...)`)
- 📦 **Zero build step** — tidak perlu rollup/tsc, langsung pakai
- 🟦 **TypeScript ready** — includes `.d.ts`
- ✅ **ESM & CJS** — support keduanya

---

## 📦 Install

```bash
npm install github:rissze/resolve-baileys
```

> **Requires** `baileys >= 7.0.0-rc.9` dan `node >= 18`

---

## 🚀 Quick Start

### Cara 1 — `attachToConn` (paling simpel)

Inject langsung ke `conn`, tidak perlu passing `conn` ke tiap fungsi:

```js
import makeWASocket from 'baileys';
import { attachToConn } from 'resolve-baileys';

const conn = makeWASocket({ ... });
attachToConn(conn); // inject + bind store sekaligus

conn.ev.on('messages.upsert', ({ messages }) => {
  for (const msg of messages) {
    const sender = conn.getJid(msg.key.participant || msg.key.remoteJid);
    console.log(sender); // → 628xxx@s.whatsapp.net
  }
});
```

### Cara 2 — fungsi standalone

```js
import makeWASocket from 'baileys';
import { bindStore, getJid, getLid } from 'resolve-baileys';

const conn = makeWASocket({ ... });
bindStore(conn);

conn.ev.on('messages.upsert', ({ messages }) => {
  for (const msg of messages) {
    const jid = getJid(conn, msg.key.participant);
    const lid = getLid(conn, jid);
  }
});
```

---

## 📖 API

### `attachToConn(conn)`

Inject method langsung ke instance `conn` dan bind store sekaligus. **Cara yang direkomendasikan.**

```js
attachToConn(conn);

conn.getJid('xxx@lid')                              // → 'xxx@s.whatsapp.net'
conn.getLid('xxx@s.whatsapp.net')                   // → 'xxx@lid'
conn.setLidMapping('xxx@lid', 'yyy@s.whatsapp.net') // manual store
conn.decodeJid('xxx:0@s.whatsapp.net')              // → 'xxx@s.whatsapp.net'
```

---

### `getJid(conn, sender)` → `string`

Resolve `xxx@lid` ke `xxx@s.whatsapp.net`. Jika bukan LID, dikembalikan as-is.

```js
getJid(conn, '1234@lid')              // → '628xxx@s.whatsapp.net'
getJid(conn, '628xxx@s.whatsapp.net') // → '628xxx@s.whatsapp.net' (as-is)
```

---

### `getLid(conn, sender)` → `string`

Kebalikan dari `getJid`. Resolve `xxx@s.whatsapp.net` ke `xxx@lid`.

```js
getLid(conn, '628xxx@s.whatsapp.net') // → '1234@lid'
```

---

### `bindStore(conn)`

Bind contact store ke `conn`. Auto-listen semua event Baileys dan populate cache LID ↔ JID.

```js
bindStore(conn);
// conn.chats sekarang auto-update
```

---

### `storeMapping(lid, jid)`

Simpan mapping LID ↔ JID ke cache secara manual.

```js
storeMapping('xxx@lid', '628xxx@s.whatsapp.net');
```

---

### `decodeJid(jid)` → `string | null`

Strip device suffix dari JID.

```js
decodeJid('628xxx:5@s.whatsapp.net') // → '628xxx@s.whatsapp.net'
```

---

## ⚙️ Cara Kerja Resolve

Setiap panggilan `getJid` / `getLid` melewati 3 lapis secara berurutan:

```
  sender (@lid)
      │
      ▼
┌─────────────┐   hit   ┌──────────────────┐
│  NodeCache  │────────▶│  return result   │
│   (O(1))    │         └──────────────────┘
└──────┬──────┘
       │ miss
       ▼
┌──────────────────────┐   hit   ┌──────────────────┐
│  signalRepository    │────────▶│  cache + return  │
│  .lidMapping (v7+)   │         └──────────────────┘
└──────────┬───────────┘
           │ miss
           ▼
┌──────────────────────┐   hit   ┌──────────────────┐
│  scan conn.chats     │────────▶│  cache + return  │
│  participants (O(n)) │         └──────────────────┘
└──────────┬───────────┘
           │ miss
           ▼
     return as-is
```

Hasil dari lapis 2 dan 3 otomatis masuk cache → panggilan berikutnya selalu **O(1)**.

---

## 📡 Events yang Di-listen `bindStore`

| Event | Kegunaan |
|---|---|
| `contacts.upsert` | Update info kontak |
| `contacts.set` | Bulk set kontak saat connect |
| `chats.set` | Bulk set chat saat connect |
| `chats.upsert` | Update satu chat |
| `groups.update` | Update info grup |
| `group-participants.update` | Add/remove/promote participant |
| `presence.update` | Update status online |
| `messages.upsert` | Ambil mapping dari `participantAlt` / `remoteJidAlt` |
| `lid-mapping.update` | Event resmi Baileys v7 untuk LID mapping |

---

## 🟦 CJS Support

Karena Baileys v7 adalah ESM-only, CJS wrapper menggunakan `dynamic import()`. Semua fungsi menjadi **async** di CJS:

```js
// CJS
const { attachToConn, getJid } = require('resolve-baileys');

const conn = makeWASocket({ ... });
await attachToConn(conn);

const jid = await conn.getJid('xxx@lid');
```

> **Rekomendasi:** Gunakan ESM (`"type": "module"`) untuk pengalaman terbaik — semua fungsi sync.

---

## 📂 Struktur

```
resolve-baileys/
├── src/
│   ├── index.js      ← ESM entry point
│   ├── attach.js     ← attachToConn
│   ├── cache.js      ← NodeCache lidCache & jidCache
│   ├── resolver.js   ← getJid & getLid
│   ├── store.js      ← bindStore & event listeners
│   └── utils.js      ← decodeJid, toJid
├── index.cjs         ← CJS wrapper
├── index.d.ts        ← TypeScript declarations
└── package.json
```

---

## 📄 License

[MIT](LICENSE)

---

<div align="center">
  <sub>Made with ❤️ for the Baileys community</sub>
</div>
