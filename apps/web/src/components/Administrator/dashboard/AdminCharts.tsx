"use client";

import dynamic from "next/dynamic";

const AdminChartsContent = dynamic(() => import("@/components/Charts/AdminChartsContent").then(mod => ({ default: mod.AdminChartsContent })), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-80" />
      ))}
    </div>
  ),
});

export function AdminCharts() {
  return <AdminChartsContent />;
}
