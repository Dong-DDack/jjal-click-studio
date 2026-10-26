// Local media only. Templates keep a re-encoded poster, never a file URL.
let moving=null, mediaLoadId=0, recording=false;
function mediaSource(){if(!moving)return null;if(moving.kind==='video')return moving.video.readyState>=2?moving.video:null;let elapsed=moving.elapsed;if(moving.playing)elapsed+=(performance.now()-moving.started)/1000;let time=elapsed%moving.duration;for(const f of moving.frames){if(time<f.duration)return f.image;time-=f.duration}return moving.frames[0].image}
function releaseMoving(m){if(!m)return;if(m.video){m.video.pause();m.video.removeAttribute('src');m.video.load()}if(m.url)URL.revokeObjectURL(m.url);m.frames?.forEach(f=>f.image.close())}
function clearMedia(){mediaLoadId++;releaseMoving(moving);moving=null;document.getElementById('mediaPanel').hidden=true;document.getElementById('exportFormat').disabled=false;document.getElementById('download').textContent=document.getElementById('exportFormat').value==='jpeg'?'JPG 내려받기 ↗':'PNG 내려받기 ↗'}
function waitMedia(el,event,action){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(Error('미디어 읽기 시간이 초과됐어요.')),15000);function done(err){clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);err?reject(err):resolve()}const ok=()=>done(),bad=()=>done(Error('이 동영상 형식은 브라우저에서 재생할 수 없어요. MP4 또는 WebM을 사용해 주세요.'));el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});try{action()}catch(e){done(e)}})}
async function seekMedia(video,time){if(Math.abs(video.currentTime-time)<.001&&video.readyState>=2)return;await waitMedia(video,'seeked',()=>video.currentTime=time)}
function clipRange(duration,start,length){if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(start)||!Number.isFinite(length)||start<0||start>=duration||length<.1||length>5)return null;return {start,length:Math.min(length,duration-start)}}
async function loadMovingMedia(file){if(recording)return status('영상을 저장한 뒤 미디어를 변경해 주세요.',true);const token=++mediaLoadId;let candidate=null;try{const video=file.type.startsWith('video/');if(file.size>(video?100:15)*1024*1024)throw Error(video?'동영상은 100MB 이하로 올려 주세요.':'GIF는 15MB 이하로 올려 주세요.');if(video){const url=URL.createObjectURL(file),v=document.createElement('video');candidate={kind:'video',video:v,url,start:0,length:5,playing:true};v.muted=true;v.playsInline=true;v.preload='auto';await waitMedia(v,'loadeddata',()=>{v.src=url;v.load()});if(!Number.isFinite(v.duration)||v.duration<.1||v.videoWidth*v.videoHeight>24000000)throw Error('재생 길이 또는 영상 크기를 처리할 수 없어요.');candidate.length=Math.min(5,v.duration)}else{if(!('ImageDecoder' in window))throw Error('이 브라우저는 움직이는 GIF 편집을 지원하지 않아요. 최신 Chrome 또는 Edge에서 열어 주세요.');const decoder=new ImageDecoder({data:await file.arrayBuffer(),type:'image/gif'});candidate={kind:'gif',frames:[],duration:0,elapsed:0,started:performance.now(),playing:true};try{await decoder.tracks.ready;const count=decoder.tracks.selectedTrack.frameCount;for(let i=0;i<count&&candidate.duration<5;i++){if(i>=300)throw Error('GIF 프레임이 너무 많아요. 짧은 GIF를 사용해 주세요.');const {image}=await decoder.decode({frameIndex:i});if(image.displayWidth*image.displayHeight>4000000||candidate.frames.length*image.displayWidth*image.displayHeight>30000000){image.close();throw Error('GIF가 너무 커요. 크기나 길이를 줄여 주세요.')}const duration=Math.min((image.duration||100000)/1000000,5-candidate.duration);candidate.frames.push({image,duration});candidate.duration+=duration}if(!candidate.frames.length)throw Error('GIF 프레임을 읽을 수 없어요.')}finally{decoder.close()}}
if(token!==mediaLoadId){releaseMoving(candidate);return}finishInline();releaseMoving(moving);moving=candidate;candidate=null;if(moving.kind==='gif')moving.started=performance.now();const source=mediaSource();const poster=document.createElement('canvas'),sw=source.videoWidth||source.displayWidth||source.width,sh=source.videoHeight||source.displayHeight||source.height;const scale=Math.min(1,1920/Math.max(sw,sh));poster.width=Math.round(sw*scale);poster.height=Math.round(sh*scale);poster.getContext('2d').drawImage(source,0,0,poster.width,poster.height);state.image=poster.toDataURL('image/png');const img=new Image();img.src=state.image;await img.decode();backgroundImage=img;document.getElementById('mediaPanel').hidden=false;document.getElementById('videoTrim').hidden=moving.kind!=='video';document.getElementById('mediaTitle').textContent=moving.kind==='video'?'동영상 · 최대 5초 구간':'움직이는 GIF · 최대 5초';if(moving.kind==='video'){document.getElementById('clipStart').max=Math.max(0,moving.video.duration-.1);document.getElementById('startSeconds').max=Math.max(0,moving.video.duration-.1);document.getElementById('clipStart').value=0;document.getElementById('startSeconds').value=0;document.getElementById('clipLength').value=moving.length;await moving.video.play().catch(()=>{moving.playing=false})}updateMediaInfo();render();status('움직이는 배경을 불러왔어요. 문구와 스티커를 붙여 보세요.')}catch(e){releaseMoving(candidate);if(token===mediaLoadId)status(e.message+' 기존 작업은 유지됩니다.',true)}}
function updateMediaInfo(){if(!moving)return;document.getElementById('exportFormat').disabled=true;document.getElementById('download').textContent='GIF 내려받기 ↗';document.getElementById('downloadMotion').textContent='GIF 저장 ↗';document.getElementById('playMedia').textContent=moving.playing?'일시정지':'재생';document.getElementById('clipInfo').textContent=moving.kind==='video'?`전체 ${moving.video.duration.toFixed(1)}초 · 선택 ${moving.start.toFixed(1)} ~ ${(moving.start+moving.length).toFixed(1)}초 (${moving.length.toFixed(1)}초)`:`GIF ${moving.duration.toFixed(2)}초 반복 재생`}
function motionTick(){if(moving&&!recording){if(moving.kind==='video'&&moving.playing&&!recording&&(moving.video.ended||moving.video.currentTime>=moving.start+moving.length)){moving.video.currentTime=moving.start;moving.video.play().catch(()=>{})}render();const overlay=document.getElementById('previewOverlay');if(!overlay.hidden){render(true);document.getElementById('previewImage').src=canvas.toDataURL('image/png');render()}}requestAnimationFrame(motionTick)}
document.addEventListener('DOMContentLoaded',()=>{
requestAnimationFrame(motionTick);
document.getElementById('clipStart').oninput=e=>document.getElementById('startSeconds').value=e.target.value;
document.getElementById('applyClip').onclick=async()=>{if(!moving||moving.kind!=='video'||recording)return;const range=clipRange(moving.video.duration,Number(document.getElementById('startSeconds').value),Number(document.getElementById('clipLength').value));if(!range)return status('시작은 영상 길이 안에서, 구간 길이는 0.1~5초로 입력해 주세요. 기존 구간은 유지됩니다.',true);try{await seekMedia(moving.video,range.start);Object.assign(moving,range);document.getElementById('clipStart').value=range.start;document.getElementById('clipLength').value=range.length;updateMediaInfo();status('선택한 구간을 적용했어요.')}catch(e){status(e.message,true)}};
document.getElementById('playMedia').onclick=async()=>{if(!moving||recording)return;try{if(moving.kind==='video'){if(moving.playing)moving.video.pause();else await moving.video.play()}else{if(moving.playing)moving.elapsed+=(performance.now()-moving.started)/1000;else moving.started=performance.now()}moving.playing=!moving.playing;updateMediaInfo()}catch{status('재생할 수 없어요.',true)}};
document.getElementById('downloadMotion').onclick=exportGif;
});
async function exportGif(){
 if(!moving||recording)return;
 if(!await confirmExportBounds())return status('GIF 저장을 취소했어요. 문구 위치를 조절해 주세요.');
 if(!window.Worker)return status('이 브라우저는 안전한 GIF 변환을 지원하지 않아요.',true);
 finishInline();recording=true;
 const media=moving,wasPlaying=media.playing,elapsed=media.elapsed,previousTime=media.video?.currentTime;
 const duration=media.kind==='video'?media.length:media.duration;
 const plan=gifOutputPlan(canvas.width,canvas.height,duration);
 const controller=new AbortController();
 const progress=document.getElementById('exportProgress'),message=document.getElementById('exportMessage'),bar=document.getElementById('exportBar'),cancel=document.getElementById('cancelExport');
 const locked=[...document.querySelectorAll('button,input,select,textarea')].filter(el=>el!==cancel).map(el=>[el,el.disabled]);
 let worker=null,pending=null,sequence=0,jobTimer;
 const fail=()=>controller.abort(Error('변환 시간이 초과됐어요. 더 짧은 구간으로 다시 시도해 주세요.'));
 const abortReason=()=>controller.signal.reason||Error('변환을 취소했어요.');
 function request(type,data={},transfer=[]){return new Promise((resolve,reject)=>{
  if(controller.signal.aborted)return reject(abortReason());
  const id=++sequence,timer=setTimeout(()=>{pending=null;reject(Error('GIF 변환 응답이 없어요.'));controller.abort()},10000);
  pending={id,resolve:value=>{clearTimeout(timer);pending=null;resolve(value)},reject:e=>{clearTimeout(timer);pending=null;reject(e)}};
  try{worker.postMessage({id,type,...data},transfer)}catch(e){pending.reject(e)}
 })}
 function interruptible(promise){return new Promise((resolve,reject)=>{
  const abort=()=>reject(abortReason());if(controller.signal.aborted)return abort();
  controller.signal.addEventListener('abort',abort,{once:true});
  promise.then(v=>{controller.signal.removeEventListener('abort',abort);resolve(v)},e=>{controller.signal.removeEventListener('abort',abort);reject(e)})
 })}
 controller.signal.addEventListener('abort',()=>{pending?.reject(abortReason());worker?.terminate()},{once:true});
 cancel.onclick=()=>controller.abort(Error('GIF 변환을 취소했어요. 기존 작업은 유지됩니다.'));
 function onEscape(e){if(e.key==='Escape'){e.preventDefault();cancel.onclick()}}
 window.addEventListener('keydown',onEscape);
 try{
  locked.forEach(([el])=>el.disabled=true);document.body.classList.add('exporting');progress.hidden=false;bar.value=0;
  message.textContent=`${plan.width} × ${plan.height}px GIF 준비 중…`;
  media.playing=false;media.video?.pause();jobTimer=setTimeout(fail,60000);
  await interruptible(document.fonts.ready);
  worker=createGifWorker();
  worker.onmessage=({data})=>{if(data.id!==pending?.id)return;data.error?pending.reject(Error(data.error)):pending.resolve(data)};
  worker.onerror=e=>{e.preventDefault();pending?.reject(Error('GIF 작업 스레드를 시작할 수 없어요. 로컬 서버에서 열어 다시 시도해 주세요.'));controller.abort()};
  await request('init',{width:plan.width,height:plan.height});
  const totalTicks=Math.max(plan.count,Math.round(duration*100));
  for(let i=0;i<plan.count;i++){
   if(controller.signal.aborted)throw abortReason();
   message.textContent=`장면 변환 ${i+1}/${plan.count} · ${plan.width} × ${plan.height}px`;
   const tick=Math.round(i*totalTicks/plan.count),next=Math.round((i+1)*totalTicks/plan.count);
   if(media.kind==='video')await interruptible(seekMedia(media.video,Math.min(media.start+tick/100,media.video.duration-.001)));
   else media.elapsed=tick/100;
   render(true,[plan.width,plan.height]);
   const pixels=ctx.getImageData(0,0,plan.width,plan.height).data;
   // Transfer one frame, await acknowledgment, then reuse memory on next frame.
   await request('frame',{buffer:pixels.buffer,delay:(next-tick)/100},[pixels.buffer]);
   bar.value=Math.round((i+1)/plan.count*95);
  }
  message.textContent='GIF 파일 마무리 중…';
  const {buffer}=await request('finish');
  const url=URL.createObjectURL(new Blob([buffer],{type:'image/gif'}));
  download(url,`딸깍-${plan.width}x${plan.height}.gif`);setTimeout(()=>URL.revokeObjectURL(url),30000);
  bar.value=100;status(`GIF를 저장했어요. ${plan.width} × ${plan.height}px · ${duration.toFixed(1)}초`);
 }catch(e){status(e.message||'GIF 변환에 실패했어요. 기존 작업은 유지됩니다.',true)}
 finally{
  clearTimeout(jobTimer);worker?.terminate();window.removeEventListener('keydown',onEscape);cancel.onclick=null;
  // Restore immediately; do not make editor recovery wait for a stuck decoder.
  if(media.video){try{media.video.currentTime=previousTime}catch{}if(wasPlaying)media.video.play().catch(()=>{})}
  media.elapsed=elapsed;media.started=performance.now();media.playing=wasPlaying;recording=false;
  locked.forEach(([el,disabled])=>el.disabled=disabled);document.body.classList.remove('exporting');progress.hidden=true;
  updateMediaInfo();render();
 }
}
