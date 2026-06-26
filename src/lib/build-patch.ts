/**
 * Bygger et "partial update"-objekt for Supabase fra en input der felter er
 * undefined hvis brukeren ikke ønsker å endre dem. Tar kun med felter som
 * eksplisitt er satt (inkl. null for "tøm dette feltet"). Trimmer strings.
 *
 * Brukes for å erstatte:
 *   const patch = {};
 *   if (input.x !== undefined) patch.x = trim(input.x) || null;
 *   if (input.y !== undefined) patch.y = trim(input.y) || null;
 *
 * Med:
 *   const patch = buildPatch(input, ["x", "y"], { trim: true });
 *
 * Brukes IKKE for patches med side-effekter (timestamps som settes når et
 * felt har verdi) — gjør dem manuelt etterpå.
 */

type Trimmable = string | null | undefined;

interface BuildPatchOptions {
  /** Trim string-verdier og konverter "" til null. Default: false. */
  trim?: boolean;
}

export function buildPatch<
  Input extends Record<string, unknown>,
  Key extends keyof Input,
>(input: Input, keys: readonly Key[], opts: BuildPatchOptions = {}): Partial<Input> {
  const patch: Partial<Input> = {};
  for (const key of keys) {
    const v = input[key];
    if (v === undefined) continue;
    if (opts.trim && typeof v === "string") {
      const trimmed = v.trim();
      patch[key] = (trimmed === "" ? null : trimmed) as Input[Key];
    } else {
      patch[key] = v;
    }
  }
  return patch;
}

/** Hjelper for strings som skal trimmes og bli null hvis tomme. */
export function trimOrNull(v: Trimmable): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}
