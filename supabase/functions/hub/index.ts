import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const allowedEmail = 'sorokin.ilya@gmail.com';
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};
const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const response = (status: number, value: unknown) => new Response(JSON.stringify(value), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
});
const appUrl = () => env('APP_URL').replace(/\/$/, '');
const redirectUri = (provider: string) => `${appUrl()}/?oauth=${provider}`;

async function requireIlya(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response(401, { error: 'Authentication required.' });
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
  const { data, error } = await client.auth.getUser(token);
  if (error || data.user?.email?.toLowerCase() !== allowedEmail) {
    return response(403, { error: 'This private workspace is available only to Ilya.' });
  }
  return null;
}

function state() {
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', env('TOKEN_ENCRYPTION_KEY')).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}
function validState(value: string) {
  const [timestamp, received] = value.split('.');
  if (!timestamp || !received || Math.abs(Date.now() - Number(timestamp)) > 10 * 60 * 1000) return false;
  const expected = createHmac('sha256', env('TOKEN_ENCRYPTION_KEY')).update(timestamp).digest('hex');
  const left = Buffer.from(received); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
function encryptToken(token: string) {
  const key = createHash('sha256').update(env('TOKEN_ENCRYPTION_KEY')).digest();
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return { encrypted_refresh_token: encrypted.toString('base64'), encryption_iv: iv.toString('base64'), encryption_tag: cipher.getAuthTag().toString('base64') };
}
function decryptToken(record: Record<string, string>) {
  const key = createHash('sha256').update(env('TOKEN_ENCRYPTION_KEY')).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.encryption_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.encryption_tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.encrypted_refresh_token, 'base64')), decipher.final()]).toString('utf8');
}
function address(value = '') {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  return match ? { name: match[1].replace(/^"|"$/g, '').trim() || match[2], email: match[2] } : { name: value || 'Unknown sender', email: value };
}
function header(message: any, name: string) {
  return message.payload?.headers?.find((item: any) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}
function uiMessage(row: any) {
  return {
    id: row.id, sender: row.sender_name || row.sender_email || 'Unknown sender', email: row.sender_email || '',
    subject: row.subject, preview: row.preview, body: row.preview,
    provider: row.provider === 'gmail' ? 'Gmail' : 'Zoho', time: row.received_at,
    unread: row.unread, priority: row.important, project: row.mailbox_owner,
    tone: 'New email', originalRecipient: row.mailbox_owner, mailboxOwner: row.mailbox_owner, sendAsAuthorized: true,
  };
}

async function integration(provider: string) {
  const { data, error } = await admin().from('communication_integrations').select('*').eq('provider', provider).single();
  if (error || !data) throw new Error(`${provider} is not connected`);
  return data;
}

async function gmailAccessToken() {
  const record = await integration('gmail');
  const token = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
    client_id: env('GMAIL_CLIENT_ID'), client_secret: env('GMAIL_CLIENT_SECRET'), refresh_token: decryptToken(record), grant_type: 'refresh_token',
  }) });
  const tokenText = await token.text();
  let data: any = {};
  try { data = JSON.parse(tokenText); } catch { /* handled below */ }
  if (!token.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${token.status}`;
    throw new Error(`Gmail token refresh failed: ${detail}`);
  }
  return { accessToken: data.access_token as string, mailbox: record.organization_name as string };
}

async function syncGmail() {
  const db = admin(); const { accessToken, mailbox } = await gmailAccessToken();
  const { data: sync } = await db.from('communication_sync_state').select('*').eq('provider', 'gmail').maybeSingle();
  const params = new URLSearchParams({ maxResults: '250' });
  if (sync?.history_cursor) params.set('pageToken', sync.history_cursor);
  else if (sync?.initial_import_complete && sync.last_message_at) params.set('q', `after:${Math.floor(new Date(sync.last_message_at).getTime() / 1000)}`);
  const authorization = { Authorization: `Bearer ${accessToken}` };
  const listed = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, { headers: authorization });
  if (!listed.ok) throw new Error(`Gmail list failed (${listed.status})`);
  const page = await listed.json(); const rows: any[] = [];
  const items: any[] = page.messages ?? [];
  const detailParams = new URLSearchParams({ format: 'metadata' });
  for (const name of ['From', 'To', 'Subject', 'Date']) detailParams.append('metadataHeaders', name);
  for (let start = 0; start < items.length; start += 20) {
    const batch = await Promise.all(items.slice(start, start + 20).map(async item => {
      const result = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?${detailParams}`, { headers: authorization });
      if (!result.ok) throw new Error(`Gmail message ${item.id} failed (HTTP ${result.status}); page will be retried.`);
      return result.json();
    }));
    for (const message of batch) {
      const sender = address(header(message, 'From'));
      rows.push({ id: `gmail:${message.id}`, provider: 'gmail', mailbox_owner: mailbox || 'Gmail', thread_id: message.threadId,
        sender_name: sender.name, sender_email: sender.email, recipients: [header(message, 'To')].filter(Boolean), subject: header(message, 'Subject') || '(No subject)',
        preview: message.snippet || '', received_at: new Date(Number(message.internalDate || Date.now())).toISOString(), unread: message.labelIds?.includes('UNREAD') ?? false,
        important: message.labelIds?.includes('IMPORTANT') ?? false, provider_labels: message.labelIds ?? [], raw_metadata: { providerId: message.id }, updated_at: new Date().toISOString() });
    }
  }
  if (rows.length) {
    const { error } = await db.from('communication_messages').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`Gmail message storage failed: ${error.message}`);
  }
  const { data: latestStored } = await db.from('communication_messages').select('received_at').eq('provider', 'gmail').order('received_at', { ascending: false }).limit(1).maybeSingle();
  const newest = latestStored?.received_at ?? sync?.last_message_at ?? null;
  const { error: stateError } = await db.from('communication_sync_state').upsert({ provider: 'gmail', history_cursor: page.nextPageToken ?? null,
    initial_import_complete: !page.nextPageToken, last_message_at: newest, last_sync_at: new Date().toISOString(), last_error: null,
    imported_count: Number(sync?.imported_count ?? 0) + rows.length, updated_at: new Date().toISOString() });
  if (stateError) throw new Error(`Gmail sync state storage failed: ${stateError.message}`);
  return { imported: rows.length, hasMore: Boolean(page.nextPageToken), estimatedTotal: page.resultSizeEstimate ?? null };
}

function records(value: any): any[] {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object');
  if (value && typeof value === 'object' && value.data) return records(value.data);
  if (value && typeof value === 'object' && (value.accountId || value.accountID)) return [value];
  return [];
}
function field(record: any, ...keys: string[]) {
  for (const key of keys) if (typeof record?.[key] === 'string' || typeof record?.[key] === 'number') return String(record[key]);
  return '';
}
async function syncZoho() {
  const db = admin(); const record = await integration('zoho');
  const refreshed = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env('ZOHO_CLIENT_ID'), client_secret: env('ZOHO_CLIENT_SECRET'), refresh_token: decryptToken(record) }),
  });
  const refreshedText = await refreshed.text();
  let token: any = {};
  try { token = JSON.parse(refreshedText); } catch { /* handled below */ }
  if (!refreshed.ok || !token.access_token) {
    const detail = token.error_description || token.error || `HTTP ${refreshed.status}; ${refreshed.headers.get('content-type') || 'unknown content type'}`;
    throw new Error(`Zoho token refresh failed: ${detail}`);
  }
  const headers = { Authorization: `Zoho-oauthtoken ${token.access_token}` };
  const accountResult = await fetch('https://mail.zoho.com/api/accounts', { headers });
  if (!accountResult.ok) throw new Error(`Zoho account list failed (${accountResult.status})`);
  const ownAccounts = records(await accountResult.json());
  if (!ownAccounts.length) throw new Error('Zoho returned no accessible mailboxes. Reconnect the Zoho account with mailbox access.');
  const accounts = new Map<string, any>();
  const accessById = new Map<string, Record<string, string>>();
  const authorizedEmails = new Set<string>();
  const discoveryErrors: string[] = [];
  for (const account of ownAccounts) {
    const id = field(account, 'accountId', 'accountID');
    if (id) { accounts.set(id, account); accessById.set(id, headers); authorizedEmails.add(field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId')); }
  }
  const { data: additional, error: credentialsError } = await db.from('communication_integrations').select('*').like('provider', 'zoho:%');
  if (credentialsError) throw credentialsError;
  for (const credential of additional ?? []) {
    try {
      const refreshed = await fetch('https://accounts.zoho.com/oauth/v2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env('ZOHO_CLIENT_ID'), client_secret: env('ZOHO_CLIENT_SECRET'), refresh_token: decryptToken(credential) }) });
      const token = await refreshed.json();
      if (!refreshed.ok || !token.access_token) throw new Error(token.error || 'token refresh failed');
      const mailboxHeaders = { Authorization: 'Zoho-oauthtoken ' + token.access_token };
      const listed = await fetch('https://mail.zoho.com/api/accounts', { headers: mailboxHeaders });
      if (!listed.ok) throw new Error('account list HTTP ' + listed.status);
      for (const account of records(await listed.json())) {
        const id = field(account, 'accountId', 'accountID');
        if (!id) continue;
        accounts.set(id, account); accessById.set(id, mailboxHeaders);
        authorizedEmails.add(field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId'));
      }
    } catch (error) { discoveryErrors.push((credential.organization_name || credential.provider) + ': ' + (error instanceof Error ? error.message : 'connection failed')); }
  }
  const organizationIds = [...new Set(ownAccounts.map(account => field(account.policyId, 'zoid')).filter(Boolean))];
  const organizationAccountIds = new Set(ownAccounts.map(account => field(account, 'accountId', 'accountID')).filter(Boolean));
  let organizationLookupFailed = !organizationIds.length;
  if (!organizationIds.length) discoveryErrors.push('Zoho did not return an organization ID for mailbox discovery');
  for (const zoid of organizationIds) {
    for (let start = 0; start < 1000; start += 200) {
      const result = await fetch(`https://mail.zoho.com/api/organization/${encodeURIComponent(zoid)}/accounts?start=${start}&limit=200`, { headers });
      if (!result.ok) {
        discoveryErrors.push(`Organization ${zoid} account discovery: HTTP ${result.status}`);
        organizationLookupFailed = true;
        break;
      }
      const page = records(await result.json());
      for (const account of page) {
        const id = field(account, 'accountId', 'accountID');
        if (id) { organizationAccountIds.add(id); if (!accounts.has(id)) accounts.set(id, account); }
      }
      if (page.length < 200) break;
    }
  }
  if (!organizationLookupFailed) {
    for (const [id, account] of accounts) {
      if (organizationAccountIds.has(id)) continue;
      accounts.delete(id); accessById.delete(id);
      authorizedEmails.delete(field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId'));
    }
  }
  const { data: sync } = await db.from('communication_sync_state').select('*').eq('provider', 'zoho').maybeSingle();
  let cursors: Record<string, number> = {};
  let previouslyAuthorized = new Set<string>();
  try {
    const saved = JSON.parse(sync?.history_cursor || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      cursors = saved.cursors && typeof saved.cursors === 'object' ? saved.cursors : saved;
      previouslyAuthorized = new Set(saved.authorizedMailboxes || []);
    }
  } catch {
    // Previous versions stored one shared numeric cursor; restart each mailbox safely.
  }
  const rows: any[] = []; const mailboxResults: any[] = []; const failures: string[] = [];
  for (const account of accounts.values()) {
    const accountId = field(account, 'accountId', 'accountID');
    if (!accountId) continue;
    const mailbox = field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId') || 'Zoho';
    const savedCursor = previouslyAuthorized.has(mailbox) ? Number(cursors[accountId] ?? 1) : 1;
    const start = savedCursor < 0 ? 1 : Math.max(savedCursor, 1);
    const mailboxHeaders = accessById.get(accountId);
    if (!mailboxHeaders) { mailboxResults.push({ mailbox, imported: 0, authorizationRequired: true }); continue; }
    const result = await fetch(`https://mail.zoho.com/api/accounts/${encodeURIComponent(accountId)}/messages/view?start=${start}&limit=200&sortBy=date&sortorder=false&includeto=true`, { headers: mailboxHeaders });
    if (!result.ok) {
      failures.push(`${mailbox}: HTTP ${result.status}`);
      mailboxResults.push({ mailbox, imported: 0, error: `HTTP ${result.status}` });
      continue;
    }
    const payload = await result.json();
    if (!Array.isArray(payload?.data) || (payload.status?.code && Number(payload.status.code) !== 200)) {
      failures.push(`${mailbox}: invalid Zoho response`);
      mailboxResults.push({ mailbox, imported: 0, error: 'Invalid Zoho response' });
      continue;
    }
    const page = records(payload);
    cursors[accountId] = savedCursor < 0 ? -1 : page.length === 200 ? start + 200 : -1;
    mailboxResults.push({ mailbox, imported: page.length, hasMore: cursors[accountId] > 1 });
    for (const message of page) {
      const providerId = field(message, 'messageId', 'messageID'); if (!providerId) continue;
      const rawTime = field(message, 'receivedTime', 'sentDateInGMT', 'receivedDate');
      const milliseconds = Number(rawTime);
      const date = Number.isFinite(milliseconds) && milliseconds > 0 ? new Date(milliseconds) : new Date(rawTime || Date.now());
      const received = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      rows.push({ id: `zoho:${accountId}:${providerId}`, provider: 'zoho', mailbox_owner: mailbox, sender_name: field(message, 'sender', 'senderName', 'fromAddress') || 'Unknown sender',
        sender_email: field(message, 'fromAddress', 'sender'), recipients: [field(message, 'toAddress', 'to')].filter(Boolean), subject: field(message, 'subject') || '(No subject)',
        preview: field(message, 'summary', 'content', 'snippet'), received_at: received, unread: field(message, 'status', 'isRead').toLowerCase() !== 'read' && message.isRead !== true,
        important: false, provider_labels: [], raw_metadata: { accountId, providerId }, updated_at: new Date().toISOString() });
    }
  }
  if (rows.length) {
    const { error } = await db.from('communication_messages').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`Zoho message storage failed: ${error.message}`);
  }
  const newest = rows.map(row => row.received_at).sort().at(-1) ?? sync?.last_message_at ?? null;
  const hasMore = Object.values(cursors).some(cursor => cursor > 1);
  const warnings = [...discoveryErrors, ...failures];
  const lastError = warnings.length ? `Zoho access: ${warnings.join('; ')}` : null;
  const { error: stateError } = await db.from('communication_sync_state').upsert({ provider: 'zoho', history_cursor: JSON.stringify({ cursors, organizationMailboxes: [...accounts.values()].map(account => field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId')).filter(Boolean), authorizedMailboxes: [...authorizedEmails].filter(Boolean) }), initial_import_complete: !hasMore,
    last_message_at: newest, last_sync_at: new Date().toISOString(), last_error: lastError, imported_count: Number(sync?.imported_count ?? 0) + rows.length, updated_at: new Date().toISOString() });
  if (stateError) throw new Error(`Zoho sync state storage failed: ${stateError.message}`);
  const accessibleMailboxCount = accessById.size;
  const { error: integrationError } = await db.from('communication_integrations').update({ account_count: accessibleMailboxCount }).eq('provider', 'zoho');
  if (integrationError) throw new Error(`Zoho mailbox count storage failed: ${integrationError.message}`);
  return { imported: rows.length, hasMore, mailboxCount: accounts.size, accessibleMailboxCount, warnings, mailboxes: mailboxResults };
}

async function listMessages(url: URL) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 500);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
  let activeZoho: string[] | null = null;
  if (url.searchParams.get('provider') === 'zoho') {
    const { data: state } = await admin().from('communication_sync_state').select('history_cursor').eq('provider', 'zoho').maybeSingle();
    try { const saved = JSON.parse(state?.history_cursor || '{}'); if (Array.isArray(saved.organizationMailboxes)) activeZoho = saved.organizationMailboxes; } catch { /* legacy sync state */ }
    if (activeZoho && !activeZoho.length) return { messages: [], total: 0, mailboxes: [] };
  }
  let query = admin().from('communication_messages').select('*', { count: 'exact' }).order('received_at', { ascending: false }).range(offset, offset + limit - 1);
  const provider = url.searchParams.get('provider'); const mailbox = url.searchParams.get('mailbox');
  if (provider) query = query.eq('provider', provider); if (mailbox) query = query.eq('mailbox_owner', mailbox);
  if (activeZoho) query = query.in('mailbox_owner', activeZoho);
  const { data, error, count } = await query; if (error) throw error;
  let mailboxQuery = admin().from('communication_messages').select('mailbox_owner');
  if (provider) mailboxQuery = mailboxQuery.eq('provider', provider);
  if (activeZoho) mailboxQuery = mailboxQuery.in('mailbox_owner', activeZoho);
  const { data: mailboxRows } = await mailboxQuery;
  const counts = new Map<string, number>(); for (const row of mailboxRows ?? []) counts.set(row.mailbox_owner, (counts.get(row.mailbox_owner) ?? 0) + 1);
  return { messages: (data ?? []).map(uiMessage), total: count ?? 0, mailboxes: [...counts].map(([email, count]) => ({ email, count })) };
}

async function status(provider: string) {
  const configured = provider === 'gmail' ? Boolean(Deno.env.get('GMAIL_CLIENT_ID') && Deno.env.get('GMAIL_CLIENT_SECRET')) : Boolean(Deno.env.get('ZOHO_CLIENT_ID') && Deno.env.get('ZOHO_CLIENT_SECRET'));
  const { data } = await admin().from('communication_integrations').select('account_count,connected_at,organization_name').eq('provider', provider).maybeSingle();
  const { data: sync } = await admin().from('communication_sync_state').select('*').eq('provider', provider).maybeSingle();
  let mailboxInfo: any = {};
  if (provider === 'zoho') { try { const saved = JSON.parse(sync?.history_cursor || '{}'); mailboxInfo = { organizationMailboxes: saved.organizationMailboxes || [], authorizedMailboxes: saved.authorizedMailboxes || [] }; } catch { /* old cursor format */ } }
  return { configured, connected: Boolean(data), accountCount: data?.account_count ?? 0, connectedAt: data?.connected_at ?? null, email: data?.organization_name ?? null, sync, ...mailboxInfo };
}

Deno.serve(async request => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/(?:functions\/v1\/)?hub(?=\/|$)/, '') || '/';
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const unauthorized = await requireIlya(request); if (unauthorized) return unauthorized;
    
    if (path === '/health') return response(200, { message: 'Success', platform: 'supabase-edge' });
    if (path === '/messages') return response(200, await listMessages(url));
    if (path === '/sync/gmail' && request.method === 'POST') return response(200, await syncGmail());
    if (path === '/sync/zoho' && request.method === 'POST') return response(200, await syncZoho());
    const match = path.match(/^\/integrations\/(gmail|zoho)\/(status|auth-url|callback)$/);
    if (!match) return response(404, { error: 'Not found.' });
    const [, provider, action] = match;
    if (action === 'status') return response(200, await status(provider));
    if (action === 'auth-url') {
      const params = provider === 'gmail' ? new URLSearchParams({ client_id: env('GMAIL_CLIENT_ID'), redirect_uri: redirectUri('gmail'), response_type: 'code', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', scope: 'openid email https://www.googleapis.com/auth/gmail.readonly', state: state() })
        : new URLSearchParams({ client_id: env('ZOHO_CLIENT_ID'), redirect_uri: redirectUri('zoho'), response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'ZohoMail.accounts.READ,ZohoMail.organization.accounts.READ,ZohoMail.messages.READ', access_type: 'offline', prompt: 'consent', state: state() });
      return response(200, { url: provider === 'gmail' ? `https://accounts.google.com/o/oauth2/v2/auth?${params}` : `https://accounts.zoho.com/oauth/v2/auth?${params}` });
    }
    const body = await request.json(); if (body.error || !body.code || !validState(body.state || '')) return response(400, { error: `${provider} authorization could not be completed.` });
    const tokenUrl = provider === 'gmail' ? 'https://oauth2.googleapis.com/token' : 'https://accounts.zoho.com/oauth/v2/token';
    const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
      code: body.code, client_id: env(provider === 'gmail' ? 'GMAIL_CLIENT_ID' : 'ZOHO_CLIENT_ID'), client_secret: env(provider === 'gmail' ? 'GMAIL_CLIENT_SECRET' : 'ZOHO_CLIENT_SECRET'), redirect_uri: redirectUri(provider), grant_type: 'authorization_code',
    }) });
    const tokens = await tokenResponse.json(); if (!tokenResponse.ok || !tokens.refresh_token) return response(502, { error: `${provider} token exchange failed.` });
    let email: string | null = null; let accountCount = 1;
    if (provider === 'zoho') {
      const own = await fetch('https://mail.zoho.com/api/accounts', { headers: { Authorization: 'Zoho-oauthtoken ' + tokens.access_token } });
      if (!own.ok) return response(502, { error: 'Zoho did not grant mailbox access.' });
      const mailboxes = records(await own.json());
      if (!mailboxes.length) return response(502, { error: 'Zoho returned no mailboxes for this sign-in.' });
      const connected: string[] = [];
      for (const mailbox of mailboxes) {
        const id = field(mailbox, 'accountId', 'accountID');
        const address = field(mailbox, 'primaryEmailAddress', 'mailboxAddress', 'mailId');
        if (!id || !address) continue;
        const { error } = await admin().from('communication_integrations').upsert({ provider: 'zoho:' + id, ...encryptToken(tokens.refresh_token), connected_at: new Date().toISOString(), account_count: 1, organization_name: address }, { onConflict: 'provider' });
        if (error) throw error;
        connected.push(address);
      }
      if (!connected.length) return response(502, { error: 'Zoho returned no usable mailbox identifiers.' });
      return response(200, { connected: true, accountCount: connected.length, email: connected[0], mailboxes: connected });
    }
    if (provider === 'gmail') {
      const profile = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      if (profile.ok) email = (await profile.json()).emailAddress ?? null;
    }
    const { error } = await admin().from('communication_integrations').upsert({ provider, ...encryptToken(tokens.refresh_token), connected_at: new Date().toISOString(), account_count: accountCount, organization_name: email }, { onConflict: 'provider' });
    if (error) throw error; return response(200, { connected: true, accountCount, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Service temporarily unavailable.';
    const provider = path.match(/^\/sync\/(gmail|zoho)$/)?.[1];
    if (provider) {
      const { error: stateError } = await admin().from('communication_sync_state').upsert({
        provider,
        last_error: message,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider' });
      if (stateError) console.error('Unable to persist sync error', stateError);
    }
    console.error(error); return response(503, { error: message });
  }
});
