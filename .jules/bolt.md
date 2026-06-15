## 2025-06-15 - [Database Indexing for High-Throughput Stats]
**Learning:** In a telecom dashboard, the most frequent queries are often scoped by user and date. Without indexes, SQLite performs full table scans which leads to exponential slowdown as the message logs grow.
**Action:** Always index columns used in WHERE and ORDER BY clauses for stats-heavy tables (like 'sms_received').
