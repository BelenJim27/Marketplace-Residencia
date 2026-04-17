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

const initialForm = {
  lote: "",
  tipoProducto: "Mezcal Espadín",
  cantidad: "",
  fechaProduccion: "",
  descripcion: "",
  sitio: "",
  gradoAlcohol: "",
  unidades: "",
  nombreComun: "",
  nombreCientifico: "",
};

function valueOrFallback(value, fallback = "-") {
  if (typeof value === "string") {
    return value.trim() === "" ? fallback : value;
  }
  return value === null || value === undefined || value === "" ? fallback : value;
}

function normalizeStatus(status) {
  if (!status) return "Activo";
  if (status.toLowerCase() === "disponible") return "Activo";
  return status;
}

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
  const [form, setForm] = useState(initialForm);

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
          producto: l.variedad || l.datos_api?.variedad || "Mezcal",
          cantidad: l.volumen_total ? `${l.volumen_total} L` : "-",
          fecha: l.fecha_produccion ? l.fecha_produccion.split("T")[0] : "-",
          estado: normalizeStatus(l.estado_lote),
          year: l.fecha_produccion ? String(new Date(l.fecha_produccion).getFullYear()) : "-",
          sitio: valueOrFallback(l.sitio),
          // ✅ FIX: primero lee columna directa, luego busca en datos_api como fallback
          grado_alcohol: valueOrFallback(l.grado_alcohol ?? l.datos_api?.grado_alcohol),
          unidades: valueOrFallback(l.unidades ?? l.datos_api?.unidades),
          nombre_comun: valueOrFallback(l.nombre_comun ?? l.datos_api?.nombre_comun),
          nombre_cientifico: valueOrFallback(l.nombre_cientifico ?? l.datos_api?.nombre_cientifico),
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
      fechaProduccion: lote.fecha === "-" ? "" : lote.fecha,
      descripcion: lote.originalData?.datos_api?.descripcion || "",
      sitio: lote.originalData?.sitio || "",
      // ✅ FIX: primero columna directa, luego datos_api
      gradoAlcohol: lote.originalData?.grado_alcohol ?? lote.originalData?.datos_api?.grado_alcohol ?? "",
      unidades: lote.originalData?.unidades ?? lote.originalData?.datos_api?.unidades ?? "",
      nombreComun: lote.originalData?.nombre_comun ?? lote.originalData?.datos_api?.nombre_comun ?? "",
      nombreCientifico: lote.originalData?.nombre_cientifico ?? lote.originalData?.datos_api?.nombre_cientifico ?? "",
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
      sitio: form.sitio || null,
      volumen_total: form.cantidad === "" ? null : Number(form.cantidad),
      fecha_produccion: form.fechaProduccion || null,
      estado_lote: modalEditar ? loteSeleccionado.originalData?.estado_lote ?? "disponible" : "disponible",
      // ✅ guardamos también en columnas directas
      grado_alcohol: form.gradoAlcohol === "" ? null : Number(form.gradoAlcohol),
      unidades: form.unidades === "" ? null : Number(form.unidades),
      nombre_comun: form.nombreComun || null,
      nombre_cientifico: form.nombreCientifico || null,
      datos_api: {
        variedad: form.tipoProducto,
        descripcion: form.descripcion,
        grado_alcohol: form.gradoAlcohol === "" ? null : Number(form.gradoAlcohol),
        unidades: form.unidades === "" ? null : Number(form.unidades),
        nombre_comun: form.nombreComun,
        nombre_cientifico: form.nombreCientifico,
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
              setForm(initialForm);
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
        <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800 shadow-sm">
          <table className="min-w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300"># Lote</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Producto</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Cantidad</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Sitio</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Grado Alcohol</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Unidades</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Nombre Común</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Fecha</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Estado</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredLotes.map((item) => (
                <tr key={item.id_lote} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{item.lote}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-200" title={item.producto}>{item.producto}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-200">{item.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-200" title={item.sitio}>{item.sitio}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-200">{item.grado_alcohol}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-200">{item.unidades}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-200" title={item.nombre_comun}>{item.nombre_comun}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-200">{item.fecha}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.estado] || "bg-gray-100 text-gray-600"}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
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
          <input placeholder="Código del lote" value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <select value={form.tipoProducto} onChange={(e) => setForm({ ...form, tipoProducto: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700">
            <option>Mezcal Espadín</option>
            <option>Tobalá</option>
            <option>Cuishe</option>
          </select>
          <input placeholder="Sitio" value={form.sitio} onChange={(e) => setForm({ ...form, sitio: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input type="number" placeholder="Litros" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input type="number" step="0.1" placeholder="Grado de alcohol" value={form.gradoAlcohol} onChange={(e) => setForm({ ...form, gradoAlcohol: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input type="number" placeholder="Unidades" value={form.unidades} onChange={(e) => setForm({ ...form, unidades: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input placeholder="Nombre común del agave" value={form.nombreComun} onChange={(e) => setForm({ ...form, nombreComun: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input placeholder="Nombre científico del agave" value={form.nombreCientifico} onChange={(e) => setForm({ ...form, nombreCientifico: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <input type="date" value={form.fechaProduccion} onChange={(e) => setForm({ ...form, fechaProduccion: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          <textarea placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
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
        <div className="mt-4 space-y-2 text-sm">
          <p><strong>Producto:</strong> {lote.producto}</p>
          <p><strong>Cantidad:</strong> {lote.cantidad}</p>
          <p><strong>Sitio:</strong> {lote.sitio}</p>
          <p><strong>Grado Alcohol:</strong> {lote.grado_alcohol}</p>
          <p><strong>Unidades:</strong> {lote.unidades}</p>
          <p><strong>Nombre Común:</strong> {lote.nombre_comun}</p>
          <p><strong>Nombre Científico:</strong> <em>{lote.nombre_cientifico}</em></p>
          <p><strong>Fecha:</strong> {lote.fecha}</p>
          <p><strong>Estado:</strong> <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[lote.estado] || "bg-gray-100 text-gray-600"}`}>{lote.estado}</span></p>
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