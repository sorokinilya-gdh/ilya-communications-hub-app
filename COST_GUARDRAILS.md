# Mandatory zero-cost operating policy

Owner directive: **Never exceed free-tier limits or incur paid infrastructure charges without explicit approval.** Cost constraints take precedence over optional functionality.

- Historical mailbox imports are one-time, resumable and must never restart automatically. A bounded, incremental **new-mail-only** poll may run at most once every 15 minutes while the Hub is visible, with cross-tab deduplication. Never refetch previously indexed full message bodies. Disable automatic aggregate counts and historical backfills.
- Cache bounded, minimal message listings locally; fetch full bodies and attachments only on explicit opening.
- Enforce provider-level and organization-level request budgets, circuit breakers, bounded pagination, exponential backoff, and cross-tab deduplication.
- Before deploying any new feature, document its expected requests, egress, storage, log volume, and estimated monthly free-tier utilization. Reject changes without an explicit budget check.
- Alert at 50%, throttle at 70%, and stop nonessential operations at 85% of the smallest applicable free-tier quota. Do not assume a new billing cycle resolves Fair Use restrictions.
- Never remove business data to reduce storage without explicit approval and a verified backup.
- Treat this as a standing requirement for Personal CH, GDHOS and all related systems.

Emergency mode activated October 10, 2026: automated provider sync and important-count polling disabled; initial message list capped at 50 per provider. These safeguards do not by themselves control unrelated GDHOS services or guarantee compliance with quotas.

## Incremental mail and spam policy (October 10, 2026)
- New mail must be deduplicated by provider message ID before any full-message download.
- Existing indexed history remains searchable without provider reimport.
- Apply learned spam decisions to new mail; only automatically move messages from explicitly learned exact sender addresses, with conservative per-cycle limits.
- Monitor for missed messages during bursts larger than a single provider page and replace polling with provider-native delta/history cursors where possible.
