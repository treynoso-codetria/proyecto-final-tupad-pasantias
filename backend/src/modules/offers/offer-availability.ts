import { today } from '../../common/dates.js';
import { Prisma } from '../../generated/prisma/client.js';
import { OfferStatus } from '../../generated/prisma/enums.js';

// When students can apply to an offer: it is open, its deadline (if any) has
// not passed, and its company's account is active. The same rule decides
// which offers are listed publicly.

export function acceptingApplications(): Prisma.JobOfferWhereInput {
  return {
    status: OfferStatus.OPEN,
    OR: [{ deadline: null }, { deadline: { gte: today() } }],
    company: { user: { isActive: true } },
  };
}

export function acceptsApplications(offer: {
  status: OfferStatus;
  deadline: Date | null;
  company: { user: { isActive: boolean } };
}): boolean {
  return (
    offer.status === OfferStatus.OPEN &&
    offer.company.user.isActive &&
    (offer.deadline === null || offer.deadline >= today())
  );
}
