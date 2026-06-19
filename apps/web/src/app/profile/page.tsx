"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { getCookie, setCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { getMediaUrl } from "@/lib/media";
import { useTheme } from "next-themes";
import {
  User, Camera, Lock, ShoppingBag,
  ChevronRight, Check, Eye, EyeOff,
  Pencil, AlertCircle, Loader2, MapPin
} from "lucide-react";

// --- TIPOS ---
interface StoredUser {
  id_usuario: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email: string;
  telefono?: string;
  foto_url?: string;
  idioma_preferido?: string;
  moneda_preferida?: string;
  roles: string[];
}

type Tab = "perfil" | "seguridad" | "direcciones";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getInitials(nombre?: string, apellido?: string) {
  return [nombre, apellido]
    .filter(Boolean)
    .map((s) => s!.trim()[0].toUpperCase())
    .join("")
    .slice(0, 2);
}

export default function ClientePerfilPage() {
  const { user: authUser, refreshAuth } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && theme === "dark";
  const colors = {
    bgPage: isDark ? "#121212" : "#F4F0E3",
    bgCard: isDark ? "#1E1E1E" : "#fff",
    border: isDark ? "#333333" : "#E5E5E1",
    textMain: isDark ? "#E0E0E0" : "#1A241E",
    textSub: isDark ? "#A0A0A0" : "#5C6B5E",
    inputBg: isDark ? "#2C2C2C" : "#F4F0E3",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "10px",
    border: `1px solid ${colors.border}`, fontSize: "14px", color: colors.textMain,
    background: colors.inputBg, outline: "none", boxSizing: "border-box",
    transition: "all 0.2s"
  };

  const [user, setUser] = useState<StoredUser | null>(null);
  const [tab, setTab] = useState<Tab>("perfil");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    nombre: "", apellido_paterno: "", apellido_materno: "",
    email: "", telefono: "",
  });
  const [telefonoError, setTelefonoError] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [showPwActual, setShowPwActual] = useState(false);
  const [showPwNueva, setShowPwNueva] = useState(false);
  const [showPwConfirmar, setShowPwConfirmar] = useState(false);
  const [loadingDir, setLoadingDir] = useState(false);
  const [savingDir, setSavingDir] = useState(false);
  const [editandoDir, setEditandoDir] = useState(false);
  const [dirProduccion, setDirProduccion] = useState<{ calle: string; cp: string; ciudad: string; estado: string; referencia: string } | null>(null);
  const [formDir, setFormDir] = useState({ calle: "", cp: "", ciudad: "", estado: "", referencia: "" });
  const [region, setRegion] = useState<string | null>(null);

  const cargarPerfil = useCallback(async () => {
    const token = getCookie("token");
    if (!token) return;
    try {
      const profile = (await api.auth.getProfile(token)) as StoredUser;
      setUser(profile);
      setForm({
        nombre: profile.nombre ?? "",
        apellido_paterno: profile.apellido_paterno ?? "",
        apellido_materno: profile.apellido_materno ?? "",
        email: profile.email ?? "",
        telefono: profile.telefono ?? "",
      });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (authUser) {
      const u = authUser as unknown as StoredUser;
      setUser(u);
      setForm({
        nombre: u.nombre ?? "",
        apellido_paterno: u.apellido_paterno ?? "",
        apellido_materno: u.apellido_materno ?? "",
        email: u.email ?? "",
        telefono: u.telefono ?? "",
      });
    }
    cargarPerfil();
  }, [authUser?.id_usuario, cargarPerfil]);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const validateTelefono = (tel: string) => {
    if (!tel) return null;
    const digits = tel.replace(/\D/g, "");
    if (digits.length !== 10) return "El teléfono debe tener 10 dígitos";
    return null;
  };

  const handleSavePerfil = async () => {
    if (!user) return;
    const telErr = validateTelefono(form.telefono);
    if (telErr) { setTelefonoError(telErr); return; }
    setTelefonoError(null);
    setSavingProfile(true);
    try {
      const token = getCookie("token");
      await fetch(`${API_URL}/usuarios/${user.id_usuario}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      });
      await cargarPerfil();
      refreshAuth();
      flash("ok", "Perfil actualizado");
    } catch { flash("err", "Error al guardar"); } finally { setSavingProfile(false); }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 500 * 1024) {
      flash("err", "La imagen debe pesar menos de 500 KB.");
      e.target.value = "";
      return;
    }
    setUploadingFoto(true);
    try {
      const token = getCookie("token");
      const fd = new FormData();
      fd.append("foto", file);
      await fetch(`${API_URL}/usuarios/${user.id_usuario}/foto`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      await cargarPerfil();
      refreshAuth();
      flash("ok", "Foto actualizada");
    } catch { flash("err", "Error al subir foto"); } finally { setUploadingFoto(false); }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    if (pwForm.nueva !== pwForm.confirmar) return flash("err", "No coinciden");
    setSavingPassword(true);
    try {
      const token = getCookie("token");
      await fetch(`${API_URL}/usuarios/${user.id_usuario}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ password: pwForm.nueva }),
      });
      setPwForm({ actual: "", nueva: "", confirmar: "" });
      flash("ok", "Contraseña cambiada");
    } catch { flash("err", "Error"); } finally { setSavingPassword(false); }
  };

  const isProductor = user?.roles?.some((r: string) => ["productor", "PRODUCTOR"].includes(r));

  const handleSaveDir = async () => {
    const token = getCookie("token");
    if (!token) return;
    setSavingDir(true);
    try {
      await api.productores.actualizarMiPerfil(token, {
        direccion_produccion: {
          linea_1: formDir.calle || undefined,
          ciudad: formDir.ciudad || undefined,
          estado: formDir.estado || undefined,
          codigo_postal: formDir.cp || undefined,
          referencia: formDir.referencia || undefined,
          pais_iso2: "MX",
        },
      });
      setDirProduccion({ ...formDir });
      setEditandoDir(false);
      flash("ok", "Dirección actualizada");
    } catch { flash("err", "Error al guardar la dirección"); } finally { setSavingDir(false); }
  };

  const cargarDirecciones = async () => {
    const token = getCookie("token");
    if (!token) return;
    setLoadingDir(true);
    try {
      const sol = await api.productores.getMiSolicitud(token) as any;
      if (sol) {
        const dp = sol.direccion_produccion;
        if (dp) {
          const d = { calle: dp.linea_1 ?? "", cp: dp.codigo_postal ?? "", ciudad: dp.ciudad ?? "", estado: dp.estado ?? "", referencia: dp.referencia ?? "" };
          setDirProduccion(d);
          setFormDir(d);
        }
        setRegion(sol.regiones?.nombre ?? null);
      }
    } catch { /* sin solicitud */ } finally { setLoadingDir(false); }
  };

  if (!mounted) return null;

  const initials = getInitials(user?.nombre, user?.apellido_paterno);
  const fullName = [user?.nombre, user?.apellido_paterno, user?.apellido_materno].filter(Boolean).join(" ");
  const isProfileComplete = !!(user?.nombre && user?.apellido_paterno && user?.telefono);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "perfil", label: t("Editar perfil"), icon: <User size={17} /> },
    { id: "seguridad", label: t("Contraseña"), icon: <Lock size={17} /> },
    ...(isProductor ? [{ id: "direcciones" as Tab, label: t("Mis Direcciones"), icon: <MapPin size={17} /> }] : []),
  ];

  return (
    <div style={{ paddingBottom: "64px", transition: "background 0.3s" }}>
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>

        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#3D6B3F", marginBottom: "4px" }}>{t("Mi cuenta")}</p>
          <h1 style={{ fontFamily: "var(--font-family-store)", fontSize: "28px", fontWeight: 700, color: colors.textMain, margin: 0 }}>{t("Perfil")}</h1>
        </div>

        {msg && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", marginBottom: "20px", background: msg.type === "ok" ? "#d1fae5" : "#fee2e2", color: msg.type === "ok" ? "#065f46" : "#991b1b", display: "flex", alignItems: "center", gap: "8px", border: `1px solid ${msg.type === "ok" ? "#6ee7b7" : "#fca5a5"}` }}>
            {msg.type === "ok" ? <Check size={16} /> : <AlertCircle size={16} />} {msg.text}
          </div>
        )}

        <div style={{ background: colors.bgCard, borderRadius: "16px", border: `1px solid ${colors.border}`, padding: "28px 24px", marginBottom: "20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "88px", height: "88px", borderRadius: "50%", overflow: "hidden", background: isDark ? "#2D3731" : "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {uploadingFoto ? <Loader2 className="animate-spin text-green-700" size={32} /> :
                user?.foto_url ? <img src={getMediaUrl(user.foto_url)} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> :
                  <span style={{ fontSize: "26px", fontWeight: 700, color: "#3D6B3F" }}>{initials || <User size={32} />}</span>}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFoto} style={{ position: "absolute", bottom: 0, right: 0, width: "28px", height: "28px", borderRadius: "50%", background: "#3D6B3F", border: "2px solid #fff", color: "#fff", cursor: uploadingFoto ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: uploadingFoto ? 0.6 : 1 }}>
              {uploadingFoto ? <Loader2 className="animate-spin" size={13} /> : <Camera size={13} />}
            </button>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFotoChange} />
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <p style={{ fontSize: "20px", fontWeight: 700, color: colors.textMain, margin: 0 }}>{fullName || "—"}</p>
              <span style={{ background: isProfileComplete ? "rgba(209, 250, 229, 0.5)" : "rgba(254, 243, 199, 0.5)", border: `1px solid ${isDark ? "#333" : "#eee"}`, padding: "2px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", borderRadius: "999px", color: colors.textMain }}>
                {isProfileComplete ? t("Completo") : t("Pendiente")}
              </span>
              {!isProfileComplete && (
                <p style={{ fontSize: "11px", color: "#92400e", background: "rgba(254,243,199,0.6)", border: "1px solid #fde68a", borderRadius: "8px", padding: "6px 10px", margin: "8px 0 0", display: "flex", alignItems: "center", gap: "5px" }}>
                   Para completar tu cuenta agrega tu número de teléfono en <strong>Editar perfil</strong>.
                </p>
              )}
            </div>
            <p style={{ fontSize: "13px", color: colors.textSub, marginBottom: "10px" }}>{user?.email}</p>
            <button onClick={() => router.push("/tienda/compras")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#3D6B3F", background: "rgba(26,93,59,0.08)", padding: "5px 14px", borderRadius: "999px", cursor: "pointer", border: "none" }}>
              <ShoppingBag size={13} /> {t("Ver mis compras")} <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", background: colors.bgCard, padding: "6px", borderRadius: "12px", border: `1px solid ${colors.border}`, marginBottom: "16px" }}>
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => { setTab(tb.id); if (tb.id === "direcciones") { if (isProductor && !dirProduccion) cargarDirecciones(); } }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", background: tab === tb.id ? "#3D6B3F" : "transparent", color: tab === tb.id ? "#fff" : colors.textSub, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s", fontWeight: tab === tb.id ? "bold" : "normal" }}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>

        <div style={{ background: colors.bgCard, borderRadius: "16px", border: `1px solid ${colors.border}`, padding: "28px 24px" }}>

          {tab === "perfil" && (
            <div>
              <h2 style={{ fontSize: "18px", color: colors.textMain, marginBottom: "20px" }}>{t("Información personal")}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { label: t("Nombre"), key: "nombre" as const, placeholder: "María" },
                  { label: t("Apellido Paterno"), key: "apellido_paterno" as const, placeholder: "García" },
                  { label: t("Apellido Materno"), key: "apellido_materno" as const, placeholder: "López" },
                ].map((item) => (
                  <div key={item.key}>
                    <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{item.label}</label>
                    <input
                      value={form[item.key]}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                      style={inputStyle}
                      placeholder={item.placeholder}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Teléfono")}</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
                      setForm({ ...form, telefono: val });
                      setTelefonoError(null);
                    }}
                    style={{ ...inputStyle, borderColor: telefonoError ? "#f87171" : undefined }}
                    placeholder="10 dígitos, ej. 9511234567"
                    maxLength={10}
                  />
                  {telefonoError && (
                    <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={11} /> {telefonoError}
                    </p>
                  )}
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Correo electrónico")}</label>
                  <input value={form.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button onClick={handleSavePerfil} disabled={savingProfile} style={{ background: savingProfile ? "#C5CFB0" : "#3D6B3F", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: savingProfile ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", display: "inline-flex", gap: "8px", alignItems: "center" }}>
                  {savingProfile ? <Loader2 className="animate-spin" size={15} /> : <Pencil size={15} />}
                  {savingProfile ? t("Guardando...") : t("Guardar cambios")}
                </button>
              </div>
            </div>
          )}

          {tab === "seguridad" && (
            <div>
              <h2 style={{ fontSize: "18px", color: colors.textMain, marginBottom: "10px" }}>{t("Seguridad")}</h2>
              <p style={{ fontSize: "14px", color: colors.textSub, marginBottom: "24px" }}>{t("Tu nueva contraseña debe tener al menos 8 caracteres")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwActual ? "text" : "password"}
                    placeholder={t("Contraseña actual")}
                    value={pwForm.actual}
                    onChange={(e) => setPwForm({ ...pwForm, actual: e.target.value })}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                  />
                  <button type="button" onClick={() => setShowPwActual(!showPwActual)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.textSub, display: "flex", alignItems: "center" }}>
                    {showPwActual ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwNueva ? "text" : "password"}
                    placeholder={t("Nueva contraseña")}
                    value={pwForm.nueva}
                    onChange={(e) => setPwForm({ ...pwForm, nueva: e.target.value })}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                  />
                  <button type="button" onClick={() => setShowPwNueva(!showPwNueva)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.textSub, display: "flex", alignItems: "center" }}>
                    {showPwNueva ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwConfirmar ? "text" : "password"}
                    placeholder={t("Confirmar")}
                    value={pwForm.confirmar}
                    onChange={(e) => setPwForm({ ...pwForm, confirmar: e.target.value })}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                  />
                  <button type="button" onClick={() => setShowPwConfirmar(!showPwConfirmar)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.textSub, display: "flex", alignItems: "center" }}>
                    {showPwConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button onClick={handleSavePassword} disabled={savingPassword} style={{ background: savingPassword ? "#C5CFB0" : "#3D6B3F", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: savingPassword ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", display: "inline-flex", gap: "8px", alignItems: "center" }}>
                  {savingPassword ? <Loader2 className="animate-spin" size={15} /> : <Lock size={15} />}
                  {savingPassword ? t("Guardando...") : t("Cambiar contraseña")}
                </button>
              </div>
            </div>
          )}

          {tab === "direcciones" && isProductor && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "18px", color: colors.textMain, marginBottom: "10px" }}>{t("Mis Direcciones")}</h2>

              {loadingDir ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                  <Loader2 className="animate-spin" size={28} color="#3D6B3F" />
                </div>
              ) : (
                <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: colors.inputBg }}>
                  {/* Encabezado */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <MapPin size={18} color="#3D6B3F" />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textMain }}>{t("Lugar de Producción")}</span>
                    {region && (
                      <span style={{ fontSize: "11px", background: "rgba(61,107,63,0.1)", color: "#3D6B3F", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                        {region}
                      </span>
                    )}
                    {!editandoDir && (
                      <button
                        onClick={() => { setFormDir(dirProduccion ?? { calle: "", cp: "", ciudad: "", estado: "", referencia: "" }); setEditandoDir(true); }}
                        style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: "#3D6B3F", background: "rgba(61,107,63,0.08)", padding: "4px 12px", borderRadius: "999px", border: "none", cursor: "pointer" }}
                      >
                        <Pencil size={12} /> {t("Editar")}
                      </button>
                    )}
                  </div>

                  {/* Vista lectura */}
                  {!editandoDir && (
                    dirProduccion && (dirProduccion.calle || dirProduccion.ciudad) ? (
                      <div style={{ fontSize: "14px", color: colors.textSub, lineHeight: "1.8" }}>
                        {dirProduccion.calle && <p style={{ margin: 0, color: colors.textMain }}>{dirProduccion.calle}</p>}
                        {(dirProduccion.ciudad || dirProduccion.estado) && <p style={{ margin: 0 }}>{[dirProduccion.ciudad, dirProduccion.estado].filter(Boolean).join(", ")}</p>}
                        {dirProduccion.cp && <p style={{ margin: 0 }}>CP {dirProduccion.cp}</p>}
                        {dirProduccion.referencia && <p style={{ margin: "4px 0 0", fontSize: "12px" }}>{dirProduccion.referencia}</p>}
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: colors.textSub, margin: 0 }}>No se ha registrado ninguna dirección aún.</p>
                    )
                  )}

                  {/* Formulario edición */}
                  {editandoDir && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Calle y Número")}</label>
                        <input value={formDir.calle} onChange={(e) => setFormDir({ ...formDir, calle: e.target.value })} style={inputStyle} placeholder="Av. Producción #456" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Ciudad")}</label>
                          <input value={formDir.ciudad} onChange={(e) => setFormDir({ ...formDir, ciudad: e.target.value })} style={inputStyle} placeholder="Oaxaca" />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Estado")}</label>
                          <input value={formDir.estado} onChange={(e) => setFormDir({ ...formDir, estado: e.target.value })} style={inputStyle} placeholder="Oaxaca" />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Código Postal")}</label>
                        <input value={formDir.cp} onChange={(e) => setFormDir({ ...formDir, cp: e.target.value.replace(/\D/g, "").slice(0, 5) })} style={inputStyle} placeholder="12345" maxLength={5} />
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Referencia (opcional)")}</label>
                        <input value={formDir.referencia} onChange={(e) => setFormDir({ ...formDir, referencia: e.target.value })} style={inputStyle} placeholder="Cerca del río, zona de ley seca" />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                        <button
                          onClick={() => setEditandoDir(false)}
                          style={{ padding: "9px 20px", borderRadius: "8px", border: `1px solid ${colors.border}`, background: "transparent", color: colors.textSub, cursor: "pointer", fontSize: "13px" }}
                        >
                          {t("Cancelar")}
                        </button>
                        <button
                          onClick={handleSaveDir}
                          disabled={savingDir}
                          style={{ background: savingDir ? "#C5CFB0" : "#3D6B3F", color: "#fff", padding: "9px 20px", borderRadius: "8px", border: "none", cursor: savingDir ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "13px", display: "inline-flex", gap: "8px", alignItems: "center" }}
                        >
                          {savingDir ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                          {savingDir ? t("Guardando...") : t("Guardar")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}