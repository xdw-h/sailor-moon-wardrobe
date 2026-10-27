(function(){
 'use strict';
 const $=s=>document.querySelector(s),data=window.MixData,characters=window.MoonData.characters;
 const itemMap=new Map(data.items.map(x=>[x.category+':'+x.id,x]));
 const bodyMap=new Map(data.bodies.map(x=>[x.id,x]));
 const cache=new Map();let category='top',retryPatch={},toastTimer,collectionToken=0;
 const scenes={moon:['月光花园','#f3eadd','#eee1d9'],rose:['玫瑰心事','#fae9e7','#efd1d9'],night:['银河夜色','#32344f','#8e7f96'],sky:['晴空来信','#e4eff1','#cfdfe8']};
 let storage;try{storage=localStorage;}catch(_){}
 function getImage(url){
  if(cache.has(url))return cache.get(url).promise;
  const image=new Image(),entry={image,ready:false};
  entry.promise=new Promise((resolve,reject)=>{
   const timer=setTimeout(fail,20000);
   function fail(){clearTimeout(timer);image.onload=image.onerror=null;cache.delete(url);reject(Error('image unavailable'));}
   image.onload=()=>{clearTimeout(timer);entry.ready=true;image.onload=image.onerror=null;resolve(image);};image.onerror=fail;image.src=url;
  });cache.set(url,entry);return entry.promise;
 }
 function urls(look){return [bodyMap.get(look.character).image,...data.groups.map(g=>look[g.id]==='none'?null:itemMap.get(g.id+':'+look[g.id]).image).filter(Boolean)];}
 async function load(look){await Promise.all(urls(look).map(getImage));}
 const options={character:characters.map(c=>c.id),...Object.fromEntries(data.groups.map(g=>[g.id,data.items.filter(x=>x.category===g.id).map(x=>x.id)])),background:Object.keys(scenes)};options.accessory.push('none');
 const game=window.MoonMixer.createMixer({options,initial:data.initial,load,storage,onChange:render});
 function toast(message){$('#mix-toast').textContent=message;$('#mix-toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#mix-toast').classList.remove('visible'),3000);}
 function title(part,id){return id==='none'?'不佩戴':itemMap.get(part+':'+id).name;}
 function image(look,part){const url=part==='body'?bodyMap.get(look.character).image:itemMap.get(part+':'+look[part]).image;return cache.get(url)?.image;}
 function paint(canvas,look,poster=false){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/400,canvas.height/850);
  if(poster){const scene=scenes[look.background],gradient=ctx.createLinearGradient(0,0,400,850);gradient.addColorStop(0,scene[1]);gradient.addColorStop(1,scene[2]);ctx.fillStyle=gradient;ctx.fillRect(0,0,400,850);ctx.strokeStyle='#ffffff99';ctx.strokeRect(10,10,380,830);ctx.beginPath();ctx.arc(200,270,145,0,Math.PI*2);ctx.stroke();}
  const body=image(look,'body');
  ctx.save();if(poster){ctx.translate(20,20);ctx.scale(.9,.9);}
  // 全部单件在统一400×850坐标中绘制，每件独立，不替换其他类别。
  const bw=body.naturalWidth*(810/body.naturalHeight);ctx.drawImage(body,200-bw/2,18,bw,810);
  const draw=(part,x,y,w,h)=>{const img=image(look,part);if(img)ctx.drawImage(img,x,y,w,h);};
  const lower={navy:[290,225],pink:[310,310],green:[290,195],shorts:[216,138],lavender:[315,335],orange:[290,195]}[look.bottom];
  draw('bottom',200-lower[0]/2,365,lower[0],lower[1]);
  draw('top',87,168,226,216);
  const footwear={red:[140,230],blue:[140,130],mary:[140,70],green:[140,140],sneakers:[140,82],orange:[140,80]}[look.shoes];
  draw('shoes',200-footwear[0]/2,831-footwear[1],footwear[0],footwear[1]);
  if(look.accessory!=='none'){
   if(['redbow','pinkbow','lavender'].includes(look.accessory))draw('accessory',238,69,82,64);
   else if(look.accessory==='tiara')draw('accessory',156,103,88,33);
   else if(look.accessory==='heart')draw('accessory',181,173,38,56);
   else draw('accessory',178,175,44,20);
  }
  ctx.restore();
  if(poster){ctx.fillStyle=look.background==='night'?'#fff4e8':'#665248';ctx.font='18px "Microsoft YaHei",sans-serif';ctx.fillText(characters.find(c=>c.id===look.character).name+' · 自由搭配',24,790);ctx.font='9px "Microsoft YaHei",sans-serif';ctx.fillText('月光衣橱 · 美少女战士同人穿搭',24,817);}
  ctx.restore();
 }
 function renderItems(){
  const current=game.state.pending||game.state.look;
  const items=data.items.filter(x=>x.category===category);
  const choices=category==='accessory'?[{id:'none',name:'不佩戴',category},...items]:items;
  $('#mix-item-count').textContent=String(choices.length).padStart(2,'0')+' ITEMS';
  $('#mix-items').innerHTML=choices.map(item=>`<button class="outfit ${current[category]===item.id?'active':''}" data-item="${item.id}" aria-label="选择${item.name}" aria-pressed="${current[category]===item.id}"><span class="outfit-art">${item.thumb?`<img src="${item.thumb}" alt="" width="180" height="180" decoding="async">`:'<span class="none-item">∅</span>'}<span class="check">✓</span></span><span class="outfit-title">${item.name}</span><span class="outfit-subtitle">${category.toUpperCase()}</span></button>`).join('');
 }
 function render(){
  const state=game.state,look=state.look,character=characters.find(c=>c.id===look.character),pending=state.pending||look;
  $('#mix-stage').dataset.background=look.background;$('#mix-stage').setAttribute('aria-busy',Boolean(state.pending));
  const ready=urls(look).every(url=>cache.get(url)?.ready);
  if(ready)paint($('#mix-canvas'),look);
  $('#mix-loading').hidden=!state.pending;$('#mix-retry').hidden=!state.error;$('#mix-error').hidden=!state.error;$('#mix-error').textContent=state.error;
  $('#mix-name').textContent=character.name;$('#mix-en').textContent=character.en;
  $('#mix-save').disabled=$('#mix-download').disabled=!ready||Boolean(state.pending);
  $('#mix-undo').disabled=!state.history.length&&!state.pending;
  $('#mix-saved-count').textContent=state.saved.length;
  $('#mix-summary').innerHTML=data.groups.map(g=>`<div class="mix-summary-row"><span>${g.name}</span><b data-wearing="${g.id}">${title(g.id,look[g.id])}</b></div>`).join('');
  document.querySelectorAll('[data-character]').forEach(button=>{const selected=button.dataset.character===pending.character;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',selected);});
  document.querySelectorAll('[data-scene]').forEach(button=>{const selected=button.dataset.scene===look.background;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',selected);});
  document.querySelectorAll('[data-item]').forEach(button=>{const selected=button.dataset.item===pending[category];button.classList.toggle('active',selected);button.setAttribute('aria-pressed',selected);});
 }
 async function change(patch){retryPatch=patch;return game.change(patch);}
 $('#mix-characters').innerHTML=characters.map(c=>`<button class="character" data-character="${c.id}" aria-label="选择${c.name}" style="--character-color:${c.color}"><span class="portrait"><img src="assets/portraits/${c.id}.webp" alt="" width="48" height="48"></span><span>${c.name}</span></button>`).join('');
 $('#mix-tabs').innerHTML=data.groups.map((g,i)=>`<button class="filter ${i===0?'active':''}" data-category="${g.id}" aria-pressed="${i===0}">${g.name}</button>`).join('');
 $('#mix-backgrounds').innerHTML=Object.entries(scenes).map(([id,s])=>`<button class="scene" data-scene="${id}" style="--swatch:${s[2]}" aria-label="${s[0]}"></button>`).join('');
 $('#mix-characters').onclick=event=>{const button=event.target.closest('[data-character]');if(button)change({character:button.dataset.character});};
 $('#mix-tabs').onclick=event=>{const button=event.target.closest('[data-category]');if(!button)return;category=button.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});$('#mix-help').textContent=`换${data.groups.find(g=>g.id===category).name}时，其他已选单品都会保留。`;renderItems();};
 $('#mix-items').onclick=event=>{const button=event.target.closest('[data-item]');if(button)change({[category]:button.dataset.item});};
 $('#mix-backgrounds').onclick=event=>{const button=event.target.closest('[data-scene]');if(button)change({background:button.dataset.scene});};
 $('#mix-undo').onclick=()=>game.undo();$('#mix-retry').onclick=()=>change(retryPatch);
 $('#mix-random').onclick=()=>change(Object.fromEntries(data.groups.map(g=>[g.id,options[g.id][Math.floor(Math.random()*options[g.id].length)]])));
 $('#mix-save').onclick=()=>{const result=game.save();toast(result==='saved'?'整身搭配已收藏 ♡':result==='duplicate'?'这一身已经收藏过啦。':'浏览器未允许保存收藏。');};
 $('#mix-download').onclick=async()=>{
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=2125;paint(canvas,game.state.look,true);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){toast('图片生成失败，请重试。');return;}
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='月光衣橱-自由搭配.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('搭配图片已生成。');
 };
 async function collection(){
  const token=++collectionToken,container=$('#mix-collection-items');container.innerHTML='';
  if(!game.state.saved.length){container.innerHTML='<p class="empty">还没有收藏。选好单件后，点击「收藏搭配」。</p>';return;}
  for(const [i,look]of game.state.saved.entries()){
   const card=document.createElement('article');card.className='mix-saved';const character=characters.find(c=>c.id===look.character);
   card.innerHTML=`<h3>${character.name}</h3><p>${title('top',look.top)}<br>${title('bottom',look.bottom)} · ${title('shoes',look.shoes)}</p><button data-restore="${i}">恢复搭配</button><button data-remove="${i}" aria-label="移除搭配收藏">移除</button>`;container.append(card);
   try{await load(look);if(token!==collectionToken)return;const canvas=document.createElement('canvas');canvas.width=200;canvas.height=425;paint(canvas,look,true);const img=new Image();img.src=canvas.toDataURL('image/png');img.alt=character.name+'的收藏搭配';card.prepend(img);}catch(_){const note=document.createElement('p');note.textContent='预览未加载，仍可尝试恢复搭配。';card.prepend(note);}
  }
 }
 $('#mix-collection').onclick=()=>{$('#mix-dialog').showModal();document.body.style.overflow='hidden';collection();};
 $('#mix-close').onclick=()=>$('#mix-dialog').close();$('#mix-dialog').onclose=()=>{collectionToken++;document.body.style.overflow='';};
 $('#mix-collection-items').onclick=event=>{
  const restore=event.target.closest('[data-restore]'),remove=event.target.closest('[data-remove]');
  if(restore){const look=game.state.saved[Number(restore.dataset.restore)];$('#mix-dialog').close();change(look);}
  if(remove){if(game.remove(Number(remove.dataset.remove)))collection();else toast('无法保存修改，请重试。');}
 };
 const observer=new IntersectionObserver(entries=>{$('#back-to-preview').hidden=entries[0].intersectionRatio>=.85||innerWidth>600;},{threshold:[0,.85]});observer.observe($('#mix-stage'));
 $('#back-to-preview').onclick=()=>$('#mix-stage').scrollIntoView({behavior:'smooth',block:'start'});
 renderItems();change({});
})();
