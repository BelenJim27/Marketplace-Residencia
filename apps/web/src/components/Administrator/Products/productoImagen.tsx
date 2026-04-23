"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Props {
    nombre: string;
    imagenUrl: string | null;
}

function resolverUrl(imagenUrl: string | null): string | null {
    if (!imagenUrl) return null;
    if (imagenUrl.startsWith("http://") || imagenUrl.startsWith("https://")) {
        return imagenUrl;
    }
    // Ruta local tipo /uploads/productos/archivo.jpg
    return `${API_BASE}${imagenUrl}`;
}

export default function ProductoImagen({ nombre, imagenUrl }: Props) {
    const [error, setError] = useState(false);
    const src = resolverUrl(imagenUrl);

    if (!src || error) {
        return (
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
                <ImageOff size={18} className="text-gray-300" />
            </div>
        );
    }

    return (
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
            <Image
                src={src}
                alt={nombre}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={() => setError(true)}
                unoptimized
            />
        </div>
    );
}