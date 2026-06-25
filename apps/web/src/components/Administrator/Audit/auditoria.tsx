"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { 
  Loader2, Search, Filter, FileText, User, Table, Clock, 
  ChevronLeft, ChevronRight 
} from "lucide-react";

interface Auditoria {
  id_auditoria: string;
  id_usuario?: string;
  accion: string;
  tabla_afectada: string;
  registro_id?: string;
  valor_anterior?: Record<string, unknown>;
  valor_nuevo?: Record<string, unknown>;
  fecha: string;
  usuarios?: { nombre: string; email: string };
}

export default function AuditoriaUI() {
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccion, setFilterAccion] = useState("todas");
  const [filterTabla, setFilterTabla] = useState("todas");

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchAuditoria = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? (getCookie("token") ?? "") : "";
      const data = await api.auditoria.getAll() as any;
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setAuditoria(list as Auditoria[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar auditoría");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditoria();
  }, [fetchAuditoria]);

  // Reiniciar a la página 1 cuando se cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAccion, filterTabla]);

  const accionesUnicas = [...new Set(auditoria.map((a) => a.accion))];
  const tablasUnicas = [...new Set(auditoria.map((a) => a.tabla_afectada))];

  // Calcular la fecha límite (hace 7 días)
  const unaSemanaAtras = new Date();
  unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);

  const filteredAuditoria = auditoria.filter((item) => {
    // 1. Filtrar por antigüedad (Ocultar si tiene más de 1 semana)
    const itemDate = new Date(item.fecha);
    if (itemDate < unaSemanaAtras) return false;

    // 2. Filtros de búsqueda y selectores
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      item.accion.toLowerCase().includes(searchLower) ||
      item.tabla_afectada.toLowerCase().includes(searchLower) ||
      item.usuarios?.nombre.toLowerCase().includes(searchLower) ||
      item.usuarios?.email.toLowerCase().includes(searchLower);
    const matchesAccion = filterAccion === "todas" || item.accion === filterAccion;
    const matchesTabla = filterTabla === "todas" || item.tabla_afectada === filterTabla;
    
    return matchesSearch && matchesAccion && matchesTabla;
  });

  // Lógica de Paginación
  const totalPages = Math.ceil(filteredAuditoria.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAuditoria = filteredAuditoria.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      CREATE:   "bg-[#A8C26B]/20 text-[#3D6B3F] dark:text-[#A8C26B]",
      UPDATE:   "bg-[#C97A3E]/15 text-[#C97A3E]",
      DELETE:   "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
      LOGIN:    "bg-[#1F3A2E]/10 dark:bg-[#1F3A2E]/30 text-[#1F3A2E] dark:text-[#B8DCA8]",
      LOGOUT:   "bg-[#C5CFB0]/30 text-[#3D6B3F]/70 dark:text-[#5A8060]",
      REGISTER: "bg-[#A8C26B]/20 text-[#3D6B3F] dark:text-[#A8C26B]",
    };
    return colors[accion] || "bg-[#C5CFB0]/30 text-[#3D6B3F]/70 dark:text-[#5A8060]";
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2 border border-[#C5CFB0] dark:border-[#2A4830] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent bg-[#F4F0E3] dark:bg-[#111C16] text-[#1F3A2E] dark:text-[#B8DCA8] placeholder-[#3D6B3F]/50 dark:placeholder-[#5A8060]/70 text-sm";
  const selectClass =
    "px-3 py-2 border border-[#C5CFB0] dark:border-[#2A4830] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent bg-[#F4F0E3] dark:bg-[#111C16] text-[#1F3A2E] dark:text-[#B8DCA8] text-sm";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchAuditoria}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3A2E] dark:text-[#B8DCA8] flex items-center gap-2 [font-family:'Playfair_Display',serif]">
            <FileText className="w-6 h-6" />
            Auditoría
          </h1>
          <p className="text-[#3D6B3F]/70 dark:text-[#7A9E6E] text-sm mt-0.5">
            Registro de todas las acciones del sistema
          </p>
        </div>
        <span className="text-sm text-[#3D6B3F]/70 dark:text-[#7A9E6E]">
          {filteredAuditoria.length} registros (Últimos 7 días)
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D6B3F]/50" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-[#3D6B3F]/50" />
          <select
            value={filterAccion}
            onChange={(e) => setFilterAccion(e.target.value)}
            className={selectClass}
          >
            <option value="todas">Todas las acciones</option>
            {accionesUnicas.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>

          <select
            value={filterTabla}
            onChange={(e) => setFilterTabla(e.target.value)}
            className={selectClass}
          >
            <option value="todas">Todas las tablas</option>
            {tablasUnicas.map((tab) => (
              <option key={tab} value={tab}>
                {tab}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#C5CFB0] dark:border-[#2A4830] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-[#1F3A2E] text-xs font-semibold text-white uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">
                <Table className="w-4 h-4 inline mr-1" /> Acción
              </th>
              <th className="px-4 py-3 text-left">Tabla</th>
              <th className="px-4 py-3 text-left">
                <User className="w-4 h-4 inline mr-1" /> Usuario
              </th>
              <th className="px-4 py-3 text-left">Registro ID</th>
              <th className="px-4 py-3 text-left">
                <Clock className="w-4 h-4 inline mr-1" /> Fecha
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#2A4830]/30">
            {paginatedAuditoria.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#3D6B3F]/70 dark:text-[#7A9E6E] text-sm bg-white dark:bg-[#0F1A13]">
                  No hay registros de auditoría recientes
                </td>
              </tr>
            ) : (
              paginatedAuditoria.map((item) => (
                <tr key={item.id_auditoria} className="odd:bg-white dark:odd:bg-[#0F1A13] even:bg-[#F4F0E3]/40 dark:even:bg-[#111C16]/60 hover:bg-[#C5CFB0]/20 dark:hover:bg-[#1A2E22]/40 transition-all duration-200">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccionColor(item.accion)}`}>
                      {item.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#1F3A2E] dark:text-[#B8DCA8]">
                    {item.tabla_afectada}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1F3A2E] dark:text-[#B8DCA8]">
                      {item.usuarios?.nombre || "Sistema"}
                    </div>
                    <div className="text-[#3D6B3F]/60 dark:text-[#5A8060]/80 text-xs">
                      {item.usuarios?.email || ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#3D6B3F]/70 dark:text-[#7A9E6E] font-mono text-xs">
                    {item.registro_id || "-"}
                  </td>
                  <td className="px-4 py-3 text-[#3D6B3F]/70 dark:text-[#7A9E6E]">
                    {formatDate(item.fecha)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Controles de Paginación */}
        {totalPages > 1 && (
          <div className="bg-[#F4F0E3] dark:bg-[#111C16] px-4 py-3 border-t border-[#C5CFB0] dark:border-[#2A4830] flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[#1F3A2E] dark:text-[#B8DCA8]">
                  Mostrando del <span className="font-medium">{startIndex + 1}</span> al{" "}
                  <span className="font-medium">
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredAuditoria.length)}
                  </span>{" "}
                  de <span className="font-medium">{filteredAuditoria.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#C5CFB0] dark:border-[#2A4830] bg-white dark:bg-[#0F1A13] text-sm font-medium text-[#3D6B3F] dark:text-[#7A9E6E] hover:bg-[#F4F0E3] dark:hover:bg-[#1A2E22] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-[#C5CFB0] dark:border-[#2A4830] bg-white dark:bg-[#0F1A13] text-sm font-medium text-[#1F3A2E] dark:text-[#B8DCA8]">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#C5CFB0] dark:border-[#2A4830] bg-white dark:bg-[#0F1A13] text-sm font-medium text-[#3D6B3F] dark:text-[#7A9E6E] hover:bg-[#F4F0E3] dark:hover:bg-[#1A2E22] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}