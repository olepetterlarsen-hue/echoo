"use server";

import { lookupOrgNumber, searchByName } from "@/lib/bronnoysund";
import type { BrregLookupResult } from "@/lib/bronnoysund";

export async function brregLookupByOrgNumber(
  orgNumber: string,
): Promise<{ result?: BrregLookupResult; error?: string }> {
  try {
    const result = await lookupOrgNumber(orgNumber);
    if (!result) return { error: "Fant ikke organisasjonsnummeret i Brønnøysund." };
    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function brregSearchByName(
  query: string,
): Promise<{ results?: BrregLookupResult[]; error?: string }> {
  try {
    const results = await searchByName(query);
    return { results };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
