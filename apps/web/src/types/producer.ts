export type StoreItem = {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  status?: string | null;
};

export type CategoriaItem = {
  id_categoria: number;
  nombre: string;
};

export type LoteItem = {
  id_lote: number;
  codigo_lote: string;
  nombre_comun?: string | null;
  estado_lote?: string | null;
  unidades?: number | null;
};

export type ProductItem = {
  id_producto: number;
  id_tienda: number;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  imagen_principal_url?: string | null;
  precio_base?: string | number | null;
  moneda_base?: string | null;
  stock: number;
  status?: string | null;
  peso_kg?: number | null;
  alto_cm?: number | null;
  ancho_cm?: number | null;
  largo_cm?: number | null;
  id_categoria?: number | null;
<<<<<<< HEAD
  unidad_medida?: string | null;
  botellas_350ml?: number | null;
  botellas_750ml?: number | null;
  // ─── Relación con lote ───────────────────────────────────────────────────
=======
>>>>>>> dc117a62abda8cee51fc813a356dc8bcf93575ad
  id_lote?: number | null;
};

export type ProducerDetail = {
  id_productor: number;
  tiendas?: StoreItem[];
};

export type FormState = {
  nombre: string;
  descripcion: string;
  id_tienda: string;
  precio_base: string;
  moneda_base: string;
  status: string;
  id_categoria: string;
  peso_kg: string;
  alto_cm: string;
  ancho_cm: string;
  largo_cm: string;
<<<<<<< HEAD
  unidad_medida: string;
  botellas_350ml: string;
  botellas_750ml: string;
  stock: string;
  // ─── Relación con lote ───────────────────────────────────────────────────
  id_lote?: string;
=======
  id_lote: string;
  stock_inicial: string;
>>>>>>> dc117a62abda8cee51fc813a356dc8bcf93575ad
};

export type ModalMode = "create" | "edit" | "view";

export type DashboardPeriod = "semana" | "mes" | "año";

export type VentasRow = {
  x: string;
  y: number;
};

export type VentasAnalytics = {
  periodo: string;
  resumen: {
    pedidos: number;
    productosVendidos: number;
    ingresos: number;
  };
  ventas: VentasRow[];
  productos: { x: string; y: number; monto: number }[];
  rawRows: Array<{
    fecha: string;
    producto: string;
    cantidad: number;
    monto: number;
    tienda: string;
    status: string;
  }>;
};