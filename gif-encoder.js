// GIF89a encoder with per-frame adaptive median-cut palettes. Short LZW runs reset before
// dictionary growth reaches 10 bits. Repeated sequences are compressed.
class StudioGifEncoder {
  constructor(width,height){
    this.parts=[];this.width=width;this.height=height;
    const bytes=[...new TextEncoder().encode('GIF89a')];
    const word=n=>bytes.push(n&255,(n>>8)&255);
    word(width);word(height);bytes.push(0x70,0,0);
    bytes.push(0x21,0xff,11,...new TextEncoder().encode('NETSCAPE2.0'),3,1,0,0,0);
    this.parts.push(new Uint8Array(bytes));
  }
  addFrame(rgba,delay){
    if(rgba.length!==this.width*this.height*4)throw Error('GIF 프레임 크기가 일치하지 않아요.');
    const n=this.width*this.height;
    const {palette,indices}=adaptiveGifColors(rgba);
    const packed=new Uint8Array(Math.ceil((n+Math.ceil(n/200)+1)*9/8));
    let bits=0,acc=0,pos=0;
    const code=c=>{acc|=c<<bits;bits+=9;while(bits>=8){packed[pos++]=acc&255;acc>>>=8;bits-=8}};
    const dictionary=new Map();let next=258,prefix=indices[0];code(256);
    for(let i=1;i<n;i++){const value=indices[i],key=prefix*256+value;const found=dictionary.get(key);if(found!==undefined){prefix=found;continue}code(prefix);if(next<510)dictionary.set(key,next++);else{code(256);dictionary.clear();next=258}prefix=value}if(n)code(prefix);
    code(257);if(bits)packed[pos++]=acc&255;
    const d=Math.max(1,Math.round(delay*100));
    const header=[0x21,0xf9,4,4,d&255,(d>>8)&255,0,0,0x2c,0,0,0,0,this.width&255,(this.width>>8)&255,this.height&255,(this.height>>8)&255,0x87];
    this.parts.push(new Uint8Array(header),palette,new Uint8Array([8]));
    const blocked=new Uint8Array(pos+Math.ceil(pos/255)+1);let o=0;
    for(let i=0;i<pos;i+=255){const size=Math.min(255,pos-i);blocked[o++]=size;blocked.set(packed.subarray(i,i+size),o);o+=size}
    blocked[o]=0;this.parts.push(blocked);
  }
  finish(){return new Blob([...this.parts,new Uint8Array([0x3b])],{type:'image/gif'})}
}

// Weighted median cut uses actual frame colors instead of a universal RGB grid.
function adaptiveGifColors(rgba){
 const counts=new Uint32Array(32768),rs=new Float64Array(32768),gs=new Float64Array(32768),bs=new Float64Array(32768);
 for(let i=0;i<rgba.length;i+=4){const key=((rgba[i]>>3)<<10)|((rgba[i+1]>>3)<<5)|(rgba[i+2]>>3);counts[key]++;rs[key]+=rgba[i];gs[key]+=rgba[i+1];bs[key]+=rgba[i+2]}
 const colors=[];for(let k=0;k<32768;k++)if(counts[k])colors.push({key:k,n:counts[k],r:rs[k]/counts[k],g:gs[k]/counts[k],b:bs[k]/counts[k]});
 function box(items){let n=0,min=[255,255,255],max=[0,0,0];for(const c of items){n+=c.n;[c.r,c.g,c.b].forEach((v,k)=>{min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v)})}const ranges=max.map((v,k)=>v-min[k]);const channel=ranges.indexOf(Math.max(...ranges));return{items,n,channel,score:Math.max(...ranges)*Math.sqrt(n)}}
 const boxes=[box(colors)];while(boxes.length<256){let index=-1;for(let i=0;i<boxes.length;i++)if(boxes[i].items.length>1&&(index<0||boxes[i].score>boxes[index].score))index=i;if(index<0)break;const chosen=boxes.splice(index,1)[0],key=['r','g','b'][chosen.channel];chosen.items.sort((a,b)=>a[key]-b[key]);let n=0,split=1;for(let i=0;i<chosen.items.length-1;i++){n+=chosen.items[i].n;split=i+1;if(n>=chosen.n/2)break}boxes.push(box(chosen.items.slice(0,split)),box(chosen.items.slice(split)))}
 const palette=new Uint8Array(768),lookup=new Uint8Array(32768);boxes.forEach((b,index)=>{let r=0,g=0,blue=0;for(const c of b.items){r+=c.r*c.n;g+=c.g*c.n;blue+=c.b*c.n}palette[index*3]=Math.round(r/b.n);palette[index*3+1]=Math.round(g/b.n);palette[index*3+2]=Math.round(blue/b.n)});
 for(const c of colors){let best=0,error=Infinity;for(let i=0;i<boxes.length;i++){const d=(c.r-palette[i*3])**2+(c.g-palette[i*3+1])**2+(c.b-palette[i*3+2])**2;if(d<error){error=d;best=i}}lookup[c.key]=best}
 const indices=new Uint8Array(rgba.length/4);for(let i=0;i<indices.length;i++){const j=i*4;indices[i]=lookup[((rgba[j]>>3)<<10)|((rgba[j+1]>>3)<<5)|(rgba[j+2]>>3)]}return{palette,indices};
}
