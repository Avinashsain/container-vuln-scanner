-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "lastAutoScanAt" TIMESTAMP(3),
ADD COLUMN     "scanIntervalMinutes" INTEGER;
