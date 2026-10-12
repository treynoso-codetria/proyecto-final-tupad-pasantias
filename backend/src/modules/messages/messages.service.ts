import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-code.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationStatus,
  NotificationType,
  OfferStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  ConversationDto,
  ConversationPageDto,
  ConversationSummaryDto,
  MessageDto,
} from './dto/message.dto.js';

const conversationInclude = {
  offer: {
    select: {
      id: true,
      title: true,
      status: true,
      company: {
        select: { id: true, userId: true, name: true, logoUrl: true },
      },
    },
  },
  student: {
    select: { id: true, userId: true, firstName: true, lastName: true },
  },
} satisfies Prisma.ApplicationInclude;

type ConversationRow = Prisma.ApplicationGetPayload<{
  include: typeof conversationInclude;
}>;

// Messages the user received: the conversation is theirs and someone else
// sent them.
const received = (userId: string): Prisma.MessageWhereInput => ({
  senderId: { not: userId },
  readAt: null,
});

// Applications the user takes part in: as the student, or as the company
// that owns the offer.
const participantOf = (userId: string): Prisma.ApplicationWhereInput => ({
  OR: [{ student: { userId } }, { offer: { company: { userId } } }],
});

// Internal messaging between a company and a student about one application
// (the conversation is the application). Clients poll for new messages; there
// are no WebSockets in this version.
@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  // The conversations that have messages, the most recently active first.
  async listConversations(
    userId: string,
    { page, limit }: { page: number; limit: number },
  ): Promise<ConversationPageDto> {
    // Prisma cannot order by the newest message of a relation, so the page
    // of ids is picked in SQL and the rest is loaded below.
    const [pageRows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT a.id
        FROM applications a
        JOIN student_profiles s ON s.id = a.student_id
        JOIN job_offers o ON o.id = a.offer_id
        JOIN companies c ON c.id = o.company_id
        JOIN messages m ON m.application_id = a.id
        WHERE s.user_id = ${userId}::uuid OR c.user_id = ${userId}::uuid
        GROUP BY a.id
        ORDER BY MAX(m.created_at) DESC, a.id
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(DISTINCT a.id) AS total
        FROM applications a
        JOIN student_profiles s ON s.id = a.student_id
        JOIN job_offers o ON o.id = a.offer_id
        JOIN companies c ON c.id = o.company_id
        JOIN messages m ON m.application_id = a.id
        WHERE s.user_id = ${userId}::uuid OR c.user_id = ${userId}::uuid`,
    ]);
    const ids = pageRows.map((row) => row.id);

    const rows = await this.prisma.application.findMany({
      where: { id: { in: ids } },
      include: {
        ...conversationInclude,
        messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
        _count: { select: { messages: { where: received(userId) } } },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    const items = ids.flatMap((id): ConversationSummaryDto[] => {
      const row = byId.get(id);
      const last = row?.messages[0];
      if (!row || !last) {
        return [];
      }
      return [
        {
          ...this.header(row, userId, row._count.messages),
          lastMessage: {
            body: last.body,
            mine: last.senderId === userId,
            createdAt: last.createdAt,
          },
        },
      ];
    });

    const totalCount = Number(total);
    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  // Messages received and not read yet, in every conversation; polled by the
  // navigation bar.
  countUnread(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: { ...received(userId), application: participantOf(userId) },
    });
  }

  // The whole conversation, oldest message first. Reading it does not mark
  // it as read: the client does that explicitly (markRead).
  async getConversation(
    userId: string,
    applicationId: string,
  ): Promise<ConversationDto> {
    const conversation = await this.findConversation(userId, applicationId);
    const messages = await this.prisma.message.findMany({
      where: { applicationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const unread = messages.filter(
      (message) => message.senderId !== userId && message.readAt === null,
    ).length;

    return {
      ...this.header(conversation, userId, unread),
      coverLetter: conversation.coverLetter,
      appliedAt: conversation.appliedAt,
      messages: messages.map((message) => toMessage(message, userId)),
    };
  }

  // Either participant can write first. The recipient gets a notification,
  // unless one about this conversation is still unread: one notice per
  // conversation is enough until they look at it.
  async send(
    userId: string,
    applicationId: string,
    body: string,
  ): Promise<MessageDto> {
    const conversation = await this.findConversation(userId, applicationId);
    if (!canSend(conversation)) {
      throw new ConflictException(ErrorCode.CONVERSATION_CLOSED);
    }

    const { offer, student } = conversation;
    const fromStudent = student.userId === userId;
    const recipientId = fromStudent ? offer.company.userId : student.userId;

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { applicationId, senderId: userId, body },
      });
      const pendingNotice = await tx.notification.findFirst({
        where: {
          userId: recipientId,
          type: NotificationType.NEW_MESSAGE,
          readAt: null,
          data: { path: ['applicationId'], equals: applicationId },
        },
        select: { id: true },
      });
      if (!pendingNotice) {
        await this.notifications.notify(
          {
            userId: recipientId,
            type: NotificationType.NEW_MESSAGE,
            data: {
              applicationId,
              offerTitle: offer.title,
              senderName: fromStudent
                ? `${student.firstName} ${student.lastName}`
                : offer.company.name,
            },
            link: `/messages/${applicationId}`,
          },
          tx,
        );
      }
      return created;
    });
    return toMessage(message, userId);
  }

  // Marks the messages received in the conversation as read, together with
  // its notifications.
  async markRead(userId: string, applicationId: string): Promise<void> {
    await this.findConversation(userId, applicationId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.message.updateMany({
        where: { applicationId, ...received(userId) },
        data: { readAt: now },
      }),
      this.prisma.notification.updateMany({
        where: {
          userId,
          type: NotificationType.NEW_MESSAGE,
          readAt: null,
          data: { path: ['applicationId'], equals: applicationId },
        },
        data: { readAt: now },
      }),
    ]);
  }

  // Only the student of the application and the company that owns the offer
  // take part in its conversation.
  private async findConversation(userId: string, applicationId: string) {
    const conversation = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: conversationInclude,
    });
    if (!conversation) {
      throw new NotFoundException();
    }
    if (
      conversation.student.userId !== userId &&
      conversation.offer.company.userId !== userId
    ) {
      throw new ForbiddenException();
    }
    return conversation;
  }

  private header(
    conversation: ConversationRow,
    userId: string,
    unreadCount: number,
  ) {
    const { offer, student } = conversation;
    const counterpart =
      student.userId === userId
        ? {
            name: offer.company.name,
            companyId: offer.company.id,
            logoUrl: this.storage.logoUrl(
              offer.company.id,
              offer.company.logoUrl,
            ),
            studentId: null,
          }
        : {
            name: `${student.firstName} ${student.lastName}`,
            companyId: null,
            logoUrl: null,
            studentId: student.id,
          };
    return {
      applicationId: conversation.id,
      applicationStatus: conversation.status,
      offer: { id: offer.id, title: offer.title },
      counterpart,
      canSend: canSend(conversation),
      unreadCount,
    };
  }
}

// A withdrawn application or a removed offer closes the conversation; it
// stays readable.
function canSend(conversation: ConversationRow): boolean {
  return (
    conversation.status !== ApplicationStatus.WITHDRAWN &&
    conversation.offer.status !== OfferStatus.REMOVED
  );
}

function toMessage(
  message: {
    id: string;
    body: string;
    senderId: string;
    readAt: Date | null;
    createdAt: Date;
  },
  userId: string,
): MessageDto {
  return {
    id: message.id,
    body: message.body,
    mine: message.senderId === userId,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}
