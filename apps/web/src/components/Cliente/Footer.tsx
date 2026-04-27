"use client";

export default function Footer() {
  return (
    <footer
      className="w-full py-16 px-8"
      style={{
        background: "rgba(20, 8, 2, 0.75)",
        borderTop: "1px solid rgba(200, 169, 122, 0.2)",
      }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            Guardianas del Mezcal
          </h3>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#c8a97a", fontSize: "14px", lineHeight: "1.7" }}>
            Honrrando la tierra, el fuego y las manos que transforman el agave en espíritu puro.
            Distribuimos el mejor mezcal artesanal de México
          </p>
        </div>

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            Explorar
          </h3>
          <ul className="space-y-2">
            {["Mestras mezcaleras", "Historia", "Nuestro proceso"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  style={{ fontFamily: "Georgia, serif", color: "#c8a97a", fontSize: "14px", textDecoration: "none" }}
                  className="hover:opacity-75 transition-opacity"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            Contacto
          </h3>
          <ul className="space-y-2">
            {[
              "guardianasmezcal@gmail.com",
              "9512578906",
              "Santa Maria Zaquiltán, Oaxaca, México",
            ].map((item) => (
              <li key={item} style={{ fontFamily: "Georgia, serif", color: "#c8a97a", fontSize: "14px" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="max-w-5xl mx-auto mt-12 pt-6 text-center space-y-1"
        style={{ borderTop: "1px solid rgba(200,169,122,0.15)" }}
      >
        <p style={{ color: "#8a6a3a", fontSize: "12px", fontFamily: "Georgia, serif" }}>
          2026 Guardianas de mezcal. Todos los derechos reservados.
        </p>
        <a href="#" style={{ color: "#8a6a3a", fontSize: "12px", fontFamily: "Georgia, serif" }}>
          Términos y condiciones
        </a>
      </div>
    </footer>
  );
}