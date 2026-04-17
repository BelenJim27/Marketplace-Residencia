"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";

import { useState, useEffect } from "react";
import { CameraIcon } from "./_components/icons";
import { SocialAccounts } from "./_components/social-accounts";
import { ModalEditarPerfil } from "./_components/modal-editar-perfil";
import { useAuth } from "@/context/AuthContext";
import { getCookie, setCookie } from "@/lib/cookies";
import { PencilIcon, User } from "lucide-react";
import { api } from "@/lib/api";
import { getMediaUrl } from "@/lib/media";

interface StoredUser {
  id_usuario?: string;
  id_productor?: number | null;
  email: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  foto_url?: string;
  telefono?: string;
  biografia?: string | null;
  idioma_preferido?: string;
  moneda_preferida?: string;
  roles: string[];
  permisos?: string[];
}

export default function Page() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [data, setData] = useState({
    name: "",
    profilePhoto: "",
    coverPhoto: "/images/cover/cover-01.png",
    email: "",
    phone: "",
    idioma: "es",
    moneda: "MXN",
  });

  useEffect(() => {
    if (authUser) {
      setUser(authUser as unknown as StoredUser);
      setData({
        name: authUser.nombre || "",
        profilePhoto: (authUser as unknown as StoredUser).foto_url || "",
        coverPhoto: "/images/cover/cover-01.png",
        email: authUser.email || "",
        phone: (authUser as unknown as StoredUser).telefono || "",
        idioma: (authUser as unknown as StoredUser).idioma_preferido || "es",
        moneda: (authUser as unknown as StoredUser).moneda_preferida || "MXN",
      });
    } else {
      const usuarioStr = getCookie("usuario");
      if (usuarioStr) {
        try {
          const storedUser = JSON.parse(usuarioStr);
          setUser(storedUser);
          setData({
            name: storedUser.nombre || "",
            profilePhoto: storedUser.foto_url || "",
            coverPhoto: "/images/cover/cover-01.png",
            email: storedUser.email || "",
            phone: storedUser.telefono || "",
            idioma: storedUser.idioma_preferido || "es",
            moneda: storedUser.moneda_preferida || "MXN",
          });
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, [authUser]);

  useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const profile = (await api.auth.getProfile(token)) as StoredUser;
        if (cancelled) {
          return;
        }

        setUser(profile as StoredUser);
        setCookie("usuario", JSON.stringify(profile), 7);
        setData((prev) => ({
          ...prev,
          name: profile.nombre || "",
          profilePhoto: profile.foto_url || "",
          email: profile.email || "",
          phone: profile.telefono || "",
          idioma: profile.idioma_preferido || "es",
          moneda: profile.moneda_preferida || "MXN",
        }));
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id_usuario]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChange = (e: any) => {
    if (e.target.name === "coverPhoto") {
      const file = e.target?.files[0];

      setData({
        ...data,
        coverPhoto: file && URL.createObjectURL(file),
      });
    } else {
      setData({
        ...data,
        [e.target.name]: e.target.value,
      });
    }
  };

  const fullName = [
    data.name,
    user?.apellido_paterno,
    user?.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = [data.name, user?.apellido_paterno]
    .filter(Boolean)
    .map((part) => part?.trim().charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <div className="mx-auto w-full max-w-[970px] px-2 sm:px-4">
      <Breadcrumb pageName="Profile" />

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="relative z-20 h-28 sm:h-35 md:h-65">
          <Image
            src={data?.coverPhoto}
            alt="profile cover"
            className="h-full w-full rounded-tl-[10px] rounded-tr-[10px] object-cover object-center"
            width={970}
            height={260}
            style={{
              width: "auto",
              height: "auto",
            }}
          />
          <div className="absolute bottom-1 right-1 z-10 xsm:bottom-4 xsm:right-4">
            <label
              htmlFor="cover"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-[15px] py-[5px] text-body-sm font-medium text-white hover:bg-opacity-90"
            >
              <input
                type="file"
                name="coverPhoto"
                id="coverPhoto"
                className="sr-only"
                onChange={handleChange}
                accept="image/png, image/jpg, image/jpeg"
              />

              <CameraIcon />

              <span>Edit</span>
            </label>
          </div>
        </div>
        <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
          <div className="relative z-30 mx-auto -mt-22 h-30 w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:w-44 sm:p-3">
            <div className="relative h-full w-full overflow-hidden rounded-full drop-shadow-2">
              {data.profilePhoto ? (
                <img
                  src={getMediaUrl(data.profilePhoto)}
                  alt="profile"
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-30 w-30 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-dark-3 dark:text-gray-400 sm:h-44 sm:w-44">
                  {initials ? <span className="text-3xl font-bold sm:text-5xl">{initials}</span> : <User className="h-12 w-12 sm:h-16 sm:w-16" />}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-0 right-0 flex size-8.5 items-center justify-center rounded-full bg-primary text-white hover:bg-opacity-90 sm:bottom-2 sm:right-2"
                aria-label="Cambiar foto de perfil"
              >
                <CameraIcon />
              </button>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="mb-1 text-heading-6 font-bold text-dark dark:text-white">
              {fullName || "Usuario"}
            </h3>
            <p className="font-medium">{data.email}</p>
            <div className="mx-auto mb-5.5 mt-5 grid max-w-[370px] grid-cols-3 rounded-[5px] border border-stroke py-[9px] shadow-1 dark:border-dark-3 dark:bg-dark-2 dark:shadow-card">
              
              <div className="flex flex-col items-center justify-center gap-1 px-4 xsm:flex-row">
                <span className="font-medium text-dark dark:text-white">
                  {data.idioma.toUpperCase()}
                </span>
                <span className="text-body-sm-sm">Idioma</span>
              </div>
            </div>

            <div className="mx-auto px-2 sm:px-0 max-w-[720px]">
              <h4 className="font-medium text-dark dark:text-white">
                Información del Usuario
              </h4>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 text-left md:grid-cols-2">
                <div>
                  <p className="text-body-sm text-gray-500">Nombre</p>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div>
                  <p className="text-body-sm text-gray-500">Apellido Paterno</p>
                  <p className="font-medium">{user?.apellido_paterno || "-"}</p>
                </div>
                <div>
                  <p className="text-body-sm text-gray-500">Apellido Materno</p>
                  <p className="font-medium">{user?.apellido_materno || "-"}</p>
                </div>
                <div>
                  <p className="text-body-sm text-gray-500">Email</p>
                  <p className="font-medium">{data.email}</p>
                </div>
                <div>
                  <p className="text-body-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{data.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-body-sm text-gray-500">Moneda Preferida</p>
                  <p className="font-medium">{data.moneda}</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-left shadow-sm dark:border-dark-3 dark:bg-dark-2">
                <h5 className="text-sm font-semibold text-dark dark:text-white">
                  Biografía
                </h5>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {user?.biografia?.trim() || "Sin biografía disponible"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              <PencilIcon className="h-4 w-4" />
              Editar Perfil
            </button>
            <SocialAccounts />
          </div>
        </div>
      </div>

      <ModalEditarPerfil
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          const usuarioStr = getCookie("usuario");
          if (usuarioStr) {
            try {
              const storedUser = JSON.parse(usuarioStr);
              setUser(storedUser);
              setData({
                name: storedUser.nombre || "",
                profilePhoto: storedUser.foto_url || "",
                coverPhoto: "/images/cover/cover-01.png",
                email: storedUser.email || "",
                phone: storedUser.telefono || "",
                idioma: storedUser.idioma_preferido || "es",
                moneda: storedUser.moneda_preferida || "MXN",
              });
            } catch {
              console.error("Error parsing user data");
            }
          }
        }}
      />
    </div>
  );
}
