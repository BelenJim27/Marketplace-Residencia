"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import LotesAcciones from "./LotesAcciones";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

const statusStyles = {
  disponible: "bg-green-100 text-green-700",
  activo: "bg-green-100 text-green-700",
  "en proceso": "bg-yellow-100 text-yellow-700",
  finalizado: "bg-gray-100 text-gray-600",
  rechazado: "bg-red-100 text-red-700",
  vendido: "bg-blue-100 text-blue-700",
};

export default function LotesView() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVer, setModalVer] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [year, setYear] = useState("Todos");
  const [form, setForm] = useState({
    lote: "",
    tipoProducto: "Mezcal Espadín",
    cantidad: "",
    fechaProduccion: "",
    descripcion: "",
  });

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
            : l.volumen_total
              ? `${l.volumen_total} L`
              : "-",
          fecha: l.fecha_produccion
            ? l.fecha_produccion.split("T")[0]
            : l.creado_en
              ? l.creado_en.split("T")[0]
              : "-",
          estado: l.estado_lote || "disponible",
          year: l.fecha_produccion
            ? String(new Date(l.fecha_produccion).getFullYear())
            : l.creado_en
              ? String(new Date(l.creado_en).getFullYear())
              : "-",
          originalData: l,
        }));
      setLotes(mappedLotes);
    } catch (error) {
      console.error("Error fetching lotes:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id_productor]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  const filteredLotes = useMemo(() => {
    return lotes.filter((item) => {
      const matchesSearch = `${item.lote} ${item.producto} ${item.marca}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        status === "Todos" || item.estado.toLowerCase() === status.toLowerCase();
      const matchesYear = year === "Todos" || item.year === year;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [lotes, search, status, year]);

  function abrirVer(lote) {
    setLoteSeleccionado(lote);
    setModalVer(true);
  }

  function abrirEditar(lote) {
    setLoteSeleccionado(lote);
    setForm({
      lote: lote.lote,
      tipoProducto: lote.producto,
      cantidad: parseFloat(lote.cantidad) || "",
      fechaProduccion: lote.fecha,
      descripcion: lote.originalData?.descripcion || "",
    });
    setModalEditar(true);
  }

  function abrirEliminar(lote) {
    setLoteSeleccionado(lote);
    setModalEliminar(true);
  }

  function cerrarModales() {
    setIsModalOpen(false);
    setModalVer(false);
    setModalEditar(false);
    setModalEliminar(false);
    setLoteSeleccionado(null);
  }

  async function guardarLote(event) {
    event.preventDefault();
    if (!user?.id_productor) return;

    const token = getCookie("token");
    const payload = {
      id_productor: Number(user.id_productor),
      codigo_lote: form.lote,
      volumen_total: Number(form.cantidad),
      fecha_produccion: form.fechaProduccion || null,
      estado_lote: modalEditar ? loteSeleccionado.estado : "disponible",
      datos_api: {
        variedad: form.tipoProducto,
        descripcion: form.descripcion,
      },
    };

    try {
      if (modalEditar && loteSeleccionado) {
        await api.lotes.update(token, loteSeleccionado.id_lote, payload);
      } else {
        await api.lotes.create(token, payload);
      }
      fetchLotes();
      cerrarModales();
    } catch (error) {
      console.error("Error saving lote:", error);
      alert("Error al guardar el lote");
    }
  }

  async function confirmarEliminar() {
    if (!loteSeleccionado) return;
    const token = getCookie("token");
    try {
      await api.lotes.delete(token, loteSeleccionado.id_lote);
      fetchLotes();
      cerrarModales();
    } catch (error) {
      console.error("Error deleting lote:", error);
      alert("Error al eliminar el lote");
    }
  }

  async function sincronizarLotes() {
    const token = getCookie("token");
    try {
      setSincronizando(true);
      await api.lotes.sincronizarTodos(token);
      await fetchLotes();
      alert("Lotes sincronizados correctamente");
    } catch (error) {
      console.error("Error sincronizando:", error);
      alert("Error al sincronizar lotes");
    } finally {
      setSincronizando(false);
    }
  }

  if (loading && lotes.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100">
      <div className="mx-auto max-w-7xl p-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Mis Lotes</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gestiona los lotes de producción registrados
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={sincronizarLotes}
              disabled={sincronizando}
              className="flex items-center gap-2 rounded-lg border border-green-500 px-4 py-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
            >
              {sincronizando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span></span>
              )}
              Sincronizar
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ lote: "", tipoProducto: "Mezcal Espadín", cantidad: "", fechaProduccion: "", descripcion: "" });
                setModalEditar(false);
                setIsModalOpen(true);
              }}
              className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              + Nuevo Lote
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 grid gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm lg:grid-cols-[1.5fr_1fr_1fr]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Buscar lote, producto, marca..."
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="Todos">Todos</option>
            <option value="disponible">Disponible</option>
            <option value="activo">Activo</option>
            <option value="en proceso">En proceso</option>
            <option value="finalizado">Finalizado</option>
            <option value="vendido">Vendido</option>
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="Todos">Todos los años</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["# Lote", "Especie", "Marca", "Grado Alc.", "Cantidad", "Sitio", "Fecha", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {filteredLotes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                      No hay lotes registrados.
                    </td>
                  </tr>
                ) : (
                  filteredLotes.map((item) => (
                    <tr key={item.id_lote} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{item.lote}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.producto}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.marca}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.grado_alcohol}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.cantidad}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.sitio}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.fecha}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.estado.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <LotesAcciones lote={item} onVer={abrirVer} onEditar={abrirEditar} onEliminar={abrirEliminar} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modales */}
        {isModalOpen && (
          <ModalLote
            title="Nuevo Lote"
            subtitle="Registra un nuevo lote de producción"
            onClose={cerrarModales}
            onSubmit={guardarLote}
            form={form}
            setForm={setForm}
            footerActionLabel="Guardar Lote"
          />
        )}

        {modalVer && loteSeleccionado && (
          <DetalleLoteModal lote={loteSeleccionado} onClose={cerrarModales} statusStyles={statusStyles} />
        )}

        {modalEditar && loteSeleccionado && (
          <ModalLote
            title="Editar Lote"
            subtitle={`Actualiza los datos de ${loteSeleccionado.lote}`}
            onClose={cerrarModales}
            onSubmit={guardarLote}
            form={form}
            setForm={setForm}
            footerActionLabel="Guardar cambios"
          />
        )}

        {modalEliminar && loteSeleccionado && (
          <EliminarLoteModal lote={loteSeleccionado} onClose={cerrarModales} onConfirm={confirmarEliminar} />
        )}
      </div>
    </div>
  );
}

function ModalLote({ title, subtitle, onClose, onSubmit, form, setForm, footerActionLabel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Nombre del lote</label>
            <input value={form.lote} onChange={(e) => setForm((c) => ({ ...c, lote: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Tipo de producto</label>
            <select value={form.tipoProducto} onChange={(e) => setForm((c) => ({ ...c, tipoProducto: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option>Mezcal Espadín</option>
              <option>Tobalá</option>
              <option>Cuishe</option>
              <option>Madrecuixe</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Cantidad en litros</label>
            <input type="number" value={form.cantidad} onChange={(e) => setForm((c) => ({ ...c, cantidad: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Fecha de producción</label>
            <input type="date" value={form.fechaProduccion} onChange={(e) => setForm((c) => ({ ...c, fechaProduccion: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Descripción</label>
            <textarea rows={3} value={form.descripcion} onChange={(e) => setForm((c) => ({ ...c, descripcion: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="md:col-span-2 mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
            <button type="submit" className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600">{footerActionLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetalleLoteModal({ lote, onClose, statusStyles }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Detalle del Lote</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lote.lote}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Especie" value={lote.producto} />
          <Info label="Marca" value={lote.marca} />
          <Info label="Grado de alcohol" value={lote.grado_alcohol} />
          <Info label="Cantidad" value={lote.cantidad} />
          <Info label="Sitio de producción" value={lote.sitio} />
          <Info label="Fecha" value={lote.fecha} />
          <Info label="Nombre científico" value={lote.especie_cientifica} />
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">Estado</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[lote.estado.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
              {lote.estado}
            </span>
          </div>
        </div>
        {lote.originalData?.descripcion && (
          <div className="mt-4">
            <Info label="Descripción" value={lote.originalData.descripcion} />
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function EliminarLoteModal({ lote, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 grid size-12 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300">
          <Trash2 className="size-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">¿Eliminar este lote?</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Esta acción no se puede deshacer. El lote <strong>{lote.lote}</strong> será eliminado permanentemente.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">{value || "-"}</p>
    </div>
  );
}