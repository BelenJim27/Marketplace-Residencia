"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, ArrowLeft, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { formatPrice } from "@/lib/format-number";

interface LoteData {
  datos_api?: Record<string, string>;
  productores?: {
    usuarios?: {
      nombre: string;
    };
    biografia?: string;
    ubicacion?: string;
  };
  codigo_lote?: string;
  sitio?: string;
  region?: string;
  grado_alcohol?: number;
  nombre_comun?: string;
  nombre_cientifico?: string;
}

interface Producto {
  id: number;
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
}

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const fetchProducto = useCallback(async () => {
    const id = params.id;
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.productos.getOne(id as string);
      console.log("Producto data:", JSON.stringify(data, null, 2));
      setProducto(data as Producto);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProducto();
  }, [fetchProducto]);

  const handleAgregar = () => {
    if (!producto) return;
    
    agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: producto.precio_base,
      imagen_principal_url: producto.imagen_principal_url,
      producto_imagenes: producto.producto_imagenes,
      cantidad: cantidad,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  const todasImagenes = [
    producto?.imagen_principal_url,
    producto?.imagen_url,
    ...(producto?.producto_imagenes?.map((img) => img.url) || []),
  ].filter(Boolean) as string[];

  const loteData = producto?.lotes;
  const productor = loteData?.productores;
  const nombreProductor = producto?.nombre_productor || loteData?.productores?.usuarios?.nombre;

  const datosApi = loteData?.datos_api || {};
  console.log("loteData:", loteData);
  console.log("datosApi:", datosApi);
  
  const region = datosApi.region || producto?.region;
  const codigoLote = datosApi.codigo_lote || (loteData as any)?.codigo_lote || producto?.codigo_lote;
  const sitio = datosApi.sitio || (loteData as any)?.sitio || producto?.sitio;
  const gradoAlcohol = datosApi.grado_alcohol ? Number(datosApi.grado_alcohol) : (loteData as any)?.grado_alcohol || producto?.grado_alcohol;
  const nombreComun = datosApi.nombre_comun || (loteData as any)?.nombre_comun || producto?.nombre_comun;
  const nombreCientifico = datosApi.nombre_cientifico || (loteData as any)?.nombre_cientifico || producto?.nombre_cientifico;

  console.log("region:", region, "codigoLote:", codigoLote, "sitio:", sitio, "gradoAlcohol:", gradoAlcohol);

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

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-green-600"
      >
        <ArrowLeft size={20} />
        Volver a productos
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
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
              <div className="flex h-full items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
          </div>
          
          {todasImagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {todasImagenes.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setImagenSeleccionada(idx)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                    idx === imagenSeleccionada
                      ? "border-green-600"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${producto.nombre} ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              {producto.nombre}
            </h1>
            <p className="text-2xl font-bold text-green-600">
              ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })}
            </p>
          </div>

          {productor && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Productor
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium">{nombreProductor}</p>
                {productor.ubicacion && (
                  <p className="flex items-center gap-1">
                    <MapPin size={14} />
                    {productor.ubicacion}
                  </p>
                )}
                {productor.biografia && (
                  <p className="text-gray-500">{productor.biografia}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Descripción
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {producto.descripcion || "Sin descripción disponible"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {producto.tipo_mezcal && (
              <div>
                <span className="text-sm text-gray-500">Tipo de Mezcal</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.tipo_mezcal}
                </p>
              </div>
            )}
            {producto.maguey && (
              <div>
                <span className="text-sm text-gray-500">Maguey</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.maguey}
                </p>
              </div>
            )}
            {producto.destilacion && (
              <div>
                <span className="text-sm text-gray-500">Destilación</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.destilacion}
                </p>
              </div>
            )}
            {producto.molienda && (
              <div>
                <span className="text-sm text-gray-500">Molienda</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.molienda}
                </p>
              </div>
            )}
            {producto.abv && (
              <div>
                <span className="text-sm text-gray-500">ABV</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.abv}%
                </p>
              </div>
            )}
            {producto.maestro_mezcalero && (
              <div>
                <span className="text-sm text-gray-500">Maestro Mezcalero</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.maestro_mezcalero}
                </p>
              </div>
            )}
            {region && (
              <div>
                <span className="text-sm text-gray-500">Región</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {region}
                </p>
              </div>
            )}
            {codigoLote && (
              <div>
                <span className="text-sm text-gray-500">Código Lote</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {codigoLote}
                </p>
              </div>
            )}
            {sitio && (
              <div>
                <span className="text-sm text-gray-500">Sitio</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {sitio}
                </p>
              </div>
            )}
            {gradoAlcohol && (
              <div>
                <span className="text-sm text-gray-500">Grados Alcohol</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {gradoAlcohol}%
                </p>
              </div>
            )}
            {producto.marca && (
              <div>
                <span className="text-sm text-gray-500">Marca</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {producto.marca}
                </p>
              </div>
            )}
            {nombreComun && (
              <div>
                <span className="text-sm text-gray-500">Nombre Común</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {nombreComun}
                </p>
              </div>
            )}
            {nombreCientifico && (
              <div className="col-span-2">
                <span className="text-sm text-gray-500">Nombre Científico</span>
                <p className="font-medium text-gray-900 dark:text-white italic">
                  {nombreCientifico}
                </p>
              </div>
            )}
          </div>

          {producto.perfil && (
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Perfil de Sabor
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{producto.perfil}</p>
            </div>
          )}

          <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  Cantidad
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">{cantidad}</span>
                  <button
                    onClick={() => setCantidad(cantidad + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAgregar}
              disabled={agregado}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors ${
                agregado
                  ? "bg-green-700 text-white"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <ShoppingCart size={20} />
              {agregado ? "Agregado al carrito" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}