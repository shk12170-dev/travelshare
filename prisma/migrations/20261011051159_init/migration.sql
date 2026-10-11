-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT 'from-sky-400 to-teal-500',
    "favoriteThemes" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "companions" JSONB NOT NULL DEFAULT [],
    "themes" JSONB NOT NULL DEFAULT []
);

-- CreateTable
CREATE TABLE "CourseStop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    CONSTRAINT "CourseStop_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TravelLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "companion" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tips" JSONB NOT NULL DEFAULT [],
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT,
    CONSTRAINT "TravelLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaItem" (
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
    CONSTRAINT "MediaItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStop_courseId_order_key" ON "CourseStop"("courseId", "order");

-- CreateIndex
CREATE INDEX "TravelLog_createdAt_idx" ON "TravelLog"("createdAt");

-- CreateIndex
CREATE INDEX "MediaItem_createdAt_idx" ON "MediaItem"("createdAt");
