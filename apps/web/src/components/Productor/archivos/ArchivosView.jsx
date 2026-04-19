"use client";

import NOM070View from "./NOM070View";

export default function ArchivosView() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Archivos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestiona tus documentos NOM-070</p>
        </div>

        <NOM070View />
      </div>
    </div>
  );
}
