import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';

// A CV file is kept while the profile or any application points to it: an
// application keeps the CV the student applied with, even after the student
// replaced or deleted it in the profile.
export async function deleteCvIfUnused(
  prisma: PrismaService,
  storage: StorageService,
  key: string,
): Promise<void> {
  const [profiles, applications] = await Promise.all([
    prisma.studentProfile.count({ where: { cvUrl: key } }),
    prisma.application.count({ where: { cvUrl: key } }),
  ]);
  if (profiles === 0 && applications === 0) {
    await storage.deleteQuietly(key);
  }
}
