"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import { useState, useEffect } from "react";
import { CameraIcon } from "@/app/profile/_components/icons";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { PencilIcon } from "lucide-react";

interface StoredUser {
  id_usuario?: string;
  email: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  foto_url?: string;
  telefono?: string;
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
    profilePhoto: "/images/user/user-03.png",
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
        profilePhoto: (authUser as unknown as StoredUser).foto_url || "/images/user/user-03.png",
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
            profilePhoto: storedUser.foto_url || "/images/user/user-03.png",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "profilePhoto") {
      const file = e.target?.files?.[0];
      setData({
        ...data,
        profilePhoto: file ? URL.createObjectURL(file) : data.profilePhoto,
      });
    } else if (e.target.name === "coverPhoto") {
      const file = e.target?.files?.[0];
      setData({
        ...data,
        coverPhoto: file ? URL.createObjectURL(file) : data.coverPhoto,
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

  return (
    <div className="mx-auto w-full max-w-[970px] px-2 sm:px-4">
      <Breadcrumb pageName="Mi Perfil" />

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
              <span>Editar</span>
            </label>
          </div>
        </div>
        <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
          <div className="relative z-30 mx-auto -mt-22 h-30 w-full max-w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:max-w-[176px] sm:p-3">
            <div className="relative drop-shadow-2">
              {data?.profilePhoto && (
                <>
                  <Image
                    src={data?.profilePhoto}
                    width={160}
                    height={160}
                    className="overflow-hidden rounded-full"
                    alt="profile"
                  />
                  <label
                    htmlFor="profilePhoto"
                    className="absolute bottom-0 right-0 flex size-8.5 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:bg-opacity-90 sm:bottom-2 sm:right-2"
                  >
                    <CameraIcon />
                    <input
                      type="file"
                      name="profilePhoto"
                      id="profilePhoto"
                      className="sr-only"
                      onChange={handleChange}
                      accept="image/png, image/jpg, image/jpeg"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="mb-1 text-heading-6 font-bold text-dark dark:text-white">
              {fullName || "Productor"}
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
                Información del Productor
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}