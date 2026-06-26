# SIGMAPANEL CI

SIGMAPANEL CI is a FastAPI-based SMS OTP management panel for telecom-style number inventory, SMS intake, range management, payout tracking, allocation workflows, SMPP monitoring, support tickets, announcements, audit logs, and role-based administration.

Repository: https://github.com/Adnan5740/sigmapanel-ci

## Overview

The panel is built as a single-page application served by a FastAPI backend. It is designed around role-based control:

- **Admin**: full system control across users, ranges, numbers, SMS, payouts, settings, audit logs, support, notifications, exports, providers, and SMPP tools.
- **Manager**: operational management for assigned reseller/client accounts, allocations, SMS review, payout review, support, announcements, and range operations where permitted.
- **Reseller**: manages own numbers, clients, self allocation, payouts, support, and profile/API access.
- **Sub-reseller / Client**: receives assigned numbers, views SMS, payouts, support, and profile/API access.
- **Test user**: isolated test number/SMS workflows.

## Key Features

### Admin and Manager Control Center

- View, search, filter, inspect, and manage users.
- Approve or reject registration requests.
- Activate, suspend, or revoke accounts within permission scope.
- Inspect user profiles, login status, account history, activity summaries, assigned numbers, recent SMS, payouts, allocations, and audit logs.
- Review global SMS traffic, delivery logs, failed SMS events, service detection results, and live OTP feeds.
- Manage number ranges, live numbers, test numbers, allocation history, and revocation tools.
- Bulk allocate numbers across ranges.
- Revoke numbers by user, range, or globally where permitted.
- Review and approve/reject payout requests.
- Configure payout rate multipliers and registration limits.
- Post news/announcements and manage support tickets.
- Review audit trails for critical admin/manager actions.

### SMS and Number Management

- Receive SMS through HTTP webhook endpoints.
- Track sender, recipient, service, OTP, message body, range, assigned user, payout, and received time.
- Separate production/live numbers from test numbers.
- Search SMS by number, sender, service, message, date, and status.
- View live OTP feed with OTP masking in real-time views.
- Export number data in CSV, TXT, Excel, and PDF formats.

### Range and Allocation Workflows

- Create and edit ranges with country, prefix, payout rate, profit margin, daily OTP limit, and SMS receive limit.
- Add live assignable numbers to ranges.
- Add test numbers separately from production numbers.
- Self-allocation for eligible reseller/client accounts with weekly or monthly payout multipliers.
- Bulk allocation for admin/manager roles.
- Allocation history with user, range, number, status, and timestamps.

### Payouts and Profit

- Track payout/profit per SMS, range, and number.
- Review payout request history and pending requests.
- Hold balances while payout requests are pending.
- Refund balances when payout requests are rejected or cancelled.
- Configure weekly/monthly rate multipliers used by self-allocation.

### Security and Audit

- JWT-style login tokens.
- Static API tokens for webhook/API access.
- Role-based route protection.
- Account status enforcement for suspended/blocked users.
- Failed login tracking and lockout support.
- Audit logs for user edits, approvals, registrations, payouts, allocations, revocations, ranges, support actions, news, and backups.
- Firewall/security event tables for failed SMS and blocked IP workflows.

### GUI and Responsive Design

- Responsive dashboard shell for desktop, tablet, and mobile.
- Sidebar collapses into a mobile drawer.
- Tables scroll inside containers instead of forcing the page wider than the screen.
- Forms and modal grids stack on smaller screens.
- Consistent SIGMAPANEL color scheme and compact operational dashboard styling.

## Tech Stack

### Backend

- Python 3
- FastAPI
- SQLite
- Pydantic
- bcrypt password hashing
- pandas/openpyxl for Excel export
- reportlab for PDF export
- SMPP server/client modules

### Frontend

- Vanilla JavaScript single-page app
- Custom router
- Custom CSS design system
- Chart.js loaded dynamically for analytics
- No frontend build step required

## Project Structure

```text
sigmapanel-ci/
├── main.py                         # FastAPI app setup and route registration
├── database.py                     # SQLite schema, migrations, seed data
├── auth.py                         # Password hashing, token generation/verification
├── audit_utils.py                  # Shared audit logging helper
├── sms_processor.py                # SMS processing logic
├── service_detector.py             # Service/app detection logic
├── payout_utils.py                 # Payout calculation helpers
├── smpp_server.py                  # SMPP server implementation
├── smpp_client_manager.py          # SMPP remote client handling
├── worker.py                       # Background worker entry
├── queue_manager.py                # Queue/health helper
├── requirements.txt                # Python dependencies
├── docker-compose.yml              # Docker Compose setup
├── Dockerfile                      # Container image definition
├── routes/
│   ├── auth.py                     # Login, signup, proof upload, token routes
│   ├── users.py                    # User management and registration approvals
│   ├── dashboard.py                # Stats, analytics, activity, audit APIs
│   ├── sms.py                      # SMS listing, delivery logs, failed SMS, payout stats
│   ├── numbers.py                  # Number CRUD and test number endpoints
│   ├── numbers_ext.py              # Bulk import, allocation, revoke, export, blacklist
│   ├── ranges.py                   # Range CRUD and range number management
│   ├── transactions.py             # Balance ledger and payout requests
│   ├── settings.py                 # Settings, payout rates, webhook info, backup
│   ├── notifications.py            # Role-scoped notifications
│   ├── profile_notifications.py    # Profile, news, support tickets
│   ├── api_management.py           # API token management and docs
│   ├── providers.py                # HTTP/SMPP provider management
│   ├── security.py                 # Security events and blocked IPs
│   ├── smpp_interconnect.py        # SMPP interconnect routes
│   └── webhook.py                  # SMS webhook intake
└── static/
    ├── index.html                  # SPA entry point
    ├── css/style.css               # Main responsive UI stylesheet
    └── js/
        ├── app.js                  # Navigation and shell
        ├── api.js                  # API client
        ├── router.js               # SPA router
        ├── ui.js                   # UI helpers and icons
        ├── auth.js                 # Login/signup UI
        ├── dashboard.js            # Dashboard UI
        ├── users.js                # User/admin management UI
        ├── sms.js                  # SMS views and analytics UI
        ├── numbers.js              # Number, allocation, revoke, test number UI
        ├── ranges.js               # Range management UI
        ├── payouts.js              # User payout views
        ├── payments.js             # Admin payout request queue
        ├── notifications.js        # News and support UI
        ├── settings.js             # Settings and webhook UI
        ├── api_management.js       # API playground/token UI
        ├── smpp.js                 # SMPP server UI
        ├── smpp_interconnect.js    # SMPP interconnect UI
        ├── profile.js              # Profile UI
        └── test_panel.js           # Test user panel
```

## Requirements

- Python 3.10 or newer recommended
- pip
- Git
- Optional: Docker and Docker Compose

Python packages are listed in `requirements.txt`.

## Local Installation

```bash
git clone https://github.com/Adnan5740/sigmapanel-ci.git
cd sigmapanel-ci
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -c "from database import init_db; init_db()"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open:

```text
http://localhost:8000
```

## Docker Installation

```bash
git clone https://github.com/Adnan5740/sigmapanel-ci.git
cd sigmapanel-ci
docker compose up -d --build
docker compose logs -f
```

## Environment Variables

Common variables:

```bash
DATABASE_URL=data/sigmapanel.db
JWT_SECRET=change-this-secret-in-production
PORT=8000
```

Notes:

- `DATABASE_URL` is used as the SQLite database path.
- `JWT_SECRET` should be set to a strong secret in production.
- If deployed behind a reverse proxy, pass `x-forwarded-proto` so webhook URLs use the correct scheme.

## Default Accounts

The database seed creates default accounts when missing:

```text
Admin
Username: admin
Password: admin123

Test User
Username: test123
Password: test123
```

Change default passwords immediately after first login.

## Main UI Modules

### Numbers Group

- My Numbers
- Self Allocation
- Client Allocation
- Bulk Allocation
- Allocation History
- SMS Ranges
- Search Access
- Live Access
- Upload Numbers
- Blacklist Management
- Revoke Numbers
- Test Numbers

### SMS Group

- My SMS
- Profit Stats
- Live OTP Feed
- SMS Analytics
- Search SMS
- Delivery Logs
- Failed SMS

### Requests Group

- Registration Requests
- Payout Requests

### Management Group

- Users
- Account Balances
- Audit Logs
- Permissions

### API Group

- API Playground
- API Tokens
- Documentation
- Live Test
- Webhook Config

### Communication

- News and Announcements
- Support Tickets

### Settings Group

- General Settings
- Security
- SMPP Settings
- Backup and Restore

## Important API Endpoints

### Auth

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/token
POST /api/auth/upload-proof
```

### Users and Registration

```text
GET    /api/users
POST   /api/users
GET    /api/users/{user_id}
PUT    /api/users/{user_id}
POST   /api/users/{user_id}/status
GET    /api/users/{user_id}/activity
GET    /api/users/{user_id}/logs
GET    /api/users/registration-requests
POST   /api/users/registration-requests/{request_id}/approve
POST   /api/users/registration-requests/{request_id}/reject
GET    /api/users/me
PATCH  /api/users/me
POST   /api/users/me/password
POST   /api/users/me/avatar
```

### SMS

```text
GET /api/sms
GET /api/sms/delivery-logs
GET /api/sms/failed
GET /api/sms/payout-stats
```

### Dashboard and Audit

```text
GET /api/dashboard/stats
GET /api/dashboard/recent-sms
GET /api/dashboard/analytics
GET /api/dashboard/live-activity
GET /api/dashboard/activity-logs
GET /api/dashboard/audit-logs
```

### Numbers and Allocation

```text
GET    /api/numbers
POST   /api/numbers
GET    /api/numbers/test
POST   /api/numbers/test
POST   /api/numbers/{number_id}/revoke
DELETE /api/numbers/{number_id}

GET  /api/numbers-ext/export
POST /api/numbers-ext/bulk-import
POST /api/numbers-ext/bulk-allocate
POST /api/numbers-ext/reseller-allocate
POST /api/numbers-ext/allocate
POST /api/numbers-ext/bulk-revoke
GET  /api/numbers-ext/allocations
GET  /api/numbers-ext/blacklist
POST /api/numbers-ext/blacklist
DELETE /api/numbers-ext/blacklist/{rule_id}
```

### Ranges

```text
GET    /api/ranges
POST   /api/ranges
PUT    /api/ranges/{range_id}
DELETE /api/ranges/{range_id}
POST   /api/ranges/{range_id}/numbers
POST   /api/ranges/{range_id}/test-numbers
GET    /api/ranges/{range_id}/numbers
DELETE /api/ranges/{range_id}/numbers/{number_id}
```

### Payouts and Transactions

```text
GET  /api/transactions/ledger
POST /api/transactions/payout-request
GET  /api/transactions/payout-requests
PUT  /api/transactions/payout-requests/{request_id}/approve
PUT  /api/transactions/payout-requests/{request_id}/reject
POST /api/transactions/payout-requests/{request_id}/cancel
POST /api/transactions/balance-adjust
```

### Settings

```text
GET  /api/settings
POST /api/settings
GET  /api/settings/webhook-info
GET  /api/settings/payout-rates
PUT  /api/settings/payout-rates
POST /api/settings/backup
```

### Notifications, News, and Support

```text
GET    /api/notifications
POST   /api/notifications
POST   /api/notifications/{notification_id}/read
POST   /api/notifications/mark-all-read
DELETE /api/notifications/{notification_id}

GET  /api/notifications/news
POST /api/notifications/news
GET  /api/notifications/support
POST /api/notifications/support
GET  /api/notifications/support/{ticket_id}
POST /api/notifications/support/{ticket_id}/reply
POST /api/notifications/support/{ticket_id}/close
```

### Webhook

```text
POST /api/webhook/sms
GET  /api/webhook/sms
```

The webhook accepts common provider fields such as destination number, sender, message body, and optional unique message id.

## Export Formats

Number exports support:

- CSV
- TXT
- XLSX
- PDF

Example:

```text
GET /api/numbers-ext/export?format=csv
GET /api/numbers-ext/export?format=txt&rangeName=US%20Numbers
```

## Role and Permission Notes

- Admin can control all users and system data.
- Manager can manage reseller/client accounts within their scope.
- Reseller can manage their own clients and own inventory.
- Test users are restricted to test-number/test-SMS surfaces.
- Admin/manager actions are protected at backend route level, not only hidden in the GUI.

## Database

The app uses SQLite by default. Schema and migrations are defined in `database.py`.

Key tables include:

- `users`
- `ranges`
- `numbers`
- `sms_received`
- `transactions`
- `payout_requests`
- `allocations`
- `audit_logs`
- `settings`
- `registration_requests`
- `notifications`
- `notification_reads`
- `news`
- `support_tickets`
- SMPP tables
- provider/security tables

Initialize manually:

```bash
python -c "from database import init_db; init_db()"
```

## Responsive UI Notes

The main stylesheet is `static/css/style.css`.

Current responsive behavior:

- Desktop sidebar uses fixed width and main content is constrained to remaining viewport width.
- Tablet/mobile sidebar becomes an off-canvas drawer.
- Tables scroll horizontally inside their own wrapper.
- Forms and two-column grids collapse to one column on small screens.
- Modals use viewport-based max width/height and become bottom sheets on small mobile screens.
- Buttons and inputs are normalized to avoid very large or very small fields.

## Development Commands

```bash
# Syntax check selected backend files
python3 -m py_compile main.py database.py auth.py

# Run the app locally
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Check JavaScript syntax where Node is available
node --check static/js/app.js
node --check static/js/users.js
node --check static/js/numbers.js
node --check static/js/ranges.js
node --check static/js/sms.js
```

## Deployment Checklist

Before production use:

- Change default admin password.
- Set a strong `JWT_SECRET`.
- Put the app behind HTTPS.
- Configure reverse proxy headers correctly.
- Restrict exposed ports.
- Back up SQLite database regularly.
- Review role assignments.
- Verify webhook provider fields.
- Verify payout rates and limits.
- Confirm SMPP credentials and IP allowlists.

## Troubleshooting

### Page goes outside screen

Clear browser cache and reload. Static assets can be cached aggressively. The responsive repair rules are in `static/css/style.css`.

### Login fails after migration

Check account `status` in the `users` table. Blocked or suspended users cannot log in.

### SMS not showing

Check:

- webhook endpoint URL
- provider field mapping
- number exists in `numbers`
- number assignment
- security events for rejected payloads

### Export fails

Check that `pandas`, `openpyxl`, and `reportlab` are installed from `requirements.txt`.

### App import fails

Install dependencies:

```bash
pip install -r requirements.txt
```

## License

Private project owned by the repository owner unless a license file is added.
