# Local communications backend

The Windows GDHOS installation now includes a local PostgreSQL copy of all 67,151 shared mail records and the shared hub, channel and MIME backends. Open http://localhost:3010/ilya-communications-hub-app/ using the existing local GDHOS sign-in. The Desktop shortcut Personal Communications Hub - Local opens it.

To transfer pending browser actions from this GitHub Pages origin, open https://sorokinilya-gdh.github.io/ilya-communications-hub-app/?local-migrate=1 in the browser/profile used for the original PCH. Be signed into local GDHOS first. Pending actions move in bounded batches, preserving order, local folder marks and counters. The original outbox is reduced only after local acknowledgment, and a source backup is retained. After a successful transfer this browser redirects normal PCH openings to the local hub. Older cached messages/attachments remain in the original browser cache; none are cleared by migration.

The local app/API configuration and importer are maintained in the gdh-ai-operating-system repository under apps/web/scripts and integrations/local-hub. This public site retains its cloud configuration for untransferred browsers; it does not expose local service-role keys or provider credentials.

Provider synchronization, sending, deletion and attachment retrieval remain pending restoration of the original Gmail/Zoho OAuth application settings. Existing mailbox tokens are preserved and locally re-encrypted. Restore app credentials at http://localhost:3010/connections; no paid Supabase plan was enabled. The original cloud database is retained until provider certification and cutover are complete.
