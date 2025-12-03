-- CreateTable
CREATE TABLE "LeadRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "leadId" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "roomIndex" INTEGER,
    "label" TEXT NOT NULL,
    "coverPhotoId" TEXT,
    "analysisStatus" TEXT NOT NULL DEFAULT 'NONE',
    "inventoryStatus" TEXT NOT NULL DEFAULT 'NONE',
    CONSTRAINT "LeadRoom_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadTunnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadRoomItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roomIdId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "confidence" REAL NOT NULL,
    "notes" TEXT,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "isHighValue" BOOLEAN NOT NULL DEFAULT false,
    "requiresDisassembly" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LeadRoomItem_roomIdId_fkey" FOREIGN KEY ("roomIdId") REFERENCES "LeadRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "LeadPhoto_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadTunnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadPhoto_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LeadRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LeadPhoto" ("analysisStatus", "createdAt", "id", "leadId", "mimeType", "originalFilename", "sizeBytes", "storageKey", "url") SELECT "analysisStatus", "createdAt", "id", "leadId", "mimeType", "originalFilename", "sizeBytes", "storageKey", "url" FROM "LeadPhoto";
DROP TABLE "LeadPhoto";
ALTER TABLE "new_LeadPhoto" RENAME TO "LeadPhoto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
