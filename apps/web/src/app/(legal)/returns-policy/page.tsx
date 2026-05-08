"use client";

import { LegalShell, LegalSection, LegalP } from "../_components/LegalShell";

export default function ReturnsPolicyPage() {
  return (
    <LegalShell title="Política de Devoluciones" lastUpdated="2026-05-03">
      <LegalSection heading="Productos elegibles">
        <LegalP>
          Aceptamos devoluciones únicamente cuando el producto llegó dañado, defectuoso o
          incorrecto. Las bebidas alcohólicas no se aceptan de regreso por motivos
          regulatorios, salvo daño en tránsito documentado.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Plazo">
        <LegalP>
          Tienes 7 días naturales desde la entrega para reportar el problema escribiendo a
          guardianasmezcal@gmail.com con tu número de pedido y fotografías del daño.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Reembolsos">
        <LegalP>
          Una vez aprobada la devolución y recibido el producto en nuestro almacén, el
          reembolso se procesa al método de pago original en un plazo de 5 a 10 días
          hábiles. Stripe puede reintegrar también los impuestos cobrados.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Costos de devolución">
        <LegalP>
          Cuando el motivo es daño o error nuestro, cubrimos el costo de la devolución.
          En caso contrario, el costo de retorno corre por cuenta del comprador.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Cancelaciones">
        <LegalP>
          Puedes cancelar un pedido sin costo mientras esté en estado "pendiente" o
          "preparando". Una vez que la guía de envío fue generada, aplica nuestra política de
          devolución.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
