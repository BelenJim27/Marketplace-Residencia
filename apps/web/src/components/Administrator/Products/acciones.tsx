"use client";

import React, { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";

interface Categoria {
    id_categoria: number;
    nombre: string;
}

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

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    producto: Producto | null;
    modo: 'ver' | 'editar' | null;
    onRefresh: () => Promise<void>;
}

const noSpinClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function ModalEditarVer({ isOpen, onClose, producto, modo, onRefresh }: ModalProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const esEdicion = modo === 'editar';
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && esEdicion) {
            loadCategorias();
        }
    }, [isOpen, esEdicion]);

    useEffect(() => {
        if (producto && esEdicion) {
            setSelectedCategorias(producto.categorias || []);
        }
    }, [producto, esEdicion]);

    const loadCategorias = async () => {
        try {
            const res = await fetch(`/categorias`, { cache: "no-store" });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setCategorias(data);
            }
        } catch (error) {
            console.error("Error loading categorias:", error);
        }
    };

    const handleCategoriaChange = (id: number, seleccionada: boolean) => {
        if (seleccionada) {
            setSelectedCategorias([...selectedCategorias, id]);
        } else {
            setSelectedCategorias(selectedCategorias.filter(c => c !== id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!esEdicion || !formRef.current || !producto) return;

        setLoading(true);
        const formData = new FormData(formRef.current);

        const datosParaEnviar = {
            nombre: formData.get("nombre")?.toString(),
            precio_base: String(formData.get("precio")),
            status: formData.get("estado")?.toString(),
            categorias: selectedCategorias.length > 0 ? selectedCategorias : undefined,
        };

        try {
            const res = await fetch(`/productos/${producto.id_producto}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar),
            });

            const respuestaServidor = await res.json();

            if (res.ok) {
                await onRefresh();
                alert("¡Producto actualizado!");
                onClose();
            } else {
                alert(`Error: ${respuestaServidor.message || JSON.stringify(respuestaServidor)}`);
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            alert("Error al actualizar el producto");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !producto) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">

                {/* HEADER */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-800">
                            {esEdicion ? 'Editar Producto' : 'Detalles del Producto'}
                        </h2>
                        <p className="text-xs text-gray-400">ID: #{producto.id_producto}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                        {/* NOMBRE */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre</label>
                            <input
                                name="nombre"
                                type="text"
                                defaultValue={producto.nombre}
                                disabled={!esEdicion}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border rounded-xl disabled:opacity-60 outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* CATEGORÍAS */}
                        {esEdicion ? (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Categoría</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                                    value={selectedCategorias[0] ?? ""}
                                    onChange={(e) => setSelectedCategorias(e.target.value ? [Number(e.target.value)] : [])}
                                >
                                    <option value="">Sin categoría</option>
                                    {categorias.map((cat) => (
                                        <option key={cat.id_categoria} value={cat.id_categoria}>
                                            {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Categoría</label>
                                <input
                                    type="text"
                                    defaultValue={producto.categoria || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl opacity-60"
                                />
                            </div>
                        )}

                        {/* PRODUCTOR + TIENDA */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Productor</label>
                                <input
                                    name="productor"
                                    type="text"
                                    defaultValue={producto.nombre_productor || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl opacity-60"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Tienda</label>
                                <input
                                    name="tienda"
                                    type="text"
                                    defaultValue={producto.nombre_tienda || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl opacity-60"
                                />
                            </div>
                        </div>

                        {/* STOCK + PRECIO + ESTADO */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Stock</label>
                                <input
                                    name="stock"
                                    type="number"
                                    defaultValue={producto.stock}
                                    disabled={!esEdicion}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl disabled:opacity-60 outline-none focus:ring-2 focus:ring-green-500 ${noSpinClass}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Precio</label>
                                <input
                                    name="precio"
                                    type="number"
                                    step="0.01"
                                    defaultValue={producto.precio}
                                    disabled={!esEdicion}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl disabled:opacity-60 outline-none focus:ring-2 focus:ring-green-500 ${noSpinClass}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
                                <select
                                    name="estado"
                                    defaultValue={producto.estado}
                                    disabled={!esEdicion}
                                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl disabled:opacity-60 outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        {/* BOTONES */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            {esEdicion && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                    {loading ? "Guardando..." : "Guardar"}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}