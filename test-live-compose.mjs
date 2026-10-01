import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync('assets/index-LiveCompose20261001.js','utf8'),start=code.indexOf('function HubLiveCompose20261001('),end=code.indexOf('function R1(',start);
let state=[],cursor=0,effects=[],store=new Map(),posts=[],fail=false;
const context={F:{useState(init){const i=cursor++;if(!(i in state))state[i]=typeof init==='function'?init():init;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useEffect(fn){if(!effects.length)effects.push(fn)}},m:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},Un:{get:async()=>({data:{accounts:[{provider:'gmail:ceo',organization_name:'ceo@aimicrotec.com'},{provider:'zoho:1',organization_name:'is@gdh.ltd'},{provider:'zoho',organization_name:'Company Name'}]}}),post:async(url,p)=>{posts.push({url,p});if(fail)throw Error('Provider unavailable');return{data:{sent:true,providerMessageId:'test-id'}}}}};
vm.createContext(context);vm.runInContext(code.slice(start,end),context);
function render(){cursor=0;return context.HubLiveCompose20261001({onClose(){},onNotice(){}})}
function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found}}
const control=(tree,text)=>find(tree,n=>n.type==='button'&&n.props.children===text);
let tree=render();await effects[0]();await Promise.resolve();await Promise.resolve();tree=render();assert.equal(state[1].length,2);
await control(tree,'Send').props.onClick();assert.equal(posts.length,0);
state[0]={from:'gmail:ceo@aimicrotec.com',to:'is@gdh.ltd',subject:'UAT fixture',body:'UAT only'};tree=render();control(tree,'Save draft').props.onClick();assert.ok(store.get('hub:compose-draft:v1'));
fail=true;await control(tree,'Send').props.onClick();assert.equal(state[0].body,'UAT only');assert.ok(state[3].includes('preserved'));
fail=false;tree=render();await control(tree,'Send').props.onClick();assert.equal(posts[1].p.from,'ceo@aimicrotec.com');assert.equal(posts[1].p.to[0],'is@gdh.ltd');assert.equal(state[0].body,'');assert.equal(store.size,0);assert.ok(state[3].includes('test-id'));
console.log('PASS: sender filtering, invalid-send guard, persistent draft, failed-send preservation, exact sender/recipient payload, provider receipt');
