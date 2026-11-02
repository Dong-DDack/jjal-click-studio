// Local preview: floating object typography toolbar and familiar transform handles.
const typebar=document.createElement('div');typebar.id='floatingTypebar';typebar.hidden=true;typebar.setAttribute('role','toolbar');typebar.setAttribute('aria-label','선택한 문구 꾸미기');
typebar.innerHTML=`<div class="typebar-main"><select id="floatingFont" aria-label="글꼴"></select><div class="size-stepper"><button id="typeSizeMinus" title="글씨 작게">−</button><input id="typeSize" type="number" min="20" max="180" aria-label="글씨 크기"><button id="typeSizePlus" title="글씨 크게">+</button></div><label class="type-color" title="글씨 색"><span>A</span><input id="typeColor" type="color" aria-label="글씨 색"></label><button id="typeBold" class="format-button" title="굵게" aria-label="굵게">B</button><button id="floatingItalic" class="format-button" title="기울임 Ctrl+I" aria-label="기울임꼴"><i>I</i></button><button id="typeUnderline" class="format-button" title="밑줄" aria-label="밑줄"><u>U</u></button><button id="typeStrike" class="format-button" title="취소선" aria-label="취소선"><s>S</s></button><button id="typeCase" title="영문 대소문자 바꾸기" aria-label="영문 대소문자">aA</button><span class="tool-divider"></span><button id="typeAlign" title="정렬 변경" aria-label="정렬 변경">☰</button><button id="typeBullets" title="줄마다 글머리표" aria-label="글머리표">☷</button><button data-type-panel="spacing" title="글자·줄 간격">T↕</button><button data-type-panel="opacity" title="투명도" aria-label="투명도">▦</button><span class="tool-divider"></span><button data-type-panel="effects">효과</button><button data-type-panel="position">위치</button><select id="floatingWeight" aria-label="글씨 굵기" hidden><option value="300">300</option><option value="400">400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option><option value="800">800</option><option value="900">900</option></select></div><div id="typePanel" hidden></div>`;

document.body.append(typebar);$('floatingFont').innerHTML=$('font').innerHTML;
function updateTypebar(){
 const t=current();$('stickerOpacity').hidden=!t||t.kind!=='sticker';typebar.hidden=!t||t.kind==='sticker'||recording||!$('previewOverlay').hidden||!!dragging;if(typebar.hidden){if($('typePanel'))$('typePanel').hidden=true;return;}
 syncTypebarExtras(t);$('floatingFont').value=t.font;$('floatingWeight').value=t.weight??700;$('floatingItalic').setAttribute('aria-pressed',String(!!t.italic));
 const b=boxes.find(b=>b.id===t.id);if(!b)return;const r=canvas.getBoundingClientRect(),s=r.width/canvas.width;
 const extent=Math.abs(b.width*Math.sin(b.angle))/2+Math.abs(b.height*Math.cos(b.angle))/2;
 typebar.style.width='max-content';const width=Math.min(typebar.getBoundingClientRect().width||780,window.innerWidth-24);typebar.style.width=width+'px';typebar.style.left=Math.max(12,Math.min(window.innerWidth-width-12,r.left+b.x*s-width/2))+'px';
 const above=r.top+(b.y-extent)*s-100;typebar.style.top=Math.max(12,Math.min(window.innerHeight-80,above<12?r.top+(b.y+extent)*s+22:above))+'px';
}
function changeTypography(key,value){const t=current();if(!t||t.kind==='sticker')return;t[key]=value;if(inlineEdit){const input=inlineEdit.el;if(key==='text')input.value=value;input.style.fontFamily=fonts[t.font];input.style.fontWeight=t.weight??700;input.style.fontStyle=t.italic?'italic':'normal';input.style.color=t.color;input.style.opacity=Math.max(.3,t.opacity/100);input.style.fontSize=t.size*(canvas.getBoundingClientRect().width/canvas.width)+'px';input.style.textAlign=t.align;input.style.textDecoration=[t.underline?'underline':'',t.strike?'line-through':''].filter(Boolean).join(' ')||'none';input.style.letterSpacing=(t.letterSpacing??0)*(canvas.getBoundingClientRect().width/canvas.width)+'px';input.style.lineHeight=t.lineHeight??1.35;input.style.textShadow=shadowCss(t,canvas.getBoundingClientRect().width/canvas.width);input.oninput()}sync();historyCheckpoint();updateTypebar()}
$('floatingFont').onchange=e=>changeTypography('font',e.target.value);
$('floatingWeight').onchange=e=>changeTypography('weight',Number(e.target.value));
$('floatingItalic').onclick=()=>changeTypography('italic',!current()?.italic);
typebar.onpointerdown=e=>{if(e.target.closest('button'))e.preventDefault()};
const baseStartInline=startInline;startInline=function(t){baseStartInline(t);const input=inlineEdit.el;input.onblur=e=>{if(typebar.contains(e.relatedTarget))return;finishInline()};input.onselect=updateTypebar;updateTypebar()};
document.addEventListener('pointerdown',e=>{if(inlineEdit&&!typebar.contains(e.target)&&e.target!==inlineEdit.el )finishInline()},true);
const baseRender=render;render=function(...args){baseRender(...args);if(!args[0])updateTypebar()};
handlePoints=function(b){const unit=canvas.width/canvas.getBoundingClientRect().width;return [
 {x:0,y:-b.height/2-32*unit,mode:'rotate'},
 ...[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*b.width/2,y:y*b.height/2,mode:'scale'}))),
 {x:0,y:-b.height/2,mode:'resizeY',sign:-1},{x:0,y:b.height/2,mode:'resizeY',sign:1},
 {x:-b.width/2,y:0,mode:'resizeX',sign:-1},{x:b.width/2,y:0,mode:'resizeX',sign:1}];
};
drawHandles=function(b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);const unit=canvas.width/canvas.getBoundingClientRect().width;ctx.strokeStyle='#1e64d4';ctx.lineWidth=1.4*unit;ctx.setLineDash([5*unit,4*unit]);ctx.strokeRect(-b.width/2,-b.height/2,b.width,b.height);ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(0,-b.height/2);ctx.lineTo(0,-b.height/2-32*unit);ctx.stroke();for(const h of handlePoints(b)){ctx.beginPath();if(h.mode==='rotate')ctx.arc(h.x,h.y,7*unit,0,Math.PI*2);else ctx.rect(h.x-4*unit,h.y-4*unit,8*unit,8*unit);ctx.fillStyle='#fff';ctx.fill();ctx.stroke()}ctx.restore()};
const oldMove=canvas.onpointermove;
canvas.onpointermove=function(e){
 if(dragging?.mode==='scale'&&current()){
  const d=dragging,t=current(),p=point(e),q=localPoint(p,d.box),start=localPoint(d.start,d.box);
  let factor=Math.max(.1,Math.min(10,(q.x*start.x+q.y*start.y)/(start.x*start.x+start.y*start.y)));
  if(t.kind==='sticker'){factor=Math.min(factor,10/(d.initial.scaleX??1),10/(d.initial.scaleY??1));factor=Math.max(factor,.1/(d.initial.scaleX??1),.1/(d.initial.scaleY??1));t.scaleX=(d.initial.scaleX??1)*factor;t.scaleY=(d.initial.scaleY??1)*factor}
  else{factor=Math.max(20/d.initial.size,Math.min(180/d.initial.size,factor));t.size=Math.round(d.initial.size*factor);if(d.initial.boxWidth!==undefined)t.boxWidth=Math.min(8000,d.initial.boxWidth*factor);if(d.initial.boxHeight!==undefined)t.boxHeight=Math.min(8000,d.initial.boxHeight*factor);$('size').value=t.size;$('sizeValue').textContent=t.size+' px'}
  canvas.style.cursor='nwse-resize';render();return;
 }
 oldMove(e);if(!dragging){const h=getHandle(point(e));if(h?.mode==='scale')canvas.style.cursor=h.x*h.y>0?'nwse-resize':'nesw-resize';if(h?.mode==='rotate')canvas.style.cursor='grab'}
};
const oldUp=canvas.onpointerup;canvas.onpointerup=canvas.onpointercancel=function(e){oldUp(e);updateTypebar()};
window.addEventListener('resize',updateTypebar);window.addEventListener('scroll',updateTypebar,true);
$('selectionLabel').textContent='문구 선택 → 툴바 · 모서리 확대·축소 · 위쪽 ○ 회전';
render();
function syncTypebarExtras(t){$('typeSize').value=t.size;$('typeColor').value=t.color;for(const [id,on] of [['typeBold',(t.weight??700)>=700],['typeUnderline',t.underline],['typeStrike',t.strike],['floatingItalic',t.italic]]){$(id).setAttribute('aria-pressed',String(!!on));$(id).classList.toggle('active',!!on)}}
$('typeSize').onchange=e=>{const value=Number(e.target.value);if(Number.isFinite(value))changeTypography('size',Math.max(20,Math.min(180,Math.round(value))))};
$('typeSizeMinus').onclick=()=>changeTypography('size',Math.max(20,current().size-2));$('typeSizePlus').onclick=()=>changeTypography('size',Math.min(180,current().size+2));
$('typeColor').oninput=e=>changeTypography('color',e.target.value);
$('typeBold').onclick=()=>changeTypography('weight',(current().weight??700)>=700?400:700);
$('typeUnderline').onclick=()=>changeTypography('underline',!current().underline);$('typeStrike').onclick=()=>changeTypography('strike',!current().strike);
$('typeCase').onclick=()=>{const text=current().text;changeTypography('text',text===text.toUpperCase()?text.toLowerCase():text.toUpperCase());if(inlineEdit)inlineEdit.el.value=current().text};
$('typeAlign').onclick=()=>changeTypography('align',({left:'center',center:'right',right:'left'})[current().align]);
$('typeBullets').onclick=()=>{const lines=current().text.split('\n'),remove=lines.every(line=>line.startsWith('• '));const text=lines.map(line=>remove?line.slice(2):'• '+line).join('\n');if(inlineEdit)inlineEdit.el.value=text;changeTypography('text',text)};
function showTypePanel(name){const panel=$('typePanel');if(!panel.hidden&&panel.dataset.name===name){panel.hidden=true;return}panel.dataset.name=name;panel.hidden=false;const t=current();if(name==='spacing')panel.innerHTML='<label>글자 간격 <input data-type-key="letterSpacing" type="range" min="0" max="20" step="1" value="'+(t.letterSpacing??0)+'"></label><label>줄 간격 <input data-type-key="lineHeight" type="range" min="1" max="2.5" step=".05" value="'+(t.lineHeight??1.35)+'"></label>';if(name==='opacity')panel.innerHTML='<label>불투명도 <input data-type-key="opacity" type="range" min="0" max="100" value="'+t.opacity+'"></label>';if(name==='effects')panel.innerHTML='<button data-effect-action="shadow">그림자 '+(t.shadow?'끄기':'켜기')+'</button><button data-effect-action="details">그림자 상세 설정 ↗</button>';if(name==='position')panel.innerHTML='<button data-effect-action="centerX">가로 중앙</button><button data-effect-action="centerY">세로 중앙</button><button data-effect-action="front">맨 앞으로</button><button data-effect-action="back">맨 뒤로</button>';panel.querySelectorAll('[data-type-key]').forEach(input=>input.oninput=()=>changeTypography(input.dataset.typeKey,Number(input.value)));panel.querySelectorAll('[data-effect-action]').forEach(button=>button.onclick=()=>{const action=button.dataset.effectAction;if(action==='shadow')changeTypography('shadow',!current().shadow);if(action==='details'){$('shadowSettings').hidden=false;$('shadowSettings').scrollIntoView({behavior:'smooth',block:'center'})}if(action==='centerX')changeTypography('x',.5);if(action==='centerY')changeTypography('y',.5);if(action==='front')$('front').click();if(action==='back'){const t=current();state.texts=state.texts.filter(v=>v.id!==t.id);state.texts.unshift(t);sync();historyCheckpoint()}panel.hidden=true})}
typebar.querySelectorAll('[data-type-panel]').forEach(button=>button.onclick=()=>showTypePanel(button.dataset.typePanel));
