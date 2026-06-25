-- Cleanup: eliminar campos vacíos, columnas no usadas y modelo idiomas

-- 1. Drop FK constraints que referencian columnas o tablas a eliminar
ALTER TABLE "paises"              DROP CONSTRAINT IF EXISTS "paises_idioma_default_fkey";
ALTER TABLE "envio_cotizaciones"  DROP CONSTRAINT IF EXISTS "envio_cotizaciones_id_servicio_fkey";
ALTER TABLE "envio_cotizaciones"  DROP CONSTRAINT IF EXISTS "envio_cotizaciones_id_transportista_fkey";
ALTER TABLE "envio_cotizaciones"  DROP CONSTRAINT IF EXISTS "envio_cotizaciones_id_usuario_fkey";
ALTER TABLE "envio_guias"         DROP CONSTRAINT IF EXISTS "envio_guias_id_cotizacion_fkey";
ALTER TABLE "envios"              DROP CONSTRAINT IF EXISTS "envios_id_servicio_fkey";

-- 2. Drop indexes sobre columnas eliminadas
DROP INDEX IF EXISTS "idx_direcciones_ubicacion";
DROP INDEX IF EXISTS "idx_envio_cotizaciones_usuario";

-- 3. Drop tabla idiomas completa
DROP TABLE IF EXISTS "idiomas" CASCADE;

-- 4. Drop columnas de cada tabla
ALTER TABLE "categorias"            DROP COLUMN IF EXISTS "imagen_url";
ALTER TABLE "direcciones"           DROP COLUMN IF EXISTS "ubicacion",
                                    DROP COLUMN IF EXISTS "nombre_etiqueta";
ALTER TABLE "envio_cotizaciones"    DROP COLUMN IF EXISTS "id_usuario",
                                    DROP COLUMN IF EXISTS "id_transportista",
                                    DROP COLUMN IF EXISTS "id_servicio";
ALTER TABLE "envio_guias"           DROP COLUMN IF EXISTS "id_cotizacion",
                                    DROP COLUMN IF EXISTS "url_etiqueta",
                                    DROP COLUMN IF EXISTS "payload_request";
ALTER TABLE "envios"                DROP COLUMN IF EXISTS "id_servicio",
                                    DROP COLUMN IF EXISTS "proteccion_id",
                                    DROP COLUMN IF EXISTS "fecha_entrega_estimada",
                                    DROP COLUMN IF EXISTS "fecha_entrega";
ALTER TABLE "lista_deseos_item"     DROP COLUMN IF EXISTS "precio_snapshot",
                                    DROP COLUMN IF EXISTS "nota";
ALTER TABLE "producto_imagenes"     DROP COLUMN IF EXISTS "alt_text";
ALTER TABLE "refresh_tokens"        DROP COLUMN IF EXISTS "dispositivo",
                                    DROP COLUMN IF EXISTS "user_agent",
                                    DROP COLUMN IF EXISTS "ip_origen";
ALTER TABLE "payment_fees"          DROP COLUMN IF EXISTS "porcentaje",
                                    DROP COLUMN IF EXISTS "monto_fijo";
