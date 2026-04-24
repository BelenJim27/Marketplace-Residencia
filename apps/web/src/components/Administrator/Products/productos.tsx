"use client";

import { useEffect, useState } from "react";
import ModalNuevoProducto from './nuevoProducto';
import ModalEditarVer from './acciones';
import { Eye, Pencil, Trash2, Search, Plus } from "lucide-react";
import { formatPrice } from "@/lib/format-number";

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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [modoModal, setModoModal] = useState<"ver" | "editar" | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");

    const fetchProductos = async () => {
        try {
            const res = await fetch(`/productos`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            console.log("Primer producto:", data[0]);

            const formatted = data.map((p: any) => ({
                ...p,
                stock: Number(p.stock) || 0,
                precio: Number(p.precio_base) || Number(p.precio) || 0,
                estado: p.status || p.estado || "activo",
                categoria: p.categoria || p.category || p.nombre_categoria || p.categoria_nombre || null,
                imagen_url: p.imagen_url || p.image_url || p.imagen || p.foto || null,
                categorias: p.categorias || [],
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

    const handleVer = (p: Producto) => {
        setProductoSeleccionado(p);
        setModoModal("ver");
    };

    const handleEditar = (p: Producto) => {
        setProductoSeleccionado(p);
        setModoModal("editar");
    };

    const handleEliminarClick = (p: Producto) => {
        setProductoSeleccionado(p);
        setShowDeleteConfirm(true);
    };

    const confirmarEliminacion = async () => {
        if (!productoSeleccionado) return;
        try {
            const res = await fetch(`/productos/${productoSeleccionado.id_producto}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setShowDeleteConfirm(false);
                setProductoSeleccionado(null);
                fetchProductos();
            }
        } catch (error) { console.error(error); }
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

    if (loading) return (
        <div className="p-6 text-center text-green-600 font-bold animate-pulse">
            Cargando catálogo...
        </div>
    );

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Gestión de Productos
                    </h1>
                    <p className="text-gray-500 dark:text-dark-6 text-sm">
                        Panel de administración de inventario
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-lg shadow-green-100"
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Total productos" value={productos.length} color="text-gray-800 dark:text-white" />
                <Card title="Activos" value={productos.filter(p => p.estado?.toLowerCase() === 'activo').length} color="text-green-600" />
                <Card title="Inactivos" value={productos.filter(p => p.estado?.toLowerCase() === 'inactivo').length} color="text-amber-600" />
                <Card title="Stock Total" value={productos.reduce((acc, p) => acc + (p.stock || 0), 0)} color="text-blue-600" />
            </div>

            {/* BUSCADOR Y FILTROS */}
            <div className="bg-white dark:bg-dark-2 p-6 rounded-2xl border border-gray-100 dark:border-dark-3 shadow-sm space-y-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-6" />
                    <input
                        type="text"
                        placeholder="Buscar por producto o productor..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-3 border border-gray-100 dark:border-dark-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-dark-6"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-gray-400 dark:text-dark-6 uppercase ml-1 mb-1 block">
                            Categoría
                        </label>
                        <select
                            className="w-full p-3 bg-gray-50 dark:bg-dark-3 border border-gray-100 dark:border-dark-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-800 dark:text-white"
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
                        <label className="text-[10px] font-bold text-gray-400 dark:text-dark-6 uppercase ml-1 mb-1 block">
                            Estado
                        </label>
                        <select
                            className="w-full p-3 bg-gray-50 dark:bg-dark-3 border border-gray-100 dark:border-dark-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-800 dark:text-white"
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
                        className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors mt-5 px-2"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm border border-gray-100 dark:border-dark-3 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-3 text-left text-[11px] uppercase font-bold text-gray-400 dark:text-dark-6 tracking-wider">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Tienda</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4 text-center">Stock</th>
                                <th className="p-4">Precio</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
                            {filtered.map((p) => (
                                <tr key={p.id_producto} className="hover:bg-gray-50/50 dark:hover:bg-dark-3/50 transition group">

                                    {/* PRODUCTO CON FOTO */}
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {p.imagen_url ? (
                                                <img
                                                    src={p.imagen_url}
                                                    alt={p.nombre}
                                                    className="w-10 h-10 rounded-lg object-cover border border-gray-100 dark:border-dark-3 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-3 flex items-center justify-center shrink-0">
                                                    <span className="text-gray-400 dark:text-dark-6 text-xs">N/A</span>
                                                </div>
                                            )}
                                            <span className="font-semibold text-gray-800 dark:text-white">{p.nombre}</span>
                                        </div>
                                    </td>

                                    <td className="p-4 text-sm text-gray-600 dark:text-dark-6">
                                        {p.nombre_tienda || "Sin tienda"}
                                    </td>

                                    <td className="p-4">
                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg font-bold border border-blue-100 dark:border-blue-800 uppercase">
                                            {p.categoria || "Sin categoría"}
                                        </span>
                                    </td>

                                    <td className="p-4 text-center font-medium">
                                        <span className={p.stock <= 5 ? "text-red-600" : "text-gray-700 dark:text-dark-6"}>
                                            {p.stock} unidades
                                        </span>
                                    </td>

                                    <td className="p-4 font-bold text-gray-700 dark:text-white">
                                        ${formatPrice(Number(p.precio), { showCurrency: false })}
                                        <span className="text-[10px] text-gray-400 dark:text-dark-6 ml-1 font-normal">{p.moneda}</span>
                                    </td>

                                    <td className="p-4 text-center">
                                        <EstadoBadge status={p.estado} />
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleVer(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all">
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => handleEditar(p)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleEliminarClick(p)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all">
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
                        <div className="text-center py-12 text-gray-400 dark:text-dark-6">
                            <p className="font-semibold">No se encontraron productos</p>
                            <p className="text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL NUEVO */}
            <ModalNuevoProducto
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRefresh={fetchProductos}
            />

            {/* MODAL VER / EDITAR */}
            {productoSeleccionado && modoModal && (
                <ModalEditarVer
                    producto={productoSeleccionado}
                    modo={modoModal}
                    isOpen={!!modoModal}
                    onClose={() => { setModoModal(null); setProductoSeleccionado(null); }}
                    onRefresh={fetchProductos}
                />
            )}

            {/* MODAL ELIMINAR */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]">
                    <div className="bg-white dark:bg-dark-2 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-dark-3">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">¿Estás seguro?</h3>
                        <p className="text-gray-500 dark:text-dark-6 mt-2">
                            Vas a eliminar <b className="text-gray-700 dark:text-white">{productoSeleccionado?.nombre}</b>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 border border-gray-200 dark:border-dark-3 rounded-xl font-semibold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-3 transition"
                            >
                                No, cancelar
                            </button>
                            <button
                                onClick={confirmarEliminacion}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Card({ title, value, color }: { title: string; value: number; color: string }) {
    return (
        <div className="bg-white dark:bg-dark-2 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-dark-3 flex flex-col gap-1">
            <p className="text-[11px] font-bold text-gray-400 dark:text-dark-6 uppercase tracking-wider">{title}</p>
            <h2 className={`text-3xl font-black ${color}`}>{value}</h2>
        </div>
    );
}

function EstadoBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || "";
    const isActivo = s === "activo";
    const styles = isActivo
        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
        : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles}`}>
            {s.toUpperCase() || "N/A"}
        </span>
    );
}