"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";

type ConsentState = "accepted" | "rejected" | null;

export function CookieConsent() {
  const [state, setState] = useState<ConsentState | "loading">("loading");

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentState | null;
    setState(stored ?? null);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setState("accepted");
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setState("rejected");
  }

  // No renderizar hasta saber el estado almacenado (evita flash)
  if (state !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-gray-200 bg-white px-4 py-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6"
    >
      <p className="mb-3 text-sm text-gray-700 dark:text-gray-300 sm:mb-0">
        We use cookies for authentication, analytics, and to improve your experience.
        By continuing, you agree to our{" "}
        <Link href="/legal/privacy" className="underline hover:text-green-700 dark:hover:text-green-400">
          Privacy Policy
        </Link>
        . California residents:{" "}
        <Link href="/legal/do-not-sell" className="underline hover:text-green-700 dark:hover:text-green-400">
          Do Not Sell My Info
        </Link>
        .
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={reject}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="rounded-md bg-green-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-800"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
