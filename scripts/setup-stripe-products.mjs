#!/usr/bin/env node
// setup-stripe-products.mjs
//
// Idempotent setup-script som oppretter (eller oppdaterer) de to
// produktene i Stripe via API:
//   1. Echoo Elektro + HMS   — 2 990 kr/mnd
//   2. ISO 9001-modul        — 2 000 kr/mnd (add-on)
//
// Bruker test-nøkler fra .env.local. Skriver tilbake PRODUCT/PRICE-IDene
// til .env.local for senere bruk av appen (Checkout, webhook).
//
// Kjør én gang:
//   node scripts/setup-stripe-products.mjs
//
// Hver kjøring er trygg — eksisterende produkter med metadata.echoo_key
// blir gjenfunnet og bare oppdatert, ikke duplisert.

import Stripe from "stripe";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error("Mangler STRIPE_SECRET_KEY i .env.local");
  process.exit(2);
}
if (!KEY.startsWith("sk_test_")) {
  console.error(
    "STRIPE_SECRET_KEY må være en test-nøkkel (sk_test_...) — avbryter for sikkerhet.",
  );
  process.exit(2);
}

const stripe = new Stripe(KEY, { apiVersion: "2026-05-27.dahlia" });

const PRODUCTS = [
  {
    key: "base",
    name: "Echoo Elektro + HMS",
    description:
      "Kvalitets- og prosjektstyring for elektroentreprenører. " +
      "Avvik, dokumentsignering, kompetansestyring, stoffkartotek, " +
      "rutiner. 14 dagers prøveperiode inkludert.",
    amount: 2990_00, // 2 990 kr i øre
    interval: "month",
  },
  {
    key: "iso_addon",
    name: "ISO 9001-modul",
    description:
      "Add-on til Echoo Elektro + HMS. Aktiverer dokumentstyringsflyt " +
      "med godkjenning, CAPA-prosess, internrevisjon, ledelsens " +
      "gjennomgang, mål-/KPI-register, miljøaspekter og " +
      "etterlevelsesregister.",
    amount: 2000_00,
    interval: "month",
  },
];

async function findExisting(echooKey) {
  // Søk gjennom alle aktive produkter med metadata.echoo_key
  const all = await stripe.products.search({
    query: `metadata['echoo_key']:'${echooKey}' AND active:'true'`,
    limit: 5,
  });
  return all.data[0] ?? null;
}

async function ensureProduct(spec) {
  let product = await findExisting(spec.key);
  if (product) {
    console.log(`= Eksisterer: ${spec.name} (${product.id})`);
    product = await stripe.products.update(product.id, {
      name: spec.name,
      description: spec.description,
    });
  } else {
    console.log(`+ Oppretter: ${spec.name}`);
    product = await stripe.products.create({
      name: spec.name,
      description: spec.description,
      metadata: { echoo_key: spec.key },
    });
  }

  // Sjekk om en matching pris allerede finnes
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });
  let price = prices.data.find(
    (p) =>
      p.unit_amount === spec.amount &&
      p.currency === "nok" &&
      p.recurring?.interval === spec.interval,
  );
  if (price) {
    console.log(`  = Pris finnes: ${price.id} (${spec.amount / 100} NOK/mnd)`);
  } else {
    // Deaktiver alle andre priser så vi ikke har duplikater i bruk
    for (const old of prices.data) {
      await stripe.prices.update(old.id, { active: false });
      console.log(`  - Deaktivert gammel pris: ${old.id}`);
    }
    price = await stripe.prices.create({
      product: product.id,
      currency: "nok",
      unit_amount: spec.amount,
      recurring: { interval: spec.interval },
    });
    console.log(`  + Opprettet pris: ${price.id} (${spec.amount / 100} NOK/mnd)`);
  }

  return { productId: product.id, priceId: price.id };
}

async function writeBackToEnv(envVars) {
  const path = ".env.local";
  let body = existsSync(path) ? readFileSync(path, "utf8") : "";
  for (const [k, v] of Object.entries(envVars)) {
    const re = new RegExp(`^${k}\\s*=.*$`, "m");
    if (re.test(body)) {
      body = body.replace(re, `${k}=${v}`);
    } else {
      body = body.trimEnd() + `\n${k}=${v}\n`;
    }
  }
  writeFileSync(path, body);
  console.log(`\nSkrev ${Object.keys(envVars).length} env-vars til ${path}.`);
}

async function main() {
  const results = {};
  for (const spec of PRODUCTS) {
    const { productId, priceId } = await ensureProduct(spec);
    if (spec.key === "base") {
      results.STRIPE_PRODUCT_BASE = productId;
      results.STRIPE_PRICE_BASE = priceId;
    } else if (spec.key === "iso_addon") {
      results.STRIPE_PRODUCT_ISO_ADDON = productId;
      results.STRIPE_PRICE_ISO_ADDON = priceId;
    }
  }
  await writeBackToEnv(results);
  console.log("\nFerdig. Appen vil plukke disse opp fra .env.local.");
}

main().catch((e) => {
  console.error("\nFeilet:", e.message);
  process.exit(1);
});
