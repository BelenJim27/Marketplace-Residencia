"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, ArrowLeft, Star, MapPin, Heart, Truck, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";
import { useShipping } from "@/hooks/useShipping";
import RatingAgregado from "@/components/Cliente/RatingAgregado";
import ResenasSeccion from "@/components/Cliente/ResenasSeccion";
import { ProductosSimilares, TambienCompraron } from "@/components/Cliente/ProductosRelacionados";
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

interface Producto {
  id: number;
  id_tienda?: number;
  id_producto: bigint;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  imagen_url?: string;
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
    const res = agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: producto.precio_base,
      imagen_principal_url: producto.imagen_principal_url,
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
    const res = agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: producto.precio_base,
      imagen_principal_url: producto.imagen_principal_url,
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
  const codigoLote = strFromApi(datosApi.codigo_lote) || loteData?.codigo_lote;
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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-green-600">Cargando producto...</div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-red-500">Error: {error || "Producto no encontrado"}</div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          <ArrowLeft size={18} />
          Volver
        </button>
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
        className="mb-6 flex items-center gap-2 hover:opacity-80 transition-opacity"
        style={{ color: "var(--bio-color-precio, #8b6914)" }}
      >
        <ArrowLeft size={20} />
        Volver a productos
      </button>

      {/* Breadcrumb de categorías */}
      {producto.categorias && producto.categorias.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {producto.categorias.map((cat) => (
            <Link
              key={cat}
              href={`/categoria/${encodeURIComponent(cat)}`}
              className="text-xs font-medium rounded-full px-3 py-1 hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "#f0ebe0", color: "var(--bio-color-precio, #8b6914)", border: "1px solid #e8dcc8" }}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {/* ── Grid principal ─────────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-2">

        {/* Columna izquierda — Imágenes */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
            {todasImagenes[imagenSeleccionada] ? (
              <Image
                src={todasImagenes[imagenSeleccionada]}
                alt={producto.nombre}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">Sin imagen</div>
            )}
          </div>

          {todasImagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {todasImagenes.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setImagenSeleccionada(idx)}
                  className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2"
                  style={{ borderColor: idx === imagenSeleccionada ? "var(--bio-color-precio, #8b6914)" : "transparent" }}
                >
                  <Image src={img} alt={`${producto.nombre} ${idx + 1}`} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha — Info */}
        <div className="space-y-6">

          {/* Nombre y precio */}
          <div>
            <h1
              className="mb-2 text-3xl font-bold"
              style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
            >
              {producto.nombre}
            </h1>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-precio, #8b6914)" }}
            >
              ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })}
            </p>
          </div>

          {/* ★ Rating agregado — justo debajo del precio */}
          <RatingAgregado productoId={productoId} />

          {/* Disclaimer regulatorio (alcohol/tabaco/etc.) — solo si la categoría lo requiere. */}
          <CategoryDisclaimer
            categorias={producto.categorias_full ?? []}
            gradoAlcohol={producto.grado_alcohol ?? producto.lotes?.grado_alcohol ?? null}
          />

          {/* Maestro Productor */}
          {productor && (
            <div className="rounded-lg p-4" style={{ backgroundColor: "#f0ebe0", border: "1px solid #e8dcc8" }}>
              <h3
                className="mb-2 font-semibold"
                style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
              >
                Maestro Productor
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {loteData?.id_productor ? (
                  <Link
                    href={`/cliente/productor/${loteData.id_productor}`}
                    className="font-medium hover:opacity-70 transition-opacity block"
                    style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}
                  >
                    {nombreProductor}
                  </Link>
                ) : (
                  <p className="font-medium">{nombreProductor}</p>
                )}
                {productor.biografia && <p className="text-gray-500">{productor.biografia}</p>}
                {productor.otras_caracteristicas && <p className="text-gray-500">{productor.otras_caracteristicas}</p>}
              </div>
            </div>
          )}

          {/* Tienda */}
          {tiendaData && (
            <div className="rounded-lg p-4" style={{ backgroundColor: "#f0ebe0", border: "1px solid #e8dcc8" }}>
              <h3
                className="mb-2 font-semibold"
                style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
              >
                Tienda
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {producto.id_tienda ? (
                  <Link
                    href={`/cliente/tienda/${producto.id_tienda}`}
                    className="font-medium hover:opacity-70 transition-opacity block"
                    style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}
                  >
                    {tiendaData.nombre}
                  </Link>
                ) : (
                  <p className="font-medium">{tiendaData.nombre}</p>
                )}
                {tiendaData.descripcion && <p className="text-gray-500">{tiendaData.descripcion}</p>}
                {(tiendaData.ciudad_origen || tiendaData.estado_origen) && (
                  <p className="flex items-center gap-1">
                    <MapPin size={14} />
                    {[tiendaData.ciudad_origen, tiendaData.estado_origen].filter(Boolean).join(", ")}
                  </p>
                )}
                {tiendaData.nombre_contacto && <p className="text-gray-500">Contacto: {tiendaData.nombre_contacto}</p>}
                {tiendaData.telefono_contacto && <p className="text-gray-500">Teléfono: {tiendaData.telefono_contacto}</p>}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Descripción</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {producto.descripcion || "Sin descripción disponible"}
            </p>
          </div>

          {/* Atributos del lote */}
          <div className="grid grid-cols-2 gap-4">
            {producto.tipo_mezcal && (
              <div style={{ borderBottom: "1px solid #e8dcc8", paddingBottom: "1rem" }}>
                <span className="text-sm" style={{ color: "var(--bio-color-precio, #8b6914)", textTransform: "uppercase", letterSpacing: "2px", fontSize: "10px", fontWeight: "600" }}>Tipo de Mezcal</span>
                <p className="font-medium mt-1" style={{ color: "var(--bio-color-titulo, #5c3d1e)", fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}>{producto.tipo_mezcal}</p>
              </div>
            )}
            {producto.maguey && (
              <div>
                <span className="text-sm text-gray-500">Maguey</span>
                <p className="font-medium text-gray-900 dark:text-white">{producto.maguey}</p>
              </div>
            )}
            {producto.destilacion && (
              <div>
                <span className="text-sm text-gray-500">Destilación</span>
                <p className="font-medium text-gray-900 dark:text-white">{producto.destilacion}</p>
              </div>
            )}
            {producto.molienda && (
              <div>
                <span className="text-sm text-gray-500">Molienda</span>
                <p className="font-medium text-gray-900 dark:text-white">{producto.molienda}</p>
              </div>
            )}
            {producto.abv && (
              <div>
                <span className="text-sm text-gray-500">ABV</span>
                <p className="font-medium text-gray-900 dark:text-white">{producto.abv}%</p>
              </div>
            )}
            {producto.maestro_mezcalero && (
              <div>
                <span className="text-sm text-gray-500">Maestro Mezcalero</span>
                <p className="font-medium text-gray-900 dark:text-white">{producto.maestro_mezcalero}</p>
              </div>
            )}
            {region && (
              <div>
                <span className="text-sm text-gray-500">Región</span>
                <p className="font-medium text-gray-900 dark:text-white">{region}</p>
              </div>
            )}
            {codigoLote && (
              <div>
                <span className="text-sm text-gray-500">Código Lote</span>
                <p className="font-medium text-gray-900 dark:text-white">{codigoLote}</p>
              </div>
            )}
            {sitio && (
              <div>
                <span className="text-sm text-gray-500">Sitio</span>
                <p className="font-medium text-gray-900 dark:text-white">{sitio}</p>
              </div>
            )}
            {gradoAlcohol && (
              <div>
                <span className="text-sm text-gray-500">Grados Alcohol</span>
                <p className="font-medium text-gray-900 dark:text-white">{gradoAlcohol}%</p>
              </div>
            )}
            {producto.marca && (
              <div>
                <span className="text-sm text-gray-500">Marca</span>
                <p className="font-medium text-gray-900 dark:text-white">{producto.marca}</p>
              </div>
            )}
            {nombreComun && (
              <div>
                <span className="text-sm text-gray-500">Nombre Común</span>
                <p className="font-medium text-gray-900 dark:text-white">{nombreComun}</p>
              </div>
            )}
            {nombreCientifico && (
              <div className="col-span-2">
                <span className="text-sm text-gray-500">Nombre Científico</span>
                <p className="font-medium text-gray-900 dark:text-white italic">{nombreCientifico}</p>
              </div>
            )}
            {unidades && (
              <div>
                <span className="text-sm text-gray-500">Unidades</span>
                <p className="font-medium text-gray-900 dark:text-white">{unidades}</p>
              </div>
            )}
            {fechaElaboracion && (
              <div>
                <span className="text-sm text-gray-500">Fecha Elaboración</span>
                <p className="font-medium text-gray-900 dark:text-white">{fechaElaboracion}</p>
              </div>
            )}
            {estadoLote && (
              <div>
                <span className="text-sm text-gray-500">Estado</span>
                <p className="font-medium text-gray-900 dark:text-white">{estadoLote}</p>
              </div>
            )}
            {marcaLote && (
              <div>
                <span className="text-sm text-gray-500">Marca</span>
                <p className="font-medium text-gray-900 dark:text-white">{marcaLote}</p>
              </div>
            )}
          </div>

          {/* Perfil de sabor */}
          {producto.perfil && (
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Perfil de Sabor</h3>
              <p className="text-gray-600 dark:text-gray-300">{producto.perfil}</p>
            </div>
          )}

          {/* Cantidad + acciones */}
          <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Cantidad</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
                    style={{ border: "1px solid #e8dcc8", backgroundColor: "#f0ebe0", color: "var(--bio-color-titulo, #5c3d1e)" }}
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>{cantidad}</span>
                  <button
                    onClick={() => setCantidad(cantidad + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
                    style={{ border: "1px solid #e8dcc8", backgroundColor: "#f0ebe0", color: "var(--bio-color-titulo, #5c3d1e)" }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Envío */}
            <div className="rounded-lg p-4" style={{ border: "1px solid #e8dcc8", backgroundColor: "#fdf7ee" }}>
              <div className="flex items-center gap-2 mb-2">
                <Truck size={16} style={{ color: "var(--bio-color-precio, #8b6914)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>Costo de envío</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                El costo de envío se calculará automáticamente al momento del checkout, según tu dirección de entrega.
              </p>
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
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
                        precio_base: producto.precio_base,
                        imagen_principal_url: producto.imagen_principal_url,
                        producto_imagenes: producto.producto_imagenes,
                      });
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors"
                  style={{
                    backgroundColor: isInWishlist(producto.id_producto) ? "#fdf7ee" : "transparent",
                    color: isInWishlist(producto.id_producto) ? "var(--bio-color-precio, #8b6914)" : "var(--bio-color-titulo, #5c3d1e)",
                    border: "1px solid #e8dcc8",
                  }}
                >
                  <Heart size={20} fill={isInWishlist(producto.id_producto) ? "currentColor" : "none"} />
                  {isInWishlist(producto.id_producto) ? "En favoritos" : "Favoritos"}
                </button>
                <button
                  onClick={handleAgregar}
                  disabled={agregado}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors text-white hover:opacity-90"
                  style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
                >
                  <ShoppingCart size={20} />
                  {agregado ? "Agregado" : "Agregar al carrito"}
                </button>
              </div>
              <button
                onClick={handleComprarAhora}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "var(--bio-color-boton2, #8b6914)" }}
              >
                <Zap size={20} />
                Comprar ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trazabilidad QR ──────────────────────────────────────────────────── */}
      {loteData && (
        <div className="mt-10 rounded-lg p-6" style={{ border: "1px solid #e8dcc8", backgroundColor: "#fdf7ee" }}>
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
          >
            Trazabilidad del lote
          </h2>
          {urlTrazabilidad ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="rounded bg-white p-3 shadow-sm">
                <QRCode value={urlTrazabilidad} size={160} />
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Escanea el código QR para consultar la información oficial de trazabilidad de este lote.</p>
                {codigoLote && <p className="text-xs text-gray-400">Lote: {codigoLote}</p>}
                <a
                  href={urlTrazabilidad}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs underline hover:opacity-70"
                  style={{ color: "var(--bio-color-precio, #8b6914)" }}
                >
                  Ver en portal de trazabilidad
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Trazabilidad no disponible para este producto.</p>
          )}
        </div>
      )}

      {/* ── Reseñas ────────────────────────────────────────────────────────── */}
      <div className="mt-16">
        <ResenasSeccion productoId={productoId} />
      </div>

      {/* ── Productos relacionados ─────────────────────────────────────────── */}
      <div className="mt-16 space-y-12">
        <ProductosSimilares productoId={productoId} />
        <TambienCompraron productoId={productoId} />
      </div>
    </div>
  );
}