import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_URL", "data/sigmapanel.db")

def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    return DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
        _seed(conn)

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
    add_col("users", "failed_login_attempts", "INTEGER DEFAULT 0")
    add_col("users", "locked_until", "TEXT")
    add_col("users", "api_token", "TEXT")
    add_col("registration_requests", "password", "TEXT")
    add_col("registration_requests", "full_name", "TEXT")
    add_col("registration_requests", "phone", "TEXT")
    add_col("registration_requests", "teams_id", "TEXT")
    add_col("registration_requests", "country", "TEXT")
    add_col("registration_requests", "profession", "TEXT")
    add_col("registration_requests", "proof_filename", "TEXT")

def _seed(conn):
    from auth import hash_password
    # Default Admin
    if not conn.execute("SELECT id FROM users WHERE username='admin'").fetchone():
        conn.execute("INSERT INTO users (id, username, password, role, status) VALUES ('admin_root', 'admin', ?, 'admin', 'active')",
                     (hash_password('admin123'),))
    # Test User
    if not conn.execute("SELECT id FROM users WHERE username='test123'").fetchone():
        conn.execute("INSERT INTO users (id, username, password, role, status) VALUES ('test_root', 'test123', ?, 'test_user', 'active')",
                     (hash_password('test123'),))
    # Seeding requested SMPP provider account
    if not conn.execute("SELECT id FROM smpp_server_accounts WHERE system_id='iprn_client'").fetchone():
        conn.execute("INSERT INTO smpp_server_accounts (id, system_id, password, status, throughput_limit) VALUES ('iprn_acc', 'iprn_client', 'StrongPassword2026', 'active', 20)")

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
    locked_until TEXT
);

CREATE TABLE IF NOT EXISTS ranges (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    number_prefix TEXT,
    country_name TEXT,
    rate REAL DEFAULT 0.05,
    profit_margin REAL DEFAULT 50,
    daily_otp_limit INTEGER DEFAULT 0,
    otp_limit_enabled INTEGER DEFAULT 0,
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
    profit_margin REAL DEFAULT 50,
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
    field_to TEXT DEFAULT 'to',
    field_msg TEXT DEFAULT 'msg',
    smpp_host TEXT,
    smpp_port INTEGER DEFAULT 2775,
    smpp_system_id TEXT,
    smpp_password TEXT,
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

CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    wallet_address TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""
