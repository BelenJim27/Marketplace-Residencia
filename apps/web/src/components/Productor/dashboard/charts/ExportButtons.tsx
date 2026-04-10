"use client";

type Props = {
  onExportPdf: () => void;
  onExportCsv: () => void;
  disabled?: boolean;
};

export function ExportButtons({ onExportPdf, onExportCsv, disabled }: Props) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onExportPdf}
        disabled={disabled}
        className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-form-strokedark dark:text-white dark:hover:bg-white/5"
      >
        Exportar PDF
      </button>
      <button
        type="button"
        onClick={onExportCsv}
        disabled={disabled}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Exportar CSV
      </button>
    </div>
  );
}
