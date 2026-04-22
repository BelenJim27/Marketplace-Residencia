-- Add columns for producer status workflow (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productores' AND column_name = 'estado') THEN
    ALTER TABLE "productores" ADD COLUMN "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productores' AND column_name = 'motivo_rechazo') THEN
    ALTER TABLE "productores" ADD COLUMN "motivo_rechazo" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productores' AND column_name = 'revisado_por') THEN
    ALTER TABLE "productores" ADD COLUMN "revisado_por" UUID REFERENCES "usuarios"("id_usuario");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productores' AND column_name = 'revisado_en') THEN
    ALTER TABLE "productores" ADD COLUMN "revisado_en" TIMESTAMPTZ(6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productores' AND column_name = 'solicitado_en') THEN
    ALTER TABLE "productores" ADD COLUMN "solicitado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add constraint for revisado_por foreign key (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productores_revisado_por_fkey') THEN
    ALTER TABLE "productores"
      ADD CONSTRAINT "productores_revisado_por_fkey" FOREIGN KEY ("revisado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- Add index for filtering pending requests (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_productores_estado') THEN
    CREATE INDEX "idx_productores_estado" ON "productores"("estado") WHERE "estado" = 'pendiente';
  END IF;
END $$;