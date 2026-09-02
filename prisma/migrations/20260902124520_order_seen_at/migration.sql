-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "seenAt" TIMESTAMP(3);
-- CreateIndex
CREATE INDEX "Order_seenAt_idx" ON "public"."Order"("seenAt");
