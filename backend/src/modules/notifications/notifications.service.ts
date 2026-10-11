import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { NotificationType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface NewNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  // Path of the frontend screen the notification leads to.
  link?: string;
}

// Internal notifications (the `notifications` table). Other modules create
// them as part of their own changes; the inbox to read them arrives with M8.
// Texts are stored in English, the portal's default language: the recipient's
// language is not known when the notification is created.
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Pass the transaction client when the notification must be saved together
  // with the change that causes it.
  async notify(
    notification: NewNotification,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await db.notification.create({
      data: {
        ...notification,
        // notifications.title is VARCHAR(150); titles may include an offer's
        // title, which can be just as long.
        title: notification.title.slice(0, 150),
      },
    });
  }
}
