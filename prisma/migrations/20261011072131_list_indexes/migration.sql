-- CreateIndex
CREATE INDEX "MediaItem_type_createdAt_idx" ON "MediaItem"("type", "createdAt");

-- CreateIndex
CREATE INDEX "MediaItem_authorId_createdAt_idx" ON "MediaItem"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "TravelLog_authorId_createdAt_idx" ON "TravelLog"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "TravelLog_courseId_createdAt_idx" ON "TravelLog"("courseId", "createdAt");
