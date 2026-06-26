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
  Tag,
  RotateCcw,
} from "lucide-react";
import type { ComponentType } from "react";
import { filterNavigationByPermissions } from "@/lib/permisos-catalog";

type SidebarIcon = ComponentType<{ className?: string }>;

type NavItem = {
  title: string;
  url?: string;
  icon: SidebarIcon;
  requiredPermission?: string;
  requiredPermissions?: string[];
  children?: Array<{
    title: string;
    url: string;
    icon: SidebarIcon;
    requiredPermission?: string;
    requiredPermissions?: string[];
  }>;
};

type NavSection = {
  label: string;
  requiredPermission?: string;
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
        requiredPermission: "ver_reportes",
      },
      {
        title: "Usuarios",
        url: "/Administrador/usuarios",
        icon: Users,
        requiredPermission: "gestionar_usuarios",
      },
      {
        title: "Auditoría",
        url: "/Administrador/auditoria",
        icon: FileBarChart,
        requiredPermission: "ver_auditoria",
      },
      {
        title: "Roles y permisos",
        url: "/Administrador/roles-permisos",
        icon: UserCog,
        requiredPermission: "gestionar_roles_permisos",
      },
      {
        title: "Productores",
        url: "/Administrador/tienda/productores",
        icon: Users,
        requiredPermission: "gestionar_productores",
      },
      {
        title: "Inventario",
        icon: Boxes,
        children: [
          {
            title: "Categorías",
            url: "/Administrador/categorias",
            icon: Layers,
            requiredPermission: "gestionar_categorias",
          },
          {
            title: "Productos",
            url: "/Administrador/productos",
            icon: Users,
            requiredPermission: "gestionar_productos",
          },
        ],
      },
      {
        title: "Pedidos",
        url: "/Administrador/pedidos",
        icon: ShoppingCart,
        requiredPermission: "gestionar_pedidos",
      },
      {
        title: "Comisiones",
        url: "/Administrador/comisiones",
        icon: BadgeDollarSign,
        requiredPermission: "gestionar_comisiones",
      },
      {
        title: "Payouts",
        url: "/Administrador/payouts",
        icon: BadgeDollarSign,
        requiredPermission: "gestionar_payouts",
      },
      {
        title: "Reembolsos",
        url: "/Administrador/reembolsos",
        icon: RotateCcw,
        requiredPermission: "gestionar_reembolsos",
      },
      {
        title: "Solicitudes Productores",
        url: "/Administrador/solicitudes-productores",
        icon: UserRound,
        requiredPermission: "gestionar_productores",
      },
      {
        title: "Asociaciones",
        url: "/Administrador/asociaciones",
        icon: Tag,
        requiredPermission: "gestionar_productores",
      },
      {
        title: "Configuración",
        url: "/Administrador/configuracion",
        icon: Settings,
        requiredPermission: "gestionar_configuracion",
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
        requiredPermission: "ver_reportes_productor",
      },
      {
        title: "Lotes",
        url: "/dashboard/productor/lotes",
        icon: Layers,
        requiredPermissions: ["ver_inventario", "crear_inventario", "editar_inventario"],
      },
      {
        title: "Inventario",
        icon: Boxes,
        children: [
          {
            title: "Categorías",
            url: "/dashboard/productor/categorias",
            icon: Layers,
            requiredPermissions: ["ver_inventario", "crear_inventario", "editar_inventario"],
          },
          {
            title: "Productos",
            url: "/dashboard/productor/productos",
            icon: Package,
            requiredPermissions: ["ver_productos", "crear_producto", "editar_producto", "eliminar_producto"],
          },
        ],
      },
      {
        title: "Pedidos",
        url: "/dashboard/productor/pedidos",
        icon: ShoppingCart,
        requiredPermissions: ["ver_pedidos", "editar_pedido"],
      },
      {
        title: "Ventas",
        url: "/dashboard/productor/ventas",
        icon: BadgeDollarSign,
        requiredPermission: "ver_reportes_productor",
      },
      {
        title: "Mis Ingresos",
        url: "/dashboard/productor/ingresos",
        icon: TrendingUp,
        requiredPermission: "ver_reportes_productor",
      },
      {
        title: "Tienda",
        url: "/dashboard/productor/tienda",
        icon: Store,
        requiredPermissions: ["ver_tienda", "crear_tienda", "editar_tienda", "editar_perfil_productor"],
      },
      {
        title: "Archivos",
        icon: FolderOpen,
        requiredPermission: "gestionar_archivos",
        children: [
          {
            title: "NOM-070",
            url: "/dashboard/productor/archivos/nom070",
            icon: FileText,
            requiredPermission: "gestionar_archivos",
          },
        ],
      },
    ],
  },
];

export function filterNavByPermissions(
  sections: NavSection[],
  permisos: string[],
): NavSection[] {
  return filterNavigationByPermissions(sections, permisos) as NavSection[];
}

export function getNavData(
  isProductor: boolean,
  isAdmin: boolean = false,
  permisos: string[] = [],
) {
  if (isAdmin) return filterNavByPermissions(ADMIN_NAV_DATA, permisos);
  if (isProductor) return filterNavByPermissions(PRODUCTOR_NAV_DATA, permisos);
  return [];
}
