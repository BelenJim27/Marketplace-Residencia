"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, ImagePlus } from "lucide-react";

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
    onSuccess?: () => void;
}

const noSpinClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function ModalEditarVer({ isOpen, onClose, producto, modo, onRefresh, onSuccess }: ModalProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const esEdicion = modo === 'editar';
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);
    const [imagenFile, setImagenFile] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen && esEdicion) {
            loadCategorias();
        }
        setImagenPreview(producto?.imagen_url || null);
        setImagenFile(null);
    }, [isOpen, esEdicion, producto]);

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

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            alert("La imagen debe pesar menos de 500 KB.");
            e.target.value = "";
            return;
        }
        setImagenFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!esEdicion || !formRef.current || !producto) return;

        setLoading(true);
        const formData = new FormData(formRef.current);

        if (imagenFile) {
            formData.append("imagen", imagenFile);
            formData.append("precio_base", formData.get("precio")?.toString() || "");
            formData.append("status", formData.get("estado")?.toString() || "");
            formData.append("categorias", JSON.stringify(selectedCategorias));

            try {
                const res = await fetch(`/productos/${producto.id_producto}`, {
                    method: 'PATCH',
                    body: formData,
                });
                const respuestaServidor = await res.json();
                if (res.ok) {
                    await onRefresh();
                    onClose();
                    onSuccess?.();
                } else {
                    console.error("Error al actualizar producto:", respuestaServidor.message);
                }
            } catch (error) {
                console.error("Error de conexión:", error);
            } finally {
                setLoading(false);
            }
            return;
        }

        const datosParaEnviar = {
            nombre: formData.get("nombre")?.toString(),
            precio_base: String(formData.get("precio")),
            status: formData.get("estado")?.toString(),
            categorias: selectedCategorias,
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
                onClose();
                onSuccess?.();
            } else {
                console.error("Error al actualizar producto:", respuestaServidor.message);
            }
        } catch (error) {
            console.error("Error de conexión:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !producto) return null;

    // Estilos dinámicos para encoger el diseño en modo "ver"
    const inputPadding = esEdicion ? "py-3 text-base" : "py-2 text-sm";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            {/* Cambia el ancho máximo dinámicamente: max-w-lg para editar, max-w-md para ver */}
            <div className={`bg-white rounded-2xl w-full shadow-[0_24px_48px_rgba(31,58,46,0.25)] overflow-hidden border border-[#C5CFB0] transition-all duration-300 ${esEdicion ? 'max-w-lg' : 'max-w-md'}`}>

                {/* HEADER */}
                <div className="flex items-center justify-between p-6 bg-[#1F3A2E] border-b border-[#1F3A2E]">
                    <div>
                        <h2 className="text-xl font-extrabold text-white [font-family:'Playfair_Display',serif]">
                            {esEdicion ? 'Editar Producto' : 'Detalles del Producto'}
                        </h2>
                        <p className="text-xs text-white/60">ID: #{producto.id_producto}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all duration-200">
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                <form ref={formRef} onSubmit={handleSubmit}>
                    {/* El espacio entre elementos baja de space-y-5 a space-y-3 en modo ver */}
                    <div className={`p-6 max-h-[70vh] overflow-y-auto transition-all ${esEdicion ? 'space-y-5' : 'space-y-3'}`}>

                        {/* IMAGEN */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-[#1F3A2E]">
                                {esEdicion ? "Foto del producto" : "Imagen"}
                            </label>

                            {esEdicion ? (
                                <label className="flex flex-col items-center justify-center w-full cursor-pointer group">
                                    <div className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-[#C5CFB0] hover:border-[#3D6B3F] transition-all duration-200 bg-[#F4F0E3] group-hover:bg-[#A8C26B]/10">
                                        {imagenPreview ? (
                                            <>
                                                <img
                                                    src={imagenPreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute inset-0 bg-[#1F3A2E]/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                    <div className="text-white text-center">
                                                        <ImagePlus className="w-8 h-8 mx-auto mb-1" />
                                                        <p className="text-xs font-semibold">Cambiar imagen</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-[#3D6B3F]/50 group-hover:text-[#3D6B3F] transition-all duration-200">
                                                <ImagePlus className="w-10 h-10 mb-2" />
                                                <p className="text-sm font-semibold">Subir imagen</p>
                                                <p className="text-xs mt-1">PNG, JPG, WEBP</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImagenChange}
                                    />
                                </label>
                            ) : (
                                // Altura reducida de h-40 a h-28 si solo se está visualizando
                                imagenPreview ? (
                                    <img
                                        src={imagenPreview}
                                        alt={producto.nombre}
                                        className="w-full h-28 object-contain rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] transition-all duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-28 rounded-xl bg-[#F4F0E3] flex items-center justify-center text-[#3D6B3F]/50 transition-all duration-300">
                                        <p className="text-sm">Sin imagen</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* NOMBRE */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-[#1F3A2E]">Nombre</label>
                            <input
                                name="nombre"
                                type="text"
                                defaultValue={producto.nombre}
                                disabled={!esEdicion}
                                required
                                className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent ${inputPadding}`}
                            />
                        </div>

                        {/* CATEGORÍAS */}
                        {esEdicion ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-[#1F3A2E]">Categoría</label>
                                <select
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] outline-none focus:ring-2 focus:ring-[#3D6B3F] ${inputPadding}`}
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
                                <label className="block text-sm font-medium text-[#1F3A2E]">Categoría</label>
                                <input
                                    type="text"
                                    defaultValue={producto.categoria || ''}
                                    disabled
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-60 ${inputPadding}`}
                                />
                            </div>
                        )}

                        {/* PRODUCTOR + TIENDA */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-[#1F3A2E]">Productor</label>
                                <input
                                    name="productor"
                                    type="text"
                                    defaultValue={producto.nombre_productor || ''}
                                    disabled
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-60 ${inputPadding}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-[#1F3A2E]">Tienda</label>
                                <input
                                    name="tienda"
                                    type="text"
                                    defaultValue={producto.nombre_tienda || ''}
                                    disabled
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-60 ${inputPadding}`}
                                />
                            </div>
                        </div>

                        {/* STOCK + PRECIO + ESTADO */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-[#1F3A2E]">Stock</label>
                                <input
                                    name="stock"
                                    type="number"
                                    defaultValue={producto.stock}
                                    disabled={!esEdicion}
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] disabled:opacity-60 outline-none focus:ring-2 focus:ring-[#3D6B3F] ${noSpinClass} ${inputPadding}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-[#1F3A2E]">Precio</label>
                                <input
                                    name="precio"
                                    type="number"
                                    step="0.01"
                                    defaultValue={producto.precio}
                                    disabled={!esEdicion}
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] disabled:opacity-60 outline-none focus:ring-2 focus:ring-[#3D6B3F] ${noSpinClass} ${inputPadding}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-[#1F3A2E]">Estado</label>
                                <select
                                    name="estado"
                                    defaultValue={producto.estado}
                                    disabled={!esEdicion}
                                    className={`w-full px-4 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent ${inputPadding}`}
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        {/* BOTONES (Sección de acciones) */}
                        <div className="flex gap-3 pt-4 border-t border-[#C5CFB0]">
                            <button
                                type="button"
                                onClick={onClose}
                                className={`flex-1 bg-[#F4F0E3] text-[#1F3A2E] text-sm font-medium rounded-xl border border-[#C5CFB0] hover:bg-[#C5CFB0]/30 transition-all duration-200 ${esEdicion ? 'py-3' : 'py-2'}`}
                            >
                                {esEdicion ? "Cancelar" : "Cerrar"}
                            </button>
                            {esEdicion && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-[#3D6B3F] text-white text-sm font-medium rounded-xl hover:bg-[#1F3A2E] disabled:opacity-50 transition-all duration-200"
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