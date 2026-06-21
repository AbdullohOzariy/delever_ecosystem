-- Buyurtma ID'lari manba tizimida har oy noldan boshlanadi → oylar bo'yicha
-- to'qnashuvni oldini olish uchun mavjud ID'larni "YYYY-MM-<manbaID>" ko'rinishiga o'tkazamiz.
-- "createdAt" TIMESTAMP(3) UTC saqlanadi; Toshkent kalendar oyi bo'yicha prefikslaymiz.
-- Idempotent: ^[0-9]{4}-[0-9]{2}- bilan boshlanadigan (allaqachon prefikslangan) qatorlar tegmaydi.
UPDATE "orders"
SET "id" = to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') || '-' || "id"
WHERE "id" !~ '^[0-9]{4}-[0-9]{2}-';
