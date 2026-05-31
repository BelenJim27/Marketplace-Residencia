"use client";

type Props = {
  onExportPdf: () => void;
  onExportCsv: () => void;
  disabled?:   boolean;
  pdfLoading?: boolean;
};

export function ExportButtons({ onExportPdf, onExportCsv, disabled, pdfLoading }: Props) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onExportPdf}
        disabled={disabled || pdfLoading}
        className="inline-flex items-center gap-2 rounded-lg border border-[#C5CFB0] bg-white px-4 py-2 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#F4F0E3] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pdfLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C5CFB0] border-t-[#3d7a4f]" />
            Generando PDF…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onExportCsv}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg bg-[#3d7a4f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exportar CSV
      </button>
    </div>
  );
}
