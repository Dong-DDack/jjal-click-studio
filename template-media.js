// v2 templates keep original media as Blobs in IndexedDB. Only JSON export
// converts them to base64; editing and undo never copy a movie into state.
const templateDB=new Promise((resolve,reject)=>{
 if(!window.indexedDB)return reject(Error('이 브라우저는 미디어 템플릿 저장을 지원하지 않아요.'));
 const request=indexedDB.open('ddalkkak-templates',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('templates');
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(Error('템플릿 저장소를 열 수 없어요.'));
 request.onblocked=()=>reject(Error('다른 탭을 닫고 다시 시도해 주세요.'));
});
async function templateTransaction(mode,operation){const db=await templateDB;return new Promise((resolve,reject)=>{const tx=db.transaction('templates',mode),request=operation(tx.objectStore('templates'));let value;request.onsuccess=()=>value=request.result;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('브라우저 저장 공간이 부족하거나 저장할 수 없어요. 기존 목록은 유지됩니다.'))})}
let templateBusy=false;
function captureTemplate(name,id=uid()){
 return {id,name,state:structuredClone(state),media:moving?{kind:moving.kind,file:moving.file,start:moving.kind==='video'?moving.start:0,length:moving.kind==='video'?moving.length:moving.duration}:null};
}
function validTemplateMedia(media){return media===null||media===undefined||media&&['gif','video'].includes(media.kind)&&media.file instanceof Blob&&media.file.size>0&&media.file.size<=(media.kind==='gif'?15:100)*1024*1024&&typeof media.file.name==='string'&&media.file.name.length<=255&&Number.isFinite(media.start)&&media.start>=0&&Number.isFinite(media.length)&&media.length>0&&media.length<=5}
function validTemplateRecord(t){return !!t&&typeof t.id==='string'&&t.id.length>0&&t.id.length<=100&&typeof t.name==='string'&&t.name.length<=40&&validState(t.state)&&validTemplateMedia(t.media)}
persist=async function(next){try{if(!next.every(validTemplateRecord))throw Error('저장할 템플릿 정보가 올바르지 않아요.');await templateTransaction('readwrite',store=>store.put(next,'all'));templates=next;drawTemplates();return true}catch(e){status(e.message,true);return false}};
restore=async function(s,media=null){
 let candidate=null;
 try{
  if(recording)throw Error('GIF 저장을 마친 뒤 불러와 주세요.');
  if(!validState(s)||!validTemplateMedia(media))throw Error('템플릿 정보가 올바르지 않아요.');
  let img=null;if(s.image){img=new Image();img.src=s.image;await img.decode()}
  if(media){
   const mime=await inspectMediaFile(media.file);
   if(!mime||!(media.kind==='gif'?mime==='image/gif':mime.startsWith('video/')))throw Error('템플릿 미디어 형식이 올바르지 않아요.');
   candidate=await prepareMovingMedia(media.file);
   if(candidate.kind==='video'){const range=clipRange(candidate.video.duration,media.start,media.length);if(!range||Math.abs(range.length-media.length)>.01)throw Error('저장된 영상 구간이 원본 길이를 벗어나요.');Object.assign(candidate,range);await seekMedia(candidate.video,range.start)}
  }
  finishInline();clearMedia();state=structuredClone(s);backgroundImage=img;moving=candidate;candidate=null;
  if(moving){showRestoredMedia();if(moving.kind==='video')await moving.video.play().catch(()=>moving.playing=false);else moving.started=performance.now()}
  selected=state.texts[0]?.id;sync();historyCheckpoint();status(media?'원본 미디어와 문구·선택 구간을 복원했어요.':'템플릿을 불러왔어요.');
 }catch(e){releaseMoving(candidate);status(e.message+' 기존 작업은 유지됩니다.',true)}
};
function showRestoredMedia(){
 $('mediaPanel').hidden=false;$('videoTrim').hidden=moving.kind!=='video';$('mediaTitle').textContent=moving.kind==='video'?'동영상 · 복원한 구간':'움직이는 GIF · 복원 완료';
 if(moving.kind==='video'){for(const id of ['clipStart','startSeconds']){$(id).max=Math.max(0,moving.video.duration-.1);$(id).value=moving.start}$('clipLength').value=moving.length}
 updateMediaInfo();
}
drawTemplates=function(){
 $('templateList').replaceChildren();
 for(const t of templates){const row=document.createElement('div');row.className='template-item';const load=document.createElement('button');load.textContent=(t.media?'▶ ':'')+t.name;load.title=t.media?'원본 '+(t.media.kind==='gif'?'GIF':'동영상')+' 포함':'정지 이미지 템플릿';load.onclick=async()=>{await restore(t.state,t.media);$('templateName').value=t.name};
 const update=document.createElement('button');update.textContent='덮어쓰기';update.onclick=()=>templateAction(async()=>{const updated=captureTemplate($('templateName').value.trim()||t.name,t.id);if(await persist(templates.map(v=>v.id===t.id?updated:v)))status('원본 미디어를 포함해 템플릿을 수정했어요.')});
 const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',t.name+' 삭제');del.onclick=()=>templateAction(async()=>{if(await persist(templates.filter(v=>v.id!==t.id)))status('템플릿을 삭제했어요.')});row.append(load,update,del);$('templateList').append(row)}
};
async function templateAction(action){if(templateBusy||recording)return;templateBusy=true;try{await templatesReady;await action()}catch(e){status(e.message||'템플릿 작업을 완료하지 못했어요.',true)}finally{templateBusy=false}}
$('saveTemplate').onclick=()=>templateAction(async()=>{finishInline();if(templates.length>=30)throw Error('템플릿은 최대 30개까지 저장할 수 있어요.');const name=$('templateName').value.trim()||'나의 카드 '+(templates.length+1);if(await persist([...templates,captureTemplate(name)]))status('원본 미디어까지 이 브라우저에 저장했어요.')});
function blobDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('미디어 백업 파일을 읽지 못했어요.'));reader.readAsDataURL(blob)})}
async function serializeTemplate(t){return {...t,media:t.media?{kind:t.media.kind,start:t.media.start,length:t.media.length,name:t.media.file.name,type:t.media.file.type,dataUrl:await blobDataUrl(t.media.file)}:null}}
async function deserializeTemplate(t){
 if(!t||typeof t!=='object')throw Error('필수 템플릿 항목이 없어요.');
 if(!t.media)return {...t,media:null};const m=t.media;
 if(typeof m.dataUrl!=='string'||!/^data:(image\/gif|video\/(mp4|webm|quicktime));base64,[A-Za-z0-9+/]*={0,2}$/.test(m.dataUrl)||typeof m.name!=='string'||m.name.length>255)throw Error('미디어 백업 데이터가 올바르지 않아요.');
 const split=m.dataUrl.indexOf(','),type=m.dataUrl.slice(5,m.dataUrl.indexOf(';'));if(type!==m.type)throw Error('미디어 종류가 일치하지 않아요.');
 const encoded=m.dataUrl.slice(split+1);if(encoded.length>(m.kind==='gif'?15:100)*1024*1024*4/3+4)throw Error('미디어 백업이 너무 커요.');
 const binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const file=new File([bytes],m.name,{type});const media={kind:m.kind,start:m.start,length:m.length,file};
 if(!validTemplateMedia(media)||await inspectMediaFile(file)!==type)throw Error('미디어 파일 검증에 실패했어요.');
 return {...t,media};
}
$('exportJson').onclick=()=>templateAction(async()=>{
 const sourceBytes=templates.reduce((n,t)=>n+(t.media?.file.size||0)+(t.state.image?.length||0),0);
 if(sourceBytes>80000000)throw Error('JSON 한 파일의 미디어 합계는 80MB 이하로 줄여 주세요.');
 status('원본 미디어를 포함한 JSON을 만드는 중이에요…');
 const output=[];for(const t of templates)output.push(await serializeTemplate(t));
 const blob=new Blob([JSON.stringify({version:2,templates:output})],{type:'application/json'});const url=URL.createObjectURL(blob);download(url,'딸깍-템플릿-v2.json');setTimeout(()=>URL.revokeObjectURL(url),30000);status('움직임과 구간을 포함한 JSON을 저장했어요. '+(blob.size/1048576).toFixed(1)+'MB');
});
$('jsonInput').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;templateAction(async()=>{
 try{
  if(file.size>120000000)throw Error('JSON은 120MB 이하로 가져와 주세요.');
  const data=JSON.parse(await file.text());if(![1,2].includes(data.version)||!Array.isArray(data.templates)||data.templates.length>30)throw Error('지원하지 않는 템플릿 JSON이에요.');
  const next=[];for(const item of data.templates){const t=data.version===2?await deserializeTemplate(item):item;if(!validTemplateRecord(t))throw Error('필수 항목이 없거나 잘못된 템플릿이에요.');next.push(t)}
  if(new Set(next.map(t=>t.id)).size!==next.length)throw Error('템플릿 ID가 중복돼요.');
  // Decode each asset before committing, releasing temporary decoder memory.
  for(const t of next){if(t.state.image){const img=new Image();img.src=t.state.image;await img.decode()}if(t.media){const candidate=await prepareMovingMedia(t.media.file);try{if(candidate.kind==='video'){const r=clipRange(candidate.video.duration,t.media.start,t.media.length);if(!r||Math.abs(r.length-t.media.length)>.01)throw Error('영상 구간이 원본 길이를 벗어나요.')}}finally{releaseMoving(candidate)}}}
  if(await persist(next))status('JSON을 복원했어요. 목록의 ▶ 템플릿을 누르면 움직이는 원본도 불러옵니다.');
 }catch(e){status((e.message||'올바른 JSON이 아니에요.')+' 기존 목록과 편집 내용은 유지됩니다.',true)}
 })};
const templatesReady=(async()=>{try{const saved=await templateTransaction('readonly',s=>s.get('all'));if(saved!==undefined){if(!Array.isArray(saved)||!saved.every(validTemplateRecord))throw Error('저장된 템플릿이 손상됐어요.');templates=saved}else if(templates.length)await persist(templates);drawTemplates()}catch(e){status(e.message,true)}})();
