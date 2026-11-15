import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating DataShareRequest table in PostgreSQL database...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DataShareRequest" (
      "id" TEXT PRIMARY KEY,
      "sender_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "receiver_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DataShareRequest_sender_id_idx" ON "DataShareRequest"("sender_id");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DataShareRequest_receiver_id_idx" ON "DataShareRequest"("receiver_id");
  `);
  console.log('✅ Table DataShareRequest created and indexed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

