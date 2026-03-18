"""
Document Consistency Detector — Detects owner name mismatch between sale deed and seller profile.

Normalizes both names and computes similarity to flag potential OWNER_MISMATCH fraud.

Thresholds:
  < 0.60 similarity → CRITICAL signal
  < 0.80 similarity → HIGH signal
"""
import logging
import re
from typing import List, Dict, Any
import asyncpg

from .base import FraudDetector, FraudSignal

logger = logging.getLogger(__name__)

HIGH_THRESHOLD     = 0.80
CRITICAL_THRESHOLD = 0.60

# Common honorifics to strip out during normalization
HONORIFICS = re.compile(
    r'\b(mr|mrs|ms|dr|sri|smt|shri|late|s/o|d/o|w/o)\b', re.IGNORECASE
)


def _normalize_name(name: str) -> str:
    """Lowercase, strip honorifics, punctuation, and extra whitespace."""
    if not name:
        return ""
    name = HONORIFICS.sub("", name)
    name = re.sub(r'[^a-z0-9\s]', '', name.lower())
    return " ".join(name.split())


def _token_overlap(a: str, b: str) -> float:
    """Word-level Jaccard similarity."""
    tokens_a = set(a.split())
    tokens_b = set(b.split())
    if not tokens_a or not tokens_b:
        return 0.0
    return len(tokens_a & tokens_b) / len(tokens_a | tokens_b)


class DocumentConsistencyDetector(FraudDetector):
    """Detects mismatch between sale deed owner name and registered seller name."""

    @property
    def signal_type(self) -> str:
        return "OWNER_MISMATCH"

    @property
    def default_severity(self) -> str:
        return "HIGH"

    async def detect(self, conn: asyncpg.Connection, context: Dict[str, Any]) -> List[FraudSignal]:
        property_id = context.get("property_id")
        verification_id = context.get("verification_id")

        if not property_id:
            return []

        # Get seller name
        try:
            seller = await conn.fetchrow(
                """
                SELECT u.full_name
                FROM properties p
                JOIN users u ON u.id = p.seller_id
                WHERE p.id = $1
                """,
                property_id,
            )
        except Exception as e:
            logger.warning(f"[DocumentConsistencyDetector] Seller fetch failed: {e}")
            return []

        if not seller or not seller["full_name"]:
            return []

        # Get sale deed metadata — look in property_document_verifications
        try:
            if verification_id:
                deed_row = await conn.fetchrow(
                    """
                    SELECT pdv.metadata
                    FROM property_document_verifications pdv
                    JOIN verification_document_types vdt ON vdt.id = pdv.document_type_id
                    WHERE pdv.verification_id = $1
                      AND vdt.code = 'SALE_DEED'
                      AND pdv.verified = TRUE
                    """,
                    verification_id,
                )
            else:
                # Fallback: find latest verified sale deed for this property
                deed_row = await conn.fetchrow(
                    """
                    SELECT pdv.metadata
                    FROM property_document_verifications pdv
                    JOIN property_verifications pv ON pv.id = pdv.verification_id
                    JOIN verification_document_types vdt ON vdt.id = pdv.document_type_id
                    WHERE pv.property_id = $1
                      AND vdt.code = 'SALE_DEED'
                      AND pdv.verified = TRUE
                    ORDER BY pv.created_at DESC
                    LIMIT 1
                    """,
                    property_id,
                )
        except Exception as e:
            logger.warning(f"[DocumentConsistencyDetector] Sale deed fetch failed: {e}")
            return []

        if not deed_row or not deed_row["metadata"]:
            return []

        metadata = deed_row["metadata"]
        # Support both 'owner_name' and 'seller_name' keys in metadata
        deed_owner_name = (
            metadata.get("owner_name")
            or metadata.get("seller_name")
            or context.get("sale_deed_owner_name")
        )

        if not deed_owner_name:
            return []

        seller_norm = _normalize_name(seller["full_name"])
        deed_norm   = _normalize_name(deed_owner_name)

        similarity = _token_overlap(seller_norm, deed_norm)

        if similarity >= HIGH_THRESHOLD:
            return []

        severity = "CRITICAL" if similarity < CRITICAL_THRESHOLD else "HIGH"

        return [FraudSignal(
            signal_type=self.signal_type,
            severity=severity,
            property_id=property_id,
            description=(
                f"Sale deed owner name '{deed_owner_name}' has only {similarity*100:.0f}% "
                f"match with registered seller '{seller['full_name']}'."
            ),
            detected_by="SYSTEM",
            detector_name=self.__class__.__name__,
            metadata={
                "seller_name": seller["full_name"],
                "deed_owner_name": deed_owner_name,
                "seller_normalized": seller_norm,
                "deed_owner_normalized": deed_norm,
                "similarity": round(similarity, 3),
            },
        )]
