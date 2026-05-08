"use client";

import { useEffect, useState, useCallback } from "react";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Resena {
  id_resena: number;
  calificacion: number;
  comentario?: string;
  fecha: string;
  compra_verificada: boolean;
  respuesta_vendedor?: string;
  fecha_respuesta?: string;
  usuarios: {
    nombre: string;
    apellido_paterno?: string;
    foto_url?: string;
  };
}

interface ResenasPaginadas {
  data: Resena[];
  meta: { total: number; pagina: number; limite: number; totalPaginas: number };
}

interface Props {
  productoId: string;
}

// ─── Estrellitas interactivas ─────────────────────────────────────────────────

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 p-1"
        >
          <Star
            size={28}
            className={
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

// ─── Formulario de nueva reseña ───────────────────────────────────────────────

function ResenaForm({
  productoId,
  onCreada,
}: {
  productoId: string;
  onCreada: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-lg p-4 text-center text-sm text-gray-500"
        style={{ backgroundColor: "#f0ebe0", border: "1px solid #e8dcc8" }}
      >
        <a href="/auth/sign-in" style={{ color: "var(--bio-color-precio, #8b6914)" }} className="underline">
          Inicia sesión
        </a>{" "}
        para dejar una reseña.
      </div>
    );
  }

  const handleSubmit = async () => {
    if (calificacion === 0) { setError("Selecciona una calificación."); return; }
    setEnviando(true);
    setError(null);
    try {
      const token = getCookie("token") ?? "";
      await api.resenas.create(token, {
        id_usuario: user!.id_usuario ?? user!.sub,
        id_producto: Number(productoId),
        calificacion,
        comentario: comentario.trim() || undefined,
      });
      setExito(true);
      setCalificacion(0);
      setComentario("");
      onCreada();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar reseña.");
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="rounded-lg p-4 text-center text-sm" style={{ backgroundColor: "#f0ebe0", border: "1px solid #e8dcc8", color: "var(--bio-color-titulo, #5c3d1e)" }}>
        ¡Gracias por tu reseña! 🎉
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: "#f0ebe0", border: "1px solid #e8dcc8" }}>
      <h4 className="font-semibold text-base" style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}>
        Escribe tu reseña
      </h4>

      <StarInput value={calificacion} onChange={setCalificacion} />

      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comparte tu experiencia con este producto... (opcional)"
        rows={3}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
        style={{ "--tw-ring-color": "var(--bio-color-precio, #8b6914)" } as React.CSSProperties}
      />

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={enviando}
        className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--bio-color-titulo, #5c3d1e)" }}
      >
        {enviando ? "Enviando..." : "Publicar reseña"}
      </button>
    </div>
  );
}

// ─── Card de una reseña ───────────────────────────────────────────────────────

function ResenaCard({ resena }: { resena: Resena }) {
  const nombreCompleto = [resena.usuarios.nombre, resena.usuarios.apellido_paterno]
    .filter(Boolean)
    .join(" ");
  const fecha = new Date(resena.fecha).toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-2 mb-1">
        {/* Avatar inicial */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: "var(--bio-color-titulo, #5c3d1e)" }}
        >
          {resena.usuarios.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-medium truncate" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>
              {nombreCompleto}
            </p>
            {resena.compra_verificada && (
              <span className="text-xs text-green-600 font-medium whitespace-nowrap">✓ Compra verificada</span>
            )}
          </div>
          <p className="text-xs text-gray-400">{fecha}</p>
        </div>
      </div>

      {/* Estrellas */}
      <div className="flex gap-0.5 mb-2 ml-10">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={14}
            className={n <= resena.calificacion ? "fill-amber-400 text-amber-400" : "text-gray-200"}
          />
        ))}
      </div>

      {resena.comentario && (
        <p className="text-sm text-gray-600 ml-10 leading-relaxed">{resena.comentario}</p>
      )}

      {/* Respuesta del vendedor */}
      {resena.respuesta_vendedor && (
        <div className="mt-3 ml-10 pl-3 border-l-2 border-amber-200">
          <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
            Respuesta del productor
          </p>
          <p className="text-xs text-gray-500">{resena.respuesta_vendedor}</p>
        </div>
      )}
    </div>
  );
}

// ─── Lista con filtro y paginación ────────────────────────────────────────────

export default function ResenasSeccion({ productoId }: Props) {
  const [datos, setDatos] = useState<ResenasPaginadas | null>(null);
  const [filtro, setFiltro] = useState<number | undefined>(undefined);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [recargar, setRecargar] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.resenas.getByProducto(productoId, {
        calificacion: filtro,
        pagina,
        limite: 5,
      });
      setDatos(res as ResenasPaginadas);
    } finally {
      setCargando(false);
    }
  }, [productoId, filtro, pagina, recargar]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleFiltro = (val: number | undefined) => {
    setFiltro(val);
    setPagina(1);
  };

  return (
    <div className="space-y-4">
      <h3
        className="text-xl font-bold"
        style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
      >
        Reseñas
      </h3>

      {/* Formulario */}
      <ResenaForm
        productoId={productoId}
        onCreada={() => { setPagina(1); setRecargar((r) => r + 1); }}
      />

      {/* Filtro por estrella — scroll horizontal en móvil */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[undefined, 5, 4, 3, 2, 1].map((n) => (
          <button
            key={n ?? "todas"}
            onClick={() => handleFiltro(n)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-colors shrink-0"
            style={{
              backgroundColor: filtro === n ? "var(--bio-color-titulo, #5c3d1e)" : "transparent",
              color: filtro === n ? "#fff" : "var(--bio-color-titulo, #5c3d1e)",
              borderColor: "var(--bio-color-titulo, #5c3d1e)",
            }}
          >
            {n === undefined ? "Todas" : `${n} ★`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <p className="text-sm text-gray-400">Cargando reseñas...</p>
      ) : datos?.data.length === 0 ? (
        <p className="text-sm text-gray-400">
          {filtro ? `No hay reseñas de ${filtro} estrella${filtro !== 1 ? "s" : ""}.` : "Sé el primero en dejar una reseña."}
        </p>
      ) : (
        <div>
          {datos?.data.map((r) => <ResenaCard key={r.id_resena} resena={r} />)}
        </div>
      )}

      {/* Paginación */}
      {datos && datos.meta.totalPaginas > 1 && (
        <div className="flex gap-2 items-center justify-center pt-2">
          <button
            disabled={pagina === 1}
            onClick={() => setPagina((p) => p - 1)}
            className="px-3 py-1.5 rounded text-sm disabled:opacity-40 touch-manipulation"
            style={{ color: "var(--bio-color-precio, #8b6914)" }}
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">
            {pagina} / {datos.meta.totalPaginas}
          </span>
          <button
            disabled={pagina === datos.meta.totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="px-3 py-1.5 rounded text-sm disabled:opacity-40 touch-manipulation"
            style={{ color: "var(--bio-color-precio, #8b6914)" }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}