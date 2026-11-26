-- Align the initial database migration with the current Prisma schema.
ALTER TABLE "Student"
    ADD COLUMN "academic_year" TEXT,
    ADD COLUMN "created_by" TEXT,
    ADD COLUMN "email" TEXT,
    ADD COLUMN "import_source" TEXT NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN "khmer_name" TEXT,
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "DataShareRequest" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataShareRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DataShareRequest"
    ADD CONSTRAINT "DataShareRequest_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataShareRequest"
    ADD CONSTRAINT "DataShareRequest_receiver_id_fkey"
    FOREIGN KEY ("receiver_id") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
