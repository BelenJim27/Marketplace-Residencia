"use client";

import { useState } from "react";
import { LegalShell, LegalSection, LegalP } from "../_components/LegalShell";

export default function DoNotSellPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/usuarios/ccpa/opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <LegalShell title="Do Not Sell My Personal Information" lastUpdated="2026-06-21">
      <LegalSection heading="Your California Privacy Rights (CCPA)">
        <LegalP>
          Under the California Consumer Privacy Act (CCPA), California residents have the right
          to opt out of the sale of their personal information. Guardians del Mezcal does not
          sell personal information to third parties. However, you may submit a request to
          confirm this or to delete your data.
        </LegalP>
      </LegalSection>

      <LegalSection heading="How to Submit a Request">
        <LegalP>
          To exercise your rights under CCPA, enter your registered email address below.
          We will process your request within 45 days and notify you by email.
        </LegalP>
        {status === "done" ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Your request has been received. We will respond within 45 days.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <label htmlFor="ccpa-email" className="text-sm font-medium">
              Email address
            </label>
            <input
              id="ccpa-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            {status === "error" && (
              <p className="text-sm text-red-600">
                Something went wrong. Please email us at{" "}
                <a href="mailto:privacy@guardianasmezcal.com" className="underline">
                  privacy@guardianasmezcal.com
                </a>
                .
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-fit rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {status === "loading" ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        )}
      </LegalSection>

      <LegalSection heading="Other Privacy Rights">
        <LegalP>
          You also have the right to know what personal information we collect, request
          deletion of your data, and receive equal service regardless of whether you
          exercise your privacy rights. For more information, see our{" "}
          <a href="/legal/privacy" className="text-green-700 underline dark:text-green-400">
            Privacy Policy
          </a>
          .
        </LegalP>
        <LegalP>
          Contact us at{" "}
          <a href="mailto:privacy@guardianasmezcal.com" className="text-green-700 underline dark:text-green-400">
            privacy@guardianasmezcal.com
          </a>{" "}
          for any privacy-related questions.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
