-- Order jadvali: hisobot/to'lov so'rovlari uchun indekslar
CREATE INDEX IF NOT EXISTS "orders_operatorId_createdAt_idx" ON "orders"("operatorId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_courierId_createdAt_idx" ON "orders"("courierId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- Payment jadvali: filtrlash uchun indekslar
CREATE INDEX IF NOT EXISTS "payments_userId_idx" ON "payments"("userId");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_period_frequency_idx" ON "payments"("period", "frequency");
