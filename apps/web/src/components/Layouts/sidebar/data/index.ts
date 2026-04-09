import * as Icons from "../icons";
import { BadgeDollarSign, FileText, FolderOpen, Image, Layers, LayoutDashboard, Package, Store, UserRound } from "lucide-react";
import type { ComponentType } from "react";

type SidebarIcon = ComponentType<{ className?: string }>;

type NavItem = {
  title: string;
  url?: string;
  icon: SidebarIcon;
  children?: Array<{
    title: string;
    url: string;
    icon: SidebarIcon;
  }>;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

export const ADMIN_NAV_DATA: NavSection[] = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Dashboard", url: "/Administrador/dashboard", icon: Icons.HomeIcon },
      { title: "Profile", url: "/profile", icon: Icons.User },
      { title: "Settings", url: "/pages/settings", icon: Icons.Alphabet },
      { title: "Productos", url: "/Administrador/productos", icon: Icons.Alphabet },
      { title: "Inventario", url: "/Administrador/inventario", icon: Icons.Alphabet },
      { title: "Pedidos", url: "/Administrador/pedidos", icon: Icons.Alphabet },
      { title: "Usuarios", url: "/Administrador/usuarios", icon: Icons.User },
      { title: "Roles", url: "/Administrador/roles", icon: Icons.ShieldIcon },
      { title: "Permisos", url: "/Administrador/permisos", icon: Icons.KeyIcon },
      { title: "Usuarios-Roles", url: "/Administrador/usuarios-roles", icon: Icons.UsersIcon },
      { title: "Tienda", url: "/Administrador/tienda", icon: Icons.HomeIcon },
      { title: "Reportes", url: "/Administrador/reportes", icon: Icons.PieChart },
      { title: "Certificaciones", url: "/Administrador/certificaciones", icon: Icons.Certificate },
      { title: "Configuración", url: "/configuracion", icon: Icons.Settings },
    ],
  },
];

export const PRODUCTOR_NAV_DATA: NavSection[] = [
  {
    label: "MAESTRO MEZCALERO",
    items: [
      { title: "Dashboard", url: "/dashboard/productor", icon: LayoutDashboard },
      { title: "Tienda", url: "/dashboard/productor/tienda", icon: Store },
      { title: "Productos", url: "/dashboard/productor/productos", icon: Package },
      { title: "Lotes", url: "/dashboard/productor/lotes", icon: Layers },
      { title: "Ventas", url: "/dashboard/productor/ventas", icon: BadgeDollarSign },
      { title: "Perfil", url: "/dashboard/productor/perfil", icon: UserRound },
      {
        title: "Archivos",
        icon: FolderOpen,
        children: [
          { title: "NOM-070", url: "/dashboard/productor/archivos/nom070", icon: FileText },
          { title: "Galería", url: "/dashboard/productor/archivos/galeria", icon: Image },
        ],
      },
    ],
  },
];

export function getNavData(isProductor: boolean) {
  return isProductor ? PRODUCTOR_NAV_DATA : ADMIN_NAV_DATA;
}
