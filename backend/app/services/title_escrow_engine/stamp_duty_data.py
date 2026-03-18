"""
Stamp duty fallback rates (in-memory, mirrors DB seed data).
Used if stamp_duty_rates table query fails.
"""
from decimal import Decimal

# { state: { property_type: { male, female, joint, reg_rate, reg_cap } } }
FALLBACK_RATES = {
    "MAHARASHTRA": {
        "RESIDENTIAL": {
            "male": Decimal("6.00"), "female": Decimal("5.00"), "joint": Decimal("6.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": Decimal("30000"),
        }
    },
    "KARNATAKA": {
        "RESIDENTIAL": {
            "male": Decimal("5.60"), "female": Decimal("5.60"), "joint": Decimal("5.60"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "TAMIL_NADU": {
        "RESIDENTIAL": {
            "male": Decimal("7.00"), "female": Decimal("7.00"), "joint": Decimal("7.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "DELHI": {
        "RESIDENTIAL": {
            "male": Decimal("6.00"), "female": Decimal("4.00"), "joint": Decimal("6.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "TELANGANA": {
        "RESIDENTIAL": {
            "male": Decimal("6.00"), "female": Decimal("6.00"), "joint": Decimal("6.00"),
            "reg_rate": Decimal("0.50"), "reg_cap": None,
        }
    },
    "UP": {
        "RESIDENTIAL": {
            "male": Decimal("7.00"), "female": Decimal("6.00"), "joint": Decimal("7.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "RAJASTHAN": {
        "RESIDENTIAL": {
            "male": Decimal("6.00"), "female": Decimal("5.00"), "joint": Decimal("6.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "GUJARAT": {
        "RESIDENTIAL": {
            "male": Decimal("4.90"), "female": Decimal("4.90"), "joint": Decimal("4.90"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "KERALA": {
        "RESIDENTIAL": {
            "male": Decimal("8.00"), "female": Decimal("8.00"), "joint": Decimal("8.00"),
            "reg_rate": Decimal("2.00"), "reg_cap": None,
        }
    },
    "MP": {
        "RESIDENTIAL": {
            "male": Decimal("7.50"), "female": Decimal("6.50"), "joint": Decimal("7.50"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "AP": {
        "RESIDENTIAL": {
            "male": Decimal("6.00"), "female": Decimal("6.00"), "joint": Decimal("6.00"),
            "reg_rate": Decimal("0.50"), "reg_cap": None,
        }
    },
    "WEST_BENGAL": {
        "RESIDENTIAL": {
            "male": Decimal("7.00"), "female": Decimal("7.00"), "joint": Decimal("7.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": None,
        }
    },
    "DEFAULT": {
        "RESIDENTIAL": {
            "male": Decimal("6.00"), "female": Decimal("5.00"), "joint": Decimal("6.00"),
            "reg_rate": Decimal("1.00"), "reg_cap": Decimal("30000"),
        }
    },
}


def get_fallback_rate(state: str, property_type: str = "RESIDENTIAL") -> dict:
    state_data = FALLBACK_RATES.get(state.upper(), FALLBACK_RATES["DEFAULT"])
    return state_data.get(property_type.upper(), FALLBACK_RATES["DEFAULT"]["RESIDENTIAL"])
