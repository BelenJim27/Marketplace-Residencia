"use client";

import { LegalShell, LegalSection, LegalP } from "../_components/LegalShell";

export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Aviso de Privacidad" lastUpdated="2026-05-03">
      <LegalSection heading="Datos que recopilamos">
        <LegalP>
          Recopilamos la información que tú nos proporcionas al crear una cuenta, realizar
          una compra o contactarnos: nombre, correo electrónico, dirección de envío,
          teléfono y, cuando aplique, fecha de nacimiento para verificar tu edad.
        </LegalP>
        <LegalP>
          También registramos información técnica (dirección IP, dispositivo, páginas
          visitadas) para detectar fraude y mejorar la experiencia.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Cómo usamos tus datos">
        <LegalP>
          Procesamos pagos, enviamos pedidos, te enviamos confirmaciones por correo y
          respondemos a tus consultas. No vendemos tu información a terceros.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Pagos">
        <LegalP>
          Los pagos se procesan a través de Stripe. Nosotros nunca almacenamos los
          datos completos de tu tarjeta — los recibe directamente Stripe bajo PCI DSS.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Tus derechos">
        <LegalP>
          Puedes solicitar acceso, rectificación o eliminación de tus datos escribiendo a
          guardianasmezcal@gmail.com. Responderemos dentro de los 20 días hábiles
          conforme a la Ley Federal de Protección de Datos Personales en Posesión de
          Particulares (México) y, para residentes de EE.UU., conforme a CCPA cuando
          aplique.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Contacto">
        <LegalP>
          Si tienes preguntas sobre este aviso, escríbenos a guardianasmezcal@gmail.com.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
