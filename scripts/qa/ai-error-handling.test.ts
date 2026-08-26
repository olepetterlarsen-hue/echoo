#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 2 (BLOKKER B2): AI-feil skal aldri lekke
// rå upstream-innhold til klienten, og helsesjekken skal svare ok:false
// uten å konfigurere en ekte nøkkel.
// Kjør: npx tsx scripts/qa/ai-error-handling.test.ts

import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import {
  AI_UNAVAILABLE_MESSAGE,
  toSafeAiError,
} from "../../src/lib/ai/assistant";
import { checkAiHealth } from "../../src/lib/ai/health";

async function main() {
  // 1) Bygg en ekte 401-feil identisk med det som faktisk ble observert i
  //    produksjon: `401 {"type":"error","error":{"type":"authentication_error",
  //    "message":"API key is invalid."},"request_id":null}`.
  const realWorld401 = Anthropic.APIError.generate(
    401,
    {
      type: "error",
      error: { type: "authentication_error", message: "API key is invalid." },
      request_id: null,
    },
    undefined,
    new Headers(),
  );

  const safe = toSafeAiError(realWorld401, "test");

  assert.equal(
    safe.message,
    AI_UNAVAILABLE_MESSAGE,
    "toSafeAiError skal alltid returnere den faste norske meldingen",
  );
  assert.doesNotMatch(
    safe.message,
    /401|authentication_error|API key|type["\s]*:|request_id/i,
    "Feilmeldingen til klienten inneholder rester av upstream-svaret",
  );
  console.log("OK  toSafeAiError skjuler upstream-feil bak norsk melding");

  // 2) checkAiHealth() skal svare false (ikke kaste) når ANTHROPIC_API_KEY
  //    mangler/er placeholder — akkurat tilstanden som var årsaken til at
  //    brukeren møtte 401 midt i AI-import uten forvarsel.
  const savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const healthyWithoutKey = await checkAiHealth();
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;

  assert.equal(
    healthyWithoutKey,
    false,
    "checkAiHealth() skal svare false når nøkkelen mangler, ikke kaste",
  );
  console.log("OK  checkAiHealth() svarer ok:false uten gyldig nøkkel (ingen exception)");

  console.log("Alle golden-tester for AI-feilhåndtering bestått.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
