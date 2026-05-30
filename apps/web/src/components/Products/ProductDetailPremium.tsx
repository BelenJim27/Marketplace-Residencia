'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Heart, MapPin, Droplets, Flame, Leaf } from 'lucide-react';
import { useCarrito } from '@/context/CarritoContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useRouter } from 'next/navigation';

interface ProductDetailPremiumProps {
  producto: any;
  onBack?: () => void;
}

export function ProductDetailPremium({ producto, onBack }: ProductDetailPremiumProps) {
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { convertPrice, t } = useLocale();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const imagenPrincipal = producto.producto_imagenes?.[0]?.url || producto.imagen_principal_url;
  const maguey = producto.lotes?.datos_api?.maguey || 'Espadin';
  const alcohol = producto.lotes?.datos_api?.grado_alcohol || producto.grado_alcohol || 46;
  const origen = producto.lotes?.sitio || 'Oaxaca';
  const maestro = producto.nombre_productor || producto.tiendas?.nombre || 'Productor artesanal';

  const coloresCategoria: Record<string, { bg: string; accent: string }> = {
    artesanal: { bg: '#D9CFBB', accent: '#8B7445' },
    ancestral: { bg: '#E9B5A2', accent: '#CF744F' },
    mezcal: { bg: '#F2F7F4', accent: '#53926D' },
  };

  const tema = coloresCategoria.mezcal;

  const handleAgregarCarrito = () => {
    agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: producto.precio_base,
      imagen_principal_url: imagenPrincipal,
      producto_imagenes: producto.producto_imagenes,
      cantidad,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  const toggleWishlist = () => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in?redirect=/cliente/producto");
      return;
    }
    if (isInWishlist(producto.id_producto)) {
      eliminarWishlist(producto.id_producto);
    } else {
      agregarWishlist({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio_base: producto.precio_base,
        imagen_principal_url: imagenPrincipal,
        producto_imagenes: producto.producto_imagenes,
      });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f5f2' }}>
      {/* Header con botón atrás */}
      <div className="border-b" style={{ borderColor: '#e1ebe5' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onBack || (() => router.back())}
            className="flex items-center gap-2 text-sm font-semibold transition-all hover:opacity-70"
            style={{ color: '#6f5b38' }}
          >
            <ArrowLeft size={18} />
            {t("Volver al catálogo")}
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* IMAGEN DEL PRODUCTO */}
          <div className="flex items-center justify-center">
            <div
              className="w-full aspect-square rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
              style={{ backgroundColor: tema.bg }}
            >
              {imagenPrincipal && (
                <Image
                  src={imagenPrincipal}
                  alt={producto.nombre}
                  width={400}
                  height={400}
                  className="w-auto h-auto max-h-full max-w-full object-contain"
                  priority
                />
              )}
            </div>
          </div>

          {/* INFORMACIÓN DEL PRODUCTO */}
          <div className="flex flex-col justify-start space-y-6">
            {/* Categoría */}
            <div className="inline-flex items-center gap-2 w-fit">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: tema.accent, color: 'white' }}
              >
                Mezcal Premium
              </span>
            </div>

            {/* Nombre del producto */}
            <h1
              className="text-4xl sm:text-5xl font-black leading-tight"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#352a1f',
              }}
            >
              {producto.nombre}
            </h1>

            {/* Maestro y origen */}
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#6f5b38' }}>
                {t("Elaborado por")}
              </p>
              <p className="text-lg font-semibold" style={{ color: '#352a1f' }}>
                {maestro}
              </p>
              <div className="flex items-center gap-2" style={{ color: '#8b7445' }}>
                <MapPin size={18} />
                <span className="text-sm">{origen}, Oaxaca</span>
              </div>
            </div>

            {/* Especificaciones */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f2f7f4' }}>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6f5b38' }}>
                  {t("product_card_agave")}
                </div>
                <p className="text-sm font-bold mt-1" style={{ color: '#353a1f' }}>
                  {maguey}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#faf5f3' }}>
                <div className="flex items-center gap-2">
                  <Droplets size={16} style={{ color: '#cf744f' }} />
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6f5b38' }}>
                    {t("product_card_alcohol")}
                  </div>
                </div>
                <p className="text-sm font-bold mt-1" style={{ color: '#352a1f' }}>
                  {alcohol}%
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f7f5f2' }}>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6f5b38' }}>
                  {t("Tipo")}
                </div>
                <p className="text-sm font-bold mt-1" style={{ color: '#352a1f' }}>
                  {t("Artesanal")}
                </p>
              </div>
            </div>

            {/* Descripción */}
            {producto.descripcion && (
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#6f5b38' }}>
                  {t("Sobre este mezcal")}
                </p>
                <p style={{ color: '#6f5b38' }} className="leading-relaxed">
                  {producto.descripcion}
                </p>
              </div>
            )}

            {/* Rating y precio */}
            <div className="flex items-center justify-between pt-6 border-t border-b" style={{ borderColor: '#e1ebe5' }}>
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="text-lg"
                    style={{ color: i < 4 ? '#cf744f' : '#d4c5b9' }}
                  >
                    ★
                  </span>
                ))}
                <span className="text-sm font-semibold ml-2" style={{ color: '#8b7445' }}>
                  4.8 (12 reseñas)
                </span>
              </div>
            </div>

            {/* Precio y acciones */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-sm"
                  style={{ color: '#8b7445' }}
                >
                  {t("product_card_price")}
                </span>
                <span
                  className="text-4xl font-black"
                  style={{
                    fontFamily: 'Courier New, monospace',
                    color: '#cf744f',
                  }}
                >
                  {convertPrice(Number(producto.precio_base || 0))}
                </span>
              </div>

              {/* Cantidad */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold" style={{ color: '#6f5b38' }}>
                  {t("Cantidad:")}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all"
                    style={{
                      backgroundColor: '#e1ebe5',
                      color: '#353a1f',
                    }}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold" style={{ color: '#352a1f' }}>
                    {cantidad}
                  </span>
                  <button
                    onClick={() => setCantidad(cantidad + 1)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all"
                    style={{
                      backgroundColor: '#e1ebe5',
                      color: '#353a1f',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAgregarCarrito}
                  className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, #53926d 0%, #417356 100%)`,
                    color: 'white',
                  }}
                >
                  <ShoppingCart size={18} />
                  {agregado ? t("catalog_added_success") : t("product_detail_add_to_cart")}
                </button>
                <button
                  onClick={toggleWishlist}
                  className="w-14 h-12 rounded-lg flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: isInWishlist(producto.id_producto) ? '#cf744f' : '#f2f7f4',
                  }}
                >
                  <Heart
                    size={20}
                    fill={isInWishlist(producto.id_producto) ? '#cf744f' : 'none'}
                    color={isInWishlist(producto.id_producto) ? 'white' : '#cf744f'}
                  />
                </button>
              </div>

              {/* Beneficios */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-3" style={{ color: '#6f5b38' }}>
                  <Leaf size={18} />
                  <span className="text-sm">{t("100% artesanal, sin aditivos")}</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: '#6f5b38' }}>
                  <Flame size={18} />
                  <span className="text-sm">{t("Destilado en palenque tradicional")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
