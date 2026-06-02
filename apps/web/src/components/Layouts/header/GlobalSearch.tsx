"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/assets/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { Users, Package, ShoppingBag, Store, X } from "lucide-react";

type Result = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  Icon: typeof Users;
  group: string;
};

export function GlobalSearch({ placeholder = "Buscar..." }: { placeholder?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const { user, isAdmin, isProductor } = useAuth();
  const token = getCookie("token") ?? "";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input on open, reset state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [isOpen]);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      const lower = q.toLowerCase();
      const next: Result[] = [];

      try {
        if (isAdmin) {
          // Usuarios
          const usuarios = (await api.usuarios.getAll(token).catch(() => [])) as any[];
          (Array.isArray(usuarios) ? usuarios : [])
            .filter(
              (u: any) =>
                u.nombre?.toLowerCase().includes(lower) ||
                u.email?.toLowerCase().includes(lower) ||
                u.apellido_paterno?.toLowerCase().includes(lower),
            )
            .slice(0, 5)
            .forEach((u: any) =>
              next.push({
                id: `u-${u.id_usuario}`,
                label: `${u.nombre ?? ""} ${u.apellido_paterno ?? ""}`.trim() || u.email,
                sublabel: u.email,
                href: `/Administrador/usuarios/${u.id_usuario}`,
                Icon: Users,
                group: "Usuarios",
              }),
            );

          // Productores
          const productores = (await api.productores.getAll().catch(() => [])) as any[];
          (Array.isArray(productores) ? productores : [])
            .filter(
              (p: any) =>
                p.nombre_marca?.toLowerCase().includes(lower) ||
                p.nombre?.toLowerCase().includes(lower) ||
                p.usuario?.nombre?.toLowerCase().includes(lower),
            )
            .slice(0, 4)
            .forEach((p: any) =>
              next.push({
                id: `pr-${p.id_productor}`,
                label: p.nombre_marca || p.nombre || `Productor #${p.id_productor}`,
                sublabel: p.usuario?.email,
                href: `/Administrador/productores/${p.id_productor}`,
                Icon: Store,
                group: "Productores",
              }),
            );

          // Pedidos
          const pedidos = (await api.pedidos.getAll().catch(() => [])) as any[];
          (Array.isArray(pedidos) ? pedidos : [])
            .filter(
              (p: any) =>
                String(p.id_pedido).includes(lower) ||
                p.estado?.toLowerCase().includes(lower),
            )
            .slice(0, 4)
            .forEach((p: any) =>
              next.push({
                id: `ped-${p.id_pedido}`,
                label: `Pedido #${p.id_pedido}`,
                sublabel: p.estado ?? "",
                href: `/Administrador/pedidos`,
                Icon: ShoppingBag,
                group: "Pedidos",
              }),
            );
        } else if (isProductor && user?.id_productor) {
          // Mis productos
          const productos = (await api.productos
            .getAll({ busqueda: q })
            .catch(() => [])) as any[];
          (Array.isArray(productos) ? productos : [])
            .slice(0, 5)
            .forEach((p: any) =>
              next.push({
                id: `prod-${p.id_producto}`,
                label: p.nombre,
                sublabel: p.tipo_mezcal,
                href: `/Productor/productos/${p.id_producto}`,
                Icon: Package,
                group: "Productos",
              }),
            );

          // Mis pedidos
          const pedidos = (await api.pedidos
            .getMisPedidosByProductor(token, user.id_productor)
            .catch(() => [])) as any[];
          (Array.isArray(pedidos) ? pedidos : [])
            .filter(
              (p: any) =>
                String(p.id_pedido).includes(lower) ||
                p.estado?.toLowerCase().includes(lower),
            )
            .slice(0, 4)
            .forEach((p: any) =>
              next.push({
                id: `ped-${p.id_pedido}`,
                label: `Pedido #${p.id_pedido}`,
                sublabel: p.estado ?? "",
                href: `/Productor/pedidos`,
                Icon: ShoppingBag,
                group: "Pedidos",
              }),
            );
        }
      } catch {
        // best-effort
      }

      setResults(next);
      setSelected(0);
      setIsLoading(false);
    },
    [isAdmin, isProductor, token, user?.id_productor],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 320);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (e.key === "Enter" && results[selected]) {
      router.push(results[selected].href);
      setIsOpen(false);
    }
  };

  const navigate = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  // Group results preserving insertion order
  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      {/* Desktop trigger bar */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-2 w-56 lg:w-72 rounded-xl bg-white/10 border border-white/15 px-3 py-2 hover:bg-white/15 transition-all duration-200 text-left"
      >
        <SearchIcon className="h-4 w-4 flex-shrink-0 text-white/50" />
        <span className="text-sm text-white/55 flex-1 select-none">{placeholder}</span>
        <kbd className="hidden md:inline-flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/50 leading-none">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition-all duration-200 sm:hidden"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-xl bg-white dark:bg-[#1a2b22] rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10">

            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-white/10">
              <SearchIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 text-sm text-gray-800 dark:text-white bg-transparent outline-none placeholder-gray-400"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded border border-gray-200 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[11px] text-gray-500 dark:text-white/50 select-none"
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {isLoading ? (
                <p className="px-4 py-8 text-sm text-center text-gray-400">Buscando...</p>
              ) : results.length > 0 ? (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/40">
                      {group}
                    </p>
                    {items.map((r) => {
                      const idx = results.indexOf(r);
                      return (
                        <button
                          key={r.id}
                          onClick={() => navigate(r.href)}
                          onMouseEnter={() => setSelected(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            selected === idx
                              ? "bg-[#1F3A2E]/8 dark:bg-white/10"
                              : "hover:bg-gray-50 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1F3A2E]/10 dark:bg-white/10 text-[#1F3A2E] dark:text-white flex-shrink-0">
                            <r.Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                              {r.label}
                            </p>
                            {r.sublabel && (
                              <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : query.length >= 2 ? (
                <p className="px-4 py-8 text-sm text-center text-gray-400">
                  Sin resultados para &ldquo;{query}&rdquo;
                </p>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-400 space-y-1">
                  <p className="font-medium">Escribe para buscar</p>
                  <p className="text-xs">
                    {isAdmin
                      ? "Usuarios, productores, pedidos..."
                      : "Productos, pedidos..."}
                  </p>
                </div>
              )}
            </div>

            {/* Footer hints */}
            {results.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 dark:border-white/10 text-[11px] text-gray-400 dark:text-white/30 select-none">
                <span>
                  <kbd className="rounded border border-gray-200 dark:border-white/20 px-1.5 bg-gray-100 dark:bg-white/10">↑↓</kbd>{" "}
                  navegar
                </span>
                <span>
                  <kbd className="rounded border border-gray-200 dark:border-white/20 px-1.5 bg-gray-100 dark:bg-white/10">↵</kbd>{" "}
                  abrir
                </span>
                <span>
                  <kbd className="rounded border border-gray-200 dark:border-white/20 px-1.5 bg-gray-100 dark:bg-white/10">Esc</kbd>{" "}
                  cerrar
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
