"""SMS Business Logic Engine - Handles Limits and Persistence"""
from database import get_db
from phone_utils import normalize_phone_number
from otp_extractor import extract_otp
from service_detector import detect_service
from payout_utils import calculate_sms_payout
from auth import generate_id
from datetime import datetime
import logging

logger = logging.getLogger("sms_processor")

def _log_sms_failure(detail: str, ip_address: str = None):
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO security_events (id, ip_address, event_type, severity, action_taken, detail)
                   VALUES (?, ?, 'SMS_FAILED', 'warning', 'rejected', ?)""",
                (generate_id(), ip_address, detail)
            )
    except Exception as exc:
        logger.error(f"Failed to log SMS security event: {exc}")

def _payload_value(payload: dict, *names: str):
    for name in names:
        value = payload.get(name)
        if value not in (None, ""):
            return value
    lowered = {str(k).lower(): v for k, v in payload.items()}
    for name in names:
        value = lowered.get(name.lower())
        if value not in (None, ""):
            return value
    return None

def process_incoming_sms(payload: dict):
    """Core logic to process incoming SMS and save to DB with limit enforcement."""
    number = _payload_value(payload, 'to', 'number', 'msisdn', 'recipient')
    cli = _payload_value(payload, 'Cli', 'cli', 'CLI', 'sender_id', 'source', 'oa', 'originator')
    from_field = _payload_value(payload, 'from', 'From', 'sender')
    sender = from_field or cli or ""
    message = _payload_value(payload, 'msg', 'message', 'text', 'Message') or ""

    missing = []
    if not number:
        missing.append('to')
    if not message:
        missing.append('msg/message')
    if missing:
        detail = f"Missing required field(s): {', '.join(missing)}. Received keys: {', '.join(sorted(map(str, payload.keys())))}"
        _log_sms_failure(detail, payload.get('ip_address'))
        return {'success': False, 'error': detail, 'missingFields': missing}

    normalized_number = normalize_phone_number(number)
    if not normalized_number:
        _log_sms_failure(f"Invalid number format: {number}", payload.get('ip_address'))
        return {'success': False, 'error': 'Invalid number format'}

    # Business Logic: Service Detection & OTP Extraction
    is_alpha = (sender and not sender.replace('+', '').isdigit())
    # Prefer the alphabetic/named value between cli and from_field as the
    # service hint — providers often put the service name in Cli (e.g.
    # "AmericanExpress") while from/sender is a numeric address.
    def _is_named(v): return bool(v) and not str(v).lstrip('+').isdigit()
    service_hint = cli if _is_named(cli) and not _is_named(from_field) else (from_field or cli)
    service = detect_service(from_field=service_hint, service_field=_payload_value(payload, 'service', 'app'), message=message, cli_field=cli or from_field)
    otp = extract_otp(message)
    
    with get_db() as conn:
        # 1. Resolve Number & Range
        num_row = conn.execute("SELECT * FROM numbers WHERE number = ?", (normalized_number,)).fetchone()
        
        if not num_row:
            profit = 0.0
            range_id = range_name = assigned_to = None
        else:
            range_id = num_row['range_id']
            range_name = num_row['range_name']
            assigned_to = num_row['assigned_to']
            profit = calculate_sms_payout(num_row)
        
        otp_limit_exceeded = False

        # 2a. BUSINESS RULE: SMS Receive Limit Per Number
        if num_row and range_id:
            rng_limit = conn.execute("SELECT sms_receive_limit FROM ranges WHERE id=?", (range_id,)).fetchone()
            if rng_limit and rng_limit['sms_receive_limit'] and rng_limit['sms_receive_limit'] > 0:
                num_sms_count = num_row['total_sms'] or 0
                if num_sms_count >= rng_limit['sms_receive_limit']:
                    profit = 0.0
                    logger.info(f"SMS receive limit reached for number {normalized_number}. Payout set to 0.")

        # 2. BUSINESS RULE: Daily OTP Limit Per Range
        if otp and range_id and num_row:
            rng = conn.execute("SELECT id, daily_otp_limit, otp_limit_enabled, otp_count_today, otp_count_date FROM ranges WHERE id = ?", (range_id,)).fetchone()
            if rng:
                today = datetime.utcnow().strftime('%Y-%m-%d')
                count = rng['otp_count_today']
                if rng['otp_count_date'] != today:
                    count = 0 # Reset for new day

                if rng['otp_limit_enabled'] and rng['daily_otp_limit'] > 0:
                    if count >= rng['daily_otp_limit']:
                        otp_limit_exceeded = True
                        profit = 0.0
                        logger.info(f"OTP Limit reached for range {range_id}. Setting profit to 0.")

                # Increment OTP counter for range
                conn.execute("UPDATE ranges SET otp_count_today = ?, otp_count_date = ? WHERE id = ?", (count + 1, today, range_id))

        # 3. Persistence
        sms_id = generate_id()
        now = datetime.utcnow().isoformat()
        
        # Get user_id for the assigned_to username
        user_id = None
        if assigned_to:
            user_row = conn.execute("SELECT id FROM users WHERE username = ?", (assigned_to,)).fetchone()
            user_id = user_row['id'] if user_row else None
        
        conn.execute(
            """INSERT INTO sms_received (id, number, sender, recipient, service, otp, message, assigned_to, username, user_id, is_alphanumeric_cli, range_name, profit, received_at, ip_address)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sms_id, normalized_number, sender, _payload_value(payload, 'recipient', 'to'), service, otp, message,
             assigned_to, assigned_to, user_id, 1 if is_alpha else 0, range_name, profit, now, payload.get('ip_address'))
        )
        
        # Update number activity
        conn.execute("UPDATE numbers SET total_sms = total_sms + 1, last_sms_at = ?, service = COALESCE(?, service) WHERE number = ?",
                     (now, service, normalized_number))
        
        # Log profit to ledger if applicable
        if profit > 0 and assigned_to:
            user = conn.execute("SELECT id FROM users WHERE username = ?", (assigned_to,)).fetchone()
            if user:
                conn.execute("INSERT INTO profit_log (id, user_id, number_id, sms_received_id, profit_amount) VALUES (?, ?, ?, ?, ?)",
                             (generate_id(), user['id'], num_row['id'] if num_row else None, sms_id, profit))

    return {'success': True, 'smsId': sms_id, 'number': normalized_number, 'sender': sender, 'service': service, 'otp': otp}
