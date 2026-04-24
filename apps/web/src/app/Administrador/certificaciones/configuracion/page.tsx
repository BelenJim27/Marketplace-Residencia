"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function Configuracion() {
  return (
    <>
      <Breadcrumb pageName="ConfiguraciÃ³n" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-4">
            ConfiguraciÃ³n del Sistema
          </h2>
          <p className="text-body text-bodydark mb-4">
            Administra la configuraciÃ³n general de la aplicaciÃ³n
          </p>
        </div>

        {/* ConfiguraciÃ³n General */}
        <div className="mb-7.5">
          <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
            ConfiguraciÃ³n General
          </h3>
          
          <div className="space-y-5">
            {/* Nombre de la AplicaciÃ³n */}
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Nombre de la AplicaciÃ³n
              </label>
              <input
                type="text"
                placeholder="Mi AplicaciÃ³n"
                className="relative z-20 inline-flex w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
                defaultValue="Sistema de GestiÃ³n"
              />
            </div>

            {/* Email del Soporte */}
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Email de Soporte
              </label>
              <input
                type="email"
                placeholder="soporte@ejemplo.com"
                className="relative z-20 inline-flex w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
                defaultValue="soporte@miapp.com"
              />
            </div>

            {/* TelÃ©fono de Soporte */}
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                TelÃ©fono de Soporte
              </label>
              <input
                type="tel"
                placeholder="+1 234 567 890"
                className="relative z-20 inline-flex w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
                defaultValue="+1 800 123 4567"
              />
            </div>
          </div>
        </div>

        {/* ConfiguraciÃ³n de Seguridad */}
        <div className="mb-7.5">
          <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
            Seguridad
          </h3>
          
          <div className="space-y-4">
            {/* AutenticaciÃ³n de Dos Factores */}
            <div className="flex items-center justify-between rounded border border-gray-3 p-4 dark:border-dark-3">
              <div>
                <h4 className="font-medium text-black dark:text-white">
                  AutenticaciÃ³n de Dos Factores (2FA)
                </h4>
                <p className="text-sm text-bodydark">
                  Requerir cÃ³digo de verificaciÃ³n en el acceso
                </p>
              </div>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>

            {/* Notificaciones por Email */}
            <div className="flex items-center justify-between rounded border border-gray-3 p-4 dark:border-dark-3">
              <div>
                <h4 className="font-medium text-black dark:text-white">
                  Notificaciones por Email
                </h4>
                <p className="text-sm text-bodydark">
                  Enviar alertas de seguridad al correo registrado
                </p>
              </div>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>

            {/* Mantener SesiÃ³n Activa */}
            <div className="flex items-center justify-between rounded border border-gray-3 p-4 dark:border-dark-3">
              <div>
                <h4 className="font-medium text-black dark:text-white">
                  Mantener SesiÃ³n Activa
                </h4>
                <p className="text-sm text-bodydark">
                  No cerrar sesiÃ³n automÃ¡ticamente
                </p>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ConfiguraciÃ³n de Respaldo */}
        <div className="mb-7.5">
          <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
            Respaldo y Base de Datos
          </h3>
          
          <div className="space-y-4">
            <div className="rounded border border-gray-3 p-4 dark:border-dark-3">
              <p className="mb-3 text-bodydark">
                <strong>Ãšltimo respaldo:</strong> 20 de marzo de 2024 a las 14:30
              </p>
              <button className="inline-flex rounded bg-primary px-5 py-2.5 font-medium text-gray hover:bg-opacity-90">
                Hacer Respaldo Ahora
              </button>
            </div>
          </div>
        </div>

        {/* Botones de AcciÃ³n */}
        <div className="flex gap-3 pt-5">
          <button className="inline-flex rounded bg-primary px-8 py-2.5 font-medium text-gray hover:bg-opacity-90">
            Guardar Cambios
          </button>
          <button className="inline-flex rounded border border-gray-3 px-8 py-2.5 font-medium text-black hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
