const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),noop=()=>{},elements={},listeners={};
const ctx=new Proxy({measureText:t=>({width:t.length*30})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>elements[id]??={style:{},dataset:{},classList:{toggle:noop},replaceChildren:noop,append:noop,setAttribute:noop,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:540,height:540}),width:1080,height:1080,focus(){document.activeElement=this},select:noop,remove:noop,setPointerCapture:noop};
const document={getElementById:el,querySelectorAll:()=>[],createElement:()=>({...el('base'),style:{},dataset:{}}),body:{append:noop},fonts:{ready:Promise.resolve()},addEventListener:noop,activeElement:{tagName:'CANVAS'}};
const c={document,window:{innerHeight:800,addEventListener:(name,fn)=>listeners[name]=fn},crypto:require('crypto').webcrypto,localStorage:{getItem:()=>null},structuredClone,console,setTimeout,clearTimeout,recording:false,mediaSource:()=>null};
vm.createContext(c);for(const file of ['app.js','history.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
c.listeners=listeners;c.ctx=ctx;
vm.runInContext(`
const initial=state.texts.length;
add('Hello');historyCheckpoint();historyStep(-1);if(state.texts.length!==initial)throw Error('undo add');historyStep(1);if(state.texts.at(-1).text!=='Hello')throw Error('redo add');
current().font='impact';current().color='#123456';current().opacity=35;current().x=.2;current().boxWidth=320;sync();historyCheckpoint();historyStep(-1);if(current().font==='impact')throw Error('undo style');historyStep(1);if(current().font!=='impact'||current().x!==.2)throw Error('redo style');
$('delete').onclick();historyCheckpoint();historyStep(-1);if(!state.texts.some(t=>t.text==='Hello'))throw Error('undo delete');historyStep(1);if(state.texts.some(t=>t.text==='Hello'))throw Error('redo delete');
historyStep(-1);add('new branch');historyCheckpoint();if(historyIndex!==editHistory.length-1||!$('redo').disabled)throw Error('branch');
state.ratio='custom';state.width=800;state.height=600;sync();historyCheckpoint();historyStep(-1);if(state.ratio==='custom')throw Error('undo canvas');historyStep(1);if(state.width!==800)throw Error('redo canvas');
let prevented=false;historyShortcut({ctrlKey:true,code:'KeyZ',preventDefault(){prevented=true}});if(!prevented||state.ratio==='custom')throw Error('CtrlZ');historyShortcut({ctrlKey:true,code:'KeyY',preventDefault(){}});if(state.ratio!=='custom')throw Error('CtrlY');
if(!alignShortcut({ctrlKey:true,code:'KeyR',preventDefault(){}})||current().align!=='right')throw Error('right align');if(historyShortcut({ctrlKey:true,code:'KeyR',preventDefault(){throw Error('history conflict')}}))throw Error('conflict');

// Use the installed DOM key handler rather than calling the helper directly.
document.activeElement={tagName:'CANVAS'};
const priorText=current().text;$('text').value='실제 입력 이벤트';$('text').oninput();
listeners.keydown({ctrlKey:true,code:'KeyZ',preventDefault(){}});if(current().text!==priorText)throw Error('DOM undo text');
listeners.keydown({ctrlKey:true,code:'KeyY',preventDefault(){}});if(current().text!=='실제 입력 이벤트')throw Error('DOM redo text');
const beforeX=current().x;dragging={mode:'move',dx:0,dy:0};canvas.onpointermove({clientX:180,clientY:200});canvas.onpointerup();listeners.keydown({ctrlKey:true,code:'KeyZ',preventDefault(){}});if(current().x!==beforeX)throw Error('DOM move undo');listeners.keydown({ctrlKey:true,code:'KeyY',preventDefault(){}});if(current().x===beforeX)throw Error('DOM move redo');
document.activeElement={tagName:'INPUT',type:'range'};const beforeAngle=current().rotation;$('rotation').value='70';$('rotation').oninput();listeners.keydown({ctrlKey:true,code:'KeyZ',preventDefault(){}});if(current().rotation!==beforeAngle)throw Error('range undo rotation');
document.activeElement={tagName:'CANVAS'};startInline(current());const editor=inlineEdit.el;editor.value='한글 '.repeat(1000);editor.oninput();if(current().text.length!==3000)throw Error('long input');listeners.scroll({target:editor});if(!inlineEdit)throw Error('scroll closed editor');if(parseFloat(editor.style.height)>560)throw Error('viewport cap');if(editor.style.overflowY!=='auto')throw Error('long text scroll');finishInline();

current().text='';delete current().boxWidth;startInline(current());const growing=inlineEdit.el,oldWidth=parseFloat(growing.style.width);growing.value='가나다라';growing.oninput();if(parseFloat(growing.style.width)<=oldWidth)throw Error('typing width did not grow');if(growing.scrollLeft!==0||growing.scrollTop!==0)throw Error('hidden beginning');
let blocked=false;growing.onkeydown({key:'Enter',shiftKey:true,stopPropagation(){},preventDefault(){blocked=true}});if(blocked||!inlineEdit)throw Error('ShiftEnter completion');
growing.onkeydown({key:'Enter',isComposing:true,stopPropagation(){},preventDefault(){throw Error('IME blocked')}});if(!inlineEdit)throw Error('IME prematurely finished');
growing.onkeydown({key:'Enter',stopPropagation(){},preventDefault(){blocked=true}});if(inlineEdit||!blocked)throw Error('Enter completion');if(current().text!=='가나다라')throw Error('lost entered text');
$('text').scrollHeight=350;autoGrowText($('text'));if($('text').style.height!=='350px')throw Error('auto expand');

document.activeElement={tagName:'CANVAS'};historyCheckpoint();listeners.keydown({ctrlKey:true,code:'KeyI',preventDefault(){}});if(!current().italic||!ctxFontTest())throw Error('italic event');historyStep(-1);if(current().italic)throw Error('undo italic');historyStep(1);if(!current().italic)throw Error('redo italic');
function ctxFontTest(){linesFor(current());return ctx.font.startsWith('italic ')}
$('shadow').checked=true;$('shadow').onchange();$('shadowColor').value='#123456';$('shadowColor').oninput();$('shadowBlur').value=12;$('shadowBlur').oninput();$('shadowDistance').value=9;$('shadowDistance').oninput();if(!validState(state)||!current().shadow||current().shadowBlur!==12)throw Error('shadow settings');const effectsCopy=JSON.parse(JSON.stringify(state));if(!validState(effectsCopy)||!effectsCopy.texts.find(t=>t.id===selected).italic)throw Error('effects roundtrip');current().shadowBlur=-1;if(validState(state))throw Error('invalid effect accepted');current().shadowBlur=12;
for(let i=0;i<65;i++){state.texts[0].rotation=i;historyCheckpoint()}if(editHistory.length>40)throw Error('history limit');
state.image='data:image/png;base64,new';historyCheckpoint();if(editHistory.length!==1)throw Error('media boundary');
for(const key of Object.keys(fonts)){state.texts[0].font=key;if(!validState(state))throw Error('font validation '+key)}
`,c);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(!html.includes('PROTOTYPE 03'));assert.equal((html.match(/<optgroup /g)||[]).length,4);
console.log('PASS: 24 font presets and JSON validation; undo/redo add, style, position, delete, canvas, branching, Ctrl+Z/Y, Ctrl+R right alignment, history bounds, media boundary, prototype label removed; dynamic input width, Enter/Shift+Enter and IME protection');

(async()=>{
 c.testFile={name:'photo.jpeg',slice:()=>({arrayBuffer:async()=>new Uint8Array([255,216,255,224]).buffer})};assert.equal(await vm.runInContext('inspectMediaFile(testFile)',c),'image/jpeg');
 c.testFile={name:'fake.png',slice:()=>({arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.0').buffer})};assert.equal(await vm.runInContext('inspectMediaFile(testFile)',c),null);
 const before=vm.runInContext('JSON.stringify(state)',c);await vm.runInContext('loadImage(testFile)',c);assert.equal(vm.runInContext('JSON.stringify(state)',c),before);
 vm.runInContext("state.texts=[sticker('hello',.5,.5,20)];selected=state.texts[0].id;render();if(clippedItems().length)throw Error('false clip');current().x=0;current().rotation=45;if(clippedItems().length!==1)throw Error('missed rotated clip')",c);
 el('clipWarning').showModal=()=>{elements.clipWarning.returnValue='cancel';elements.clipWarning.onclose()};assert.equal(await vm.runInContext('confirmExportBounds()',c),false);
 elements.clipWarning.showModal=()=>{elements.clipWarning.returnValue='download';elements.clipWarning.onclose()};assert.equal(await vm.runInContext('confirmExportBounds()',c),true);
 vm.runInContext("state.texts=[];render()",c);assert.equal(await vm.runInContext('confirmExportBounds()',c),true);
 console.log('PASS: JPEG signature, renamed PDF rejected without state loss, rotated clipping, cancel/continue dialog, no-warning path');
})().catch(e=>{console.error(e);process.exitCode=1});
