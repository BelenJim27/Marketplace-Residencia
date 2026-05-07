"use client";

import { LegalShell, LegalSection, LegalP } from "../_components/LegalShell";

export default function TermsPage() {
  return (
    <LegalShell title="Términos y Condiciones" lastUpdated="2026-05-03">
      <LegalSection heading="Aceptación">
        <LegalP>
          Al usar este sitio aceptas estos términos. Si no estás de acuerdo, no uses el
          servicio.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Productos restringidos por edad">
        <LegalP>
          Algunos productos requieren que el comprador sea mayor de edad (21+ para bebidas
          alcohólicas en Estados Unidos, 18+ en México). Al colocar un pedido declaras
          tener la edad legal correspondiente y aceptas que se valide tu fecha de
          nacimiento. La firma de un adulto puede ser requerida en la entrega.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Compras y pagos">
        <LegalP>
          Los precios se muestran en MXN o USD según tu selección. El total final incluye
          impuestos aplicables y costo de envío. Los pagos se procesan vía Stripe.
        </LegalP>
        <LegalP>
          Nos reservamos el derecho de cancelar un pedido si detectamos fraude, error de
          precio o si la dirección de envío se encuentra en una jurisdicción donde el
          producto está restringido.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Cuentas">
        <LegalP>
          Eres responsable de mantener tu contraseña segura. Notifícanos de inmediato si
          sospechas acceso no autorizado a tu cuenta.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Limitación de responsabilidad">
        <LegalP>
          El servicio se ofrece "tal cual". No somos responsables por daños indirectos,
          consecuentes o punitivos derivados del uso del sitio.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Cambios a estos términos">
        <LegalP>
          Podemos actualizar estos términos. La versión vigente es la publicada en esta
          página, con la fecha de "Última actualización".
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
