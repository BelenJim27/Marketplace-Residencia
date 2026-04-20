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
        url: "/dashboard/administrador",
        icon: LayoutDashboard,
      },
      { title: "Perfil", url: "/profile", icon: UserRound },
      { title: "Usuarios", url: "/Administrador/usuarioss", icon: Users },
      {
        title: "Auditoría",
        url: "/Administrador/auditoria",
        icon: FileBarChart,
      },
      { title: "Roles y pemisos", url: "/Administrador/roles-permisos", icon: UserCog },
      {
        title: "Productores",
        url: "/Administrador/tienda/productores",
        icon: Users,
      },
      { title: "Reportes", url: "/Administrador/reportes", icon: BarChart3 },
      {
        title: "Inventario",
        icon: Boxes,
        children: [
          {
            title: "Categorías",
            url: "/Administrador/categorias",
            icon: Layers,
          },
          {
            title: "Productores",
            url: "/Administrador/productos",
            icon: Users,
          },
        ],
      },
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
      {
        title: "Lotes",
        url: "/dashboard/productor/lotes",
        icon: Layers
      },
      {
        title: "Inventario",
        icon: Boxes,
        children: [
          {
            title: "Categorías",
            url: "/dashboard/productor/categorias",
            icon: Layers,
          },
          {
            title: "Productos",
            url: "/dashboard/productor/productos",
            icon: Package,
          },
        ],
      },
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

    ],
  },
];

export function getNavData(isProductor: boolean, isAdmin: boolean = false) {
  if (isAdmin) return ADMIN_NAV_DATA;
  if (isProductor) return PRODUCTOR_NAV_DATA;
  return [];
}
