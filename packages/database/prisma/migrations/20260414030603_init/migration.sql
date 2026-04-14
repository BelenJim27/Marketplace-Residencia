-- CreateTable
CREATE TABLE "archivos" (
    "id_archivo" BIGSERIAL NOT NULL,
    "entidad_tipo" VARCHAR(30) NOT NULL,
    "entidad_id" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" VARCHAR(50),
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "validado_por" UUID,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id_archivo")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id_auditoria" BIGSERIAL NOT NULL,
    "id_usuario" UUID,
    "accion" VARCHAR(50) NOT NULL,
    "tabla_afectada" VARCHAR(100) NOT NULL,
    "registro_id" TEXT,
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "ip_origen" VARCHAR(45),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "carrito_item" (
    "id_item" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario_snapshot" DECIMAL(12,2) NOT NULL,
    "moneda_snapshot" CHAR(3) NOT NULL DEFAULT 'MXN',
    "fecha_agregado" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrito_item_pkey" PRIMARY KEY ("id_item")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id_categoria" SERIAL NOT NULL,
    "id_padre" INTEGER,
    "nombre" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "tipo" VARCHAR(50) NOT NULL DEFAULT 'general',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "imagen_url" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "id_config" SERIAL NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "valor" TEXT,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'texto',
    "descripcion" VARCHAR(255),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id_config")
);

-- CreateTable
CREATE TABLE "detalle_pedido" (
    "id_detalle" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_compra" DECIMAL(12,2) NOT NULL,
    "moneda_compra" CHAR(3) NOT NULL DEFAULT 'MXN',
    "impuesto" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "detalle_pedido_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "direcciones" (
    "id_direccion" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "ubicacion" JSONB NOT NULL DEFAULT '{}',
    "linea_1" VARCHAR(200),
    "linea_2" VARCHAR(200),
    "referencia" TEXT,
    "tipo" VARCHAR(20),
    "es_internacional" BOOLEAN NOT NULL DEFAULT false,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id_direccion")
);

-- CreateTable
CREATE TABLE "envio_cotizaciones" (
    "id_cotizacion" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT,
    "id_usuario" UUID,
    "id_transportista" INTEGER,
    "id_servicio" INTEGER,
    "payload_request" JSONB NOT NULL,
    "payload_response" JSONB,
    "moneda" CHAR(3),
    "precio_total" DECIMAL(14,2),
    "tiempo_entrega_estimado" VARCHAR(100),
    "valida_hasta" TIMESTAMPTZ(6),
    "fecha_solicitud" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envio_cotizaciones_pkey" PRIMARY KEY ("id_cotizacion")
);

-- CreateTable
CREATE TABLE "envio_eventos" (
    "id_evento" BIGSERIAL NOT NULL,
    "id_guia" BIGINT,
    "id_transportista" INTEGER,
    "numero_guia" VARCHAR(200),
    "origen" VARCHAR(20) NOT NULL,
    "estado_paqueteria" VARCHAR(100),
    "estado_normalizado" VARCHAR(30),
    "descripcion" TEXT,
    "ubicacion" VARCHAR(200),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_evento" TIMESTAMPTZ(6),
    "fecha_registro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envio_eventos_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "envio_guias" (
    "id_guia" BIGSERIAL NOT NULL,
    "id_envio" BIGINT NOT NULL,
    "id_cotizacion" BIGINT,
    "id_transportista" INTEGER,
    "numero_guia" VARCHAR(200) NOT NULL,
    "url_etiqueta" VARCHAR(500),
    "formato_etiqueta" VARCHAR(20),
    "payload_request" JSONB,
    "payload_response" JSONB,
    "estado_paqueteria" VARCHAR(100),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "envio_guias_pkey" PRIMARY KEY ("id_guia")
);

-- CreateTable
CREATE TABLE "envios" (
    "id_envio" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "id_transportista" INTEGER,
    "id_servicio" INTEGER,
    "numero_rastreo" VARCHAR(200),
    "valor_declarado_aduana" DECIMAL(14,2),
    "moneda_aduana" CHAR(3) NOT NULL DEFAULT 'MXN',
    "codigo_hs" VARCHAR(20),
    "peso_kg" DECIMAL(8,3),
    "alto_cm" DECIMAL(8,2),
    "ancho_cm" DECIMAL(8,2),
    "largo_cm" DECIMAL(8,2),
    "costo_envio" DECIMAL(14,2),
    "moneda_costo" CHAR(3) NOT NULL DEFAULT 'MXN',
    "estado" VARCHAR(30) NOT NULL DEFAULT 'preparando',
    "fecha_envio" TIMESTAMPTZ(6),
    "fecha_entrega_estimada" TIMESTAMPTZ(6),
    "fecha_entrega" TIMESTAMPTZ(6),

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id_envio")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id_factura" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT,
    "uuid_fiscal" VARCHAR(150),
    "pdf_url" TEXT,
    "xml_url" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rfc_emisor" VARCHAR(13),
    "rfc_receptor" VARCHAR(13),
    "uso_cfdi" VARCHAR(10),
    "regimen_fiscal" VARCHAR(10),
    "subtotal" DECIMAL(14,2),
    "impuestos_total" DECIMAL(14,2),
    "total" DECIMAL(14,2),
    "moneda" CHAR(3),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id_factura")
);

-- CreateTable
CREATE TABLE "integraciones_envio" (
    "id_integracion" SERIAL NOT NULL,
    "id_transportista" INTEGER NOT NULL,
    "entorno" VARCHAR(20) NOT NULL DEFAULT 'produccion',
    "api_url" VARCHAR(500),
    "api_key" BYTEA,
    "api_secret" BYTEA,
    "credenciales_extra" JSONB NOT NULL DEFAULT '{}',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integraciones_envio_pkey" PRIMARY KEY ("id_integracion")
);

-- CreateTable
CREATE TABLE "inventario" (
    "id_inventario" BIGSERIAL NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("id_inventario")
);

-- CreateTable
CREATE TABLE "lote_atributos" (
    "id_atributo" BIGSERIAL NOT NULL,
    "id_lote" INTEGER NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "valor" TEXT,
    "unidad" VARCHAR(50),
    "fuente" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "fecha_obtencion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lote_atributos_pkey" PRIMARY KEY ("id_atributo")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id_lote" SERIAL NOT NULL,
    "id_productor" INTEGER NOT NULL,
    "id_region" INTEGER,
    "codigo_lote" VARCHAR(100) NOT NULL,
    "sitio" VARCHAR(200),
    "fecha_produccion" DATE,
    "volumen_total" INTEGER,
    "estado_lote" VARCHAR(30) NOT NULL DEFAULT 'disponible',
    "datos_api" JSONB NOT NULL DEFAULT '{}',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id_lote")
);

-- CreateTable
CREATE TABLE "lista_deseos_item" (
    "id_item" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "precio_snapshot" DECIMAL(12,2),
    "moneda_snapshot" CHAR(3) DEFAULT 'MXN',
    "nota" TEXT,
    "fecha_agregado" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lista_deseos_item_pkey" PRIMARY KEY ("id_item")
);

-- CreateTable
CREATE TABLE "monedas" (
    "codigo" CHAR(3) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "simbolo" VARCHAR(10),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "monedas_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id_movimiento" BIGSERIAL NOT NULL,
    "id_inventario" BIGINT NOT NULL,
    "id_usuario" UUID,
    "tipo" VARCHAR(30) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_resultante" INTEGER NOT NULL,
    "motivo" TEXT,
    "id_pedido" BIGINT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id_notificacion" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "cuerpo" TEXT,
    "url_accion" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "leido_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "oauth_cuentas" (
    "id_cuenta" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "provider_uid" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "foto_url" VARCHAR(500),
    "acceso_token" TEXT,
    "refresco_token" TEXT,
    "expira_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_cuentas_pkey" PRIMARY KEY ("id_cuenta")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id_pago" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "proveedor" VARCHAR(50),
    "payment_intent_id" VARCHAR(150),
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id_token" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '00:30:00'::interval),
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "ip_solicitud" VARCHAR(45),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id_token")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id_pedido" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    "total" DECIMAL(14,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "tipo_cambio" DECIMAL(10,4),
    "moneda_referencia" CHAR(3) NOT NULL DEFAULT 'USD',
    "pais_destino_iso2" CHAR(2),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),
    "direccion_envio_snapshot" JSONB,
    "direccion_facturacion_snapshot" JSONB,
    "devolucion_estado" VARCHAR(20),
    "devolucion_motivo" TEXT,
    "devolucion_solicitada_en" TIMESTAMPTZ(6),
    "devolucion_resuelta_en" TIMESTAMPTZ(6),

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id_pedido")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id_permiso" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "producto_imagenes" (
    "id_imagen" BIGSERIAL NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" VARCHAR(255),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_imagenes_pkey" PRIMARY KEY ("id_imagen")
);

-- CreateTable
CREATE TABLE "productores" (
    "id_productor" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_region" INTEGER,
    "descripcion" TEXT,
    "biografia" TEXT,
    "otras_caracteristicas" VARCHAR(255),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "productores_pkey" PRIMARY KEY ("id_productor")
);

-- CreateTable
CREATE TABLE "productos" (
    "id_producto" BIGSERIAL NOT NULL,
    "id_tienda" INTEGER NOT NULL,
    "id_lote" INTEGER,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "traducciones" JSONB NOT NULL DEFAULT '{}',
    "precio_base" DECIMAL(12,2) NOT NULL,
    "moneda_base" CHAR(3) NOT NULL DEFAULT 'MXN',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "peso_kg" DECIMAL(8,3),
    "alto_cm" DECIMAL(8,2),
    "ancho_cm" DECIMAL(8,2),
    "largo_cm" DECIMAL(8,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'activo',
    "creado_por" UUID,
    "actualizado_por" UUID,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),
    "imagen_principal_url" VARCHAR(500),

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id_token" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "dispositivo" VARCHAR(200),
    "user_agent" TEXT,
    "ip_origen" VARCHAR(45),
    "expira_en" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '30 days'::interval),
    "revocado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id_token")
);

-- CreateTable
CREATE TABLE "regiones" (
    "id_region" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "estado_prov" VARCHAR(100),
    "pais_iso2" CHAR(2) NOT NULL DEFAULT 'MX',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regiones_pkey" PRIMARY KEY ("id_region")
);

-- CreateTable
CREATE TABLE "resenas" (
    "id_resena" BIGSERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "calificacion" SMALLINT NOT NULL,
    "comentario" TEXT,
    "idioma_comentario" VARCHAR(10),
    "compra_verificada" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),
    "respuesta_vendedor" TEXT,
    "fecha_respuesta" TIMESTAMPTZ(6),

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id_resena")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateTable
CREATE TABLE "roles" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activo',
    "fecha_creacion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "servicios_envio" (
    "id_servicio" SERIAL NOT NULL,
    "id_transportista" INTEGER NOT NULL,
    "codigo_servicio" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tiempo_estimado" VARCHAR(100),
    "es_internacional" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_envio_pkey" PRIMARY KEY ("id_servicio")
);

-- CreateTable
CREATE TABLE "tasas_impuesto" (
    "id_tasa" SERIAL NOT NULL,
    "pais_iso2" CHAR(2) NOT NULL,
    "id_categoria" INTEGER,
    "tipo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tasa_porcentaje" DECIMAL(6,4),
    "monto_fijo" DECIMAL(12,4),
    "moneda_monto_fijo" CHAR(3),
    "vigente_desde" DATE NOT NULL DEFAULT CURRENT_DATE,
    "vigente_hasta" DATE,
    "incluido_en_precio" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasas_impuesto_pkey" PRIMARY KEY ("id_tasa")
);

-- CreateTable
CREATE TABLE "tiendas" (
    "id_tienda" SERIAL NOT NULL,
    "id_productor" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "pais_operacion" CHAR(2) NOT NULL DEFAULT 'MX',
    "status" VARCHAR(20) NOT NULL DEFAULT 'activa',
    "fecha_creacion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "tiendas_pkey" PRIMARY KEY ("id_tienda")
);

-- CreateTable
CREATE TABLE "transportistas" (
    "id_transportista" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "paises_operacion" CHAR(2)[],
    "api_base_url" VARCHAR(500),
    "notas_integracion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transportistas_pkey" PRIMARY KEY ("id_transportista")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario" UUID NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "fecha_asignacion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activo',

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario","id_rol")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(100) NOT NULL,
    "foto_url" VARCHAR(500),
    "apellido_paterno" VARCHAR(100),
    "apellido_materno" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(30),
    "password_hash" VARCHAR(255),
    "idioma_preferido" VARCHAR(10) NOT NULL DEFAULT 'es',
    "moneda_preferida" CHAR(3) NOT NULL DEFAULT 'MXN',
    "version_token" INTEGER NOT NULL DEFAULT 1,
    "fecha_registro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMPTZ(6),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE INDEX "idx_archivos_entidad" ON "archivos"("entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "idx_auditoria_fecha" ON "auditoria"("fecha");

-- CreateIndex
CREATE INDEX "idx_auditoria_usuario" ON "auditoria"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_carrito_producto" ON "carrito_item"("id_producto");

-- CreateIndex
CREATE INDEX "idx_carrito_usuario" ON "carrito_item"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "carrito_item_id_usuario_id_producto_key" ON "carrito_item"("id_usuario", "id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "idx_cat_padre" ON "categorias"("id_padre");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_sistema_clave_key" ON "configuracion_sistema"("clave");

-- CreateIndex
CREATE INDEX "idx_direcciones_ubicacion" ON "direcciones" USING GIN ("ubicacion");

-- CreateIndex
CREATE INDEX "idx_envio_eventos_guia" ON "envio_eventos"("id_guia");

-- CreateIndex
CREATE UNIQUE INDEX "envio_guias_numero_guia_key" ON "envio_guias"("numero_guia");

-- CreateIndex
CREATE INDEX "idx_envios_estado" ON "envios"("estado");

-- CreateIndex
CREATE INDEX "idx_envios_pedido" ON "envios"("id_pedido");

-- CreateIndex
CREATE UNIQUE INDEX "integraciones_envio_id_transportista_entorno_key" ON "integraciones_envio"("id_transportista", "entorno");

-- CreateIndex
CREATE INDEX "idx_inventario_producto" ON "inventario"("id_producto");

-- CreateIndex
CREATE INDEX "idx_lote_atributos_lote" ON "lote_atributos"("id_lote");

-- CreateIndex
CREATE UNIQUE INDEX "lote_atributos_id_lote_clave_key" ON "lote_atributos"("id_lote", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_codigo_lote_key" ON "lotes"("codigo_lote");

-- CreateIndex
CREATE INDEX "idx_lista_deseos_usuario" ON "lista_deseos_item"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_lista_deseos_producto" ON "lista_deseos_item"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "lista_deseos_item_id_usuario_id_producto_key" ON "lista_deseos_item"("id_usuario", "id_producto");

-- CreateIndex
CREATE INDEX "idx_movimientos_creado_en" ON "movimientos_inventario"("creado_en");

-- CreateIndex
CREATE INDEX "idx_movimientos_inventario" ON "movimientos_inventario"("id_inventario");

-- CreateIndex
CREATE INDEX "idx_movimientos_pedido" ON "movimientos_inventario"("id_pedido");

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario_leido" ON "notificaciones"("id_usuario", "leido");

-- CreateIndex
CREATE INDEX "idx_oauth_cuentas_usuario" ON "oauth_cuentas"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_cuentas_provider_uid_key" ON "oauth_cuentas"("provider", "provider_uid");

-- CreateIndex
CREATE INDEX "idx_pagos_estado" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "idx_pagos_pedido" ON "pagos"("id_pedido");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_prt_usuario" ON "password_reset_tokens"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_pedidos_estado" ON "pedidos"("estado");

-- CreateIndex
CREATE INDEX "idx_pedidos_usuario" ON "pedidos"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_nombre_key" ON "permisos"("nombre");

-- CreateIndex
CREATE INDEX "idx_producto_imagenes_producto" ON "producto_imagenes"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "productores_id_usuario_key" ON "productores"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_productos_metadata" ON "productos" USING GIN ("metadata");

-- CreateIndex
CREATE INDEX "idx_productos_status" ON "productos"("status");

-- CreateIndex
CREATE INDEX "idx_productos_tienda" ON "productos"("id_tienda");

-- CreateIndex
CREATE INDEX "idx_productos_traducciones" ON "productos" USING GIN ("traducciones");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_resenas_producto" ON "resenas"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "resenas_id_usuario_id_producto_key" ON "resenas"("id_usuario", "id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_envio_id_transportista_codigo_servicio_key" ON "servicios_envio"("id_transportista", "codigo_servicio");

-- CreateIndex
CREATE INDEX "idx_tasas_categoria" ON "tasas_impuesto"("id_categoria");

-- CreateIndex
CREATE INDEX "idx_tiendas_productor" ON "tiendas"("id_productor");

-- CreateIndex
CREATE UNIQUE INDEX "transportistas_codigo_key" ON "transportistas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carrito_item" ADD CONSTRAINT "carrito_item_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carrito_item" ADD CONSTRAINT "carrito_item_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_id_padre_fkey" FOREIGN KEY ("id_padre") REFERENCES "categorias"("id_categoria") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_pedido" ADD CONSTRAINT "detalle_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_pedido" ADD CONSTRAINT "detalle_pedido_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_cotizaciones" ADD CONSTRAINT "envio_cotizaciones_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_cotizaciones" ADD CONSTRAINT "envio_cotizaciones_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios_envio"("id_servicio") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_cotizaciones" ADD CONSTRAINT "envio_cotizaciones_id_transportista_fkey" FOREIGN KEY ("id_transportista") REFERENCES "transportistas"("id_transportista") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_cotizaciones" ADD CONSTRAINT "envio_cotizaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_eventos" ADD CONSTRAINT "envio_eventos_id_guia_fkey" FOREIGN KEY ("id_guia") REFERENCES "envio_guias"("id_guia") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_eventos" ADD CONSTRAINT "envio_eventos_id_transportista_fkey" FOREIGN KEY ("id_transportista") REFERENCES "transportistas"("id_transportista") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_guias" ADD CONSTRAINT "envio_guias_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "envio_cotizaciones"("id_cotizacion") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_guias" ADD CONSTRAINT "envio_guias_id_envio_fkey" FOREIGN KEY ("id_envio") REFERENCES "envios"("id_envio") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envio_guias" ADD CONSTRAINT "envio_guias_id_transportista_fkey" FOREIGN KEY ("id_transportista") REFERENCES "transportistas"("id_transportista") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios_envio"("id_servicio") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_id_transportista_fkey" FOREIGN KEY ("id_transportista") REFERENCES "transportistas"("id_transportista") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "integraciones_envio" ADD CONSTRAINT "integraciones_envio_id_transportista_fkey" FOREIGN KEY ("id_transportista") REFERENCES "transportistas"("id_transportista") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lote_atributos" ADD CONSTRAINT "lote_atributos_id_lote_fkey" FOREIGN KEY ("id_lote") REFERENCES "lotes"("id_lote") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_id_productor_fkey" FOREIGN KEY ("id_productor") REFERENCES "productores"("id_productor") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_id_region_fkey" FOREIGN KEY ("id_region") REFERENCES "regiones"("id_region") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lista_deseos_item" ADD CONSTRAINT "lista_deseos_item_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_deseos_item" ADD CONSTRAINT "lista_deseos_item_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_pedido" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_id_inventario_fkey" FOREIGN KEY ("id_inventario") REFERENCES "inventario"("id_inventario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauth_cuentas" ADD CONSTRAINT "oauth_cuentas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_moneda_fkey" FOREIGN KEY ("moneda") REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_moneda_fkey" FOREIGN KEY ("moneda") REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "producto_imagenes" ADD CONSTRAINT "producto_imagenes_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productores" ADD CONSTRAINT "productores_id_region_fkey" FOREIGN KEY ("id_region") REFERENCES "regiones"("id_region") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productores" ADD CONSTRAINT "productores_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_lote_fkey" FOREIGN KEY ("id_lote") REFERENCES "lotes"("id_lote") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_tienda_fkey" FOREIGN KEY ("id_tienda") REFERENCES "tiendas"("id_tienda") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_moneda_base_fkey" FOREIGN KEY ("moneda_base") REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "permisos"("id_permiso") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "servicios_envio" ADD CONSTRAINT "servicios_envio_id_transportista_fkey" FOREIGN KEY ("id_transportista") REFERENCES "transportistas"("id_transportista") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasas_impuesto" ADD CONSTRAINT "tasas_impuesto_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasas_impuesto" ADD CONSTRAINT "tasas_impuesto_moneda_monto_fijo_fkey" FOREIGN KEY ("moneda_monto_fijo") REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tiendas" ADD CONSTRAINT "tiendas_id_productor_fkey" FOREIGN KEY ("id_productor") REFERENCES "productores"("id_productor") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;
