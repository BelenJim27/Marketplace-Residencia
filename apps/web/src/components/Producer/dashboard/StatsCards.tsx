"use client";

import { Eye, Package, User, TrendingUp } from "lucide-react";

interface Props {
  products: number;
  active: number;
  profileLabel: string;
}

export function StatsCards({ products, active, profileLabel }: Props) {
  const isComplete = profileLabel === "Completo";

  const cards = [
    {
      label: "Total Productos",
      value: products,
      icon: Package,
      color: "text-[#3D6B3F]",
    },
    {
      label: "Productos Activos",
      value: active,
      icon: Eye,
      color: "text-[#A8C26B]",
    },
    {
      label: "Estado del Perfil",
      value: profileLabel,
      icon: User,
      isBadge: true,
      color: isComplete ? "bg-[#A8C26B]/20 text-[#3D6B3F]" : "bg-[#C97A3E]/15 text-[#C97A3E]",
    },
    {
      label: "Rendimiento",
      value: "+12%",
      icon: TrendingUp,
      color: "text-[#3D6B3F]",
      sub: "vs mes anterior",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#3D6B3F]/70">
                {stat.label}
              </span>
              {!stat.isBadge && <Icon className={`h-5 w-5 ${stat.color}`} />}
            </div>
            <div className="mt-3 flex items-end justify-between">
              {stat.isBadge ? (
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${stat.color}`}>
                  {stat.value}
                </span>
              ) : (
                <span className="text-2xl font-bold text-[#1F3A2E]">
                  {stat.value}
                </span>
              )}
              {stat.sub && <span className="text-xs text-[#3D6B3F]/50">{stat.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
