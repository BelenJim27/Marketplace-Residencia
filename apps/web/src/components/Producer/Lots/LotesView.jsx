"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Trash2, Loader2, FlaskConical, CheckCircle2, 
  RefreshCw, AlertCircle, Check, X,
} from "lucide-react";
import LotesAcciones from "./LotesAcciones";
import { ModalStock } from "./ModalStock";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

// ─── Constantes ───────────────────────────────────────────────────────────────

// Se eliminaron: en proceso, finalizado, rechazado, vendido
const statusStyles = {
  disponible:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  activo:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const AGAVE_SUGERIDOS = [
  "Mezcal Espadín", "Tobalá", "Cuishe", "Madrecuixe",
  "Tepeztate", "Jabalí", "Mexicano", "Arroqueño", "Zotolero", "Pulquero",
];

const inputCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400";

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

function Toast({ msg, type = "success", onClose }) {
  if (!msg) return null;
  const isError = type === "error";
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-sm transition-all
      ${isError 
        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" 
        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"}`}>
      {isError ? <AlertCircle size={15} /> : <Check size={15} />}
      <span className="flex-1">{msg}</span>
      <button type="button" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function StatCard({ title, value, icon, color = "green" }) {
  const colors = {
    green:  "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
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
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [year, setYear] = useState("Todos");

  const initialForm = {
    lote: "", 
    tipoProducto: "Mezcal Espadín", 
    cantidad: "", 
    fechaProduccion: "", 
    descripcion: ""
  };
  const [form, setForm] = useState(initialForm);

  const [toast, setToast] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  };

  const fetchLotes = useCallback(async () => {
    if (!user?.id_productor) return;
    try {
      setLoading(true);
      const data = await api.lotes.getByProductor(Number(user.id_productor));
      const mappedLotes = data
        .filter((l) => !l.eliminado_en)
        .map((l) => ({
          id_lote: l.id_lote,
          lote: l.codigo_lote,
          producto: l.nombre_comun || l.marca || l.datos_api?.variedad || "Mezcal",
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
    } catch (error) {
      showToast("No fue posible cargar los lotes.", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id_productor]);

  useEffect(() => { fetchLotes(); }, [fetchLotes]);

  const yearsDisponibles = useMemo(() => 
    Array.from(new Set(lotes.map((l) => l.year).filter((y) => y !== "-")))
    .sort((a, b) => b - a), [lotes]
  );

  // Estadísticas simplificadas: solo Total y Disponibles
  const stats = useMemo(() => ({
    total: lotes.length,
    disponibles: lotes.filter((l) => ["disponible", "activo"].includes(l.estado.toLowerCase())).length,
  }), [lotes]);

  const filteredLotes = useMemo(() => {
    return lotes.filter((item) => {
      const matchesSearch = `${item.lote} ${item.producto} ${item.marca}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "Todos" || item.estado.toLowerCase() === status.toLowerCase();
      const matchesYear = year === "Todos" || item.year === year;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [lotes, search, status, year]);

  const abrirVer = (lote) => { setLoteSeleccionado(lote); setModalVer(true); };
  
  const abrirEditar = (lote) => {
    setLoteSeleccionado(lote);
    setForm({
      lote: lote.lote,
      tipoProducto: lote.producto,
      cantidad: parseFloat(lote.cantidad) || "",
      fechaProduccion: lote.fecha !== "-" ? lote.fecha : "",
      descripcion: lote.originalData?.descripcion || lote.originalData?.datos_api?.descripcion || "",
    });
    setModalEditar(true);
  };

  const abrirEliminar = (lote) => { setLoteSeleccionado(lote); setModalEliminar(true); };

  const abrirStock = (lote) => { setLoteStock(lote); setModalStock(true); };

  const cerrarModales = () => {
    setIsModalOpen(false);
    setModalVer(false);
    setModalEditar(false);
    setModalEliminar(false);
    setLoteSeleccionado(null);
    setForm(initialForm);
  };

  async function guardarLote(e) {
    e.preventDefault();
    if (!user?.id_productor) return;
    const token = getCookie("token");
    setEnviando(true);

    const payload = {
      id_productor: Number(user.id_productor),
      codigo_lote: form.lote,
      volumen_total: Number(form.cantidad) || null,
      fecha_produccion: form.fechaProduccion || null,
      estado_lote: modalEditar ? loteSeleccionado.estado : "disponible",
      datos_api: { variedad: form.tipoProducto, descripcion: form.descripcion },
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
      fetchLotes();
      cerrarModales();
    } catch (error) {
      showToast("Error al eliminar el lote.", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function sincronizarLotes() {
    const token = getCookie("token");
    try {
      setSincronizando(true);
      await api.lotes.sincronizarTodos(token);
      await fetchLotes();
      showToast("Sincronización completa.");
    } catch (error) {
      showToast("Error al sincronizar.", "error");
    } finally {
      setSincronizando(false);
    }
  }

  async function guardarStock({ idLote, cantidad, tipo, motivo }) {
    const token = getCookie("token");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/lotes/${idLote}/stock`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cantidad, tipo, motivo }),
      },
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Mis Lotes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de producción y existencias</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={sincronizarLotes} disabled={sincronizando}
              className="flex items-center gap-2 rounded-lg border border-green-500 px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
            <button 
              onClick={() => { setForm(initialForm); setIsModalOpen(true); }}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 transition-colors"
            >
              + Nuevo Lote
            </button>
          </div>
        </div>

        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "success" })} />

        {/* Stats - Tarjetas "En proceso" y "Finalizados" eliminadas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard title="Total Lotes" value={stats.total} icon={<FlaskConical size={18} />} color="blue" />
          <StatCard title="Disponibles / Activos" value={stats.disponibles} icon={<CheckCircle2 size={18} />} color="green" />
        </div>

        {/* Filtros - Opciones de estado reducidas */}
        <div className="grid gap-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)} 
            className={inputCls} placeholder="Buscar lote, producto..." 
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="Todos">Todos los estados</option>
            {Object.keys(statusStyles).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
            <option value="Todos">Todos los años</option>
            {yearsDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={() => { setSearch(""); setStatus("Todos"); setYear("Todos"); }}
            className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {["# Lote", "Especie", "Marca", "Grado Alc.", "Cantidad", "Fecha", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <FlaskConical size={32} className="mx-auto mb-2 opacity-20" />
                    No se encontraron lotes.
                  </td>
                </tr>
              ) : (
                filteredLotes.map((item) => (
                  <tr key={item.id_lote} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium">{item.lote}</td>
                    <td className="px-4 py-4 text-sm">{item.producto}</td>
                    <td className="px-4 py-4 text-sm">{item.marca}</td>
                    <td className="px-4 py-4 text-sm">{item.grado_alcohol}</td>
                    <td className="px-4 py-4 text-sm">{item.cantidad}</td>
                    <td className="px-4 py-4 text-sm">{item.fecha}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusStyles[item.estado.toLowerCase()] || "bg-gray-100"}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <LotesAcciones
                        lote={item}
                        onVer={abrirVer}
                        onEditar={abrirEditar}
                        onEliminar={abrirEliminar}
                        onGestionarStock={abrirStock}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}

// ... (Sub-componentes Modales se mantienen igual pero reflejando la lógica de estados base)

function ModalLote({ title, subtitle, onClose, onSubmit, form, setForm, footerActionLabel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex justify-between">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Código del Lote</label>
              <input required value={form.lote} onChange={(e) => setForm({...form, lote: e.target.value})} className={inputCls} placeholder="Ej. ESP-2024-01" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Tipo / Variedad</label>
              <input list="agaves" value={form.tipoProducto} onChange={(e) => setForm({...form, tipoProducto: e.target.value})} className={inputCls} />
              <datalist id="agaves">{AGAVE_SUGERIDOS.map(a => <option key={a} value={a} />)}</datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Cantidad (L)</label>
              <input type="number" step="0.1" value={form.cantidad} onChange={(e) => setForm({...form, cantidad: e.target.value})} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Fecha Producción</label>
              <input type="date" value={form.fechaProduccion} onChange={(e) => setForm({...form, fechaProduccion: e.target.value})} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Descripción</label>
              <textarea value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} className={`${inputCls} h-20 resize-none`} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500">Cancelar</button>
            <button disabled={loading} type="submit" className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {footerActionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetalleLoteModal({ lote, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Detalles: {lote.lote}</h2>
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="col-span-1"><p className="text-xs text-gray-400 uppercase">Producto</p><p>{lote.producto}</p></div>
          <div className="col-span-1"><p className="text-xs text-gray-400 uppercase">Marca</p><p>{lote.marca}</p></div>
          <div className="col-span-1"><p className="text-xs text-gray-400 uppercase">Grado</p><p>{lote.grado_alcohol}</p></div>
          <div className="col-span-1"><p className="text-xs text-gray-400 uppercase">Cantidad</p><p>{lote.cantidad}</p></div>
          <div className="col-span-1"><p className="text-xs text-gray-400 uppercase">Sitio</p><p>{lote.sitio}</p></div>
          <div className="col-span-1"><p className="text-xs text-gray-400 uppercase">Fecha</p><p>{lote.fecha}</p></div>
          <div className="col-span-2 border-t pt-2 mt-2">
             <p className="text-xs text-gray-400 uppercase">Descripción</p>
             <p>{lote.originalData?.descripcion || "Sin notas adicionales"}</p>
          </div>
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-gray-100 py-2 text-sm font-bold hover:bg-gray-200 dark:bg-gray-700">Cerrar</button>
      </div>
    </div>
  );
}

function EliminarLoteModal({ lote, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Trash2 size={24} />
        </div>
        <h3 className="text-lg font-bold">¿Eliminar lote?</h3>
        <p className="text-sm text-gray-500 mt-1">Esta acción borrará el lote <b>{lote.lote}</b> de forma permanente.</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border py-2 text-sm font-medium">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
      <p className="font-medium text-gray-800 dark:text-gray-200">{value || "-"}</p>
    </div>
  );
}