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
  TrendingUp,
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
        url: "/Administradordashboard",
        icon: LayoutDashboard,
      },
      { title: "Perfil", url: "/profile", icon: UserRound },
      { title: "Usuarios", url: "/Administradorusuarios", icon: Users },
      {
        title: "Auditoría",
        url: "/Administradorauditoria",
        icon: FileBarChart,
      },
      { title: "Roles y pemisos", url: "/Administradorroles-permisos", icon: UserCog },
      {
        title: "Productores",
        url: "/Administradortienda/productores",
        icon: Users,
      },
      {
        title: "Inventario",
        icon: Boxes,
        children: [
          {
            title: "Categorías",
            url: "/Administradorcategorias",
            icon: Layers,
          },
          {
            title: "Productos",
            url: "/Administradorproductos",
            icon: Users,
          },
        ],
      },
      { title: "Pedidos", url: "/Administradorpedidos", icon: ShoppingCart },

      {
        title: "Comisiones",
        url: "/Administradorcomisiones",
        icon: BadgeDollarSign,
      },
      {
        title: "Payouts",
        url: "/Administradorpayouts",
        icon: BadgeDollarSign,
      },

      {
        title: "Solicitudes Productores",
        url: "/Administradorsolicitudes-productores",
        icon: UserRound,
      },
      {
        title: "Configuración",
        url: "/Administradorconfiguracion",
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
        title: "Pedidos",
        url: "/dashboard/productor/pedidos",
        icon: ShoppingCart,
      },
      {
        title: "Ventas",
        url: "/dashboard/productor/ventas",
        icon: BadgeDollarSign,
      },
      {
        title: "Mis Ingresos",
        url: "/dashboard/productor/ingresos",
        icon: TrendingUp,
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


export function getNavData(isProductor: boolean, isAdmin: boolean = false, tieneLotes: boolean = false) {
  if (isAdmin) return ADMIN_NAV_DATA;
  if (isProductor) {
    return [
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
            icon: Layers,
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
            title: "Pedidos",
            url: "/dashboard/productor/pedidos",
            icon: ShoppingCart,
          },
          {
            title: "Ventas",
            url: "/dashboard/productor/ventas",
            icon: BadgeDollarSign,
          },
          {
            title: "Mis Ingresos",
            url: "/dashboard/productor/ingresos",
            icon: TrendingUp,
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
  }
  return [];
}