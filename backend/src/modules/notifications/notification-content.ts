import { NotificationType } from '../../generated/prisma/enums.js';

// What each kind of notification stores in `data`: the values its text is
// built from. The texts are in src/i18n/<lang>/notifications.json.
export type NotificationContent =
  | {
      type: typeof NotificationType.APPLICATION_RECEIVED;
      data: { offerId: string; offerTitle: string; studentName: string };
    }
  | {
      type: typeof NotificationType.APPLICATION_STATUS_CHANGED;
      data: {
        offerId: string;
        offerTitle: string;
        companyName: string;
        status: 'ACCEPTED' | 'REJECTED';
      };
    };

// Key of the texts of a notification in notifications.json. Some types have
// one text per outcome (e.g. accepted / rejected).
export function textKey(type: string, data: unknown): string {
  const status =
    typeof data === 'object' && data !== null && 'status' in data
      ? String(data.status)
      : null;
  return status ? `${type}.${status}` : type;
}
