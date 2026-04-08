"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie, setCookie } from "@/lib/cookies";

type UserProfile = {
  id_usuario: string;
  nombre: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  email: string;
  telefono?: string | null;
  foto_url?: string | null;
  idioma_preferido?: string | null;
  moneda_preferida?: string | null;
};

type Region = {
  id_region: number;
  nombre: string;
};

type ProductorProfile = {
  id_productor: number;
  id_usuario: string;
  descripcion?: string | null;
  biografia?: string | null;
  otras_caracteristicas?: string | null;
  id_region?: number | null;
  regiones?: { id_region: number; nombre: string } | null;
  usuarios?: UserProfile;
  tiendas?: unknown[];
};

type FormState = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  foto_url: string;
  idioma_preferido: string;
  moneda_preferida: string;
  descripcion: string;
  biografia: string;
  otras_caracteristicas: string;
  id_region: string;
};

const EMPTY_FORM: FormState = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  email: "",
  telefono: "",
  foto_url: "",
  idioma_preferido: "es",
  moneda_preferida: "MXN",
  descripcion: "",
  biografia: "",
  otras_caracteristicas: "",
  id_region: "",
};

export function ProductorPerfil() {
  const { user, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProductorProfile | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const token = getCookie("token") ?? "";

  const coverPhoto = "/images/cover/cover-01.png";
  const avatar = form.foto_url || "/images/user/user-03.png";

  const regionLabel = useMemo(() => {
    const selected = regions.find((region) => String(region.id_region) === form.id_region);
    return selected?.nombre || profile?.regiones?.nombre || "Sin región";
  }, [form.id_region, regions, profile]);

  const loadProfile = async () => {
    if (!user?.id_usuario || !user?.id_productor) {
      setError("No se pudo identificar el perfil autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [userData, producerData, allProducers] = await Promise.all([
        api.usuarios.getOne(user.id_usuario),
        api.productores.getOne(user.id_productor),
        api.productores.getAll(),
      ]);

      const producer = producerData as ProductorProfile;
      const currentUser = userData as UserProfile;

      setProfile(producer);

      setForm({
        nombre: currentUser.nombre ?? "",
        apellido_paterno: currentUser.apellido_paterno ?? "",
        apellido_materno: currentUser.apellido_materno ?? "",
        email: currentUser.email ?? "",
        telefono: currentUser.telefono ?? "",
        foto_url: currentUser.foto_url ?? "",
        idioma_preferido: currentUser.idioma_preferido ?? "es",
        moneda_preferida: currentUser.moneda_preferida ?? "MXN",
        descripcion: producer.descripcion ?? "",
        biografia: producer.biografia ?? "",
        otras_caracteristicas: producer.otras_caracteristicas ?? "",
        id_region: producer.id_region ? String(producer.id_region) : producer.regiones?.id_region ? String(producer.regiones.id_region) : "",
      });

      const uniqueRegions = new Map<number, Region>();
      (allProducers as ProductorProfile[]).forEach((item) => {
        if (item.regiones?.id_region) {
          uniqueRegions.set(item.regiones.id_region, item.regiones);
        }
      });
      setRegions(Array.from(uniqueRegions.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id_usuario, user?.id_productor]);

  const handleChange = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id_usuario || !user?.id_productor) return;

    setSaving(true);
    setError(null);

    try {
      await Promise.all([
        api.usuarios.update(token, user.id_usuario, {
          nombre: form.nombre,
          apellido_paterno: form.apellido_paterno || null,
          apellido_materno: form.apellido_materno || null,
          email: form.email,
          telefono: form.telefono || null,
          foto_url: form.foto_url || null,
          idioma_preferido: form.idioma_preferido,
          moneda_preferida: form.moneda_preferida,
        }),
        api.productores.update(token, user.id_productor, {
          descripcion: form.descripcion || null,
          biografia: form.biografia || null,
          otras_caracteristicas: form.otras_caracteristicas || null,
          id_region: form.id_region ? Number(form.id_region) : undefined,
        }),
      ]);

      setCookie(
        "usuario",
        JSON.stringify({
          ...user,
          nombre: form.nombre,
          email: form.email,
        }),
        7,
      );
      refreshAuth();
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[970px]">
      <Breadcrumb pageName="Perfil del Productor" />

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="relative z-20 h-35 md:h-65">
          <Image
            src={coverPhoto}
            alt="profile cover"
            className="h-full w-full rounded-tl-[10px] rounded-tr-[10px] object-cover object-center"
            width={970}
            height={260}
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div className="px-4 pb-6 lg:pb-8 xl:pb-11.5">
          <div className="relative z-30 mx-auto -mt-22 h-30 w-full max-w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:max-w-[176px] sm:p-3">
            <div className="relative drop-shadow-2">
              <img src={avatar} width={160} height={160} className="overflow-hidden rounded-full object-cover" alt="profile" />
            </div>
          </div>

          <div className="mt-4 text-center">
            <h3 className="mb-1 text-heading-6 font-bold text-dark dark:text-white">
              {form.nombre || "Maestro Mezcalero"}
            </h3>
            <p className="font-medium">{form.email || "correo@ejemplo.com"}</p>

            <div className="mx-auto mb-5.5 mt-5 grid max-w-[540px] grid-cols-3 rounded-[5px] border border-stroke py-[9px] shadow-1 dark:border-dark-3 dark:bg-dark-2 dark:shadow-card">
              <div className="flex flex-col items-center justify-center gap-1 border-r border-stroke px-4 dark:border-dark-3 xsm:flex-row">
                <span className="font-medium text-dark dark:text-white">{profile?.tiendas?.length ?? 0}</span>
                <span className="text-body-sm">Tiendas</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 border-r border-stroke px-4 dark:border-dark-3 xsm:flex-row">
                <span className="font-medium text-dark dark:text-white">{regionLabel}</span>
                <span className="text-body-sm">Región</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-4 xsm:flex-row">
                <span className="font-medium text-dark dark:text-white">{form.idioma_preferido}</span>
                <span className="text-body-sm">Idioma</span>
              </div>
            </div>
          </div>

          {error && <div className="mx-auto mb-6 max-w-[720px] rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSave} className="mx-auto max-w-[720px] space-y-6">
            <Section title="Datos del usuario">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre" value={form.nombre} onChange={(value) => handleChange("nombre", value)} />
                <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(value) => handleChange("apellido_paterno", value)} />
                <Field label="Apellido materno" value={form.apellido_materno} onChange={(value) => handleChange("apellido_materno", value)} />
                <Field label="Email" type="email" value={form.email} onChange={(value) => handleChange("email", value)} />
                <Field label="Teléfono" value={form.telefono} onChange={(value) => handleChange("telefono", value)} />
                <Field label="Foto (URL)" value={form.foto_url} onChange={(value) => handleChange("foto_url", value)} />
                <Field label="Idioma preferido" value={form.idioma_preferido} onChange={(value) => handleChange("idioma_preferido", value)} />
                <Field label="Moneda preferida" value={form.moneda_preferida} onChange={(value) => handleChange("moneda_preferida", value)} />
              </div>
            </Section>

            <Section title="Datos del productor">
              <div className="grid gap-4">
                <Field label="Descripción" value={form.descripcion} onChange={(value) => handleChange("descripcion", value)} textarea />
                <Field label="Biografía" value={form.biografia} onChange={(value) => handleChange("biografia", value)} textarea />
                <Field label="Otras características" value={form.otras_caracteristicas} onChange={(value) => handleChange("otras_caracteristicas", value)} textarea />
                <SelectField label="Región" value={form.id_region} onChange={(value) => handleChange("id_region", value)} options={regions.map((region) => ({ label: region.nombre, value: String(region.id_region) }))} />
              </div>
            </Section>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={loadProfile} className="rounded-lg border border-stroke px-5 py-3 font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
                Recargar
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-stroke bg-white p-5 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <h4 className="mb-4 font-medium text-dark dark:text-white">{title}</h4>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
      >
        <option value="">Sin asignar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
