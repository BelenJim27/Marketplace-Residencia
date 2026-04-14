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
import { getCookie } from "@/lib/cookies";

export interface ProductoCarrito {
  id_producto: number | bigint;
  nombre: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  cantidad: number;
}

interface CarritoItem extends ProductoCarrito {
  cantidad: number;
}

interface CarritoContextType {
  items: CarritoItem[];
  cantidadTotal: number;
  precioTotal: number;
  agregarProducto: (producto: ProductoCarrito) => void;
  eliminarProducto: (id_producto: number | bigint) => void;
  actualizarCantidad: (id_producto: number | bigint, cantidad: number) => void;
  limpiarCarrito: () => void;
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "carrito_items";

function getStorageKey(): string {
  try {
    const usuario = getCookie("usuario");
    const usuarioId = usuario ? JSON.parse(usuario).id_usuario || "guest" : "guest";
    return `${STORAGE_KEY_PREFIX}_${usuarioId}`;
  } catch {
    return `${STORAGE_KEY_PREFIX}_guest`;
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const usuario = getCookie("usuario");
      const usuarioId = usuario ? JSON.parse(usuario).id_usuario || "guest" : "guest";
      setCurrentUserId(usuarioId);
      
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error("Error loading cart:", e);
      setItems([]);
    }
  }, []);

  // Detectar cambio de usuario y recargar carrito
  useEffect(() => {
    try {
      const usuario = getCookie("usuario");
      const usuarioId = usuario ? JSON.parse(usuario).id_usuario || "guest" : "guest";
      
      if (usuarioId !== currentUserId) {
        console.log(`🔄 Carrito: cambio de usuario ${currentUserId} → ${usuarioId}`);
        setCurrentUserId(usuarioId);
        
        const storageKey = getStorageKey();
        const stored = localStorage.getItem(storageKey);
        setItems(stored ? JSON.parse(stored) : []);
      }
    } catch (e) {
      console.error("Error detecting user change:", e);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }, [items, mounted]);

  const agregarProducto = useCallback((producto: ProductoCarrito) => {
    setItems((prev) => {
      const existente = prev.find(
        (item) => item.id_producto === producto.id_producto
      );
      if (existente) {
        return prev.map((item) =>
          item.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  }, []);

  const eliminarProducto = useCallback((id_producto: number | bigint) => {
    setItems((prev) => prev.filter((item) => item.id_producto !== id_producto));
  }, []);

  const actualizarCantidad = useCallback((id_producto: number | bigint, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((item) => item.id_producto !== id_producto));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id_producto === id_producto ? { ...item, cantidad } : item
        )
      );
    }
  }, []);

  const limpiarCarrito = useCallback(() => {
    setItems([]);
  }, []);

  const cantidadTotal = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items]
  );

  const precioTotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Number(item.precio_base) * item.cantidad,
        0
      ),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      cantidadTotal,
      precioTotal,
      agregarProducto,
      eliminarProducto,
      actualizarCantidad,
      limpiarCarrito,
    }),
    [
      items,
      cantidadTotal,
      precioTotal,
      agregarProducto,
      eliminarProducto,
      actualizarCantidad,
      limpiarCarrito,
    ]
  );

  return (
    <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
  );
}

export function useCarrito() {
  const context = useContext(CarritoContext);
  if (context === undefined) {
    throw new Error("useCarrito must be used within a CarritoProvider");
  }
  return context;
}