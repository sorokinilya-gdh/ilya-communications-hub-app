import fs from 'node:fs';const file='supabase/functions/hub/index.ts';let s=fs.readFileSync(file,'utf8');
const anchor='    cursors[accountId] = savedCursor < 0 ? -1 : page.length === 200 ? start + 200 : -1;';
if(!s.includes(anchor))throw Error('Page cache insertion anchor missing');
s=s.replace(anchor,`    const ids=page.map(message=>'zoho:'+accountId+':'+field(message,'messageId','messageID')).filter(Boolean);
    const {data:stored,error:storedError}=await db.from('communication_messages').select('id,raw_metadata').in('id',ids);
    if(storedError)throw storedError;
    const bodies=new Map((stored||[]).filter(row=>row.raw_metadata?.html||row.raw_metadata?.bodyHydrated).map(row=>[row.id,row.raw_metadata]));
    for(let batch=0;batch<page.length;batch+=12){await Promise.all(page.slice(batch,batch+12).map(async message=>{
      const providerId=field(message,'messageId','messageID'),id='zoho:'+accountId+':'+providerId;if(!providerId||bodies.has(id))return;
      try{const detail=await fetch('https://mail.zoho.com/api/accounts/'+encodeURIComponent(accountId)+'/messages/'+encodeURIComponent(providerId)+'/content',{headers:mailboxHeaders});if(detail.ok){const json=await detail.json(),content=json?.data||json,html=field(content,'content','htmlContent')||'',body=html||field(content,'plainText','textContent');if(body)bodies.set(id,{body,html,bodyHydrated:true})}}catch{}
    }))}
`+anchor);
const old="let fullBody=originalBody,fullHtml='';try{const detail=await fetch('https://mail.zoho.com/api/accounts/'+encodeURIComponent(accountId)+'/messages/'+encodeURIComponent(providerId)+'/content',{headers:mailboxHeaders});if(detail.ok){const dj=await detail.json(),dd=dj?.data||dj;fullHtml=field(dd,'content','htmlContent')||'';fullBody=fullHtml||field(dd,'plainText','textContent')||originalBody}}catch{}";
if(!s.includes(old))throw Error('Content fetch anchor missing');s=s.replace(old,"const cached=bodies.get('zoho:'+accountId+':'+providerId);let fullBody=cached?.body||originalBody,fullHtml=cached?.html||'';");
s=s.replace('          body: fullBody,','          bodyHydrated: Boolean(cached),\n          body: fullBody,');fs.writeFileSync(file,s);console.log('Zoho content hydration reuses stored content and limits concurrency to 12.');
