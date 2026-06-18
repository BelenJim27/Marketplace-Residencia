"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";

export default function SolicitarProductorPage() {
  const router = useRouter();
  const [rfc, setRfc] = useState("");
  const [idRegion, setIdRegion] = useState<number | undefined>(undefined);
  const [razonSocial, setRazonSocial] = useState("");
  const [datosBancarios, setDatosBancarios] = useState("");
  const [nombreMarca, setNombreMarca] = useState("");
  const [categorias, setCategorias] = useState("");
  const [direccionFiscal, setDireccionFiscal] = useState({ linea_1: "", ciudad: "", estado: "", codigo_postal: "", pais_iso2: "MX" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!rfc || rfc.trim().length === 0) {
      setError("El RFC es obligatorio");
      return;
    }

    const token = getCookie("token") || "";
    const payload: any = {
      rfc: rfc.trim(),
    };
    if (idRegion) payload.id_region = idRegion;
    if (razonSocial) payload.razon_social = razonSocial;
    if (datosBancarios) payload.datos_bancarios = datosBancarios;
    if (nombreMarca) payload.nombre_marca = nombreMarca;
    if (categorias) payload.categorias_ids = categorias.split(",").map((s) => Number(s.trim())).filter(Boolean);
    payload.direccion_fiscal = { ...direccionFiscal };

    try {
      setLoading(true);
      await api.productores.solicitar(token, payload);
      setSuccess("Solicitud enviada. Un administrador la revisará.");
      // opcional: redirigir a perfil o dashboard
      // router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Error enviando la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-md shadow-md">
      <h1 className="text-xl font-semibold mb-4">Solicitar ser productor</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">RFC *</label>
          <input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} className="mt-1 w-full border rounded px-3 py-2" placeholder="XAXX010101000" />
        </div>

        <div>
          <label className="block text-sm font-medium">Región (ID)</label>
          <input type="number" value={idRegion ?? ""} onChange={(e) => setIdRegion(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Razón social</label>
          <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Datos bancarios</label>
          <input value={datosBancarios} onChange={(e) => setDatosBancarios(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Nombre de marca</label>
          <input value={nombreMarca} onChange={(e) => setNombreMarca(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Categorias (IDs, separadas por coma)</label>
          <input value={categorias} onChange={(e) => setCategorias(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="4,7" />
        </div>

        <fieldset className="p-3 border rounded">
          <legend className="text-sm font-medium">Dirección fiscal (opcional)</legend>
          <div className="mt-2 space-y-2">
            <input value={direccionFiscal.linea_1} onChange={(e) => setDireccionFiscal({ ...direccionFiscal, linea_1: e.target.value })} placeholder="Línea 1" className="w-full border rounded px-3 py-2" />
            <input value={direccionFiscal.ciudad} onChange={(e) => setDireccionFiscal({ ...direccionFiscal, ciudad: e.target.value })} placeholder="Ciudad" className="w-full border rounded px-3 py-2" />
            <input value={direccionFiscal.estado} onChange={(e) => setDireccionFiscal({ ...direccionFiscal, estado: e.target.value })} placeholder="Estado" className="w-full border rounded px-3 py-2" />
            <input value={direccionFiscal.codigo_postal} onChange={(e) => setDireccionFiscal({ ...direccionFiscal, codigo_postal: e.target.value })} placeholder="Código postal" className="w-full border rounded px-3 py-2" />
          </div>
        </fieldset>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-700 text-white rounded">
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
