"""Shared payout calculation for SMS processing and reporting."""


def calculate_sms_payout(num_row, *, otp_limit_exceeded: bool = False) -> float:
    """Return per-SMS payout amount.

    Rules:
    - Unknown numbers (not in inventory) pay out $0.
    - OTP daily limit exhaustion pays out $0.
    - Otherwise payout = rate (the rate field IS the direct per-SMS payout).
    """
    if not num_row or otp_limit_exceeded:
        return 0.0
    try:
        rate = float(num_row["rate"] or 0.0)
    except (TypeError, ValueError):
        rate = 0.0
    return round(rate, 6)
