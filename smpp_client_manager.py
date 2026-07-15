import asyncio
import fcntl
import logging
import os
import struct
import sys
from datetime import datetime
from typing import Dict, Optional

from auth import generate_id
from database import get_db, init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smpp_client")

BIND_TRANSMITTER = 0x00000001
BIND_RECEIVER = 0x00000002
BIND_TRANSCEIVER = 0x00000009
BIND_RESP = {0x80000001, 0x80000002, 0x80000009}
BIND_STATUS = {
    0: "OK",
    1: "Invalid message length",
    4: "Incorrect bind status",
    5: "Already bound (close duplicate connections and retry)",
    13: "Bind failed",
    14: "Invalid password",
    15: "Invalid system ID",
}


def _bind_label(command_id: int) -> str:
    return {
        BIND_TRANSMITTER: "TX",
        BIND_RECEIVER: "RX",
        BIND_TRANSCEIVER: "TRX",
    }.get(command_id, "UNK")


class RemoteSMPPSession:
    def __init__(self, server_config: dict):
        self.config = server_config
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.connected = False
        self.bound = False
        self.seq = 1
        self.session_id: Optional[str] = None
        self.bind_type_label = "TRX"
        self._running = False

    async def disconnect(self, reason: str = ""):
        self._running = False
        self.bound = False
        self.connected = False
        if self.writer and not self.writer.is_closing():
            try:
                await self.send_pdu(0x00000006, 0, self.seq, b"")
            except Exception:
                pass
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
        self.writer = None
        self.reader = None
        self.clear_session_record(reason)

    def clear_session_record(self, reason: str = ""):
        with get_db() as conn:
            conn.execute("DELETE FROM smpp_remote_sessions WHERE server_id=?", (self.config["id"],))
            if reason:
                conn.execute(
                    "UPDATE smpp_remote_servers SET status=?, last_disconnected=?, last_error=? WHERE id=?",
                    ("disconnected", datetime.utcnow().isoformat(), reason, self.config["id"]),
                )

    def record_session(self, bind_type: str):
        self.session_id = generate_id()
        self.bind_type_label = bind_type
        with get_db() as conn:
            conn.execute("DELETE FROM smpp_remote_sessions WHERE server_id=?", (self.config["id"],))
            conn.execute(
                """INSERT INTO smpp_remote_sessions
                   (id, server_id, server_name, host, port, system_id, bind_type, status, connected_at, last_activity)
                   VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))""",
                (
                    self.session_id,
                    self.config["id"],
                    self.config.get("name", ""),
                    self.config["host"],
                    self.config["port"],
                    self.config["system_id"],
                    bind_type,
                    "active",
                ),
            )

    def touch_session(self):
        if not self.session_id:
            return
        with get_db() as conn:
            conn.execute(
                "UPDATE smpp_remote_sessions SET last_activity=datetime('now') WHERE id=?",
                (self.session_id,),
            )

    def update_status(self, status: str, error: str = ""):
        with get_db() as conn:
            now = datetime.utcnow().isoformat()
            if status == "connected":
                conn.execute(
                    "UPDATE smpp_remote_servers SET status=?, last_connected=?, last_error=NULL WHERE id=?",
                    (status, now, self.config["id"]),
                )
            elif status == "pending":
                conn.execute(
                    "UPDATE smpp_remote_servers SET status=?, last_error=NULL WHERE id=?",
                    (status, self.config["id"]),
                )
            else:
                conn.execute(
                    "UPDATE smpp_remote_servers SET status=?, last_disconnected=?, last_error=? WHERE id=?",
                    (status, now, error, self.config["id"]),
                )

    async def connect(self) -> bool:
        await self.disconnect()
        try:
            logger.info(
                "Connecting to remote SMPP %s (%s:%s) as %s [%s]...",
                self.config["name"],
                self.config["host"],
                self.config["port"],
                self.config["system_id"],
                self.config.get("bind_type", "transceiver"),
            )
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.config["host"], self.config["port"]),
                timeout=15,
            )
            self.connected = True
            self._running = True
            self.update_status("pending")
            return await self.bind_and_wait()
        except Exception as e:
            logger.error("Failed to connect to %s: %s", self.config["name"], e)
            self.update_status("failed", str(e))
            await self.disconnect(str(e))
            return False

    async def bind_and_wait(self) -> bool:
        bind_map = {
            "transceiver": BIND_TRANSCEIVER,
            "transmitter": BIND_TRANSMITTER,
            "receiver": BIND_RECEIVER,
        }
        cmd_id = bind_map.get(str(self.config.get("bind_type", "transceiver")).lower(), BIND_TRANSCEIVER)
        bind_type = _bind_label(cmd_id)

        body = (
            self.config["system_id"].encode()
            + b"\x00"
            + self.config["password"].encode()
            + b"\x00"
            + b"\x00"
            + b"\x34"
            + struct.pack("!BB", self.config.get("src_ton", 0), self.config.get("src_npi", 0))
            + b"\x00"
        )
        await self.send_pdu(cmd_id, 0, self.seq, body)
        self.seq += 1

        try:
            while self._running:
                header = await asyncio.wait_for(self.reader.readexactly(16), timeout=15)
                cmd_len, cmd_id, status, seq = struct.unpack("!IIII", header)
                body = await self.reader.readexactly(cmd_len - 16) if cmd_len > 16 else b""

                if cmd_id in BIND_RESP:
                    if status == 0:
                        self.bound = True
                        self.record_session(bind_type)
                        self.update_status("connected")
                        logger.info(
                            "Bound to %s as %s (%s)",
                            self.config["name"],
                            self.config["system_id"],
                            bind_type,
                        )
                        return True
                    msg = BIND_STATUS.get(status, f"Bind error {status}")
                    logger.error("Bind failed for %s: %s", self.config["name"], msg)
                    self.update_status("failed", msg)
                    await self.disconnect(msg)
                    return False

                if cmd_id == 0x00000015:
                    await self.send_pdu(0x80000015, 0, seq, b"")
        except asyncio.TimeoutError:
            self.update_status("failed", "Bind timeout")
            await self.disconnect("Bind timeout")
        except Exception as e:
            self.update_status("failed", str(e))
            await self.disconnect(str(e))
        return False

    async def send_heartbeat(self):
        while self._running and self.connected and self.bound:
            await asyncio.sleep(self.config.get("enquire_link_interval", 30))
            if self.bound:
                await self.send_pdu(0x00000015, 0, self.seq, b"")
                self.seq += 1
                self.touch_session()

    async def send_pdu(self, cmd_id: int, status: int, seq: int, body: bytes):
        if not self.writer:
            return
        try:
            length = 16 + len(body)
            header = struct.pack("!IIII", length, cmd_id, status, seq)
            self.writer.write(header + body)
            await self.writer.drain()
        except Exception as e:
            logger.error("Error sending PDU to %s: %s", self.config["name"], e)
            self.connected = False
            self._running = False

    async def listen(self):
        if not self.reader:
            return
        try:
            while self._running and self.connected:
                header = await self.reader.readexactly(16)
                cmd_len, cmd_id, status, seq = struct.unpack("!IIII", header)
                body = await self.reader.readexactly(cmd_len - 16) if cmd_len > 16 else b""

                if cmd_id == 0x00000015:
                    await self.send_pdu(0x80000015, 0, seq, b"")
                    self.touch_session()
                elif cmd_id == 0x00000005:
                    await self.send_pdu(0x80000005, 0, seq, b"\x00")
                    await self._process_deliver_sm(body)
                    self.touch_session()
        except asyncio.IncompleteReadError:
            logger.info("Remote SMPP connection closed: %s", self.config["name"])
        except Exception as e:
            logger.error("Connection lost for %s: %s", self.config["name"], e)
        finally:
            self.update_status("disconnected", "Connection closed")
            await self.disconnect("Connection closed")

    async def _process_deliver_sm(self, body: bytes):
        try:
            offset = 0
            while body[offset] != 0:
                offset += 1
            offset += 1
            offset += 2
            src_start = offset
            while body[offset] != 0:
                offset += 1
            src_addr = body[src_start:offset].decode("utf-8", "ignore")
            offset += 1
            offset += 2
            dst_start = offset
            while body[offset] != 0:
                offset += 1
            dst_addr = body[dst_start:offset].decode("utf-8", "ignore")
            offset += 1
            esm_class = body[offset]
            offset += 5
            _, _, data_coding, _, sm_len = body[offset : offset + 5]
            offset += 5
            raw_msg = body[offset : offset + sm_len]
            message = (
                raw_msg.decode("utf-16-be", "ignore")
                if data_coding == 8
                else raw_msg.decode("latin-1", "ignore")
            )

            if esm_class & 0x04:
                from queue_manager import queue_manager

                await queue_manager.push("dlr_queue", {"raw": message, "system_id": self.config["name"]})
                logger.info("DLR from %s: %s", self.config["name"], message[:80])
            else:
                from sms_processor import process_incoming_sms

                result = process_incoming_sms(
                    {
                        "to": dst_addr,
                        "from": src_addr,
                        "msg": message,
                        "source": f"SMPP:{self.config['name']}",
                    }
                )
                logger.info(
                    "DELIVER_SM from %s: %s->%s result=%s",
                    self.config["name"],
                    src_addr,
                    dst_addr,
                    result.get("success"),
                )
        except Exception as e:
            logger.error("DELIVER_SM parse error from %s: %s", self.config["name"], e)


class SMPPClientManager:
    def __init__(self):
        self.sessions: Dict[str, RemoteSMPPSession] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def run(self):
        logger.info("Starting SMPP Client Manager...")
        while True:
            await self.check_connections()
            await asyncio.sleep(10)

    async def check_connections(self):
        with get_db() as conn:
            servers = conn.execute(
                "SELECT * FROM smpp_remote_servers WHERE is_active=1 ORDER BY priority DESC"
            ).fetchall()

        active_ids = {s["id"] for s in servers}
        for sid, task in list(self._tasks.items()):
            if sid not in active_ids:
                session = self.sessions.get(sid)
                if session:
                    await session.disconnect("Server deactivated")
                task.cancel()
                self._tasks.pop(sid, None)
                self.sessions.pop(sid, None)

        for s in servers:
            sid = s["id"]
            session = self.sessions.get(sid)
            if session and session.connected and session.bound:
                continue
            if sid in self._tasks and not self._tasks[sid].done():
                continue
            async with self._lock:
                if sid in self._tasks and not self._tasks[sid].done():
                    continue
                if session:
                    await session.disconnect("Reconnecting")
                session = RemoteSMPPSession(dict(s))
                self.sessions[sid] = session
                self._tasks[sid] = asyncio.create_task(self.manage_session(session))

    async def manage_session(self, session: RemoteSMPPSession):
        sid = session.config["id"]
        try:
            if await session.connect():
                heartbeat = asyncio.create_task(session.send_heartbeat())
                try:
                    await session.listen()
                finally:
                    heartbeat.cancel()
        finally:
            await session.disconnect("Session ended")
            self._tasks.pop(sid, None)


def _acquire_singleton_lock() -> bool:
    lock_path = os.path.join(os.path.dirname(__file__), "data", "smpp_client.lock")
    os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    lock_fd = open(lock_path, "w")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        logger.info("Another SMPP client manager is already running; exiting.")
        return False
    lock_fd.write(str(os.getpid()))
    lock_fd.flush()
    return True


if __name__ == "__main__":
    init_db()
    if not _acquire_singleton_lock():
        sys.exit(0)
    manager = SMPPClientManager()
    asyncio.run(manager.run())
