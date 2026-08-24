"use client";

/**
 * A very small IndexedDB wrapper. Only ever holds sealed ciphertext,
 * never plaintext — so the contents of this store are meaningless to
 * anyone who opens developer tools on a shared computer.
 */

const DB_NAME = "keep";
const STORE = "sealed";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export const idbGet = <T,>(key: string) => tx<T>("readonly", (s) => s.get(key) as IDBRequest<T>);
export const idbSet = (key: string, value: unknown) =>
  tx("readwrite", (s) => s.put(value, key) as IDBRequest<IDBValidKey>);
export const idbDel = (key: string) => tx("readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
export const idbClear = () => tx("readwrite", (s) => s.clear() as IDBRequest<undefined>);
