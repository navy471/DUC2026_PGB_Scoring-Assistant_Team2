import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.student.findMany().then(r => {
  r.forEach(s => {
    if (s.name.includes('ពៅ') || s.name.includes('សុផា') || s.name.includes('សុវណ្ណ') || s.name.includes('នៀម')) {
      console.log('MATCH:', s.student_code, s.name, s.class_name);
    }
  });
}).finally(() => prisma.$disconnect());




