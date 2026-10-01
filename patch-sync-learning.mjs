import fs from 'node:fs';const file='supabase/functions/hub/index.ts';let s=fs.readFileSync(file,'utf8');
const old="for(const row of rows){const score=await importanceScore(row);if(score>=70)row.important=true;if(await learnedSpam(row))row.raw_metadata={...(row.raw_metadata||{}),hubFolder:'spam'};}";
if(s.split(old).length!==3)throw Error('Expected two provider learning loops');s=s.replaceAll(old,'await applyLearnedRules(rows);');
const helper=`async function applyLearnedRules(rows){
 const db=admin(),[important,spam]=await Promise.all([db.from('communication_importance_learning').select('sender_email,sender_domain,subject_pattern').eq('decision','important').limit(1000),db.from('communication_spam_learning').select('sender_email,sender_domain,subject_pattern').eq('decision','spam').limit(500)]);
 for(const row of rows){const email=String(row.sender_email||'').toLowerCase(),domain=email.includes('@')?email.split('@').pop():'',subject=String(row.subject||'').toLowerCase();let score=0;
 for(const rule of important.data||[]){if(rule.sender_email&&rule.sender_email===email)score+=70;if(rule.sender_domain&&domain&&rule.sender_domain===domain)score+=20;if(rule.subject_pattern&&subject&&subject.includes(String(rule.subject_pattern).slice(0,45)))score+=35}if(Math.min(100,score)>=70)row.important=true;
 if((spam.data||[]).some(rule=>rule.sender_email&&rule.sender_email===email||rule.sender_domain&&domain&&rule.sender_domain===domain||rule.subject_pattern&&subject&&subject.includes(String(rule.subject_pattern).slice(0,60))))row.raw_metadata={...(row.raw_metadata||{}),hubFolder:'spam'};
 }
}
`;
s=s.replace('async function learnImportance(',helper+'async function learnImportance(');fs.writeFileSync(file,s);console.log('Two learning-rule reads per provider batch replace two reads per message.');
