"""Shared payout calculation for SMS processing and reporting."""


def calculate_sms_payout(num_row, *, otp_limit_exceeded: bool = False) -> float:
    """Return per-SMS payout amount.

    Rules:
    - Unknown numbers (not in inventory) pay out $0.
    - OTP daily limit exhaustion pays out $0.
    - Otherwise payout = rate * (profit_margin / 100).
    """
    if not num_row or otp_limit_exceeded:
        return 0.0
    try:
        rate = float(num_row["rate"] or 0.0)
    except (TypeError, ValueError):
        rate = 0.0
    try:
        margin = float(num_row["profit_margin"] if num_row["profit_margin"] is not None else 50.0)
    except (TypeError, ValueError):
        margin = 50.0
    return round(rate * (margin / 100.0), 6)
