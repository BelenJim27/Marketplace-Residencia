import "@/css/satoshi.css";
import "@/css/style.css";
import "driver.js/dist/driver.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { ClientWidgets } from "@/components/ClientWidgets";
import { CookieConsent } from "@/components/CookieConsent";
import { Providers } from "./providers";
import { RootContent } from "./root-content";


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "Mezcales";
const SITE_DESCRIPTION =
  "Marketplace of artisanal mezcal from Oaxaca, Mexico — handcrafted agave spirits shipped to the US and beyond.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Mezcales",
    default: "Mezcales — Oaxacan Mezcal",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Mezcales — Oaxacan Mezcal",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "es_MX",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mezcales — Oaxacan Mezcal",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/producto?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />
          <RootContent>{children}</RootContent>
          <ClientWidgets />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
