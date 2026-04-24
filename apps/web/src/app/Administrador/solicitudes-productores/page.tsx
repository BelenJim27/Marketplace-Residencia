"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { AlertCircle, CheckCircle2, XCircle, FileText, Eye, Loader2, User, Building2, CreditCard } from "lucide-react";
import Image from "next/image";

interface SolicitudProductor {
  id_productor: number;
  id_usuario: string;
  estado: string;
  rfc?: string;
  razon_social?: string;
  motivo_rechazo?: string;
  solicitado_en: string;
  revisado_en?: string;
  usuarios: {
    nombre: string;
    email: string;
    telefono?: string;
  };
  regiones?: {
    nombre: string;
  };
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

      const response = await fetch(
        `/admin/productores/solicitudes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`);
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

      const response = await fetch(
        `/admin/productores/${id}/revisar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado: "aprobado", motivo_aprobacion: approveReason || null }),
        }
      );

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

      const response = await fetch(
        `/admin/productores/${id}/revisar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado: "rechazado", motivo_rechazo: rejectReason }),
        }
      );

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
          <span className="inline-flex rounded-full bg-yellow-1 px-3 py-1 text-sm font-medium text-yellow-7 dark:bg-yellow-9 dark:text-yellow-2">
            Pendiente
          </span>
        );
      case "aprobado":
        return (
          <span className="inline-flex rounded-full bg-green-1 px-3 py-1 text-sm font-medium text-green-7 dark:bg-green-9 dark:text-green-2">
            Aprobado
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex rounded-full bg-red-1 px-3 py-1 text-sm font-medium text-red-7 dark:bg-red-9 dark:text-red-2">
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

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-2">
            Solicitudes de Productores
          </h2>
          <p className="text-body text-bodydark">
            Revisa y gestiona las solicitudes de usuarios que desean convertirse en productores
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Solicitudes Pendientes ({pendientes.length})
              </h3>
              {pendientes.length === 0 ? (
                <p className="text-gray-500 py-4">No hay solicitudes pendientes</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendientes.map((solicitud) => (
                    <div
                      key={solicitud.id_productor}
                      className="rounded-lg border border-gray-3 p-4 dark:border-dark-3"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-dark dark:text-white">
                            {solicitud.usuarios?.nombre || "Usuario"}
                          </h4>
                          <p className="text-sm text-gray-500">{solicitud.usuarios?.email}</p>
                        </div>
                        {getStatusBadge(solicitud.estado)}
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <User className="h-4 w-4" />
                          {solicitud.usuarios?.nombre}
                        </p>
                        {solicitud.rfc && (
                          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <FileText className="h-4 w-4" />
                            RFC: {solicitud.rfc}
                          </p>
                        )}
                        {solicitud.razon_social && (
                          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Building2 className="h-4 w-4" />
                            {solicitud.razon_social}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedSolicitud(solicitud)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalles
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {procesadas.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                  Solicitudes Procesadas ({procesadas.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-3 dark:border-dark-3">
                        <th className="pb-3 text-left text-sm font-semibold text-dark dark:text-white">
                          Usuario
                        </th>
                        <th className="pb-3 text-left text-sm font-semibold text-dark dark:text-white">
                          Email
                        </th>
                        <th className="pb-3 text-left text-sm font-semibold text-dark dark:text-white">
                          RFC
                        </th>
                        <th className="pb-3 text-left text-sm font-semibold text-dark dark:text-white">
                          Fecha
                        </th>
                        <th className="pb-3 text-left text-sm font-semibold text-dark dark:text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {procesadas.map((solicitud) => (
                        <tr
                          key={solicitud.id_productor}
                          className="border-b border-gray-2 dark:border-dark-3"
                        >
                          <td className="py-3 text-sm text-dark dark:text-white">
                            {solicitud.usuarios?.nombre}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {solicitud.usuarios?.email}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {solicitud.rfc || "-"}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
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

      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-dark">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-dark dark:text-white">
                  {selectedSolicitud.usuarios?.nombre}
                </h2>
                <p className="text-gray-500">{selectedSolicitud.usuarios?.email}</p>
              </div>
              <button
                onClick={() => setSelectedSolicitud(null)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-dark-2"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  InformaciÃ³n del Usuario
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
                  <div>
                    <p className="text-xs text-gray-500">Nombre</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.usuarios?.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.usuarios?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">TelÃ©fono</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.usuarios?.telefono || "No proporcionado"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Datos Fiscales
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
                  <div>
                    <p className="text-xs text-gray-500">RFC</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.rfc || "No proporcionado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">RazÃ³n Social</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.razon_social || "No proporcionada"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Estado de Solicitud
                </h3>
                <div className="rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
                  <p className="text-xs text-gray-500">Fecha de solicitud</p>
                  <p className="text-sm font-medium text-dark dark:text-white">
                    {new Date(selectedSolicitud.solicitado_en).toLocaleString("es-MX")}
                  </p>
                  {selectedSolicitud.revisado_en && (
                    <>
                      <p className="text-xs text-gray-500 mt-2">Fecha de resoluciÃ³n</p>
                      <p className="text-sm font-medium text-dark dark:text-white">
                        {new Date(selectedSolicitud.revisado_en).toLocaleString("es-MX")}
                      </p>
                    </>
                  )}
                  {selectedSolicitud.motivo_rechazo && (
                    <>
                      <p className="text-xs text-gray-500 mt-2">Motivo de rechazo</p>
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
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

      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-dark">
            <h2 className="text-xl font-bold text-dark dark:text-white mb-4">
              Rechazar Solicitud
            </h2>
            <p className="text-gray-500 mb-4">
              Por favor proporciona un motivo para el rechazo:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-4 bg-gray-1 px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white mb-4"
              placeholder="Motivo del rechazo..."
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason("");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-medium text-dark hover:bg-gray-100"
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

      {approveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-dark">
            <h2 className="text-xl font-bold text-dark dark:text-white mb-4">
              Aprobar Solicitud
            </h2>
            <p className="text-gray-500 mb-4">
              Â¿EstÃ¡s seguro de que deseas aprobar esta solicitud de productor? El usuario deberÃ¡ completar su perfil y subir su certificado antes de poder vender.
            </p>
            <textarea
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-4 bg-gray-1 px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white mb-4"
              placeholder="Motivo de aprobaciÃ³n (opcional)..."
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setApproveModalOpen(false);
                  setApproveReason("");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-medium text-dark hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApprove(selectedSolicitud!.id_productor)}
                disabled={processingId !== null}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
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