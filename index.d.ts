import type { WASocket } from 'baileys';
import type NodeCache from 'node-cache';

export declare const lidCache: NodeCache;
export declare const jidCache: NodeCache;

export declare function decodeJid(jid: string): string | null;
export declare function toJid(pn: string): string;
export declare function storeMapping(lid: string, jid: string): void;
export declare function getJid(conn: WASocket, sender: string): string;
export declare function getLid(conn: WASocket, sender: string): string;
export declare function bindStore(conn: WASocket): void;
export declare function attachToConn(conn: WASocket): WASocket & {
  getJid(sender: string): string;
  getLid(sender: string): string;
  setLidMapping(lid: string, jid: string): void;
  decodeJid(jid: string): string | null;
};
