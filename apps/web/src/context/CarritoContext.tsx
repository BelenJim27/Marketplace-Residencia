"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import type { AgregarProductoResult, CarritoItem, CarritoContextType } from "@/types/carrito";
import { getEdadMinima, isAgeVerified } from "@/lib/edad";

function getToken(): string {
  return getCookie("token") || "";
}

export type { ProductoCarrito } from "@/types/carrito";

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "carrito_items";

function getStorageKey(usuarioId: string): string {
  return `${STORAGE_KEY_PREFIX}_${usuarioId}`;
}

function getUserId(): string {
  try {
    const usuario = getCookie("usuario");
    return usuario ? JSON.parse(usuario).id_usuario || "guest" : "guest";
  } catch {
    return "guest";
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Load cart on mount
  useEffect(() => {
    setMounted(true);
    const usuarioId = getUserId();
    setCurrentUserId(usuarioId);
    const storageKey = getStorageKey(usuarioId);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing stored cart:", e);
      }
    }
  }, []);

  // When user changes, fetch backend cart and merge
  useEffect(() => {
    if (!mounted) return;
    const usuarioId = getUserId();
    if (usuarioId === currentUserId) return;

    (async () => {
      try {
        setCurrentUserId(usuarioId);
        const storageKey = getStorageKey(usuarioId);
        const stored = localStorage.getItem(storageKey);
        const localItems = stored ? JSON.parse(stored) : [];

        if (usuarioId === "guest") {
          setItems(localItems);
          return;
        }

        // Fetch backend cart
        const token = getToken();
        const backendItems = await api.carritoItems.getByUsuario(token, usuarioId);

        // Merge: sum quantities for same product
        const merged = new Map<number | bigint, CarritoItem>();
        [...localItems, ...backendItems].forEach((item: CarritoItem) => {
          const key = item.id_producto;
          if (merged.has(key)) {
            const existing = merged.get(key)!;
            merged.set(key, {
              ...existing,
              cantidad: existing.cantidad + item.cantidad,
            });
          } else {
            merged.set(key, item);
          }
        });

        const mergedItems = Array.from(merged.values());
        setItems(mergedItems);

        // Sync merged to backend and localStorage
        for (const item of mergedItems) {
          try {
            await api.carritoItems.create(token, {
              id_usuario: usuarioId,
              id_producto: Number(item.id_producto),
              cantidad: item.cantidad,
              precio_unitario_snapshot: String(item.precio_base),
            });
          } catch (e) {
            console.error("Error syncing item to backend:", e);
          }
        }

        localStorage.setItem(storageKey, JSON.stringify(mergedItems));
      } catch (e) {
        console.error("Error syncing cart on user change:", e);
      }
    })();
  }, [mounted]);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!mounted) return;
    const storageKey = getStorageKey(currentUserId || "guest");
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, mounted, currentUserId]);

  // Debounced sync to backend
  const syncToBackend = useCallback(() => {
    if (currentUserId === "guest" || currentUserId === null) return;
    if (syncing) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      setSyncing(true);
      try {
        const token = getToken();
        for (const item of items) {
          await api.carritoItems.create(token, {
            id_usuario: currentUserId,
            id_producto: Number(item.id_producto),
            cantidad: item.cantidad,
            precio_unitario_snapshot: String(item.precio_base),
          });
        }
      } catch (e) {
        console.error("Error syncing cart to backend:", e);
      } finally {
        setSyncing(false);
      }
    }, 1000);
  }, [currentUserId, items, syncing]);

  const agregarProducto = useCallback((producto: { [key: string]: any }): AgregarProductoResult => {
    // Trigger 2 — block age-restricted products unless cookie is set.
    // Trigger 3 (server) is the authoritative check, but blocking here avoids polluting
    // the carrito with items the buyer cannot legally check out with.
    const edadRequerida = getEdadMinima(producto as any);
    if (edadRequerida && !isAgeVerified(edadRequerida)) {
      return { ok: false, reason: "age_required", edadRequerida };
    }

    setItems((prev) => {
      const existente = prev.find((item) => item.id_producto === producto.id_producto);
      if (existente) {
        return prev.map((item) =>
          item.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    syncToBackend();
    return { ok: true };
  }, [syncToBackend]);

  const eliminarProducto = useCallback((id_producto: number | bigint) => {
    setItems((prev) => prev.filter((item) => item.id_producto !== id_producto));
    syncToBackend();
  }, [syncToBackend]);

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
    syncToBackend();
  }, [syncToBackend]);

  const limpiarCarrito = useCallback(async () => {
    if (currentUserId && currentUserId !== "guest") {
      try {
        const token = getToken();
        await api.carritoItems.deleteByUsuario(token, currentUserId);
      } catch (e) {
        console.error("Error clearing backend cart:", e);
      }
    }
    setItems([]);
  }, [currentUserId]);

  const cantidadTotal = useMemo(() => items.reduce((acc, item) => acc + item.cantidad, 0), [items]);

  const precioTotal = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.precio_base) * item.cantidad, 0),
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
    [items, cantidadTotal, precioTotal, agregarProducto, eliminarProducto, actualizarCantidad, limpiarCarrito]
  );

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const context = useContext(CarritoContext);
  if (context === undefined) {
    throw new Error("useCarrito must be used within a CarritoProvider");
  }
  return context;
}