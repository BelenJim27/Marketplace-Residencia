-- Baja de correos (CAN-SPAM): bandera de supresión por usuario.
-- Marketing emails se omiten cuando email_opt_out = true; los transaccionales
-- (confirmación de compra, tracking, recuperación de contraseña) NO se ven afectados.
-- Lo escribe el endpoint público POST /email/unsubscribe (header List-Unsubscribe + página /unsubscribe).
-- Idempotente (IF NOT EXISTS) para el flujo manual de Neon.

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "email_opt_out" BOOLEAN NOT NULL DEFAULT false;
