import * as Icons from "../icons";
import {
  Award,
  BarChart3,
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  FileBarChart,
  FileCheck,
  FileText,
  FolderOpen,
  Key,
  Layers,
  LayoutDashboard,
  Lock,
  Package,
  Settings,
  ShoppingCart,
  Store,
  UserCog,
  UserRound,
  Users,
  Shield,
  ShieldCheck,
} from "lucide-react";
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
    label: "ADMINISTRADOR",
    items: [
      {
        title: "Dashboard",
        url: "/Administrador/dashboard",
        icon: LayoutDashboard,
      },
      { title: "Perfil", url: "/profile", icon: UserRound },
      { title: "Usuarios", url: "/Administrador/usuarioss", icon: Users },
      {
        title: "Auditoría",
        url: "/Administrador/auditoria",
        icon: FileBarChart,
      },
      { title: "Roles", url: "/Administrador/roles", icon: Shield },
      { title: "Permisos", url: "/Administrador/permisos", icon: Key },
      {
        title: "Usuarios-Roles",
        url: "/Administrador/usuarios-roles",
        icon: UserCog,
      },
      {
        title: "Productores",
        url: "/Administrador/tienda/productores",
        icon: Users,
      },
      { title: "Reportes", url: "/Administrador/reportes", icon: BarChart3 },
      { title: "Inventario", url: "/Administrador/inventario", icon: Boxes },
      { title: "Pedidos", url: "/Administrador/pedidos", icon: ShoppingCart },
      {
        title: "Certificaciones",
        url: "/Administrador/validar-certificaciones",
        icon: Award,
      },
      {
        title: "Validar Certificaciones",
        url: "/Administrador/validar-certificaciones",
        icon: ShieldCheck,
      },
      {
        title: "Configuración",
        url: "/Administrador/configuracion",
        icon: Settings,
      },
    ],
  },
];

export const PRODUCTOR_NAV_DATA: NavSection[] = [
  {
    label: "PRODUCTOR",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/productor",
        icon: LayoutDashboard,
      },
      { title: "Tienda", url: "/dashboard/productor/tienda", icon: Store },
      {
        title: "Productos",
        url: "/dashboard/productor/productos",
        icon: Package,
      },
      { title: "Lotes", url: "/dashboard/productor/lotes", icon: Layers },
      {
        title: "Ventas",
        url: "/dashboard/productor/ventas",
        icon: BadgeDollarSign,
      },
      {
        title: "Archivos",
        icon: FolderOpen,
        children: [
          {
            title: "NOM-070",
            url: "/dashboard/productor/archivos/nom070",
            icon: FileText,
          },
        ],
      },
      { title: "Perfil", url: "/profile", icon: UserRound },
    ],
  },
];

export function getNavData(isProductor: boolean, isAdmin: boolean = false) {
  if (isAdmin) return ADMIN_NAV_DATA;
  if (isProductor) return PRODUCTOR_NAV_DATA;
  return [];
}
