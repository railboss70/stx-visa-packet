import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { AppSettings, VisaReport } from "./types";

export type PersistedVisa = {
  settings: AppSettings;
  reports: VisaReport[];
};

const LS_KEY = "stx-visa-packet";
const DB_NAME = "stx-visa-packet";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;
let onSaveError: ((message: string) => void) | null = null;

export function onVisaSaveError(handler: (message: string) => void) {
  onSaveError = handler;
}

export function persistSaveMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return "Could not save. Phone storage looks full — delete an old week, then try again.";
  }
  if (error instanceof Error && error.message) {
    return `Could not save this packet (${error.message}).`;
  }
  return "Could not save this packet. Try again, or delete an old week to free space.";
}

function reportSaveError(error: unknown) {
  onSaveError?.(persistSaveMessage(error));
}

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("IndexedDB open failed"));
      };
    });
  }
  return dbPromise;
}

function idbGet(key: string) {
  return openDb().then(
    (db) =>
      new Promise<unknown>((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbSet(key: string, value: unknown) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

function idbDel(key: string) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function asStorageValue(raw: unknown): StorageValue<PersistedVisa> | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const rec = value as { state?: unknown; version?: number; settings?: unknown; reports?: unknown };
  if (rec.state && typeof rec.state === "object") {
    return rec as StorageValue<PersistedVisa>;
  }
  if ("settings" in rec || "reports" in rec) {
    return { state: rec as PersistedVisa };
  }
  return null;
}

function readLegacyLocal(name: string) {
  try {
    const raw = localStorage.getItem(name);
    return raw ? asStorageValue(raw) : null;
  } catch {
    return null;
  }
}

function clearLegacyLocal(name: string) {
  try {
    localStorage.removeItem(name);
  } catch {
    /* ignore */
  }
}

export const visaIdbStorage: PersistStorage<PersistedVisa> = {
  getItem: async (name) => {
    try {
      const fromIdb = asStorageValue(await idbGet(name));
      if (fromIdb) return fromIdb;
    } catch {
      /* fall through to localStorage */
    }
    const legacy = readLegacyLocal(name);
    if (!legacy) return null;
    try {
      await idbSet(name, legacy);
      clearLegacyLocal(name);
    } catch {
      /* keep using the local copy for this session */
    }
    return legacy;
  },
  setItem: async (name, value) => {
    try {
      await idbSet(name, value);
      clearLegacyLocal(name);
      onSaveError?.("");
    } catch (error) {
      reportSaveError(error);
      try {
        localStorage.setItem(name, JSON.stringify(value));
        onSaveError?.(
          persistSaveMessage(error) + " Saved a backup in the small phone store — delete old weeks.",
        );
      } catch {
        throw error;
      }
    }
  },
  removeItem: async (name) => {
    try {
      await idbDel(name);
    } catch (error) {
      reportSaveError(error);
    }
    clearLegacyLocal(name);
  },
};

export const VISA_PERSIST_NAME = LS_KEY;
