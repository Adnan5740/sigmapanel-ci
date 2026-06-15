## 2025-05-15 - Unauthenticated Webhook Access
**Vulnerability:** The `/api/webhook/receive` and `/api/webhook/sms` endpoints were entirely unauthenticated, allowing any external party to inject SMS records into the system.
**Learning:** These endpoints were designed for ease of integration with third-party providers (like REVE SMS) but lacked the essential security layer to verify the source of the data. Furthermore, there was no ownership check to ensure that even an authenticated user could only report data for their own numbers.
**Prevention:** Always implement at least a shared secret token for incoming webhooks. Add ownership validation logic at the business logic layer (e.g., `sms_processor.py`) to prevent Cross-User data injection.
