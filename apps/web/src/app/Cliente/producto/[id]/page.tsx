"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, ArrowLeft, Star, MapPin, Heart, Truck, Zap, ChevronDown, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import type { ProductItem } from "@/types/producer";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";
import { useShipping } from "@/hooks/useShipping";
import RatingAgregado from "@/components/Cliente/RatingAgregado";
const ResenasSeccion = lazy(() => import("@/components/Cliente/ResenasSeccion"));
const ProductosSimilares = lazy(() => import("@/components/Cliente/ProductosRelacionados").then(m => ({ default: m.ProductosSimilares })));
const TambienCompraron = lazy(() => import("@/components/Cliente/ProductosRelacionados").then(m => ({ default: m.TambienCompraron })));
import AgeGate from "@/components/AgeGate";
import CategoryDisclaimer from "@/components/CategoryDisclaimer";
import { getEdadMinima } from "@/lib/edad";
import QRCode from "react-qr-code";

interface LoteData {
  datos_api?: Record<string, any>;
  id_productor?: number;
  codigo_lote?: string;
  sitio?: string;
  grado_alcohol?: number;
  nombre_comun?: string;
  nombre_cientifico?: string;
  unidades?: number;
  fecha_elaboracion?: string;
  estado_lote?: string;
  descripcion?: string;
  marca?: string;
  url_trazabilidad?: string;
  productores?: {
    usuarios?: {
      nombre: string;
    };
    biografia?: string;
    otras_caracteristicas?: string;
  };
}

interface Producto extends ProductItem {
  producto_imagenes?: { url: string }[];
  tipo_mezcal?: string;
  maguey?: string;
  destilacion?: string;
  molienda?: string;
  maestro_mezcalero?: string;
  perfil?: string;
  abv?: string;
  region?: string;
  codigo_lote?: string;
  sitio?: string;
  grado_alcohol?: number;
  marca?: string;
  descripcion_lote?: string;
  nombre_comun?: string;
  nombre_cientifico?: string;
  lotes?: LoteData;
  nombre_productor?: string;
  categorias?: string[];
  categorias_full?: Array<{ id_categoria: number; nombre: string; requiere_edad_minima: number | null }>;
  edad_minima?: number | null;
  requiere_edad_minima?: number | null;
  nombre_tienda?: string;
  tiendas?: {
    nombre?: string;
    descripcion?: string;
    ciudad_origen?: string;
    estado_origen?: string;
    pais_operacion?: string;
    nombre_contacto?: string;
    telefono_contacto?: string;
  };
}

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const [forceAgeGate, setForceAgeGate] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const { cotizarTodos } = useShipping();

  const fetchProducto = useCallback(async () => {
    const id = params.id;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.productos.getOne(id as string);
      setProducto(data as Producto);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchProducto(); }, [fetchProducto]);
  useEffect(() => { cotizarTodos(0.75, null); }, []);

  const handleAgregar = () => {
    if (!producto) return;
    const precioBase = producto.precio_base == null ? "0" : String(producto.precio_base);
    const res = agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: precioBase,
      imagen_principal_url: producto.imagen_principal_url ?? undefined,
      producto_imagenes: producto.producto_imagenes,
      edad_minima: producto.edad_minima ?? producto.requiere_edad_minima ?? null,
      cantidad,
    });
    if (!res.ok && res.reason === "age_required") {
      setForceAgeGate(true);
      return;
    }
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  const handleComprarAhora = () => {
    if (!producto) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in?redirect=/tienda/checkout");
      return;
    }
    const precioBase = producto.precio_base == null ? "0" : String(producto.precio_base);
    const res = agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: precioBase,
      imagen_principal_url: producto.imagen_principal_url ?? undefined,
      producto_imagenes: producto.producto_imagenes,
      edad_minima: producto.edad_minima ?? producto.requiere_edad_minima ?? null,
      cantidad,
    });
    if (!res.ok && res.reason === "age_required") {
      setForceAgeGate(true);
      return;
    }
    router.push("/tienda/checkout");
  };

  const todasImagenes = [
    producto?.imagen_principal_url,
    producto?.imagen_url,
    ...(producto?.producto_imagenes?.map((img) => img.url) || []),
  ].filter(Boolean) as string[];

  const loteData = producto?.lotes;
  const productor = loteData?.productores;
  const nombreProductor = producto?.nombre_productor || loteData?.productores?.usuarios?.nombre;
  const tiendaData = producto?.tiendas;
  const datosApi: Record<string, any> = loteData?.datos_api || {};

  const strFromApi = (v: any): string | undefined =>
    v && typeof v === "object" ? (v.nombre ?? undefined) : (v || undefined);

  const region = strFromApi(datosApi.region) || loteData?.sitio;
  const codigoLote =
    strFromApi(datosApi.codigo_lote) ||
    strFromApi(datosApi.folio) ||
    strFromApi(datosApi.uuid) ||
    loteData?.codigo_lote ||
    null;
  const sitio = strFromApi(datosApi.sitio) || loteData?.sitio;
  const gradoAlcohol = datosApi.grado_alcohol ? Number(datosApi.grado_alcohol) : loteData?.grado_alcohol;
  const nombreComun = strFromApi(datosApi.nombre_comun) || loteData?.nombre_comun;
  const nombreCientifico = strFromApi(datosApi.nombre_cientifico) || loteData?.nombre_cientifico;
  const unidades = loteData?.unidades;
  const fechaElaboracion = loteData?.fecha_elaboracion
    ? new Date(loteData.fecha_elaboracion).toLocaleDateString("es-MX")
    : null;
  const estadoLote = loteData?.estado_lote;
  const marcaLote = strFromApi(datosApi.marca) || loteData?.marca;
  const urlTrazabilidad =
    loteData?.url_trazabilidad ||
    (typeof datosApi.url_trazabilidad === "string" ? datosApi.url_trazabilidad : null) ||
    null;

  // Specs grouping for mezcal domain
  const specGroups = {
    "Dónde y Qué": [
      { label: "Región de Origen", value: region, help: "Estado o región donde se produjo" },
      { label: "Tipo de Maguey", value: producto?.maguey, help: "La planta base del mezcal" },
      { label: "Clasificación", value: producto?.tipo_mezcal, help: "Artesanal, ancestral, o industrial" },
      { label: "Maestro Productor", value: producto?.maestro_mezcalero, help: "Productor responsable" },
    ],
    "Cómo se Hace": [
      { label: "Tipo de Horno", value: producto?.destilacion, help: "Método de cocción del maguey" },
      { label: "Molienda", value: producto?.molienda, help: "Cómo se tritura el maguey" },
      { label: "Graduación Alcohólica", value: producto?.abv ? `${producto.abv}%` : gradoAlcohol ? `${gradoAlcohol}%` : null, help: "Fuerza del mezcal" },
    ],
    "Cómo Sabe": [
      { label: "Notas de Sabor", value: producto?.perfil, help: "Aromas y sabores principales" },
      { label: "Nombre Local", value: nombreComun, help: "Cómo se conoce la planta localmente" },
      { label: "Nombre Científico", value: nombreCientifico, help: "Clasificación botánica" },
    ],
  } as const;

  // Filter out empty specs
  const filteredGroups = Object.fromEntries(
    Object.entries(specGroups).map(([group, specs]) => [
      group,
      specs.filter((spec) => spec.value),
    ])
  );

  // Hero specs (always show if populated)
  const magueySpec = producto?.maguey;
  const categoriaSpec = producto?.tipo_mezcal;
  const abvSpec = producto?.abv ? `${producto.abv}%` : gradoAlcohol ? `${gradoAlcohol}%` : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600 dark:border-gray-700 dark:border-t-green-500" />
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Cargando detalles del producto...</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Por favor espera</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 max-w-md text-center">
            <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">Producto no disponible</p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error ? `Error: ${error}` : "El producto que buscas no existe o no está disponible en este momento."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
              style={{ border: "1px solid #e8dcc8", color: "var(--bio-color-precio, #8b6914)" }}
            >
              <ArrowLeft size={18} />
              Volver
            </button>
            <Link
              href="/Cliente/producto"
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
              style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const productoId = String(producto.id_producto);
  const edadMinimaProducto = getEdadMinima(producto);

  return (
    <div
      className="mx-auto max-w-screen-xl px-4 py-8 md:px-8"
      style={{ backgroundColor: "var(--bio-color-fondo, #faf8f4)", minHeight: "100vh" }}
    >
      <AgeGate
        edadMinima={edadMinimaProducto}
        forceOpen={forceAgeGate}
        onVerified={() => setForceAgeGate(false)}
        onDeny={() => {
          setForceAgeGate(false);
          if (!forceAgeGate) router.push("/");
        }}
      />
      <button
        onClick={() => router.back()}
        className="mb-8 flex items-center gap-2 hover:opacity-70 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg p-2 -ml-2"
        style={{ color: "var(--bio-color-precio, #8b6914)" }}
        aria-label="Volver a la página anterior"
      >
        <ArrowLeft size={20} />
        Volver a productos
      </button>

      {/* Breadcrumb de categorías */}
      {producto.categorias && producto.categorias.length > 0 && (
        <nav aria-label="Categorías de producto" className="mb-10">
          <div className="flex flex-wrap gap-2">
            {producto.categorias.map((cat, idx) => (
              <Link
                key={cat}
                href={`/categoria/${encodeURIComponent(cat)}`}
                className="text-xs font-medium rounded-full px-3 py-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[32px] flex items-center"
                style={{ backgroundColor: "#f0ebe0", color: "var(--bio-color-precio, #8b6914)", border: "1px solid #e8dcc8" }}
              >
                {cat}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* ── Grid principal ─────────────────────────────────────────────────── */}
      <div className="grid gap-10 lg:gap-14 lg:grid-cols-2">

        {/* Columna izquierda — Imágenes */}
        <div className="space-y-8">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm">
            {todasImagenes[imagenSeleccionada] ? (
              <Image
                src={todasImagenes[imagenSeleccionada]}
                alt={producto.nombre}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={imagenSeleccionada === 0}
                loading={imagenSeleccionada === 0 ? "eager" : "lazy"}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">Sin imagen</div>
            )}
          </div>

          {todasImagenes.length > 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Vistas del producto</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {todasImagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagenSeleccionada(idx)}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      borderColor: idx === imagenSeleccionada ? "var(--bio-color-precio, #8b6914)" : "transparent",
                      opacity: idx === imagenSeleccionada ? 1 : 0.6
                    }}
                    aria-label={`Ver imagen ${idx + 1} de ${todasImagenes.length}`}
                    aria-current={idx === imagenSeleccionada ? "true" : "false"}
                  >
                    <Image src={img} alt={`${producto.nombre} vista ${idx + 1}`} fill sizes="80px" className="object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trazabilidad QR */}
          {loteData && (
            <div className="rounded-lg p-7 sm:p-8">
              <h2
                className="text-lg sm:text-xl font-semibold mb-3"
                style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
              >
                Rastreo y Autenticidad
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Verifica que este mezcal es auténtico escaneando el código QR. Desde dónde se produjo hasta tu mano.</p>
              {urlTrazabilidad ? (
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                      <QRCode value={urlTrazabilidad} size={140} level="H" />
                    </div>
                  </div>

                  {/* Info + CTA */}
                  <div className="flex-1 space-y-4">
                    {codigoLote && (
                      <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Tu código de lote</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Abre el portal oficial con el botón de abajo o escanea el QR con tu teléfono para ver todos los detalles: productor, región, procedencia.</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white break-words font-mono">{codigoLote}</p>
                        
                      </div>
                    )}
                    <div>
                        
                      <a
                        href={urlTrazabilidad}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                        style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
                      >
                        Verifica aquí
                        <span>→</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Este mezcal aún no tiene código de rastreo. Pronto podrás verificar su autenticidad aquí.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Specifications Accordion - detailed specs */}
          {Object.entries(filteredGroups).length > 0 && (
            <div className="space-y-4 mt-10 pt-10 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Detalles Técnicos</p>
              {Object.entries(filteredGroups).map(([groupName, specs]) =>
                specs.length > 0 ? (
                  <div key={groupName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === groupName ? null : groupName)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-inset"
                      style={{
                        backgroundColor: expandedGroup === groupName ? "var(--bio-color-fondo, #faf8f4)" : "transparent",
                        outlineColor: "var(--bio-color-precio, #8b6914)"
                      }}
                      aria-expanded={expandedGroup === groupName}
                      aria-controls={`specs-${groupName}`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white text-left text-sm">{groupName}</span>
                      <ChevronDown
                        size={18}
                        className={`transition-transform flex-shrink-0 ml-2 ${expandedGroup === groupName ? "rotate-180" : ""}`}
                        style={{ color: "var(--bio-color-precio, #8b6914)" }}
                        aria-hidden="true"
                      />
                    </button>
                    {expandedGroup === groupName && (
                      <div
                        id={`specs-${groupName}`}
                        className="px-4 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-4"
                        role="region"
                        aria-labelledby={`specs-${groupName}-title`}
                      >
                        {specs.map((spec) => (
                          <div key={spec.label} className="space-y-1">
                            <div className="flex justify-between items-start gap-4 min-w-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">{spec.label}</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 text-right break-words">{spec.value || "—"}</span>
                            </div>
                            {spec.help && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{spec.help}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Columna derecha — Info */}
        <div className="space-y-9 lg:space-y-10">

          {/* Nombre y precio */}
          <div className="space-y-4">
            <h1
              className="text-3xl sm:text-4xl font-bold break-words leading-tight"
              style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
            >
              {producto.nombre}
            </h1>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-precio, #8b6914)" }}
            >
              ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })}
            </p>
          </div>

          {/* ★ Rating agregado */}
          <RatingAgregado productoId={productoId} />

          {/* Disclaimer regulatorio */}
          <CategoryDisclaimer
            categorias={producto.categorias_full ?? []}
            gradoAlcohol={producto.grado_alcohol ?? producto.lotes?.grado_alcohol ?? null}
          />

          {/* Hero Specs - Key characteristics first */}
          {(magueySpec || categoriaSpec || abvSpec) && (
            <div className="space-y-4 rounded-lg p-6 sm:p-7" style={{ backgroundColor: "var(--bio-color-fondo-sec, #f0ebe0)", border: "2px solid var(--bio-color-precio, #8b6914)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Lo Importante</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {magueySpec && (
                  <div className="space-y-2">
                    <span className="block text-xs text-gray-600 dark:text-gray-400">Maguey</span>
                    <p className="font-semibold text-base break-words" style={{ color: "var(--bio-color-titulo, #5c3d1e)", fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}>{magueySpec}</p>
                  </div>
                )}
                {categoriaSpec && (
                  <div className="space-y-2">
                    <span className="block text-xs text-gray-600 dark:text-gray-400">Categoría</span>
                    <p className="font-semibold text-base break-words" style={{ color: "var(--bio-color-titulo, #5c3d1e)", fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}>{categoriaSpec}</p>
                  </div>
                )}
                {abvSpec && (
                  <div className="space-y-2">
                    <span className="block text-xs text-gray-600 dark:text-gray-400">ABV</span>
                    <p className="font-semibold text-base break-words" style={{ color: "var(--bio-color-titulo, #5c3d1e)", fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}>{abvSpec}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Producer + Store info - simplified grouping */}
          <div className="space-y-5 pt-6 pb-8 border-b border-gray-200 dark:border-gray-700">
            {/* Maestro Productor */}
            {productor && (
              <div className="space-y-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
                >
                  Maestro Productor
                </h3>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {loteData?.id_productor ? (
                    <Link
                      href={`/Cliente/productor/${loteData.id_productor}`}
                      className="font-medium hover:opacity-70 transition-opacity block"
                      style={{ color: "var(--bio-color-precio, #8b6914)" }}
                    >
                      {nombreProductor} →
                    </Link>
                  ) : (
                    <p className="font-medium">{nombreProductor}</p>
                  )}
                  {productor.biografia && <p className="text-xs text-gray-600 dark:text-gray-400">{productor.biografia}</p>}
                </div>
              </div>
            )}

            {/* Tienda */}
            {tiendaData && (
              <div className="space-y-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
                >
                  Tienda
                </h3>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {producto.id_tienda ? (
                    <Link
                      href={`/Cliente/tienda/${producto.id_tienda}`}
                      className="font-medium hover:opacity-70 transition-opacity block"
                      style={{ color: "var(--bio-color-precio, #8b6914)" }}
                    >
                      {tiendaData.nombre} →
                    </Link>
                  ) : (
                    <p className="font-medium">{tiendaData.nombre}</p>
                  )}
                  {(tiendaData.ciudad_origen || tiendaData.estado_origen) && (
                    <p className="flex items-center gap-1 text-xs">
                      <MapPin size={13} />
                      {[tiendaData.ciudad_origen, tiendaData.estado_origen].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Descripción</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-[65ch]">
              {producto.descripcion || "Sin descripción disponible"}
            </p>
          </div>

          {/* Cantidad + acciones */}
          <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 active:scale-95"
                    style={{ border: "1px solid #e8dcc8", backgroundColor: "#f0ebe0", color: "var(--bio-color-titulo, #5c3d1e)" }}
                    title="Disminuir cantidad"
                    aria-label="Restar una botella"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold text-base" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>{cantidad}</span>
                  <button
                    onClick={() => setCantidad(cantidad + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 active:scale-95"
                    style={{ border: "1px solid #e8dcc8", backgroundColor: "#f0ebe0", color: "var(--bio-color-titulo, #5c3d1e)" }}
                    title="Aumentar cantidad"
                    aria-label="Agregar una botella"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Envío */}
            <div className="rounded-lg p-4 sm:p-5" style={{ border: "1px solid #e8dcc8", backgroundColor: "#fdf7ee" }}>
              <div className="flex items-center gap-2 mb-3">
                <Truck size={16} style={{ color: "var(--bio-color-precio, #8b6914)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>Envío</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Te mostraremos el costo cuando ingreses tu dirección. Enviamos a todo el país.
              </p>
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    if (!producto) return;
                    if (!isAuthenticated) {
                      router.push(`/auth/sign-in?redirect=/Cliente/producto/${producto.id_producto}`);
                      return;
                    }
                    if (isInWishlist(producto.id_producto)) {
                      eliminarWishlist(producto.id_producto);
                    } else {
                      agregarWishlist({
                        id_producto: producto.id_producto,
                        nombre: producto.nombre,
                        precio_base: producto.precio_base == null ? "0" : String(producto.precio_base),
                        imagen_principal_url: producto.imagen_principal_url ?? undefined,
                        producto_imagenes: producto.producto_imagenes,
                      });
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 sm:px-6 font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] active:scale-95"
                  style={{
                    backgroundColor: isInWishlist(producto.id_producto) ? "#fdf7ee" : "transparent",
                    color: isInWishlist(producto.id_producto) ? "var(--bio-color-precio, #8b6914)" : "var(--bio-color-titulo, #5c3d1e)",
                    border: "1px solid #e8dcc8",
                  }}
                  aria-label={isInWishlist(producto.id_producto) ? "Remover de mi lista" : "Agregar a mi lista"}
                  aria-pressed={isInWishlist(producto.id_producto)}
                  title={isInWishlist(producto.id_producto) ? "Remover de mi lista" : "Guarda este mezcal para luego"}
                >
                  <Heart size={20} fill={isInWishlist(producto.id_producto) ? "currentColor" : "none"} aria-hidden="true" />
                  <span className="hidden sm:inline">{isInWishlist(producto.id_producto) ? "En mi lista" : "Mi lista"}</span>
                  <span className="sm:hidden">{isInWishlist(producto.id_producto) ? "✓" : "♡"}</span>
                </button>
                <button
                  onClick={handleAgregar}
                  disabled={agregado}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 sm:px-6 font-medium transition-all duration-200 text-white hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                  style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
                  aria-busy={agregado}
                >
                  <ShoppingCart size={20} aria-hidden="true" />
                  <span className="hidden sm:inline">{agregado ? "¡Agregado!" : "Agregar al carrito"}</span>
                  <span className="sm:hidden">{agregado ? "✓" : "+"}</span>
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleComprarAhora}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 sm:px-6 font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                  style={{ backgroundColor: "var(--bio-color-boton2, #8b6914)" }}
                  title="Ir al carrito y completar tu compra"
                >
                  <Zap size={20} aria-hidden="true" />
                  <span className="hidden sm:inline">Comprar ahora</span>
                  <span className="sm:hidden">Comprar</span>
                </button>
                <a
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(producto.nombre)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded px-4 py-3 sm:px-6 font-semibold transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                  style={{ backgroundColor: "#FF9900", color: "white" }}
                  title="Buscar en Amazon"
                >
                  {/* Amazon logo - stylized "a" and "z" with smile arc */}
                  <svg className="w-6 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    {/* A */}
                    <path d="M4 20v-8l4-8h1l4 8v8H12v-2H8v2H4z" fill="currentColor"/>
                    {/* Z */}
                    <path d="M16 12h4v2h-4v6h4v2h-6v-2h4v-4h-4v-2h2v-2h2z" fill="currentColor"/>
                    {/* Smile arc connecting a-z */}
                    <path d="M8 22Q16 20 20 22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">Comprar en Amazon</span>
                  <span className="sm:hidden">Amazon</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Reseñas ────────────────────────────────────────────────────────── */}
      <div className="mt-28 border-t border-gray-300 dark:border-gray-700 pt-16">
        <Suspense fallback={<div className="py-12 text-center text-gray-500 dark:text-gray-400">Cargando reseñas...</div>}>
          <ResenasSeccion productoId={productoId} />
        </Suspense>
      </div>

      {/* ── Productos relacionados ─────────────────────────────────────────── */}
      <div className="mt-28 border-t border-gray-300 dark:border-gray-700 pt-16 space-y-24">
        <Suspense fallback={<div className="py-12 text-center text-gray-500 dark:text-gray-400">Cargando productos similares...</div>}>
          <ProductosSimilares productoId={productoId} />
        </Suspense>
        <Suspense fallback={<div className="py-12 text-center text-gray-500 dark:text-gray-400">Cargando más productos...</div>}>
          <TambienCompraron productoId={productoId} />
        </Suspense>
      </div>
    </div>
  );
}