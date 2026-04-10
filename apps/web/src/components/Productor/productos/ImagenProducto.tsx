"use client";

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

  return <img src={getImagenProductoUrl(src)} alt={alt} className="h-10 w-10 rounded-lg object-cover" />;
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
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      <div className="flex items-center gap-4">
        {imagen.preview ? (
          <img src={getImagenProductoUrl(imagen.preview)} alt="Vista previa" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Sin img</div>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(event) => onChange(updateImagenProductoState(imagen, event.target.files?.[0] ?? null, fallbackPreview ?? null))}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 disabled:opacity-60"
        />
      </div>
    </label>
  );
}
