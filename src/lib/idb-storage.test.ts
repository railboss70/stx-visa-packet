import assert from "node:assert/strict";
import { test } from "node:test";
import { asStorageValue, persistSaveMessage } from "./idb-storage.ts";

test("asStorageValue reads zustand persist JSON", () => {
  const raw = JSON.stringify({
    state: { settings: { last4: "5935" }, reports: [{ id: "a" }] },
    version: 0,
  });
  const value = asStorageValue(raw);
  assert.ok(value);
  assert.equal(value?.version, 0);
  assert.equal((value?.state as { settings: { last4: string } }).settings.last4, "5935");
  assert.equal((value?.state as { reports: { id: string }[] }).reports[0].id, "a");
});

test("asStorageValue reads a bare state object from IndexedDB", () => {
  const value = asStorageValue({
    state: { settings: {}, reports: [] },
    version: 1,
  });
  assert.deepEqual(value?.state, { settings: {}, reports: [] });
});

test("quota errors get a field-readable message", () => {
  const err = new DOMException("full", "QuotaExceededError");
  assert.match(persistSaveMessage(err), /full/i);
});
