import "@/css/satoshi.css";
import "@/css/style.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { RootContent } from "./root-content";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    template: "%s | Mezcales",
    default: "Mezcales",
  },
  description: "Marketplace de mezcales artesanales de Oaxaca",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />
          <RootContent>{children}</RootContent>
        </Providers>
      </body>
    </html>
  );
}
