"use client";

import { LegalShell, LegalSection, LegalP } from "../_components/LegalShell";

export default function ShippingPolicyPage() {
  return (
    <LegalShell title="Política de Envío" lastUpdated="2026-05-03">
      <LegalSection heading="Cobertura">
        <LegalP>
          Enviamos a México y Estados Unidos. Otros países se evalúan caso por caso. Para
          envíos internacionales utilizamos servicios de logística confiables.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Tiempos estimados">
        <LegalP>
          México nacional: 3 a 7 días hábiles. Estados Unidos: 5 a 10 días hábiles desde
          México, sujeto a aduana. Los plazos comienzan el día hábil siguiente a la
          confirmación del pago.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Costos">
        <LegalP>
          El costo se calcula al momento del checkout según peso y destino. Los aranceles
          y impuestos de importación, cuando apliquen, son responsabilidad del comprador
          y los cobra el transportista en destino.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Firma de adulto">
        <LegalP>
          Las entregas que contengan bebidas alcohólicas requieren firma de un adulto
          21+ con identificación oficial. Si nadie con la edad legal está presente, el
          transportista intentará la entrega de nuevo el siguiente día hábil.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Estados de EE.UU. con restricciones">
        <LegalP>
          No enviamos bebidas alcohólicas a estados &ldquo;dry&rdquo; o con leyes restrictivas. Si tu
          dirección se encuentra en uno de estos estados (AL, MS, UT, AR, KS, KY, OK, TN,
          entre otros), el sistema bloqueará el pedido al momento del checkout.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Seguimiento">
        <LegalP>
          Recibirás un número de guía por correo cuando el pedido salga de nuestro
          almacén. También puedes consultarlo en tu sección &ldquo;Mis Pedidos&rdquo;.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
