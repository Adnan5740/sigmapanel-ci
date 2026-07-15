# SIGMAPANEL — Provider Integration Guide

This document explains how to connect your SMS provider to SIGMAPANEL.
There are three integration methods. Choose the one your provider supports.

---

## Quick Reference

| Method | Your Endpoint | Direction | When to Use |
|---|---|---|---|
| HTTP Standard | `POST http://18.234.37.54/api/webhook/sms` | Provider → You | Most HTTP providers |
| HTTP Postback | `GET http://18.234.37.54/api/webhook/postback` | Provider → You | Providers using `{{placeholders}}` |
| SMPP | `18.234.37.54:2775` | Provider → You (live stream) | Real-time SMPP providers |

---

## Method 1 — HTTP Standard Webhook

The provider calls your URL each time an SMS is delivered to one of your numbers.

### Endpoint

```
POST http://18.234.37.54/api/webhook/sms
GET  http://18.234.37.54/api/webhook/sms
```

Both POST and GET are supported. POST accepts JSON or form-encoded body. GET accepts query string parameters.

### Required Fields

| Field | Description | Example |
|---|---|---|
| `to` | Destination number (your number) | `+447700900123` |
| `from` | Sender name or number | `WhatsApp` |
| `msg` | SMS message body | `Your OTP is 482910` |

### Optional Fields

| Field | Description |
|---|---|
| `uuid` | Provider message ID (for deduplication) |
| `service` | Explicit service name (overrides auto-detect) |

### Field Aliases Accepted

SIGMAPANEL auto-maps many field name variants — you do not need to rename anything:

| Internal | Accepted aliases |
|---|---|
| `to` (destination) | `to`, `number`, `msisdn`, `recipient`, `called_number` |
| `from` (sender) | `from`, `From`, `sender`, `Cli`, `cli`, `CLI`, `sender_id`, `senderid`, `source`, `oa`, `originator` |
| `msg` (message) | `msg`, `message`, `text`, `Message`, `smstext` |

### Example — POST JSON

```bash
curl -X POST http://18.234.37.54/api/webhook/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+447700900123",
    "from": "WhatsApp",
    "msg": "Your verification code is 482910"
  }'
```

### Example — POST Form

```bash
curl -X POST http://18.234.37.54/api/webhook/sms \
  -d "to=%2B447700900123&from=WhatsApp&msg=Your+OTP+is+482910"
```

### Example — GET Query String

```
http://18.234.37.54/api/webhook/sms?to=%2B447700900123&from=WhatsApp&msg=Your+OTP+is+482910
```

### Success Response

```json
{
  "status": "ok",
  "message": "processed",
  "smsId": "a1b2c3d4e5f6",
  "number": "+447700900123",
  "otp": "482910",
  "service": "WhatsApp"
}
```

### Error Response

```json
{
  "status": "failed",
  "error": "Missing required field(s): to",
  "missingFields": ["to"]
}
```

---

## Method 2 — HTTP Custom Postback

For providers that use their own template variables (e.g. `{{called_number}}`, `{{smstext}}`).
This endpoint is **IP-restricted** — only requests from your provider's IP are accepted.

### Endpoint

```
POST http://18.234.37.54/api/webhook/postback
GET  http://18.234.37.54/api/webhook/postback
```

### Provider IP Whitelist

Currently whitelisted: `51.38.107.49`

If your provider uses a different IP, contact us to add it.

### Field Mapping

| Provider Sends | Mapped To | Description |
|---|---|---|
| `called_number` | destination number | Your SMS number |
| `senderid` | sender / service name | Who sent the SMS |
| `smstext` | message body | The SMS content |
| `smsid` or `smsid2` | message UUID | Provider's message ID |
| `smstime` | — | Delivery timestamp (logged) |
| `payout` | — | Provider payout hint (ignored, range rate is used) |

### Postback URL to Give Your Provider

Copy this URL exactly and paste it into your provider's postback/callback configuration:

```
http://18.234.37.54/api/webhook/postback?called_number={{called_number}}&senderid={{senderid}}&smstext={{smstext}}&smsid={{smsid}}
```

### Example — cURL

```bash
curl "http://18.234.37.54/api/webhook/postback?called_number=%2B447700900123&senderid=Telegram&smstext=Your+OTP+is+391827&smsid=msg-abc123"
```

### Response

```json
{"status": "ok"}
```
or
```json
{"status": "failed"}
```

---

## Method 3 — SMPP (Real-time SMS Stream)

SMPP is a direct TCP connection that delivers SMS in real time as they arrive.
Your provider connects to our SMPP server and pushes `DELIVER_SM` PDUs for each SMS.

### Connection Details

| Parameter | Value |
|---|---|
| **Host** | `18.234.37.54` |
| **Port** | `2775` |
| **Protocol** | SMPP 3.4 |
| **Bind Mode** | `transceiver` (recommended) or `receiver` |
| **System ID** | `iprn_client` |
| **Password** | `StrongPassword2026` |
| **System Type** | *(leave empty)* |
| **Interface Version** | `0x34` (3.4) |

### DELIVER_SM PDU Fields

| Field | What to Send | Example |
|---|---|---|
| `source_addr` | Service/platform name | `WhatsApp` |
| `source_addr_ton` | `5` for alphanumeric, `1` for numeric | `5` |
| `destination_addr` | Your phone number (international) | `+447700900123` |
| `short_message` | SMS body | `Your OTP is 482910` |
| `data_coding` | `0` = GSM-7 ASCII, `8` = UCS-2 Unicode | `0` |

### Throughput

Default limit: **10 messages/second** per session.
Contact us to increase the limit for your account.

### Heartbeat

Send `ENQUIRE_LINK` (command `0x00000015`) every 30 seconds to keep the session alive.
The server will respond with `ENQUIRE_LINK_RESP`.

### Kannel Configuration Example

```
group = smsc
smsc = smpp
smsc-id = sigmapanel
host = 18.234.37.54
port = 2775
smsc-username = iprn_client
smsc-password = StrongPassword2026
system-type = ""
transceiver-mode = true
enquire-link-interval = 30
```

### Node.js Example (smpp package)

```javascript
const smpp = require('smpp');

const session = smpp.connect({
  host: '18.234.37.54',
  port: 2775
});

session.bind_transceiver({
  system_id: 'iprn_client',
  password:  'StrongPassword2026'
}, (pdu) => {
  if (pdu.command_status === 0) {
    console.log('Bound to SIGMAPANEL SMPP server');
  }
});

session.on('deliver_sm', (pdu) => {
  const from   = pdu.source_addr;
  const to     = pdu.destination_addr;
  const text   = pdu.short_message.message;
  console.log(`SMS: ${from} → ${to}: ${text}`);
  session.send(pdu.response()); // Always ACK
});
```

### Python Example (smpplib)

```python
import smpplib.client
import smpplib.consts

client = smpplib.client.Client('18.234.37.54', 2775)

def message_received(pdu):
    print('From:', pdu.source_addr)
    print('To:  ', pdu.destination_addr)
    print('SMS: ', pdu.short_message)

client.set_message_received_handler(message_received)
client.connect()
client.bind_transceiver(
    system_id='iprn_client',
    password='StrongPassword2026'
)
client.listen()
```

---

## How SIGMAPANEL Processes Incoming SMS

Regardless of integration method, every SMS goes through the same pipeline:

```
Provider sends SMS
        ↓
Field normalisation (aliases mapped, number formatted to E.164)
        ↓
Number lookup (is this number in your inventory?)
        ↓
Service detection (WhatsApp, Telegram, Google, etc. — auto from sender name)
        ↓
OTP extraction (6-8 digit code pulled from message body)
        ↓
Business rules (daily OTP limit check, SMS receive limit check)
        ↓
Saved to database (visible in SMS Reports within 1 second)
        ↓
Payout credited to assigned reseller account
```

---

## Testing Your Integration

Before going live, test your setup from the panel:

1. Go to **HTTP Providers → Test Endpoint**
2. Enter a number from your inventory, a sender name, and a message
3. Click **Send Test Push**
4. Check **SMS Reports** — the message should appear instantly

For SMPP, you can verify your connection is active under **SMPP Settings → Remote Servers**.

---

## Support

If you have issues connecting, provide:
- Your provider name and integration method
- Your server's outbound IP address (for SMPP/postback whitelisting)
- Any error codes received

For SMPP `ESME_RBINDFAIL` (status 13): your IP may need to be whitelisted. Contact us with your outbound IP.
