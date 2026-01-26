/*
  Warnings:

  - You are about to drop the `feedbacks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpi_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'EVENING', 'FULL', 'OFF');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'SICK');

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_giverId_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "kpi_records" DROP CONSTRAINT "kpi_records_userId_fkey";

-- DropTable
DROP TABLE "feedbacks";

-- DropTable
DROP TABLE "kpi_records";

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_kpi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "scriptScore" DOUBLE PRECISION,
    "errorScore" DOUBLE PRECISION,
    "disciplineScore" DOUBLE PRECISION,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "avgSpeedSeconds" INTEGER NOT NULL DEFAULT 0,
    "avgCheckAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_kpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_userId_date_key" ON "work_schedules"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_kpi_userId_date_key" ON "daily_kpi"("userId", "date");

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_kpi" ADD CONSTRAINT "daily_kpi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
