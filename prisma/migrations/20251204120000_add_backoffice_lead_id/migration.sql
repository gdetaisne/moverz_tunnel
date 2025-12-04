-- AlterTable
ALTER TABLE "LeadTunnel" ADD COLUMN "backofficeLeadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LeadTunnel_backofficeLeadId_key" ON "LeadTunnel"("backofficeLeadId");

