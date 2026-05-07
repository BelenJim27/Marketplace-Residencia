"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";

/**
 * Common layout for static legal pages.
 *
 * Routes under `app/(legal)` use it so privacy/terms/shipping/returns/alcohol all
 * share the same back link, heading and prose styling.
 *
 * Translation strategy: source strings are Spanish, runtime t() in LocaleContext
 * auto-translates to EN. For high-fidelity legal content this should be replaced
 * by reviewed translations from a CMS post-MVP.
 */
export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-700 dark:text-gray-300">
        <ArrowLeft size={16} />
        {t("Volver al inicio")}
      </Link>
      <article className="prose prose-sm max-w-none text-gray-800 dark:prose-invert dark:text-gray-200">
        <h1 className="!mb-1 text-2xl font-semibold">{t(title)}</h1>
        <p className="!mt-0 text-xs text-gray-500 dark:text-gray-400">
          {t("Última actualización")}: {lastUpdated}
        </p>
        <div className="mt-6 space-y-4">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <section>
      <h2 className="!mb-2 text-lg font-semibold">{t(heading)}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return <p>{typeof children === "string" ? t(children) : children}</p>;
}
