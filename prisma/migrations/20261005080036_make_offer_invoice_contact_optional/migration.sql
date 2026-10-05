-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_contactId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "contactId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Offer" ALTER COLUMN "contactId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
