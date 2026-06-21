"use client";

import { useRef } from "react";
import Image from "next/image";
import { AlertService } from "@/shared/alerts/alert.service";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

export type ImagenProductoState = {
  file: File | null;
  preview: string | null;
};

export const EMPTY_IMAGEN_PRODUCTO: ImagenProductoState = {
  file: null,
  preview: null,
};

export function getImagenProductoUrl(path?: string | null) {
  if (!path) return "";
  if (/^(https?:\/\/|blob:)/i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export function resetImagenProductoState(current: ImagenProductoState, preview: string | null = null): ImagenProductoState {
  if (current.preview?.startsWith("blob:")) {
    URL.revokeObjectURL(current.preview);
  }

  return {
    file: null,
    preview,
  };
}

export function updateImagenProductoState(
  current: ImagenProductoState,
  file: File | null,
  fallbackPreview: string | null = null,
): ImagenProductoState {
  if (current.preview?.startsWith("blob:")) {
    URL.revokeObjectURL(current.preview);
  }

  return {
    file,
    preview: file ? URL.createObjectURL(file) : fallbackPreview,
  };
}

export function appendImagenProducto(formData: FormData, imagen: ImagenProductoState) {
  if (imagen.file) {
    formData.append("imagen", imagen.file);
  }
}

export function ProductoThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Sin img</div>;
  }

  return <Image src={getImagenProductoUrl(src)} alt={alt} width={40} height={40} className="rounded-lg bg-gray-50 object-contain" />;
}

export function ImagenProducto({
  label,
  disabled,
  imagen,
  fallbackPreview,
  onChange,
}: {
  label: string;
  disabled?: boolean;
  imagen: ImagenProductoState;
  fallbackPreview?: string | null;
  onChange: (next: ImagenProductoState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      <div className="flex items-center gap-4">
        {imagen.preview ? (
          <Image src={getImagenProductoUrl(imagen.preview)} alt="Vista previa" width={64} height={64} className="rounded-lg bg-gray-50 object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Sin img</div>
        )}
        <div className="flex flex-col gap-1 w-full">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > 500 * 1024) {
                AlertService.showWarning("La imagen debe pesar menos de 500 KB.");
                event.target.value = "";
                return;
              }
              onChange(updateImagenProductoState(imagen, file, fallbackPreview ?? null));
            }}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm outline-none hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Seleccionar imagen
            </button>
            <span className="truncate text-sm text-gray-500 dark:text-gray-400">
              {imagen.file?.name ?? "Ningún archivo seleccionado"}
            </span>
          </div>
          <span className="text-xs text-gray-400">Máximo 500 KB</span>
        </div>
      </div>
    </div>
  );
}
