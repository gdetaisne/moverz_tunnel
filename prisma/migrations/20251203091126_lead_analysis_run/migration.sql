-- CreateTable
CREATE TABLE "LeadAnalysisRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "photosCount" INTEGER NOT NULL,
    "totalMs" INTEGER NOT NULL,
    "qualityScore" INTEGER,
    "qualityNotes" TEXT,
    CONSTRAINT "LeadAnalysisRun_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadTunnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeadPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "roomId" TEXT,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "analysisStatus" TEXT NOT NULL DEFAULT 'NONE',
    "roomClassificationStatus" TEXT NOT NULL DEFAULT 'NONE',
    "roomGuessPrimary" TEXT,
    "roomGuessConfidence" REAL,
    "roomGuessAlternatives" JSONB,
    CONSTRAINT "LeadPhoto_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadTunnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadPhoto_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LeadRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LeadPhoto" ("analysisStatus", "createdAt", "id", "leadId", "mimeType", "originalFilename", "roomId", "sizeBytes", "storageKey", "url") SELECT "analysisStatus", "createdAt", "id", "leadId", "mimeType", "originalFilename", "roomId", "sizeBytes", "storageKey", "url" FROM "LeadPhoto";
DROP TABLE "LeadPhoto";
ALTER TABLE "new_LeadPhoto" RENAME TO "LeadPhoto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
