"use client";

import { Eye, Package, Store, User } from "lucide-react";

type Props = {
  products: number;
  stores: number;
  active: number;
  profileLabel: string;
};

export function StatsCards({ products, stores, active, profileLabel }: Props) {
  const cards = [
    { label: "Productos", value: products, icon: Package },
    { label: "Tiendas", value: stores, icon: Store },
    { label: "Activos", value: active, icon: Eye },
    { label: "Perfil", value: profileLabel, icon: User },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-[10px] border border-stroke bg-white dark:bg-gray-800 p-5 shadow-sm dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-200">{stat.label}</span>
              <Icon className="h-5 w-5 text-green-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-dark dark:text-white">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}
