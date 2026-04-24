"use client";

import { useState } from "react";
import { Eye, CheckCircle, XCircle, FileText, Download } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Certificacion {
  id: string;
  nombreArchivo: string;
  productor: string;
  email: string;
  fechaSubida: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  observaciones?: string;
}

const certificacionesMock: Certificacion[] = [
  {
    id: "1",
    nombreArchivo: "certificado_nom070_lote001.pdf",
    productor: "Juan PÃ©rez LÃ³pez",
    email: "juan@example.com",
    fechaSubida: "2024-01-15",
    estado: "pendiente",
  },
  {
    id: "2",
    nombreArchivo: "certificado_nom070_lote002.pdf",
    productor: "Maria GarcÃ­a",
    email: "maria@example.com",
    fechaSubida: "2024-01-14",
    estado: "pendiente",
  },
  {
    id: "3",
    nombreArchivo: "certificado_nom070_lote003.pdf",
    productor: "Carlos Mendoza",
    email: "carlos@example.com",
    fechaSubida: "2024-01-10",
    estado: "aprobado",
    observaciones: "DocumentaciÃ³n validada correctamente",
  },
];

export default function ValidarCertificaciones() {
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>(certificacionesMock);
  const [filtro, setFiltro] = useState<"todos" | "pendiente" | "aprobado" | "rechazado">("todos");
  const [certificadoSeleccionado, setCertificadoSeleccionado] = useState<Certificacion | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  const certificacionesFiltradas = certificaciones.filter((cert) => {
    if (filtro === "todos") return true;
    return cert.estado === filtro;
  });

  const handleAprobar = (id: string) => {
    setCertificaciones((prev) =>
      prev.map((cert) =>
        cert.id === id
          ? { ...cert, estado: "aprobado" as const, observaciones }
          : cert
      )
    );
    setShowModal(false);
    setObservaciones("");
    setCertificadoSeleccionado(null);
  };

  const handleRechazar = (id: string) => {
    setCertificaciones((prev) =>
      prev.map((cert) =>
        cert.id === id
          ? { ...cert, estado: "rechazado" as const, observaciones }
          : cert
      )
    );
    setShowModal(false);
    setObservaciones("");
    setCertificadoSeleccionado(null);
  };

  const abrirModal = (cert: Certificacion, accion: "aprobar" | "rechazar") => {
    setCertificadoSeleccionado(cert);
    setShowModal(true);
  };

  const obtenerBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            Pendiente
          </span>
        );
      case "aprobado":
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Aprobado
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
            Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Breadcrumb pageName="Validar Certificaciones" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-2">
            ValidaciÃ³n de Certificaciones NOM-070
          </h2>
          <p className="text-body text-bodydark">
            Revisa y valida las certificaciones subidas por los productores
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-3">
          {(["todos", "pendiente", "aprobado", "rechazado"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filtro === f
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Archivo</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Productor</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Fecha</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {certificacionesFiltradas.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {cert.nombreArchivo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {cert.productor}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {cert.email}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {cert.fechaSubida}
                  </td>
                  <td className="px-4 py-3">{obtenerBadge(cert.estado)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
                        title="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {cert.estado === "pendiente" && (
                        <>
                          <button
                            type="button"
                            onClick={() => abrirModal(cert, "aprobar")}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                            title="Aprobar"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModal(cert, "rechazar")}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title="Rechazar"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {certificacionesFiltradas.length === 0 && (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No hay certificaciones para mostrar
          </div>
        )}
      </div>

      {/* Modal para aprobar/rechazar */}
      {showModal && certificadoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {observaciones === "" ? "Rechazar" : "Aprobar"} CertificaciÃ³n
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Productor: {certificadoSeleccionado.productor}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Archivo: {certificadoSeleccionado.nombreArchivo}
            </p>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agrega una observaciÃ³n (opcional para aprobar, requerido para rechazar)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                rows={3}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setObservaciones("");
                  setCertificadoSeleccionado(null);
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleRechazar(certificadoSeleccionado.id)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => handleAprobar(certificadoSeleccionado.id)}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}