-- AlterTable
ALTER TABLE "LeadTunnel" ADD COLUMN "density" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "destinationAddress" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "destinationCity" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "destinationPostalCode" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "details" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "distanceKm" REAL;
ALTER TABLE "LeadTunnel" ADD COLUMN "formule" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "housingType" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "movingDate" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "originAddress" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "originCity" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "originPostalCode" TEXT;
ALTER TABLE "LeadTunnel" ADD COLUMN "priceMax" INTEGER;
ALTER TABLE "LeadTunnel" ADD COLUMN "priceMin" INTEGER;
ALTER TABLE "LeadTunnel" ADD COLUMN "surfaceM2" INTEGER;
ALTER TABLE "LeadTunnel" ADD COLUMN "volumeM3" REAL;
