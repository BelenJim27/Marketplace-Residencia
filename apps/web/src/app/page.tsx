"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Eye,
  FilePenLine,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

type Section =
  | "dashboard"
  | "perfil"
  | "tiendas"
  | "productos"
  | "lotes"
  | "nom070"
  | "galeria";

type StatusKind = "pending" | "approved" | "rejected";

const sections: Array<{
  id: Exclude<Section, "nom070" | "galeria">;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "tiendas", label: "Tiendas", icon: Store },
  { id: "productos", label: "Productos", icon: Package },
  { id: "lotes", label: "Lotes", icon: FileText },
];

const galleryPlaceholders = [
  { id: 1, label: "Imagen 1" },
  { id: 2, label: "Imagen 2" },
  { id: 3, label: "Imagen 3" },
  { id: 4, label: "Imagen 4" },
  { id: 5, label: "Imagen 5" },
  { id: 6, label: "Imagen 6" },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function StatusBadge({ kind, children }: { kind: StatusKind; children: string }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-[0.12em]", styles[kind])}>
      {children}
    </span>
  );
}

export default function MaestroAdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("nom070");
  const [filesMenuOpen, setFilesMenuOpen] = useState(true);
  const [galleryItems, setGalleryItems] = useState(galleryPlaceholders);

  const currentLabel = useMemo(() => {
    if (activeSection === "nom070") return "NOM-070";
    if (activeSection === "galeria") return "Galería";
    return sections.find((section) => section.id === activeSection)?.label ?? "Dashboard";
  }, [activeSection]);

  const uploadedFile = {
    name: "Certificado_Lote_2023.pdf",
    size: "2.4 MB",
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="flex w-72 flex-col bg-[#1a3a2a] px-5 py-6 text-white shadow-2xl shadow-emerald-950/20">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black tracking-[0.24em] text-emerald-400">MAESTRO</p>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Administración</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                    isActive ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex items-center">
                    {section.label}
                    {section.id === "lotes" ? (
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                        nuevo
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}

            <div className="mt-1 rounded-2xl bg-white/5 p-2">
              <button
                type="button"
                onClick={() => setFilesMenuOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <FilePenLine className="h-5 w-5" />
                  <span>Archivos</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 transition", filesMenuOpen && "rotate-180")} />
              </button>

              {filesMenuOpen ? (
                <div className="mt-1 space-y-1 pl-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection("nom070")}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      activeSection === "nom070"
                        ? "bg-emerald-500 text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    <span>NOM-070</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("galeria")}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      activeSection === "galeria"
                        ? "bg-emerald-500 text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    <span>Galería</span>
                  </button>
                </div>
              ) : null}
            </div>
          </nav>

          <button
            type="button"
            className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar sesión</span>
          </button>
        </aside>

        <section className="flex-1 p-6 md:p-8 lg:p-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <header className="flex flex-col gap-3 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200/70 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-600">MAESTRO / {currentLabel}</p>
                <h1 className="text-3xl font-black text-slate-900">Panel de administración</h1>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                <Search className="h-4 w-4 text-slate-400" />
                <span>Acciones rápidas</span>
              </div>
            </header>

            {activeSection === "nom070" ? (
              <Nom070View file={uploadedFile} />
            ) : activeSection === "galeria" ? (
              <GalleryView items={galleryItems} setItems={setGalleryItems} />
            ) : (
              <PlaceholderView section={currentLabel} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Nom070View({ file }: { file: { name: string; size: string } }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Certificación NOM-070</h2>
            <p className="mt-1 text-sm text-slate-500">Gestione sus documentos de cumplimiento normativo</p>
          </div>

          <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm ring-1 ring-emerald-100">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Arrastra tu archivo aquí o selecciona uno manualmente</p>
            <p className="mt-2 text-sm text-slate-500">PDF o imagen, máximo 10MB</p>
            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              Seleccionar archivo
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Archivo cargado</h3>
            <span className="text-xs font-medium text-slate-400">1 documento</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500">{file.size}</p>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <button type="button" className="rounded-xl p-2 transition hover:bg-white hover:text-slate-900" aria-label="Ver archivo">
                  <Eye className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-xl p-2 transition hover:bg-white hover:text-slate-900" aria-label="Editar archivo">
                  <PencilLine className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-xl p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Eliminar archivo">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Estado</h3>
            <StatusBadge kind="pending">PENDIENTE DE REVISIÓN</StatusBadge>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Tu certificado ha sido enviado exitosamente. Actualmente está en proceso de validación por parte del administrador regional.
            Recibirás una notificación cuando el estado cambie.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Información</h3>
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              La NOM-070-SCFI-2016 establece las especificaciones de denominación, empaque, etiquetado, producción y comercialización
              del mezcal en México. Su cumplimiento garantiza trazabilidad y respaldo normativo para cada lote certificado.
            </p>
            <a href="#" className="inline-flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700">
              Ver requisitos legales <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200/70 md:flex-row md:items-center md:justify-between">
        <a href="#" className="text-sm font-semibold text-rose-600 hover:text-rose-700">
          Eliminar certificado
        </a>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function GalleryView({
  items,
  setItems,
}: {
  items: Array<{ id: number; label: string }>;
  setItems: Dispatch<SetStateAction<Array<{ id: number; label: string }>>>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="text-2xl font-bold text-slate-900">Galería de imágenes</h2>
        <p className="mt-1 text-sm text-slate-500">Gestiona las imágenes de tus productos y tienda</p>

        <div className="mt-6 rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm ring-1 ring-emerald-100">
            <ImageIcon className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Arrastra tu archivo aquí o selecciona uno manualmente</p>
          <p className="mt-2 text-sm text-slate-500">JPG, PNG, WEBP, máximo 5MB por imagen</p>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Subir imágenes
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70"
          >
            <div className={cn("h-44 bg-gradient-to-br", galleryGradients[index % galleryGradients.length])} />
            <button
              type="button"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-rose-500"
              aria-label={`Eliminar ${item.label}`}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">Imagen subida</p>
              </div>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label={`Eliminar ${item.label}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const galleryGradients = [
  "from-emerald-200 via-lime-100 to-cyan-100",
  "from-slate-200 via-emerald-100 to-teal-100",
  "from-amber-200 via-orange-100 to-rose-100",
  "from-indigo-200 via-sky-100 to-emerald-100",
  "from-rose-200 via-pink-100 to-purple-100",
  "from-lime-200 via-emerald-100 to-cyan-100",
];

function PlaceholderView({ section }: { section: string }) {
  return (
    <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <LayoutDashboard className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">{section}</h2>
      <p className="mt-2 text-sm text-slate-500">Módulo base listo para integrar contenido específico.</p>
    </div>
  );
}
