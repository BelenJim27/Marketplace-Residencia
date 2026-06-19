"use client";

import { useEffect, useState } from "react";
import ModalEditarVer from './acciones';
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { formatPrice } from "@/lib/format-number";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { SUCCESS_ALERT_CONFIG } from "@/config/success-alerts";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";

interface Producto {
    id_producto: number;
    nombre: string;
    nombre_productor: string | null;
    nombre_tienda: string | null;
    categoria: string | null;
    stock: number;
    precio: number;
    moneda: string;
    estado: string;
    imagen_url: string | null;
    categorias?: number[];
}

export default function ProductosAdmin() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);

    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const successToast = useSuccessToast("producto");
    const deleteAlert  = useDeleteAlert("producto");
    const [modoModal, setModoModal] = useState<"ver" | "editar" | null>(null);

    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchProductos = async () => {
        try {
            const token = getCookie("token") ?? "";
            const data = await api.admin.getProductos(token);
            const formatted = (Array.isArray(data) ? data : []).map((p: any) => ({
                ...p,
                stock: Number(p.stock) || 0,
                precio: Number(p.precio_base) || Number(p.precio) || 0,
                estado: p.status || p.estado || "activo",
                categoria: p.categoria || p.category || p.nombre_categoria || p.categoria_nombre || null,
                imagen_url: p.imagen_url || p.image_url || p.imagen || p.foto || null,
                categorias: (p.categorias_full || []).map((c: any) => Number(c.id_categoria)).filter(Boolean),
            }));
            setProductos(formatted);
            setLoading(false);
        } catch (err) {
            console.error("Error al cargar productos:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductos();
    }, []);

    useEffect(() => { setCurrentPage(1); }, [busqueda, filtroTipo, filtroEstado]);

    const handleVer = (p: Producto) => {
        setProductoSeleccionado(p);
        setModoModal("ver");
    };

    const handleEditar = (p: Producto) => {
        setProductoSeleccionado(p);
        setModoModal("editar");
    };

    const handleEliminarClick = (p: Producto) => {
        deleteAlert.abrir(p.nombre, async () => {
            const token = getCookie("token") ?? "";
            await api.productos.delete(token, String(p.id_producto));
            successToast.mostrar(SUCCESS_ALERT_CONFIG.producto.eliminado!);
            fetchProductos();
        });
    };

    const filtered = productos.filter((p) => {
        const query = busqueda.toLowerCase();
        const matchesSearch =
            p.nombre.toLowerCase().includes(query) ||
            (p.nombre_productor?.toLowerCase().includes(query) ?? false) ||
            (p.nombre_tienda?.toLowerCase().includes(query) ?? false);

        const matchesStatus = filtroEstado === "todos" || p.estado.toLowerCase() === filtroEstado.toLowerCase();
        const matchesTipo = filtroTipo === "todos" ||
            (p.categoria && p.categoria.toLowerCase() === filtroTipo.toLowerCase());

        return matchesSearch && matchesStatus && matchesTipo;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedProductos = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return (
        <div className="p-6 text-center text-[#3D6B3F]/70 text-sm animate-pulse">
            Cargando catálogo...
        </div>
    );

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
                        Gestión de Productos
                    </h1>
                    <p className="text-[#3D6B3F]/70 text-sm">
                        Panel de administración de inventario
                    </p>
                </div>
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Total productos" value={productos.length} color="text-[#1F3A2E]" />
                <Card title="Activos" value={productos.filter(p => p.estado?.toLowerCase() === 'activo').length} color="text-[#3D6B3F]" />
                <Card title="Inactivos" value={productos.filter(p => p.estado?.toLowerCase() === 'inactivo').length} color="text-[#C97A3E]" />
                <Card title="Stock Total" value={productos.reduce((acc, p) => acc + (p.stock || 0), 0)} color="text-[#3D6B3F]" />
            </div>

            {/* BUSCADOR Y FILTROS */}
            <div className="bg-[#F4F0E3] p-6 rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] space-y-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3D6B3F]/50" />
                    <input
                        type="text"
                        placeholder="Buscar por producto o productor..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-[#C5CFB0] rounded-xl focus:ring-2 focus:ring-[#3D6B3F] outline-none transition-all text-[#1F3A2E] placeholder:text-[#3D6B3F]/50"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-[#3D6B3F]/70 uppercase ml-1 mb-1 block">
                            Categoría
                        </label>
                        <select
                            className="w-full p-3 bg-white border border-[#C5CFB0] rounded-xl outline-none focus:ring-2 focus:ring-[#3D6B3F] cursor-pointer text-[#1F3A2E]"
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                        >
                            <option value="todos">Todas las categorías</option>
                            {Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))).map((cat) => (
                                <option key={cat} value={cat?.toLowerCase()}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-[#3D6B3F]/70 uppercase ml-1 mb-1 block">
                            Estado
                        </label>
                        <select
                            className="w-full p-3 bg-white border border-[#C5CFB0] rounded-xl outline-none focus:ring-2 focus:ring-[#3D6B3F] cursor-pointer text-[#1F3A2E]"
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="todos">Cualquier estado</option>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setBusqueda("");
                            setFiltroTipo("todos");
                            setFiltroEstado("todos");
                        }}
                        className="text-sm font-medium text-[#3D6B3F]/60 hover:text-red-500 transition-colors mt-5 px-2"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div data-tour="admin-productos-tabla" className="rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)] border border-[#C5CFB0] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#1F3A2E] text-xs font-semibold text-white uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Producto</th>
                                <th className="px-4 py-3 text-left">Tienda</th>
                                <th className="px-4 py-3 text-left">Categoría</th>
                                <th className="px-4 py-3 text-center">Stock</th>
                                <th className="px-4 py-3 text-left">Precio</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C5CFB0]/30">
                            {paginatedProductos.map((p) => (
                                <tr key={p.id_producto} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-all duration-200 group">

                                    {/* PRODUCTO CON FOTO */}
                                    <td className="px-4 py-3 text-[#1F3A2E]">
                                        <div className="flex items-center gap-3">
                                            {p.imagen_url ? (
                                                <img
                                                    src={p.imagen_url}
                                                    alt={p.nombre}
                                                    className="w-10 h-10 rounded-lg object-contain bg-[#F4F0E3] border border-[#C5CFB0] shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-[#C5CFB0]/30 flex items-center justify-center shrink-0">
                                                    <span className="text-[#3D6B3F]/50 text-xs">N/A</span>
                                                </div>
                                            )}
                                            <span className="font-semibold text-[#1F3A2E]">{p.nombre}</span>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-sm text-[#1F3A2E]">
                                        {p.nombre_tienda || "Sin tienda"}
                                    </td>

                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3D6B3F]/10 text-[#3D6B3F]">
                                            {p.categoria || "Sin categoría"}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-center font-medium text-[#1F3A2E]">
                                        <span className={p.stock <= 5 ? "text-red-600" : "text-[#1F3A2E]"}>
                                            {p.stock} unidades
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 font-bold text-[#1F3A2E]">
                                        ${formatPrice(Number(p.precio), { showCurrency: false })}
                                        <span className="text-xs text-[#3D6B3F]/60 ml-1 font-normal">{p.moneda}</span>
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        <EstadoBadge status={p.estado} />
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleVer(p)} className="p-2 text-[#3D6B3F]/50 hover:text-[#3D6B3F] hover:bg-[#A8C26B]/20 rounded-lg transition-all duration-200">
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => handleEditar(p)} className="p-2 text-[#3D6B3F]/50 hover:text-[#C97A3E] hover:bg-[#C97A3E]/10 rounded-lg transition-all duration-200">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleEliminarClick(p)} className="p-2 text-[#3D6B3F]/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* MENSAJE SI NO HAY RESULTADOS */}
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-[#3D6B3F]/60 bg-white">
                            <p className="font-semibold">No se encontraron productos</p>
                            <p className="text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
                <p className="text-sm text-[#1F3A2E]">
                  Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> de <span className="font-semibold">{filtered.length}</span> productos
                </p>
                <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
                  <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            )}

            <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />

            {/* MODAL VER / EDITAR */}
            {productoSeleccionado && modoModal && (
                <ModalEditarVer
                    producto={productoSeleccionado}
                    modo={modoModal}
                    isOpen={!!modoModal}
                    onClose={() => { setModoModal(null); setProductoSeleccionado(null); }}
                    onRefresh={fetchProductos}
                    onSuccess={successToast.mostrarActualizado}
                />
            )}

            <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />
        </div>
    );
}

function Card({ title, value, color }: { title: string; value: number; color: string }) {
    return (
        <div className="bg-[#F4F0E3] p-5 rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] flex flex-col gap-1">
            <p className="text-sm font-semibold text-[#3D6B3F]/70 uppercase tracking-wider">{title}</p>
            <h2 className={`text-2xl font-bold [font-family:'DM_Sans',sans-serif] ${color}`}>{value}</h2>
        </div>
    );
}

function EstadoBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || "";
    const isActivo = s === "activo";
    const styles = isActivo
        ? "bg-[#A8C26B]/20 text-[#3D6B3F] border-[#A8C26B]/40"
        : "bg-[#C97A3E]/15 text-[#C97A3E] border-[#C97A3E]/30";

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles}`}>
            {s.toUpperCase() || "N/A"}
        </span>
    );
}