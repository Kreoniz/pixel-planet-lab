// Vite emits this event when a lazily loaded module or stylesheet cannot
// be fetched. Cloudflare Pages branch aliases replace a deployment's asset
// tree, so a tab kept open across deployments can reference deleted chunks.
export const missingChunkReloadKey = "pixel-planet-lab.missing-chunk-build";

export function shouldReloadForMissingChunk(storage, buildId) {
  if (typeof buildId !== "string" || !buildId) return false;
  try {
    if (storage?.getItem(missingChunkReloadKey) === buildId) return false;
    storage?.setItem(missingChunkReloadKey, buildId);
    return Boolean(storage);
  } catch {
    // Without session storage we cannot guard against an infinite reload.
    return false;
  }
}

export function installMissingChunkRecovery(
  win,
  { buildId, onReload = () => win.location.reload(), onFailure = () => {} },
) {
  const handler = (event) => {
    event.preventDefault();
    let storage;
    try { storage = win.sessionStorage; } catch { storage = null; }
    if (shouldReloadForMissingChunk(storage, buildId)) {
      // Reload once against the current preview deployment. Do not try to
      // import the same missing hashed asset repeatedly in this document.
      try {
        onReload();
        return;
      } catch {
        // A restricted browser might disallow navigation.
      }
    }
    onFailure(event.payload);
  };
  win.addEventListener("vite:preloadError", handler);
  return () => win.removeEventListener("vite:preloadError", handler);
}
