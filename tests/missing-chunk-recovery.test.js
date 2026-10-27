import test from "node:test";
import assert from "node:assert/strict";
import { missingChunkReloadKey, shouldReloadForMissingChunk, installMissingChunkRecovery } from "../src/missing-chunk-recovery.js";

function mockStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    values,
  };
}

test("one automatic recovery reload per entry bundle, with future builds allowed", () => {
  const storage = mockStorage();
  assert.equal(shouldReloadForMissingChunk(storage, "assets/index-a.js"), true);
  assert.equal(storage.values.get(missingChunkReloadKey), "assets/index-a.js");
  assert.equal(shouldReloadForMissingChunk(storage, "assets/index-a.js"), false);
  assert.equal(shouldReloadForMissingChunk(storage, "assets/index-b.js"), true);
  assert.equal(shouldReloadForMissingChunk(storage, ""), false);
});

test("storage denial fails to a visible refresh prompt instead of a reload loop", () => {
  assert.equal(shouldReloadForMissingChunk({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  }, "bundle.js"), false);
  assert.equal(shouldReloadForMissingChunk(null, "bundle.js"), false);
});

test("Vite preload failures are consumed, reloaded once and then show recovery help", () => {
  const events = new EventTarget();
  events.sessionStorage = mockStorage();
  const calls = [];
  const stop = installMissingChunkRecovery(events, {
    buildId: "index-abcdef.js",
    onReload: () => calls.push("reload"),
    onFailure: (error) => calls.push(error.message),
  });
  const e1 = new Event("vite:preloadError", { cancelable: true });
  e1.payload = new Error("Could not fetch module");
  events.dispatchEvent(e1);
  assert.equal(e1.defaultPrevented, true);
  assert.deepEqual(calls, ["reload"]);
  const e2 = new Event("vite:preloadError", { cancelable: true });
  e2.payload = new Error("Still missing");
  events.dispatchEvent(e2);
  assert.equal(e2.defaultPrevented, true);
  assert.deepEqual(calls, ["reload", "Still missing"]);
  stop();
  const e3 = new Event("vite:preloadError", { cancelable: true });
  events.dispatchEvent(e3);
  assert.equal(e3.defaultPrevented, false);
});
