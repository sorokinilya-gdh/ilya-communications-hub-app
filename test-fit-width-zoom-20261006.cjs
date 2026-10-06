const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('assets/index-FitWidthZoom20261006.js','utf8');let slots=[],cursor=0,effects=[];
const ctx={F:{useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],x=>slots[i]=typeof x==='function'?x(slots[i]):x]},useRef(v){const i=cursor++;return slots[i]||(slots[i]={current:v})},useEffect(fn){effects.push(fn)}},m:{jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},HubEnvelope20261005(){},HubAddContact20261002(){},HubFullMessage20261002(){},window:{addEventListener(){},removeEventListener(){}},responsiveEmailHtml:x=>x,Map,Math,String,Number,ResizeObserver:class{observe(){}disconnect(){}},Un:{get:async()=>({data:{message:{id:'a',html:'<img width="2000">',bodyHydrated:true}}})}};
vm.createContext(ctx);vm.runInContext(s.slice(s.indexOf('function HubReader20261005'),s.indexOf('function HubReader20261005')+s.slice(s.indexOf('function HubReader20261005')).indexOf('\n}')+2),ctx);
let closed=0,tree;function render(){cursor=0;effects=[];tree=ctx.HubReader20261005({message:{id:'a',bodyHydrated:true,subject:'Wide email'},onClose:()=>closed++})}
function find(node,p){if(!node||typeof node!=='object')return null;if(p(node))return node;for(const child of[node.props?.children].flat(Infinity)){const found=find(child,p);if(found)return found}return null}
function click(label){const n=find(tree,n=>n.type==='button'&&(n.props.children===label||n.props['aria-label']===label));assert(n,label);n.props.onClick();render()}
function content(){return find(tree,n=>n.type===ctx.HubFullMessage20261002)}
render();assert.equal(content().props.zoom,1);click('Zoom in');assert.equal(content().props.zoom,1.25);click('Zoom out');assert.equal(content().props.zoom,1);
for(let i=0;i<12;i++)click('Zoom in');assert.equal(content().props.zoom,3);click('Fit to panel');assert.equal(content().props.zoom,1);
click('Full page');assert(tree.props.className.includes('reader-full-page'));click('Exit full page');assert(!tree.props.className.includes('reader-full-page'));assert.equal(closed,0);
click('Full page');click('Exit full page');click('Close message');assert.equal(closed,1);
const fullFn=s.slice(s.indexOf('function HubFullMessage20261002'),s.indexOf('function HubReplySend20261002'));vm.runInContext(fullFn,ctx);
slots=[];cursor=0;effects=[];ctx.HubFullMessage20261002({message:{id:'a'},zoom:1});slots[0].current={clientWidth:480};slots[2]={id:'a',html:'<img width="2000">'};cursor=0;effects=[];ctx.HubFullMessage20261002({message:{id:'a'},zoom:1});effects[0]();cursor=0;tree=ctx.HubFullMessage20261002({message:{id:'a'},zoom:1});assert.equal(tree.props.children.props.style.width,480);assert.equal(tree.props.children.props.children.props.style.width,480);
cursor=0;tree=ctx.HubFullMessage20261002({message:{id:'a'},zoom:2});assert.equal(tree.props.children.props.style.width,960);assert.equal(tree.props.children.props.children.props.style.transform,'scale(2)');
assert(tree.props.children.props.children.props.sandbox.indexOf('allow-scripts')<0);
console.log('PASS: default fit, zoom bounds, fit reset, full-page exit X, close behavior, resized width, enlarged scroll area, iframe sandbox preserved');
