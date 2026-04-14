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

  const fetchLotes = useCallback(async () => {
    if (!user?.id_productor) return;
    try {
      setLoading(true);
      const data = await api.lotes.getByProductor(Number(user.id_productor));
      // Filtrar los que no están eliminados y mapear campos
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

  const filteredLotes = useMemo(() => {
    return lotes.filter((item) => {
      const matchesSearch = `${item.lote} ${item.producto}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "Todos" || item.estado === status;
      const matchesYear = !year || item.year === year;
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

  function abrirEditar(lote) {
    setLoteSeleccionado(lote);
    setLoteOriginal(lote.lote);
    setForm({
      lote: lote.lote,
      tipoProducto: lote.producto,
      cantidad: lote.cantidad,
      fechaProduccion: lote.fecha,
      descripcion: "",
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
    setLoteOriginal(null);
  }

  function guardarLote(event) {
    event.preventDefault();
    const nextLote = {
      lote: form.lote,
      producto: form.tipoProducto,
      cantidad: form.cantidad,
      fecha: form.fechaProduccion,
      estado: "Activo",
      year: form.fechaProduccion ? String(new Date(form.fechaProduccion).getFullYear()) : year,
    };

    if (modalEditar && loteOriginal) {
      setLotes((current) => current.map((item) => (item.lote === loteOriginal ? { ...item, ...nextLote } : item)));
    } else {
      setLotes((current) => [nextLote, ...current]);
    }

    cerrarModales();
  }

  function confirmarEliminar() {
    if (!loteSeleccionado) return;
    setLotes((current) => current.filter((item) => item.lote !== loteSeleccionado.lote));
    cerrarModales();
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
              setLoteOriginal(null);
              setIsModalOpen(true);
            }}
            className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            + Nuevo Lote
          </button>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-10 pr-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Buscar lote..."
            />
          </div>

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
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300"># Lote</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Fecha de registro</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredLotes.map((item) => (
                <tr key={item.id_lote || item.lote} className="hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
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

        {isModalOpen ? (
          <ModalLote
            title="Nuevo Lote"
            subtitle="Registra un nuevo lote de producción"
            onClose={cerrarModales}
            onSubmit={guardarLote}
            form={form}
            setForm={setForm}
            footerActionLabel="Guardar Lote"
          />
        ) : null}

        {modalVer && loteSeleccionado ? (
          <DetalleLoteModal lote={loteSeleccionado} onClose={cerrarModales} statusStyles={statusStyles} />
        ) : null}

        {modalEditar && loteSeleccionado ? (
          <ModalLote
            title="Editar Lote"
            subtitle={`Actualiza los datos de ${loteSeleccionado.lote}`}
            onClose={cerrarModales}
            onSubmit={guardarLote}
            form={form}
            setForm={setForm}
            footerActionLabel="Guardar cambios"
          />
        ) : null}

        {modalEliminar && loteSeleccionado ? (
          <EliminarLoteModal lote={loteSeleccionado} onClose={cerrarModales} onConfirm={confirmarEliminar} />
        ) : null}
      </div>
    </div>
  );
}

function ModalLote({ title, subtitle, onClose, onSubmit, form, setForm, footerActionLabel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out dark:bg-gray-800 dark:text-gray-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Nombre del lote</label>
            <input value={form.lote} onChange={(event) => setForm((current) => ({ ...current, lote: event.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Tipo de producto</label>
            <select value={form.tipoProducto} onChange={(event) => setForm((current) => ({ ...current, tipoProducto: event.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400">
              <option>Mezcal Espadín</option>
              <option>Tobalá</option>
              <option>Cuishe</option>
              <option>Madrecuixe</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Cantidad en litros</label>
            <input type="number" value={form.cantidad} onChange={(event) => setForm((current) => ({ ...current, cantidad: event.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Fecha de producción</label>
            <input type="date" value={form.fechaProduccion} onChange={(event) => setForm((current) => ({ ...current, fechaProduccion: event.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Descripción</label>
            <textarea rows={4} value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div className="md:col-span-2 mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
            <button type="submit" className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600">{footerActionLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetalleLoteModal({ lote, onClose, statusStyles }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out dark:bg-gray-800 dark:text-gray-100" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Detalle del Lote</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lote.lote}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Producto" value={lote.producto} />
          <Info label="Cantidad" value={lote.cantidad} />
          <Info label="Fecha de registro" value={lote.fecha} />
          <div>
            <p className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Estado</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[lote.estado] || "bg-gray-100 text-gray-600"}`}>{lote.estado}</span>
          </div>
        </div>

        {lote.originalData?.sitio && (
          <div className="mt-4">
            <Info label="Sitio de producción" value={lote.originalData.sitio} />
          </div>
        )}

        {lote.originalData?.datos_api?.descripcion && (
          <div className="mt-4">
            <Info label="Descripción" value={lote.originalData.datos_api.descripcion} />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function EliminarLoteModal({ lote, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out dark:bg-gray-800 dark:text-gray-100" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div className="grid size-12 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300">
            <Trash2 className="size-6" />
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">¿Eliminar este lote?</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer. El lote {lote.lote} será eliminado permanentemente.</p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">{value}</p>
    </div>
  );
}
