const CHUNK_RELOAD_GUARD_KEY = "echoo-chunk-reload-guard";

/**
 * Kjenner igjen en stale-chunk-feil (bruker har fanen åpen fra før siste
 * utrulling, og en lazy-loaded JS-chunk finnes ikke lenger på CDN-en).
 * Dekker både webpack ("ChunkLoadError") og Turbopack/native ESM-import
 * ("Failed to fetch dynamically imported module").
 */
export function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [\w.-]+ failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message)
  );
}

/**
 * Reloader siden ÉN gang ved en chunk-load-feil i stedet for å vise
 * feilsiden — dekker B3/F-18 (ChunkLoadError + React #418 ga et blankt
 * skjema uten feilmelding). Vokterflagg i sessionStorage hindrer at det
 * looper hvis reload ikke løser det (f.eks. en reell, vedvarende feil).
 *
 * Returnerer true hvis en reload ble trigget — kalleren skal da ikke gjøre
 * noe mer (f.eks. ikke sende til Sentry, siden dette ikke er en reell feil
 * som trenger undersøkelse).
 */
export function reloadOnceForChunkError(error: Error): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
