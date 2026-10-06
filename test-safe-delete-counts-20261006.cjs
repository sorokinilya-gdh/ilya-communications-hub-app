const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('assets/index-SafeDeleteCounts20261006.js','utf8');
const component=source.slice(source.indexOf('function HubNextPreview20261006'),source.indexOf('function HubPageRows20261004'));
let slots=[],cursor=0,effects=[],clock=10000,requests=[],events=[],focus=[],tree;
const rows=[{id:'a',sender:'Alice',subject:'A',time:0,provider:'gmail'},{id:'b',sender:'Bob',subject:'B',time:0,provider:'gmail'},{id:'c',sender:'Carol',subject:'C',time:0,provider:'gmail'}];
let resolvePost;
const context={F:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(initial){const i=cursor++;return slots[i]||(slots[i]={current:initial})},useEffect(fn){effects.push(fn)}},m:{jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},Date:class extends Date{static now(){return clock}},Set,Map,String,Number,Math,localStorage:{getItem:()=>null,setItem(){}},window:{dispatchEvent:e=>events.push(e),addEventListener(){},removeEventListener(){}},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},requestAnimationFrame:fn=>fn(),document:{querySelectorAll:()=>rows.map(row=>({getAttribute:()=>row.id,focus:()=>focus.push(row.id)}))},Un:{get:async()=>({data:{messages:rows,total:14234}}),post:(path,body)=>{requests.push({path,body});return new Promise(r=>resolvePost=r)}},HubArchivePageKey20261004:()=>'',HubReadArchivePage20261004:()=>null,HubWriteArchivePage20261004(){},HubSelectionBar20261004(){},HubEnvelope20261005(){},HubReader20261005(){},HubTogglePage20261004(){},HubClearArchivePages20261004(){},setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(component,context);
function render(){cursor=0;effects=[];tree=context.HubFolderPages20261004({folder:'inbox'});return tree}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const match=find(child,predicate);if(match)return match}return null}
function deleteButton(id){return find(find(tree,n=>n.props?.['data-email-id']===id),n=>n.type==='button'&&n.props.children==='Delete')}
(async()=>{render();effects.forEach(fn=>fn());await new Promise(r=>setImmediate(r));render();
assert.equal(slots[1],14234);assert.equal(events.at(-1).detail.total,14234);
find(tree,n=>n.props?.['data-email-id']==='a').props.onClick();render();
const event={detail:1,stopPropagation(){}};
deleteButton('a').props.onClick(event);deleteButton('b').props.onClick(event);
assert.equal(requests.length,1);assert.equal(requests[0].body.id,'a');
resolvePost({data:{}});await new Promise(r=>setImmediate(r));render();
assert.equal(slots[7].id,'b');assert.equal(slots[0].length,2);assert.equal(focus.at(-1),'b');assert.equal(events.at(-1).detail.total,14233);
deleteButton('b').props.onClick(event);assert.equal(requests.length,1,'immediate click after row shifts must not delete B');
clock+=800;deleteButton('b').props.onClick({...event,detail:2});assert.equal(requests.length,1,'second click of double click ignored');
deleteButton('b').props.onClick(event);assert.equal(requests.length,2);assert.equal(requests[1].body.id,'b');
resolvePost({data:{}});await new Promise(r=>setImmediate(r));
assert(source.includes('unifiedInboxTotal.toLocaleString()'));
assert(!source.includes('String(gTotal?(removedMailboxes'));
console.log('PASS: shared count, single ID per action, synchronous lock, cooldown, double-click guard, next preview and row focus');})().catch(e=>{console.error(e);process.exit(1)});
