"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media";
import { ShoppingCart, ArrowLeft, Star, MapPin, Heart, Truck, Zap, ExternalLink, Package } from "lucide-react";
import { api } from "@/lib/api";
import type { ProductItem } from "@/types/producer";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
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
      apellido_paterno?: string;
      apellido_materno?: string;
    };
    biografia?: string;
    otras_caracteristicas?: string;
  };
}

function nombreCompleto(usuario?: { nombre?: string; apellido_paterno?: string; apellido_materno?: string } | null): string | undefined {
  if (!usuario?.nombre) return undefined;
  return [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(" ");
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
    productores?: {
      usuarios?: {
        nombre: string;
        apellido_paterno?: string;
        apellido_materno?: string;
      };
    };
  };
}

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { agregarProducto, items: carritoItems } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { t, convertPrice } = useLocale();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const [forceAgeGate, setForceAgeGate] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const fetchProducto = useCallback(async () => {
    const id = params.id;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.productos.getOne(id as string);
      setProducto(data as Producto);
      if ((data as any).stock !== undefined) setStock((data as any).stock);
      api.inventario.getByProducto(id as string)
        .then((inv) => { if (inv?.stock !== undefined) setStock(inv.stock); })
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchProducto(); }, [fetchProducto]);

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
    if (!res.ok) {
      if (res.reason === "age_required") setForceAgeGate(true);
      if (res.reason === "not_authenticated") router.push("/auth/sign-in?redirect=/tienda/checkout");
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
  const nombreProductor =
    producto?.nombre_productor ||
    nombreCompleto(loteData?.productores?.usuarios) ||
    nombreCompleto(producto?.tiendas?.productores?.usuarios);
  const tiendaData = producto?.tiendas;
  const datosApi: Record<string, any> = loteData?.datos_api || {};

  const strFromApi = (v: any): string | undefined =>
    v && typeof v === "object" ? (v.nombre ?? undefined) : (v || undefined);

  const codigoLote =
    strFromApi(datosApi.codigo_lote) ||
    strFromApi(datosApi.folio) ||
    strFromApi(datosApi.uuid) ||
    loteData?.codigo_lote ||
    null;
  const sitio = strFromApi(datosApi.sitio) || loteData?.sitio;
  const gradoAlcohol = datosApi.grado_alcohol ? Number(datosApi.grado_alcohol) : loteData?.grado_alcohol;
  const fechaElaboracionRaw =
    loteData?.fecha_elaboracion ??
    datosApi.fecha_elaboracion ??
    datosApi.fecha_registro ??
    null;
  const fechaElaboracion = fechaElaboracionRaw
    ? new Date(fechaElaboracionRaw).toLocaleDateString("es-MX")
    : null;
  const estadoLote = loteData?.estado_lote;
  const marcaLote = strFromApi(datosApi.marca) || loteData?.marca;
  const urlTrazabilidad =
    loteData?.url_trazabilidad ||
    (typeof datosApi.url_trazabilidad === "string" ? datosApi.url_trazabilidad : null) ||
    null;

  const fichaTecnica = [
    { label: t("Maestro mezcalero"), value: producto?.maestro_mezcalero || nombreProductor },
    { label: t("Sitio"), value: sitio },
    { label: t("Grado alcohólico"), value: gradoAlcohol ? `${gradoAlcohol}°GL` : (producto?.abv ? `${producto.abv}%` : null) },
    { label: t("Fecha de elaboración"), value: fechaElaboracion },
  ].filter((d) => d.value);

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8" style={{ backgroundColor: "var(--bio-color-fondo)", minHeight: "100vh" }}>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600 dark:border-gray-700 dark:border-t-green-500" />
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">{t("Cargando detalles del producto...")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{t("Por favor espera")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8" style={{ backgroundColor: "var(--bio-color-fondo)", minHeight: "100vh" }}>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 max-w-md text-center">
            <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">{t("Producto no disponible")}</p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error ? `Error: ${error}` : t("El producto que buscas no existe o no está disponible en este momento.")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
              style={{ border: "1px solid var(--bio-color-borde, #ddd8c4)", color: "var(--bio-color-boton)" }}
            >
              <ArrowLeft size={18} />
              {t("Volver")}
            </button>
            <Link
              href="/cliente/producto"
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
              style={{ backgroundColor: "var(--bio-color-titulo)" }}
            >
              {t("Ver catálogo")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const productoId = String(producto.id_producto);
  const edadMinimaProducto = getEdadMinima(producto);
  const enCarritoActual = carritoItems.find(i => String(i.id_producto) === String(producto.id_producto))?.cantidad ?? 0;
  const stockDisponible = stock !== null ? Math.max(0, stock - enCarritoActual) : null;

  return (
    <div
      className="mx-auto max-w-screen-xl px-4 py-8 md:px-8"
      style={{ backgroundColor: "var(--bio-color-fondo)", minHeight: "100vh" }}
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
        style={{ color: "var(--bio-color-boton)" }}
        aria-label={t("Volver a productos")}
      >
        <ArrowLeft size={20} />
        {t("Volver a productos")}
      </button>

      {/* ── Grid principal ─────────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:gap-10 lg:grid-cols-2">

        {/* Columna izquierda — Galería de imágenes */}
        <div className="space-y-6">
          <div data-tour="product-gallery" className="flex gap-3">

            {/* Tira de miniaturas */}
            {todasImagenes.length > 1 && (
              <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: "76px" }}>
                {todasImagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagenSeleccionada(idx)}
                    className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-lg border-2 bg-gray-50 dark:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-100 duration-150"
                    style={{
                      borderColor: idx === imagenSeleccionada ? "var(--bio-color-boton)" : "transparent",
                      opacity: idx === imagenSeleccionada ? 1 : 0.55,
                    }}
                    aria-label={`Ver imagen ${idx + 1} de ${todasImagenes.length}`}
                    aria-current={idx === imagenSeleccionada ? "true" : "false"}
                  >
                    <Image
                      src={getMediaUrl(img)}
                      alt={`${producto.nombre} vista ${idx + 1}`}
                      fill
                      sizes="72px"
                      className="object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Imagen principal */}
            <div
              className="relative flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm"
              style={{ minHeight: "380px", maxHeight: "500px" }}
            >
              {todasImagenes[imagenSeleccionada] ? (
                <Image
                  src={getMediaUrl(todasImagenes[imagenSeleccionada])}
                  alt={producto.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 45vw"
                  className="object-contain"
                  priority={imagenSeleccionada === 0}
                  loading={imagenSeleccionada === 0 ? "eager" : "lazy"}
                  quality={90}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 p-8">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-sm text-center">Sin imagen disponible</p>
                </div>
              )}

              {todasImagenes.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-semibold">
                  {imagenSeleccionada + 1} / {todasImagenes.length}
                </div>
              )}

              {todasImagenes.length > 1 && (
                <>
                  <button
                    onClick={() => setImagenSeleccionada((prev) => (prev === 0 ? todasImagenes.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full p-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 z-10"
                    style={{ outlineColor: "var(--bio-color-precio)" }}
                    aria-label="Imagen anterior"
                  >
                    <svg className="w-4 h-4 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setImagenSeleccionada((prev) => (prev === todasImagenes.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full p-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 z-10"
                    style={{ outlineColor: "var(--bio-color-precio)" }}
                    aria-label="Imagen siguiente"
                  >
                    <svg className="w-4 h-4 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Trazabilidad QR */}
          {loteData && (
            <div data-tour="product-trazabilidad" className="rounded-lg p-5 sm:p-6">
              <h2
                className="text-lg sm:text-xl font-semibold mb-3"
                style={{ fontFamily: "var(--bio-fuente-titulo)", color: "var(--bio-color-titulo)" }}
              >
                {t("Rastreo y Autenticidad")}
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                {t("Verifica que este mezcal es auténtico escaneando el código QR. Desde dónde se produjo hasta tu mano.")}
              </p>
              {urlTrazabilidad ? (
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                  <div className="flex-shrink-0">
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                      <QRCode value={urlTrazabilidad} size={140} level="H" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    {codigoLote && (
                      <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{t("Tu código de lote")}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{t("Abre el portal oficial con el botón de abajo o escanea el QR con tu teléfono para ver todos los detalles: productor, región, procedencia.")}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white break-words font-mono">{codigoLote}</p>
                      </div>
                    )}
                    <div>
                      <a
                        href={urlTrazabilidad}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                        style={{ backgroundColor: "var(--bio-color-titulo)" }}
                      >
                        {t("Verifica aquí")}
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

          {/* Ficha técnica */}
          <div className="space-y-3 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">{t("Ficha técnica")}</p>
            {fichaTecnica.length > 0 ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
                {fichaTecnica.map((spec) => (
                  <div key={spec.label} className="flex justify-between items-start gap-4 px-4 py-3 bg-white dark:bg-gray-800/50">
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">{spec.label}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 text-right break-words">{spec.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Los detalles técnicos de este producto aún no han sido completados. Contáctanos o revisa con el productor para más información.")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha — Info */}
        <div className="space-y-7 lg:space-y-8">

          {/* Nombre y precio */}
          <div className="space-y-2">
            <h1
              className="text-3xl sm:text-4xl font-bold break-words leading-tight"
              style={{ fontFamily: "var(--bio-fuente-titulo)", color: "var(--bio-color-titulo)" }}
            >
              {producto.nombre}
            </h1>
            <p
              data-tour="product-price"
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--bio-fuente-titulo)", color: "var(--bio-color-precio)" }}
            >
              {convertPrice(Number(producto.precio_base || 0))}
            </p>

            {producto.categorias && producto.categorias.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {producto.categorias.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-default"
                    style={{
                      backgroundColor: "var(--bio-color-tarjeta, #e5eedc)",
                      color: "var(--bio-color-boton)",
                      border: "1px solid var(--bio-color-borde, #c8ddb8)",
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer regulatorio */}
          <CategoryDisclaimer
            categorias={producto.categorias_full ?? []}
            gradoAlcohol={producto.grado_alcohol ?? producto.lotes?.grado_alcohol ?? null}
          />

          {/* Cantidad + acciones */}
          <div className="space-y-5 pt-6 border-t border-gray-200 dark:border-gray-700">

            {/* Badge de stock */}
            {stockDisponible !== null && (
              <div
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: stockDisponible === 0 ? "#fef2f2" : stockDisponible <= 10 ? "#fffbeb" : "#f0fdf4",
                  border: `1px solid ${stockDisponible === 0 ? "#fecaca" : stockDisponible <= 10 ? "#fde68a" : "#bbf7d0"}`,
                  color: stockDisponible === 0 ? "#dc2626" : stockDisponible <= 10 ? "#d97706" : "#16a34a",
                }}
              >
                <Package size={15} />
                {stockDisponible === 0
                  ? "Agotado"
                  : stockDisponible <= 10
                  ? `Solo ${stockDisponible} unidad${stockDisponible === 1 ? "" : "es"} disponible${stockDisponible === 1 ? "" : "s"}`
                  : `${stockDisponible} unidades en stock`}
              </div>
            )}

            <div className="flex items-center gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("Cantidad")}</label>
                <div data-tour="quantity-selector" className="flex items-center gap-3">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:opacity-80 transition-all duration-150 active:scale-95"
                    style={{
                      border: "1px solid var(--bio-color-borde, #ddd8c4)",
                      backgroundColor: "var(--bio-color-tarjeta, #e5eedc)",
                      color: "var(--bio-color-titulo)",
                    }}
                    title="Disminuir cantidad"
                    aria-label="Restar una botella"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold text-base" style={{ color: "var(--bio-color-titulo)" }}>{cantidad}</span>
                  <button
                    onClick={() => setCantidad(cantidad + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:opacity-80 transition-all duration-150 active:scale-95"
                    style={{
                      border: "1px solid var(--bio-color-borde, #ddd8c4)",
                      backgroundColor: "var(--bio-color-tarjeta, #e5eedc)",
                      color: "var(--bio-color-titulo)",
                    }}
                    title="Aumentar cantidad"
                    aria-label="Agregar una botella"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Envío */}
            <div
              className="rounded-lg p-3 sm:p-4"
              style={{
                border: "1px solid var(--bio-color-borde, #e8dcc8)",
                backgroundColor: "var(--bio-color-tarjeta, #fdf7ee)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Truck size={16} style={{ color: "var(--bio-color-precio)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--bio-color-titulo)" }}>{t("Envío")}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("Te mostraremos el costo cuando ingreses tu dirección. Enviamos a todo el país.")}
              </p>
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (!producto) return;
                    if (!isAuthenticated) {
                      router.push(`/auth/sign-in?redirect=/cliente/producto/${producto.id_producto}`);
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
                    backgroundColor: isInWishlist(producto.id_producto) ? "var(--bio-color-tarjeta, #edf5e5)" : "transparent",
                    color: isInWishlist(producto.id_producto) ? "var(--bio-color-boton)" : "var(--bio-color-titulo)",
                    border: "1px solid var(--bio-color-borde, #ddd8c4)",
                  }}
                  aria-label={isInWishlist(producto.id_producto) ? "Remover de mi lista" : "Agregar a mi lista"}
                  aria-pressed={isInWishlist(producto.id_producto)}
                >
                  <Heart size={20} fill={isInWishlist(producto.id_producto) ? "currentColor" : "none"} aria-hidden="true" />
                  <span className="hidden sm:inline">{isInWishlist(producto.id_producto) ? t("En mi lista") : t("Mi lista")}</span>
                  <span className="sm:hidden">{isInWishlist(producto.id_producto) ? "✓" : "♡"}</span>
                </button>
                <button
                  data-tour="add-to-cart-btn"
                  onClick={handleAgregar}
                  disabled={agregado || stockDisponible === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 sm:px-6 font-medium transition-all duration-200 text-white hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                  style={{ backgroundColor: stockDisponible === 0 ? "#9ca3af" : "var(--bio-color-titulo)" }}
                  aria-busy={agregado}
                >
                  <ShoppingCart size={20} aria-hidden="true" />
                  <span className="hidden sm:inline">{agregado ? t("catalog_added_success") : t("Agregar al carrito")}</span>
                  <span className="sm:hidden">{agregado ? "✓" : "+"}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  data-tour="buy-now-btn"
                  onClick={handleComprarAhora}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 sm:px-6 font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]"
                  style={{ backgroundColor: "var(--bio-color-boton)" }}
                >
                  <Zap size={20} aria-hidden="true" />
                  <span className="hidden sm:inline">{t("Comprar ahora")}</span>
                  <span className="sm:hidden">{t("Comprar")}</span>
                </button>
                <a
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(producto.nombre)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded px-4 py-3 sm:px-6 font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] border-2"
                  style={{ backgroundColor: "#ffffff", color: "#131921", borderColor: "#FF9900" }}
                >
                  <img src="/images/amazon-icon.png" alt="Amazon" className="w-6 h-6 object-contain" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("Comprar en Amazon")}</span>
                  <span className="sm:hidden">Amazon</span>
                </a>
              </div>
            </div>
          </div>

          {/* Productor + Tienda */}
          <div className="pt-5 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-6">
              {(productor || nombreProductor) && (
                <div className="space-y-2">
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: "var(--bio-fuente-titulo)", color: "var(--bio-color-titulo)" }}
                  >
                    {t("Maestro Productor")}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium" style={{ color: "var(--bio-color-boton)" }}>{nombreProductor}</p>
                    {productor?.biografia && <p className="text-xs text-gray-600 dark:text-gray-400">{productor.biografia}</p>}
                  </div>
                </div>
              )}

              {tiendaData && (
                <div className="space-y-2">
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: "var(--bio-fuente-titulo)", color: "var(--bio-color-titulo)" }}
                  >
                    {t("Tienda")}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {producto.id_tienda ? (
                      <Link
                        href={`/cliente/tienda/${producto.id_tienda}`}
                        className="font-medium hover:opacity-70 transition-opacity block"
                        style={{ color: "var(--bio-color-boton)" }}
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
          </div>

          {/* Descripción */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("Descripción")}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-[65ch]">
              {producto.descripcion || t("Sin descripción disponible")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Reseñas ────────────────────────────────────────────────────────── */}
      <div className="mt-20 border-t border-gray-300 dark:border-gray-700 pt-12">
        <Suspense fallback={<div className="py-12 text-center text-gray-500 dark:text-gray-400">{t("Cargando reseñas...")}</div>}>
          <ResenasSeccion productoId={productoId} />
        </Suspense>
      </div>

      {/* ── Productos relacionados ─────────────────────────────────────────── */}
      <div className="mt-20 border-t border-gray-300 dark:border-gray-700 pt-12 space-y-20">
        <Suspense fallback={<div className="py-12 text-center text-gray-500 dark:text-gray-400">{t("Cargando productos similares...")}</div>}>
          <ProductosSimilares productoId={productoId} />
        </Suspense>
        <Suspense fallback={<div className="py-12 text-center text-gray-500 dark:text-gray-400">{t("Cargando más productos...")}</div>}>
          <TambienCompraron productoId={productoId} />
        </Suspense>
      </div>
    </div>
  );
}