import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring created_by column on Student table...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "created_by" TEXT;`);
  console.log('✅ Column created_by ensured!');

  // Assign existing students to teacher@example.com (id: 73eb170f-fffb-428d-9a0a-064a943bb40a)
  const count = await prisma.$executeRawUnsafe(
    `UPDATE "Student" SET "created_by" = '73eb170f-fffb-428d-9a0a-064a943bb40a' WHERE "created_by" IS NULL;`
  );
  console.log(`✅ Assigned ${count} existing students to original teacher (teacher@example.com)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

