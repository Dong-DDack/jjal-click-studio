const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
async function main(){
 const c={Blob,TextEncoder,console};vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'gif-encoder.js'),'utf8')+';globalThis.Encoder=StudioGifEncoder;globalThis.colors=adaptiveGifColors',c);
 const w=48,h=36,frames=[];let oldError=0,newError=0;
 const encoder=new c.Encoder(w,h);
 for(let f=0;f<3;f++){
  const rgba=new Uint8Array(w*h*4);
  for(let i=0;i<w*h;i++){rgba[i*4]=30+(i%w)*2+f*4;rgba[i*4+1]=60+Math.floor(i/w)*2;rgba[i*4+2]=110+(i%w);rgba[i*4+3]=255}
  const q=c.colors(rgba);for(let i=0;i<w*h;i++)for(let k=0;k<3;k++){const v=rgba[i*4+k],levels=k===2?3:7;const old=Math.round((v>>(k===2?6:5))*255/levels);oldError+=(v-old)**2;newError+=(v-q.palette[q.indices[i]*3+k])**2}
  frames.push(q);encoder.addFrame(rgba,.1+f*.01);
 }
 assert(newError<oldError*.25,'adaptive palette must reduce squared error by at least 75% on this fixture');
 const data=Buffer.from(await encoder.finish().arrayBuffer());assert.equal(data.subarray(0,6).toString(),'GIF89a');
 assert.equal(data.readUInt16LE(6),w);assert.equal(data.readUInt16LE(8),h);
 let p=13,frame=0,delays=[];
 while(p<data.length){const tag=data[p++];if(tag===0x3b)break;if(tag===0x21){const label=data[p++];if(label===0xf9)delays.push(data.readUInt16LE(p+2));while(true){const n=data[p++];if(!n)break;p+=n}continue}
  assert.equal(tag,0x2c);const flags=data[p+8];p+=9;assert(flags&128);const table=data.subarray(p,p+768);p+=768;assert.deepEqual(table,Buffer.from(frames[frame].palette));const min=data[p++],chunks=[];while(true){const n=data[p++];if(!n)break;chunks.push(data.subarray(p,p+n));p+=n}
  const packed=Buffer.concat(chunks),clear=1<<min,end=clear+1;let dict,bits,next,previous,bit=0,pixels=[];
  function reset(){dict=Array.from({length:clear},(_,i)=>[i]);bits=min+1;next=end+1;previous=null}reset();
  while(bit+bits<=packed.length*8){let code=0;for(let i=0;i<bits;i++)code|=((packed[(bit+i)>>3]>>((bit+i)&7))&1)<<i;bit+=bits;if(code===clear){reset();continue}if(code===end)break;const entry=dict[code]??(code===next&&previous?[...previous,previous[0]]:null);assert(entry);pixels.push(...entry);if(previous){dict[next++]=[...previous,entry[0]];if(next===1<<bits&&bits<12)bits++}previous=entry}
  assert.deepEqual(Buffer.from(pixels),Buffer.from(frames[frame].indices));frame++;
 }
 assert.equal(frame,3);assert.deepEqual(delays,[10,11,12]);assert(data.includes(Buffer.from('NETSCAPE2.0')));
 console.log('PASS: independent GIF decode, adaptive palettes, dimensions, timing, loop; fixture color error reduced '+Math.round((1-newError/oldError)*100)+'%');

 // Exercise actual worker encoding via Node's worker_threads adapter.
 const {Worker}=require('worker_threads');
 const wc={Blob,TextEncoder,console};vm.createContext(wc);
 vm.runInContext(fs.readFileSync(path.join(root,'gif-encoder.js'),'utf8'),wc);
 vm.runInContext(fs.readFileSync(path.join(root,'gif-worker.js'),'utf8'),wc);
 const code=vm.runInContext("[StudioGifEncoder.toString(),adaptiveGifColors.toString(),'('+gifWorkerMain.toString()+')()'].join(String.fromCharCode(10))",wc);
 function realWorker(){const w=new Worker("const {parentPort}=require('worker_threads');global.self={postMessage:(v,t)=>parentPort.postMessage(v,t)};parentPort.on('message',data=>self.onmessage({data}));\n"+code,{eval:true});w.on('message',data=>w.onmessage?.({data}));w.on('error',e=>w.onerror?.({preventDefault(){},message:e.message}));return w}
 let jobs=0;
 const request=(w,type,data={},transfer=[])=>new Promise((resolve,reject)=>{const id=++jobs;w.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data);w.postMessage({id,type,...data},transfer)});
 const stress=realWorker();const start=performance.now();await request(stress,'init',{width:480,height:270});
 for(let f=0;f<40;f++){const pixels=new Uint8Array(480*270*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=(i+f)%255;pixels[i+1]=(i/4+f)%255;pixels[i+2]=100;pixels[i+3]=255}await request(stress,'frame',{buffer:pixels.buffer,delay:.125},[pixels.buffer]);assert.equal(pixels.byteLength,0)}
 const result=await request(stress,'finish');assert.equal(Buffer.from(result.buffer).subarray(0,6).toString(),'GIF89a');await stress.terminate();
 console.log('PASS: real worker, 40 frames at 480x270, transferred frame memory; '+Math.round(performance.now()-start)+'ms, '+(result.buffer.byteLength/1048576).toFixed(1)+'MB GIF');
 const noop=()=>{},elements={},seeks=[],saved=[],controls=[{disabled:false},{disabled:true}];
 const document={fonts:{ready:Promise.resolve()},querySelectorAll:()=>controls,body:{classList:{add:noop,remove:noop}},addEventListener:noop,getElementById:id=>elements[id]??={}};
 const v={currentTime:1.7,duration:8,pause:noop,play:()=>Promise.resolve()};
 const m={document,window:{Worker:true,addEventListener:noop,removeEventListener:noop},performance,Blob,TextEncoder,console,AbortController,setTimeout:(fn,ms)=>ms===30000?0:setTimeout(fn,ms),clearTimeout,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},canvas:{width:4,height:4},ctx:{getImageData:()=>({data:new Uint8Array(64).fill(255)})},render:noop,status:noop,finishInline:noop,confirmExportBounds:async()=>true,download:(url,name)=>saved.push(name),createGifWorker:realWorker};
 vm.createContext(m);vm.runInContext(fs.readFileSync(path.join(root,'gif-worker.js'),'utf8'),m);m.createGifWorker=realWorker;vm.runInContext(fs.readFileSync(path.join(root,'media.js'),'utf8'),m);
 m.testVideo=v;m.testSeeks=seeks;
 vm.runInContext("moving={kind:'video',video:testVideo,start:2,length:.4,playing:true};seekMedia=async(v,t)=>{testSeeks.push(t);v.currentTime=t}",m);
 await vm.runInContext('exportGif()',m);
 assert(saved[0].endsWith('.gif'));assert(seeks.length>2);assert(seeks.every(t=>t>=2&&t<2.4));assert.equal(v.currentTime,1.7);assert.equal(controls[0].disabled,false);assert.equal(controls[1].disabled,true);assert.equal(vm.runInContext('recording',m),false);
 vm.runInContext("seekMedia=async()=>{throw Error('decode failed')}",m);await vm.runInContext('exportGif()',m);assert.equal(vm.runInContext('recording',m),false);assert.equal(controls[0].disabled,false);
 vm.runInContext("seekMedia=()=>new Promise(()=>{})",m);const job=vm.runInContext('exportGif()',m);await new Promise(resolve=>setTimeout(resolve,100));elements.cancelExport.onclick();await job;assert.equal(vm.runInContext('recording',m),false);assert.equal(controls[0].disabled,false);assert.equal(elements.exportProgress.hidden,true);
 const plan=vm.runInContext('gifOutputPlan(4096,4096,5)',m);assert.equal(plan.width,480);assert.equal(plan.count,40);
 console.log('PASS: video segment, playback restoration, failure unlock, cancel during stuck seek, bounded large-canvas plan');
}
main().catch(e=>{console.error(e);process.exitCode=1});
