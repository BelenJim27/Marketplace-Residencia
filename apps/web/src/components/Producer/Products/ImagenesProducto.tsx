"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getImagenProductoUrl } from "@/components/Producer/Products/ImagenProducto";

export type ImagenExistente = {
  id_imagen: number;
  url: string;
  orden?: number;
};

type Props = {
  /** ID del producto (necesario solo para eliminar imágenes ya guardadas). */
  id_producto: number;
  /** Imágenes ya persistidas en BD. */
  imagenesExistentes: ImagenExistente[];
  token: string;
  /** Archivos nuevos seleccionados pero aún no subidos (estado controlado por el padre). */
  archivosSeleccionados: File[];
  /** Notifica al padre los archivos seleccionados para que los suba al hacer Guardar. */
  onFilesChange: (files: File[]) => void;
};

const MAX_SIZE_KB = 500;

export function ImagenesProducto({
  id_producto,
  imagenesExistentes,
  token,
  archivosSeleccionados,
  onFilesChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImagenExistente[]>(imagenesExistentes);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-sincronizar cuando cambia el producto abierto en el modal.
  useEffect(() => {
    setImages(imagenesExistentes);
    setPreviews([]);
    onFilesChange([]);
  }, [id_producto]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    const validas: File[] = [];
    const nuevasPreviews: { file: File; url: string }[] = [];

    for (const file of files) {
      if (file.size > MAX_SIZE_KB * 1024) {
        setError(`"${file.name}" supera ${MAX_SIZE_KB} KB y fue omitida.`);
        continue;
      }
      validas.push(file);
      nuevasPreviews.push({ file, url: URL.createObjectURL(file) });
    }

    const todosLosArchivos = [...archivosSeleccionados, ...validas];
    onFilesChange(todosLosArchivos);
    setPreviews((cur) => [...cur, ...nuevasPreviews]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePreview = (index: number) => {
    setPreviews((cur) => {
      URL.revokeObjectURL(cur[index].url);
      return cur.filter((_, i) => i !== index);
    });
    onFilesChange(archivosSeleccionados.filter((_, i) => i !== index));
  };

  const handleDelete = async (id_imagen: number) => {
    setDeletingId(id_imagen);
    setError(null);
    try {
      await api.productos.removeImagen(token, String(id_producto), String(id_imagen));
      setImages((cur) => cur.filter((img) => img.id_imagen !== id_imagen));
    } catch {
      setError("No se pudo eliminar la imagen.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-dark dark:text-white">
        Imágenes adicionales
        {previews.length > 0 && (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
            {previews.length} nueva{previews.length > 1 ? "s" : ""} — se subirán al Guardar
          </span>
        )}
      </span>

      {/* Imágenes persistidas en BD */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id_imagen} className="relative">
              <img
                src={getImagenProductoUrl(img.url)}
                alt="Imagen del producto"
                className="h-20 w-20 rounded-lg object-contain bg-gray-50 border border-stroke"
              />
              <button
                type="button"
                disabled={deletingId === img.id_imagen}
                onClick={() => handleDelete(img.id_imagen)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600 disabled:opacity-50"
                title="Eliminar imagen"
              >
                {deletingId === img.id_imagen ? "…" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Previews de archivos nuevos (pendientes de guardar) */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative">
              <img
                src={p.url}
                alt="Vista previa"
                className="h-20 w-20 rounded-lg object-contain bg-gray-100 border border-dashed border-primary/40"
              />
              <button
                type="button"
                onClick={() => removePreview(i)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-white text-xs hover:bg-gray-600"
                title="Quitar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selector de archivos */}
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="imagenes-adicionales-input"
        />
        <label
          htmlFor="imagenes-adicionales-input"
          className="inline-block cursor-pointer rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
        >
          + Seleccionar imágenes
        </label>
        <p className="mt-1 text-xs text-gray-400">Máx. {MAX_SIZE_KB} KB por imagen · hasta 10 por carga</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
