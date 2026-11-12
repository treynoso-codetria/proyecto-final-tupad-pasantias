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
    }
  | {
      type: typeof NotificationType.NEW_MESSAGE;
      data: { applicationId: string; offerTitle: string; senderName: string };
    }
  // Moderation of an offer by an administrator, sent to its company. The
  // type is named after the removal; restoring uses it too, with the other
  // status.
  | {
      type: typeof NotificationType.OFFER_REMOVED;
      data:
        | {
            offerId: string;
            offerTitle: string;
            status: 'REMOVED';
            reason: string;
          }
        | { offerId: string; offerTitle: string; status: 'RESTORED' };
    }
  | {
      type: typeof NotificationType.ACCOUNT_STATUS_CHANGED;
      data: { status: 'DEACTIVATED'; reason: string } | { status: 'ACTIVATED' };
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
