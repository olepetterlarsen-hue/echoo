import type { NextConfig } from "next";

// Parse Supabase-hosten for å whitelist storage-image-domener.
// Hardnet: hvis env-en er manglende, ugyldig, eller blir maskert av
// Netlify secrets scanning (kommer som "****"), faller vi tilbake til
// tom liste i stedet for å crashe hele build-en.
function getSupabaseHost(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw || !/^https?:\/\//i.test(raw)) return undefined;
  try {
    return new URL(raw).hostname;
  } catch {
    return undefined;
  }
}

const supabaseHost = getSupabaseHost();

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
