import { Offer, OfferStatus } from "@/lib/types/offer";
import { UserRole } from "@/lib/auth/types";

/**
 * Negotiation State Logic
 * 
 * Centralizes the rules for:
 * 1. Determining the current state of a negotiation chain
 * 2. Determining what actions a user can take based on their role
 * 3. Determining if a deal is locked
 */

export type NegotiationStatus =
    | 'OFFER_SENT'      // Buyer sent offer, waiting for seller
    | 'COUNTER_SENT'    // Seller countered, waiting for buyer
    | 'ACCEPTED'        // Deal locked
    | 'REJECTED'        // Deal dead
    | 'WITHDRAWN'       // Deal dead
    | 'EXPIRED';        // Deal dead

export interface NegotiationState {
    status: NegotiationStatus;
    latestOffer: Offer | null;
    isLocked: boolean;
    canBuyerAct: boolean;
    canSellerAct: boolean; // Agent acts on behalf of seller
}

/**
 * Derives the overall negotiation status from a list of related offers.
 * Assumes 'offers' are sorted by creation date (newest first) or we sort them here.
 */
export function getNegotiationState(offers: Offer[]): NegotiationState {
    if (!offers || offers.length === 0) {
        return {
            status: 'OFFER_SENT', // Default/Fallback, though arguably 'NONE'
            latestOffer: null,
            isLocked: false,
            canBuyerAct: true,
            canSellerAct: false
        };
    }

    // Sort by created_at desc just in case
    const sortedOffers = [...offers].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latest = sortedOffers[0];
    const isLocked = latest.status === OfferStatus.ACCEPTED ||
        latest.status === OfferStatus.REJECTED ||
        latest.status === OfferStatus.WITHDRAWN ||
        latest.status === OfferStatus.EXPIRED;

    let status: NegotiationStatus = 'OFFER_SENT';

    if (latest.status === OfferStatus.ACCEPTED) status = 'ACCEPTED';
    else if (latest.status === OfferStatus.REJECTED) status = 'REJECTED';
    else if (latest.status === OfferStatus.WITHDRAWN) status = 'WITHDRAWN';
    else if (latest.status === OfferStatus.EXPIRED) status = 'EXPIRED';
    else if (latest.status === OfferStatus.COUNTERED) {
        // If the *latest* is "COUNTERED", it usually means the *previous* one was countered.
        // BUT in our DB, 'COUNTERED' might be the status of the *parent*.
        // The *child* (counter-offer) would be PENDING.
        // We need to check if the latest offer is a counter-offer.

        // Heuristic: If latest offer has a `counter_to_offer_id`, it is a counter-offer.
        if (latest.counter_to_offer_id) {
            status = 'COUNTER_SENT';
        } else {
            status = 'OFFER_SENT';
        }
    } else if (latest.status === OfferStatus.PENDING) {
        // PENDING could be an original offer OR a counter-offer
        if (latest.counter_to_offer_id) {
            status = 'COUNTER_SENT';
        } else {
            status = 'OFFER_SENT';
        }
    }

    return {
        status,
        latestOffer: latest,
        isLocked,
        canBuyerAct: !isLocked && status === 'COUNTER_SENT',
        canSellerAct: !isLocked && status === 'OFFER_SENT'
    };
}

/**
 * Permission Check: Can this user counter the current offer?
 */
export function canCounter(offer: Offer, role: UserRole): boolean {
    if (isDealTerminal(offer.status)) return false;

    // Buyer cannot counter (for now - Phase 2 scope strictness)
    if (role === UserRole.BUYER) return false;

    // Agent/Admin can counter if it's an original offer or buyer's response
    // (In Phase 2, we only support 1 level of counter, or ping-pong. 
    // If it's PENDING and coming from Buyer, Agent can counter.)
    if ((role === UserRole.AGENT || role === UserRole.ADMIN) && offer.status === OfferStatus.PENDING) {
        // Ensure we don't counter our own counter (though UI should prevent this)
        return true;
    }

    return false;
}

/**
 * Permission Check: Can this user accept the current offer?
 */
export function canAccept(offer: Offer, role: UserRole): boolean {
    if (isDealTerminal(offer.status)) return false;

    if (role === UserRole.BUYER) {
        // Buyer can accept if it's a counter-offer (i.e. has parent)
        // AND it is PENDING
        return !!offer.counter_to_offer_id && offer.status === OfferStatus.PENDING;
    }

    if (role === UserRole.AGENT || role === UserRole.ADMIN) {
        // Agent can accept if it's an original offer from Buyer
        return !offer.counter_to_offer_id && offer.status === OfferStatus.PENDING;
    }

    return false;
}

/**
 * Permission Check: Can this user reject the current offer?
 */
export function canReject(offer: Offer, role: UserRole): boolean {
    // Rejection rules map closely to Accept rules
    return canAccept(offer, role);
}

/**
 * Permission Check: Can this user withdraw the current offer?
 */
export function canWithdraw(offer: Offer, role: UserRole): boolean {
    if (isDealTerminal(offer.status)) return false;

    // Only the creator can withdraw. 
    // Frontend doesn't strictly know "is_mine" without context, 
    // but typically:
    // Buyer withdraws their Offer.
    // Agent withdraws their Counter.

    if (role === UserRole.BUYER) {
        // Buyer can withdraw their original offer
        return !offer.counter_to_offer_id && offer.status === OfferStatus.PENDING;
    }

    if (role === UserRole.AGENT || role === UserRole.ADMIN) {
        // Agent can withdraw their counter-offer
        return !!offer.counter_to_offer_id && offer.status === OfferStatus.PENDING;
    }

    return false;
}

/**
 * Parses structured data from the seller's response message.
 * Supports format: "Message text... [Possession: YYYY-MM-DD]"
 */
export function getCounterDetails(message?: string): { possessionDate?: string; cleanMessage: string } {
    if (!message) return { cleanMessage: '' };

    const possessionRegex = /\[Possession:\s*([^\]]+)\]/i;
    const match = message.match(possessionRegex);

    let possessionDate: string | undefined;
    let cleanMessage = message;

    if (match) {
        possessionDate = match[1].trim();
        cleanMessage = message.replace(possessionRegex, '').trim();
    }

    return { possessionDate, cleanMessage };
}

function isDealTerminal(status: OfferStatus): boolean {
    return status === OfferStatus.ACCEPTED ||
        status === OfferStatus.REJECTED ||
        status === OfferStatus.WITHDRAWN ||
        status === OfferStatus.EXPIRED;
}
