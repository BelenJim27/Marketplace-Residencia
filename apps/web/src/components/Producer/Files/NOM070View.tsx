"use client";

import { useEffect, useState } from "react";
import { FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";

export default function NOM070View() {
  const { user, loading: authLoading } = useAuth();
  const [certificadoUrl, setCertificadoUrl] = useState(null);
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    let cancelled = false;
    const fetchSolicitud = async () => {
      try {
        setLoading(true);
        const token = getCookie("token") || "";
        const solicitud = await api.productores.getMiSolicitud(token);
        if (cancelled) return;
        setCertificadoUrl(solicitud?.certificado_url || null);
        setEstado(solicitud?.estado || null);
      } catch (err) {
        if (!cancelled) setError("No fue posible cargar el documento.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSolicitud();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const isPDF = certificadoUrl
    ? /\.pdf($|\?)/i.test(certificadoUrl) || certificadoUrl.includes("/pdf")
    : false;
  const isImage = certificadoUrl
    ? /\.(png|jpe?g|webp|gif)($|\?)/i.test(certificadoUrl)
    : false;

  const estadoCls = (e) => {
    const n = String(e || "pendiente").toLowerCase();
    if (n === "aprobado") return "bg-[#A8C26B]/20 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B]";
    if (n === "rechazado") return "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400";
    return "bg-[#C97A3E]/15 dark:bg-[#C97A3E]/20 text-[#C97A3E] dark:text-[#E8A87C]";
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h2 className="mb-1 text-base font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">
          Documento de Solicitud NOM-070
        </h2>
        <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
          Este es el certificado que subiste al momento de solicitar tu acceso como productor.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <Loader2 className="h-8 w-8 animate-spin text-[#3D6B3F]" />
        </div>
      ) : !certificadoUrl ? (
        <div className="rounded-2xl border border-dashed border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-6 py-14 text-center shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <FileText className="mx-auto mb-3 h-10 w-10 text-[#C5CFB0] dark:text-[#3D6B3F]/40" />
          <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">No se encontró ningún documento</p>
          <p className="mt-1 text-xs text-[#3D6B3F]/50 dark:text-[#A8C26B]/40">
            El documento se sube durante el proceso de solicitud como productor.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)] space-y-4">
          {/* Estado de la solicitud */}
          {estado && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#3D6B3F]/60 dark:text-[#A8C26B]/60 uppercase tracking-wider">Estado de la solicitud</span>
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${estadoCls(estado)}`}>
                {estado}
              </span>
            </div>
          )}

          {/* Vista previa imagen */}
          {isImage && (
            <div className="overflow-hidden rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#0f1a10]">
              <img
                src={certificadoUrl}
                alt="Certificado de solicitud"
                className="max-h-80 w-full object-contain"
              />
            </div>
          )}

          {/* Vista previa PDF */}
          {isPDF && (
            <div className="overflow-hidden rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#0f1a10]">
              <iframe
                src={certificadoUrl}
                title="Certificado de solicitud"
                className="h-80 w-full"
              />
            </div>
          )}

          {/* Formato desconocido */}
          {!isImage && !isPDF && (
            <div className="flex items-center gap-4 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3]/60 dark:bg-[#0f1a10]/60 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C97A3E]/15 dark:bg-[#C97A3E]/10">
                <FileText className="h-6 w-6 text-[#C97A3E]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">Documento adjunto</p>
                <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/50">Vista previa no disponible para este formato</p>
              </div>
            </div>
          )}

          <a
            href={certificadoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2 text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5] transition hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/40"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir documento completo
          </a>
        </div>
      )}

      {/* Info NOM-070 */}
      <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#3D6B3F] dark:text-[#A8C26B]">¿Qué es la NOM-070?</h3>
        <p className="text-sm leading-6 text-[#3D6B3F]/80 dark:text-[#D4CEBF]">
          La NOM-070-SCFI-2016 establece las especificaciones de denominación, empaque, etiquetado, producción y
          comercialización del mezcal en México.
        </p>
        <a
          href="https://www.dof.gob.mx/nota_detalle.php?codigo=5455069&fecha=23/02/2017"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#3D6B3F] dark:text-[#A8C26B] underline-offset-2 hover:underline"
        >
          Ver requisitos legales <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
