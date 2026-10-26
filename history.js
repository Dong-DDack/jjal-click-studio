// Bounded editor history. Uploaded media starts a new history, avoiding keeping
// decoded videos and GIF frames alive in an undo stack.
let editHistory=[],historyIndex=-1,historyApplying=false,historyTimer=null;
function historyCheckpoint(){
 clearTimeout(historyTimer);if(historyApplying||recording||dragging)return;
 const serialized=JSON.stringify(state);
 if(editHistory[historyIndex]?.serialized===serialized)return;
 if(editHistory.length&&editHistory[historyIndex].state.image!==state.image){editHistory=[];historyIndex=-1}
 editHistory.splice(historyIndex+1);
 editHistory.push({state:structuredClone(state),selected,serialized});
 if(editHistory.length>40)editHistory.shift();
 // Avoid retaining many copies of large uploaded-image strings.
 let bytes=editHistory.reduce((n,h)=>n+h.serialized.length*2,0);
 while(editHistory.length>2&&bytes>20000000)bytes-=editHistory.shift().serialized.length*2;
 historyIndex=editHistory.length-1;updateHistoryButtons();
}
function scheduleHistory(){if(historyApplying)return;clearTimeout(historyTimer);historyTimer=setTimeout(historyCheckpoint,0)}
function updateHistoryButtons(){
 $('undo').disabled=historyIndex<=0;$('redo').disabled=historyIndex>=editHistory.length-1;
}
function historyStep(direction){
 if(recording||historyApplying)return;
 finishInline();dragging=null;historyCheckpoint();
 const next=historyIndex+direction;
 if(next<0||next>=editHistory.length)return status(direction<0?'더 이상 되돌릴 작업이 없어요.':'다시 적용할 작업이 없어요.');
 historyApplying=true;
 try{historyIndex=next;const snapshot=editHistory[next];state=structuredClone(snapshot.state);selected=state.texts.some(t=>t.id===snapshot.selected)?snapshot.selected:state.texts[0]?.id;sync();updateHistoryButtons();status(direction<0?'작업을 되돌렸어요.':'취소한 작업을 다시 적용했어요.')}
 finally{historyApplying=false}
}
function historyShortcut(e){
 if(!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey||!['KeyZ','KeyY'].includes(e.code))return false;
 const active=document.activeElement;
 if(active?.tagName==='INPUT'&&!['range','color'].includes(active.type)||active?.tagName==='TEXTAREA'&&active!==$('text')&&active!==inlineEdit?.el)return false;
 e.preventDefault();if(!e.repeat)historyStep(e.code==='KeyZ'?-1:1);return true;
}
const originalSync=sync;
sync=function(){originalSync();scheduleHistory()};
for(const event of ['input','change','click','pointerup','pointercancel','keyup'])document.addEventListener(event,scheduleHistory);
// Async uploads and template loads finish outside the original DOM event.
const originalLoadImage=loadImage;loadImage=async function(file){await originalLoadImage(file);historyCheckpoint()};
const originalRestore=restore;restore=async function(s){await originalRestore(s);historyCheckpoint()};
$('undo').onclick=()=>historyStep(-1);$('redo').onclick=()=>historyStep(1);
historyCheckpoint();
