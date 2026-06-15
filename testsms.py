"""Test script for SIGMAPANEL HTTP webhook and SMPP client.

Run after starting the application (entrypoint.sh). It:
1. Sends a sample SMS payload to the HTTP webhook endpoint.
2. Connects to the local SMPP server and submits an SMS via the client manager.
"""
import asyncio, json, time
import httpx, itertools, sys, random, string

# -------------------------------------------------------------------
# 1. HTTP webhook test
# -------------------------------------------------------------------
async def test_http():
    base_url = "https://sigmapanel.up.railway.app/api/webhook/receive"
    # Format 1 – generic (number/message)
    payload1 = {"to": "+1234567890", "message": "Your code is 123456", "cli": "whatsapp", " sms_id":"id"}
    # Format 2 – CLI style (to/msg) plus optional uuid field
    payload2 = {"to": "+1234567890", "msg": "Your code is 654321", "cli": "google", "uuid": "demo-uuid-001"}
    async with httpx.AsyncClient() as client:
        for idx, payload in enumerate([payload1, payload2], start=1):
            label = f"Payload {idx}"
            # JSON POST with spinner
            print(f"{label} – Connecting…")
            spinner = itertools.cycle(['|', '/', '-', '\\'])
            task = asyncio.create_task(client.post(base_url, json=payload, timeout=10))
            while not task.done():
                sys.stdout.write(next(spinner))
                sys.stdout.flush()
                await asyncio.sleep(0.1)
                sys.stdout.write('\b')
            resp_json = await task
            print(f"🟢 {label} JSON POST status:", resp_json.status_code)
            try:
                print("Response JSON:", resp_json.json())
            except Exception:
                print("Raw response:", resp_json.text)
            # Form‑urlencoded POST with spinner
            print(f"{label} – Sending form…")
            spinner = itertools.cycle(['|', '/', '-', '\\'])
            task = asyncio.create_task(client.post(base_url, data=payload, timeout=10))
            while not task.done():
                sys.stdout.write(next(spinner))
                sys.stdout.flush()
                await asyncio.sleep(0.1)
                sys.stdout.write('\b')
            resp_form = await task
            print(f"🔵 {label} Form POST status:", resp_form.status_code)
            try:
                print("Response JSON:", resp_form.json())
            except Exception:
                print("Raw response:", resp_form.text)
            # GET request with spinner
            print(f"{label} – Retrieving…")
            spinner = itertools.cycle(['|', '/', '-', '\\'])
            task = asyncio.create_task(client.get(base_url, params=payload, timeout=10))
            while not task.done():
                sys.stdout.write(next(spinner))
                sys.stdout.flush()
                await asyncio.sleep(0.1)
                sys.stdout.write('\b')
            resp_get = await task
            print(f"🟡 {label} GET status:", resp_get.status_code)
            try:
                print("Response JSON:", resp_get.json())
            except Exception:
                print("Raw response:", resp_get.text)

# -------------------------------------------------------------------
# 2. SMPP client test
# -------------------------------------------------------------------
async def test_sMPP():
    from smpp_client_manager import RemoteSMPPSession
    cfg = {
        "host": "127.0.0.1",
        "port": 2775,
        "system_id": "iprn_client",
        "password": "StrongPassword2026",
        "bind_type": "transceiver",
        "name": "local_test",
    }
    session = RemoteSMPPSession(cfg)
    if await session.connect():
        ok = await session.submit_sm(
            source_addr="+1234567890",
            dest_addr="+1987654321",
            short_message="Test OTP 999999"
        )
        print("SMPP submit_sm result:", ok)
    else:
        print("Failed to connect to SMPP server")

async def main():
    # give services a moment to start
    await asyncio.sleep(2)
    await test_http()
    await test_sMPP()

if __name__ == "__main__":
    asyncio.run(main())
