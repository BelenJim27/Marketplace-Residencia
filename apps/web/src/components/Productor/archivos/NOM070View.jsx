"use client";

import { useRef, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
export default function NOM070View() {
  const inputRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="rounded-xl border-2 border-dashed border-green-200 dark:border-gray-600 bg-green-50/60 dark:bg-gray-800 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-4xl text-green-500 shadow-sm">
            ☁
          </div>
          <p className="mt-4 text-base font-semibold text-gray-800 dark:text-gray-100">Arrastra tu archivo aquí o selecciona uno manualmente</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">PDF o imagen, máximo 10MB</p>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || "")}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Seleccionar archivo
          </button>

          {selectedFileName ? <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Archivo seleccionado: {selectedFileName}</p> : null}
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3">
          <div className="rounded-lg bg-red-100 px-3 py-2 text-red-600">PDF</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-800 dark:text-gray-100">Certificado_Lote_2023.pdf</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">2.4 MB · Subido hace 2 días</p>
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Eye className="text-gray-400 w-4 h-4" />
            <Pencil className="text-gray-400 w-4 h-4" />
            <Trash2 className="text-gray-400 w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="mb-3">
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">PENDIENTE DE REVISIÓN</span>
          </div>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Tu certificado ha sido enviado exitosamente. Actualmente está en proceso de validación por parte del administrador regional.
            Recibirás una notificación cuando el estado cambie.
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-green-600">INFORMACIÓN</h3>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            La NOM-070-SCFI-2016 establece las especificaciones de denominación, empaque, etiquetado, producción y comercialización del
            mezcal en México.
          </p>
          <a href="#" className="mt-4 inline-flex text-sm font-medium text-green-600 hover:text-green-700">
            Ver requisitos legales ↗
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <a href="#" className="text-sm font-medium text-red-600 hover:text-red-700">
          Eliminar certificado
        </a>
        <div className="flex gap-3">
          <button type="button" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
            Cancelar
          </button>
          <button type="button" className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
