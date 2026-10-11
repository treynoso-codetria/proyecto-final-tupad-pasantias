// Router state passed by the screens that link to an offer, so the offer page
// can link back to exactly where the user came from (a search, "My offers").
export type OfferLinkState = { backTo?: string }
