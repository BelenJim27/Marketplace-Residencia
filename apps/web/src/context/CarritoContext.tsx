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

const STORAGE_KEY = "carrito_items";

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading cart:", e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }, [items]);

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