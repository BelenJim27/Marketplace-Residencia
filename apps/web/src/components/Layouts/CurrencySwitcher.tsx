"use client";

import { DollarSign } from "lucide-react";
import { useLocale, type Currency } from "@/context/LocaleContext";

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "MXN", label: "México", symbol: "$" },
  { code: "USD", label: "US", symbol: "$" },
];

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useLocale();

  return (
    <div className="flex items-center">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="appearance-none bg-transparent text-sm font-medium text-dark dark:text-white focus:outline-none cursor-pointer pr-1"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code} className="text-dark">
            {c.code}
          </option>
        ))}
      </select>
    </div>
  );
}