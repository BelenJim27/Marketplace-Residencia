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
  User, Camera, Lock, Settings, ShoppingBag,
  ChevronRight, Check, Eye, EyeOff, Bell,
  Moon, Sun, Globe, Pencil, AlertCircle, Loader2, DollarSign
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

type Tab = "perfil" | "seguridad" | "preferencias";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getInitials(nombre?: string, apellido?: string) {
  return [nombre, apellido]
    .filter(Boolean)
    .map((s) => s!.trim()[0].toUpperCase())
    .join("")
    .slice(0, 2);
}

const MONEDAS = [
  { value: "MXN", label: "🇲🇽 MXN" },
  { value: "USD", label: "🇺🇸 USD" },
  { value: "EUR", label: "🇪🇺 EUR" }
];

export default function ClientePerfilPage() {
  const { user: authUser, refreshAuth } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && theme === "dark";
  const colors = {
    bgPage: isDark ? "#121212" : "#F9F8F4",
    bgCard: isDark ? "#1E1E1E" : "#fff",
    border: isDark ? "#333333" : "#E5E5E1",
    textMain: isDark ? "#E0E0E0" : "#1A241E",
    textSub: isDark ? "#A0A0A0" : "#5C6B5E",
    inputBg: isDark ? "#2C2C2C" : "#F9F8F4",
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
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    nombre: "", apellido_paterno: "", apellido_materno: "",
    email: "", telefono: "",
  });

  const [pwForm, setPwForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [prefs, setPrefs] = useState({ idioma: "es", notificaciones: true, moneda: "MXN" });

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
      setPrefs((p) => ({
        ...p,
        idioma: profile.idioma_preferido ?? "es",
        moneda: profile.moneda_preferida ?? "MXN",
      }));
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

  const handleSavePerfil = async () => {
    if (!user) return;
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

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const token = getCookie("token");
      await fetch(`${API_URL}/usuarios/${user.id_usuario}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          idioma_preferido: prefs.idioma,
          moneda_preferida: prefs.moneda
        }),
      });
      await cargarPerfil();
      refreshAuth();
      flash("ok", "Preferencias guardadas");
    } catch { flash("err", "Error"); } finally { setSavingPrefs(false); }
  };

  if (!mounted) return null;

  const initials = getInitials(user?.nombre, user?.apellido_paterno);
  const fullName = [user?.nombre, user?.apellido_paterno, user?.apellido_materno].filter(Boolean).join(" ");
  const isProfileComplete = !!(user?.nombre && user?.apellido_paterno && user?.telefono);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "perfil", label: t("Editar perfil"), icon: <User size={17} /> },
    { id: "seguridad", label: t("Contraseña"), icon: <Lock size={17} /> },
    { id: "preferencias", label: t("Preferencias"), icon: <Settings size={17} /> },
  ];

  return (
    <div style={{ background: colors.bgPage, minHeight: "100vh", padding: "32px 16px 64px", transition: "background 0.3s" }}>
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#1A5D3B", marginBottom: "4px" }}>{t("Mi cuenta")}</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "28px", fontWeight: 700, color: colors.textMain, margin: 0 }}>{t("Perfil")}</h1>
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
              <span style={{ fontSize: "26px", fontWeight: 700, color: "#1A5D3B" }}>{initials || <User size={32} />}</span>}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFoto} style={{ position: "absolute", bottom: 0, right: 0, width: "28px", height: "28px", borderRadius: "50%", background: "#1A5D3B", border: "2px solid #fff", color: "#fff", cursor: uploadingFoto ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: uploadingFoto ? 0.6 : 1 }}>
              {uploadingFoto ? <Loader2 className="animate-spin" size={13}/> : <Camera size={13} />}
            </button>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFotoChange} />
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px"}}>
              <p style={{ fontSize: "20px", fontWeight: 700, color: colors.textMain, margin: 0 }}>{fullName || "—"}</p>
              <span style={{ background: isProfileComplete ? "rgba(209, 250, 229, 0.5)" : "rgba(254, 243, 199, 0.5)", border: `1px solid ${isDark ? "#333" : "#eee"}`, padding: "2px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", borderRadius: "999px", color: colors.textMain }}>
                {isProfileComplete ? t("Completo") : t("Pendiente")}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: colors.textSub, marginBottom: "10px" }}>{user?.email}</p>
            <button onClick={() => router.push("/tienda/compras")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#1A5D3B", background: "rgba(26,93,59,0.08)", padding: "5px 14px", borderRadius: "999px", cursor: "pointer", border: "none" }}>
              <ShoppingBag size={13} /> {t("Ver mis compras")} <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", background: colors.bgCard, padding: "6px", borderRadius: "12px", border: `1px solid ${colors.border}`, marginBottom: "16px" }}>
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", background: tab === tb.id ? "#1A5D3B" : "transparent", color: tab === tb.id ? "#fff" : colors.textSub, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s", fontWeight: tab === tb.id ? "bold" : "normal" }}>
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
                  { label: t("Teléfono"), key: "telefono" as const, placeholder: "+52..." },
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
                <div style={{gridColumn: "span 2"}}>
                    <label style={{ fontSize: "12px", color: colors.textSub, display: "block", marginBottom: "6px" }}>{t("Correo electrónico")}</label>
                    <input value={form.email} disabled style={{...inputStyle, opacity: 0.6, cursor: "not-allowed"}} />
                </div>
              </div>
              <div style={{display: "flex", justifyContent: "flex-end", marginTop: "24px"}}>
                <button onClick={handleSavePerfil} disabled={savingProfile} style={{ background: savingProfile ? "#A7C5B1" : "#1A5D3B", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: savingProfile ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", display: "inline-flex", gap: "8px", alignItems: "center" }}>
                  {savingProfile ? <Loader2 className="animate-spin" size={15}/> : <Pencil size={15} />}
                  {savingProfile ? t("Guardando...") : t("Guardar cambios")}
                </button>
              </div>
            </div>
          )}

          {tab === "seguridad" && (
            <div>
              <h2 style={{ fontSize: "18px", color: colors.textMain, marginBottom: "10px" }}>{t("Seguridad")}</h2>
              <p style={{fontSize: "14px", color: colors.textSub, marginBottom: "24px"}}>{t("Tu nueva contraseña debe tener al menos 8 caracteres")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
                <input type="password" placeholder={t("Contraseña actual")} style={inputStyle} />
                <input type="password" placeholder={t("Nueva contraseña")} value={pwForm.nueva} onChange={(e) => setPwForm({...pwForm, nueva: e.target.value})} style={inputStyle} />
                <input type="password" placeholder={t("Confirmar")} value={pwForm.confirmar} onChange={(e) => setPwForm({...pwForm, confirmar: e.target.value})} style={inputStyle} />
              </div>
              <div style={{display: "flex", justifyContent: "flex-end", marginTop: "24px"}}>
                <button onClick={handleSavePassword} disabled={savingPassword} style={{ background: savingPassword ? "#A7C5B1" : "#1A5D3B", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: savingPassword ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", display: "inline-flex", gap: "8px", alignItems: "center" }}>
                    {savingPassword ? <Loader2 className="animate-spin" size={15}/> : <Lock size={15} />}
                    {savingPassword ? t("Guardando...") : t("Cambiar contraseña")}
                </button>
              </div>
            </div>
          )}

          {tab === "preferencias" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "18px", color: colors.textMain, marginBottom: "10px" }}>{t("Preferencias")}</h2>
              
              <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: colors.inputBg }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <Globe size={18} color="#1A5D3B" />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textMain }}>{t("Idioma")}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ v: "es", l: "🇲🇽 Español" }, { v: "en", l: "🇺🇸 English" }].map((tm) => (
                    <button key={tm.v} onClick={() => setPrefs({...prefs, idioma: tm.v})} style={{ padding: "8px 16px", borderRadius: "8px", border: prefs.idioma === tm.v ? "1.5px solid #1A5D3B" : `1px solid ${colors.border}`, background: prefs.idioma === tm.v ? "rgba(26,93,59,0.1)" : colors.bgCard, color: prefs.idioma === tm.v ? "#1A5D3B" : colors.textSub, cursor: "pointer", fontSize: "14px", fontWeight: "medium" }}>
                      {tm.l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: colors.inputBg }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <DollarSign size={18} color="#1A5D3B" />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textMain }}>{t("Moneda Preferida")}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {MONEDAS.map((m) => (
                    <button key={m.value} onClick={() => setPrefs({...prefs, moneda: m.value})} style={{ padding: "8px 16px", borderRadius: "8px", border: prefs.moneda === m.value ? "1.5px solid #1A5D3B" : `1px solid ${colors.border}`, background: prefs.moneda === m.value ? "rgba(26,93,59,0.1)" : colors.bgCard, color: prefs.moneda === m.value ? "#1A5D3B" : colors.textSub, cursor: "pointer", fontSize: "14px", fontWeight: "medium" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: colors.inputBg }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  {isDark ? <Moon size={18} color="#1A5D3B" /> : <Sun size={18} color="#1A5D3B" />}
                  <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textMain }}>{t("Tema")}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ v: "light", l: "☀️ Claro" }, { v: "dark", l: "🌙 Oscuro" }].map((tm) => (
                    <button key={tm.v} onClick={() => setTheme(tm.v)} style={{ padding: "8px 16px", borderRadius: "8px", border: theme === tm.v ? "1.5px solid #1A5D3B" : `1px solid ${colors.border}`, background: theme === tm.v ? "rgba(26,93,59,0.1)" : colors.bgCard, color: theme === tm.v ? "#1A5D3B" : colors.textSub, cursor: "pointer", fontSize: "14px", fontWeight: "medium" }}>
                      {tm.l}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{display: "flex", justifyContent: "flex-end", marginTop: "24px"}}>
                <button onClick={handleSavePrefs} disabled={savingPrefs} style={{ background: savingPrefs ? "#A7C5B1" : "#1A5D3B", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: savingPrefs ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", display: "inline-flex", gap: "8px", alignItems: "center" }}>
                    {savingPrefs ? <Loader2 className="animate-spin" size={15}/> : <Settings size={15} />}
                    {savingPrefs ? t("Guardando...") : t("Guardar preferencias")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}