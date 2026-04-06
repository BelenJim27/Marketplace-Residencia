"use client";

import React, { useRef } from "react";
import { X, Save } from "lucide-react";

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

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    producto: Producto | null;
    modo: 'ver' | 'editar' | null;
    onRefresh: () => Promise<void>;
}

export default function ModalEditarVer({ isOpen, onClose, producto, modo, onRefresh }: ModalProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const esEdicion = modo === 'editar';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!esEdicion || !formRef.current || !producto) return;

        const formData = new FormData(formRef.current);

        const datosParaEnviar = {
            // 1. Identificador único
            id_producto: producto.id_producto,

            // 2. Datos del formulario (Lo que el usuario puede escribir)
            nombre: formData.get("nombre")?.toString(),
            precio_base: Number(formData.get("precio")), // 'precio' en vista -> 'precio_base' en tabla
            status: formData.get("estado")?.toString(),  // 'estado' en vista -> 'status' en tabla
            stock: Number(formData.get("stock")),
            categoria: formData.get("categoria")?.toString(),

            // 3. Datos que mantienes del producto original para no perderlos
            id_productor: 1, // En una app real, aquí usarías un ID, no el nombre "Juan Pérez"
            moneda: producto.moneda || 'MXN',
            descripcion: producto.nombre // O una descripción por defecto
        };

        console.log("Enviando a NestJS:", datosParaEnviar);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos/${producto.id_producto}`, {
                method: 'PATCH', // O 'PUT', revisa cuál usa tu @Patch en el controller
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar),
            });

            const respuestaServidor = await res.json();

            if (res.ok) {
                await onRefresh();
                alert("¡Éxito! Producto actualizado.");
                onClose();
            } else {
                console.log("Detalle del error del servidor:", respuestaServidor);
                // Esto te mostrará en el alert el mensaje exacto de NestJS (ej: "precio must be a number")
                alert(`Error ${res.status}: ${JSON.stringify(respuestaServidor.message)}`);
            }
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    };
    // Validación de renderizado
    if (!isOpen || !producto) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">

                {/* Cabecera */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
                            {esEdicion ? 'Editar Producto' : 'Detalles del Mezcal'}
                        </h2>
                        <p className="text-xs text-gray-400 font-medium">ID: #{producto.id_producto}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Formulario / Cuerpo */}
                <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                        {/* Campo: Nombre */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">Nombre del Mezcal</label>
                            <input
                                name="nombre"
                                type="text"
                                defaultValue={producto.nombre}
                                disabled={!esEdicion}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Fila: Productor y Categoría */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">Productor</label>
                                <input
                                    name="productor"
                                    type="text"
                                    defaultValue={producto.productor}
                                    disabled={!esEdicion}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">Categoría</label>
                                <input
                                    name="categoria"
                                    type="text"
                                    defaultValue={producto.categoria || ''}
                                    placeholder="Ej. Espadín"
                                    disabled={!esEdicion}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Fila: Stock y Precio */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">Stock</label>
                                <input
                                    name="stock"
                                    type="number"
                                    defaultValue={producto.stock}
                                    disabled={!esEdicion}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">Precio Unitario</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-4 text-gray-400 font-bold">$</span>
                                    <input
                                        name="precio"
                                        type="number"
                                        step="0.01"
                                        defaultValue={producto.precio}
                                        disabled={!esEdicion}
                                        className="w-full pl-8 pr-20 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="absolute right-4 text-[10px] font-black text-gray-300 uppercase">{producto.moneda}</span>
                                </div>
                            </div>
                        </div>

                        {/* Campo: Estado */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">Estado de Disponibilidad</label>
                            <div className="relative">
                                <select
                                    name="estado"
                                    defaultValue={producto.estado.toLowerCase()}
                                    disabled={!esEdicion}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-default"
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Pie de página (Acciones) */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            {esEdicion ? 'Descartar' : 'Cerrar ventana'}
                        </button>

                        {esEdicion && (
                            <button
                                type="submit"
                                className="flex-[1.5] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Save className="w-4 h-4" />
                                Guardar cambios
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
