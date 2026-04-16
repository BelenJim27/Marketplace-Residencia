"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import LotesAcciones from "./LotesAcciones";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

const statusStyles = {
  Activo: "bg-green-100 text-green-700",
  "En proceso": "bg-yellow-100 text-yellow-700",
  Finalizado: "bg-gray-100 text-gray-600",
  Rechazado: "bg-red-100 text-red-700",
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({
    lote: "",
    tipoProducto: "Mezcal Espadín",
    cantidad: "",
    fechaProduccion: "",
    descripcion: "",
  });

  // CARGAR LOTES DESDE API
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
          producto: l.datos_api?.variedad || "Mezcal",
          cantidad: `${l.volumen_total} L`,
          fecha: l.fecha_produccion ? l.fecha_produccion.split("T")[0] : "-",
          estado: l.estado_lote || "Activo",
          year: l.fecha_produccion ? String(new Date(l.fecha_produccion).getFullYear()) : "-",
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

  // FILTROS
  const filteredLotes = useMemo(() => {
    return lotes.filter((item) => {
      const matchesSearch = `${item.lote} ${item.producto}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "Todos" || item.estado === status;
      const matchesYear = !year || item.year === year;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [lotes, search, status, year]);

  // FUNCIONES DE MODALES (CORREGIDAS)
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
      descripcion: lote.originalData?.datos_api?.descripcion || "",
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

  // GUARDAR EN BD
  async function guardarLote(event) {
    event.preventDefault();
    if (!user?.id_productor) return;

    const token = getCookie("token");
    const payload = {
      id_productor: Number(user.id_productor),
      codigo_lote: form.lote,
      volumen_total: Number(form.cantidad),
      fecha_produccion: form.fechaProduccion,
      estado_lote: modalEditar ? loteSeleccionado.estado : "Activo",
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

  // ELIMINAR EN BD
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
        <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Mis Lotes</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestiona los lotes de producción registrados</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({
                lote: "",
                tipoProducto: "Mezcal Espadín",
                cantidad: "",
                fechaProduccion: "",
                descripcion: "",
              });
              setModalEditar(false);
              setIsModalOpen(true);
            }}
            className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            + Nuevo Lote
          </button>
        </div>

        {/* BUSCADOR Y FILTROS */}
        <div className="mb-6 grid gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm lg:grid-cols-[1.5fr_1fr_1fr]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Buscar lote..."
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option>Todos</option>
            <option>Activo</option>
            <option>En proceso</option>
            <option>Finalizado</option>
            <option>Rechazado</option>
          </select>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        {/* TABLA */}
        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300"># Lote</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredLotes.map((item) => (
                <tr key={item.id_lote} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{item.lote}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-200">{item.producto}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-200">{item.cantidad}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-200">{item.fecha}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.estado] || "bg-gray-100 text-gray-600"}`}>{item.estado}</span>
                  </td>
                  <td className="px-6 py-4">
                    <LotesAcciones lote={item} onVer={abrirVer} onEditar={abrirEditar} onEliminar={abrirEliminar} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODALES */}
        {(isModalOpen || modalEditar) && (
          <ModalLote
            title={modalEditar ? "Editar Lote" : "Nuevo Lote"}
            subtitle={modalEditar ? `Actualiza los datos de ${loteSeleccionado?.lote}` : "Registra un nuevo lote"}
            onClose={cerrarModales}
            onSubmit={guardarLote}
            form={form}
            setForm={setForm}
            footerActionLabel={modalEditar ? "Guardar cambios" : "Guardar Lote"}
          />
        )}

        {modalVer && loteSeleccionado && (
          <DetalleLoteModal lote={loteSeleccionado} onClose={cerrarModales} statusStyles={statusStyles} />
        )}

        {modalEliminar && loteSeleccionado && (
          <EliminarLoteModal lote={loteSeleccionado} onClose={cerrarModales} onConfirm={confirmarEliminar} />
        )}
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES (MODALES)
function ModalLote({ title, subtitle, onClose, onSubmit, form, setForm, footerActionLabel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold dark:text-white">{title}</h2>
        <p className="mb-5 text-sm text-gray-500">{subtitle}</p>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <input placeholder="Código del lote" value={form.lote} onChange={(e) => setForm({...form, lote: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <select value={form.tipoProducto} onChange={(e) => setForm({...form, tipoProducto: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-gray-700">
            <option>Mezcal Espadín</option>
            <option>Tobalá</option>
            <option>Cuishe</option>
          </select>
          <input type="number" placeholder="Litros" value={form.cantidad} onChange={(e) => setForm({...form, cantidad: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input type="date" value={form.fechaProduccion} onChange={(e) => setForm({...form, fechaProduccion: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <textarea placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg">{footerActionLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetalleLoteModal({ lote, onClose, statusStyles }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">{lote.lote}</h2>
        <div className="mt-4 space-y-2">
          <p><strong>Producto:</strong> {lote.producto}</p>
          <p><strong>Cantidad:</strong> {lote.cantidad}</p>
          <p><strong>Fecha:</strong> {lote.fecha}</p>
          <p><strong>Estado:</strong> <span className={statusStyles[lote.estado]}>{lote.estado}</span></p>
        </div>
        <button onClick={onClose} className="mt-6 w-full bg-gray-200 py-2 rounded-lg">Cerrar</button>
      </div>
    </div>
  );
}

function EliminarLoteModal({ lote, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white p-6 rounded-2xl dark:bg-gray-800 max-w-sm w-full text-center">
        <Trash2 className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-bold">¿Eliminar lote {lote.lote}?</h2>
        <div className="mt-6 flex justify-center gap-4">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">No, cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg">Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}