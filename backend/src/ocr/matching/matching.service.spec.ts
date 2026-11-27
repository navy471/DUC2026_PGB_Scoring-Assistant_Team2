import { MatchingService } from './matching.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('MatchingService', () => {
  const students = [
    {
      id: 'student-a',
      student_code: '20240001',
      name: 'SOURN VISAL',
      khmer_name: null,
      class_name: '12A',
    },
    {
      id: 'student-b',
      student_code: '20240002',
      name: 'CHAN DARA',
      khmer_name: null,
      class_name: '12A',
    },
  ];

  const createService = () => {
    const prisma = {
      student: {
        findMany: vi.fn().mockResolvedValue(students),
      },
    } as unknown as PrismaService;

    return new MatchingService(prisma);
  };

  it('matches the detected name before a conflicting exact student code', async () => {
    const service = createService();

    const result = await service.matchStudent('20240001', 'CHAN DARA');

    expect(result.studentId).toBe('student-b');
    expect(result.matchType).toBe('NAME_EXACT');
  });

  it('falls back to the exact student code when the detected name is unclear', async () => {
    const service = createService();

    const result = await service.matchStudent('20240001', 'UNCLEAR NAME');

    expect(result.studentId).toBe('student-a');
    expect(result.matchType).toBe('EXACT_CODE');
  });
});
