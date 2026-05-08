"use client";

import { AlertTriangle } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import { LegalShell, LegalSection, LegalP } from "../_components/LegalShell";

export default function AlcoholDisclaimerPage() {
  const { t } = useLocale();
  return (
    <LegalShell title="Aviso sobre Bebidas Alcohólicas" lastUpdated="2026-05-03">
      {/* Surgeon General Warning — texto legalmente requerido por la FDA (27 CFR 16.21).
          Mantener literal y prominente. */}
      <div
        role="note"
        aria-label="Government Warning"
        className="rounded-md border-2 border-amber-700 bg-amber-50 p-4 text-amber-900 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-100"
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <AlertTriangle size={16} />
          GOVERNMENT WARNING
        </div>
        <p className="text-xs leading-relaxed">
          <strong>(1)</strong> According to the Surgeon General, women should not drink
          alcoholic beverages during pregnancy because of the risk of birth defects.
          <br />
          <strong>(2)</strong> Consumption of alcoholic beverages impairs your ability to
          drive a car or operate machinery, and may cause health problems.
        </p>
      </div>

      <LegalSection heading="Edad mínima">
        <LegalP>
          Debes tener 21 años o más para comprar o recibir bebidas alcohólicas en Estados
          Unidos, y 18 años o más en México. Verificamos tu edad mediante fecha de
          nacimiento al momento del checkout. La entrega requiere firma de un adulto
          21+ con identificación oficial.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Restricciones por estado (EE.UU.)">
        <LegalP>
          La venta y envío de bebidas alcohólicas está prohibida o severamente restringida
          en algunos estados ("dry states") y condados. No enviamos bebidas alcohólicas a
          esos destinos; nuestro sistema bloqueará el pedido durante el checkout.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Importación a EE.UU.">
        <LegalP>
          Los envíos de México a Estados Unidos pueden estar sujetos a aranceles federales
          y estatales sobre el alcohol. Los costos los cobra FedEx en destino y son
          responsabilidad del comprador.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Bebe responsablemente">
        <LegalP>
          {t("El consumo excesivo de alcohol es perjudicial para la salud. No bebas y conduzcas. Si tú o alguien que conoces necesita ayuda, contacta a la SAMHSA National Helpline: 1-800-662-HELP (4357).")}
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
