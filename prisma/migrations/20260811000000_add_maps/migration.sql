-- CreateTable
CREATE TABLE "maps" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionRich" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_items" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionRich" JSONB,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maps_createdAt_idx" ON "maps"("createdAt");

-- CreateIndex
CREATE INDEX "map_items_mapId_sortOrder_idx" ON "map_items"("mapId", "sortOrder");

-- AddForeignKey
ALTER TABLE "map_items" ADD CONSTRAINT "map_items_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
