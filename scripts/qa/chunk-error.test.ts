#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 5, del 3 (B3/F-18): ChunkLoadError skal
// trigge nøyaktig ÉN automatisk reload, ikke en løkke.
// Kjør: npx tsx scripts/qa/chunk-error.test.ts

import assert from "node:assert/strict";
import { isChunkLoadError, reloadOnceForChunkError } from "../../src/lib/chunk-error";

function main() {
  // 1) Gjenkjenner webpack- og Turbopack/ESM-varianten av chunk-feil.
  const webpackErr = Object.assign(new Error("Loading chunk 4821 failed."), {
    name: "ChunkLoadError",
  });
  const esmErr = new Error("Failed to fetch dynamically imported module: /_next/static/chunks/foo.js");
  const unrelatedErr = new TypeError("Cannot read properties of undefined (reading 'foo')");

  assert.equal(isChunkLoadError(webpackErr), true, "webpack ChunkLoadError ble ikke gjenkjent");
  assert.equal(isChunkLoadError(esmErr), true, "Turbopack/ESM-varianten ble ikke gjenkjent");
  assert.equal(isChunkLoadError(unrelatedErr), false, "en helt vanlig TypeError ble feilaktig tolket som chunk-feil");
  console.log("OK  isChunkLoadError gjenkjenner begge chunk-feil-variantene, ikke vanlige feil");

  // 2) reloadOnceForChunkError() skal reloade FØRSTE gang, og IKKE andre
  //    gang i samme sesjon (vokterflagget hindrer loop).
  let reloadCount = 0;
  const store = new Map<string, string>();
  const g = globalThis as unknown as {
    window?: unknown;
    sessionStorage?: unknown;
  };
  g.window = {
    location: {
      reload: () => {
        reloadCount++;
      },
    },
  };
  g.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };

  const first = reloadOnceForChunkError(webpackErr);
  const second = reloadOnceForChunkError(webpackErr);

  assert.equal(first, true, "første chunk-feil skal trigge reload");
  assert.equal(second, false, "andre chunk-feil i samme sesjon skal IKKE trigge nok en reload (ville looped)");
  assert.equal(reloadCount, 1, `window.location.reload() skal ha blitt kalt nøyaktig én gang, ble kalt ${reloadCount} ganger`);
  console.log("OK  reloadOnceForChunkError() reloader nøyaktig én gang per sesjon, ikke en løkke");

  delete g.window;
  delete g.sessionStorage;

  console.log("Alle golden-tester for chunk-error-håndtering bestått.");
}

main();
