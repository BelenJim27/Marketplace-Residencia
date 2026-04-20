"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle2, XCircle, FileText, Eye, Loader2, User, Building2, CreditCard } from "lucide-react";
import Image from "next/image";

interface SolicitudProductor {
  id_solicitud: number;
  id_usuario: number;
  nombre_usuario: string;
  email: string;
  rfc: string;
  nombre_tienda: string;
  descripcion: string;
  banco: string;
  numero_cuenta: string;
  clabe_interbancaria: string;
  url_certificado: string;
  url_ine: string;
  url_comprobante_domicilio: string;
  status: "pendiente" | "aprobada" | "rechazada";
  fecha_solicitud: string;
}

export default function SolicitudesProductoresPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudProductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudProductor | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productores/solicitudes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al cargar solicitudes");
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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productores/solicitudes/${id}/aprobar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al aprobar solicitud");
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id_solicitud === id ? { ...s, status: "aprobada" } : s))
      );
      setSelectedSolicitud(null);
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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productores/solicitudes/${id}/rechazar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al rechazar solicitud");
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id_solicitud === id ? { ...s, status: "rechazada" } : s))
      );
      setSelectedSolicitud(null);
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
      case "aprobada":
        return (
          <span className="inline-flex rounded-full bg-green-1 px-3 py-1 text-sm font-medium text-green-7 dark:bg-green-9 dark:text-green-2">
            Aprobada
          </span>
        );
      case "rechazada":
        return (
          <span className="inline-flex rounded-full bg-red-1 px-3 py-1 text-sm font-medium text-red-7 dark:bg-red-9 dark:text-red-2">
            Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  const getMediaUrl = (path: string) => {
    if (!path) return "";
    const baseUrl = process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:3001";
    return path.startsWith("http") ? path : `${baseUrl}${path}`;
  };

  const pendientes = solicitudes.filter((s) => s.status === "pendiente");
  const procesadas = solicitudes.filter((s) => s.status !== "pendiente");

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
            {/* Pendientes */}
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
                      key={solicitud.id_solicitud}
                      className="rounded-lg border border-gray-3 p-4 dark:border-dark-3"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-dark dark:text-white">
                            {solicitud.nombre_tienda}
                          </h4>
                          <p className="text-sm text-gray-500">{solicitud.email}</p>
                        </div>
                        {getStatusBadge(solicitud.status)}
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <User className="h-4 w-4" />
                          {solicitud.nombre_usuario}
                        </p>
                        <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <FileText className="h-4 w-4" />
                          RFC: {solicitud.rfc}
                        </p>
                        <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Building2 className="h-4 w-4" />
                          {solicitud.banco}
                        </p>
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

            {/* Procesadas */}
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
                          Tienda
                        </th>
                        <th className="pb-3 text-left text-sm font-semibold text-dark dark:text-white">
                          Usuario
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
                          key={solicitud.id_solicitud}
                          className="border-b border-gray-2 dark:border-dark-3"
                        >
                          <td className="py-3 text-sm text-dark dark:text-white">
                            {solicitud.nombre_tienda}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {solicitud.email}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {solicitud.rfc}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {new Date(solicitud.fecha_solicitud).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-3">{getStatusBadge(solicitud.status)}</td>
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

      {/* Modal de Detalles */}
      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-dark">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-dark dark:text-white">
                  {selectedSolicitud.nombre_tienda}
                </h2>
                <p className="text-gray-500">{selectedSolicitud.email}</p>
              </div>
              <button
                onClick={() => setSelectedSolicitud(null)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-dark-2"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Info Usuario */}
              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Usuario
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
                  <div>
                    <p className="text-xs text-gray-500">Nombre</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.nombre_usuario}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Tienda */}
              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información de la Tienda
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
                  <div>
                    <p className="text-xs text-gray-500">RFC</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.rfc}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nombre de Tienda</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.nombre_tienda}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Descripción</p>
                    <p className="text-sm text-dark dark:text-white">
                      {selectedSolicitud.descripcion || "Sin descripción"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Bancaria */}
              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Información Bancaria
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
                  <div>
                    <p className="text-xs text-gray-500">Banco</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.banco}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Número de Cuenta</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.numero_cuenta}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">CLABE Interbancaria</p>
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {selectedSolicitud.clabe_interbancaria}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documentos */}
              <div>
                <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Certificado", url: selectedSolicitud.url_certificado },
                    { label: "INE", url: selectedSolicitud.url_ine },
                    { label: "Comprobante de Domicilio", url: selectedSolicitud.url_comprobante_domicilio },
                  ].map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-3 p-3 dark:border-dark-3"
                    >
                      <span className="text-sm font-medium text-dark dark:text-white">
                        {doc.label}
                      </span>
                      {doc.url ? (
                        <a
                          href={getMediaUrl(doc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">No cargado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            {selectedSolicitud.status === "pendiente" && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => handleReject(selectedSolicitud.id_solicitud)}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30 disabled:opacity-50"
                >
                  {processingId === selectedSolicitud.id_solicitud ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  Rechazar
                </button>
                <button
                  onClick={() => handleApprove(selectedSolicitud.id_solicitud)}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {processingId === selectedSolicitud.id_solicitud ? (
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
    </>
  );
}