"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenes?: { url: string }[];
}

export function ProductosGrid() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const data = await api.productos.getAll();
        setProductos(data as Producto[]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar productos",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-green-600">Cargando productos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-500">No hay productos disponibles</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {productos.map((producto) => (
        <div
          key={producto.id}
          className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg dark:bg-gray-dark"
        >
          <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
            {producto.imagenes && producto.imagenes[0] ? (
              <Image
                src={producto.imagenes[0].url}
                alt={producto.nombre}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
              {producto.nombre}
            </h3>
            <p className="mb-3 line-clamp-2 text-sm text-gray-500">
              {producto.descripcion}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-green-600">
                ${Number(producto.precio || 0).toFixed(2)}
              </span>
              <button className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700">
                <ShoppingCart size={18} />
                <span className="text-sm">Agregar</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
