"""Service detection from SMS sender/CLI and message content."""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

from service_catalog import CORE_SERVICE_ALIASES, COMMON_SERVICE_NAMES, REGIONAL_SERVICE_NAMES

_SEPARATOR_RE = re.compile(r"[^a-z0-9]+")
_SPACE_RE = re.compile(r"\s+")
_ALNUM_SENDER_RE = re.compile(r"^[a-z0-9]{2,14}$", re.I)

# Common OTP templates: "Your Google code is 123456", "Facebook login code: 123456"
_OTP_MESSAGE_PATTERNS = (
    re.compile(r"\byour\s+([a-z0-9][a-z0-9 .&-]{1,40}?)\s+(?:verification\s+)?(?:code|otp|pin|passcode)\b", re.I),
    re.compile(r"\b([a-z0-9][a-z0-9 .&-]{1,40}?)\s+(?:verification|login|security|auth(?:entication)?)\s+(?:code|otp|pin)\b", re.I),
    re.compile(r"\b(?:code|otp|pin)\s+(?:for|from|to)\s+([a-z0-9][a-z0-9 .&-]{1,40}?)\b", re.I),
    re.compile(r"\buse\s+([a-z0-9][a-z0-9 .&-]{1,40}?)\s+(?:code|otp|pin)\b", re.I),
)


def _normalize_text(raw: object) -> str:
    if raw is None:
        return ""
    text = str(raw).strip()
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.casefold()
    text = text.replace("&", " and ")
    text = _SEPARATOR_RE.sub(" ", text)
    return _SPACE_RE.sub(" ", text).strip()


def _display_name(name: str) -> str:
    known = {
        "okx": "OKX", "vk": "VK", "line": "LINE", "aws": "AWS", "ibm": "IBM", "ea": "EA", "ups": "UPS", "usps": "USPS",
        "dhl": "DHL", "hbo": "HBO", "stc": "STC", "mtn": "MTN", "opay": "OPay", "bkash": "bKash",
        "gcash": "GCash", "gopay": "GoPay", "shopeepay": "ShopeePay", "m pesa": "M-Pesa",
    }
    key = _normalize_text(name)
    if key in known:
        return known[key]
    return " ".join(part.upper() if len(part) <= 3 and part.isalpha() else part.capitalize() for part in key.split())


def _alias_variants(name: str) -> set[str]:
    normalized = _normalize_text(name)
    if not normalized:
        return set()
    variants = {normalized}
    compact = normalized.replace(" ", "")
    if compact != normalized:
        variants.add(compact)
    if " and " in normalized:
        variants.add(normalized.replace(" and ", " "))
    return variants


@lru_cache(maxsize=1)
def _compiled_aliases() -> tuple[tuple[str, str, re.Pattern], ...]:
    alias_map: dict[str, str] = {}

    for alias, canonical in CORE_SERVICE_ALIASES.items():
        for variant in _alias_variants(alias):
            alias_map[variant] = canonical

    for name in (*COMMON_SERVICE_NAMES, *REGIONAL_SERVICE_NAMES):
        canonical = CORE_SERVICE_ALIASES.get(_normalize_text(name), _display_name(name))
        for variant in _alias_variants(name):
            alias_map.setdefault(variant, canonical)

    generated: dict[str, str] = {}
    for alias, canonical in alias_map.items():
        if len(alias) >= 3:
            generated[f"{alias} otp"] = canonical
            generated[f"{alias} code"] = canonical
            generated[f"{alias} verify"] = canonical
    alias_map.update(generated)

    aliases = []
    for alias, canonical in alias_map.items():
        if len(alias) < 2:
            continue
        pattern = re.compile(rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])")
        aliases.append((alias, canonical, pattern))

    return tuple(sorted(aliases, key=lambda item: len(item[0]), reverse=True))


@lru_cache(maxsize=1)
def _exact_alias_lookup() -> dict[str, str]:
    lookup: dict[str, str] = {}
    for alias, canonical, _pattern in _compiled_aliases():
        compact = alias.replace(" ", "")
        lookup.setdefault(alias, canonical)
        if compact:
            lookup.setdefault(compact, canonical)
    return lookup


def supported_service_alias_count() -> int:
    return len(_compiled_aliases())


def _lookup_alias(text: str) -> str | None:
    normalized = _normalize_text(text)
    if not normalized:
        return None
    lookup = _exact_alias_lookup()
    compact = normalized.replace(" ", "")
    return lookup.get(normalized) or lookup.get(compact)


def _detect_in_text(raw: object, *, compact_sender: bool = False) -> str | None:
    normalized = _normalize_text(raw)
    if not normalized:
        return None

    candidates = [normalized]
    if compact_sender:
        compact = normalized.replace(" ", "")
        if compact and compact != normalized:
            candidates.append(compact)

    for candidate in candidates:
        exact = _lookup_alias(candidate)
        if exact:
            return exact

    for candidate in candidates:
        for _alias, canonical, pattern in _compiled_aliases():
            if pattern.search(candidate):
                return canonical
    return None


def _detect_from_otp_message(message: str | None) -> str | None:
    if not message:
        return None
    for pattern in _OTP_MESSAGE_PATTERNS:
        match = pattern.search(message)
        if not match:
            continue
        fragment = match.group(1).strip(" .:-")
        result = _detect_in_text(fragment)
        if result:
            return result
        exact = _lookup_alias(fragment)
        if exact:
            return exact
    return None


def _detect_alphanumeric_sender(raw: object) -> str | None:
    if raw is None:
        return None
    sender = str(raw).strip()
    if not sender or sender.startswith("+") or sender.isdigit():
        return None
    compact = re.sub(r"[^a-zA-Z0-9]", "", sender)
    if not compact or not _ALNUM_SENDER_RE.match(compact):
        return None
    return _lookup_alias(compact) or _lookup_alias(sender)


def detect_service(
    from_field: str | None = None,
    service_field: str | None = None,
    message: str | None = None,
    cli_field: str | None = None,
) -> str | None:
    """Return a canonical service name from explicit service, CLI/sender, or message."""
    if service_field:
        result = _detect_in_text(service_field, compact_sender=True)
        if result:
            return result

    for candidate in (cli_field, from_field):
        if not candidate:
            continue
        result = _detect_alphanumeric_sender(candidate)
        if result:
            return result
        result = _detect_in_text(candidate, compact_sender=True)
        if result:
            return result

    result = _detect_from_otp_message(message)
    if result:
        return result

    result = _detect_in_text(message)
    if result:
        return result
    return None
