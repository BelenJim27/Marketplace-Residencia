"use client";

import NOM070View from "./NOM070View";

export default function ArchivosView() {
  return (
    <div className="min-h-screen bg-[#F4F0E3] font-sans">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Archivos</h1>
          <p className="mt-1 text-sm text-[#3D6B3F]/70">Gestiona tus documentos NOM-070</p>
        </div>

        <NOM070View />
      </div>
    </div>
  );
}
