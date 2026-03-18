"""
Fraud Detection — Package for all fraud detector modules.
"""
from .base import FraudDetector, FraudSignal
from .duplicate_address import DuplicateAddressDetector
from .price_anomaly import PriceAnomalyDetector
from .gps_mismatch import GPSMismatchDetector
from .document_consistency import DocumentConsistencyDetector
from .velocity import VelocityDetector
from .serial_cancellation import SerialCancellationDetector

__all__ = [
    "FraudDetector",
    "FraudSignal",
    "DuplicateAddressDetector",
    "PriceAnomalyDetector",
    "GPSMismatchDetector",
    "DocumentConsistencyDetector",
    "VelocityDetector",
    "SerialCancellationDetector",
]
