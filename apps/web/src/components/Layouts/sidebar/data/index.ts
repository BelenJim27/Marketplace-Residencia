import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Dashboard", url: "/Administrador/dashboard", icon: Icons.HomeIcon },
      { title: "Profile", url: "/profile", icon: Icons.User },
      /*{ title: "Tables", url: "/tables", icon: Icons.Table },*/
      { title: "Settings", url: "/pages/settings", icon: Icons.Alphabet },
      { title: "Productos", url: "/Administrador/productos", icon: Icons.Alphabet },
      { title: "Inventario", url: "/Administrador/inventario", icon: Icons.Alphabet },
      { title: "Pedidos", url: "/Administrador/pedidos", icon: Icons.Alphabet },
      { title: "Usuarios", url: "/Administrador/usuarios", icon: Icons.User },
      { title: "Roles", url: "/Administrador/roles", icon: Icons.ShieldIcon },
      { title: "Permisos", url: "/Administrador/permisos", icon: Icons.KeyIcon },
      {title: "Usuarios-Roles", url: "/Administrador/usuarios-roles",icon: Icons.UsersIcon,},
      { title: "Tienda", url: "/Administrador/tienda", icon: Icons.HomeIcon },
      { title: "Reportes", url: "/Administrador/reportes", icon: Icons.PieChart },
      {title: "Certificaciones", url: "/Administrador/certificaciones",icon: Icons.Certificate,},
      { title: "Configuración", url: "/configuracion", icon: Icons.Settings },
    ],
  },
];
