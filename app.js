(function () {
  'use strict';
  const {TeaRenderer,BOWLS,TEAS,ELEMENTS,random,circle}=window.TeaArt;
  const $=id=>document.getElementById(id);
  const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const STORAGE='tea-art-collection-v1';
  const state={stage:0,maxStage:0,bowl:0,tea:0,water:0,pourStep:0,pourReady:false,pourFailed:false,whisk:0,objects:[],selected:null,brush:'fine',mode:'brush',panel:'elements',category:'萌宠',galleryMode:'whole',customColor:false,textDirection:'horizontal',textDraft:'',finishTab:'title',color:'#745235',title:'一盏清欢',inscription:'',stamp:'none',stampText:'清欢'};
  const initialState=JSON.stringify(state);
  let hasStarted=false,sessionComplete=false,modalScroll=0;
  const nav=document.querySelector('.topbar');nav.appendChild($('sound-music'));nav.appendChild($('collection-button'));$('home-link').textContent='茶百戏 · 盏中丹青';document.querySelector('.utility-bar').remove();
  const history=[];let pointer=null,uid=1,toastTimer,pourStart=0,pourRAF=0,pourAmount=0,pourPointer=null,whiskRemainder=0,generated=null,collection=[],storageAvailable=true,transformUndo=false,collectionDB=null,collectionReady;
  const pointers=new Map();let gesture=null;
  const renderer=new TeaRenderer($('tea-canvas'),state);renderer.assetsReady.then(()=>{if(state.stage===4&&hasStarted)renderDrawing();});

  function showLanding(){stopInteractions();document.body.classList.add('is-landing');document.body.classList.remove('is-editor');document.body.classList.remove('is-liquid');$('landing').hidden=false;$('experience').hidden=true;$('back-button').disabled=false;$('start-label').textContent=sessionComplete?'再点一盏':hasStarted?'继续点茶':'点击开始';$('new-session').hidden=!hasStarted||sessionComplete;window.scrollTo(0,0);}
  function enterExperience(){window.TeaSound.start();hasStarted=true;document.body.classList.remove('is-landing');$('landing').hidden=true;$('experience').hidden=false;render();$('experience').scrollTop=0;renderer.invalidate(true);window.scrollTo(0,0);}
  function syncViewport(){const vv=window.visualViewport;document.documentElement.style.setProperty('--modal-height',Math.round(vv?vv.height:innerHeight)+'px');document.documentElement.style.setProperty('--modal-offset',Math.round(vv?vv.offsetTop:0)+'px');if(/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;document.documentElement.style.setProperty('--view-height',Math.round(window.visualViewport?window.visualViewport.height:window.innerHeight)+'px');const vh=window.innerHeight,vw=window.innerWidth;document.documentElement.style.setProperty('--legacy-bowl',Math.min(vw-40,Math.max(180,vh-(state.stage>=4?420:385)))+'px');document.documentElement.style.setProperty('--legacy-home',Math.min(vw-40,Math.max(175,vh-330))+'px');}
  const flexProbe=document.createElement('div');flexProbe.style.cssText='display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';flexProbe.appendChild(document.createElement('div'));flexProbe.appendChild(document.createElement('div'));document.body.appendChild(flexProbe);document.body.classList.toggle('no-flex-gap',flexProbe.scrollHeight!==1);flexProbe.remove();document.body.classList.toggle('legacy-layout',!window.CSS||!CSS.supports('aspect-ratio','1'));syncViewport();window.addEventListener('resize',syncViewport);if(window.visualViewport)window.visualViewport.addEventListener('resize',syncViewport);
  document.addEventListener('focusin',e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName))document.body.classList.add('editing-field');});document.addEventListener('focusout',()=>{document.body.classList.remove('editing-field');setTimeout(syncViewport,200);});
  const STEPS=[
    {category:'择 器',title:'且选一盏',subtitle:'先从一只茶盏开始。',next:'就用这盏',quote:'盏色贵青黑，玉毫条达者为上。',source:'宋 · 赵佶《大观茶论·盏》',explain:'宋代点茶、斗茶尤其推重建窑黑釉盏，以深色釉面衬托白色汤花。其他器型在本体验中作为宋瓷审美选项。'},
    {category:'择 茶',title:'择一款茶',subtitle:'三款宋代茶名，色彩为数字演绎。',next:'开始点茶',quote:'茶色贵白，而饼茶多以珍膏油其面。',source:'宋 · 蔡襄《茶录·色》',explain:'宋人品茶重视茶色，以白、青白为佳。本体验借宋代茶名作视觉分支，茶汤色彩并非对历史实物的精确复原。'},
    {category:'注 汤',title:'水到，茶醒',subtitle:'长按汤瓶，松手便停。',next:'继续注汤',quote:'量茶受汤，调如融胶。',source:'宋 · 赵佶《大观茶论·点》',explain:'先以少量汤水调膏，再逐次注汤、击拂。《大观茶论》原载多次注汤，本体验简化为三段交互。'},
    {category:'击 拂',title:'拂起一盏雪',subtitle:'在盏中快速往复，击拂出细密汤花。',next:'进入茶百戏',quote:'乳雾汹涌，溢盏而起。',source:'宋 · 赵佶《大观茶论·点》',explain:'点茶以茶筅击拂，使茶汤表面形成细密、持久的沫饽，为后续茶百戏创造稳定茶面。'},
    {category:'作 画',title:'茶百戏 · 水丹青',subtitle:'在数字茶面上选景、添画或题字',next:'画好了',quote:'纤巧如画，但须臾即就散灭。',source:'北宋 · 陶谷《清异录》',explain:'《清异录》记茶汤能使“汤纹水脉成物象”。茶百戏又称分茶、水丹青；当代复原常以清水在点茶形成的茶沫上显出纹样。本页的彩色笔触与预设小景属于数字艺术演绎。'},
    {category:'收 藏',title:'一盏，成画',subtitle:'为这幅数字水丹青题名、落款。',next:'生成作品',quote:'矮纸斜行闲作草，晴窗细乳戏分茶。',source:'宋 · 陆游《临安春雨初霁》',explain:'“分茶”在宋人诗文中屡有书写。本体验以数字方式留住现实茶百戏“须臾即散”的瞬间。'}
  ];
  const NUMERALS=['壹','贰','叁','肆','伍','陆'];
  const POUR=[{min:500,max:1000,total:.1,text:'调膏 · 调如融胶',help:'先注少量汤水，将茶末调成均匀茶膏。'},{min:1500,max:2000,total:.3,text:'续汤 · 珠玑磊落',help:'沿茶面续汤，为随后击拂蓄势。'},{min:500,max:1000,total:.4,text:'添汤 · 盏可四分则止',help:'再添一段汤水；此处将古籍中的多汤程序简化为三段体验。'}];
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);}
  function validCard(x){return x&&typeof x.id==='string'&&typeof x.image==='string'&&x.image.startsWith('data:image/png')&&typeof x.title==='string';}
  function databaseAction(mode,operation){return new Promise((resolve,reject)=>{const tx=collectionDB.transaction('cards',mode),store=tx.objectStore('cards');let value;const request=operation(store);if(request)request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('存储操作未完成'));});}
  async function loadCollection(){
    try{
      collectionDB=await new Promise((resolve,reject)=>{const request=indexedDB.open('tea-art-collection',1);request.onupgradeneeded=()=>request.result.createObjectStore('cards',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('存储被占用'));});
      collection=(await databaseAction('readonly',store=>store.getAll())).filter(validCard).sort((a,b)=>b.id.localeCompare(a.id));
      // Migrate any collection created by the localStorage MVP, preserving full PNGs.
      try{const old=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(old)){for(const card of old.filter(validCard)){if(!collection.some(x=>x.id===card.id)){await databaseAction('readwrite',store=>store.put(card));collection.push(card);}}if(old.length)localStorage.removeItem(STORAGE);}}catch(e){}
    }catch(e){collectionDB=null;try{const parsed=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(!Array.isArray(parsed))throw Error('收藏格式异常');collection=parsed.filter(validCard);}catch(err){collection=[];storageAvailable=false;}}
    updateCount();
  }
  function updateCount(){$('collection-count').textContent=collection.length;$('collection-count').hidden=!collection.length;}
  function snapshot(){history.push(JSON.stringify(state.objects));if(history.length>10)history.shift();}
  function changed(){generated=null;renderer.invalidate(true);const undo=$('undo-button');if(undo)undo.disabled=!history.length;}
  function currentObject(){return state.objects.find(o=>o.id===state.selected);}
  function setStep(stage){stopInteractions();state.stage=stage;state.maxStage=Math.max(state.maxStage,stage);state.selected=null;state.panel=stage===4?'elements':'';state.mode=stage===4?'select':'brush';render();$('experience').scrollTop=0;renderer.invalidate(true);window.scrollTo(0,0);}
  function render(){
    syncViewport();const step=STEPS[state.stage];$('experience').dataset.stage=state.stage;document.body.classList.toggle('is-editor',state.stage===4||state.stage===5);document.body.classList.toggle('is-liquid',state.stage===2||state.stage===3);$('step-number').textContent=NUMERALS[state.stage];$('step-category').textContent=step.category;$('step-title').textContent=step.title;$('step-subtitle').textContent=step.subtitle;$('next-label').textContent=step.next;$('literature-quote').textContent=step.quote;$('literature-source').textContent=step.source;$('literature-quote').title=step.explain;$('back-button').disabled=false;$('previous-button').hidden=false;$('previous-button').querySelector('span').textContent=state.stage===0?'返回首页':state.stage===2&&state.pourStep>0?'返回上一段':'上一步';
    $('step-nav').innerHTML=STEPS.map((s,i)=>`<button class="step-dot ${i===state.stage?'active':i<state.maxStage?'complete':''}" data-step="${i}" ${i>state.maxStage?'disabled':''} aria-label="${NUMERALS[i]} · ${s.category}" ${i===state.stage?'aria-current="step"':''}>${s.category.replace(/ /g,'')}</button>`).join('');
    $('bowl-caption-text').textContent=state.stage===0?BOWLS[state.bowl].short:`${BOWLS[state.bowl].short} / ${TEAS[state.tea].name}`;
    $('kettle').hidden=state.stage!==2;$('whisk').hidden=state.stage!==3||state.whisk>=1000;$('canvas-hint').hidden=true;$('bowl-caption').hidden=state.stage>=2;
    const oldPreview=document.querySelector('.signature-preview');if(oldPreview)oldPreview.remove();
    if(state.stage<=1)renderChoices();
    if(state.stage===2)renderPour();
    if(state.stage===3)renderWhisk();
    if(state.stage===4)renderDrawing();
    if(state.stage===5)renderSignature();
    updateNext();
  }
  function updateNext(){const disabled=state.stage===2?!state.pourReady:state.stage===3?state.whisk<1000:false;$('next-button').disabled=disabled;if(state.stage===2)$('next-label').textContent=state.pourStep<2?['继续注汤','再添一汤'][state.pourStep]:'开始击拂';}
  function renderChoices(){const data=state.stage===0?BOWLS:TEAS,key=state.stage===0?'bowl':'tea';$('controls').innerHTML=`<div class="choices">${data.map((v,i)=>`<button class="choice ${state[key]===i?'selected':''}" data-choice="${i}" aria-pressed="${state[key]===i}"><canvas id="choice-${i}" aria-hidden="true"></canvas><span class="choice-name">${v.name}</span><small>${v.note}</small></button>`).join('')}</div><p class="selection-description" aria-live="polite">${data[state[key]].description}</p>`;data.forEach((_,i)=>renderer.thumbnail($(`choice-${i}`),i,key));}
  function renderPour(){$('kettle').querySelector('span').textContent=state.pourReady?'本汤已完成':state.pourFailed?'请重试这一汤':'长按注水 · 松手停止';const p=POUR[state.pourStep],max=p.max+700;$('controls').innerHTML=`<div class="pour-steps">${POUR.map((p,i)=>`<span class="pour-step ${i===state.pourStep?'active':i<state.pourStep?'done':''}"><b>${i<state.pourStep?'✓':['一','二','三'][i]}</b>${['调膏','续汤','添汤'][i]}</span>`).join('')}</div><div class="meter"><span class="meter-target" style="left:${p.min/max*100}%;width:${(p.max-p.min)/max*100}%"></span><span class="meter-fill" id="pour-fill"></span></div><div class="meter-labels"><span>${p.text}</span><span>${p.min/1000}–${p.max/1000} 秒</span></div><p class="action-hint" id="pour-hint">${state.pourReady?'水量正好，茶已舒展。':state.pourFailed?'再来一次，从这汤继续。':p.help}${state.pourReady||state.pourFailed?' <button class="text-button" id="retry-pour">重试这一汤</button>':''}</p>`;if(state.pourReady)$('pour-fill').style.width=((p.min+p.max)/2/max*100)+'%';}
  function updateStream(){const svg=$('kettle').querySelector('svg'),m=svg.getScreenCTM();if(!m)return;const pt=svg.createSVGPoint();pt.x=12;pt.y=62;const tip=pt.matrixTransform(m),rect=$('tea-stage').getBoundingClientRect(),x=(tip.x-rect.left)/rect.width*600,y=(tip.y-rect.top)/rect.height*600,paths=$('water-stream').querySelectorAll('path');paths[0].setAttribute('d',`M${x-6} ${y}C${x-11} ${y+35} 286 248 304 292L307 292C290 245 ${x-1} ${y+35} ${x+6} ${y}Z`);paths[0].setAttribute('fill','#dfeae0');paths[0].setAttribute('fill-opacity','.85');paths[0].setAttribute('stroke-width','0');paths[1].setAttribute('d',`M${x} ${y}C${x-4} ${y+35} 288 246 305 292`);}
  function pourFrame(now){if(!pourStart)return;const elapsed=Math.max(0,now-pourStart-150),p=POUR[state.pourStep],base=state.pourStep?POUR[state.pourStep-1].total:0;pourAmount=elapsed;state.water=Math.min(.54,base+(p.total-base)*elapsed/((p.min+p.max)/2));$('pour-fill').style.width=Math.min(100,elapsed/(p.max+700)*100)+'%';$('pour-fill').style.background=elapsed>p.max?'#b27d5f':'var(--olive)';updateStream();if(elapsed>100&&Math.floor(elapsed/140)!==Math.floor((elapsed-17)/140))renderer.ripple();renderer.invalidate();if(elapsed>p.max)$('pour-hint').textContent='水稍多了，松手后可以重试这一汤。';pourRAF=requestAnimationFrame(pourFrame);}
  function startPour(event){if(state.stage!==2||state.pourReady||state.pourFailed||pourStart)return;event.preventDefault();pourPointer=event.pointerId;$('kettle').setPointerCapture(event.pointerId);pourStart=performance.now();window.TeaSound.pour();pourAmount=0;$('kettle').classList.add('pouring');setTimeout(()=>{if(pourStart)$('water-stream').removeAttribute('hidden');},180);pourRAF=requestAnimationFrame(pourFrame);}
  function endPour(){window.TeaSound.stop();if(!pourStart)return;const p=POUR[state.pourStep];pourAmount=Math.max(0,performance.now()-pourStart-150);pourStart=0;pourPointer=null;cancelAnimationFrame(pourRAF);$('kettle').classList.remove('pouring');$('water-stream').setAttribute('hidden','');const success=pourAmount>=p.min&&pourAmount<=p.max;state.pourReady=success;state.pourFailed=!success;if(success){state.water=p.total;toast(p.text);renderPour();}else{$('pour-hint').innerHTML=`${pourAmount<p.min?'水量稍少，还可以再添得从容些。':'水量稍多，无妨，再试这一汤。'} <button class="text-button" id="retry-pour">重试这一汤</button>`;}$('kettle').querySelector('span').textContent=state.pourReady?'本汤已完成':state.pourFailed?'请重试这一汤':'长按注水 · 松手停止';$('kettle').disabled=state.pourReady||state.pourFailed;updateNext();renderer.invalidate();}
  function resetPour(){state.pourReady=false;state.pourFailed=false;state.water=state.pourStep?POUR[state.pourStep-1].total:0;$('kettle').disabled=false;renderPour();updateNext();renderer.invalidate();}
  function whiskText(){return state.whisk>=1000?'沫厚如云，可以作画':state.whisk>=900?'雪沫乳花，浮于盏面':state.whisk>=600?'沫如珠玑，磊落可观':state.whisk>=300?'沫渐起，如疏星淡月':'一来一回，茶沫渐生';}
  function renderWhisk(){$('controls').innerHTML=`<p class="whisk-caption" id="whisk-text">${whiskText()}</p><div class="meter"><span class="meter-fill" id="whisk-fill" style="width:${state.whisk/10}%"></span></div><div class="meter-labels"><span>汤 花</span><span class="whisk-count" id="whisk-count">${Math.floor(state.whisk/10)}%</span></div><p class="action-hint">${state.whisk>=1000?'这一盏雪，等你落笔。':'在茶面快速来回滑动，也可以连续轻点。'}</p>`;}
  function addWhisk(count,x,y){if(state.whisk>=1000)return;window.TeaSound.whisk();state.whisk=Math.min(1000,state.whisk+count);$('whisk-fill').style.width=state.whisk/10+'%';$('whisk-count').textContent=Math.floor(state.whisk/10)+'%';$('whisk-text').textContent=whiskText();if(!renderer.lastWhiskRipple||performance.now()-renderer.lastWhiskRipple>100){renderer.lastWhiskRipple=performance.now();renderer.ripple(x,y);}if(state.whisk>=1000){$('whisk').hidden=true;renderWhisk();toast('沫厚如云，可以作画');updateNext();}renderer.invalidate();}
  const COLORS=[['#745235','茶褐'],['#45483f','松烟'],['#737e60','苔青'],['#9b725c','赭石'],['#ab8182','胭脂']];
  const GROUPS={'萌宠':['团团熊猫','墨熊猫','花狸','垂耳犬','闻草兔','趴趴猫','探头狗','熊猫','猫咪','小兔','小狗','海豹','小鸟'],'点缀':['蝶','蜻蜓','落瓣','月','星星','云'],'花草':['清竹','花枝','芳草','竹','折枝','花叶','玫瑰','雏菊','清荷','团叶','落瓣','梅','兰','蝶'],'水景':['锦鲤','水草','游鱼','轻舟','水纹','远岸','芦苇','山','月','云','松','瀑','石']};
  const LABELS={'蝶':'蝴蝶','落瓣':'落花','月':'一弯月','星星':'小星点','云':'云纹','墨熊猫':'熊猫抱抱','花狸':'小猫探花','垂耳犬':'小狗抱抱','闻草兔':'小兔闻草','趴趴猫':'小猫趴着','探头狗':'小狗探头','清荷':'荷花','团叶':'荷叶','折枝':'花枝','花叶':'花叶','轻舟':'小舟'};
  const COMPOSITIONS={
    '团团抱竹':[['团团熊猫',262,326,1.6,0,'#745235'],['清竹',377,287,1.9,0,'#737e60']],
    '熊猫抱竹':[['墨熊猫',260,317,1.7,0,'#745235'],['竹',398,286,1.55,0,'#737e60']],
    '猫咪探花':[['花狸',266,335,1.85,0,'#745235'],['花枝',360,242,1.7,0,'#ab8182']],
    '小狗抱花':[['垂耳犬',285,311,1.65,0,'#745235'],['玫瑰',322,324,.9,-18,'#ab8182'],['落瓣',365,383,.4,0,'#ab8182']],
    '双猫贴贴':[['花狸',257,317,1.3,12,'#745235'],['花狸',346,308,1.25,-14,'#9b725c'],['爱心',302,202,.35,0,'#ab8182']],
    '小兔闻草':[['闻草兔',303,304,1.9,0,'#745235'],['芳草',254,425,1.45,0,'#737e60']],
    '枝头小鸟':[['折枝',283,317,1.95,-12,'#745235'],['花叶',256,232,.85,-8,'#ab8182'],['栖鸟',337,284,.8,-8,'#745235'],['落瓣',348,368,.6,20,'#ab8182']],
    '双鱼游水':[['锦鲤',230,248,1.05,-28,'#9b725c'],['锦鲤',387,326,1.0,145,'#745235'],['水草',260,418,1.3,0,'#737e60']],
    '荷塘游鱼':[['清荷',265,235,1.05,0,'#ab8182'],['团叶',350,285,.9,8,'#737e60'],['游鱼',290,365,.65,-18,'#745235'],['水纹',298,392,1.1,0,'#737e60']],
    '江上留白':[['远岸',301,238,1.5,0,'#737e60'],['轻舟',296,330,.85,0,'#745235'],['芦苇',405,337,.85,-10,'#737e60'],['水纹',295,369,1.2,0,'#737e60']]
  };
  function compositionObjects(name){return COMPOSITIONS[name].map(([element,x,y,scale,rotation,color])=>({kind:'element',element,x,y,scale,rotation,color:state.customColor?state.color:color}));}
  function addComposition(name){if(!COMPOSITIONS[name])return;snapshot();compositionObjects(name).forEach(o=>state.objects.push(Object.assign(o,{id:uid++,createdAt:performance.now()})));state.selected=null;state.mode='select';changed();renderDrawing();toast('已放入茶面，可点选景物调整');}
  function renderDrawing(){
    const drawing=state.mode==='brush',textMode=state.panel==='text',view=drawing?'draw':textMode?'text':'patterns',oldScroll=$('controls').dataset.view===view?$('controls').scrollTop:0;$('controls').dataset.view=view;$('experience').dataset.drawing=String(drawing);$('tea-canvas').style.touchAction=drawing||state.mode==='select'?'none':'pan-y';
    $('controls').innerHTML=`<div class="creation-tabs"><button data-view="patterns" class="${!drawing&&!textMode?'active':''}" aria-pressed="${!drawing&&!textMode}">选景</button><button data-view="draw" class="${drawing?'active':''}" aria-pressed="${drawing}">添画</button><button data-view="text" class="${textMode?'active':''}" aria-pressed="${textMode}">题字</button></div><div id="selection-actions"></div><div class="drawing-panel" id="drawing-panel"></div><div class="ink-colors" aria-label="数字创作色" ${drawing||textMode||currentObject()||state.paletteOpen?'':'hidden'}>${COLORS.map(([color,name])=>`<button data-color="${color}" style="--ink:${color}" aria-label="${name}" aria-pressed="${((currentObject()||{}).color||state.color)===color}" class="${((currentObject()||{}).color||state.color)===color?'active':''}"><i class="color-swatch" aria-hidden="true"></i><span>${name}</span></button>`).join('')}</div><div class="palette-actions"><button id="toggle-palette" ${drawing||textMode||currentObject()?'hidden':''}>${state.paletteOpen?'收起颜色':'创作色'}</button><button id="whole-color" ${drawing||textMode||currentObject()||state.paletteOpen?'':'hidden'} ${!state.objects.length?'disabled':''}>整幅同色</button></div><div id="transform-panel"></div>`;
    renderPanel();renderSelectionActions();$('controls').scrollTop=oldScroll;
  }
  function renderPanel(){const panel=$('drawing-panel');if(!panel)return;if(!GROUPS[state.category])state.category='萌宠';
    if(state.panel==='text'){panel.innerHTML=`<button class="secondary-button" id="edit-art-text">写字 · 横排 / 竖排</button>`;}
    else if(state.mode==='brush'){panel.innerHTML=`<div class="tool-row brush-tools">${[['fine','细线',''],['wash','晕染','wash'],['ink','浓线','ink']].map(([key,label,cl])=>`<button class="tool ${state.brush===key?'active':''}" data-brush="${key}" aria-pressed="${state.brush===key}"><span class="tool-symbol"><i class="brush-mark ${cl}" style="--ink:${state.color}"></i></span>${label}</button>`).join('')}</div>`;}
    else if(currentObject()&&!state.browsing){const o=currentObject();panel.innerHTML=`<div class="selected-scene">${escapeHTML(LABELS[o.element]||o.element||o.text||'笔画')} · 颜色<button id="continue-gallery">继续选景</button></div>`;}
    else{panel.innerHTML=`<div class="gallery-tabs"><button data-gallery="whole" aria-pressed="${state.galleryMode!=='parts'}">整幅小景</button><button data-gallery="parts" aria-pressed="${state.galleryMode==='parts'}">自己搭配</button></div>${state.galleryMode==='parts'?`<div class="pattern-categories">${Object.keys(GROUPS).map(g=>`<button data-category="${g}" aria-pressed="${state.category===g}" class="${state.category===g?'active':''}">${g}</button>`).join('')}</div><div class="element-options">${GROUPS[state.category].map(e=>`<button data-element="${e}" aria-label="添加${LABELS[e]||e}"><canvas data-scene="${e}"></canvas><span>${LABELS[e]||e}</span></button>`).join('')}</div>`:`<div class="composition-gallery">${['团团抱竹','熊猫抱竹','猫咪探花','小兔闻草','双鱼游水',...Object.keys(COMPOSITIONS).filter(n=>!['团团抱竹','熊猫抱竹','猫咪探花','小兔闻草','双鱼游水'].includes(n))].map(name=>`<button data-composition="${name}" aria-label="添加${name}"><canvas data-composition-preview="${name}"></canvas><span>${name}</span></button>`).join('')}</div>`}`;
      panel.querySelectorAll('[data-scene]').forEach(c=>renderer.elementThumbnail(c,c.dataset.scene));panel.querySelectorAll('[data-composition-preview]').forEach(c=>{c.width=c.height=260;const pc=c.getContext('2d');pc.scale(.55,.55);pc.translate(-64,-58);compositionObjects(c.dataset.compositionPreview).forEach(o=>renderer.drawObject(pc,o,performance.now()));});
    }
    renderTransform();
  }
  function editArtText(){
    let direction=state.textDirection;
    openModal(`<h2>写在茶上</h2><form id="text-form" class="finish-dialog-form"><div class="text-direction"><button type="button" data-direction="horizontal" aria-pressed="${direction==='horizontal'}">横排</button><button type="button" data-direction="vertical" aria-pressed="${direction==='vertical'}">竖排</button></div><label>茶面文字 · 1–4 字<input id="art-text" value="${escapeHTML(state.textDraft)}" maxlength="8" autocomplete="off"></label><button class="primary-button" type="submit">落在茶上</button><button type="button" class="text-button" id="cancel-art-text">暂不添加</button></form>`);
    $('text-form').onclick=e=>{const b=e.target.closest('[data-direction]');if(b){direction=b.dataset.direction;$('text-form').querySelectorAll('[data-direction]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.direction===direction)));}};
    $('cancel-art-text').onclick=closeModal;
    $('text-form').onsubmit=e=>{e.preventDefault();const text=$('art-text').value.trim();if(Array.from(text).length<1||Array.from(text).length>4){toast('茶面文字请写 1–4 个字');return;}state.textDraft=text;state.textDirection=direction;closeModal();addObject('text',{text,direction});};
  }
  function objectName(o){return (o.kind==='stroke'?'手绘笔画':o.kind==='text'?'文字「'+o.text+'」':LABELS[o.element]||o.element)+' · '+o.id;}
  function renderSelectionActions(){
    const root=$('selection-actions');if(root)root.innerHTML='';
    $('canvas-tools').innerHTML=`<button id="undo-button" ${!history.length?'disabled':''}>${icon('undo')}<span>撤销</span></button><button id="delete-object" ${!currentObject()?'disabled':''}><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7"/></svg><span>删除</span></button><button id="clear-button" ${!state.objects.length?'disabled':''}>${icon('drop')}<span>清空</span></button>`;
    const o=currentObject();$('rotation-bar').innerHTML=`<div class="rotation-inner" ${o?'':'hidden'}><label for="object-rotation">旋转</label><input id="object-rotation" aria-label="对象旋转" type="range" min="-180" max="180" value="${o?o.rotation||0:0}"><output id="rotation-value">${o?o.rotation||0:0}°</output><button id="reset-rotation">回正</button></div>`;
    const colors=document.querySelector('.ink-colors');if(colors)colors.setAttribute('aria-label',o?objectName(o)+' · 颜色':'创作色');
    if(o&&!selectionHintShown){selectionHintShown=true;toast('拖动位置，双指缩放');}
  }
  function renderTransform(){const panel=$('transform-panel');if(panel){const o=currentObject();panel.innerHTML=o&&o.kind==='text'&&state.panel==='text'?`<button id="rotate-text-direction">${o.direction==='vertical'?'改为横排':'改为竖排'}</button>`:'';}renderSelectionActions();}
  let selectionHintShown=false, editBefore=null,lastTap=null;
  function beginEdit(){if(editBefore===null)editBefore=JSON.stringify(state.objects);}
  function finishEdit(){if(editBefore!==null&&editBefore!==JSON.stringify(state.objects)){history.push(editBefore);if(history.length>10)history.shift();}editBefore=null;changed();}
  function handlePoint(o){const b=renderer.objectBounds(o),r=(o.rotation||0)*Math.PI/180,k=o.scale||1,x=b.w*k/2,y=b.h*k/2;return {x:(o.x===undefined?b.x:o.x)+x*Math.cos(r)-y*Math.sin(r),y:(o.y===undefined?b.y:o.y)+x*Math.sin(r)+y*Math.cos(r)};}
  function selectObject(id){const o=state.objects.find(x=>x.id===id);if(!o)return;if(o.kind==='stroke'&&o.x===undefined){const bounds=renderer.objectBounds(o);o.x=bounds.x;o.y=bounds.y;o.scale=1;o.rotation=0;}state.selected=id;state.browsing=false;state.mode='select';state.panel=o.kind==='text'?'text':'elements';renderDrawing();renderer.invalidate();$('controls').scrollTop=0;}
  function addObject(kind,content){snapshot();const o=Object.assign({id:uid++,kind,x:300,y:294,scale:1,rotation:0,color:state.color,createdAt:performance.now()},content);state.objects.push(o);state.selected=o.id;state.browsing=false;state.mode='select';state.panel=kind==='text'?'text':'elements';changed();renderDrawing();if(kind==='text'&&document.fonts)document.fonts.load('55px TeaScript').then(()=>renderer.invalidate(true));}
  function renderSignature(){
    $('controls').innerHTML=`<label class="work-name">作品名 <span>选填</span><input id="optional-title" maxlength="12" value="${state.title==='一盏清欢'?'':escapeHTML(state.title)}" placeholder="给这一盏起个名字"></label><details class="optional-decoration"><summary>装饰作品</summary><button class="text-button" id="edit-inscription">${state.inscription?'修改题字':'添一句题字'}</button><div class="stamp-row">${[['none','不盖章'],['square','方印'],['round','圆印'],['oval','闲章']].map(([key,label])=>`<button class="stamp-choice" data-stamp="${key}" aria-pressed="${state.stamp===key}">${label}</button>`).join('')}</div></details><button class="text-button tea-note" id="finish-note">茶事小记</button>`;
  }
  function editInscription(){
    openModal(`<h2>留一句题字</h2><form id="inscription-form" class="finish-dialog-form"><label>作品名<input id="work-title" maxlength="12" value="${escapeHTML(state.title)}" placeholder="一盏清欢"></label><label>题字 · 最多四字<input id="inscription" maxlength="8" value="${escapeHTML(state.inscription)}" placeholder="写下此刻心意"></label><button class="primary-button" type="submit">就这样落款</button><button class="text-button" id="cancel-inscription" type="button">暂不修改</button></form>`);
    $('cancel-inscription').onclick=closeModal;$('inscription-form').onsubmit=e=>{e.preventDefault();const text=$('inscription').value.trim();if(Array.from(text).length>4){toast('题字最多 4 个字');return;}state.title=$('work-title').value.trim()||'一盏清欢';state.inscription=text;generated=null;closeModal();renderSignature();};
  }
  function updateSignaturePreview(){document.querySelectorAll('.stamp-preview').forEach(el=>el.textContent=state.stampText);if($('finish-writing')){$('finish-writing').textContent=state.inscription;const seal=$('finish-seal');seal.textContent=state.stampText;seal.hidden=state.stamp==='none';seal.dataset.stamp=state.stamp;}}
  function point(event){const rect=$('tea-canvas').getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width*600,y:(event.clientY-rect.top)/rect.height*600,t:performance.now()};}
  function inside(p){return Math.hypot(p.x-300,p.y-294)<=217;}
  function hitObjects(p){const hits=[],minHit=44*600/$('tea-canvas').getBoundingClientRect().width;for(let i=state.objects.length-1;i>=0;i--){const o=state.objects[i],bounds=renderer.objectBounds(o),r=-(o.rotation||0)*Math.PI/180,dx=p.x-(o.x===undefined?bounds.x:o.x),dy=p.y-(o.y===undefined?bounds.y:o.y),scale=o.scale||1,x=dx*Math.cos(r)-dy*Math.sin(r),y=dx*Math.sin(r)+dy*Math.cos(r);if(Math.abs(x)<=Math.max(bounds.w*scale,minHit)/2&&Math.abs(y)<=Math.max(bounds.h*scale,minHit)/2)hits.push(o);}return hits;}
  function hitObject(p){return hitObjects(p)[0]||null;}
  function clampPosition(o){const d=Math.hypot(o.x-300,o.y-294);if(d>210){o.x=300+(o.x-300)/d*210;o.y=294+(o.y-294)/d*210;}}
  function canvasDown(event){
    if(state.stage!==3&&state.stage!==4)return;if(event.button!==0&&event.pointerType==='mouse')return;
    const p=point(event),selected=currentObject(),hp=selected?handlePoint(selected):null,handle=hp&&Math.hypot(p.x-hp.x,p.y-hp.y)<22*600/$('tea-canvas').getBoundingClientRect().width&&Math.hypot(p.x-hp.x,p.y-hp.y)<Math.hypot(p.x-selected.x,p.y-selected.y);
    if(!inside(p)&&!handle)return;
    $('tea-canvas').setPointerCapture(event.pointerId);pointers.set(event.pointerId,p);
    if(pointers.size===2&&state.stage===4&&currentObject()&&state.mode!=='brush'){
      event.preventDefault();lastTap=null;const pts=[...pointers.values()],o=currentObject();beginEdit();gesture={distance:Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y),scale:o.scale||1,id:o.id};pointer=null;return;
    }
    if(pointers.size>1)return;
    if(state.stage===3){event.preventDefault();pointer={id:event.pointerId,kind:'whisk',last:p};addWhisk(1,p.x,p.y);moveWhisk(p);return;}
    if(state.mode!=='brush'){
      const hits=hitObjects(p),activeHit=selected&&hits.some(o=>o.id===selected.id);const o=handle||activeHit?selected:hits[0];if(!o){pointer={id:event.pointerId,kind:'blank',start:p,moved:false};return;}
      event.preventDefault();beginEdit();state.selected=o.id;
      if(o.kind==='stroke'&&o.x===undefined){const b=renderer.objectBounds(o);o.x=b.x;o.y=b.y;o.scale=1;o.rotation=0;}
      state.panel=o.kind==='text'?'text':'elements';pointer={id:event.pointerId,kind:handle?'handle':'object',start:p,moved:false,candidates:hits.map(o=>o.id),object:o,offsetX:p.x-o.x,offsetY:p.y-o.y,scale:o.scale||1,distance:Math.hypot(p.x-o.x,p.y-o.y)};renderDrawing();renderer.invalidate();
    }else{
      event.preventDefault();state.selected=null;renderTransform();snapshot();const o={id:uid++,kind:'stroke',brush:state.brush,color:state.color,points:[Object.assign({},p,{y:p.y+10,strength:.95})]};state.objects.push(o);pointer={id:event.pointerId,kind:'stroke',object:o,last:p,dwell:performance.now()};changed();
    }
  }
  function moveWhisk(p){$('whisk').style.left=p.x/6+'%';$('whisk').style.top=p.y/6+'%';}
  function canvasMove(event){
    const p=point(event);if(pointers.has(event.pointerId))pointers.set(event.pointerId,p);
    if(gesture&&pointers.size>=2){const pts=[...pointers.values()],o=state.objects.find(x=>x.id===gesture.id);if(o){o.scale=Math.max(.3,Math.min(2.4,gesture.scale*Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)/Math.max(1,gesture.distance)));changed();}return;}
    if(!pointer||pointer.id!==event.pointerId)return;if(pointer.kind==='blank'){if(Math.hypot(p.x-pointer.start.x,p.y-pointer.start.y)>8)pointer.moved=true;return;}event.preventDefault();
    if(pointer.kind==='whisk'){moveWhisk(p);if(inside(p)&&inside(pointer.last)){whiskRemainder+=Math.hypot(p.x-pointer.last.x,p.y-pointer.last.y)/4;const count=Math.floor(whiskRemainder);whiskRemainder-=count;addWhisk(count,p.x,p.y);}pointer.last=p;}
    else if(pointer.kind==='handle'){pointer.object.scale=Math.max(.3,Math.min(2.4,pointer.scale*Math.hypot(p.x-pointer.object.x,p.y-pointer.object.y)/Math.max(1,pointer.distance)));changed();}
    else if(pointer.kind==='object'){if(Math.hypot(p.x-pointer.start.x,p.y-pointer.start.y)>6*600/$('tea-canvas').getBoundingClientRect().width)pointer.moved=true;if(!pointer.moved)return;pointer.object.x=p.x-pointer.offsetX;pointer.object.y=p.y-pointer.offsetY;clampPosition(pointer.object);changed();}
    else if(pointer.kind==='stroke'){
      if(!inside(p)){pointer.last=p;return;}const prev=pointer.last,d=Math.hypot(p.x-prev.x,p.y-prev.y);if(d<1.4)return;
      // Leaving the circular surface breaks the stroke, preventing a chord on re-entry.
      if(!inside(prev)){pointer.object.ended=p.t;const o={id:uid++,kind:'stroke',brush:state.brush,color:state.color,points:[]};state.objects.push(o);pointer.object=o;}
      pointer.object.points.push(Object.assign({},p,{y:p.y+10,strength:Math.max(.15,Math.min(1,1-d/Math.max(1,p.t-prev.t)/2.2))}));pointer.last=p;pointer.dwell=p.t;changed();
    }
  }
  function canvasUp(event){pointers.delete(event.pointerId);if(gesture){if(!pointers.size){gesture=null;pointer=null;finishEdit();renderTransform();}return;}if(pointer&&pointer.id===event.pointerId){if(pointer.kind==='blank'&&!pointer.moved&&event.type==='pointerup'){state.selected=null;lastTap=null;renderDrawing();renderer.invalidate();}if(pointer.kind==='stroke'){pointer.object.ended=performance.now();changed();renderSelectionActions();}if(pointer.kind==='object'||pointer.kind==='handle'){finishEdit();if(pointer.kind==='object'&&!pointer.moved&&event.type==='pointerup'){const ids=pointer.candidates,key=ids.join(','),p=point(event);if(lastTap&&lastTap.key===key&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<22*600/$('tea-canvas').getBoundingClientRect().width&&ids.length>1){selectObject(ids[(ids.indexOf(state.selected)+1)%ids.length]);}lastTap={key,x:p.x,y:p.y};}else lastTap=null;renderTransform();}pointer=null;}}

  function dwellFrame(now){if(pointer&&pointer.kind==='stroke'&&now-pointer.dwell>75&&inside(pointer.last)){const p=pointer.last;pointer.object.points.push(Object.assign({},p,{y:p.y+10,t:now,strength:1}));pointer.dwell=now;changed();}requestAnimationFrame(dwellFrame);}
  function stopInteractions(){finishEdit();window.TeaSound.stop();if(pourStart)endPour();if(pointer&&pointer.kind==='stroke'){pointer.object.ended=performance.now();changed();}pointer=null;pointers.clear();gesture=null;}

  function openModal(html,eyebrow='茶 百 戏'){if(!$('modal').open){modalScroll=window.scrollY;document.body.classList.add('dialog-active');}syncViewport();$('modal-content').innerHTML=html;$('modal-eyebrow').textContent=eyebrow;if(!$('modal').open){if(typeof $('modal').showModal==='function')$('modal').showModal();else{$('modal').setAttribute('open','');document.body.classList.add('modal-fallback');}}}
  function closeModal(){if(typeof $('modal').close==='function')$('modal').close();else $('modal').removeAttribute('open');document.body.classList.remove('modal-fallback','dialog-active');if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();window.scrollTo(0,modalScroll);setTimeout(syncViewport,200);}
  function confirmAction(title,message,action){openModal(`<div class="confirm-dialog"><h2>${title}</h2><p>${message}</p><div class="modal-actions"><button class="secondary-button" id="cancel-confirm">先留着</button><button class="primary-button" id="accept-confirm">确认</button></div></div>`);$('cancel-confirm').onclick=closeModal;$('accept-confirm').onclick=()=>{closeModal();action();};}
  function drawStamp(c,x,y,size){if(state.stamp==='none')return;c.save();c.translate(x,y);c.rotate(-.045);c.strokeStyle='#a44836';c.fillStyle='#a44836';c.lineWidth=2.6;const round=state.stamp!=='square',rx=state.stamp==='oval'?size*.64:size*.5;if(round){c.beginPath();c.ellipse(0,0,rx,size*.5,0,0,Math.PI*2);state.stamp==='round'?c.fill():c.stroke();c.beginPath();c.ellipse(0,0,rx-4,size*.5-4,0,0,Math.PI*2);c.lineWidth=1;c.stroke();}else{c.strokeRect(-size/2,-size/2,size,size);c.lineWidth=.8;c.strokeRect(-size/2+4,-size/2+4,size-8,size-8);}c.fillStyle=state.stamp==='round'?'#f3e9d3':'#a44836';c.font=`${size*.42}px TeaScript, serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(state.stampText,0,0,size*.84);c.restore();}
  async function createCard(){
    const chars=[...state.inscription.trim()];if(chars.length>4){toast('题字最多 4 个字');if($('inscription'))$('inscription').focus();return;}
    $('next-button').disabled=true;$('next-label').textContent='正在装裱';
    try{
      if(document.fonts){await document.fonts.load('55px TeaScript');await document.fonts.ready;}await renderer.assetsReady;
      const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;const c=canvas.getContext('2d'),rng=random(886);c.fillStyle='#eee5d2';c.fillRect(0,0,900,1200);
      const wash=c.createRadialGradient(380,470,10,450,600,740);wash.addColorStop(0,'rgba(250,244,230,0.50196)');wash.addColorStop(1,'rgba(203,189,155,0.20784)');c.fillStyle=wash;c.fillRect(0,0,900,1200);
      for(let i=0;i<60000;i++){c.fillStyle=rng()>.6?'rgba(126,107,61,0.03922)':'rgba(255,251,234,0.15686)';c.fillRect(rng()*900,rng()*1200,rng()*1.8+.5,rng()*1.2+.3);}
      c.strokeStyle='rgba(180,164,129,0.50196)';c.lineWidth=1;c.strokeRect(28,28,844,1144);c.strokeStyle='rgba(203,189,155,0.43922)';c.strokeRect(36,36,828,1128);
      c.fillStyle='#8c816b';c.textAlign='center';c.font='15px "Songti SC", serif';c.fillText('茶 百 戏  ·  盏 中 丹 青',450,91);
      c.fillStyle='#554d39';c.font='48px TeaScript, serif';c.textAlign='right';[...state.inscription].forEach((char,i)=>c.fillText(char,797,163+i*53));drawStamp(c,779,179+chars.length*53,40);
      const bowl=renderer.exportBowl();c.drawImage(bowl,65,159,760,760);
      c.fillStyle='#433f31';c.textAlign='center';c.font='44px TeaScript, serif';c.fillText(state.title.trim()||'一盏清欢',450,925,700);
      c.fillStyle='#81765f';c.font='18px "Songti SC", serif';c.fillText('宋 代 点 茶 · 茶 百 戏',450,982);c.fillStyle='#998a70';c.font='16px "Songti SC", serif';c.fillText('以茶为墨，以沫为纸，须臾即散',450,1020);
      c.strokeStyle='rgba(187,170,134,0.4)';c.beginPath();c.moveTo(399,1051);c.lineTo(501,1051);c.stroke();
      const date=new Date(),dateLabel=`${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;c.font='15px "Songti SC", serif';c.fillStyle='#96886e';c.fillText(dateLabel,450,1093);c.font='12px "Songti SC", serif';c.fillStyle='#aa9d82';c.fillText(`${BOWLS[state.bowl].name}  /  ${TEAS[state.tea].name}`,450,1122);
      generated={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),title:state.title.trim()||'一盏清欢',date:dateLabel,image:canvas.toDataURL('image/png'),bowl:state.bowl,tea:state.tea};showCard(generated,false);
    }catch(e){toast('装裱暂未完成，请再试一次。');}finally{$('next-label').textContent=STEPS[5].next;updateNext();}
  }
  function dataURLToBlob(dataURL){
    const parts=dataURL.split(','),mime=(parts[0].match(/data:([^;]+)/)||[])[1]||'image/png';
    const binary=atob(parts[1]),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }
  function downloadCard(card){
    const blob=dataURLToBlob(card.image),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`茶百戏-${card.title||'盏中丹青'}.png`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  async function imageAction(card,kind){
    const button=$(kind==='share'?'share-card':'download-card');if(button.disabled)return;button.disabled=true;
    try{
      if(kind==='share'){
        const file=new File([dataURLToBlob(card.image)],`茶百戏-${card.title||'盏中丹青'}.png`,{type:'image/png'});
        if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
          await navigator.share({title:'茶百戏 · 盏中丹青',text:'我完成了一次宋代点茶与茶百戏数字体验。',files:[file]});
          toast('已打开系统分享');
        }else{
          downloadCard(card);toast('当前浏览器不支持直接分享，已为你下载作品图片。');
        }
      }else{downloadCard(card);toast('作品图片已下载');}
    }catch(e){
      if(e&&e.name==='AbortError')return;
      toast(kind==='share'?'分享未完成，作品仍保留在当前页面。':'图片下载未完成，请长按作品图保存。');
    }finally{if(button)button.disabled=false;}
  }
  function showCard(card,saved){if(!saved)sessionComplete=true;
    openModal(`<h2>${saved?'匣中珍藏':'一盏，成画'}</h2><img class="card-image" id="card-preview" alt="${escapeHTML(card.title)} · 水丹青作品卡"><div class="result-actions"><button class="secondary-button" id="save-card" ${saved?'disabled':''}>${saved?'已存入茶戏匣':'存入茶戏匣'}</button><button class="secondary-button" id="download-card">保存图片</button><button class="primary-button" id="share-card">分享作品</button></div><button class="result-home" id="result-home">返回首页</button>${saved?'<button class="text-button" id="remove-card">移出茶戏匣</button>':'<button class="text-button" id="card-customize">调整题字与印章</button>'}`,'水 丹 青');
    $('card-preview').src=card.image;$('download-card').onclick=()=>imageAction(card,'save');$('share-card').onclick=()=>imageAction(card,'share');$('result-home').onclick=()=>{closeModal();showLanding();};
    if(!saved){$('save-card').onclick=()=>saveCard(card);$('card-customize').onclick=()=>{closeModal();state.finishTab='title';renderSignature();};}
    else $('remove-card').onclick=()=>confirmAction('取出这一盏？','移出后将不再出现在茶戏匣中，已保存的图片仍会保留。',async()=>{const remaining=collection.filter(x=>x.id!==card.id);try{if(collectionDB)await databaseAction('readwrite',store=>store.delete(card.id));else localStorage.setItem(STORAGE,JSON.stringify(remaining));collection=remaining;updateCount();showCollection();}catch(e){toast('浏览器未允许修改收藏，请稍后重试。');showCollection();}});
  }
  async function saveCard(card){await collectionReady;if(collection.some(x=>x.id===card.id)){toast('这一盏已在匣中');return;}const next=[card,...collection];const saveButton=$('save-card');if(saveButton)saveButton.disabled=true;try{if(collectionDB)await databaseAction('readwrite',store=>store.put(card));else localStorage.setItem(STORAGE,JSON.stringify(next));collection=next;storageAvailable=true;updateCount();toast('已收入茶戏匣');showCard(card,true);}catch(e){if(saveButton)saveButton.disabled=false;toast('浏览器存储不可用或已满，请先保存图片。');}}
  async function showCollection(){stopInteractions();await collectionReady;const count=collection.length,nums=['零','一','二','三','四','五','六','七','八','九','十'];openModal(`<h2>我的茶戏匣</h2><p class="modal-subtitle">${count?`一匣藏${nums[count]||count}盏，收藏你的独一无二。`:'此间尚空，静候你的第一盏茶。'}</p>${count?`<div class="gallery">${collection.map((card,i)=>`<button class="gallery-item" data-card="${i}"><img id="gallery-img-${i}" alt="${escapeHTML(card.title)}" loading="lazy"><p>${escapeHTML(card.title)}</p><small>${escapeHTML(card.date)}</small></button>`).join('')}</div>`:`<div class="empty-box">${icon('box')}<p>以一盏，记一日</p><small>${storageAvailable?'完成创作后，将水丹青收入这里。':'当前浏览器存储不可用，作品可保存到相册。'}</small><div class="modal-actions"><button class="primary-button" id="empty-create">去点一盏茶</button></div></div>`}`,'茶 戏 匣 · 私 人 珍 藏');collection.forEach((card,i)=>$(`gallery-img-${i}`).src=card.image);const create=$('empty-create');if(create)create.onclick=()=>{closeModal();if(!hasStarted)enterExperience();};}
  function editStamp(style){
    openModal(`<h2>印上何字</h2><p class="modal-subtitle">写你的名字，或一二字心意。</p><form id="stamp-form" class="finish-dialog-form"><label>印文 · 1–2 字<input id="stamp-input" maxlength="4" value="${escapeHTML(state.stampText)}" aria-label="印章内容" placeholder="例如：清欢"></label><div class="modal-actions">${['清欢','如意','长乐'].map(x=>`<button type="button" class="secondary-button" data-seal-text="${x}">${x}</button>`).join('')}</div><button class="primary-button" type="submit">就钤此印</button><button class="text-button" id="cancel-stamp" type="button">暂不修改</button></form>`);
    $('cancel-stamp').onclick=closeModal;$('stamp-form').onsubmit=e=>{e.preventDefault();const text=$('stamp-input').value.trim();if(Array.from(text).length<1||Array.from(text).length>2){toast('印文请留 1–2 个字');return;}state.stamp=style;state.stampText=text;generated=null;closeModal();renderSignature();};
  }
  function showAbout(){openModal(`<div class="document-note"><h2>茶事小记</h2><p><strong>这是一场数字化文化体验，并非宋代点茶工艺的完整复原。</strong>玩法以宋代点茶与茶百戏为线索，将真实工序压缩为“择盏—择茶—注汤—击拂—茶百戏—收藏”六段，注汤次数、水量与操作节奏均作了交互化简化。</p><p>赵佶《大观茶论·点》记有“量茶受汤，调如融胶”“珠玑磊落”等点茶状态，原文详细描述多次注汤与击拂；蔡襄《茶录·点茶》亦记“汤上盏可四分则止”。本体验只取其关键意象与动作逻辑。</p><p>茶百戏在古籍中又见“分茶”等称谓。陶谷《清异录》记其可使“汤纹水脉成物象”，且“纤巧如画，但须臾即就散灭”。当代茶百戏复原常以清水在点茶形成的茶沫上显现文字与图案。</p><p>游戏中的彩色笔触、萌宠与预设小景均为<strong>当代数字艺术演绎</strong>，不代表历史上的茶百戏使用彩色颜料；三款茶的视觉色彩同样不是历史实物复原。建窑黑釉盏与点茶、斗茶关系最为密切，汝窑与定窑器型在本体验中作为宋瓷审美选项呈现。</p><p>2017年，茶百戏列入福建省第五批省级非物质文化遗产代表性项目名录，保护单位为武夷山市文化馆。本体验希望把“观看传统技艺”转换为“亲手参与一次”的数字入口。</p><p>茶戏匣仅保存在当前浏览器；清理浏览器数据会移除收藏，喜欢的作品请及时保存图片。</p><p>书法字体采用开源 Ma Shan Zheng（SIL OFL 1.1）。</p></div>`,'文 献 小 记');}

  $('next-button').onclick=()=>{if($('next-button').disabled)return;if(state.stage===2&&state.pourStep<2){state.pourStep++;resetPour();$('previous-button').querySelector('span').textContent='返回上一段';return;}if(state.stage===4){setStep(5);return;}if(state.stage===5){createCard();return;}setStep(state.stage+1);};
  function previousStep(){if(state.stage===2&&state.pourStep>0){stopInteractions();state.pourStep--;state.water=POUR[state.pourStep].total;state.pourReady=true;state.pourFailed=false;$('kettle').disabled=true;render();renderer.invalidate();return;}if(state.stage>0)setStep(state.stage-1);else showLanding();}
  $('back-button').onclick=showLanding;$('previous-button').onclick=previousStep;
  $('home-link').onclick=e=>{e.preventDefault();showLanding();};
  function newSession(){stopInteractions();Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,JSON.parse(initialState));history.length=0;uid=1;pointer=null;gesture=null;pointers.clear();whiskRemainder=0;transformUndo=false;generated=null;sessionComplete=false;renderer.ripples=[];renderer.lastWhiskRipple=0;try{localStorage.removeItem('tea-art-draft-v1');}catch(e){}$('kettle').disabled=false;renderer.invalidate(true);enterExperience();}
  $('start-button').onclick=()=>{if(sessionComplete)newSession();else enterExperience();};
  $('new-session').onclick=()=>confirmAction('再点一盏？','当前未收藏的创作会重新开始。茶戏匣中的作品保留。',newSession);
  $('collection-button').onclick=showCollection;$('close-modal').onclick=closeModal;
  $('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  $('step-nav').onclick=e=>{const button=e.target.closest('[data-step]');if(button&&!button.disabled)setStep(Number(button.dataset.step));};
  function toolClick(e){
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.choice!==undefined){state[state.stage===0?'bowl':'tea']=Number(b.dataset.choice);renderChoices();$('bowl-caption-text').textContent=state.stage===0?BOWLS[state.bowl].short:`${BOWLS[state.bowl].short} / ${TEAS[state.tea].name}`;renderer.invalidate(true);generated=null;}
    if(b.id==='retry-pour')resetPour();if(b.dataset.composition)addComposition(b.dataset.composition);if(b.dataset.gallery){state.galleryMode=b.dataset.gallery;state.browsing=true;renderDrawing();}if(b.id==='toggle-palette'){state.paletteOpen=!state.paletteOpen;renderDrawing();}if(b.id==='whole-color'&&state.objects.length){snapshot();state.objects.forEach(o=>o.color=state.color);changed();renderDrawing();}
    if(b.dataset.brush){state.brush=b.dataset.brush;state.mode='brush';state.panel='';renderDrawing();renderer.invalidate();}
    if(b.dataset.panel){const value=b.dataset.panel;state.panel=state.panel===value?'':value;state.mode=value==='select'?'select':state.mode;renderDrawing();}
    if(b.dataset.view){state.mode=b.dataset.view==='draw'?'brush':'select';state.panel=b.dataset.view==='draw'?'':b.dataset.view==='text'?'text':'elements';renderDrawing();renderer.invalidate();}
    if(b.id==='edit-art-text')editArtText();
    if(b.id==='rotate-text-direction'){const o=currentObject();if(o&&o.kind==='text'){snapshot();o.direction=o.direction==='vertical'?'horizontal':'vertical';changed();renderTransform();}}
    if(b.dataset.finish){state.finishTab=b.dataset.finish;renderSignature();}
    if(b.dataset.category){state.category=b.dataset.category;state.panel='elements';renderDrawing();}
    if(b.dataset.color){const o=currentObject();if(o){snapshot();o.color=b.dataset.color;}state.color=b.dataset.color;if(!o)state.customColor=true;changed();renderDrawing();}
    if(b.dataset.element){addObject('element',{element:b.dataset.element});}

    if(b.id==='undo-button'&&history.length){state.objects=JSON.parse(history.pop());state.selected=null;changed();renderDrawing();}
    if(b.id==='clear-button'&&state.objects.length){confirmAction('清空当前作品？','清空后可以撤销。',()=>{snapshot();state.objects=[];state.selected=null;changed();renderDrawing();});$('cancel-confirm').textContent='取消';$('accept-confirm').textContent='清空';}
    if(b.id==='delete-object'&&currentObject()){snapshot();state.objects=state.objects.filter(o=>o.id!==state.selected);state.selected=null;changed();renderDrawing();}
    if(b.id==='continue-gallery'){state.browsing=true;state.mode='select';state.panel='elements';renderDrawing();}
    if(b.dataset.stamp){if(b.dataset.stamp==='none'){state.stamp='none';generated=null;renderSignature();}else editStamp(b.dataset.stamp);}
    if(b.id==='edit-inscription')editInscription();if(b.id==='finish-note')showAbout();
    if(b.id==='no-inscription'){state.inscription='';generated=null;renderSignature();}

  }
  $('controls').addEventListener('click',toolClick);$('canvas-tools').addEventListener('click',e=>{e.stopPropagation();toolClick(e);});
  $('rotation-bar').addEventListener('input',e=>{if(e.target.id!=='object-rotation'||!currentObject())return;beginEdit();let value=Number(e.target.value);if(Math.abs(value)<=4)value=0;currentObject().rotation=value;$('rotation-value').textContent=value+'°';changed();});
  $('rotation-bar').addEventListener('change',()=>{finishEdit();});
  $('rotation-bar').addEventListener('click',e=>{if(e.target.id==='reset-rotation'&&currentObject()){beginEdit();currentObject().rotation=0;finishEdit();renderTransform();}});

  $('controls').addEventListener('input',e=>{const target=e.target;if(target.id==='optional-title'){state.title=target.value.trim()||'一盏清欢';generated=null;}if(target.id==='art-text')state.textDraft=target.value;if(target.id==='object-scale'||target.id==='object-rotation'){const o=currentObject();if(!o)return;if(!transformUndo){snapshot();transformUndo=true;}o[target.id==='object-scale'?'scale':'rotation']=Number(target.value);changed();}});
  $('controls').addEventListener('change',()=>{transformUndo=false;});
  $('modal-content').addEventListener('click',e=>{const card=e.target.closest('[data-card]');if(card)showCard(collection[Number(card.dataset.card)],true);const seal=e.target.closest('[data-seal-text]');if(seal)$('stamp-input').value=seal.dataset.sealText;});
  $('kettle').addEventListener('pointerdown',startPour);$('kettle').addEventListener('pointerup',endPour);$('kettle').addEventListener('pointercancel',endPour);$('kettle').addEventListener('lostpointercapture',()=>{if(pourStart)endPour();});$('kettle').addEventListener('contextmenu',e=>e.preventDefault());
  $('tea-canvas').addEventListener('pointerdown',canvasDown);$('tea-canvas').addEventListener('pointermove',canvasMove);$('tea-canvas').addEventListener('pointerup',canvasUp);$('tea-canvas').addEventListener('pointercancel',canvasUp);$('tea-canvas').addEventListener('lostpointercapture',canvasUp);$('tea-canvas').addEventListener('contextmenu',e=>e.preventDefault());
  // Touch fallback for older WebViews; modern iOS/Android use unified Pointer Events.
  if(!window.PointerEvent){for(const [el,start,move,end]of[[$('tea-canvas'),canvasDown,canvasMove,canvasUp],[$('kettle'),startPour,()=>{},endPour]]){el.setPointerCapture=()=>{};for(const [name,handler]of[['touchstart',start],['touchmove',move],['touchend',end],['touchcancel',end]]){el.addEventListener(name,e=>{if(el===$('tea-canvas')&&state.stage!==3&&state.stage!==4)return;e.preventDefault();for(const t of e.changedTouches)handler({type:name==='touchend'?'pointerup':name==='touchcancel'?'pointercancel':name,clientX:t.clientX,clientY:t.clientY,pointerId:t.identifier,pointerType:'touch',preventDefault:()=>{}});},{passive:false});}el.addEventListener('mousedown',e=>start({clientX:e.clientX,clientY:e.clientY,pointerId:1,pointerType:'mouse',button:e.button,preventDefault:()=>e.preventDefault()}));window.addEventListener('mousemove',e=>move({clientX:e.clientX,clientY:e.clientY,pointerId:1,preventDefault:()=>{}}));window.addEventListener('mouseup',e=>end({type:'pointerup',clientX:e.clientX,clientY:e.clientY,pointerId:1}));}}
  $('tea-canvas').addEventListener('keydown',e=>{if(state.stage===3&&(e.key===' '||e.key==='Enter')){e.preventDefault();addWhisk(1,300,294);}});
  window.addEventListener('blur',stopInteractions);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInteractions();});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&state.stage===4&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)&&!$('modal').open){e.preventDefault();$('undo-button').click();}});
  if(document.fonts)document.fonts.ready.then(()=>renderer.invalidate(true));
  function updateSoundButtons(){const b=$('sound-music');b.setAttribute('aria-pressed',String(window.TeaSound.prefs.music||window.TeaSound.prefs.effects));b.setAttribute('aria-label',b.getAttribute('aria-pressed')==='true'?'音乐与音效已开启，点击静音':'音乐与音效已静音，点击开启');}
  $('sound-music').onclick=()=>{const enabled=window.TeaSound.prefs.music||window.TeaSound.prefs.effects;['music','effects'].forEach(kind=>{if(window.TeaSound.prefs[kind]===enabled)window.TeaSound.toggle(kind);});updateSoundButtons();};updateSoundButtons();
  document.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('[id^="sound-"]'))window.TeaSound.click();});
  try{const draft=JSON.parse(localStorage.getItem('tea-art-draft-v1')||'null');if(draft&&draft.state&&Array.isArray(draft.state.objects)&&draft.state.stage>=0&&draft.state.stage<=5){Object.assign(state,draft.state);uid=Number(draft.uid)||1;hasStarted=true;localStorage.removeItem('tea-art-draft-v1');}}catch(e){}
  collectionReady=loadCollection();showLanding();requestAnimationFrame(dwellFrame);
})();
