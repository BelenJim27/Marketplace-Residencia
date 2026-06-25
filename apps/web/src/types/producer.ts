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

export type LoteApiData = {
  capacidad_ml?: number | null;
  recolecciones?: Array<{
    especie?: { nombre_comun?: string | null; nombre_cientifico?: string | null } | null;
  }>;
  especies?: Array<{ nombre_comun?: string | null; nombre_cientifico?: string | null }>;
  impacto?: {
    total_kg_maguey?: number | null;
    porcentaje_evidencia?: number | null;
  };
};

export type LoteItem = {
  id_lote: number;
  codigo_lote: string;
  nombre_comun?: string | null;
  nombre_cientifico?: string | null;
  estado_lote?: string | null;
  unidades?: number | null;
  marca?: string | null;
  grado_alcohol?: number | string | null;
  sitio?: string | null;
  botellas_350ml?: number | null;
  botellas_750ml?: number | null;
  url_trazabilidad?: string | null;
  datos_api?: LoteApiData | null;
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
  stock_minimo?: number | null;
  status?: string | null;
  peso_kg?: string | number | null;
  alto_cm?: string | number | null;
  ancho_cm?: string | number | null;
  largo_cm?: string | number | null;
  botellas_350ml?: number | null;
  botellas_750ml?: number | null;
  id_categoria?: number | null;
  id_lote?: number | null;
  categorias_full?: Array<{
    id_categoria: number;
    nombre: string;
    requiere_edad_minima?: number | null;
  }>;
};

export type InventarioItem = {
  id_inventario: number;
  id_producto: number;
  stock: number;
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
  id_lote: string;
  stock_inicial: string;
  botellas_350ml: string;
  botellas_750ml: string;
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
    comisiones: number;
    neto: number;
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
