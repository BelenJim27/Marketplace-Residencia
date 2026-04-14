import "@/css/satoshi.css";
import "@/css/style.css";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { RootContent } from "./root-content";

export const metadata: Metadata = {
  title: {
    template: "%s | MARKETPLACE RESIDENCIA",
    default: "Administrador",
  },
  description: "Interfaz de administración MAESTRO",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />
          <RootContent>{children}</RootContent>
        </Providers>
      </body>
    </html>
  );
}
