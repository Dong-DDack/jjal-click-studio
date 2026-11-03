const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),noop=()=>{},elements={},listeners={};
const ctx=new Proxy({measureText:t=>({width:t.length*30})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>elements[id]??={style:{},dataset:{},classList:{toggle:noop},replaceChildren:noop,append:noop,setAttribute:noop,querySelectorAll:()=>[],contains:()=>false,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:540,height:540}),focus:noop,select:noop,remove:noop,width:1080,height:1080};
const document={getElementById:el,querySelectorAll:()=>[],createElement:()=>({...el('base'),style:{},dataset:{}}),body:{append:noop},fonts:{ready:Promise.resolve()},activeElement:{tagName:'CANVAS'},addEventListener:noop};
const c={document,window:{innerWidth:1280,innerHeight:900,addEventListener:(name,fn)=>listeners[name]=fn},crypto:require('crypto').webcrypto,localStorage:{getItem:()=>null},structuredClone,setTimeout,clearTimeout,console,recording:false,mediaSource:()=>null};
c.listeners=listeners;vm.createContext(c);for(const f of ['app.js','history.js','local-editor.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
vm.runInContext(`{
 const points=handlePoints(boxes[0]);if(points.filter(p=>p.mode==='scale').length!==4||points.filter(p=>p.mode==='rotate').length!==1)throw Error('handles');
 const t=current(),prior=t.size,b=boxes.find(b=>b.id===selected);dragging={mode:'scale',box:b,start:{x:b.x+b.width/2,y:b.y+b.height/2},initial:{...t}};canvas.onpointermove({clientX:(b.x+b.width)/2,clientY:(b.y+b.height)/2});canvas.onpointerup();if(t.size<=prior)throw Error('resize');
 $('typeBold').onclick();if(t.weight!==400)throw Error('bold');$('typeUnderline').onclick();$('typeStrike').onclick();if(!t.underline||!t.strike)throw Error('decorations');
 changeTypography('letterSpacing',3);changeTypography('lineHeight',1.5);changeTypography('opacity',70);if(!validState(state))throw Error('validation');
 historyStep(-1);if(current().opacity===70)throw Error('undo');historyStep(1);if(current().opacity!==70)throw Error('redo');
 for(const [code,key,expected] of [['KeyB','weight',700],['KeyI','italic',true],['KeyU','underline',false],['KeyL','align','left'],['KeyE','align','center'],['KeyR','align','right']]){let blocked=false;if(!typographyShortcut({ctrlKey:true,code,preventDefault(){blocked=true}})||!blocked||current()[key]!==expected)throw Error('shortcut '+code)}
 let prevented=false;listeners.keydown({ctrlKey:true,code:'KeyB',preventDefault(){prevented=true}});if(!prevented||current().weight!==400)throw Error('global B');
 startInline(current());inlineEdit.el.onkeydown({ctrlKey:true,code:'KeyU',stopPropagation(){},preventDefault(){}});if(!current().underline)throw Error('inline U');finishInline();
 current().underline=true;
 changeTypography('size',80);const oldSize=current().size;listeners.keydown({ctrlKey:true,code:'NumpadAdd',key:'+',preventDefault(){}});if(current().size!==Math.min(180,oldSize+2))throw Error('Ctrl plus');listeners.keydown({ctrlKey:true,code:'NumpadSubtract',key:'-',preventDefault(){}});if(current().size!==oldSize)throw Error('Ctrl minus');
 startInline(current());inlineEdit.el.onkeydown({ctrlKey:true,code:'NumpadAdd',stopPropagation(){},preventDefault(){}});if(current().size!==oldSize+2)throw Error('inline numpad plus');finishInline();changeTypography('size',180);typographyShortcut({ctrlKey:true,code:'NumpadAdd',preventDefault(){}});if(current().size!==180)throw Error('max size');changeTypography('size',20);typographyShortcut({ctrlKey:true,code:'NumpadSubtract',preventDefault(){}});if(current().size!==20)throw Error('min size');
 const beforeTopRow=current().size;let topBlocked=false;if(typographyShortcut({ctrlKey:true,code:'Equal',key:'+',preventDefault(){topBlocked=true}})||typographyShortcut({ctrlKey:true,code:'Minus',key:'-',preventDefault(){topBlocked=true}})||topBlocked||current().size!==beforeTopRow)throw Error('top row intercepted');
 const clone=JSON.parse(JSON.stringify(state));if(!validState(clone)||!clone.texts.find(t=>t.id===selected).underline)throw Error('roundtrip');
}`,c);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),js=fs.readFileSync(path.join(root,'local-editor.js'),'utf8');assert(html.includes('v1.2.0'));assert(!js.includes('typeCopyStyle'));
console.log('PASS: toolbar typography, corner resize, separate rotate handle, undo/redo, JSON style roundtrip, removed copy button, version');
