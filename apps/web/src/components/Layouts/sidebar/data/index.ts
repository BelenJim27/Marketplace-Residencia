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
  Home,
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
  Tag,
  RotateCcw,
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

const VISTA_CLIENTE_SECTION: NavSection = {
  label: "VISTA CLIENTE",
  items: [
    {
      title: "Ver Tienda",
      url: "/cliente/producto",
      icon: Home,
    },
  ],
};

export const ADMIN_NAV_DATA: NavSection[] = [
  {
    label: "ADMINISTRADOR",
    items: [
      {
        title: "Dashboard",
        url: "/administrador/dashboard",
        icon: LayoutDashboard,
      },
      { title: "Usuarios", url: "/administrador/usuarios", icon: Users },
      {
        title: "Auditoría",
        url: "/administrador/auditoria",
        icon: FileBarChart,
      },
      { title: "Roles y pemisos", url: "/administrador/roles-permisos", icon: UserCog },
      {
        title: "Productores",
        url: "/administrador/tienda/productores",
        icon: Users,
      },
      {
        title: "Inventario",
        icon: Boxes,
        children: [
          {
            title: "Categorías",
            url: "/administrador/categorias",
            icon: Layers,
          },
          {
            title: "Productos",
            url: "/administrador/productos",
            icon: Users,
          },
        ],
      },
      { title: "Pedidos", url: "/administrador/pedidos", icon: ShoppingCart },

      {
        title: "Comisiones",
        url: "/administrador/comisiones",
        icon: BadgeDollarSign,
      },
      {
        title: "Payouts",
        url: "/administrador/payouts",
        icon: BadgeDollarSign,
      },
      {
        title: "Reembolsos",
        url: "/administrador/reembolsos",
        icon: RotateCcw,
      },

      {
        title: "Solicitudes Productores",
        url: "/administrador/solicitudes-productores",
        icon: UserRound,
      },
      {
        title: "Asociaciones",
        url: "/administrador/asociaciones",
        icon: Tag,
      },
      {
        title: "Configuración",
        url: "/administrador/configuracion",
        icon: Settings,
      },
    ],
  },
  VISTA_CLIENTE_SECTION,
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
        title: "Tienda",
        url: "/dashboard/productor/tienda",
        icon: Store,
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
  VISTA_CLIENTE_SECTION,
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
            title: "Tienda",
            url: "/dashboard/productor/tienda",
            icon: Store,
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
      VISTA_CLIENTE_SECTION,
    ];
  }
  return [];
}