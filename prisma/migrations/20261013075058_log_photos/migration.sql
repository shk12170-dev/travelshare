-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MediaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "cover" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "duration" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "logId" TEXT,
    CONSTRAINT "MediaItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaItem_logId_fkey" FOREIGN KEY ("logId") REFERENCES "TravelLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MediaItem" ("authorId", "caption", "cover", "createdAt", "duration", "fileName", "id", "likes", "mimeType", "region", "size", "type") SELECT "authorId", "caption", "cover", "createdAt", "duration", "fileName", "id", "likes", "mimeType", "region", "size", "type" FROM "MediaItem";
DROP TABLE "MediaItem";
ALTER TABLE "new_MediaItem" RENAME TO "MediaItem";
CREATE INDEX "MediaItem_createdAt_idx" ON "MediaItem"("createdAt");
CREATE INDEX "MediaItem_type_createdAt_idx" ON "MediaItem"("type", "createdAt");
CREATE INDEX "MediaItem_authorId_createdAt_idx" ON "MediaItem"("authorId", "createdAt");
CREATE INDEX "MediaItem_logId_idx" ON "MediaItem"("logId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
