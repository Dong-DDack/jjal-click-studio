const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),noop=()=>{},elements={};
const ctx=new Proxy({measureText:t=>({width:t.length*30})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>elements[id]??={style:{},dataset:{},classList:{toggle:noop},replaceChildren:noop,append:noop,setAttribute:noop,querySelectorAll:()=>[],contains:()=>false,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:540,height:540}),focus:noop,width:1080,height:1080};
const document={getElementById:el,querySelectorAll:()=>[],createElement:()=>({...el('base'),style:{},dataset:{}}),body:{append:noop},fonts:{ready:Promise.resolve()},activeElement:{tagName:'CANVAS'},addEventListener:noop};
const c={document,window:{innerWidth:1280,innerHeight:900,addEventListener:noop},crypto:require('crypto').webcrypto,localStorage:{getItem:()=>null},structuredClone,setTimeout,clearTimeout,console,recording:false,mediaSource:()=>null};
vm.createContext(c);for(const f of ['app.js','history.js','local-editor.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
vm.runInContext(`{
 const points=handlePoints(boxes[0]);if(points.filter(p=>p.mode==='scale').length!==4||points.filter(p=>p.mode==='rotate').length!==1)throw Error('handles');
 const t=current(),prior=t.size,b=boxes.find(b=>b.id===selected);dragging={mode:'scale',box:b,start:{x:b.x+b.width/2,y:b.y+b.height/2},initial:{...t}};canvas.onpointermove({clientX:(b.x+b.width)/2,clientY:(b.y+b.height)/2});canvas.onpointerup();if(t.size<=prior)throw Error('resize');
 $('typeBold').onclick();if(t.weight!==400)throw Error('bold');$('typeUnderline').onclick();$('typeStrike').onclick();if(!t.underline||!t.strike)throw Error('decorations');
 changeTypography('letterSpacing',3);changeTypography('lineHeight',1.5);changeTypography('opacity',70);if(!validState(state))throw Error('validation');
 historyStep(-1);if(current().opacity===70)throw Error('undo');historyStep(1);if(current().opacity!==70)throw Error('redo');
 const clone=JSON.parse(JSON.stringify(state));if(!validState(clone)||!clone.texts.find(t=>t.id===selected).underline)throw Error('roundtrip');
}`,c);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),js=fs.readFileSync(path.join(root,'local-editor.js'),'utf8');assert(html.includes('v1.1.0'));assert(!js.includes('typeCopyStyle'));
console.log('PASS: toolbar typography, corner resize, separate rotate handle, undo/redo, JSON style roundtrip, removed copy button, version');
