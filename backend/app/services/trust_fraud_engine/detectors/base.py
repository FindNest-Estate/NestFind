"""
Fraud Detection Base — Abstract interface and data structures.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from uuid import UUID
import asyncpg


@dataclass
class FraudSignal:
    """Represents a detected fraud signal before insertion into DB."""
    signal_type: str
    severity: str           # LOW, MEDIUM, HIGH, CRITICAL
    property_id: UUID
    description: str
    detected_by: str = "SYSTEM"   # SYSTEM, AGENT, USER, ADMIN
    detector_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class FraudDetector(ABC):
    """Abstract base class for all fraud detectors."""

    @property
    @abstractmethod
    def signal_type(self) -> str:
        """The primary signal type this detector produces, e.g. 'DUPLICATE_ADDRESS'"""

    @property
    @abstractmethod
    def default_severity(self) -> str:
        """Default severity level: LOW, MEDIUM, HIGH, CRITICAL"""

    @abstractmethod
    async def detect(
        self,
        conn: asyncpg.Connection,
        context: Dict[str, Any],
    ) -> List[FraudSignal]:
        """
        Run detection logic.
        Returns a list of FraudSignal instances for each detected issue.
        Returns empty list if no signals found.
        """
