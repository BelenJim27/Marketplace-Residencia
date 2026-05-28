"use client";

import dynamic from "next/dynamic";

const AdminChartsContent = dynamic(
  () => import("@/components/Charts/AdminChartsContent").then(mod => ({ default: mod.AdminChartsContent })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#F4F0E3] rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.06)] p-6 h-80"
          />
        ))}
      </div>
    ),
  }
);

export function AdminCharts() {
  return <AdminChartsContent />;
}
