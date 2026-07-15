import sqlite3
import os
from contextlib import contextmanager

try:
    import fcntl
except ImportError:  # pragma: no cover - non-Linux fallback
    fcntl = None

DB_PATH = os.environ.get("DATABASE_URL", "data/sigmapanel.db")

def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    return DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    lock_file = None
    try:
        if fcntl is not None:
            lock_path = get_db_path() + ".init.lock"
            os.makedirs(os.path.dirname(lock_path) or ".", exist_ok=True)
            lock_file = open(lock_path, "w")
            fcntl.flock(lock_file, fcntl.LOCK_EX)

        with get_db() as conn:
            conn.executescript(SCHEMA)
            _migrate(conn)
            _seed(conn)
    finally:
        if lock_file is not None:
            fcntl.flock(lock_file, fcntl.LOCK_UN)
            lock_file.close()

def _ensure_indexes(conn):
    """Create performance indexes for large datasets."""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_sms_received_at ON sms_received(received_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_sms_number ON sms_received(number)",
        "CREATE INDEX IF NOT EXISTS idx_sms_assigned_to ON sms_received(assigned_to)",
        "CREATE INDEX IF NOT EXISTS idx_sms_username ON sms_received(username)",
        "CREATE INDEX IF NOT EXISTS idx_sms_user_id ON sms_received(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_sms_received_at_user ON sms_received(received_at DESC, username)",
        "CREATE INDEX IF NOT EXISTS idx_numbers_assigned ON numbers(assigned_to)",
        "CREATE INDEX IF NOT EXISTS idx_numbers_range ON numbers(range_id)",
        "CREATE INDEX IF NOT EXISTS idx_numbers_status ON numbers(status)",
        "CREATE INDEX IF NOT EXISTS idx_profit_log_user ON profit_log(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_ranges_real_name ON ranges(real_range_name)",
        "CREATE INDEX IF NOT EXISTS idx_ranges_provider ON ranges(provider_name)",
    ]
    for idx in indexes:
        try:
            conn.execute(idx)
        except Exception:
            pass

def _migrate(conn):
    def add_col(table, col, typedef):
        try:
            cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            if col not in cols:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typedef}")
        except Exception: pass

    add_col("ranges", "daily_otp_limit", "INTEGER DEFAULT 0")
    add_col("ranges", "otp_limit_enabled", "INTEGER DEFAULT 0")
    add_col("ranges", "otp_count_today", "INTEGER DEFAULT 0")
    add_col("ranges", "otp_count_date", "TEXT")
    add_col("ranges", "sms_receive_limit", "INTEGER DEFAULT 0")
    add_col("ranges", "real_range_name", "TEXT")
    add_col("ranges", "provider_name", "TEXT")
    add_col("ranges", "weekly_rate", "REAL")
    add_col("ranges", "monthly_rate", "REAL")
    add_col("ranges", "default_payout", "REAL")
    add_col("users", "failed_login_attempts", "INTEGER DEFAULT 0")
    add_col("users", "locked_until", "TEXT")
    add_col("users", "avatar_url", "TEXT")
    add_col("users", "timezone", "TEXT DEFAULT 'UTC'")
    add_col("users", "language", "TEXT DEFAULT 'en'")
    add_col("users", "api_token", "TEXT")
    add_col("registration_requests", "password", "TEXT")
    add_col("registration_requests", "full_name", "TEXT")
    add_col("registration_requests", "phone", "TEXT")
    add_col("registration_requests", "teams_id", "TEXT")
    add_col("registration_requests", "country", "TEXT")
    add_col("registration_requests", "profession", "TEXT")
    add_col("registration_requests", "proof_filename", "TEXT")
    add_col("news", "created_by_role", "TEXT")
    add_col("support_tickets", "reply_by", "TEXT")
    add_col("support_tickets", "reply_by_role", "TEXT")
    add_col("smpp_remote_servers", "status", "TEXT DEFAULT 'pending'")
    add_col("smpp_remote_servers", "throughput_limit", "INTEGER DEFAULT 10")
    add_col("smpp_remote_servers", "src_ton", "INTEGER DEFAULT 1")
    add_col("smpp_remote_servers", "src_npi", "INTEGER DEFAULT 1")
    add_col("smpp_remote_servers", "dst_ton", "INTEGER DEFAULT 1")
    add_col("smpp_remote_servers", "dst_npi", "INTEGER DEFAULT 1")
    add_col("smpp_remote_servers", "enquire_link_interval", "INTEGER DEFAULT 30")
    add_col("smpp_remote_servers", "dlr_enabled", "INTEGER DEFAULT 1")
    add_col("smpp_remote_servers", "allowed_ips", "TEXT")
    add_col("smpp_remote_servers", "last_connected", "TEXT")
    add_col("smpp_remote_servers", "last_disconnected", "TEXT")
    add_col("smpp_remote_servers", "last_error", "TEXT")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS smpp_remote_sessions (
            id TEXT PRIMARY KEY,
            server_id TEXT NOT NULL,
            server_name TEXT,
            host TEXT,
            port INTEGER,
            system_id TEXT,
            bind_type TEXT,
            status TEXT DEFAULT 'active',
            connected_at TEXT DEFAULT (datetime('now')),
            last_activity TEXT DEFAULT (datetime('now'))
        )
    """)
    # providers table — add all columns added in full schema
    add_col("providers", "api_token", "TEXT")
    add_col("providers", "api_method", "TEXT DEFAULT 'POST'")
    add_col("providers", "field_from", "TEXT DEFAULT 'from'")
    add_col("providers", "field_uuid", "TEXT DEFAULT 'uuid'")
    add_col("providers", "smpp_system_type", "TEXT DEFAULT ''")
    add_col("providers", "smpp_service_type", "TEXT")
    add_col("providers", "smpp_source_ton", "INTEGER DEFAULT 1")
    add_col("providers", "smpp_source_npi", "INTEGER DEFAULT 1")
    add_col("providers", "smpp_dest_ton", "INTEGER DEFAULT 1")
    add_col("providers", "smpp_dest_npi", "INTEGER DEFAULT 1")
    add_col("providers", "smpp_data_coding", "INTEGER DEFAULT 0")
    add_col("providers", "notes", "TEXT")
    add_col("transactions", "payment_id", "TEXT")
    add_col("payout_requests", "payment_provider_id", "TEXT")
    add_col("allocations", "revoked_at", "TEXT")
    add_col("sms_received", "username", "TEXT")
    add_col("sms_received", "user_id", "TEXT")
    add_col("sms_received", "ip_address", "TEXT")
    _ensure_indexes(conn)

def _seed(conn):
    from auth import hash_password
    # Seed writes must be idempotent because worker.py, smpp_server.py, and
    # the API process can all call init_db() during the same container start.
    conn.execute(
        "INSERT OR IGNORE INTO users (id, username, password, role, status) VALUES ('admin_root', 'admin', ?, 'admin', 'active')",
        (hash_password('admin123'),),
    )
    conn.execute(
        "INSERT OR IGNORE INTO users (id, username, password, role, status) VALUES ('test_root', 'test123', ?, 'test_user', 'active')",
        (hash_password('test123'),),
    )
    conn.execute(
        "INSERT OR IGNORE INTO smpp_server_accounts (id, system_id, password, status, throughput_limit) VALUES ('iprn_acc', 'iprn_client', 'StrongPassword2026', 'active', 20)"
    )
    conn.execute(
        "INSERT OR IGNORE INTO smpp_remote_servers (id, name, host, port, system_id, password, bind_type, is_active, priority) VALUES ('smpp_iprn', 'IPRN-Primary', '203.161.58.20', 2776, 'agt_8ed0ed30b0', '4d3d21762724dca7e3c27675', 'transceiver', 1, 1)"
    )

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'reseller',
    status TEXT DEFAULT 'active',
    parent_id TEXT,
    full_name TEXT,
    phone TEXT,
    country TEXT,
    balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    self_allocation_limit INTEGER DEFAULT 100,
    self_allocation_limit_enabled INTEGER DEFAULT 0,
    api_token TEXT UNIQUE,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS ranges (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    real_range_name TEXT,
    provider_name TEXT,
    number_prefix TEXT,
    country_name TEXT,
    rate REAL DEFAULT 0.05,
    profit_margin REAL DEFAULT 100,
    daily_otp_limit INTEGER DEFAULT 0,
    otp_limit_enabled INTEGER DEFAULT 0,
    sms_receive_limit INTEGER DEFAULT 0,
    otp_count_today INTEGER DEFAULT 0,
    otp_count_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS numbers (
    id TEXT PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    range_id TEXT,
    range_name TEXT,
    country_name TEXT,
    service TEXT,
    status TEXT DEFAULT 'active',
    assigned_to TEXT,
    assigned_at TEXT,
    rate REAL DEFAULT 0.05,
    profit_margin REAL DEFAULT 100,
    total_sms INTEGER DEFAULT 0,
    last_sms_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sms_received (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    sender TEXT,
    recipient TEXT,
    service TEXT,
    otp TEXT,
    message TEXT NOT NULL,
    assigned_to TEXT,
    is_alphanumeric_cli INTEGER DEFAULT 0,
    range_name TEXT,
    profit REAL DEFAULT 0,
    received_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    tx_type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_before REAL DEFAULT 0,
    balance_after REAL DEFAULT 0,
    note TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payout_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    wallet_address TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_server_accounts (
    id TEXT PRIMARY KEY,
    system_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    company TEXT,
    ip_whitelist TEXT,
    throughput_limit INTEGER DEFAULT 10,
    max_sessions INTEGER DEFAULT 5,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_server_sessions (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    ip_address TEXT,
    bind_type TEXT,
    status TEXT DEFAULT 'connected',
    connected_at TEXT DEFAULT (datetime('now')),
    last_activity TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_server_logs (
    id TEXT PRIMARY KEY,
    system_id TEXT,
    ip_address TEXT,
    event_type TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_failed_packets (
    id TEXT PRIMARY KEY,
    ip_address TEXT,
    packet_type TEXT,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'http',
    status TEXT DEFAULT 'active',
    api_url TEXT,
    api_token TEXT,
    api_method TEXT DEFAULT 'POST',
    field_to TEXT DEFAULT 'to',
    field_from TEXT DEFAULT 'from',
    field_msg TEXT DEFAULT 'msg',
    field_uuid TEXT DEFAULT 'uuid',
    smpp_host TEXT,
    smpp_port INTEGER DEFAULT 2775,
    smpp_system_id TEXT,
    smpp_password TEXT,
    smpp_system_type TEXT DEFAULT '',
    smpp_service_type TEXT,
    smpp_source_ton INTEGER DEFAULT 1,
    smpp_source_npi INTEGER DEFAULT 1,
    smpp_dest_ton INTEGER DEFAULT 1,
    smpp_dest_npi INTEGER DEFAULT 1,
    smpp_data_coding INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_remote_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 2775,
    system_id TEXT NOT NULL,
    password TEXT NOT NULL,
    bind_type TEXT DEFAULT 'transceiver',
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    ip_address TEXT,
    event_type TEXT,
    severity TEXT,
    action_taken TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_ips (
    id TEXT PRIMARY KEY,
    ip_address TEXT UNIQUE NOT NULL,
    reason TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    number_id TEXT,
    sms_received_id TEXT,
    profit_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    user_id TEXT,
    UNIQUE(setting_key, user_id)
);

CREATE TABLE IF NOT EXISTS registration_requests (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    password TEXT,
    full_name TEXT,
    phone TEXT,
    teams_id TEXT,
    country TEXT,
    profession TEXT,
    payment_method TEXT,
    payment_detail TEXT,
    proof_filename TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blacklisted_apps (
    id TEXT PRIMARY KEY,
    app_name TEXT NOT NULL,
    pattern TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_username TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    target_role TEXT,
    created_by TEXT,
    created_by_role TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_reads (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_by_role TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    reply TEXT,
    reply_by TEXT,
    reply_by_role TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    range_name TEXT,
    number_id TEXT,
    status TEXT DEFAULT 'active',
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

"""
