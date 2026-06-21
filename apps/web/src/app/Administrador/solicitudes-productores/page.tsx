// @ts-nocheck — tipos pendientes de revisar (pre-existentes antes de activar strict TS build)
"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Loader2,
  User,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
} from "lucide-react";

import { getCookie } from "@/lib/cookies";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { SuccessToast } from "@/components/ui/SuccessToast";

interface SolicitudProductor {
  id_productor: number;
  id_usuario: string;
  estado: string;
  rfc?: string;
  razon_social?: string;
  nombre_marca?: string;
  motivo_rechazo?: string;
  solicitado_en: string;
  revisado_en?: string;
  asociacion?: string;
  certificado_url?: string;
  usuarios: {
    nombre: string;
    email: string;
    telefono?: string;
  };
  regiones?: { nombre: string };
  categorias?: { id_categoria: number; nombre: string }[];
}

function CertificadoPreview({ url }: { url?: string }) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3]/60 dark:bg-[#0f1a10]/60 px-4 py-8 text-center text-sm text-[#3D6B3F]/50 dark:text-[#A8C26B]/40">
        No se encontró documento adjunto en esta solicitud.
      </div>
    );
  }

  const isPDF = /\.pdf($|\?)/i.test(url) || url.includes("/pdf");
  const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(url);

  return (
    <div className="space-y-3">
      {isImage && (
        <div className="overflow-hidden rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#0f1a10]">
          <img src={url} alt="Documento de solicitud" className="max-h-72 w-full object-contain" />
        </div>
      )}
      {isPDF && (
        <div className="overflow-hidden rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#0f1a10]">
          <iframe src={url} title="Documento de solicitud" className="h-72 w-full" />
        </div>
      )}
      {!isImage && !isPDF && (
        <div className="flex items-center gap-3 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3]/60 dark:bg-[#0f1a10]/60 p-4">
          <FileText className="h-8 w-8 shrink-0 text-[#C97A3E]" />
          <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">Documento adjunto</p>
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2 text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5] transition hover:bg-[#C5CFB0]/20 dark:hover:bg-[#1F3A2E]/40"
      >
        <ExternalLink className="h-4 w-4" />
        Abrir documento en nueva pestaña
      </a>
    </div>
  );
}

export default function SolicitudesProductoresPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudProductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudProductor | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [currentPageProcesadas, setCurrentPageProcesadas] = useState(1);
  const itemsPerPage = 10;
  const successToast = useSuccessToast("solicitud_productor");

  useEffect(() => {
    loadSolicitudes();
  }, []);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const token = getCookie("token");
      const response = await fetch(`/admin/productores/solicitudes`, {
        credentials: "include",
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Error ${response.status}`);
      }
      setSolicitudes(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setProcessingId(id);
      const token = getCookie("token");
      const response = await fetch(`/admin/productores/${id}/revisar`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ estado: "aprobado", ...(approveReason ? { motivo_aprobacion: approveReason } : {}) }),
      });
      if (!response.ok) throw new Error("Error al aprobar solicitud");
      setSolicitudes((prev) => prev.map((s) => (s.id_productor === id ? { ...s, estado: "aprobado" } : s)));
      setSelectedSolicitud(null);
      setApproveModalOpen(false);
      setApproveReason("");
      successToast.mostrar("Solicitud aprobada correctamente. El productor ya puede vender.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aprobar");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setProcessingId(id);
      const token = getCookie("token");
      const response = await fetch(`/admin/productores/${id}/revisar`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ estado: "rechazado", motivo_rechazo: rejectReason }),
      });
      if (!response.ok) throw new Error("Error al rechazar solicitud");
      setSolicitudes((prev) => prev.map((s) => (s.id_productor === id ? { ...s, estado: "rechazado" } : s)));
      setSelectedSolicitud(null);
      setRejectModalOpen(false);
      setRejectReason("");
      successToast.mostrar("Solicitud rechazada correctamente.", "error");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return <span className="inline-flex rounded-full bg-[#C97A3E]/15 dark:bg-[#C97A3E]/20 text-[#C97A3E] dark:text-[#E8A87C] border border-[#C97A3E]/30 px-3 py-1 text-xs font-medium">Pendiente</span>;
      case "aprobado":
        return <span className="inline-flex rounded-full bg-[#A8C26B]/20 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B] border border-[#A8C26B]/40 dark:border-[#A8C26B]/30 px-3 py-1 text-xs font-medium">Aprobado</span>;
      case "rechazado":
        return <span className="inline-flex rounded-full bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-3 py-1 text-xs font-medium">Rechazado</span>;
      default: return null;
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const procesadas = solicitudes.filter((s) => s.estado !== "pendiente");
  const totalPagesProcesadas = Math.ceil(procesadas.length / itemsPerPage);
  const paginatedProcesadas = procesadas.slice((currentPageProcesadas - 1) * itemsPerPage, currentPageProcesadas * itemsPerPage);

  return (
    <>
      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif] mb-2">
            Solicitudes de Productores
          </h2>
          <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
            Revisa y gestiona las solicitudes de usuarios que desean convertirse en productores
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-4 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#3D6B3F]" />
          </div>
        ) : (
          <>
            {/* ── Pendientes ── */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif] flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#C97A3E]" />
                Solicitudes Pendientes ({pendientes.length})
              </h3>
              {pendientes.length === 0 ? (
                <p className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/50 py-4">No hay solicitudes pendientes</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendientes.map((solicitud) => (
                    <div key={solicitud.id_productor} className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.06)]">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">{solicitud.usuarios?.nombre || "Usuario"}</h4>
                          <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">{solicitud.usuarios?.email}</p>
                        </div>
                        {getStatusBadge(solicitud.estado)}
                      </div>
                      {solicitud.asociacion && (
                        <div className="mb-2">
                          <span className="inline-flex rounded-full bg-[#3D6B3F]/10 dark:bg-[#3D6B3F]/20 px-2 py-0.5 text-xs font-medium text-[#3D6B3F] dark:text-[#A8C26B]">
                            🏛 {solicitud.asociacion}
                          </span>
                        </div>
                      )}
                      {solicitud.categorias && solicitud.categorias.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1">
                          {solicitud.categorias.map((cat) => (
                            <span key={cat.id_categoria} className="inline-flex rounded-full bg-[#A8C26B]/20 dark:bg-[#A8C26B]/15 px-2 py-0.5 text-xs font-medium text-[#3D6B3F] dark:text-[#A8C26B]">
                              {cat.nombre}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedSolicitud(solicitud)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F3A2E] transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalles
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Procesadas ── */}
            {procesadas.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">
                  Solicitudes Procesadas ({procesadas.length})
                </h3>
                <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="bg-[#1F3A2E]">
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">Usuario</th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">Email</th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">Categorías</th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">Fecha</th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">Status</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-white">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20">
                        {paginatedProcesadas.map((solicitud) => (
                          <tr key={solicitud.id_productor} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 dark:odd:bg-[#0f1a10] dark:even:bg-[#1a2a1f] dark:hover:bg-[#2d4a2e]/40 transition-all duration-200">
                            <td className="px-4 py-3 text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{solicitud.usuarios?.nombre}</td>
                            <td className="px-4 py-3 text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">{solicitud.usuarios?.email}</td>
                            <td className="px-4 py-3 text-sm text-[#3D6B3F]/70 dark:text-[#D4CEBF]">
                              {solicitud.categorias && solicitud.categorias.length > 0
                                ? solicitud.categorias.map((c) => c.nombre).join(", ")
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
                              {new Date(solicitud.solicitado_en).toLocaleDateString("es-MX")}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(solicitud.estado)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedSolicitud(solicitud)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-3 py-1.5 text-xs font-medium text-[#1F3A2E] dark:text-[#E8E3D5] transition hover:bg-[#3D6B3F] hover:text-white hover:border-[#3D6B3F]"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPagesProcesadas > 1 && (
                  <div className="flex items-center justify-between border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-3 mt-4 bg-white dark:bg-[#0f1a10] rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
                    <p className="text-sm text-[#1F3A2E] dark:text-[#D4CEBF]">
                      Mostrando <span className="font-semibold">{(currentPageProcesadas - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPageProcesadas * itemsPerPage, procesadas.length)}</span> de <span className="font-semibold">{procesadas.length}</span> solicitudes
                    </p>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
                      <button onClick={() => setCurrentPageProcesadas((p) => Math.max(p - 1, 1))} disabled={currentPageProcesadas === 1}
                        className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] dark:text-[#A8C26B] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40 hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/40 disabled:opacity-50">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40">
                        Página {currentPageProcesadas} de {totalPagesProcesadas}
                      </span>
                      <button onClick={() => setCurrentPageProcesadas((p) => Math.min(p + 1, totalPagesProcesadas))} disabled={currentPageProcesadas === totalPagesProcesadas}
                        className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] dark:text-[#A8C26B] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40 hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/40 disabled:opacity-50">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal detalle ── */}
      {selectedSolicitud && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(31,58,46,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedSolicitud(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FDFBF5] dark:bg-[#0f1a10] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-[#C5CFB0] bg-[#1F3A2E] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-white [font-family:'Playfair_Display',serif]">
                  {selectedSolicitud.usuarios?.nombre}
                </h2>
                <p className="text-sm text-white/60">{selectedSolicitud.usuarios?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedSolicitud.estado)}
                <button
                  onClick={() => setSelectedSolicitud(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Información del Usuario */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">
                  <User className="h-4 w-4 text-[#3D6B3F]" /> Información del Usuario
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-white dark:bg-[#1a2a1f] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 p-4">
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Nombre</p>
                    <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{selectedSolicitud.usuarios?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Email</p>
                    <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{selectedSolicitud.usuarios?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Teléfono</p>
                    <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{selectedSolicitud.usuarios?.telefono || "No proporcionado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Nombre de Marca</p>
                    <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{selectedSolicitud.nombre_marca || "No proporcionado"}</p>
                  </div>
                </div>
              </div>

              {/* Asociación */}
              {selectedSolicitud.asociacion && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">
                    <FileText className="h-4 w-4 text-[#3D6B3F]" /> Asociación
                  </h3>
                  <div className="rounded-xl bg-white dark:bg-[#1a2a1f] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 p-4">
                    <span className="inline-flex rounded-full bg-[#3D6B3F]/10 dark:bg-[#3D6B3F]/20 px-3 py-1 text-sm font-medium text-[#3D6B3F] dark:text-[#A8C26B]">
                      🏛 {selectedSolicitud.asociacion}
                    </span>
                  </div>
                </div>
              )}

              {/* Categorías */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">
                  <ShoppingBag className="h-4 w-4 text-[#3D6B3F]" /> Categorías a Vender
                </h3>
                <div className="rounded-xl bg-white dark:bg-[#1a2a1f] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 p-4">
                  {selectedSolicitud.categorias && selectedSolicitud.categorias.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSolicitud.categorias.map((cat) => (
                        <span key={cat.id_categoria} className="inline-flex rounded-full bg-[#A8C26B]/20 dark:bg-[#A8C26B]/15 px-3 py-1 text-sm font-medium text-[#3D6B3F] dark:text-[#A8C26B]">
                          {cat.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/50">No especificadas</p>
                  )}
                </div>
              </div>

              {/* Documento de Solicitud */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">
                  <FileImage className="h-4 w-4 text-[#3D6B3F]" /> Documento de Solicitud
                </h3>
                <div className="rounded-xl bg-white dark:bg-[#1a2a1f] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 p-4">
                  <CertificadoPreview url={selectedSolicitud.certificado_url} />
                </div>
              </div>

              {/* Estado de Solicitud */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">
                  <FileText className="h-4 w-4 text-[#3D6B3F]" /> Estado de Solicitud
                </h3>
                <div className="rounded-xl bg-white dark:bg-[#1a2a1f] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 p-4 space-y-2">
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Fecha de solicitud</p>
                    <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{new Date(selectedSolicitud.solicitado_en).toLocaleString("es-MX")}</p>
                  </div>
                  {selectedSolicitud.revisado_en && (
                    <div>
                      <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Fecha de resolución</p>
                      <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{new Date(selectedSolicitud.revisado_en).toLocaleString("es-MX")}</p>
                    </div>
                  )}
                  {selectedSolicitud.motivo_rechazo && (
                    <div>
                      <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">Motivo de rechazo</p>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{selectedSolicitud.motivo_rechazo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones (solo pendientes) */}
            {selectedSolicitud.estado === "pendiente" && (
              <div className="border-t border-[#C5CFB0] dark:border-[#3D6B3F]/30 px-6 py-4 flex gap-4">
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                >
                  {processingId === selectedSolicitud.id_productor ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                  Rechazar
                </button>
                <button
                  onClick={() => setApproveModalOpen(true)}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-3 font-medium text-white hover:bg-[#1F3A2E] disabled:opacity-50 transition"
                >
                  {processingId === selectedSolicitud.id_productor ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Aprobar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Rechazar ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(31,58,46,0.45)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl bg-[#FDFBF5] dark:bg-[#0f1a10] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif] mb-4">Rechazar Solicitud</h2>
            <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70 mb-4">Por favor proporciona un motivo para el rechazo:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-4 py-3 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder-[#3D6B3F]/40 dark:placeholder-[#A8C26B]/30 focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20 mb-4"
              placeholder="Motivo del rechazo..."
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModalOpen(false); setRejectReason(""); }}
                className="flex-1 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2.5 text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/60 transition">
                Cancelar
              </button>
              <button onClick={() => handleReject(selectedSolicitud!.id_productor)} disabled={processingId !== null || !rejectReason.trim()}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Aprobar ── */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(31,58,46,0.45)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl bg-[#FDFBF5] dark:bg-[#0f1a10] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif] mb-4">Aprobar Solicitud</h2>
            <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70 mb-4">
              ¿Estás seguro de que deseas aprobar esta solicitud? El usuario podrá comenzar a vender en el marketplace.
            </p>
            <textarea
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-4 py-3 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder-[#3D6B3F]/40 dark:placeholder-[#A8C26B]/30 focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20 mb-4"
              placeholder="Motivo de aprobación (opcional)..."
            />
            <div className="flex gap-3">
              <button onClick={() => { setApproveModalOpen(false); setApproveReason(""); }}
                className="flex-1 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2.5 text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/60 transition">
                Cancelar
              </button>
              <button onClick={() => handleApprove(selectedSolicitud!.id_productor)} disabled={processingId !== null}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1F3A2E] disabled:opacity-50 transition">
                {processingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
