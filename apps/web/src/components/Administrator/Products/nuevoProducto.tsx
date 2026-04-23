"use client";

import React, { useState, useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

type Categoria = {
    id_categoria: number;
    nombre: string;
};

type Tienda = {
    id_tienda: number;
    nombre: string;
    id_productor: number;
    productores?: {
        usuarios?: {
            nombre?: string | null;
            apellido_paterno?: string | null;
            apellido_materno?: string | null;
        } | null;
    } | null;
};

export default function ModalNuevoProducto({ isOpen, onClose, onRefresh }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [tiendas, setTiendas] = useState<Tienda[]>([]);
    const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
    const [tiendaSeleccionada, setTiendaSeleccionada] = useState<Tienda | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio_base: 0,
        id_tienda: 0,
        moneda: 'MXN',
        status: 'activo',
    });

    useEffect(() => {
        if (isOpen) {
            loadCategorias();
            loadTiendas();
            setFormData({ nombre: '', descripcion: '', precio_base: 0, id_tienda: 0, moneda: 'MXN', status: 'activo' });
            setSelectedCategorias([]);
            setTiendaSeleccionada(null);
        }
    }, [isOpen]);

    const loadCategorias = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/categorias`, { cache: "no-store" });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) setCategorias(data);
        } catch (error) {
            console.error("Error loading categorias:", error);
        }
    };

    const loadTiendas = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/tiendas`, { cache: "no-store" });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) setTiendas(data);
        } catch (error) {
            console.error("Error loading tiendas:", error);
        }
    };

    const handleTiendaChange = (id: number) => {
        const tienda = tiendas.find((t) => t.id_tienda === id) ?? null;
        setTiendaSeleccionada(tienda);
        setFormData((prev) => ({ ...prev, id_tienda: id }));
    };

    const getProductorField = (field: 'nombre' | 'apellido_paterno' | 'apellido_materno'): string => {
        return tiendaSeleccionada?.productores?.usuarios?.[field] || '';
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const productoParaEnviar = {
                nombre: formData.nombre,
                id_tienda: Number(formData.id_tienda),
                precio_base: String(formData.precio_base),
                moneda_base: formData.moneda,
                status: formData.status,
                descripcion: formData.descripcion || null,
                categorias: selectedCategorias.length > 0 ? selectedCategorias : undefined,
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoParaEnviar),
            });

            if (res.ok) {
                await onRefresh();
                onClose();
                alert("¡Producto registrado con éxito!");
            } else {
                const error = await res.json();
                alert(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error al registrar el producto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

                {/* CABECERA */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Registrar Nuevo Producto</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto bg-white">

                    {/* NOMBRE */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre del Producto</label>
                        <input
                            required
                            type="text"
                            className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Ej. Mezcal madrecuixe"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    {/* CATEGORÍA */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Categoría</label>
                        <select
                            className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
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

                    {/* TIENDA + ESTADO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tienda</label>
                            <select
                                required
                                className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.id_tienda || ""}
                                onChange={(e) => handleTiendaChange(Number(e.target.value))}
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {tiendas.map((t) => (
                                    <option key={t.id_tienda} value={t.id_tienda}>
                                        {t.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Estado</label>
                            <select
                                className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    {/* PRODUCTOR — 3 campos readonly, se llenan al elegir tienda */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                            Productor{" "}
                            <span className="normal-case font-normal text-gray-300">
                                (se llena al seleccionar tienda)
                            </span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-400 mb-1 block">Nombre</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={getProductorField('nombre')}
                                    placeholder="—"
                                    className="w-full border p-3 rounded-xl bg-gray-100 outline-none text-gray-600 cursor-not-allowed text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 mb-1 block">Ap. Paterno</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={getProductorField('apellido_paterno')}
                                    placeholder="—"
                                    className="w-full border p-3 rounded-xl bg-gray-100 outline-none text-gray-600 cursor-not-allowed text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 mb-1 block">Ap. Materno</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={getProductorField('apellido_materno')}
                                    placeholder="—"
                                    className="w-full border p-3 rounded-xl bg-gray-100 outline-none text-gray-600 cursor-not-allowed text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PRECIO + MONEDA */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Precio Base</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0.00"
                                onChange={(e) => setFormData({ ...formData, precio_base: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Moneda</label>
                            <select
                                className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.moneda}
                                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                            >
                                <option value="MXN">MXN - Pesos</option>
                                <option value="USD">USD - Dólares</option>
                            </select>
                        </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                        <textarea
                            className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                            placeholder="Descripción del producto..."
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
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
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            {loading ? "Guardando..." : "Guardar Producto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}