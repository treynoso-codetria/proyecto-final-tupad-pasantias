// The portal is used in Argentina: "today" (e.g. whether an offer's deadline
// has passed) follows Argentine time, not the server's or UTC. A deadline is
// the last day to apply, so an offer stays open until that day ends there.
const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

// Today as a DATE value (midnight UTC), comparable with DATE columns.
export function today(): Date {
  // en-CA formats dates as YYYY-MM-DD.
  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
  }).format(new Date());
  return new Date(isoDate);
}

// DATE columns are sent as YYYY-MM-DD, without a time that could shift with
// the reader's time zone.
export function toIsoDate(date: Date): string;
export function toIsoDate(date: Date | null): string | null;
export function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
