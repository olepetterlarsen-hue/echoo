"use client";

/**
 * Robust QR-rendrer som håndterer både data-URL (data:image/svg+xml;...)
 * og rå SVG-markup fra Supabase auth.mfa.enroll().
 *
 * Tvinger SVG-en til å fylle wrapper-en — uten dette krymper den til
 * intrinsic size og kan se "scrambled" ut.
 */

interface Props {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 192 }: Props) {
  const isDataUrl = value.startsWith("data:");

  return (
    <div
      className="bg-white p-3 rounded border border-border inline-flex"
      style={{ width: size + 24, height: size + 24 }}
    >
      {isDataUrl ? (
        <img
          src={value}
          alt="QR-kode for 2FA"
          width={size}
          height={size}
          style={{ width: size, height: size, imageRendering: "pixelated" }}
        />
      ) : (
        <div
          className="[&>svg]:!w-full [&>svg]:!h-full [&>svg]:!max-w-none"
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      )}
    </div>
  );
}
