"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Trash2, Loader2, FlaskConical, CheckCircle2,
  RefreshCw, AlertCircle, Check, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import LotesAcciones from "./LotesAcciones";
import { ModalStock } from "./modalStock";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

// ─── Constantes ───────────────────────────────────────────────────────────────

const AGAVE_SUGERIDOS = [
  "Mezcal Espadín", "Tobalá", "Cuishe", "Madrecuixe",
  "Tepeztate", "Jabalí", "Mexicano", "Arroqueño", "Zotolero", "Pulquero",
];

const CLASES = ["Joven", "Reposado", "Añejo", "Extra Añejo", "Abocado con", "Destilado con"];
const CLASES_CON_COMPLEMENTO = ["Abocado con", "Destilado con"];

const inputCls =
  "w-full rounded-lg border border-[#C5CFB0] bg-white px-3 py-2 text-sm text-[#1F3A2E] placeholder:text-[#3D6B3F]/40 focus:outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20";

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

function Toast({ msg, type = "success", onClose }) {
  if (!msg) return null;
  const isError = type === "error";
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm
      ${isError
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-[#A8C26B]/40 bg-[#A8C26B]/10 text-[#3D6B3F]"}`}>
      {isError ? <AlertCircle size={15} /> : <Check size={15} />}
      <span className="flex-1">{msg}</span>
      <button type="button" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1F3A2E]/10 text-[#3D6B3F]">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3D6B3F]/60">{title}</p>
        <p className="text-2xl font-bold text-[#1F3A2E]">{value}</p>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function LotesView() {
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVer, setModalVer] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalStock, setModalStock] = useState(false);
  const [loteStock, setLoteStock] = useState(null);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  const [lotes, setLotes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sincronizandoProductoIds, setSincronizandoProductoIds] = useState(new Set());

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [year, setYear] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const initialForm = {
    lote: "", tipoProducto: "", especieCientifica: "", categoria: "",
    clase: "", claseComplemento: "", cantidad: "", fechaProduccion: "",
    descripcion: "", sitio: "",
  };
  const [form, setForm] = useState(initialForm);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), type === "error" ? 8000 : 4000);
  };

  const fetchLotes = useCallback(async (silent = false) => {
    if (!user?.id_productor) return;
    try {
      if (!silent) setLoading(true);
      const data = await api.lotes.getByProductor(Number(user.id_productor));
      const mappedLotes = data
        .filter((l) => !l.eliminado_en)
        .map((l) => ({
          id_lote: l.id_lote,
          lote: l.codigo_lote,
          producto: l.nombre_comun || l.marca || l.datos_api?.variedad || "Mezcal",
          especieCientifica: l.nombre_cientifico || l.datos_api?.especie_cientifica || "-",
          categoria: l.datos_api?.categoria || "-",
          clase: l.datos_api?.clase || "-",
          marca: l.marca || "-",
          grado_alcohol: l.grado_alcohol ? `${l.grado_alcohol}°` : "-",
          especie_cientifica: l.nombre_cientifico || "-",
          sitio: l.sitio || "-",
          cantidad: l.unidades
            ? `${l.unidades} uds`
            : l.volumen_total ? `${l.volumen_total} L` : "-",
          fecha: l.fecha_produccion ? l.fecha_produccion.split("T")[0] : "-",
          estado: l.estado_lote || "disponible",
          year: l.fecha_produccion
            ? String(new Date(l.fecha_produccion).getFullYear())
            : "-",
          productoVinculado: l.productos?.[0]
            ? {
                id_producto: l.productos[0].id_producto,
                precio_base: l.productos[0].precio_base,
                stock: l.productos[0].inventario?.[0]?.stock ?? 0,
              }
            : null,
          originalData: l,
        }));
      setLotes(mappedLotes);
    } catch {
      if (!silent) showToast("No fue posible cargar los lotes.", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id_productor]);

  const modalAbierto = isModalOpen || modalVer || modalEditar || modalEliminar;

  useEffect(() => {
    fetchLotes();
    if (modalAbierto) return;
    const id = setInterval(() => fetchLotes(true), 30_000);
    return () => clearInterval(id);
  }, [fetchLotes, modalAbierto]);

  const yearsDisponibles = useMemo(() =>
    Array.from(new Set(lotes.map((l) => l.year).filter((y) => y !== "-")))
      .sort((a, b) => Number(b) - Number(a)),
    [lotes]
  );

  const stats = useMemo(() => ({
    total: lotes.length,
    disponibles: lotes.filter((l) => ["disponible", "activo"].includes(l.estado.toLowerCase())).length,
  }), [lotes]);

  useEffect(() => { setCurrentPage(1); }, [search, status, year]);

  const filteredLotes = useMemo(() => lotes.filter((item) => {
    const matchesSearch = `${item.lote} ${item.producto} ${item.marca}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "Todos" || item.estado.toLowerCase() === status.toLowerCase();
    const matchesYear = year === "Todos" || item.year === year;
    return matchesSearch && matchesStatus && matchesYear;
  }), [lotes, search, status, year]);

  const totalPages = Math.ceil(filteredLotes.length / itemsPerPage);
  const paginatedLotes = filteredLotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const abrirVer = (lote) => { setLoteSeleccionado(lote); setModalVer(true); };

  const abrirEditar = (lote) => {
    setLoteSeleccionado(lote);
    const claseRaw = lote.clase !== "-" ? lote.clase : "";
    const claseBase = CLASES.find((c) => claseRaw.startsWith(c)) ?? claseRaw;
    const complemento = CLASES_CON_COMPLEMENTO.includes(claseBase) ? claseRaw.slice(claseBase.length).trim() : "";
    setForm({
      lote: lote.lote, tipoProducto: lote.producto,
      especieCientifica: lote.especieCientifica !== "-" ? lote.especieCientifica : "",
      categoria: lote.categoria !== "-" ? lote.categoria : (categorias[0] ?? ""),
      clase: claseBase, claseComplemento: complemento,
      cantidad: parseFloat(lote.cantidad) || "",
      fechaProduccion: lote.fecha !== "-" ? lote.fecha : "",
      descripcion: lote.originalData?.descripcion || lote.originalData?.datos_api?.descripcion || "",
      sitio: lote.sitio !== "-" ? lote.sitio : "",
    });
    setModalEditar(true);
  };

  const abrirEliminar = (lote) => { setLoteSeleccionado(lote); setModalEliminar(true); };
  const abrirStock = (lote) => { setLoteStock(lote); setModalStock(true); };

  const cerrarModales = () => {
    setIsModalOpen(false); setModalVer(false); setModalEditar(false); setModalEliminar(false);
    setLoteSeleccionado(null); setForm(initialForm);
  };

  async function guardarLote(e) {
    e.preventDefault();
    if (!user?.id_productor) return;
    const token = getCookie("token");
    setEnviando(true);
    const claseCompleta = CLASES_CON_COMPLEMENTO.includes(form.clase) && form.claseComplemento
      ? `${form.clase} ${form.claseComplemento}` : form.clase;
    const payload = {
      id_productor: Number(user.id_productor),
      codigo_lote: form.lote,
      volumen_total: Number(form.cantidad) || null,
      fecha_produccion: form.fechaProduccion || null,
      estado_lote: modalEditar ? loteSeleccionado.estado : "disponible",
      sitio: form.sitio || null,
      datos_api: {
        variedad: form.tipoProducto, especie_cientifica: form.especieCientifica,
        categoria: form.categoria, clase: claseCompleta, descripcion: form.descripcion,
      },
    };
    try {
      if (modalEditar && loteSeleccionado) {
        await api.lotes.update(token, loteSeleccionado.id_lote, payload);
        showToast("Lote actualizado correctamente.");
      } else {
        await api.lotes.create(token, payload);
        showToast("Lote creado correctamente.");
      }
      fetchLotes();
      cerrarModales();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error al procesar la solicitud.", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarEliminar() {
    if (!loteSeleccionado) return;
    const token = getCookie("token");
    setEnviando(true);
    try {
      await api.lotes.delete(token, loteSeleccionado.id_lote);
      showToast(`Lote "${loteSeleccionado.lote}" eliminado.`);
      fetchLotes(); cerrarModales();
    } catch {
      showToast("Error al eliminar el lote.", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function sincronizarLotes() {
    const token = getCookie("token");
    try {
      setSincronizando(true);
      await api.lotes.sincronizarTodos(token, user?.id_productor ? Number(user.id_productor) : undefined);
      await fetchLotes();
      showToast("Sincronización completa.");
    } catch (error) {
      const msg = error?.message || "Error al sincronizar.";
      showToast(msg, "error");
    } finally {
      setSincronizando(false);
    }
  }

  async function sincronizarProductoLote(lote) {
    const token = getCookie("token");
    setSincronizandoProductoIds((prev) => new Set(prev).add(lote.id_lote));
    try {
      await api.lotes.sincronizarProducto(token, lote.id_lote);
      showToast(
        lote.productoVinculado
          ? `Producto del lote ${lote.lote} actualizado.`
          : `Producto creado para el lote ${lote.lote}.`
      );
      await fetchLotes();
    } catch (error) {
      showToast(error?.message || "Error al sincronizar el producto.", "error");
    } finally {
      setSincronizandoProductoIds((prev) => {
        const next = new Set(prev);
        next.delete(lote.id_lote);
        return next;
      });
    }
  }

  async function guardarStock({ idLote, cantidad, tipo, motivo }) {
    const token = getCookie("token");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/lotes/${idLote}/stock`,
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ cantidad, tipo, motivo }) },
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data?.message ?? "Error al ajustar stock.");
    }
    showToast("Stock actualizado correctamente.");
    await fetchLotes();
  }

  if (loading && lotes.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
      </div>
    );
  }

  return (
    <div data-tour="lotes-section" className="mx-auto w-full max-w-[1200px] space-y-5">

      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Mis Lotes</h1>
          <p className="text-sm text-[#3D6B3F]/70">Gestión de producción y existencias</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={sincronizarLotes} disabled={sincronizando}
            className="flex items-center gap-2 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm font-medium text-[#3D6B3F] transition hover:bg-[#C5CFB0]/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "success" })} />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Total Lotes" value={stats.total} icon={<FlaskConical size={18} />} />
        <StatCard title="Disponibles / Activos" value={stats.disponibles} icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} placeholder="Buscar lote, producto..." />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="Todos">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="activo">Activo</option>
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
            <option value="Todos">Todos los años</option>
            {yearsDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => { setSearch(""); setStatus("Todos"); setYear("Todos"); }}
            className="rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm font-medium text-[#3D6B3F]/70 transition hover:bg-[#C5CFB0]/30"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#1F3A2E]">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                {["# Lote", "Marca", "Especie", "Grado Alc.", "Cantidad", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-5 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center bg-white">
                    <FlaskConical size={32} className="mx-auto mb-2 text-[#C5CFB0]" />
                    <span className="text-sm text-[#3D6B3F]/60">No se encontraron lotes.</span>
                  </td>
                </tr>
              ) : (
                paginatedLotes.map((item) => (
                  <tr
                    key={item.id_lote}
                    className="border-t border-[#C5CFB0]/30 text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20"
                  >
                    <td className="px-5 py-4 font-medium text-[#1F3A2E] whitespace-nowrap">{item.lote}</td>
                    <td className="px-5 py-4 text-[#3D6B3F]/80">{item.marca}</td>
                    <td className="px-5 py-4 text-[#3D6B3F]/80">{item.producto}</td>
                    <td className="px-5 py-4 text-[#3D6B3F]/80">{item.grado_alcohol}</td>
                    <td className="px-5 py-4 text-[#3D6B3F]/80">{item.cantidad}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#A8C26B]/20 text-[#3D6B3F]">
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <LotesAcciones
                        lote={item}
                        onVer={abrirVer}
                        onEliminar={abrirEliminar}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <p className="text-sm text-[#1F3A2E]">
            Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredLotes.length)}</span> de <span className="font-semibold">{filteredLotes.length}</span> lotes
          </p>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}

      {/* Modales */}
      {(isModalOpen || modalEditar) && (
        <ModalLote
          title={modalEditar ? "Editar Lote" : "Nuevo Lote"}
          subtitle={modalEditar ? `Actualizando ${loteSeleccionado?.lote}` : "Ingresa los datos de producción"}
          onClose={cerrarModales}
          onSubmit={guardarLote}
          form={form}
          setForm={setForm}
          loading={enviando}
          footerActionLabel={modalEditar ? "Guardar Cambios" : "Crear Lote"}
          categorias={categorias}
        />
      )}

      {modalVer && loteSeleccionado && (
        <DetalleLoteModal lote={loteSeleccionado} onClose={cerrarModales} />
      )}

      {modalEliminar && loteSeleccionado && (
        <EliminarLoteModal
          lote={loteSeleccionado}
          onClose={cerrarModales}
          onConfirm={confirmarEliminar}
          loading={enviando}
        />
      )}

      {modalStock && loteStock && (
        <ModalStock
          lote={loteStock}
          onClose={() => { setModalStock(false); setLoteStock(null); }}
          onGuardar={guardarStock}
        />
      )}
    </div>
  );
}

// ─── Modal: Crear / Editar ────────────────────────────────────────────────────

function ModalLote({ title, subtitle, onClose, onSubmit, form, setForm, footerActionLabel, loading, categorias }) {
  const f = (key, val) => setForm({ ...form, [key]: val });
  const necesitaComplemento = CLASES_CON_COMPLEMENTO.includes(form.clase);
  const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#3D6B3F]/70";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#C5CFB0]/50">
          <div>
            <h2 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">{title}</h2>
            <p className="text-xs text-[#3D6B3F]/60 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[#3D6B3F]/50 hover:bg-[#C5CFB0]/30">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">

          <div>
            <label className={labelCls}>Código del Lote *</label>
            <input required value={form.lote} onChange={(e) => f("lote", e.target.value)} className={inputCls} placeholder="Ej. CRM-2024-006" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Variedad / Tipo</label>
              <input list="agaves" value={form.tipoProducto} onChange={(e) => f("tipoProducto", e.target.value)} className={inputCls} placeholder="Mezcal Espadín" />
              <datalist id="agaves">{AGAVE_SUGERIDOS.map(a => <option key={a} value={a} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Especie Científica</label>
              <input value={form.especieCientifica} onChange={(e) => f("especieCientifica", e.target.value)} className={inputCls} placeholder="A. angustifolia Haw" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Categoría</label>
              <select value={form.categoria} onChange={(e) => f("categoria", e.target.value)} className={inputCls}>
                {categorias.length > 0
                  ? categorias.map(c => <option key={c} value={c}>{c}</option>)
                  : <option value="">Cargando...</option>}
              </select>
            </div>
            <div>
              <label className={labelCls}>Clase</label>
              <select value={form.clase} onChange={(e) => {
                const nueva = e.target.value;
                setForm((prev) => ({ ...prev, clase: nueva, claseComplemento: CLASES_CON_COMPLEMENTO.includes(nueva) ? prev.claseComplemento : "" }));
              }} className={inputCls}>
                {CLASES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {necesitaComplemento && (
            <div>
              <label className={labelCls}>{form.clase === "Abocado con" ? "Abocado con..." : "Destilado con..."}</label>
              <input value={form.claseComplemento} onChange={(e) => f("claseComplemento", e.target.value)} className={inputCls}
                placeholder={form.clase === "Abocado con" ? "Ej. Miel, Frutas, Pechuga..." : "Ej. Pechuga, Carne, Frutas..."} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cantidad (L)</label>
              <input type="number" step="0.1" min="0" value={form.cantidad} onChange={(e) => f("cantidad", e.target.value)} className={inputCls} placeholder="1500" />
            </div>
            <div>
              <label className={labelCls}>Fecha Producción</label>
              <input type="date" value={form.fechaProduccion} onChange={(e) => f("fechaProduccion", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Sitio de Producción</label>
            <input value={form.sitio} onChange={(e) => f("sitio", e.target.value)} className={inputCls} placeholder="Ej. Miahuatlán, Oaxaca" />
          </div>

          <div>
            <label className={labelCls}>Descripción / Notas</label>
            <textarea value={form.descripcion} onChange={(e) => f("descripcion", e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Notas de producción, sabor, proceso..." />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#C5CFB0]/50">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#C5CFB0] px-4 py-2 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/30">
              Cancelar
            </button>
            <button disabled={loading} type="submit" className="flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#1F3A2E] disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {footerActionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Ver Detalle ───────────────────────────────────────────────────────

function DetalleLoteModal({ lote, onClose }) {
  const rows = [
    ["Producto / Variedad", lote.producto],
    ["Especie Científica", lote.especieCientifica],
    ["Categoría", lote.categoria],
    ["Clase", lote.clase],
    ["Marca", lote.marca],
    ["Grado Alcohólico", lote.grado_alcohol],
    ["Cantidad", lote.cantidad],
    ["Sitio de Producción", lote.sitio],
    ["Fecha de Producción", lote.fecha],
    ["Estado", lote.estado],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-[#C5CFB0]/50">
          <h2 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Detalles: {lote.lote}</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {rows.map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3D6B3F]/50">{label}</p>
              <p className="mt-0.5 font-medium text-[#1F3A2E]">{value || "—"}</p>
            </div>
          ))}
          <div className="col-span-2 mt-2 border-t border-[#C5CFB0]/50 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3D6B3F]/50">Descripción</p>
            <p className="mt-0.5 text-sm text-[#3D6B3F]/80">
              {lote.originalData?.descripcion || lote.originalData?.datos_api?.descripcion || "Sin notas adicionales."}
            </p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full rounded-xl border border-[#C5CFB0] py-2.5 text-sm font-semibold text-[#1F3A2E] transition hover:bg-[#C5CFB0]/30">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Eliminar ──────────────────────────────────────────────────────────

function EliminarLoteModal({ lote, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Trash2 size={24} />
        </div>
        <h3 className="text-lg font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">¿Eliminar lote?</h3>
        <p className="mt-1 text-sm text-[#3D6B3F]/70">
          Esta acción borrará el lote <b>{lote.lote}</b> de forma permanente.
        </p>
        <div className="mt-6 flex gap-3 border-t border-[#C5CFB0]/50 pt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#C5CFB0] py-2.5 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/30">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
