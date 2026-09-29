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
  const params = new URLSearchParams({ maxResults: '50' });
  if (sync?.history_cursor) params.set('pageToken', sync.history_cursor);
  else if (sync?.initial_import_complete && sync.last_message_at) params.set('q', `after:${Math.floor(new Date(sync.last_message_at).getTime() / 1000)}`);
  const authorization = { Authorization: `Bearer ${accessToken}` };
  const listed = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, { headers: authorization });
  if (!listed.ok) throw new Error(`Gmail list failed (${listed.status})`);
  const page = await listed.json(); const rows: any[] = [];
  for (const item of page.messages ?? []) {
    const detailParams = new URLSearchParams({ format: 'metadata' });
    for (const name of ['From', 'To', 'Subject', 'Date']) detailParams.append('metadataHeaders', name);
    const result = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?${detailParams}`, { headers: authorization });
    if (!result.ok) continue;
    const message = await result.json(); const sender = address(header(message, 'From'));
    rows.push({ id: `gmail:${message.id}`, provider: 'gmail', mailbox_owner: mailbox || 'Gmail', thread_id: message.threadId,
      sender_name: sender.name, sender_email: sender.email, recipients: [header(message, 'To')].filter(Boolean), subject: header(message, 'Subject') || '(No subject)',
      preview: message.snippet || '', received_at: new Date(Number(message.internalDate || Date.now())).toISOString(), unread: message.labelIds?.includes('UNREAD') ?? false,
      important: message.labelIds?.includes('IMPORTANT') ?? false, provider_labels: message.labelIds ?? [], raw_metadata: { providerId: message.id }, updated_at: new Date().toISOString() });
  }
  if (rows.length) await db.from('communication_messages').upsert(rows, { onConflict: 'id' });
  const newest = rows.map(row => row.received_at).sort().at(-1) ?? sync?.last_message_at ?? null;
  await db.from('communication_sync_state').upsert({ provider: 'gmail', history_cursor: page.nextPageToken ?? null,
    initial_import_complete: !page.nextPageToken, last_message_at: newest, last_sync_at: new Date().toISOString(), last_error: null,
    imported_count: Number(sync?.imported_count ?? 0) + rows.length, updated_at: new Date().toISOString() });
  return { imported: rows.length, hasMore: Boolean(page.nextPageToken) };
}

function records(value: any): any[] {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object');
  if (value && typeof value === 'object' && Array.isArray(value.data)) return records(value.data);
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
  const accounts = records(await accountResult.json());
  const { data: sync } = await db.from('communication_sync_state').select('*').eq('provider', 'zoho').maybeSingle();
  if (!accounts.length) throw new Error('Zoho returned no accessible mailboxes. Reconnect the Zoho account with mailbox access.');
  let cursors: Record<string, number> = {};
  try {
    const saved = JSON.parse(sync?.history_cursor || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) cursors = saved;
  } catch {
    // Previous versions stored one shared numeric cursor; restart each mailbox safely.
  }
  const rows: any[] = []; const mailboxResults: any[] = []; const failures: string[] = [];
  for (const account of accounts) {
    const accountId = field(account, 'accountId', 'accountID');
    if (!accountId) continue;
    const mailbox = field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId') || 'Zoho';
    const start = Math.max(Number(cursors[accountId] || 1), 1);
    const result = await fetch(`https://mail.zoho.com/api/accounts/${encodeURIComponent(accountId)}/messages/view?start=${start}&limit=200&sortBy=date&sortorder=false&includeto=true`, { headers });
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
    cursors[accountId] = page.length === 200 ? start + 200 : 1;
    mailboxResults.push({ mailbox, imported: page.length, hasMore: page.length === 200 });
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
  const lastError = failures.length ? `Zoho mailbox sync failed: ${failures.join('; ')}` : null;
  const { error: stateError } = await db.from('communication_sync_state').upsert({ provider: 'zoho', history_cursor: JSON.stringify(cursors), initial_import_complete: !hasMore,
    last_message_at: newest, last_sync_at: new Date().toISOString(), last_error: lastError, imported_count: Number(sync?.imported_count ?? 0) + rows.length, updated_at: new Date().toISOString() });
  if (stateError) throw new Error(`Zoho sync state storage failed: ${stateError.message}`);
  if (failures.length) throw new Error(lastError!);
  return { imported: rows.length, hasMore, mailboxCount: accounts.length, mailboxes: mailboxResults };
}

async function listMessages(url: URL) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 500);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
  let query = admin().from('communication_messages').select('*', { count: 'exact' }).order('received_at', { ascending: false }).range(offset, offset + limit - 1);
  const provider = url.searchParams.get('provider'); const mailbox = url.searchParams.get('mailbox');
  if (provider) query = query.eq('provider', provider); if (mailbox) query = query.eq('mailbox_owner', mailbox);
  const { data, error, count } = await query; if (error) throw error;
  const { data: mailboxRows } = await admin().from('communication_messages').select('mailbox_owner');
  const counts = new Map<string, number>(); for (const row of mailboxRows ?? []) counts.set(row.mailbox_owner, (counts.get(row.mailbox_owner) ?? 0) + 1);
  return { messages: (data ?? []).map(uiMessage), total: count ?? 0, mailboxes: [...counts].map(([email, count]) => ({ email, count })) };
}

async function status(provider: string) {
  const configured = provider === 'gmail' ? Boolean(Deno.env.get('GMAIL_CLIENT_ID') && Deno.env.get('GMAIL_CLIENT_SECRET')) : Boolean(Deno.env.get('ZOHO_CLIENT_ID') && Deno.env.get('ZOHO_CLIENT_SECRET'));
  const { data } = await admin().from('communication_integrations').select('account_count,connected_at,organization_name').eq('provider', provider).maybeSingle();
  const { data: sync } = await admin().from('communication_sync_state').select('*').eq('provider', provider).maybeSingle();
  return { configured, connected: Boolean(data), accountCount: data?.account_count ?? 0, connectedAt: data?.connected_at ?? null, email: data?.organization_name ?? null, sync };
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
        : new URLSearchParams({ client_id: env('ZOHO_CLIENT_ID'), redirect_uri: redirectUri('zoho'), response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'ZohoMail.accounts.READ,ZohoMail.organization.accounts.READ,ZohoMail.messages.READ', state: state() });
      return response(200, { url: provider === 'gmail' ? `https://accounts.google.com/o/oauth2/v2/auth?${params}` : `https://accounts.zoho.com/oauth/v2/auth?${params}` });
    }
    const body = await request.json(); if (body.error || !body.code || !validState(body.state || '')) return response(400, { error: `${provider} authorization could not be completed.` });
    const tokenUrl = provider === 'gmail' ? 'https://oauth2.googleapis.com/token' : 'https://accounts.zoho.com/oauth/v2/token';
    const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
      code: body.code, client_id: env(provider === 'gmail' ? 'GMAIL_CLIENT_ID' : 'ZOHO_CLIENT_ID'), client_secret: env(provider === 'gmail' ? 'GMAIL_CLIENT_SECRET' : 'ZOHO_CLIENT_SECRET'), redirect_uri: redirectUri(provider), grant_type: 'authorization_code',
    }) });
    const tokens = await tokenResponse.json(); if (!tokenResponse.ok || !tokens.refresh_token) return response(502, { error: `${provider} token exchange failed.` });
    let email: string | null = null; let accountCount = 1;
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
