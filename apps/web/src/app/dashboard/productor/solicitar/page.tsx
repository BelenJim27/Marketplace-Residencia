"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "next-auth/react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadIcon,
  Building2,
  MapPin,
  CreditCard,
  ShoppingBag,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Region {
  id_region: number;
  nombre: string;
  estado_prov?: string;
}

interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  id_padre?: number | null;
}

interface Solicitud {
  id_productor: number;
  estado: string;
  motivo_rechazo?: string;
  rfc?: string;
  razon_social?: string;
}

// ── Iconos por categoría ──────────────────────────────────────────────────────

const CATEGORIA_ICONS: Record<string, string> = {
  Bebidas: "🥃",
  "Mezcal artesanal": "🫙",
  "Mezcal Ancestral": "🏺",
  Alimentos: "🌽",
  Textiles: "🧵",
  Artesanías: "🏺",
  "Cosméticos y Bienestar": "🌿",
  "Arte y Cultura": "🎨",
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function SolicitarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user: contextUser } = useAuth();
  const { data: session } = useSession();
  const user = session?.user || contextUser;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingSolicitud, setLoadingSolicitud] = useState(true);
  const [solicitudActual, setSolicitudActual] = useState<Solicitud | null>(null);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [certificadoUrl, setCertificadoUrl] = useState("");
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [noElegible, setNoElegible] = useState(false);
  // Qué categorías padre están expandidas
  const [expandidas, setExpandidas] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    rfc: "",
    razon_social: "",
    direccion_calle: "",
    direccion_cp: "",
    direccion_ciudad: "",
    direccion_estado: "",
    datos_bancarios: "",
    id_region: null as number | null,
    produccion_calle: "",
    produccion_ciudad: "",
    produccion_estado: "",
    produccion_cp: "",
    produccion_referencia: "",
    categorias_ids: [] as number[],
  });

  // ── Helpers de jerarquía ──────────────────────────────────────────────────

  const categoriasRaiz = categorias.filter((c) => !c.id_padre);
  const subcategoriasDe = (idPadre: number) =>
    categorias.filter((c) => c.id_padre === idPadre);
  const tieneHijas = (id: number) => subcategoriasDe(id).length > 0;

  const toggleExpandida = (id: number) => {
    setExpandidas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Handlers de categorías ────────────────────────────────────────────────

  const handleCategoriaToggle = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      categorias_ids: prev.categorias_ids.includes(id)
        ? prev.categorias_ids.filter((c) => c !== id)
        : [...prev.categorias_ids, id],
    }));
  };

  // "Seleccionar todas" solo trabaja sobre las hojas (sin hijas) y subcategorías
  const todasLasHojas = categorias
    .filter((c) => !tieneHijas(c.id_categoria))
    .map((c) => c.id_categoria);

  const handleTodasCategorias = () => {
    const todasSeleccionadas = todasLasHojas.every((id) =>
      formData.categorias_ids.includes(id)
    );
    setFormData((prev) => ({
      ...prev,
      categorias_ids: todasSeleccionadas ? [] : todasLasHojas,
    }));
    // Expandir todas las que tienen hijas
    if (!todasLasHojas.every((id) => formData.categorias_ids.includes(id))) {
      setExpandidas(categorias.filter(tieneHijas.bind(null, 0) as any)
        .map((c) => c.id_categoria));
    }
  };

  const todasSeleccionadas =
    todasLasHojas.length > 0 &&
    todasLasHojas.every((id) => formData.categorias_ids.includes(id));

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }

    const initializePage = async () => {
      try {
        const [regionesData, categoriasData] = await Promise.all([
          api.productores.getRegiones(),
          api.categorias.getAll(),
        ]);
        setRegiones(regionesData as Region[]);
        setCategorias(categoriasData as Categoria[]);

        let token = (session as any)?.accessToken || getCookie("token");
        if (!token) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          token = getCookie("token");
        }

        if (token) {
          const userId = (user as any)?.id_usuario || (user as any)?.id;

          if (userId) {
            // ── VERIFICACIÓN DE PEDIDOS ──
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pedidos?id_usuario=${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const text = await res.text();
              const pedidos = text ? JSON.parse(text) : [];
              if (Array.isArray(pedidos) && pedidos.length > 0) {
                const tienePedidos = pedidos.some((p: any) =>
                  String(p.id_usuario) === String(userId)
                );
                if (tienePedidos) {
                  setNoElegible(true);
                  setLoadingSolicitud(false);
                  return;
                }
              }
            } catch (error) {
              console.error("Error silencioso en verificación de pedidos:", error);
            }

            // ── OBTENER SOLICITUD ACTUAL ──
            try {
              const solicitud = await api.productores.getMiSolicitud(token) as any;
              if (solicitud && solicitud.id_productor) {
                setSolicitudActual(solicitud as Solicitud);
              }
            } catch (err: any) {
              if (!err?.message?.includes("JSON") && !err?.message?.includes("404")) {
                console.error("Error al obtener solicitud:", err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error crítico al inicializar página:", err);
        setError("Hubo un problema al cargar la información inicial.");
      } finally {
        setLoadingSolicitud(false);
      }
    };

    initializePage();
  }, [isAuthenticated, authLoading, router, session, user]);

  // ── Estados de carga / bloqueo ────────────────────────────────────────────

  if (authLoading || loadingSolicitud) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (noElegible) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <Breadcrumb pageName="No disponible" />
        <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
              No puedes ser productor con esta cuenta
            </h2>
            <p className="mb-2 text-gray-500">Esta cuenta ya realizó pedidos como cliente.</p>
            <p className="mb-6 text-gray-500">
              Para vender en Tierra Agaves necesitas crear una cuenta nueva dedicada a tu actividad como productor.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => router.push("/producto")}
                className="rounded-lg border border-gray-4 px-6 py-3 font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Volver a la tienda
              </button>
              <button
                onClick={() => router.push("/auth/sign-up?vender=true")}
                className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
              >
                Crear cuenta nueva para vender
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Estados de solicitud existente ────────────────────────────────────────

  if (solicitudActual) {
    if (solicitudActual.estado === "pendiente") {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Breadcrumb pageName="Solicitud Pendiente" />
          <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">Solicitud en Revisión</h2>
              <p className="mb-6 text-gray-500">
                Tu solicitud para convertirte en productor está siendo revisada por un administrador.
              </p>
              <button onClick={() => router.push("/producto")} className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90">
                Volver a la tienda
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (solicitudActual.estado === "aprobado") {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Breadcrumb pageName="Ya eres Productor" />
          <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">¡Ya eres Productor!</h2>
              <p className="mb-6 text-gray-500">Tu solicitud fue aprobada. Ahora puedes publicar y vender tus productos.</p>
              <button onClick={() => router.push("/dashboard/productor")} className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90">
                Ir a mi dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (solicitudActual.estado === "rechazado") {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Breadcrumb pageName="Solicitud Rechazada" />
          <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">Solicitud Rechazada</h2>
              <p className="mb-2 text-gray-500">Tu solicitud fue rechazada.</p>
              <p className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
                <strong>Motivo:</strong> {solicitudActual.motivo_rechazo || "No especificado"}
              </p>
              <button
                onClick={() => {
                  setSolicitudActual(null);
                  setFormData({
                    rfc: "", razon_social: "", direccion_calle: "", direccion_cp: "",
                    direccion_ciudad: "", direccion_estado: "", datos_bancarios: "",
                    id_region: null, produccion_calle: "", produccion_ciudad: "",
                    produccion_estado: "", produccion_cp: "", produccion_referencia: "",
                    categorias_ids: [],
                  });
                }}
                className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ── Handlers del formulario ───────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertificadoFile(file);
    setUploading(true);
    setError("");
    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) { setError("Error: No se detectó sesión."); return; }
      const formDataUpload = new FormData();
      formDataUpload.append("archivo", file);
      formDataUpload.append("entidad_tipo", "productor_certificado");
      formDataUpload.append("tipo", "certificado");
      const result = await api.archivos.upload(token, formDataUpload);
      setCertificadoUrl((result as any).url || `/${(result as any).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el certificado");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    if (formData.categorias_ids.length === 0) {
      setError("Selecciona al menos una categoría de productos");
      setIsSubmitting(false);
      return;
    }
    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) { setError("Error: No se detectó sesión."); return; }
      if (!certificadoUrl) throw new Error("Sube el certificado primero");
      await api.productores.solicitar(token, {
        rfc: formData.rfc || undefined,
        razon_social: formData.razon_social || undefined,
        datos_bancarios: formData.datos_bancarios || undefined,
        direccion_fiscal: formData.direccion_calle || formData.direccion_ciudad ? {
          linea_1: formData.direccion_calle || undefined,
          ciudad: formData.direccion_ciudad || undefined,
          estado: formData.direccion_estado || undefined,
          codigo_postal: formData.direccion_cp || undefined,
          pais_iso2: "MX",
        } : undefined,
        direccion_produccion: formData.produccion_calle || formData.produccion_ciudad ? {
          linea_1: formData.produccion_calle || undefined,
          ciudad: formData.produccion_ciudad || undefined,
          estado: formData.produccion_estado || undefined,
          codigo_postal: formData.produccion_cp || undefined,
          referencia: formData.produccion_referencia || undefined,
          pais_iso2: "MX",
        } : undefined,
        id_region: formData.id_region ?? undefined,
        // @ts-ignore
        categorias_ids: formData.categorias_ids,
      } as any);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Pantalla de éxito ─────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <Breadcrumb pageName="Solicitud Enviada" />
        <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">Solicitud Enviada</h2>
            <p className="mb-6 text-gray-500">
              Tu solicitud ha sido enviada exitosamente. Un administrador la revisará pronto.
            </p>
            <button onClick={() => router.push("/producto")} className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90">
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Breadcrumb pageName="Solicitar ser Productor" />

      <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark dark:text-white">Solicitar ser Productor</h1>
          <p className="mt-1 text-gray-500">Completa el formulario para convertirte en productor en nuestra plataforma.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Datos Fiscales ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <Building2 className="h-5 w-5" />
              Datos Fiscales
            </h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Razón Social</label>
                <input type="text" name="razon_social" value={formData.razon_social} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Mi Empresa S.A. de C.V." />
              </div>
              <div className="w-44">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">RFC</label>
                <input type="text" name="rfc" value={formData.rfc} onChange={handleInputChange} maxLength={13}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark uppercase focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="XAXX010101000" />
              </div>
            </div>
          </div>

          {/* ── Dirección Fiscal ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <MapPin className="h-5 w-5" />
              Dirección Fiscal
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Calle y Número</label>
                <input type="text" name="direccion_calle" value={formData.direccion_calle} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Av. Principal #123" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Código Postal</label>
                <input type="text" name="direccion_cp" value={formData.direccion_cp} onChange={handleInputChange} maxLength={5}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="12345" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Ciudad</label>
                <input type="text" name="direccion_ciudad" value={formData.direccion_ciudad} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Ciudad de México" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Estado</label>
                <input type="text" name="direccion_estado" value={formData.direccion_estado} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="CDMX" />
              </div>
            </div>
          </div>

          {/* ── Lugar de Producción ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <MapPin className="h-5 w-5" />
              Lugar de Producción
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Calle y Número</label>
                <input type="text" name="produccion_calle" value={formData.produccion_calle} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Av. Producción #456" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Código Postal</label>
                <input type="text" name="produccion_cp" value={formData.produccion_cp} onChange={handleInputChange} maxLength={5}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="12345" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Ciudad</label>
                <input type="text" name="produccion_ciudad" value={formData.produccion_ciudad} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Oaxaca" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Estado</label>
                <input type="text" name="produccion_estado" value={formData.produccion_estado} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Oaxaca" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Referencia (opcional)</label>
                <input type="text" name="produccion_referencia" value={formData.produccion_referencia} onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Ej: Cerca del río, zona de ley seca" />
              </div>
            </div>
          </div>

          {/* ── Categorías de Productos (jerárquico) ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
                <ShoppingBag className="h-5 w-5" />
                Categorías de Productos *
              </h3>
              <button
                type="button"
                onClick={handleTodasCategorias}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-40"
                disabled={categorias.length === 0}
              >
                {todasSeleccionadas ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              Selecciona las categorías de productos que vas a ofrecer. Puedes elegir varias.
            </p>

            {categorias.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-400">Cargando categorías...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {categoriasRaiz.map((cat) => {
                  const hijas = subcategoriasDe(cat.id_categoria);
                  const expandida = expandidas.includes(cat.id_categoria);
                  const emoji = CATEGORIA_ICONS[cat.nombre] ?? "📦";

                  if (hijas.length > 0) {
                    // ── Categoría CON subcategorías: solo muestra el padre como acordeón ──
                    const algunaHijaSeleccionada = hijas.some((h) =>
                      formData.categorias_ids.includes(h.id_categoria)
                    );
                    const todasHijasSeleccionadas = hijas.every((h) =>
                      formData.categorias_ids.includes(h.id_categoria)
                    );

                    return (
                      <div key={cat.id_categoria} className="overflow-hidden rounded-xl border-2 border-gray-200 dark:border-dark-3">
                        {/* Cabecera del acordeón */}
                        <button
                          type="button"
                          onClick={() => toggleExpandida(cat.id_categoria)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                            algunaHijaSeleccionada
                              ? "bg-primary/10 dark:bg-primary/20"
                              : "bg-white dark:bg-dark"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl leading-none">{emoji}</span>
                            <span className={`font-medium ${algunaHijaSeleccionada ? "text-primary" : "text-dark dark:text-white"}`}>
                              {cat.nombre}
                            </span>
                            {algunaHijaSeleccionada && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                                {hijas.filter((h) => formData.categorias_ids.includes(h.id_categoria)).length}/{hijas.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{hijas.length} tipos</span>
                            {expandida
                              ? <ChevronUp className="h-4 w-4 text-gray-400" />
                              : <ChevronDown className="h-4 w-4 text-gray-400" />
                            }
                          </div>
                        </button>

                        {/* Subcategorías expandibles */}
                        {expandida && (
                          <div className="border-t border-gray-200 bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-2">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {hijas.map((sub) => {
                                const seleccionada = formData.categorias_ids.includes(sub.id_categoria);
                                const subEmoji = CATEGORIA_ICONS[sub.nombre] ?? "📦";
                                return (
                                  <button
                                    key={sub.id_categoria}
                                    type="button"
                                    onClick={() => handleCategoriaToggle(sub.id_categoria)}
                                    className={`relative flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-2 text-left transition-all duration-150 ${
                                      seleccionada
                                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                                        : "border-gray-200 bg-white hover:border-primary/40 dark:border-dark-3 dark:bg-dark"
                                    }`}
                                  >
                                    <span className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                      seleccionada ? "border-primary bg-primary" : "border-gray-300 dark:border-dark-3"
                                    }`}>
                                      {seleccionada && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                    </span>
                                    <span className="text-xl leading-none">{subEmoji}</span>
                                    <span className={`text-xs font-medium leading-tight ${seleccionada ? "text-primary" : "text-dark dark:text-gray-300"}`}>
                                      {sub.nombre}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ── Categoría SIN subcategorías: botón normal ──
                  const selected = formData.categorias_ids.includes(cat.id_categoria);
                  return (
                    <button
                      key={cat.id_categoria}
                      type="button"
                      onClick={() => handleCategoriaToggle(cat.id_categoria)}
                      className={`relative flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 ${
                        selected
                          ? "border-primary bg-primary/10 dark:bg-primary/20"
                          : "border-gray-200 bg-white hover:border-primary/40 dark:border-dark-3 dark:bg-dark"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        selected ? "border-primary bg-primary" : "border-gray-300 dark:border-dark-3"
                      }`}>
                        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-2xl leading-none">{emoji}</span>
                      <span className={`font-medium ${selected ? "text-primary" : "text-dark dark:text-white"}`}>
                        {cat.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Contador */}
            <div className="mt-3">
              <p className={`text-xs ${formData.categorias_ids.length === 0 ? "text-red-400" : "text-gray-400"}`}>
                {formData.categorias_ids.length === 0
                  ? "Debes seleccionar al menos una categoría"
                  : `${formData.categorias_ids.length} categoría${formData.categorias_ids.length > 1 ? "s" : ""} seleccionada${formData.categorias_ids.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* ── Datos Bancarios ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <CreditCard className="h-5 w-5" />
              Datos Bancarios (para pagos)
            </h3>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Número de cuenta o CLABE</label>
              <input type="text" name="datos_bancarios" value={formData.datos_bancarios} onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                placeholder="123456789012345678" />
              <p className="mt-1 text-xs text-gray-400">Estos datos se encriptan y solo se usan para procesar tus pagos</p>
            </div>
          </div>

          {/* ── Región ── */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Región *</label>
            <select
              name="id_region"
              value={formData.id_region ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, id_region: e.target.value ? Number(e.target.value) : null }))}
              required
              className="w-full rounded-lg border border-gray-4 bg-gray-1 px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            >
              <option value="">Selecciona una región</option>
              {regiones.map((r) => (
                <option key={r.id_region} value={r.id_region}>
                  {r.nombre} {r.estado_prov ? `(${r.estado_prov})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* ── Certificado ── */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Certificado de Origen (PDF o imagen) *
            </label>
            {certificadoUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-green-5 bg-green-1 p-4 dark:bg-green-9/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-dark dark:text-white">Certificado subido</span>
                </div>
                <button type="button" onClick={() => { setCertificadoUrl(""); setCertificadoFile(null); }}
                  className="text-sm text-red-500 hover:text-red-600">
                  Eliminar
                </button>
              </div>
            ) : (
              <div className="relative block w-full rounded-xl border border-dashed border-gray-4 bg-gray-2 hover:border-primary dark:border-dark-3 dark:bg-dark-2">
                <input type="file" id="certificado" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0" />
                <label htmlFor="certificado" className="flex cursor-pointer flex-col items-center justify-center p-6">
                  <UploadIcon className="mb-2 h-8 w-8 text-gray-4" />
                  <p className="text-body-sm font-medium text-gray-500">
                    <span className="text-primary">Click para subir</span> o arrastra
                  </p>
                  <p className="mt-1 text-body-xs text-gray-400">PDF, JPG, PNG (máx. 10MB)</p>
                </label>
              </div>
            )}
          </div>

          {/* ── Botones ── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => router.back()}
              className="flex items-center justify-center rounded-lg border border-gray-4 px-6 py-3 font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || !certificadoUrl || uploading}
              className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Enviando...</>
              ) : uploading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Subiendo archivo...</>
              ) : (
                "Enviar Solicitud"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}