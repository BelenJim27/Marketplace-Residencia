"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Loader2, Search, Filter, FileText, User, Table, Clock } from "lucide-react";

interface Auditoria {
  id_auditoria: string;
  id_usuario?: string;
  accion: string;
  tabla_afectada: string;
  registro_id?: string;
  valor_anterior?: Record<string, unknown>;
  valor_nuevo?: Record<string, unknown>;
  ip_origen?: string;
  fecha: string;
  usuarios?: { nombre: string; email: string };
}

export default function AuditoriaUI() {
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccion, setFilterAccion] = useState("todas");
  const [filterTabla, setFilterTabla] = useState("todas");

  const getToken = () => (typeof window !== "undefined" ? getCookie("token") : null);

  useEffect(() => {
    fetchAuditoria();
  }, []);

  const fetchAuditoria = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      const data = await api.auditoria.getAll();
      setAuditoria(data as Auditoria[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar auditoría");
    } finally {
      setLoading(false);
    }
  };

  const accionesUnicas = [...new Set(auditoria.map((a) => a.accion))];
  const tablasUnicas = [...new Set(auditoria.map((a) => a.tabla_afectada))];

  const filteredAuditoria = auditoria.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tabla_afectada.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.usuarios?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.usuarios?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccion = filterAccion === "todas" || item.accion === filterAccion;
    const matchesTabla = filterTabla === "todas" || item.tabla_afectada === filterTabla;
    return matchesSearch && matchesAccion && matchesTabla;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAccionColor = (accion: string) => {
    const colors: Record<string, string> = {
      CREATE:   "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
      UPDATE:   "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
      DELETE:   "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
      LOGIN:    "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
      LOGOUT:   "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
      REGISTER: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
    };
    return colors[accion] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
  };

  const selectClass =
    "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchAuditoria}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">

      {/* Título */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Auditoría
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredAuditoria.length} registros
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <select
            value={filterAccion}
            onChange={(e) => setFilterAccion(e.target.value)}
            className={selectClass}
          >
            <option value="todas">Todas las acciones</option>
            {accionesUnicas.map((acc) => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>

          <select
            value={filterTabla}
            onChange={(e) => setFilterTabla(e.target.value)}
            className={selectClass}
          >
            <option value="todas">Todas las tablas</option>
            {tablasUnicas.map((tab) => (
              <option key={tab} value={tab}>{tab}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Table className="w-4 h-4 inline mr-1" />
                Acción
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tabla
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <User className="w-4 h-4 inline mr-1" />
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Registro ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Clock className="w-4 h-4 inline mr-1" />
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {filteredAuditoria.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay registros de auditoría
                </td>
              </tr>
            ) : (
              filteredAuditoria.map((item) => (
                <tr key={item.id_auditoria} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccionColor(item.accion)}`}>
                      {item.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {item.tabla_afectada}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-gray-900 dark:text-gray-100">
                      {item.usuarios?.nombre || "Sistema"}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      {item.usuarios?.email || ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {item.registro_id || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(item.fecha)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {item.ip_origen || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}