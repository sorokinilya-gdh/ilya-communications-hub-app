import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const allowedEmail = 'sorokin.ilya@gmail.com';
const env = (name)=>{
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};
const admin = ()=>createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
const response = (status, value)=>new Response(JSON.stringify(value), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json'
    }
  });
const appUrl = ()=>env('APP_URL').replace(/\/$/, '');
const redirectUri = (provider)=>`${appUrl()}/?oauth=${provider}`;
async function requireIlya(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response(401, {
    error: 'Authentication required.'
  });
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
  const { data, error } = await client.auth.getUser(token);
  if (error || data.user?.email?.toLowerCase() !== allowedEmail) {
    return response(403, {
      error: 'This private workspace is available only to Ilya.'
    });
  }
  return null;
}
function state() {
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', env('TOKEN_ENCRYPTION_KEY')).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}
function validState(value) {
  const [timestamp, received] = value.split('.');
  if (!timestamp || !received || Math.abs(Date.now() - Number(timestamp)) > 10 * 60 * 1000) return false;
  const expected = createHmac('sha256', env('TOKEN_ENCRYPTION_KEY')).update(timestamp).digest('hex');
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
function encryptToken(token) {
  const key = createHash('sha256').update(env('TOKEN_ENCRYPTION_KEY')).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  return {
    encrypted_refresh_token: encrypted.toString('base64'),
    encryption_iv: iv.toString('base64'),
    encryption_tag: cipher.getAuthTag().toString('base64')
  };
}
function decryptToken(record) {
  const key = createHash('sha256').update(env('TOKEN_ENCRYPTION_KEY')).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.encryption_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.encryption_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.encrypted_refresh_token, 'base64')),
    decipher.final()
  ]).toString('utf8');
}
function address(value = '') {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  return match ? {
    name: match[1].replace(/^"|"$/g, '').trim() || match[2],
    email: match[2]
  } : {
    name: value || 'Unknown sender',
    email: value
  };
}
function header(message, name) {
  return message.payload?.headers?.find((item)=>item.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}
function decodeB64Url(value=''){if(!value)return'';try{return Buffer.from(value.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8')}catch{return''}}
function gmailBody(payload){if(!payload)return'';const plain=[],html=[];const walk=(part)=>{const mime=String(part.mimeType||'').toLowerCase(),text=decodeB64Url(part.body?.data||'');if(text){if(mime==='text/plain')plain.push(text);else if(mime==='text/html')html.push(text)}for(const child of part.parts||[])walk(child)};walk(payload);const raw=plain.join('\n').trim()||html.join('\n').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();return raw.replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ')}
function gmailContent(payload){if(!payload)return{body:'',html:''};const plain=[],html=[];const walk=(part)=>{const mime=String(part.mimeType||'').toLowerCase(),text=decodeB64Url(part.body?.data||'');if(text){if(mime==='text/plain')plain.push(text);else if(mime==='text/html')html.push(text)}for(const child of part.parts||[])walk(child)};walk(payload);return{body:plain.join('\n').trim()||gmailBody(payload),html:html.join('\n').trim()}}
function decodeMailEntities(v=''){return String(v).replace(/&quot;/gi,'"').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')}
function formIdentity(senderName='',senderEmail='',subject='',body=''){const text=decodeMailEntities(body||'');const lines=text.split(/\r?\n/);let name='',email='';for(const line of lines){const i=line.indexOf(':');if(i<0)continue;const key=line.slice(0,i).trim().toLowerCase(),value=line.slice(i+1).trim();if(key==='name'&&!name)name=value;if(key==='email'&&!email&&value.includes('@'))email=value.split(/\s/)[0]}const isForm=Boolean(name&&email&&(text.toLowerCase().includes('message:')||subject.toLowerCase().includes('contact')));return isForm?{sender_name:name,sender_email:email,technical_sender_name:senderName,technical_sender_email:senderEmail,source_type:'website_form'}:{sender_name:senderName,sender_email:senderEmail,technical_sender_name:'',technical_sender_email:'',source_type:'email'}}
function uiMessage(row) {
  return {
    id: row.id,
    providerId: row.raw_metadata?.providerId || row.id,
    sender: row.sender_name || row.sender_email || 'Unknown sender',
    email: row.sender_email || '',
    subject: decodeMailEntities(row.subject),
    preview: row.preview,
    body: row.raw_metadata?.body || row.preview,
    html: row.raw_metadata?.html || '',
    provider: row.provider === 'gmail' ? 'Gmail' : 'Zoho',
    time: row.received_at,
    unread: row.unread,
    priority: row.important,
    project: row.mailbox_owner,
    tone: 'New email',
    originalRecipient: row.mailbox_owner,
    mailboxOwner: row.mailbox_owner,
    sendAsAuthorized: true,
    folder: row.raw_metadata?.hubFolder || (row.provider_labels?.includes('INBOX') ? 'inbox' : row.provider === 'gmail' ? 'archive' : 'inbox')
  };
}
async function integration(provider) {
  const { data, error } = await admin().from('communication_integrations').select('*').eq('provider', provider).single();
  if (error || !data) throw new Error(`${provider} is not connected`);
  return data;
}
async function gmailAccessToken(recordOverride = null) {
  const record = recordOverride || await integration('gmail');
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: env('GMAIL_CLIENT_ID'),
      client_secret: env('GMAIL_CLIENT_SECRET'),
      refresh_token: decryptToken(record),
      grant_type: 'refresh_token'
    })
  });
  const tokenText = await token.text();
  let data = {};
  try {
    data = JSON.parse(tokenText);
  } catch  {}
  if (!token.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${token.status}`;
    throw new Error(`Gmail token refresh failed: ${detail}`);
  }
  return {
    accessToken: data.access_token,
    mailbox: record.organization_name
  };
}
async function persistMessageRows(rows, provider) {
 const ordered=[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 for(let start=0;start<ordered.length;start+=10){const{error}=await admin().from('communication_messages').upsert(ordered.slice(start,start+10),{onConflict:'id'});if(error)throw new Error(provider+' message storage failed: '+error.message);}
}
async function syncGmail(recentOnly = false) {
  const db = admin();
  const { data: gmailRecords, error: gmailRecordsError } = await db.from('communication_integrations').select('*').or('provider.eq.gmail,provider.like.gmail:%');
  if (gmailRecordsError) throw gmailRecordsError;
  if (!gmailRecords?.length) throw new Error('gmail is not connected');
  let totalImported = 0;
  let anyMore = false;
  const mailboxResults = [];
  for (const gmailRecord of gmailRecords) {
    const { accessToken, mailbox } = await gmailAccessToken(gmailRecord);
    const syncProvider = 'gmail:' + (mailbox || gmailRecord.organization_name || gmailRecord.provider) + (recentOnly ? ':recent' : '');
    const { data: sync } = await db.from('communication_sync_state').select('*').eq('provider', syncProvider).maybeSingle();
  const params = new URLSearchParams({
    maxResults: recentOnly ? '50' : '250',
    includeSpamTrash: 'true'
  });
  let savedCursor=null;try{savedCursor=JSON.parse(sync?.history_cursor||'null')}catch{}
  if(sync?.history_cursor){params.set('pageToken',savedCursor?.pageToken||sync.history_cursor);if(savedCursor?.query)params.set('q',savedCursor.query)}
  else if(sync?.initial_import_complete&&sync.last_message_at)params.set('q','after:'+String(Math.floor(new Date(sync.last_message_at).getTime()/1000)-1));
  else if(recentOnly)params.set('q','after:'+String(Math.floor(Date.now()/1000)-86400));
  const authorization = {
    Authorization: `Bearer ${accessToken}`
  };
  const listed = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: authorization
  });
  if (!listed.ok) throw new Error(`Gmail list failed (${listed.status})`);
  const page = await listed.json();
  const rows = [];
  const items = page.messages ?? [];
  const detailParams = new URLSearchParams({
    format: 'full'
  });
  for (const name of [
    'From',
    'To',
    'Subject',
    'Date'
  ])detailParams.append('metadataHeaders', name);
  for(let start = 0; start < items.length; start += 20){
    const batch = await Promise.all(items.slice(start, start + 20).map(async (item)=>{
      const result = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?${detailParams}`, {
        headers: authorization
      });
      if (!result.ok) throw new Error(`Gmail message ${item.id} failed (HTTP ${result.status}); page will be retried.`);
      return result.json();
    }));
    for (const message of batch){
      const sender = address(header(message, 'From')); const content = gmailContent(message.payload); const identity = formIdentity(sender.name,sender.email,header(message,'Subject'),content.body);
      rows.push({
        id: `gmail:${message.id}`,
        provider: 'gmail',
        mailbox_owner: mailbox || 'Gmail',
        thread_id: message.threadId,
        sender_name: identity.sender_name,
        sender_email: identity.sender_email,
        recipients: [
          header(message, 'To')
        ].filter(Boolean),
        subject: header(message, 'Subject') || '(No subject)',
        preview: message.snippet || '',
        received_at: new Date(Number(message.internalDate || Date.now())).toISOString(),
        unread: message.labelIds?.includes('UNREAD') ?? false,
        important: message.labelIds?.includes('IMPORTANT') ?? false,
        provider_labels: message.labelIds ?? [],
        raw_metadata: {
          providerId: message.id,
          ...content,
          technicalSenderName: identity.technical_sender_name,
          technicalSenderEmail: identity.technical_sender_email,
          sourceType: identity.source_type
        },
        updated_at: new Date().toISOString()
      });
    }
  }
  if (rows.length) {
    await applyLearnedRules(rows);
    await persistMessageRows(rows, 'Gmail');
  }
  const { data: latestStored } = await db.from('communication_messages').select('received_at').eq('provider', 'gmail').eq('mailbox_owner', mailbox).order('received_at', {
    ascending: false
  }).limit(1).maybeSingle();
  const newest = latestStored?.received_at ?? sync?.last_message_at ?? null;
  const { error: stateError } = await db.from('communication_sync_state').upsert({
    provider: syncProvider,
    history_cursor: page.nextPageToken ? JSON.stringify({pageToken:page.nextPageToken,query:params.get('q')||''}) : null,
    initial_import_complete: !page.nextPageToken,
    last_message_at: newest,
    last_sync_at: new Date().toISOString(),
    last_error: null,
    imported_count: Number(sync?.imported_count ?? 0) + rows.length,
    updated_at: new Date().toISOString()
  });
  if (stateError) throw new Error(`Gmail sync state storage failed: ${stateError.message}`);
  totalImported += rows.length;
  anyMore = anyMore || Boolean(page.nextPageToken);
  mailboxResults.push({ mailbox, imported: rows.length, hasMore: Boolean(page.nextPageToken) });
  }
  return { imported: totalImported, hasMore: anyMore, mailboxes: mailboxResults };
}
function extractAccountRecords(value) {
  if (Array.isArray(value)) return value.filter((item)=>item && typeof item === 'object');
  if (value && typeof value === 'object' && value.data) return extractAccountRecords(value.data);
  if (value && typeof value === 'object' && (value.accountId || value.accountID)) return [
    value
  ];
  return [];
}
function field(record, ...keys) {
  for (const key of keys)if (typeof record?.[key] === 'string' || typeof record?.[key] === 'number') return String(record[key]);
  return '';
}
async function syncZoho() {
  const db = admin();
  const record = await integration('zoho');
  const refreshed = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env('ZOHO_CLIENT_ID'),
      client_secret: env('ZOHO_CLIENT_SECRET'),
      refresh_token: decryptToken(record)
    })
  });
  const refreshedText = await refreshed.text();
  let token = {};
  try {
    token = JSON.parse(refreshedText);
  } catch  {}
  if (!refreshed.ok || !token.access_token) {
    const detail = token.error_description || token.error || `HTTP ${refreshed.status}; ${refreshed.headers.get('content-type') || 'unknown content type'}`;
    throw new Error(`Zoho token refresh failed: ${detail}`);
  }
  const headers = {
    Authorization: `Zoho-oauthtoken ${token.access_token}`
  };
  const accountResult = await fetch('https://mail.zoho.com/api/accounts', {
    headers
  });
  if (!accountResult.ok) throw new Error(`Zoho account list failed (${accountResult.status})`);
  const ownAccounts = extractAccountRecords(await accountResult.json());
  if (!ownAccounts.length) throw new Error('Zoho returned no accessible mailboxes. Reconnect the Zoho account with mailbox access.');
  const accounts = new Map();
  const accessById = new Map();
  const authorizedEmails = new Set();
  const discoveryErrors = [];
  for (const account of ownAccounts){
    const id = field(account, 'accountId', 'accountID');
    if (id) {
      accounts.set(id, account);
      accessById.set(id, headers);
      authorizedEmails.add(field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId'));
    }
  }
  const { data: additional, error: credentialsError } = await db.from('communication_integrations').select('*').like('provider', 'zoho:%');
  if (credentialsError) throw credentialsError;
  for (const credential of additional ?? []){
    try {
      const refreshed = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: env('ZOHO_CLIENT_ID'),
          client_secret: env('ZOHO_CLIENT_SECRET'),
          refresh_token: decryptToken(credential)
        })
      });
      const token = await refreshed.json();
      if (!refreshed.ok || !token.access_token) throw new Error(token.error || 'token refresh failed');
      const mailboxHeaders = {
        Authorization: 'Zoho-oauthtoken ' + token.access_token
      };
      const listed = await fetch('https://mail.zoho.com/api/accounts', {
        headers: mailboxHeaders
      });
      if (!listed.ok) throw new Error('account list HTTP ' + listed.status);
      for (const account of extractAccountRecords(await listed.json())){
        const id = field(account, 'accountId', 'accountID');
        if (!id) continue;
        accounts.set(id, account);
        accessById.set(id, mailboxHeaders);
        authorizedEmails.add(field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId'));
      }
    } catch (error) {
      discoveryErrors.push((credential.organization_name || credential.provider) + ': ' + (error instanceof Error ? error.message : 'connection failed'));
    }
  }
  const organizationIds = [
    ...new Set(ownAccounts.map((account)=>field(account.policyId, 'zoid')).filter(Boolean))
  ];
  const organizationAccountIds = new Set(ownAccounts.map((account)=>field(account, 'accountId', 'accountID')).filter(Boolean));
  let organizationLookupFailed = !organizationIds.length;
  if (!organizationIds.length) discoveryErrors.push('Zoho did not return an organization ID for mailbox discovery');
  for (const zoid of organizationIds){
    for(let start = 0; start < 1000; start += 200){
      const result = await fetch(`https://mail.zoho.com/api/organization/${encodeURIComponent(zoid)}/accounts?start=${start}&limit=200`, {
        headers
      });
      if (!result.ok) {
        discoveryErrors.push(`Organization ${zoid} account discovery: HTTP ${result.status}`);
        organizationLookupFailed = true;
        break;
      }
      const page = extractAccountRecords(await result.json());
      for (const account of page){
        const id = field(account, 'accountId', 'accountID');
        if (id) {
          organizationAccountIds.add(id);
          if (!accounts.has(id)) accounts.set(id, account);
        }
      }
      if (page.length < 200) break;
    }
  }
  if (!organizationLookupFailed) {
    for (const [id, account] of accounts){
      if (organizationAccountIds.has(id)) continue;
      accounts.delete(id);
      accessById.delete(id);
      authorizedEmails.delete(field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId'));
    }
  }
  const { data: sync } = await db.from('communication_sync_state').select('*').eq('provider', 'zoho').maybeSingle();
  let cursors = {};
  let previouslyAuthorized = new Set();
  try {
    const saved = JSON.parse(sync?.history_cursor || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      cursors = saved.cursors && typeof saved.cursors === 'object' ? saved.cursors : saved;
      previouslyAuthorized = new Set(saved.authorizedMailboxes || []);
    }
  } catch  {
  // Previous versions stored one shared numeric cursor; restart each mailbox safely.
  }
  const rows = [];
  const mailboxResults = [];
  const failures = [];
  for (const account of accounts.values()){
    const accountId = field(account, 'accountId', 'accountID');
    if (!accountId) continue;
    const mailbox = field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId') || 'Zoho';
    const savedCursor = previouslyAuthorized.has(mailbox) ? Number(cursors[accountId] ?? 1) : 1;
    const start = savedCursor < 0 ? 1 : Math.max(savedCursor, 1);
    const mailboxHeaders = accessById.get(accountId);
    if (!mailboxHeaders) {
      mailboxResults.push({
        mailbox,
        imported: 0,
        authorizationRequired: true
      });
      continue;
    }
    const result = await fetch(`https://mail.zoho.com/api/accounts/${encodeURIComponent(accountId)}/messages/view?start=${start}&limit=200&sortBy=date&sortorder=false&includeto=true`, {
      headers: mailboxHeaders
    });
    if (!result.ok) {
      failures.push(`${mailbox}: HTTP ${result.status}`);
      mailboxResults.push({
        mailbox,
        imported: 0,
        error: `HTTP ${result.status}`
      });
      continue;
    }
    const payload = await result.json();
    if (!Array.isArray(payload?.data) || payload.status?.code && Number(payload.status.code) !== 200) {
      failures.push(`${mailbox}: invalid Zoho response`);
      mailboxResults.push({
        mailbox,
        imported: 0,
        error: 'Invalid Zoho response'
      });
      continue;
    }
    const page = extractAccountRecords(payload);
    const ids=page.map(message=>'zoho:'+accountId+':'+field(message,'messageId','messageID')).filter(Boolean);
    const {data:stored,error:storedError}=await db.from('communication_messages').select('id,raw_metadata').in('id',ids);
    if(storedError)throw storedError;
    const bodies=new Map((stored||[]).filter(row=>row.raw_metadata?.html||row.raw_metadata?.bodyHydrated).map(row=>[row.id,row.raw_metadata]));
    for(let batch=0;batch<page.length;batch+=12){await Promise.all(page.slice(batch,batch+12).map(async message=>{
      const providerId=field(message,'messageId','messageID'),id='zoho:'+accountId+':'+providerId;if(!providerId||bodies.has(id))return;
      try{const detail=await fetch('https://mail.zoho.com/api/accounts/'+encodeURIComponent(accountId)+'/messages/'+encodeURIComponent(providerId)+'/content',{headers:mailboxHeaders});if(detail.ok){const json=await detail.json(),content=json?.data||json,html=field(content,'content','htmlContent')||'',body=html||field(content,'plainText','textContent');if(body)bodies.set(id,{body,html,bodyHydrated:true})}}catch{}
    }))}
    cursors[accountId] = savedCursor < 0 ? -1 : page.length === 200 ? start + 200 : -1;
    mailboxResults.push({
      mailbox,
      imported: page.length,
      hasMore: cursors[accountId] > 1
    });
    for (const message of page){
      const providerId = field(message, 'messageId', 'messageID');
      if (!providerId) continue;
      const rawTime = field(message, 'receivedTime', 'sentDateInGMT', 'receivedDate');
      const milliseconds = Number(rawTime);
      const date = Number.isFinite(milliseconds) && milliseconds > 0 ? new Date(milliseconds) : new Date(rawTime || Date.now());
      const received = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      const originalName=field(message, 'sender', 'senderName', 'fromAddress') || 'Unknown sender', originalEmail=field(message, 'fromAddress', 'sender'), originalBody=field(message, 'content', 'summary', 'snippet'), identity=formIdentity(originalName,originalEmail,field(message,'subject'),originalBody);
      const cached=bodies.get('zoho:'+accountId+':'+providerId);let fullBody=cached?.body||originalBody,fullHtml=cached?.html||'';
      rows.push({
        id: `zoho:${accountId}:${providerId}`,
        provider: 'zoho',
        mailbox_owner: mailbox,
        sender_name: identity.sender_name,
        sender_email: identity.sender_email,
        recipients: [
          field(message, 'toAddress', 'to')
        ].filter(Boolean),
        subject: field(message, 'subject') || '(No subject)',
        preview: field(message, 'summary', 'content', 'snippet'),
        received_at: received,
        unread: field(message, 'status', 'isRead').toLowerCase() !== 'read' && message.isRead !== true,
        important: false,
        provider_labels: [],
        raw_metadata: {
          accountId,
          providerId,
          bodyHydrated: Boolean(cached),
          body: fullBody,
          html: fullHtml,
          technicalSenderName: identity.technical_sender_name,
          technicalSenderEmail: identity.technical_sender_email,
          sourceType: identity.source_type
        },
        updated_at: new Date().toISOString()
      });
    }
  }
  if (rows.length) {
    await applyLearnedRules(rows);
    await persistMessageRows(rows, 'Zoho');
  }
  const newest = rows.map((row)=>row.received_at).sort().at(-1) ?? sync?.last_message_at ?? null;
  const hasMore = Object.values(cursors).some((cursor)=>cursor > 1);
  const warnings = [
    ...discoveryErrors,
    ...failures
  ];
  const lastError = warnings.length ? `Zoho access: ${warnings.join('; ')}` : null;
  const { error: stateError } = await db.from('communication_sync_state').upsert({
    provider: 'zoho',
    history_cursor: JSON.stringify({
      cursors,
      organizationMailboxes: [
        ...accounts.values()
      ].map((account)=>field(account, 'primaryEmailAddress', 'mailboxAddress', 'mailId')).filter(Boolean),
      authorizedMailboxes: [
        ...authorizedEmails
      ].filter(Boolean)
    }),
    initial_import_complete: !hasMore,
    last_message_at: newest,
    last_sync_at: new Date().toISOString(),
    last_error: lastError,
    imported_count: Number(sync?.imported_count ?? 0) + rows.length,
    updated_at: new Date().toISOString()
  });
  if (stateError) throw new Error(`Zoho sync state storage failed: ${stateError.message}`);
  const accessibleMailboxCount = accessById.size;
  const { error: integrationError } = await db.from('communication_integrations').update({
    account_count: accessibleMailboxCount
  }).eq('provider', 'zoho');
  if (integrationError) throw new Error(`Zoho mailbox count storage failed: ${integrationError.message}`);
  return {
    imported: rows.length,
    hasMore,
    mailboxCount: accounts.size,
    accessibleMailboxCount,
    warnings,
    mailboxes: mailboxResults
  };
}
async function listMessages(url, allowedMailboxes=null) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 500);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
  let activeZoho = null;
  if (url.searchParams.get('provider') === 'zoho') {
    const { data: state } = await admin().from('communication_sync_state').select('history_cursor').eq('provider', 'zoho').maybeSingle();
    try {
      const saved = JSON.parse(state?.history_cursor || '{}');
      if (Array.isArray(saved.organizationMailboxes)) activeZoho = saved.organizationMailboxes;
    } catch  {}
    if (activeZoho && !activeZoho.length) return {
      messages: [],
      total: 0,
      mailboxes: []
    };
  }
  let query = admin().from('communication_messages').select('*', {
    count: 'exact'
  }).order('received_at', {
    ascending: false
  }).range(offset, offset + limit - 1);
  const provider = url.searchParams.get('provider');
  const mailbox = url.searchParams.get('mailbox');
  const search = (url.searchParams.get('search') || '').trim();
  const folder = (url.searchParams.get('folder') || '').toLowerCase();
  const allFolders = url.searchParams.get('allFolders') === 'true' || Boolean(search) || Boolean(folder);
  if(allowedMailboxes)query=query.in('mailbox_owner',allowedMailboxes);
  if (provider) query = query.eq('provider', provider);
  if (mailbox) query = query.eq('mailbox_owner', mailbox);
  if (search) {
    const tokens = search.replace(/[,%()]/g, ' ').replace(/[^a-zA-Z0-9@._+-]+/g, ' ').split(/\s+/).map((token)=>token.trim()).filter((token)=>token.length >= 2).slice(0, 8);
    for (const token of tokens) {
      query = query.or(`sender_name.ilike.%${token}%,sender_email.ilike.%${token}%,subject.ilike.%${token}%,preview.ilike.%${token}%,mailbox_owner.ilike.%${token}%`);
    }
  }
  if(folder==='archive') query=query.eq('provider','gmail').not('provider_labels','cs','{INBOX}').not('provider_labels','cs','{TRASH}').not('provider_labels','cs','{SPAM}');
  else if (!allFolders) query = provider === 'gmail' ? query.contains('provider_labels', [
    'INBOX'
  ]) : provider ? query : query.or('provider.neq.gmail,provider_labels.cs.{INBOX}');
  if (activeZoho) query = query.in('mailbox_owner', activeZoho);
  const { data, error, count } = await query;
  if (error) throw error;
  let mailboxQuery = admin().from('communication_messages').select('mailbox_owner');
  if(allowedMailboxes)mailboxQuery=mailboxQuery.in('mailbox_owner',allowedMailboxes);
  if (provider) mailboxQuery = mailboxQuery.eq('provider', provider);
  mailboxQuery = provider === 'gmail' ? mailboxQuery.contains('provider_labels', [
    'INBOX'
  ]) : provider ? mailboxQuery : mailboxQuery.or('provider.neq.gmail,provider_labels.cs.{INBOX}');
  if (activeZoho) mailboxQuery = mailboxQuery.in('mailbox_owner', activeZoho);
  const { data: mailboxRows } = await mailboxQuery;
  const counts = new Map();
  for (const row of mailboxRows ?? [])counts.set(row.mailbox_owner, (counts.get(row.mailbox_owner) ?? 0) + 1);
  return {
    messages: (data ?? []).map(uiMessage),
    total: count ?? 0,
    mailboxes: [
      ...counts
    ].map(([email, count])=>({
        email,
        count
      }))
  };
}
async function status(provider) {
  const configured = provider === 'gmail' ? Boolean(Deno.env.get('GMAIL_CLIENT_ID') && Deno.env.get('GMAIL_CLIENT_SECRET')) : Boolean(Deno.env.get('ZOHO_CLIENT_ID') && Deno.env.get('ZOHO_CLIENT_SECRET'));
  let data = null;
  let gmailAccounts = [];
  if (provider === 'gmail') {
    const { data: rows } = await admin().from('communication_integrations').select('account_count,connected_at,organization_name,provider').or('provider.eq.gmail,provider.like.gmail:%');
    gmailAccounts = rows ?? [];
    data = gmailAccounts[0] ?? null;
  } else {
    const result = await admin().from('communication_integrations').select('account_count,connected_at,organization_name').eq('provider', provider).maybeSingle();
    data = result.data;
  }
  const { data: sync } = await admin().from('communication_sync_state').select('*').eq('provider', provider).maybeSingle();
  let mailboxInfo = {};
  if (provider === 'zoho') {
    try {
      const saved = JSON.parse(sync?.history_cursor || '{}');
      mailboxInfo = {
        organizationMailboxes: saved.organizationMailboxes || [],
        authorizedMailboxes: saved.authorizedMailboxes || []
      };
    } catch  {}
  }
  return {
    configured,
    connected: Boolean(data),
    connectedAt: data?.connected_at ?? null,
    email: data?.organization_name ?? null,
    accounts: provider === 'gmail' ? gmailAccounts.map((row)=>row.organization_name).filter(Boolean) : undefined,
    accountCount: provider === 'gmail' ? gmailAccounts.length : data?.account_count ?? 0,
    sync,
    ...mailboxInfo
  };
}
async function applyLearnedRules(rows){
 const db=admin(),[important,spam]=await Promise.all([db.from('communication_importance_learning').select('sender_email,sender_domain,subject_pattern').eq('decision','important').limit(1000),db.from('communication_spam_learning').select('sender_email,sender_domain,subject_pattern').eq('decision','spam').limit(500)]);
 for(const row of rows){const email=String(row.sender_email||'').toLowerCase(),domain=email.includes('@')?email.split('@').pop():'',subject=String(row.subject||'').toLowerCase();let score=0;
 for(const rule of important.data||[]){if(rule.sender_email&&rule.sender_email===email)score+=70;if(rule.sender_domain&&domain&&rule.sender_domain===domain)score+=20;if(rule.subject_pattern&&subject&&subject.includes(String(rule.subject_pattern).slice(0,45)))score+=35}if(Math.min(100,score)>=70)row.important=true;
 if((spam.data||[]).some(rule=>rule.sender_email&&rule.sender_email===email||rule.sender_domain&&domain&&rule.sender_domain===domain||rule.subject_pattern&&subject&&subject.includes(String(rule.subject_pattern).slice(0,60))))row.raw_metadata={...(row.raw_metadata||{}),hubFolder:'spam'};
 }
}
async function learnImportance(payload){const sender=String(payload.sender||'').toLowerCase(),subject=String(payload.subject||'').toLowerCase();if(!sender&&!subject)return;const db=admin();await db.from('communication_importance_learning').insert({sender_email:sender||null,sender_domain:sender.includes('@')?sender.split('@').pop():null,subject_pattern:subject.slice(0,180)||null,decision:'important',created_at:new Date().toISOString()})}
async function importanceScore(row){try{const db=admin(),email=String(row.sender_email||'').toLowerCase(),domain=email.includes('@')?email.split('@').pop():'',subject=String(row.subject||'').toLowerCase();const {data}=await db.from('communication_importance_learning').select('sender_email,sender_domain,subject_pattern').eq('decision','important').limit(1000);let score=0;for(const rule of data||[]){if(rule.sender_email&&rule.sender_email===email)score+=70;if(rule.sender_domain&&domain&&rule.sender_domain===domain)score+=20;if(rule.subject_pattern&&subject&&subject.includes(String(rule.subject_pattern).slice(0,45)))score+=35}return Math.min(100,score)}catch{return 0}}
async function learnedSpam(row){try{const db=admin(),email=String(row.sender_email||'').toLowerCase(),domain=email.includes('@')?email.split('@').pop():'',subject=String(row.subject||'').toLowerCase();const {data}=await db.from('communication_spam_learning').select('sender_email,sender_domain,subject_pattern').eq('decision','spam').limit(500);return(data||[]).some(rule=>rule.sender_email&&rule.sender_email===email||rule.sender_domain&&domain&&rule.sender_domain===domain||rule.subject_pattern&&subject&&subject.includes(String(rule.subject_pattern).slice(0,60)))}catch{return false}}
async function learnSpam(payload){const sender=String(payload.sender||'').toLowerCase(),subject=String(payload.subject||'').toLowerCase();if(!sender&&!subject)return;const db=admin();await db.from('communication_spam_learning').insert({sender_email:sender||null,sender_domain:sender.includes('@')?sender.split('@').pop():null,subject_pattern:subject.slice(0,180)||null,decision:'spam',created_at:new Date().toISOString()}).catch(()=>null)}
function providerActionId(payload){const raw=String(payload.providerId||payload.id||'');return raw.split(':').slice(-1)[0]}
async function archiveGmail(payload){const db=admin();const {data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.gmail,provider.like.gmail:%');if(error)throw error;const record=(records||[]).find(r=>String(r.organization_name||'').toLowerCase()===String(payload.mailbox||'').toLowerCase());if(!record)throw new Error('Gmail mailbox is not connected');const {accessToken}=await gmailAccessToken(record);const id=providerActionId(payload);const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id)+'/modify',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({removeLabelIds:['INBOX']})});if(!res.ok)throw new Error('Gmail archive failed: '+res.status);return{ok:true,provider:'gmail',action:'archive',id}}
async function spamGmail(payload){const db=admin();const {data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.gmail,provider.like.gmail:%');if(error)throw error;const record=(records||[]).find(r=>String(r.organization_name||'').toLowerCase()===String(payload.mailbox||'').toLowerCase());if(!record)throw new Error('Gmail mailbox is not connected');const {accessToken}=await gmailAccessToken(record);const id=providerActionId(payload);const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id)+'/modify',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({addLabelIds:['SPAM'],removeLabelIds:['INBOX']})});if(!res.ok)throw new Error('Gmail spam failed: '+res.status);return{ok:true,provider:'gmail',action:'spam',id}}
async function mutateGmail(payload,action){const db=admin();const {data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.gmail,provider.like.gmail:%');if(error)throw error;const record=(records||[]).find(r=>String(r.organization_name||'').toLowerCase()===String(payload.mailbox||'').toLowerCase());if(!record)throw new Error('Gmail mailbox is not connected');const {accessToken}=await gmailAccessToken(record);const id=providerActionId(payload);if(!id)throw new Error('Gmail message id required');const endpoint=action==='trash'?'trash':action==='restore'?'untrash':null;if(!endpoint)throw new Error('Unsupported Gmail action');const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id)+'/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+accessToken}});if(!res.ok)throw new Error('Gmail '+action+' failed: '+res.status);return{ok:true,provider:'gmail',action,id}}
async function mutateZoho(payload,action){const db=admin();const {data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.zoho,provider.like.zoho:%');if(error)throw error;for(const record of records||[]){const refreshed=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:env('ZOHO_CLIENT_ID'),client_secret:env('ZOHO_CLIENT_SECRET'),refresh_token:decryptToken(record)})});const token=await refreshed.json();if(!refreshed.ok||!token.access_token)continue;const headers={Authorization:'Zoho-oauthtoken '+token.access_token,'Content-Type':'application/json'};const listed=await fetch('https://mail.zoho.com/api/accounts',{headers});if(!listed.ok)continue;for(const account of extractAccountRecords(await listed.json())){const email=field(account,'primaryEmailAddress','mailboxAddress','mailId');if(email.toLowerCase()!==String(payload.mailbox||'').toLowerCase())continue;const accountId=field(account,'accountId','accountID'),messageId=providerActionId(payload);if(!messageId)throw new Error('Zoho message id required');const mode=action==='trash'?'moveToTrash':action==='restore'?'moveToInbox':null;if(!mode)throw new Error('Unsupported Zoho action');const res=await fetch('https://mail.zoho.com/api/accounts/'+accountId+'/updatemessage',{method:'PUT',headers,body:JSON.stringify({mode,messageId})});if(!res.ok)throw new Error('Zoho '+action+' failed: '+res.status);return{ok:true,provider:'zoho',action,id:messageId}}}throw new Error('Zoho mailbox is not connected')}
async function sendGmail(payload) {
  const db=admin(); const {data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.gmail,provider.like.gmail:%'); if(error)throw error;
  const record=(records||[]).find((r)=>String(r.organization_name||'').toLowerCase()===String(payload.from||'').toLowerCase()); if(!record)throw new Error('Gmail sender is not connected');
  const {accessToken}=await gmailAccessToken(record);
  const mime=['From: '+payload.from,'To: '+payload.to.join(', '),'Subject: '+payload.subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','',payload.body].join('\r\n');
  const raw=Buffer.from(mime).toString('base64url'); const sent=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({raw,threadId:payload.threadId||undefined})});
  const result=await sent.json(); if(!sent.ok)throw new Error('Gmail send failed: '+(result.error?.message||sent.status)); return {provider:'gmail',providerMessageId:result.id,threadId:result.threadId};
}
async function sendZoho(payload) {
 const db=admin(),{data:records,error}=await db.from('communication_integrations').select('*').or('provider.eq.zoho,provider.like.zoho:%');if(error)throw error;
 const candidates=[...(records||[])].sort((a,b)=>Number(String(b.organization_name||'').toLowerCase()===String(payload.from).toLowerCase())-Number(String(a.organization_name||'').toLowerCase()===String(payload.from).toLowerCase()));let rejected='';
 for(const record of candidates){const refreshed=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:env('ZOHO_CLIENT_ID'),client_secret:env('ZOHO_CLIENT_SECRET'),refresh_token:decryptToken(record)})});const token=await refreshed.json();if(!refreshed.ok||!token.access_token)continue;
 const headers={Authorization:'Zoho-oauthtoken '+token.access_token},listed=await fetch('https://mail.zoho.com/api/accounts',{headers});if(!listed.ok)continue;
 for(const account of extractAccountRecords(await listed.json())){const email=field(account,'primaryEmailAddress','mailboxAddress','mailId');if(email.toLowerCase()!==String(payload.from).toLowerCase())continue;
 const accountId=field(account,'accountId','accountID'),sent=await fetch('https://mail.zoho.com/api/accounts/'+accountId+'/messages',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({fromAddress:payload.from,toAddress:payload.to.join(','),subject:payload.subject,content:payload.body,mailFormat:'plaintext'})}),result=await sent.json();const status=Number(result.status?.code||sent.status);
 if(!sent.ok||status>=400){const code=String(result.data?.errorCode||result.data?.error?.code||result.status?.description||sent.status).slice(0,180);if(sent.status===401||sent.status===403||status===401||status===403){rejected='Zoho rejected send authorization ('+code+'). Reconnect this mailbox with message-send permission.';continue}throw new Error('Zoho send failed: '+code)}
 return{provider:'zoho',providerMessageId:field(result.data||result,'messageId','messageID','id')||null};
 }}
 throw new Error(rejected||'Zoho sender is not connected');
}

const bridgeMailboxes = ['ceo@aimicrotec.com','is@gdh.ltd'];
async function handleGdhBridge(request,path,url) {
 const expected=Deno.env.get('GDH_BRIDGE_KEY_SHA256');
 const expires=Date.parse(Deno.env.get('GDH_BRIDGE_EXPIRES_AT')||'');
 if(!expected||!Number.isFinite(expires)||Date.now()>=expires)return response(503,{error:'GDH bridge is not enabled.'});
 const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
 const actual=createHash('sha256').update(token).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(expected)||!token||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return response(401,{error:'Bridge authentication required.'});
 if((path==='/bridge/messages'||path==='/bridge/search')&&request.method==='GET')return response(200,await listMessages(url,bridgeMailboxes));
 if(path==='/bridge/send'&&request.method==='POST'){
  const payload=await request.json();const from=String(payload.from||'').toLowerCase();const to=Array.isArray(payload.to)?payload.to.map(x=>String(x).toLowerCase()):[];
  if(!bridgeMailboxes.includes(from)||!to.length||to.some(x=>!bridgeMailboxes.includes(x)))return response(403,{error:'Bridge test is restricted to the two approved mailboxes.'});
  const provider=String(payload.provider||'').toLowerCase();if((from==='ceo@aimicrotec.com'&&provider!=='gmail')||(from==='is@gdh.ltd'&&provider!=='zoho'))return response(400,{error:'Sender and provider do not match.'});
  if(!payload.subject||typeof payload.body!=='string')return response(400,{error:'Subject and body are required.'});
  const result=provider==='gmail'?await sendGmail({...payload,from,to}):await sendZoho({...payload,from,to});return response(200,{sent:true,...result});
 }
 return response(404,{error:'Bridge operation unavailable.'});
}

Deno.serve(async (request)=>{
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/(?:functions\/v1\/)?hub(?=\/|$)/, '') || '/';
  if (request.method === 'OPTIONS') return new Response('ok', {
    headers: cors
  });
  try {
    if(path.startsWith('/bridge/'))return await handleGdhBridge(request,path,url);
    const unauthorized = await requireIlya(request);
    if (unauthorized) return unauthorized;
    if (path === '/health') return response(200, {
      message: 'Success',
      platform: 'supabase-edge'
    });
    if (path === '/diagnostics/send-capability') {
      const db=admin(); const {data:rows,error}=await db.from('communication_integrations').select('provider,organization_name').or('provider.eq.gmail,provider.like.gmail:%');
      if(error)throw error; return response(200,{gmail:(rows||[]).map(r=>r.organization_name).filter(Boolean)});
    }
    if (path === '/diagnostics/accounts') {
      const { data: rows, error } = await admin().from('communication_integrations').select('provider,organization_name,account_count,connected_at').order('provider');
      if (error) throw error;
      return response(200, { accounts: rows ?? [] });
    }
    if (path === '/messages') return response(200, await listMessages(url));
    if (path === '/search') return response(200, await listMessages(url));
    if (path === '/message/action' && request.method === 'POST') { const payload=await request.json(); const provider=String(payload.provider||'').toLowerCase(),action=String(payload.action||'').toLowerCase(); if(!['trash','restore','spam','archive','important'].includes(action))return response(400,{error:'Unsupported action'}); if(action==='important'){providerActionId(payload);await learnImportance(payload);const db=admin(),id=String(payload.id||'');if(id){const {data:row}=await db.from('communication_messages').select('raw_metadata').eq('id',id).maybeSingle();if(row)await db.from('communication_messages').update({important:true,raw_metadata:{...(row.raw_metadata||{}),importanceSource:'manual'},updated_at:new Date().toISOString()}).eq('id',id)}return response(200,{ok:true,action:'important'});} const result=provider==='gmail'?(action==='spam'?await spamGmail(payload):action==='archive'?await archiveGmail(payload):await mutateGmail(payload,action)):provider==='zoho'?await mutateZoho(payload,action):null; if(action==='spam')await learnSpam(payload); if(!result)return response(400,{error:'Unsupported provider'}); const db=admin(); const id=String(payload.id||''); if(id){const {data:row}=await db.from('communication_messages').select('raw_metadata').eq('id',id).maybeSingle(); if(row)await db.from('communication_messages').update({raw_metadata:{...(row.raw_metadata||{}),hubFolder:action==='trash'?'trash':action==='archive'?'archive':action==='spam'?'spam':'inbox'},updated_at:new Date().toISOString()}).eq('id',id)} return response(200,result); }
    if (path === '/send' && request.method === 'POST') {
      const payload=await request.json(); if(!payload.from||!Array.isArray(payload.to)||!payload.to.length||!payload.subject) return response(400,{error:'from, to and subject are required'});
      const provider=String(payload.provider||'').toLowerCase(); const result=provider==='gmail'?await sendGmail(payload):provider==='zoho'?await sendZoho(payload):null;
      if(!result)return response(400,{error:'Unsupported provider'}); return response(200,{sent:true,...result});
    }
    if (path === '/sync/zoho/reindex' && request.method === 'POST') {const db=admin();const {data,error}=await db.from('communication_sync_state').select('provider').eq('provider','zoho');if(error)throw error;await db.from('communication_sync_state').update({history_cursor:null,initial_import_complete:false,last_message_at:null,last_error:null,updated_at:new Date().toISOString()}).eq('provider','zoho');return response(200,{reset:true});}
    if (path === '/sync/gmail/reindex' && request.method === 'POST') {
      const db = admin();
      const { data: rows, error } = await db.from('communication_sync_state').select('provider').or('provider.eq.gmail,provider.like.gmail:%');
      if (error) throw error;
      for (const row of rows ?? []) {
        const { error: resetError } = await db.from('communication_sync_state').update({ history_cursor: null, initial_import_complete: false, last_message_at: null, last_error: null, imported_count: 0, updated_at: new Date().toISOString() }).eq('provider', row.provider);
        if (resetError) throw resetError;
      }
      return response(200, { reset: (rows ?? []).map((row)=>row.provider) });
    }
    if (path === '/sync/gmail/recent' && request.method === 'POST') return response(200, await syncGmail(true));
    if (path === '/sync/gmail' && request.method === 'POST') return response(200, await syncGmail());
    if (path === '/sync/zoho' && request.method === 'POST') return response(200, await syncZoho());
    const match = path.match(/^\/integrations\/(gmail|zoho)\/(status|auth-url|callback)$/);
    if (!match) return response(404, {
      error: 'Not found.'
    });
    const [, provider, action] = match;
    if (action === 'status') return response(200, await status(provider));
    if (action === 'auth-url') {
      const params = provider === 'gmail' ? new URLSearchParams({
        client_id: env('GMAIL_CLIENT_ID'),
        redirect_uri: redirectUri('gmail'),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        scope: 'openid email https://www.googleapis.com/auth/gmail.modify',
        state: state()
      }) : new URLSearchParams({
        client_id: env('ZOHO_CLIENT_ID'),
        redirect_uri: redirectUri('zoho'),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: 'ZohoMail.accounts.READ,ZohoMail.organization.accounts.READ,ZohoMail.messages.ALL',
        access_type: 'offline',
        prompt: 'consent',
        state: state()
      });
      return response(200, {
        url: provider === 'gmail' ? `https://accounts.google.com/o/oauth2/v2/auth?${params}` : `https://accounts.zoho.com/oauth/v2/auth?${params}`
      });
    }
    const body = await request.json();
    if (body.error || !body.code || !validState(body.state || '')) return response(400, {
      error: `${provider} authorization could not be completed.`
    });
    const tokenUrl = provider === 'gmail' ? 'https://oauth2.googleapis.com/token' : 'https://accounts.zoho.com/oauth/v2/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: body.code,
        client_id: env(provider === 'gmail' ? 'GMAIL_CLIENT_ID' : 'ZOHO_CLIENT_ID'),
        client_secret: env(provider === 'gmail' ? 'GMAIL_CLIENT_SECRET' : 'ZOHO_CLIENT_SECRET'),
        redirect_uri: redirectUri(provider),
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.refresh_token) return response(502, {
      error: `${provider} token exchange failed.`
    });
    let email = null;
    let accountCount = 1;
    if (provider === 'zoho') {
      const own = await fetch('https://mail.zoho.com/api/accounts', {
        headers: {
          Authorization: 'Zoho-oauthtoken ' + tokens.access_token
        }
      });
      if (!own.ok) return response(502, {
        error: 'Zoho did not grant mailbox access.'
      });
      const mailboxes = extractAccountRecords(await own.json());
      if (!mailboxes.length) return response(502, {
        error: 'Zoho returned no mailboxes for this sign-in.'
      });
      const connected = [];
      for (const mailbox of mailboxes){
        const id = field(mailbox, 'accountId', 'accountID');
        const address = field(mailbox, 'primaryEmailAddress', 'mailboxAddress', 'mailId');
        if (!id || !address) continue;
        const { error } = await admin().from('communication_integrations').upsert({
          provider: 'zoho:' + id,
          ...encryptToken(tokens.refresh_token),
          connected_at: new Date().toISOString(),
          account_count: 1,
          organization_name: address
        }, {
          onConflict: 'provider'
        });
        if (error) throw error;
        connected.push(address);
      }
      if (!connected.length) return response(502, {
        error: 'Zoho returned no usable mailbox identifiers.'
      });
      return response(200, {
        connected: true,
        accountCount: connected.length,
        email: connected[0],
        mailboxes: connected
      });
    }
    if (provider === 'gmail') {
      const profile = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });
      if (profile.ok) email = (await profile.json()).emailAddress ?? null;
    }
    const gmailProvider = provider === 'gmail' && email ? 'gmail:' + email.toLowerCase() : provider;
    const { error } = await admin().from('communication_integrations').upsert({
      provider: gmailProvider,
      ...encryptToken(tokens.refresh_token),
      connected_at: new Date().toISOString(),
      account_count: accountCount,
      organization_name: email
    }, {
      onConflict: 'provider'
    });
    if (error) throw error;
    return response(200, {
      connected: true,
      accountCount,
      email
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Service temporarily unavailable.';
    const provider = path.match(/^\/sync\/(gmail|zoho)$/)?.[1];
    if (provider) {
      const { error: stateError } = await admin().from('communication_sync_state').upsert({
        provider,
        last_error: message,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'provider'
      });
      if (stateError) console.error('Unable to persist sync error', stateError);
    }
    console.error(error);
    return response(503, {
      error: message
    });
  }
});
