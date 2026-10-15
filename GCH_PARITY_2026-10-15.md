# GDHOS Trash and Spam correction — 2026-10-15

Empty Trash and Empty Spam process the complete folder in bounded 100-message batches. Individual and selected messages can return to Inbox via Not Trash/Not Spam, or be permanently deleted. Local removal is immediate; provider deletion is queued with retries and visible pending/error status. Tombstones prevent stale provider pages from restoring deleted messages. Permanent deletion is restricted to Trash/Spam and the signed-in owner.

Provider adapter contract tests cover Gmail permanent DELETE and Zoho expunge deletion, permission failures and Inbox restoration. Real customer mail was not deleted for testing. Live provider verification returned HTTP 402 exceed_egress_quota on 2026-10-15; provider synchronization remains queued until free service access is restored. No paid plan or spend-cap changes were made.

Acceptance evidence:
- Not Trash and Not Spam restore Inbox; Inbox permanent deletion rejected.
- Individual permanent deletion removes body, queues provider delete, and blocks resurrection.
- Empty Spam spans 100-row batches; other folders preserved; invalid scope, unknown ID and anonymous writes blocked.
- Browser: Trash selection/Not Trash and Empty Spam controls complete without client errors.

PCH parity: Importance toggles are queued locally and explicit unmark decisions are preserved across the shared provider. Empty Trash/Spam, individual/selected permanent deletion and Not Trash/Not Spam restores are implemented. Local durable actions and cached folder views survive reload and provider unavailability. Recipient decoding handles encoded delimiters and object address lists. Retrieved message bodies and attachment payloads are cached on this device with a 100 MB limit and oldest-entry eviction. Existing preview, copy, zoom, full-page view and outgoing attachment features are retained. Background provider delivery in PCH requires the hub to remain open; GDHOS retains its separate background worker. Live provider execution remains blocked by the shared free egress quota.
