-- CreateTable
CREATE TABLE "LeadPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "analysisStatus" TEXT NOT NULL DEFAULT 'NONE',
    CONSTRAINT "LeadPhoto_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadTunnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeadTunnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "primaryChannel" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "formCompletionStatus" TEXT NOT NULL DEFAULT 'none',
    "photoStatus" TEXT NOT NULL DEFAULT 'none',
    "photosStatus" TEXT NOT NULL DEFAULT 'NONE',
    "linkingToken" TEXT,
    "whatsappThreadId" TEXT,
    "source" TEXT,
    "originPostalCode" TEXT,
    "originCity" TEXT,
    "originAddress" TEXT,
    "destinationPostalCode" TEXT,
    "destinationCity" TEXT,
    "destinationAddress" TEXT,
    "movingDate" TEXT,
    "details" TEXT,
    "housingType" TEXT,
    "surfaceM2" INTEGER,
    "density" TEXT,
    "formule" TEXT,
    "volumeM3" REAL,
    "distanceKm" REAL,
    "priceMin" INTEGER,
    "priceMax" INTEGER
);
INSERT INTO "new_LeadTunnel" ("createdAt", "density", "destinationAddress", "destinationCity", "destinationPostalCode", "details", "distanceKm", "email", "firstName", "formCompletionStatus", "formule", "housingType", "id", "lastName", "linkingToken", "movingDate", "originAddress", "originCity", "originPostalCode", "phone", "photoStatus", "priceMax", "priceMin", "primaryChannel", "source", "surfaceM2", "updatedAt", "volumeM3", "whatsappThreadId") SELECT "createdAt", "density", "destinationAddress", "destinationCity", "destinationPostalCode", "details", "distanceKm", "email", "firstName", "formCompletionStatus", "formule", "housingType", "id", "lastName", "linkingToken", "movingDate", "originAddress", "originCity", "originPostalCode", "phone", "photoStatus", "priceMax", "priceMin", "primaryChannel", "source", "surfaceM2", "updatedAt", "volumeM3", "whatsappThreadId" FROM "LeadTunnel";
DROP TABLE "LeadTunnel";
ALTER TABLE "new_LeadTunnel" RENAME TO "LeadTunnel";
CREATE UNIQUE INDEX "LeadTunnel_linkingToken_key" ON "LeadTunnel"("linkingToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
