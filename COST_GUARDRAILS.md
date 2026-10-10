# Mandatory zero-cost operating policy

Owner directive: **Never exceed free-tier limits or incur paid infrastructure charges without explicit approval.** Cost constraints take precedence over optional functionality.

- Default to zero background provider synchronization, zero historical backfills, and zero expensive automatic aggregate counts. Only user-initiated actions may invoke costly provider operations.
- Cache bounded, minimal message listings locally; fetch full bodies and attachments only on explicit opening.
- Enforce provider-level and organization-level request budgets, circuit breakers, bounded pagination, exponential backoff, and cross-tab deduplication.
- Before deploying any new feature, document its expected requests, egress, storage, log volume, and estimated monthly free-tier utilization. Reject changes without an explicit budget check.
- Alert at 50%, throttle at 70%, and stop nonessential operations at 85% of the smallest applicable free-tier quota. Do not assume a new billing cycle resolves Fair Use restrictions.
- Never remove business data to reduce storage without explicit approval and a verified backup.
- Treat this as a standing requirement for Personal CH, GDHOS and all related systems.

Emergency mode activated October 10, 2026: automated provider sync and important-count polling disabled; initial message list capped at 50 per provider. These safeguards do not by themselves control unrelated GDHOS services or guarantee compliance with quotas.
