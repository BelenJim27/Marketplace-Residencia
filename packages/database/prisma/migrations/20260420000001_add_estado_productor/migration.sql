-- Add columns for producer status workflow
ALTER TABLE "productores"
  ADD COLUMN "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  ADD COLUMN "motivo_rechazo" TEXT,
  ADD COLUMN "revisado_por" UUID REFERENCES "usuarios"("id_usuario"),
  ADD COLUMN "revisado_en" TIMESTAMPTZ(6),
  ADD COLUMN "solicitado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update constraint for revisado_por foreign key
ALTER TABLE "productores"
  ADD CONSTRAINT "productores_revisado_por_fkey" FOREIGN KEY ("revisado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Add index for filtering pending requests
CREATE INDEX "idx_productores_estado" ON "productores"("estado") WHERE "estado" = 'pendiente';

-- Add reverse relation to usuarios (for reviewer relationship)
-- Note: This will be handled by Prisma client generation