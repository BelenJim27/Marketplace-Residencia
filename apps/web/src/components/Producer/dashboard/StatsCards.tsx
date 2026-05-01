"use client";

import { Eye, Package, User, TrendingUp } from "lucide-react";

// 1. Definir la interfaz que TypeScript no encontraba
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
      color: "text-blue-600" 
    },
    { 
      label: "Productos Activos", 
      value: active, 
      icon: Eye, 
      color: "text-green-600" 
    },
    { 
      label: "Estado del Perfil", 
      value: profileLabel, 
      icon: User, 
      isBadge: true,
      color: isComplete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700" 
    },
    { 
      label: "Rendimiento", 
      value: "+12%", 
      icon: TrendingUp, 
      color: "text-emerald-600", 
      sub: "vs mes anterior" 
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-xl border border-stroke bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
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
                <span className="text-2xl font-bold text-dark dark:text-white">
                  {stat.value}
                </span>
              )}
              {stat.sub && <span className="text-xs text-gray-400">{stat.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}