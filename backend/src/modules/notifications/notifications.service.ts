import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  NotificationDto,
  NotificationPageDto,
} from './dto/notification.dto.js';
import { NotificationContent, textKey } from './notification-content.js';

// Internal notifications (no push, out of scope). Other modules create them
// with notify(), as part of the change that causes them; users read them
// through the inbox endpoints.
//
// Each notification stores the values of its text (`data`) and is shown in
// the reader's language; `title`/`body` keep an English version, used when
// there is no `data` or no text for it.
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // Pass the transaction client when the notification must be saved together
  // with the change that causes it.
  async notify(
    notification: NotificationContent & {
      userId: string;
      // Path of the frontend screen the notification leads to.
      link: string;
    },
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const english = this.render(notification.type, notification.data, 'en');
    await db.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        // notifications.title is VARCHAR(150); titles may include an
        // offer's title, which can be just as long.
        title: (english?.title ?? notification.type).slice(0, 150),
        body: english?.body ?? null,
        link: notification.link,
        data: notification.data,
      },
    });
  }

  async list(
    userId: string,
    { page, limit, unread }: { page: number; limit: number; unread: boolean },
  ): Promise<NotificationPageDto> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      readAt: unread ? null : undefined,
    };
    const [total, unreadCount, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.countUnread(userId),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const lang = I18nContext.current()?.lang;
    return {
      items: rows.map((row) => this.toDto(row, lang)),
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  // Other users' notifications are reported as missing.
  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.notification.count({
        where: { id, userId },
      });
      if (!exists) {
        throw new NotFoundException();
      }
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private toDto(
    row: Prisma.NotificationGetPayload<object>,
    lang: string | undefined,
  ): NotificationDto {
    const text = row.data ? this.render(row.type, row.data, lang) : null;
    return {
      id: row.id,
      type: row.type,
      title: text?.title ?? row.title,
      body: text?.body ?? row.body,
      link: row.link,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  // Null when notifications.json has no text for it.
  private render(
    type: string,
    data: unknown,
    lang: string | undefined,
  ): { title: string; body: string } | null {
    const key = `notifications.${textKey(type, data)}`;
    const args = data as Record<string, unknown>;
    const title: string = this.i18n.translate(`${key}.title`, { lang, args });
    const body: string = this.i18n.translate(`${key}.body`, { lang, args });
    return title === `${key}.title` ? null : { title, body };
  }
}
