// Serialized into a Blob worker, so direct file:// use needs no network fetch.
function gifWorkerMain(){
 let encoder=null;
 self.onmessage=async({data})=>{
  try{
   if(data.type==='init')encoder=new StudioGifEncoder(data.width,data.height);
   else if(data.type==='frame'){
    if(!encoder)throw Error('GIF 변환기가 준비되지 않았어요.');
    encoder.addFrame(new Uint8ClampedArray(data.buffer),data.delay);
   }else if(data.type==='finish'){
    const buffer=await encoder.finish().arrayBuffer();encoder=null;
    self.postMessage({id:data.id,buffer},[buffer]);return;
   }else throw Error('알 수 없는 변환 요청이에요.');
   self.postMessage({id:data.id,ok:true});
  }catch(e){self.postMessage({id:data.id,error:e.message||'GIF 변환 실패'});encoder=null}
 };
}
function createGifWorker(){
 const script=[StudioGifEncoder.toString(),adaptiveGifColors.toString(),'('+gifWorkerMain.toString()+')()'].join('\n');
 const url=URL.createObjectURL(new Blob([script],{type:'text/javascript'}));
 try{return new Worker(url)}finally{URL.revokeObjectURL(url)}
}
function gifOutputPlan(width,height,duration){
 const scale=Math.min(1,480/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),count:Math.max(1,Math.min(40,Math.ceil(duration*8)))};
}
