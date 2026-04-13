"use client";

import { useEffect, useState } from "react";
import ModalNuevoProducto from './nuevoProducto';
// Importamos el componente para Ver/Editar (asegúrate de que el nombre del archivo coincida)
import ModalEditarVer from './acciones';
import { Eye, Pencil, Trash2, Search, Plus } from "lucide-react";

interface Producto {
    id_producto: number;
    nombre: string;
    productor: string;
    categoria: string | null;
    stock: number;
    precio: number;
    moneda: string;
    estado: string;
}

export default function ProductosAdmin() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DE MODALES ---
    const [isModalOpen, setIsModalOpen] = useState(false); // Nuevo
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [modoModal, setModoModal] = useState<"ver" | "editar" | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");

    const fetchProductos = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            const formatted = data.map((p: any) => ({
                ...p,
                stock: Number(p.stock) || 0,
                precio: Number(p.precio_base) || Number(p.precio) || 0,
                estado: p.status || p.estado || "activo",
                // Cubre los nombres más comunes que puede devolver tu API:
                categoria: p.categoria || p.category || p.nombre_categoria || p.categoria_nombre || null,
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

    // --- FUNCIONES DE ACCIÓN ACTUALIZADAS ---

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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos/${productoSeleccionado.id_producto}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setShowDeleteConfirm(false);
                setProductoSeleccionado(null);
                fetchProductos();
                // Opcional: podrías usar un toast aquí en vez de alert
            }
        } catch (error) { console.error(error); }
    };

    const filtered = productos.filter((p) => {
        const query = busqueda.toLowerCase();
        const matchesSearch =
            p.nombre.toLowerCase().includes(query) ||
            p.productor.toLowerCase().includes(query);

        const matchesStatus = filtroEstado === "todos" || p.estado.toLowerCase() === filtroEstado.toLowerCase();
        const matchesTipo = filtroTipo === "todos" ||
            (p.categoria && p.categoria.toLowerCase() === filtroTipo.toLowerCase());

        return matchesSearch && matchesStatus && matchesTipo;
    });

    if (loading) return <div className="p-6 text-center text-green-600 font-bold animate-pulse">Cargando catálogo...</div>;

    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Productos</h1>
                    <p className="text-gray-500 text-sm">Panel de administración de inventario</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-lg shadow-green-100"
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            {/* CARDS DINÁMICAS (Se mantienen igual) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Total productos" value={productos.length} color="text-gray-800" />
                <Card title="Activos" value={productos.filter(p => p.estado?.toLowerCase() === 'activo').length} color="text-green-600" />
                <Card title="Inactivos" value={productos.filter(p => p.estado?.toLowerCase() === 'inactivo').length} color="text-amber-600" />
                <Card title="Stock Total" value={productos.reduce((acc, p) => acc + (p.stock || 0), 0)} color="text-blue-600" />
            </div>
            {/* BUSCADOR Y FILTROS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por producto o productor..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Filtro de Categoría Dinámico */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Categoría</label>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                        >
                            <option value="todos">Todas las categorías</option>
                            {/* Obtenemos categorías únicas de los productos cargados */}
                            {Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))).map((cat) => (
                                <option key={cat} value={cat?.toLowerCase()}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro de Estado */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Estado</label>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="todos">Cualquier estado</option>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* Botón Limpiar */}
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

            {/* TABLA DE PRODUCTOS */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    {/* ... THead y TBody con tus productos mapeados ... */}
                </table>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Productor</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4 text-center">Stock</th>
                                <th className="p-4">Precio</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((p) => (
                                <tr key={p.id_producto} className="hover:bg-gray-50/50 transition group">
                                    <td className="p-4 font-semibold text-gray-800">{p.nombre}</td>
                                    <td className="p-4 text-sm text-gray-600">{p.productor}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold border border-blue-100 uppercase">
                                            {p.categoria || "Sin categoría"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-medium">
                                        <span className={p.stock <= 5 ? "text-red-600" : "text-gray-700"}>
                                            {p.stock} unidades
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-700">
                                        ${Number(p.precio).toFixed(2)}
                                        <span className="text-[10px] text-gray-400 ml-1 font-normal">{p.moneda}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <EstadoBadge status={p.estado} />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleVer(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye size={16} /></button>
                                            <button onClick={() => handleEditar(p)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><Pencil size={16} /></button>
                                            <button onClick={() => handleEliminarClick(p)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- SECCIÓN DE MODALES (Al final del return) --- */}

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
                    modo={modoModal} // Tú usas modoModal, no modo
                    isOpen={!!modoModal}
                    onClose={() => { setModoModal(null); setProductoSeleccionado(null); }}
                    onRefresh={fetchProductos} // Usaremos esta prop para guardar
                />
            )}

            {/* MODAL ELIMINAR (CONFIRMACIÓN) */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">¿Estás seguro?</h3>
                        <p className="text-gray-500 mt-2">Vas a eliminar <b>{productoSeleccionado?.nombre}</b>. Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border rounded-xl font-semibold hover:bg-gray-50 transition">No, cancelar</button>
                            <button onClick={confirmarEliminacion} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition">Sí, eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- COMPONENTES AUXILIARES ---

function Card({ title, value, color }: { title: string; value: number; color: string }) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</p>
            <h2 className={`text-3xl font-black ${color}`}>{value}</h2>
        </div>
    );
}

function EstadoBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || "";
    const isActivo = s === "activo";

    const styles = isActivo
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles}`}>
            {s.toUpperCase() || "N/A"}
        </span>
    );
}
