"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Pencil, Trash2, Store, MapPin, Calendar, RefreshCw } from "lucide-react";
import { ModalEditar, ModalEliminar } from "./acciones";

type Tienda = {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  descripcion: string | null;
  pais_operacion: string | null;
  stock: number;
  status: string | null;
  fecha_creacion: string;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || "activo").toLowerCase();
  return value === "activa" ? "activo" : value;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

const PAIS_LABELS: Record<string, string> = {
  MX: "México",
  US: "Estados Unidos",
  CA: "Canadá",
  ES: "España",
};

export function TiendasPage() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [activeModal, setActiveModal] = useState<"edit" | "delete" | null>(null);

  const loadTienda = async () => {
    if (authLoading || !user?.id_productor) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.tiendas.getByProductor(user.id_productor, token);
      // El endpoint devuelve { items: Tienda[], paginacion: {...} }
      const list: Tienda[] = (data as { items?: Tienda[] }).items ?? (Array.isArray(data) ? data : []);
      const first = list[0] ?? null;
      setTienda(first ? { ...first, stock: Number((first as { stock?: number }).stock ?? 0) } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la tienda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) loadTienda();
  }, [authLoading, user?.id_productor]);

  const closeModal = () => setActiveModal(null);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[800px]">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-6 text-sm text-red-700 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!tienda) {
    return (
      <div className="mx-auto w-full max-w-[800px]">
        <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-12 text-center shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <Store size={48} className="mx-auto mb-4 text-[#C5CFB0] dark:text-[#3D6B3F]/40" />
          <h2 className="text-xl font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Sin tienda registrada</h2>
          <p className="mt-2 text-sm text-[#3D6B3F]/60 dark:text-[#A8C26B]/50">Aún no tienes una tienda asociada a tu cuenta de productor.</p>
        </div>
      </div>
    );
  }

  const statusNorm = normalizeStatus(tienda.status);
  const paisLabel = PAIS_LABELS[tienda.pais_operacion ?? ""] ?? tienda.pais_operacion ?? "—";

  return (
    <div className="mx-auto w-full max-w-[800px] space-y-5">

      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Mi Tienda</h1>
            <p className="mt-0.5 text-sm text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Información y configuración de tu tienda</p>
          </div>
          <div data-tour="btn-editar-tienda" className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveModal("edit")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F3A2E]"
            >
              <Pencil size={15} />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("delete")}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta principal */}
      <div data-tour="tienda-card" className="overflow-hidden rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">

        {/* Banner + nombre */}
        <div className="bg-[#1F3A2E] px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Store size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white [font-family:'Playfair_Display',serif]">{tienda.nombre}</h2>
              <span className={`mt-1 inline-flex rounded-full px-3 py-0.5 text-xs font-semibold capitalize
                ${statusNorm === "activo" ? "bg-[#A8C26B]/30 text-[#A8C26B]" : "bg-white/10 text-white/60"}`}>
                {statusNorm}
              </span>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="border-b border-[#C5CFB0]/40 dark:border-[#3D6B3F]/30 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3D6B3F]/50 dark:text-[#A8C26B]/50">Descripción</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#1F3A2E] dark:text-[#E8E3D5]">
            {tienda.descripcion || <span className="text-[#3D6B3F]/40 dark:text-[#A8C26B]/40 italic">Sin descripción</span>}
          </p>
        </div>

        {/* Grid de datos */}
        <div className="grid grid-cols-2 gap-px bg-[#C5CFB0]/20 dark:bg-[#3D6B3F]/10 sm:grid-cols-3">
          <InfoCell
            label="País de operación"
            value={paisLabel}
            icon={<MapPin size={14} />}
          />
          <InfoCell
            label="Stock total"
            value={String(tienda.stock)}
            icon={<Store size={14} />}
          />
          <InfoCell
            label="Fecha de registro"
            value={formatDate(tienda.fecha_creacion)}
            icon={<Calendar size={14} />}
          />
          <InfoCell
            label="Última actualización"
            value={formatDate(tienda.actualizado_en)}
            icon={<RefreshCw size={14} />}
          />
        </div>
      </div>

      <ModalEditar
        isOpen={activeModal === "edit"}
        onClose={closeModal}
        tienda={tienda}
        onSuccess={(updated: Tienda) => {
          setTienda((prev) => ({ ...prev!, ...updated, stock: prev?.stock ?? 0 }));
          closeModal();
        }}
      />
      <ModalEliminar
        isOpen={activeModal === "delete"}
        onClose={closeModal}
        tienda={tienda}
        onSuccess={() => {
          setTienda(null);
          closeModal();
        }}
      />
    </div>
  );
}

function InfoCell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0f1a10] px-5 py-4">
      <div className="flex items-center gap-1.5 text-[#3D6B3F]/50 dark:text-[#A8C26B]/50">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">{value || "—"}</p>
    </div>
  );
}
