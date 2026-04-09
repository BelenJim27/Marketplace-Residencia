"use client";

import { useState } from "react";
import NOM070View from "./NOM070View";
import GaleriaView from "./GaleriaView";

export default function ArchivosView({ initialTab = "nom070" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Archivos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestiona tus documentos y recursos multimedia</p>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("nom070")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "nom070"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              📄 NOM-070
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("galeria")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "galeria"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              🖼️ Galería
            </button>
          </div>
        </div>

        {activeTab === "nom070" ? <NOM070View /> : <GaleriaView />}
      </div>
    </div>
  );
}
