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
            // Reset form
            setFormData({ nombre: '', descripcion: '', precio_base: 0, id_tienda: 0, moneda: 'MXN', status: 'activo' });
            setSelectedCategorias([]);
            setTiendaSeleccionada(null);
        }
    }, [isOpen]);

    const loadCategorias = async () => {
        try {
            const res = await fetch(`/categorias`, { cache: "no-store" });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) setCategorias(data);
        } catch (error) {
            console.error("Error loading categorias:", error);
        }
    };

    const loadTiendas = async () => {
        try {
            const res = await fetch(`/tiendas`, { cache: "no-store" });
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

    const getNombreProductor = (tienda: Tienda | null): string => {
        if (!tienda?.productores?.usuarios) return "—";
        const u = tienda.productores.usuarios;
        return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ") || "—";
    };

    const handleCategoriaChange = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedCategorias((prev) => [...prev, id]);
        } else {
            setSelectedCategorias((prev) => prev.filter((c) => c !== id));
        }
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

            const res = await fetch(`/productos`, {
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

                {/* Cabecera */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Registrar Nuevo Producto</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto bg-white">

                    {/* Nombre */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre del Producto</label>
                        <input
                            required
                            type="text"
                            className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Ej. Mezcal madrecuixe"
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    {/* Categorías */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Categorías</label>
                        <div className="mt-2 max-h-32 overflow-y-auto border rounded-xl p-2 space-y-1">
                            {categorias.length === 0 ? (
                                <p className="text-sm text-gray-400">No hay categorías disponibles</p>
                            ) : (
                                categorias.map((cat) => (
                                    <label key={cat.id_categoria} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedCategorias.includes(cat.id_categoria)}
                                            onChange={(e) => handleCategoriaChange(cat.id_categoria, e.target.checked)}
                                            className="rounded text-green-600"
                                        />
                                        <span className="text-sm">{cat.nombre}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Tienda (selector) + Estado */}
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
                                className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    {/* Productor (read-only, se llena automáticamente al elegir tienda) */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Productor</label>
                        <input
                            type="text"
                            readOnly
                            value={getNombreProductor(tiendaSeleccionada)}
                            placeholder="Se llena al seleccionar una tienda"
                            className="w-full mt-1 border p-3 rounded-xl bg-gray-100 outline-none text-gray-600 cursor-not-allowed"
                        />
                    </div>

                    {/* Precio + Moneda */}
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
                                className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                            >
                                <option value="MXN">MXN - Pesos</option>
                                <option value="USD">USD - Dólares</option>
                            </select>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                        <textarea
                            className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none h-24 resize-none"
                            placeholder="Descripción del producto..."
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50">
                            {loading ? "Guardando..." : "Guardar Producto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}