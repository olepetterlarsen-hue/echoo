import type { Metadata } from "next";
import { Inter, Archivo, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Echoo",
    template: "%s · Echoo",
  },
  description:
    "Echoo — kvalitets- og prosjektstyring for elektroentreprenører. Bygget av håndverkere, for håndverkere.",
  icons: {
    icon: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Les tema fra cookie så vi unngår flash-of-wrong-theme. Cookien settes
  // av tema-toggle-komponenten på klient + ved login fra profile.theme_preference.
  // Lin er default — bare data-theme="dark" overstyrer.
  const themeCookie = (await cookies()).get("echoo-theme")?.value;
  const theme = themeCookie === "dark" ? "dark" : "lin";
  const fontVars = `${inter.variable} ${archivo.variable} ${jetbrainsMono.variable}`;
  return (
    <html
      lang="no"
      className={`${fontVars} h-full`}
      data-theme={theme === "dark" ? "dark" : undefined}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
