'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductDetailPremium } from '@/components/Products/ProductDetailPremium';
import { Skeleton } from '@/components/shadcn/skeleton';

interface Producto {
  id_producto: bigint;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  lotes?: {
    datos_api?: Record<string, any>;
    sitio?: string;
  };
  nombre_productor?: string;
  tiendas?: {
    nombre?: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const id = params.id as string;
        const data = await api.productos.getOne(id);
        setProducto(data as any);

        // Obtener stock del inventario
        try {
          const inv = await api.inventario.getByProducto(parseInt(id));
          setStock(inv?.stock ?? null);
        } catch {
          // stock no disponible, no es crítico
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el producto');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProducto();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold">Error al cargar el producto</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return <ProductDetailPremium producto={producto} stock={stock} />;
}
