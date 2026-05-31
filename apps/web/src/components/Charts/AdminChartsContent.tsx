"use client";

import { useState, useEffect, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { FileText, Table2, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "semana" | "mes";
type VentaProductor  = { nombre: string; total: number; pedidos: number };
type ProductoVendido = { nombre: string; cantidad: number };
type RegistroUsuario = { fecha: string; total: number };
type ChartsData = {
  ventasPorProductor:  VentaProductor[];
  productosMasVendidos: ProductoVendido[];
  registrosUsuarios:   RegistroUsuario[];
};

// ─── Paleta ───────────────────────────────────────────────────────────────────

const COLORS = {
  cobre:    "#C97A3E",
  silvestre:"#3D6B3F",
  ambar:    "#C89B4A",
  hoja:     "#A8C26B",
  tierra:   "#8B4B2E",
  musgo:    "#7A9E6E",
  tobala:   "#1F3A2E",
};
const BAR_COLORS = [
  COLORS.cobre, COLORS.silvestre, COLORS.ambar,
  COLORS.hoja,  COLORS.tierra,   COLORS.musgo, COLORS.tobala,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMXN = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getFechaUsuario(u: any): Date | null {
  const raw = u.createdAt ?? u.created_at ?? u.fechaRegistro ?? u.fecha_registro;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}
function getFechaKey(fecha: Date, period: Period) {
  return period === "semana" ? DIAS[fecha.getDay()] : `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}
function estaEnPeriodo(fecha: Date, period: Period) {
  const ahora = new Date();
  const limite = new Date(ahora);
  limite.setDate(ahora.getDate() - (period === "semana" ? 6 : 29));
  return fecha >= limite;
}
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportToPDF(data: ChartsData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const W = 210;
  const M = 16;
  const CW = W - M * 2;

  // ── Colores RGB ──
  const C_DARK:   [number,number,number] = [31, 58, 46];
  const C_MID:    [number,number,number] = [61, 107, 63];
  const C_COPPER: [number,number,number] = [201, 122, 62];
  const C_BEIGE:  [number,number,number] = [244, 240, 227];
  const C_SAGE:   [number,number,number] = [197, 207, 176];
  const C_GRAY:   [number,number,number] = [90, 90, 90];
  const C_WHITE:  [number,number,number] = [255, 255, 255];

  const now   = new Date();
  const dateStr = now.toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...C_DARK);
  doc.rect(0, 0, W, 44, "F");

  // Copper accent strip
  doc.setFillColor(...C_COPPER);
  doc.rect(0, 0, 5, 44, "F");

  doc.setTextColor(...C_WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Dashboard", M + 4, 17);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(168, 194, 107); // C_HOJA
  doc.text("Marketplace Mezcal · Oaxaca, México", M + 4, 26);

  doc.setTextColor(197, 207, 176); // C_SAGE
  doc.setFontSize(9);
  doc.text(`Generado el ${dateStr} a las ${timeStr}`, M + 4, 35);

  // Page label (top right)
  doc.setTextColor(197, 207, 176);
  doc.text("CONFIDENCIAL", W - M, 35, { align: "right" });

  y = 54;

  // ── RESUMEN DE MÉTRICAS ──────────────────────────────────────────────────────
  const totalVentas  = data.ventasPorProductor.reduce((a, b) => a + b.total, 0);
  const totalPedidos = data.ventasPorProductor.reduce((a, b) => a + b.pedidos, 0);
  const totalProds   = data.productosMasVendidos.reduce((a, b) => a + b.cantidad, 0);
  const totalUsers   = data.registrosUsuarios.reduce((a, b) => a + b.total, 0);

  const metrics = [
    { label: "Ventas Totales",  value: new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(totalVentas) },
    { label: "Pedidos",         value: String(totalPedidos) },
    { label: "Unidades Vendidas", value: String(totalProds) },
    { label: "Nuevos Usuarios", value: String(totalUsers) },
  ];

  const boxW = CW / 4;
  metrics.forEach((m, i) => {
    const bx = M + i * boxW;

    doc.setFillColor(...C_BEIGE);
    doc.roundedRect(bx, y, boxW - 2, 22, 2, 2, "F");

    doc.setDrawColor(...C_SAGE);
    doc.setLineWidth(0.4);
    doc.roundedRect(bx, y, boxW - 2, 22, 2, 2, "D");

    // copper top accent
    doc.setFillColor(...C_COPPER);
    doc.roundedRect(bx, y, boxW - 2, 2.5, 1, 1, "F");

    doc.setTextColor(...C_GRAY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(m.label, bx + (boxW - 2) / 2, y + 9, { align: "center" });

    doc.setTextColor(...C_DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(m.value, bx + (boxW - 2) / 2, y + 17, { align: "center" });
  });

  y += 30;

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  const checkNewPage = (neededH: number) => {
    if (y + neededH > 278) {
      doc.addPage();
      y = 18;
      // mini header on subsequent pages
      doc.setFillColor(...C_DARK);
      doc.rect(0, 0, W, 10, "F");
      doc.setFillColor(...C_COPPER);
      doc.rect(0, 0, 3, 10, "F");
      doc.setTextColor(...C_WHITE);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Reporte de Dashboard · Marketplace Mezcal", M, 6.5);
      y = 18;
    }
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    checkNewPage(20);
    doc.setFillColor(...C_COPPER);
    doc.rect(M, y, 3, subtitle ? 14 : 10, "F");

    doc.setTextColor(...C_DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, M + 7, y + 7);

    if (subtitle) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C_GRAY);
      doc.text(subtitle, M + 7, y + 12.5);
    }
    y += subtitle ? 20 : 16;
  };

  const drawTable = (
    headers: string[],
    rows: string[][],
    colWidths: number[],
    rightAlignCols: number[] = [],
  ) => {
    const ROW_H    = 7.5;
    const HEADER_H = 9;

    checkNewPage(HEADER_H + rows.length * ROW_H + 4);

    // Header
    doc.setFillColor(...C_MID);
    doc.rect(M, y, CW, HEADER_H, "F");
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");

    let x = M + 4;
    headers.forEach((h, i) => {
      if (rightAlignCols.includes(i)) {
        doc.text(h, x + colWidths[i] - 6, y + 6, { align: "right" });
      } else {
        doc.text(h, x, y + 6);
      }
      x += colWidths[i];
    });
    y += HEADER_H;

    // Rows
    rows.forEach((row, ri) => {
      checkNewPage(ROW_H + 4);

      if (ri % 2 === 0) {
        doc.setFillColor(...C_BEIGE);
        doc.rect(M, y, CW, ROW_H, "F");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(M, y, CW, ROW_H, "F");
      }

      doc.setTextColor(...C_GRAY);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");

      x = M + 4;
      row.forEach((cell, i) => {
        if (rightAlignCols.includes(i)) {
          doc.text(cell, x + colWidths[i] - 6, y + 5.2, { align: "right" });
        } else {
          // truncate long text
          const maxChars = Math.floor(colWidths[i] / 1.9);
          const display  = cell.length > maxChars ? cell.slice(0, maxChars - 1) + "…" : cell;
          doc.text(display, x, y + 5.2);
        }
        x += colWidths[i];
      });

      // row border
      doc.setDrawColor(...C_SAGE);
      doc.setLineWidth(0.2);
      doc.line(M, y + ROW_H, M + CW, y + ROW_H);

      y += ROW_H;
    });

    // outer border
    doc.setDrawColor(...C_SAGE);
    doc.setLineWidth(0.4);
    doc.rect(M, y - rows.length * ROW_H - HEADER_H, CW, rows.length * ROW_H + HEADER_H, "D");

    y += 10;
  };

  // ── SECCIÓN 1: Ventas por Productor ────────────────────────────────────────
  drawSectionTitle("Ventas por Productor", "Top productores ordenados por monto total");
  const ventasRows = data.ventasPorProductor.map((v, i) => [
    String(i + 1),
    v.nombre,
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v.total),
    String(v.pedidos),
    totalVentas > 0 ? `${((v.total / totalVentas) * 100).toFixed(1)}%` : "0%",
  ]);
  drawTable(
    ["#", "Productor", "Total Ventas (MXN)", "Pedidos", "Participación"],
    ventasRows,
    [10, 72, 52, 25, 19],
    [2, 3, 4],
  );

  // ── SECCIÓN 2: Top Productos ──────────────────────────────────────────────
  drawSectionTitle("Top Productos Más Vendidos", "Productos ordenados por unidades vendidas");
  const productosRows = data.productosMasVendidos.map((p, i) => [
    String(i + 1),
    p.nombre,
    String(p.cantidad),
    totalProds > 0 ? `${((p.cantidad / totalProds) * 100).toFixed(1)}%` : "0%",
  ]);
  drawTable(
    ["#", "Producto", "Unidades", "Participación"],
    productosRows,
    [10, 110, 30, 28],
    [2, 3],
  );

  // ── SECCIÓN 3: Nuevos Usuarios ────────────────────────────────────────────
  drawSectionTitle("Nuevos Usuarios por Período", "Registros agrupados por fecha");
  const registrosRows = data.registrosUsuarios.map((r) => [r.fecha, String(r.total)]);
  drawTable(
    ["Fecha / Período", "Registros"],
    registrosRows,
    [130, 48],
    [1],
  );

  // ── FOOTER en cada página ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFillColor(...C_DARK);
    doc.rect(0, 289, W, 8, "F");
    doc.setFillColor(...C_COPPER);
    doc.rect(0, 289, 3, 8, "F");
    doc.setTextColor(197, 207, 176);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Marketplace Mezcal · Reporte confidencial", M, 294);
    doc.text(`Página ${pg} de ${totalPages}  ·  ${dateStr}`, W - M, 294, { align: "right" });
  }

  doc.save(`reporte-dashboard-${now.toISOString().split("T")[0]}.pdf`);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCSV(data: ChartsData) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString("es-MX");
  const lines: string[] = [];

  const row = (...cells: (string | number)[]) =>
    lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));

  row("REPORTE DE DASHBOARD - MARKETPLACE MEZCAL");
  row(`Generado:,${dateStr} ${now.toLocaleTimeString("es-MX")}`);
  lines.push("");

  // Resumen
  row("RESUMEN GENERAL");
  row("Métrica", "Valor");
  const totalVentas  = data.ventasPorProductor.reduce((a, b) => a + b.total, 0);
  const totalPedidos = data.ventasPorProductor.reduce((a, b) => a + b.pedidos, 0);
  const totalUnidades = data.productosMasVendidos.reduce((a, b) => a + b.cantidad, 0);
  const totalUsers   = data.registrosUsuarios.reduce((a, b) => a + b.total, 0);
  row("Ventas totales (MXN)", totalVentas.toFixed(2));
  row("Total de pedidos",     totalPedidos);
  row("Unidades vendidas",    totalUnidades);
  row("Nuevos usuarios",      totalUsers);
  lines.push("");

  // Ventas por productor
  row("VENTAS POR PRODUCTOR");
  row("Posición", "Productor", "Total Ventas (MXN)", "Pedidos", "Participación (%)");
  data.ventasPorProductor.forEach((v, i) => {
    const pct = totalVentas > 0 ? ((v.total / totalVentas) * 100).toFixed(2) : "0.00";
    row(i + 1, v.nombre, v.total.toFixed(2), v.pedidos, pct);
  });
  lines.push("");

  // Productos más vendidos
  row("TOP PRODUCTOS MÁS VENDIDOS");
  row("Posición", "Producto", "Unidades Vendidas", "Participación (%)");
  data.productosMasVendidos.forEach((p, i) => {
    const pct = totalUnidades > 0 ? ((p.cantidad / totalUnidades) * 100).toFixed(2) : "0.00";
    row(i + 1, p.nombre, p.cantidad, pct);
  });
  lines.push("");

  // Nuevos usuarios
  row("NUEVOS USUARIOS POR PERÍODO");
  row("Fecha / Período", "Registros");
  data.registrosUsuarios.forEach((r) => row(r.fecha, r.total));

  const csv  = lines.join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `reporte-dashboard-${now.toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency = false }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#C5CFB0] bg-[#FDFBF5] px-4 py-3 shadow-[0_8px_24px_rgba(31,58,46,0.14)] text-sm">
      {label && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3D6B3F]/60">{label}</p>}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="font-semibold text-[#1F3A2E]">
            {currency
              ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(e.value)
              : e.value.toLocaleString("es-MX")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange, options }: {
  value: string;
  onChange: (v: Period) => void;
  options: { label: string; value: Period }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-[#C5CFB0] bg-white p-1 shadow-sm">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            value === opt.value
              ? "bg-[#1F3A2E] text-white shadow-sm"
              : "text-[#3D6B3F]/70 hover:text-[#1F3A2E]"
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#C5CFB0] bg-white p-6 shadow-[0_2px_12px_rgba(61,107,63,0.08)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#3D6B3F]/60">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-[#C5CFB0]/40" />
      <div className="h-56 rounded-xl bg-[#C5CFB0]/30" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-3 text-[#C5CFB0]">
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Custom labels ────────────────────────────────────────────────────────────

function BarTopLabel({ x, y, width, value }: any) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle"
      fill={COLORS.tobala} fontSize={11} fontWeight={600} fontFamily="DM Sans, sans-serif">
      {fmtMXN(value)}
    </text>
  );
}

function BarEndLabel({ x, y, width, height, value }: any) {
  if (!value) return null;
  return (
    <text x={x + width + 6} y={y + height / 2 + 4}
      fill={COLORS.tobala} fontSize={11} fontWeight={600} fontFamily="DM Sans, sans-serif">
      {value}
    </text>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminChartsContent() {
  const token  = getCookie("token");
  const isDark = useIsDark();

  const axisColor  = isDark ? "#7A9E6E" : "#C5CFB0";
  const gridColor  = isDark ? "#1F3A2E" : "#E8E3D5";
  const labelColor = isDark ? "#A8C26B" : "#3D6B3F";

  const [ventasPeriod,   setVentasPeriod]   = useState<Period>("mes");
  const [usuariosPeriod, setUsuariosPeriod] = useState<Period>("mes");
  const [data,    setData]       = useState<ChartsData | null>(null);
  const [loading, setLoading]    = useState(true);
  const [error,   setError]      = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadCharts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pedidosRes, usuariosRes, , productosRes] = await Promise.all([
        api.pedidos.getAll(),
        api.usuarios.getAll(token ?? ""),
        api.productores.getAll(),
        api.productos.getAll(),
      ]);

      const pedidos:   any[] = Array.isArray(pedidosRes)   ? pedidosRes   : [];
      const usuarios:  any[] = Array.isArray(usuariosRes)  ? usuariosRes  : [];
      const productos: any[] = Array.isArray(productosRes) ? productosRes : [];

      // Ventas por productor
      const ventasMap = new Map<string, { total: number; pedidos: number }>();
      pedidos.forEach((p) => {
        const items: any[] = p.detalle_pedido ?? [];
        items.forEach((item) => {
          const prod   = productos.find((pr) => pr.id_producto === item.id_producto);
          const nombre = prod?.nombre_productor ?? "Sin nombre";
          const total  = Number(p.total ?? 0) / items.length;
          const prev   = ventasMap.get(nombre) ?? { total: 0, pedidos: 0 };
          ventasMap.set(nombre, { total: prev.total + total, pedidos: prev.pedidos + 1 });
        });
      });
      const ventasPorProductor = Array.from(ventasMap.entries())
        .map(([nombre, v]) => ({ nombre, ...v }))
        .sort((a, b) => b.total - a.total);

      // Productos más vendidos
      const productosMap = new Map<string, number>();
      pedidos.forEach((p) => {
        (p.detalle_pedido ?? []).forEach((item: any) => {
          const prod   = productos.find((pr) => pr.id_producto === item.id_producto);
          const nombre = prod?.nombre ?? `Producto #${item.id_producto}`;
          productosMap.set(nombre, (productosMap.get(nombre) ?? 0) + Number(item.cantidad ?? 1));
        });
      });
      const productosMasVendidos = Array.from(productosMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 8);

      // Registros de usuarios
      const registrosMap = new Map<string, number>();
      usuarios.forEach((u) => {
        const fecha = getFechaUsuario(u);
        if (!fecha || !estaEnPeriodo(fecha, usuariosPeriod)) return;
        const key = getFechaKey(fecha, usuariosPeriod);
        registrosMap.set(key, (registrosMap.get(key) ?? 0) + 1);
      });
      const registrosUsuarios = Array.from(registrosMap.entries()).map(([fecha, total]) => ({ fecha, total }));

      setData({ ventasPorProductor, productosMasVendidos, registrosUsuarios });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar gráficas");
    } finally {
      setLoading(false);
    }
  }, [token, ventasPeriod, usuariosPeriod]);

  useEffect(() => { loadCharts(); }, [loadCharts]);

  const handleExportPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try { await exportToPDF(data); }
    catch (e) { console.error("PDF error", e); }
    finally { setPdfLoading(false); }
  };

  const handleExportCSV = () => { if (data) exportToCSV(data); };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {/* ── Barra de exportación ── */}
      <div className="flex items-center justify-between rounded-2xl border border-[#C5CFB0] bg-white px-5 py-3.5 shadow-[0_2px_8px_rgba(61,107,63,0.06)]">
        <div>
          <p className="text-sm font-semibold text-[#1F3A2E]">Exportar reporte</p>
          <p className="text-xs text-[#3D6B3F]/60">Descarga los datos en formato PDF o CSV</p>
        </div>
        <div className="flex items-center gap-3">
          {/* CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !data}
            className="inline-flex items-center gap-2 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm font-semibold text-[#1F3A2E] shadow-sm transition hover:bg-[#F4F0E3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Table2 className="h-4 w-4 text-[#3D6B3F]" />
            Exportar CSV
          </button>

          {/* PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={loading || !data || pdfLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1F3A2E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3D6B3F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pdfLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Exportar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Ventas por Productor ── */}
      <ChartCard
        title="Ventas por Productor"
        subtitle="Top productores por monto"
        action={
          <PeriodSelector value={ventasPeriod} onChange={setVentasPeriod}
            options={[{ label: "Esta Semana", value: "semana" }, { label: "Este Mes", value: "mes" }]} />
        }
      >
        {loading ? <ChartSkeleton /> : data?.ventasPorProductor.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.ventasPorProductor} margin={{ top: 28, right: 16, left: 8, bottom: 8 }} barCategoryGap="35%">
              <defs>
                {BAR_COLORS.map((color, i) => (
                  <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity={1}   />
                    <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke={gridColor} strokeWidth={1} />
              <XAxis dataKey="nombre" axisLine={false} tickLine={false}
                tick={{ fill: labelColor, fontSize: 12, fontFamily: "DM Sans, sans-serif", fontWeight: 500 }} dy={8} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: axisColor, fontSize: 11, fontFamily: "DM Sans, sans-serif" }}
                tickFormatter={fmtMXN} width={52} />
              <Tooltip cursor={{ fill: "rgba(197,207,176,0.15)", radius: 6 }}
                content={(props) => <CustomTooltip {...props} currency />} />
              <Bar dataKey="total" name="Ventas (MXN)" radius={[8, 8, 0, 0]} maxBarSize={72}>
                {data.ventasPorProductor.map((_, idx) => (
                  <Cell key={idx} fill={`url(#barGrad${idx % BAR_COLORS.length})`} />
                ))}
                <LabelList content={<BarTopLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message="Sin datos de ventas" />}
      </ChartCard>

      {/* ── Top Productos ── */}
      <ChartCard title="Top Productos" subtitle="Más vendidos (últimos 30 días)">
        {loading ? <ChartSkeleton /> : data?.productosMasVendidos.length ? (
          <ResponsiveContainer width="100%" height={Math.max(280, data.productosMasVendidos.length * 42)}>
            <BarChart data={data.productosMasVendidos} layout="vertical"
              margin={{ top: 4, right: 56, left: 8, bottom: 4 }} barCategoryGap="30%">
              <defs>
                {BAR_COLORS.map((color, i) => (
                  <linearGradient key={i} id={`hBarGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor={color} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={color} stopOpacity={1}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="0" horizontal={false} stroke={gridColor} strokeWidth={1} />
              <XAxis type="number" axisLine={false} tickLine={false}
                tick={{ fill: axisColor, fontSize: 11, fontFamily: "DM Sans, sans-serif" }} tickCount={5} />
              <YAxis dataKey="nombre" type="category" axisLine={false} tickLine={false}
                tick={{ fill: labelColor, fontSize: 11, fontFamily: "DM Sans, sans-serif", fontWeight: 500 }} width={148} />
              <Tooltip cursor={{ fill: "rgba(197,207,176,0.15)", radius: 4 }}
                content={(props) => <CustomTooltip {...props} />} />
              <Bar dataKey="cantidad" name="Unidades" radius={[0, 6, 6, 0]} maxBarSize={26}>
                {data.productosMasVendidos.map((_, idx) => (
                  <Cell key={idx} fill={`url(#hBarGrad${idx % BAR_COLORS.length})`} />
                ))}
                <LabelList content={<BarEndLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message="Sin datos de productos" />}
      </ChartCard>

      {/* ── Nuevos Usuarios ── */}
      <ChartCard
        title="Nuevos Usuarios"
        subtitle="Registros por período"
        action={
          <PeriodSelector value={usuariosPeriod} onChange={setUsuariosPeriod}
            options={[{ label: "Esta Semana", value: "semana" }, { label: "Este Mes", value: "mes" }]} />
        }
      >
        {loading ? <ChartSkeleton /> : data?.registrosUsuarios.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.registrosUsuarios} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="gradUsuarios" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={COLORS.ambar} stopOpacity={0.55} />
                  <stop offset="60%"  stopColor={COLORS.ambar} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLORS.ambar} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke={gridColor} strokeWidth={1} />
              <XAxis dataKey="fecha" axisLine={false} tickLine={false}
                tick={{ fill: axisColor, fontSize: 11, fontFamily: "DM Sans, sans-serif" }} dy={8} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: axisColor, fontSize: 11, fontFamily: "DM Sans, sans-serif" }}
                allowDecimals={false} width={32} />
              <Tooltip cursor={{ stroke: COLORS.ambar, strokeWidth: 1.5, strokeDasharray: "4 4" }}
                content={(props) => <CustomTooltip {...props} />} />
              <Area type="monotone" dataKey="total" name="Registros"
                stroke={COLORS.ambar} strokeWidth={2.5} strokeLinecap="round"
                fill="url(#gradUsuarios)"
                dot={{ r: 4, fill: "#fff", stroke: COLORS.ambar, strokeWidth: 2.5 }}
                activeDot={{ r: 6, fill: COLORS.ambar, stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState message="Sin datos de registros" />}
      </ChartCard>
    </div>
  );
}
