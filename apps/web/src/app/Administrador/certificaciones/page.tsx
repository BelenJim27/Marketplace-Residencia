"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function Certificaciones() {
  return (
    <>
      <Breadcrumb pageName="Certificaciones" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-4">
            Certificaciones del Sistema
          </h2>
          <p className="text-body text-bodydark mb-4">
            Gestiona y visualiza todas las certificaciones del sistema
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card Example 1 */}
          <div className="border border-gray-3 rounded-lg p-5 dark:border-dark-3">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-black dark:text-white">
                CertificaciÃ³n SSL
              </h3>
              <span className="inline-flex rounded-full bg-green-1 px-3 py-1 text-sm font-medium text-green-7 dark:bg-green-9 dark:text-green-2">
                Activo
              </span>
            </div>
            <p className="text-sm text-bodydark2 mb-4">
              Certificado de seguridad SSL/TLS para HTTPS
            </p>
            <p className="text-xs text-bodydark">
              <strong>Vencimiento:</strong> 15 de diciembre 2024
            </p>
          </div>

          {/* Card Example 2 */}
          <div className="border border-gray-3 rounded-lg p-5 dark:border-dark-3">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-black dark:text-white">
                CertificaciÃ³n PCI-DSS
              </h3>
              <span className="inline-flex rounded-full bg-green-1 px-3 py-1 text-sm font-medium text-green-7 dark:bg-green-9 dark:text-green-2">
                Activo
              </span>
            </div>
            <p className="text-sm text-bodydark2 mb-4">
              Cumplimiento de estÃ¡ndares de seguridad para procesamiento de pagos
            </p>
            <p className="text-xs text-bodydark">
              <strong>Vencimiento:</strong> 22 de febrero 2025
            </p>
          </div>

          {/* Card Example 3 */}
          <div className="border border-gray-3 rounded-lg p-5 dark:border-dark-3">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-black dark:text-white">
                CertificaciÃ³n GDPR
              </h3>
              <span className="inline-flex rounded-full bg-yellow-1 px-3 py-1 text-sm font-medium text-yellow-7 dark:bg-yellow-9 dark:text-yellow-2">
                Por renovar
              </span>
            </div>
            <p className="text-sm text-bodydark2 mb-4">
              Cumplimiento de regulaciones de protecciÃ³n de datos
            </p>
            <p className="text-xs text-bodydark">
              <strong>Vencimiento:</strong> 10 de abril 2024
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 rounded-lg bg-blue-1 p-5 dark:bg-blue-9">
          <h3 className="mb-2 font-semibold text-blue-9 dark:text-blue-1">
            InformaciÃ³n
          </h3>
          <p className="text-sm text-blue-7 dark:text-blue-3">
            Las certificaciones vigentes garantizan la seguridad y cumplimiento normativo del sistema.
            Se recomienda revisar regularmente y renovar antes de su vencimiento.
          </p>
        </div>
      </div>
    </>
  );
}
