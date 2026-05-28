"use client";

import { useState, useEffect, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "semana" | "mes";

type VentaProductor = {
  nombre: string;
  total: number;
  pedidos: number;
};

type ProductoVendido = {
  nombre: string;
  cantidad: number;
};

type RegistroUsuario = {
  fecha: string;
  total: number;
};

type ChartsData = {
  ventasPorProductor: VentaProductor[];
  productosMasVendidos: ProductoVendido[];
  registrosUsuarios: RegistroUsuario[];
};

// ─── Paleta de colores ────────────────────────────────────────────────────────

const COLORS = {
  green: "#3D6B3F",
  blue: "#1F3A2E",
  orange: "#C97A3E",
  purple: "#A8C26B",
  teal: "#C5CFB0",
  rose: "#C97A3E",
  amber: "#A8C26B",
};

const BAR_COLORS = [
  COLORS.green,
  COLORS.blue,
  COLORS.orange,
  COLORS.purple,
  COLORS.teal,
  COLORS.rose,
  COLORS.amber,
];

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  currency = false,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  currency?: boolean;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl shadow-[0_4px_12px_rgba(61,107,63,0.12)] px-4 py-3 text-sm">
      {label && <p className="font-semibold text-[#1F3A2E] mb-1 [font-family:'DM_Sans',sans-serif]">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}:{" "}
          {currency
            ? new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
              maximumFractionDigits: 0,
            }).format(entry.value)
            : entry.value.toLocaleString("es-MX")}
        </p>
      ))}
    </div>
  );
}

// ─── Selector de período ──────────────────────────────────────────────────────

function PeriodSelector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: Period) => void;
  options: { label: string; value: Period }[];
}) {
  return (
    <div className="flex gap-1 bg-[#1F3A2E]/10 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${value === opt.value
            ? "bg-[#F4F0E3] text-[#1F3A2E] shadow-sm"
            : "text-[#3D6B3F]/70 hover:text-[#1F3A2E]"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Card contenedor de gráfica ───────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-[#F4F0E3] rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)] border border-[#C5CFB0] p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">{title}</h3>
          {subtitle && <p className="text-xs text-[#3D6B3F]/70 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-[#C5CFB0]/50 rounded w-1/3" />
      <div className="h-48 bg-[#C5CFB0]/50 rounded-xl" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-[#C5CFB0]">
      <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getFechaUsuario(u: any): Date | null {
  const raw = u.createdAt ?? u.created_at ?? u.fechaRegistro ?? u.fecha_registro;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function getFechaKey(fecha: Date, period: Period): string {
  if (period === "semana") return DIAS[fecha.getDay()];
  return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

function estaEnPeriodo(fecha: Date, period: Period): boolean {
  const ahora = new Date();
  const dias = period === "semana" ? 6 : 29;
  const limite = new Date(ahora);
  limite.setDate(ahora.getDate() - dias);
  return fecha >= limite;
}

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () =>
      setDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function AdminChartsContent() {
  const token = getCookie("token");
  const isDark = useIsDark();

  const axisColor = isDark ? "#C5CFB0" : "#3D6B3F";
  const gridColor = isDark ? "#1F3A2E" : "#C5CFB0";
  const labelColor = isDark ? "#A8C26B" : "#1F3A2E";

  const [ventasPeriod, setVentasPeriod] = useState<Period>("mes");
  const [usuariosPeriod, setUsuariosPeriod] = useState<Period>("mes");

  const [data, setData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pedidosRes, usuariosRes, productoresRes, productosRes] = await Promise.all([
        api.pedidos.getAll(),
        api.usuarios.getAll(token ?? ""),
        api.productores.getAll(),
        api.productos.getAll(),
      ]);

      const pedidos: any[] = Array.isArray(pedidosRes) ? pedidosRes : [];
      const usuarios: any[] = Array.isArray(usuariosRes) ? usuariosRes : [];
      const productores: any[] = Array.isArray(productoresRes) ? productoresRes : [];
      const productos: any[] = Array.isArray(productosRes) ? productosRes : [];

      const usuarioNombreMap = new Map<string, string>();
      usuarios.forEach((u) => {
        usuarioNombreMap.set(u.id_usuario, u.nombre ?? "Sin nombre");
      });

      const productorNombreMap = new Map<number, string>();
      productores.forEach((p) => {
        const nombre = usuarioNombreMap.get(p.id_usuario) ?? "Sin nombre";
        productorNombreMap.set(p.id_productor, nombre);
      });

      const productoProductorMap = new Map<number, number>();
      productos.forEach((prod) => {
        const id_productor = prod.lotes?.id_productor;
        if (id_productor != null) {
          productoProductorMap.set(prod.id_producto, id_productor);
        }
      });

      // 1. Ventas por productor
      const ventasMap = new Map<string, { total: number; pedidos: number }>();
      pedidos.forEach((p) => {
        const items: any[] = p.detalle_pedido ?? [];
        items.forEach((item) => {
          //  Buscar el producto directamente por id_producto
          const prod = productos.find((pr) => pr.id_producto === item.id_producto);
          //  Usar nombre_productor que ya viene en el producto
          const nombre = prod?.nombre_productor ?? "Sin nombre";
          const total = Number(p.total ?? 0) / items.length;
          const prev = ventasMap.get(nombre) ?? { total: 0, pedidos: 0 };
          ventasMap.set(nombre, { total: prev.total + total, pedidos: prev.pedidos + 1 });
        });
      });
      const ventasPorProductor: VentaProductor[] = Array.from(ventasMap.entries())
        .map(([nombre, v]) => ({ nombre, ...v }))
        .sort((a, b) => b.total - a.total);

      // 2. Productos más vendidos
      const productosMap = new Map<string, number>();
      pedidos.forEach((p) => {
        const items: any[] = p.detalle_pedido ?? [];
        items.forEach((item) => {
          const prod = productos.find((pr) => pr.id_producto === item.id_producto);
          const nombre = prod?.nombre ?? `Producto #${item.id_producto}`;
          const cantidad = Number(item.cantidad ?? 1);
          productosMap.set(nombre, (productosMap.get(nombre) ?? 0) + cantidad);
        });
      });
      const productosMasVendidos: ProductoVendido[] = Array.from(productosMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 8);

      // 3. Registros de usuarios
      const registrosMap = new Map<string, number>();
      usuarios.forEach((u) => {
        const fecha = getFechaUsuario(u);
        if (!fecha || !estaEnPeriodo(fecha, usuariosPeriod)) return;
        const key = getFechaKey(fecha, usuariosPeriod);
        registrosMap.set(key, (registrosMap.get(key) ?? 0) + 1);
      });
      const registrosUsuarios: RegistroUsuario[] = Array.from(registrosMap.entries()).map(
        ([fecha, total]) => ({ fecha, total }),
      );

      setData({ ventasPorProductor, productosMasVendidos, registrosUsuarios });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar gráficas");
    } finally {
      setLoading(false);
    }
  }, [token, ventasPeriod, usuariosPeriod]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 dark:border-red-900/30 dark:bg-red-950/20">
          <svg className="h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Ventas por Productor */}
      <ChartCard
        title="Ventas por Productor"
        subtitle="Top productores por monto"
        action={
          <PeriodSelector
            value={ventasPeriod}
            onChange={setVentasPeriod}
            options={[
              { label: "Esta Semana", value: "semana" },
              { label: "Este Mes", value: "mes" },
            ]}
          />
        }
      >
        {loading ? (
          <ChartSkeleton />
        ) : data?.ventasPorProductor.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ventasPorProductor}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="nombre" stroke={axisColor} tick={{ fill: labelColor, fontSize: 12 }} />
              <YAxis stroke={axisColor} tick={{ fill: labelColor, fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                content={(props) => <CustomTooltip {...props} currency />}
              />
              <Bar dataKey="total" fill={COLORS.green} name="Ventas (MXN)" radius={[8, 8, 0, 0]}>
                {data.ventasPorProductor.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="Sin datos de ventas" />
        )}
      </ChartCard>

      {/* Productos Más Vendidos */}
      <ChartCard title="Top Productos" subtitle="Más vendidos (últimos 30 días)">
        {loading ? (
          <ChartSkeleton />
        ) : data?.productosMasVendidos.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.productosMasVendidos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" stroke={axisColor} tick={{ fill: labelColor, fontSize: 12 }} />
              <YAxis dataKey="nombre" type="category" stroke={axisColor} tick={{ fill: labelColor, fontSize: 11 }} width={150} />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                content={(props) => <CustomTooltip {...props} />}
              />
              <Bar dataKey="cantidad" fill={COLORS.blue} name="Cantidad" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="Sin datos de productos" />
        )}
      </ChartCard>

      {/* Registros Nuevos de Usuarios */}
      <ChartCard
        title="Nuevos Usuarios"
        subtitle="Registros por período"
        action={
          <PeriodSelector
            value={usuariosPeriod}
            onChange={setUsuariosPeriod}
            options={[
              { label: "Esta Semana", value: "semana" },
              { label: "Este Mes", value: "mes" },
            ]}
          />
        }
      >
        {loading ? (
          <ChartSkeleton />
        ) : data?.registrosUsuarios.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.registrosUsuarios}>
              <defs>
                <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="fecha" stroke={axisColor} tick={{ fill: labelColor, fontSize: 12 }} />
              <YAxis stroke={axisColor} tick={{ fill: labelColor, fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                content={(props) => <CustomTooltip {...props} />}
              />
              <Area type="monotone" dataKey="total" stroke={"#3D6B3F"} fillOpacity={1} fill="url(#colorRegistros)" name="Registros" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="Sin datos de registros" />
        )}
      </ChartCard>
    </div>
  );
}
