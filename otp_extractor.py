"""OTP extraction with priority rules and separated-code support."""
import re

# Accept 4-8 OTP digits either contiguous or separated in groups, e.g.
# 123456, 123-456, 123 456, 12-34-56, 123.456, 123/456.
OTP_TOKEN = r"(?<!\d)(\d(?:[\s\-._/]*\d){3,7})(?!\d)"

OTP_PATTERNS = [
    (re.compile(rf"(?:otp|one[-\s]?time(?: password)?|passcode)[\sは:：#-]*{OTP_TOKEN}", re.I), 1),
    (re.compile(rf"(?:code|kode|codigo|código|verification code|verify code)[\sは:：#-]*{OTP_TOKEN}", re.I), 2),
    (re.compile(rf"(?:verification|verify|confirm|confirmation)[^\d]{{0,24}}{OTP_TOKEN}", re.I), 3),
    (re.compile(rf"(?:security|login|auth|access|2fa|mfa)[\s-]*(?:code|pin)?[\s:：#-]*{OTP_TOKEN}", re.I), 3.5),
    (re.compile(rf"(?:pin|パスワード|password)[\s:：#-]*{OTP_TOKEN}", re.I), 4),
    (re.compile(rf"(?:use|using|enter|input)[^\d]{{0,12}}{OTP_TOKEN}[^A-Za-z0-9]{{0,16}}(?:to|for|on|in)", re.I), 4.5),
    (re.compile(rf"{OTP_TOKEN}[\s]*(?:is your|is the|次のコード)", re.I), 5),
    (re.compile(rf"your[\s]*(?:code|otp)[\s]*(?:is|:|：)[\s]*{OTP_TOKEN}", re.I), 6),
    (re.compile(rf"\b{OTP_TOKEN}\b"), 10),
]

def _clean_candidate(value: str) -> str | None:
    otp = re.sub(r"\D", "", value or "")
    if not 4 <= len(otp) <= 8:
        return None
    return otp

def extract_otp(message: str) -> str | None:
    if not message or not isinstance(message, str):
        return None

    for pattern, priority in sorted(OTP_PATTERNS, key=lambda x: x[1]):
        for match in pattern.finditer(message):
            otp = _clean_candidate(match.group(1))
            if not otp:
                continue
            # Avoid matching years when not in OTP context.
            if priority == 10 and len(otp) == 4 and 2000 <= int(otp) <= 2099:
                continue
            return otp

    return None
