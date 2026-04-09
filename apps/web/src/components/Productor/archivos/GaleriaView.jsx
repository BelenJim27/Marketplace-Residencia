"use client";

import { useState } from "react";

const initialImages = [
  { id: 1, name: "vista-producto-01.jpg" },
  { id: 2, name: "vista-producto-02.jpg" },
  { id: 3, name: "vista-producto-03.jpg" },
  { id: 4, name: "vista-producto-04.jpg" },
  { id: 5, name: "vista-producto-05.jpg" },
  { id: 6, name: "vista-producto-06.jpg" },
];

export default function GaleriaView() {
  const [images, setImages] = useState(initialImages);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="rounded-xl border-2 border-dashed border-green-200 dark:border-gray-600 bg-green-50/60 dark:bg-gray-800 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-4xl text-green-500 shadow-sm">
            ☁
          </div>
          <p className="mt-4 text-base font-semibold text-gray-800 dark:text-gray-100">Arrastra imágenes aquí</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">JPG, PNG o WEBP · Máximo 5MB por imagen</p>
          <button type="button" className="mt-5 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600">
            Subir imágenes
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {images.map((image) => (
          <div key={image.id} className="group rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="relative overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                aria-label={`Eliminar ${image.name}`}
              >
                ✕
              </button>

              <div className="flex aspect-square items-center justify-center bg-gray-200 dark:bg-gray-700 text-4xl text-gray-500 dark:text-gray-400 transition group-hover:bg-gray-900/70 group-hover:text-white">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-full bg-black/60 px-3 py-2 text-2xl text-white">🔍</span>
                </div>
                <span>🖼️</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">{image.name}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>6 de 20 imágenes utilizadas</span>
          <span>30%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-2 rounded-full bg-green-500" style={{ width: "30%" }} />
        </div>
      </div>
    </div>
  );
}
