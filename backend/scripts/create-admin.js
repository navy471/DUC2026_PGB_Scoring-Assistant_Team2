import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@duc.edu.kh';
  const password = args[1] || 'admin123';
  const name = args[2] || 'System Administrator';
  const role = (args[3] || 'ADMIN').toUpperCase();

  console.log(`\n========================================`);
  console.log(`🚀 Smart Grade Entry - Admin Account Setup`);
  console.log(`========================================`);
  console.log(`Target Email: ${email}`);
  console.log(`Target Name:  ${name}`);
  console.log(`Target Role:  ${role}`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { name, password, role },
    });
    console.log(`\n✅ Existing user updated to ADMIN successfully!`);
    console.log(`ID: ${updated.id}`);
    console.log(`Email: ${updated.email}`);
    console.log(`Role: ${updated.role}`);
  } else {
    const created = await prisma.user.create({
      data: { email, password, name, role },
    });
    console.log(`\n✅ New Admin user created successfully!`);
    console.log(`ID: ${created.id}`);
    console.log(`Email: ${created.email}`);
    console.log(`Role: ${created.role}`);
  }
  console.log(`========================================\n`);
}

main()
  .catch((err) => {
    console.error('❌ Error setting up admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

