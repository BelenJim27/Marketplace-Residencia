"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Loader2,
  User,
  ShoppingBag,
} from "lucide-react";
import { getCookie } from "@/lib/cookies";

interface SolicitudProductor {
  id_productor: number;
  id_usuario: string;
  estado: string;
  rfc?: string;
  razon_social?: string;
  motivo_rechazo?: string;
  solicitado_en: string;
  revisado_en?: string;
  asociacion?: string;
  usuarios: {
    nombre: string;
    email: string;
    telefono?: string;
  };
  regiones?: {
    nombre: string;
  };
  categorias?: { id_categoria: number; nombre: string }[];
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

  useEffect(() => {
    loadSolicitudes();
  }, []);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const token = getCookie("token");
      if (!token) {
        setError("No autorizado");
        return;
      }

      const response = await fetch(`/admin/productores/solicitudes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      setSolicitudes(data);
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
      if (!token) return;

      const response = await fetch(`/admin/productores/${id}/revisar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: "aprobado", motivo_aprobacion: approveReason || null }),
      });

      if (!response.ok) {
        throw new Error("Error al aprobar solicitud");
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id_productor === id ? { ...s, estado: "aprobado" } : s))
      );
      setSelectedSolicitud(null);
      setApproveModalOpen(false);
      setApproveReason("");
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
      if (!token) return;

      const response = await fetch(`/admin/productores/${id}/revisar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: "rechazado", motivo_rechazo: rejectReason }),
      });

      if (!response.ok) {
        throw new Error("Error al rechazar solicitud");
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id_productor === id ? { ...s, estado: "rechazado" } : s))
      );
      setSelectedSolicitud(null);
      setRejectModalOpen(false);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return (
          <span className="inline-flex rounded-full bg-[#C97A3E]/15 text-[#C97A3E] border border-[#C97A3E]/30 px-3 py-1 text-sm font-medium">
            Pendiente
          </span>
        );
      case "aprobado":
        return (
          <span className="inline-flex rounded-full bg-[#A8C26B]/20 text-[#3D6B3F] border border-[#A8C26B]/40 px-3 py-1 text-sm font-medium">
            Aprobado
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex rounded-full bg-red-100 text-red-700 px-3 py-1 text-sm font-medium">
            Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const procesadas = solicitudes.filter((s) => s.estado !== "pendiente");

  return (
    <>
      <Breadcrumb pageName="Solicitudes de Productores" />

      <div className="rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-7">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-2">
            Solicitudes de Productores
          </h2>
          <p className="text-sm text-[#3D6B3F]/70">
            Revisa y gestiona las solicitudes de usuarios que desean convertirse en productores
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
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
              <h3 className="mb-4 text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#C97A3E]" />
                Solicitudes Pendientes ({pendientes.length})
              </h3>
              {pendientes.length === 0 ? (
                <p className="text-[#3D6B3F]/70 py-4">No hay solicitudes pendientes</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendientes.map((solicitud) => (
                    <div
                      key={solicitud.id_productor}
                      className="rounded-2xl border border-[#C5CFB0] bg-white p-4 shadow-[0_2px_8px_rgba(61,107,63,0.06)]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-[#1F3A2E]">
                            {solicitud.usuarios?.nombre || "Usuario"}
                          </h4>
                          <p className="text-sm text-[#3D6B3F]/70">{solicitud.usuarios?.email}</p>
                        </div>
                        {getStatusBadge(solicitud.estado)}
                      </div>

                      {/* Asociación en la tarjeta */}
                      {solicitud.asociacion && (
                        <div className="mb-2">
                          <span className="inline-flex rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]">
                            🏛 {solicitud.asociacion}
                          </span>
                        </div>
                      )}

                      {/* Categorías en la tarjeta */}
                      {solicitud.categorias && solicitud.categorias.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1">
                          {solicitud.categorias.map((cat) => (
                            <span
                              key={cat.id_categoria}
                              className="inline-flex rounded-full bg-[#A8C26B]/20 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]"
                            >
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
                <h3 className="mb-4 text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
                  Solicitudes Procesadas ({procesadas.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-[#1F3A2E]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                          Usuario
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                          Categorías
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {procesadas.map((solicitud) => (
                        <tr
                          key={solicitud.id_productor}
                          className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-all duration-200"
                        >
                          <td className="px-4 py-3 text-sm text-[#1F3A2E]">
                            {solicitud.usuarios?.nombre}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#1F3A2E]/70">
                            {solicitud.usuarios?.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#1F3A2E]/70">
                            {solicitud.categorias && solicitud.categorias.length > 0
                              ? solicitud.categorias.map((c) => c.nombre).join(", ")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#1F3A2E]/70">
                            {new Date(solicitud.solicitado_en).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-3">{getStatusBadge(solicitud.estado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal detalle ── */}
      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
                  {selectedSolicitud.usuarios?.nombre}
                </h2>
                <p className="text-[#3D6B3F]/70">{selectedSolicitud.usuarios?.email}</p>
              </div>
              <button
                onClick={() => setSelectedSolicitud(null)}
                className="rounded-lg p-2 hover:bg-[#C5CFB0]/30 transition-all duration-200"
              >
                <XCircle className="h-5 w-5 text-[#3D6B3F]/60" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Información del Usuario */}
              <div>
                <h3 className="mb-3 font-semibold text-[#1F3A2E] flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Usuario
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-white border border-[#C5CFB0] p-4">
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60">Nombre</p>
                    <p className="text-sm font-medium text-[#1F3A2E]">
                      {selectedSolicitud.usuarios?.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60">Email</p>
                    <p className="text-sm font-medium text-[#1F3A2E]">
                      {selectedSolicitud.usuarios?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#3D6B3F]/60">Teléfono</p>
                    <p className="text-sm font-medium text-[#1F3A2E]">
                      {selectedSolicitud.usuarios?.telefono || "No proporcionado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Asociación */}
              {selectedSolicitud.asociacion && (
                <div>
                  <h3 className="mb-3 font-semibold text-[#1F3A2E] flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Asociación
                  </h3>
                  <div className="rounded-xl bg-white border border-[#C5CFB0] p-4">
                    <span className="inline-flex rounded-full bg-[#3D6B3F]/10 px-3 py-1 text-sm font-medium text-[#3D6B3F]">
                      🏛 {selectedSolicitud.asociacion}
                    </span>
                  </div>
                </div>
              )}

              {/* Categorías a Vender */}
              <div>
                <h3 className="mb-3 font-semibold text-[#1F3A2E] flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Categorías a Vender
                </h3>
                <div className="rounded-xl bg-white border border-[#C5CFB0] p-4">
                  {selectedSolicitud.categorias && selectedSolicitud.categorias.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSolicitud.categorias.map((cat) => (
                        <span
                          key={cat.id_categoria}
                          className="inline-flex rounded-full bg-[#A8C26B]/20 px-3 py-1 text-sm font-medium text-[#3D6B3F]"
                        >
                          {cat.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#3D6B3F]/70">No especificadas</p>
                  )}
                </div>
              </div>

              {/* Estado de Solicitud */}
              <div>
                <h3 className="mb-3 font-semibold text-[#1F3A2E] flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Estado de Solicitud
                </h3>
                <div className="rounded-xl bg-white border border-[#C5CFB0] p-4">
                  <p className="text-xs text-[#3D6B3F]/60">Fecha de solicitud</p>
                  <p className="text-sm font-medium text-[#1F3A2E]">
                    {new Date(selectedSolicitud.solicitado_en).toLocaleString("es-MX")}
                  </p>
                  {selectedSolicitud.revisado_en && (
                    <>
                      <p className="text-xs text-[#3D6B3F]/60 mt-2">Fecha de resolución</p>
                      <p className="text-sm font-medium text-[#1F3A2E]">
                        {new Date(selectedSolicitud.revisado_en).toLocaleString("es-MX")}
                      </p>
                    </>
                  )}
                  {selectedSolicitud.motivo_rechazo && (
                    <>
                      <p className="text-xs text-[#3D6B3F]/60 mt-2">Motivo de rechazo</p>
                      <p className="text-sm font-medium text-red-600">
                        {selectedSolicitud.motivo_rechazo}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedSolicitud.estado === "pendiente" && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30 disabled:opacity-50"
                >
                  {processingId === selectedSolicitud.id_productor ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  Rechazar
                </button>
                <button
                  onClick={() => setApproveModalOpen(true)}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-3 font-medium text-white hover:bg-[#1F3A2E] disabled:opacity-50 transition-all duration-200"
                >
                  {processingId === selectedSolicitud.id_productor ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Aprobar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Rechazar ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] p-6">
            <h2 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4">
              Rechazar Solicitud
            </h2>
            <p className="text-[#3D6B3F]/70 mb-4">
              Por favor proporciona un motivo para el rechazo:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20 mb-4"
              placeholder="Motivo del rechazo..."
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason("");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#C5CFB0] px-4 py-3 font-medium text-[#1F3A2E] hover:bg-[#C5CFB0]/30 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(selectedSolicitud!.id_productor)}
                disabled={processingId !== null || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Aprobar ── */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] p-6">
            <h2 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4">
              Aprobar Solicitud
            </h2>
            <p className="text-[#3D6B3F]/70 mb-4">
              ¿Estás seguro de que deseas aprobar esta solicitud de productor? El usuario
              deberá completar su perfil y subir su certificado antes de poder vender.
            </p>
            <textarea
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20 mb-4"
              placeholder="Motivo de aprobación (opcional)..."
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setApproveModalOpen(false);
                  setApproveReason("");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#C5CFB0] px-4 py-3 font-medium text-[#1F3A2E] hover:bg-[#C5CFB0]/30 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApprove(selectedSolicitud!.id_productor)}
                disabled={processingId !== null}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-3 font-medium text-white hover:bg-[#1F3A2E] disabled:opacity-50 transition-all duration-200"
              >
                {processingId !== null ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}