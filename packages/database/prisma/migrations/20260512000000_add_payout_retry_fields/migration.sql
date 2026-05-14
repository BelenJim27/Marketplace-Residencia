-- ============================================================
-- Migration: add_payout_retry_fields
-- Date: 2026-05-12
-- Purpose: Add retry mechanism fields to payouts table for
--          robust handling of failed Stripe transfers
-- ============================================================

ALTER TABLE "payouts"
  ADD COLUMN "intentos"           INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "ultimo_error"       VARCHAR(500),
  ADD COLUMN "proximo_reintento"  TIMESTAMPTZ(6);

CREATE INDEX "idx_payouts_fallidos_reintento"
  ON "payouts"("estado", "intentos", "proximo_reintento")
  WHERE "estado" = 'fallido' AND "intentos" < 5;
