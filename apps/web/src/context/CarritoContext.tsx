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
import { useAuth } from "@/context/AuthContext";

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
  const { isAdmin, isProductor } = useAuth();
  const isStaff = isAdmin || isProductor;

  const [items, setItems] = useState<CarritoItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  // Ref to track previous user ID synchronously (avoids React state batching race)
  const prevUserIdRef = useRef<string | null>(null);

  // Load cart on mount — skip for staff roles
  useEffect(() => {
    setMounted(true);
    if (isStaff) return;
    const usuarioId = getUserId();
    prevUserIdRef.current = usuarioId; // initialize ref before any merge effect runs
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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Clear cart as soon as we know the user is staff
  useEffect(() => {
    if (isStaff) setItems([]);
  }, [isStaff]);

  // When user actually changes (login / logout), fetch backend cart and merge
  useEffect(() => {
    if (!mounted) return;
    if (isStaff) return;
    const usuarioId = getUserId();
    // Use ref (not state) to detect a real user change — avoids false trigger on mount
    if (usuarioId === prevUserIdRef.current) return;
    prevUserIdRef.current = usuarioId;

    (async () => {
      try {
        setCurrentUserId(usuarioId);
        const storageKey = getStorageKey(usuarioId);

        if (usuarioId === "guest") {
          const stored = localStorage.getItem(storageKey);
          setItems(stored ? JSON.parse(stored) : []);
          return;
        }

        // Fetch backend cart for the newly logged-in user
        const token = getToken();
        const backendItems: CarritoItem[] = await api.carritoItems.getByUsuario(token, usuarioId);

        // Merge with any guest items the user may have added before logging in
        const guestKey = getStorageKey("guest");
        const guestStored = localStorage.getItem(guestKey);
        const guestItems: CarritoItem[] = guestStored ? JSON.parse(guestStored) : [];

        const merged = new Map<number | bigint, CarritoItem>();
        // Backend items first, then guest items on top
        [...backendItems, ...guestItems].forEach((item: CarritoItem) => {
          const key = item.id_producto;
          if (merged.has(key)) {
            const existing = merged.get(key)!;
            merged.set(key, { ...existing, cantidad: existing.cantidad + item.cantidad });
          } else {
            merged.set(key, item);
          }
        });

        const mergedItems = Array.from(merged.values());
        setItems(mergedItems);

        // Persist guest items to backend and clear guest storage
        for (const item of guestItems) {
          try {
            await api.carritoItems.create(token, {
              id_usuario: usuarioId,
              id_producto: Number(item.id_producto),
              cantidad: item.cantidad,
              precio_unitario_snapshot: String(item.precio_base),
            });
          } catch (e) {
            console.error("Error syncing guest item to backend:", e);
          }
        }
        localStorage.removeItem(guestKey);
        localStorage.setItem(storageKey, JSON.stringify(mergedItems));
      } catch (e) {
        console.error("Error syncing cart on user change:", e);
      }
    })();
  }, [mounted, currentUserId]);  // react to both mount and explicit user-id changes

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!mounted) return;
    const storageKey = getStorageKey(currentUserId || "guest");
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, mounted, currentUserId]);

  // Debounced sync to backend
  const syncToBackend = useCallback(() => {
    if (isStaff) return;
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
    if (isStaff) return { ok: false, reason: "not_allowed" as any };
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