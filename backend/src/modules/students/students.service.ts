import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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
  constructor(private readonly prisma: PrismaService) {}

  async getOwnProfile(userId: string): Promise<StudentProfileResponseDto> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: withEmail,
    });
    if (!profile) {
      throw new NotFoundException();
    }
    return toResponse(profile);
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
    return toResponse(profile);
  }

  // A student's profile is not public. Besides the student (who uses /me), it
  // can be read by administrators and by a company the student applied to.
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
        },
        select: { id: true },
      });
      if (!application) {
        throw new ForbiddenException();
      }
    }

    const { birthDate: _birthDate, ...view } = toResponse(profile);
    return view;
  }
}

function toResponse(profile: ProfileWithEmail): StudentProfileResponseDto {
  return {
    id: profile.id,
    email: profile.user.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    // Stored as a DATE; sent without a time so it does not shift with the
    // reader's time zone.
    birthDate: profile.birthDate?.toISOString().slice(0, 10) ?? null,
    career: profile.career,
    institution: profile.institution,
    studyYear: profile.studyYear,
    province: profile.province,
    city: profile.city,
    bio: profile.bio,
    portfolioUrl: profile.portfolioUrl,
    cvUrl: profile.cvUrl,
    cvFileName: profile.cvFileName,
    updatedAt: profile.updatedAt,
  };
}
