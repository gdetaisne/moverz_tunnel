-- CreateTable
CREATE TABLE "LeadTunnel" (
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
    "linkingToken" TEXT,
    "whatsappThreadId" TEXT,
    "source" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadTunnel_linkingToken_key" ON "LeadTunnel"("linkingToken");
