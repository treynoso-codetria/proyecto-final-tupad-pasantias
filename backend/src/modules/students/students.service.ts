import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toIsoDate } from '../../common/dates.js';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ApplicationStatus, UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UploadedFile } from '../../storage/file-types.js';
import { StorageService } from '../../storage/storage.service.js';
import {
  checkUpload,
  UPLOAD_RULES,
  uploadedFileName,
} from '../../storage/uploads.js';
import { deleteCvIfUnused } from './cv-files.js';
import {
  StudentProfileResponseDto,
  StudentProfileViewDto,
} from './dto/student-profile-response.dto.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';

const withEmail = {
  user: { select: { email: true } },
} satisfies Prisma.StudentProfileInclude;

type ProfileWithEmail = Prisma.StudentProfileGetPayload<{
  include: typeof withEmail;
}>;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getOwnProfile(userId: string): Promise<StudentProfileResponseDto> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: withEmail,
    });
    if (!profile) {
      throw new NotFoundException();
    }
    return this.toResponse(profile);
  }

  async updateOwnProfile(
    userId: string,
    dto: UpdateStudentProfileDto,
  ): Promise<StudentProfileResponseDto> {
    // Fields absent from the DTO are undefined, which Prisma leaves untouched.
    const profile = await this.prisma.studentProfile.update({
      where: { userId },
      data: dto,
      include: withEmail,
    });
    return this.toResponse(profile);
  }

  // Uploads a new CV (PDF) or replaces the current one.
  async uploadCv(
    userId: string,
    file: UploadedFile | undefined,
  ): Promise<StudentProfileResponseDto> {
    const kind = checkUpload(file, UPLOAD_RULES.cv);
    const current = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true, cvUrl: true },
    });

    const key = await this.storage.store('cvs', current.id, file!.buffer, kind);
    let profile: ProfileWithEmail;
    try {
      profile = await this.prisma.studentProfile.update({
        where: { userId },
        data: { cvUrl: key, cvFileName: uploadedFileName(file!, 'cv.pdf') },
        include: withEmail,
      });
    } catch (error) {
      await this.storage.deleteQuietly(key);
      throw error;
    }

    if (current.cvUrl) {
      await deleteCvIfUnused(this.prisma, this.storage, current.cvUrl);
    }
    return this.toResponse(profile);
  }

  async deleteCv(userId: string): Promise<StudentProfileResponseDto> {
    const current = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId },
      select: { cvUrl: true },
    });
    const profile = await this.prisma.studentProfile.update({
      where: { userId },
      data: { cvUrl: null, cvFileName: null },
      include: withEmail,
    });
    if (current.cvUrl) {
      await deleteCvIfUnused(this.prisma, this.storage, current.cvUrl);
    }
    return this.toResponse(profile);
  }

  // A student's profile is not public. Besides the student (who uses /me), it
  // can be read by administrators and by a company the student applied to
  // (and did not withdraw from).
  async getProfileForViewer(
    profileId: string,
    viewer: AuthenticatedUser,
  ): Promise<StudentProfileViewDto> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: withEmail,
    });
    if (!profile) {
      throw new NotFoundException();
    }

    if (viewer.role === UserRole.EMPLOYER) {
      const application = await this.prisma.application.findFirst({
        where: {
          studentId: profileId,
          offer: { company: { userId: viewer.id } },
          status: { not: ApplicationStatus.WITHDRAWN },
        },
        select: { id: true },
      });
      if (!application) {
        throw new ForbiddenException();
      }
    }

    const { birthDate: _birthDate, ...view } = await this.toResponse(profile);
    return view;
  }

  private async toResponse(
    profile: ProfileWithEmail,
  ): Promise<StudentProfileResponseDto> {
    return {
      id: profile.id,
      email: profile.user.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      birthDate: toIsoDate(profile.birthDate),
      career: profile.career,
      institution: profile.institution,
      studyYear: profile.studyYear,
      province: profile.province,
      city: profile.city,
      bio: profile.bio,
      portfolioUrl: profile.portfolioUrl,
      cvUrl: await this.storage.signedUrl(
        profile.cvUrl,
        profile.cvFileName ?? undefined,
      ),
      cvFileName: profile.cvFileName,
      updatedAt: profile.updatedAt,
    };
  }
}
