"use client";

import { CheckCircle2, Leaf, Users, Shield } from "lucide-react";

const trustItems = [
  {
    icon: CheckCircle2,
    title: "Trazabilidad Verificada",
    description: "Cada producto cuenta su historia completa",
    color: "from-emerald-400 to-teal-400",
  },
  {
    icon: Leaf,
    title: "Comercio Justo",
    description: "Valor justo para productores y comunidades",
    color: "from-amber-400 to-orange-400",
  },
  {
    icon: Users,
    title: "Comunidades Apoyadas",
    description: "Impacto directo en economías locales",
    color: "from-rose-400 to-pink-400",
  },
  {
    icon: Shield,
    title: "Compra Segura",
    description: "Protegemos tu información en cada transacción",
    color: "from-blue-400 to-indigo-400",
  },
];

export default function TrustCards() {
  return (
    <div className="w-full py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {trustItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
              style={{
                background: "var(--bio-color-fondo, #faf8f4)",
                border: "1px solid rgba(92, 61, 30, 0.1)",
              }}
            >
              {/* Animated Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
              />

              {/* Animated Border Glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, rgba(92, 61, 30, 0.2), transparent)`,
                }}
              />

              {/* Content */}
              <div className="relative z-10 space-y-3">
                {/* Icon Container */}
                <div className="relative w-fit">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-xl blur opacity-0 group-hover:opacity-40 transition-all duration-500 group-hover:scale-110`} />
                  <div
                    className="relative rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, rgba(92, 61, 30, 0.08), rgba(139, 105, 20, 0.04))`,
                    }}
                  >
                    <Icon
                      className="h-6 w-6 transition-colors duration-300"
                      style={{ color: "var(--bio-color-boton, #5c3d1e)" }}
                    />
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="font-semibold text-sm transition-colors duration-300"
                  style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}
                >
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs leading-relaxed transition-colors duration-300" style={{ color: "rgba(92, 61, 30, 0.7)" }}>
                  {item.description}
                </p>

                {/* Animated Underline */}
                <div className="pt-2 overflow-hidden">
                  <div
                    className={`h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full bg-gradient-to-r ${item.color}`}
                  />
                </div>
              </div>

              {/* Corner Accent */}
              <div className="absolute top-0 right-0 w-12 h-12 rounded-bl-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(135deg, rgba(92, 61, 30, 0.3), transparent)`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
