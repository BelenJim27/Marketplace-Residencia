"use client";

import React, { useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function ModalNuevoProducto({ isOpen, onClose, onRefresh }: ModalProps) {
    const [stockLocal, setStockLocal] = useState(0);
    const [idCategoria, setIdCategoria] = useState(1);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio_base: 0,
        id_productor: 1,
        id_tienda: 1,
        moneda: 'MXN',
        status: 'activo'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Dentro de handleSubmit en ModalNuevoProducto.tsx

            const productoParaEnviar = {
                nombre: formData.nombre,
                id_productor: Number(formData.id_productor), // Debe ser el ID (ej: 1), no el nombre
                id_tienda: 1, // Obligatorio según tu SQL
                precio_base: Number(formData.precio_base),
                moneda: formData.moneda,
                status: formData.status,
                descripcion: formData.descripcion || "Sin descripción",

                // CAMPOS EXTRA para que el backend sepa qué hacer con el inventario y categoría
                stock_inicial: Number(stockLocal),
                id_categoria: Number(idCategoria)
            };
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoParaEnviar)
            });

            if (res.ok) {
                await onRefresh();
                onClose();
                alert("¡Mezcal registrado con éxito!");
            } else {
                const error = await res.json();
                alert(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

                {/* Cabecera Fija */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Registrar Nuevo Mezcal</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Cuerpo con Scroll */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto bg-white">

                    {/* Nombre */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre del Mezcal</label>
                        <input required type="text" className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Ej. Mezcal madrecuixe"
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Productor */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Productor</label>
                            <select className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                onChange={(e) => setFormData({ ...formData, id_productor: Number(e.target.value) })}
                            >
                                <option value="1">Juan Pérez</option>
                                <option value="2">María García</option>
                            </select>
                        </div>
                        {/* Categoría */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Categoría</label>
                            <select className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                onChange={(e) => setIdCategoria(Number(e.target.value))}
                            >
                                <option value="1">Espadín</option>
                                <option value="2">Reposado</option>
                                <option value="3">Añejo</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Stock */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-green-600">Stock Inicial</label>
                            <input required type="number" className="w-full mt-1 border p-3 rounded-xl bg-green-50 border-green-100 outline-none focus:ring-2 focus:ring-green-500"
                                value={stockLocal} onChange={(e) => setStockLocal(Number(e.target.value))}
                            />
                        </div>
                        {/* Tienda ID */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tienda ID</label>
                            <input required type="number" className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                value={formData.id_tienda} onChange={(e) => setFormData({ ...formData, id_tienda: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Precio */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Precio Base</label>
                            <input required type="number" className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                placeholder="0.00" onChange={(e) => setFormData({ ...formData, precio_base: Number(e.target.value) })}
                            />
                        </div>
                        {/* Moneda */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Moneda</label>
                            <select className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                            >
                                <option value="MXN">MXN - Pesos</option>
                                <option value="USD">USD - Dólares</option>
                            </select>
                        </div>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Estado Inicial</label>
                        <select className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none"
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                        <textarea className="w-full mt-1 border p-3 rounded-xl bg-gray-50 outline-none h-24 resize-none"
                            placeholder="Notas de cata..." onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        ></textarea>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-lg transition-all">
                            Guardar Producto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
