"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

export interface ProductoWishlist {
  id_producto: number | bigint;
  nombre: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
}

interface WishlistItem {
  id_item: number | bigint;
  id_producto: number | bigint;
  producto: {
    nombre: string;
    precio_base: string;
    imagen_principal_url?: string;
    producto_imagenes?: { url: string }[];
  };
  fecha_agregado: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  cantidadTotal: number;
  isInWishlist: (id_producto: number | bigint) => boolean;
  agregarProducto: (producto: ProductoWishlist) => Promise<void>;
  eliminarProducto: (id_producto: number | bigint) => Promise<void>;
  cargarWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = "wishlist_items";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const getUsuarioId = (): string | null => {
    try {
      const usuario = getCookie("usuario");
      if (usuario) {
        const parsed = JSON.parse(usuario);
        return parsed.id_usuario || parsed.sub || null;
      }
    } catch {}
    return null;
  };

  const cargarWishlist = useCallback(async () => {
    const usuarioId = getUsuarioId();
    
    if (usuarioId) {
      try {
        const data = await api.wishlist.getByUsuario(usuarioId);
        setItems(data as WishlistItem[]);
      } catch (e) {
        console.error("Error loading wishlist from API:", e);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
      }
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    cargarWishlist();
  }, [cargarWishlist]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Error saving wishlist:", e);
    }
  }, [items, mounted]);

  const isInWishlist = useCallback(
    (id_producto: number | bigint) => {
      return items.some((item) => item.id_producto === id_producto);
    },
    [items]
  );

  const agregarProducto = useCallback(
    async (producto: ProductoWishlist) => {
      const usuarioId = getUsuarioId();

      if (usuarioId) {
        try {
          await api.wishlist.add(getCookie("token") || "", {
            id_usuario: usuarioId,
            id_producto: producto.id_producto.toString(),
          });
          await cargarWishlist();
          return;
        } catch (e) {
          console.error("Error adding to wishlist API:", e);
        }
      }

      setItems((prev) => {
        if (prev.some((item) => item.id_producto === producto.id_producto)) {
          return prev;
        }
        return [
          ...prev,
          {
            id_item: Date.now(),
            id_producto: producto.id_producto,
            producto: {
              nombre: producto.nombre,
              precio_base: producto.precio_base,
              imagen_principal_url: producto.imagen_principal_url,
              producto_imagenes: producto.producto_imagenes,
            },
            fecha_agregado: new Date().toISOString(),
          },
        ];
      });
    },
    [cargarWishlist]
  );

  const eliminarProducto = useCallback(
    async (id_producto: number | bigint) => {
      const usuarioId = getUsuarioId();

      if (usuarioId) {
        try {
          await api.wishlist.remove(getCookie("token") || "", usuarioId, id_producto.toString());
          await cargarWishlist();
          return;
        } catch (e) {
          console.error("Error removing from wishlist API:", e);
        }
      }

      setItems((prev) => prev.filter((item) => item.id_producto !== id_producto));
    },
    [cargarWishlist]
  );

  const cantidadTotal = useMemo(() => items.length, [items]);

  const value = useMemo(
    () => ({
      items,
      cantidadTotal,
      isInWishlist,
      agregarProducto,
      eliminarProducto,
      cargarWishlist,
    }),
    [items, cantidadTotal, isInWishlist, agregarProducto, eliminarProducto, cargarWishlist]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}