const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),noop=()=>{},elements={},disk=new Map();
let rejectWrites=false;
function fakeDB(){return {transaction(){const tx={};const store={get(key){const r={};setTimeout(()=>{r.result=structuredClone(disk.get(key));r.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return r},put(value,key){const r={};setTimeout(()=>{if(rejectWrites){tx.onerror?.();return}disk.set(key,structuredClone(value));r.result=key;r.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return r}};tx.objectStore=()=>store;return tx}}}
const indexedDB={open(){const r={};setTimeout(()=>{r.result=fakeDB();r.onsuccess?.()},0);return r}};
const context=new Proxy({measureText:t=>({width:t.length*30})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>elements[id]??={value:'',style:{},dataset:{},classList:{toggle:noop},replaceChildren:noop,append:noop,setAttribute:noop,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:540,height:540}),width:1080,height:1080};
const document={getElementById:el,querySelectorAll:()=>[],createElement:()=>({...el('base'),style:{},dataset:{}}),fonts:{ready:Promise.resolve()},addEventListener:noop,activeElement:{tagName:'BODY'}};
class Reader{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload()})}}
class Img{async decode(){if(this.src==='broken')throw Error('invalid poster')}}
const c={document,window:{addEventListener:noop,indexedDB},indexedDB,FileReader:Reader,Image:Img,File,Blob,atob,btoa,crypto:require('crypto').webcrypto,structuredClone,console,setTimeout,clearTimeout,performance,localStorage:{getItem:()=>null},recording:false,moving:null,mediaSource:()=>null,clipRange:(duration,start,length)=>start>=0&&start+length<=duration?{start,length}:null,releaseMoving:noop,clearMedia:()=>{},updateMediaInfo:noop};
vm.createContext(c);for(const f of ['app.js','history.js','template-media.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
async function main(){
 await vm.runInContext('templatesReady',c);
 c.originalFile=new File([new Uint8Array([...Buffer.from('GIF89a'),1,0,1,0])],'sample.gif',{type:'image/gif'});
 vm.runInContext("moving={kind:'gif',file:originalFile,duration:1};state.image=null",c);
 const record=vm.runInContext("captureTemplate('움직이는 카드')",c);
 c.record=record;assert.equal(await vm.runInContext('persist([record])',c),true);
 assert.equal(disk.get('all')[0].media.file.size,c.originalFile.size);
 const jsonItem=await vm.runInContext('serializeTemplate(record)',c);
 const payload=JSON.parse(JSON.stringify(jsonItem));c.payload=payload;
 const restored=await vm.runInContext('deserializeTemplate(payload)',c);c.restored=restored;
 assert.deepEqual(Buffer.from(await restored.media.file.arrayBuffer()),Buffer.from(await c.originalFile.arrayBuffer()));
 assert.equal(restored.media.file.name,'sample.gif');assert.equal(vm.runInContext('validTemplateRecord(restored)',c),true);
 const old=JSON.stringify(vm.runInContext('templates.map(t=>t.id)',c));rejectWrites=true;assert.equal(await vm.runInContext("persist([{...record,id:'failed'}])",c),false);assert.equal(JSON.stringify(vm.runInContext('templates.map(t=>t.id)',c)),old);rejectWrites=false;
 c.bad={...payload,media:{...payload.media,dataUrl:'data:text/html;base64,PHNjcmlwdD4='}};await assert.rejects(vm.runInContext('deserializeTemplate(bad)',c));
 c.videoFile=new File([new Uint8Array([0,0,0,16,...Buffer.from('ftyp'),...Buffer.from('mp42')])],'movie.mp4',{type:'video/mp4'});
 vm.runInContext("moving={kind:'video',file:videoFile,start:12.5,length:3.2};record=captureTemplate('영상 구간')",c);
 const videoJSON=await vm.runInContext('serializeTemplate(record)',c);c.payload=JSON.parse(JSON.stringify(videoJSON));const videoRestored=await vm.runInContext('deserializeTemplate(payload)',c);assert.equal(videoRestored.media.start,12.5);assert.equal(videoRestored.media.length,3.2);
 c.moving=null;vm.runInContext('moving=null',c);c.legacy={id:'legacy',name:'정지 이미지',state:structuredClone(record.state)};assert.equal(vm.runInContext('validTemplateRecord(legacy)',c),true);
 // Exercise decoder restoration separately from JSON validation.
 c.videoTemplate=videoRestored;c.seen=[];
 vm.runInContext("prepareMovingMedia=async(file)=>({kind:'video',file,video:{duration:30,currentTime:0,play:async()=>{},pause(){}},playing:true});seekMedia=async(v,t)=>{seen.push(t);v.currentTime=t}",c);
 await vm.runInContext('restore(videoTemplate.state,videoTemplate.media)',c);
 assert.equal(vm.runInContext('moving.start',c),12.5);assert.equal(vm.runInContext('moving.length',c),3.2);assert.equal(vm.runInContext('moving.video.currentTime',c),12.5);assert.equal(elements.clipLength.value,3.2);
 console.log('PASS: GIF original bytes JSON roundtrip; video source/start/length; Blob persistence; failed transaction keeps list; unsafe media rejected; legacy template; decoder restores chosen segment');
}
main().catch(e=>{console.error(e);process.exitCode=1});
