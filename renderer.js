(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const ELEMENTS = ['熊猫','猫咪','小兔','小狗','海豹','小鸟','开心','困困','发呆','加油','比心','委屈','玫瑰','雏菊','爱心','星星','闪光','脚印','花瓣','梅','竹','兰','山','月','鸟','云','荷','松','舟','鱼','瀑','蝶','石'];
  const BOWLS = [
    { name: '建窑黑釉盏', short: '建窑 · 兔毫', note: '点茶常用 · 黑釉衬雪沫', description: '宋代点茶、斗茶尤其推重建窑黑釉盏，深色釉面便于映衬白色汤花。', colors: ['#171d1a', '#514c35', '#8c7850', '#252b22'], accent: '#968158' },
    { name: '汝窑天青盏', short: '汝窑 · 天青', note: '宋瓷审美 · 数字演绎', description: '天青釉是宋瓷经典审美；但古籍论斗茶更推重黑盏，此处作为器物审美分支呈现。', colors: ['#7a9f96', '#bed2c4', '#d6ded0', '#83a59b'], accent: '#527f73' },
    { name: '定窑白瓷盏', short: '定窑 · 刻花', note: '宋瓷审美 · 数字演绎', description: '定窑白瓷素净雅致；斗茶讲究观察白色汤花，古籍所重仍以黑盏为主。', colors: ['#d6d0be', '#eee7d8', '#fbf9ef', '#c8c1af'], accent: '#a89977' }
  ];
  const TEAS = [
    { name: '龙团凤饼', note: '北苑贡茶 · 数字演绎', description: '龙团凤饼是宋代北苑贡茶名物。本体验以柔白茶沫作视觉演绎，并非历史实物色泽复原。', dark: '#6f5931', foam: '#eee9d7', powder: '#a18c4e', ink: '#745235', bleed: 1 },
    { name: '小龙团', note: '北苑名品 · 数字演绎', description: '小龙团与蔡襄监制北苑贡茶密切相关。本体验借“青白”审美作数字化表现。', dark: '#596341', foam: '#dce2c5', powder: '#7f8950', ink: '#685133', bleed: 1.15 },
    { name: '玉叶长春', note: '宣和贡茶名目 · 数字演绎', description: '“玉叶长春”见《宣和北苑贡茶录》。本体验中的绿色仅为视觉分支，不代表其历史茶汤颜色。', dark: '#436044', foam: '#b7cba1', powder: '#65864b', ink: '#5d4d30', bleed: 1.35 }
  ];
  function random(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function circle(c,x,y,r,fill) { c.beginPath(); c.arc(x,y,r,0,TAU); if(fill){c.fillStyle=fill;c.fill();} }
  function radial(c,x,y,r,stops,x0=x,y0=y,r0=0) { const g=c.createRadialGradient(x0,y0,r0,x,y,r); stops.forEach(([p,color])=>g.addColorStop(p,color)); return g; }
  function mix(a,b,p){const ca=a.match(/\w\w/g).map(n=>parseInt(n,16)),cb=b.match(/\w\w/g).map(n=>parseInt(n,16));return '#'+ca.map((v,i)=>Math.round(v+(cb[i]-v)*p).toString(16).padStart(2,'0')).join('');}
  function surface(c){circle(c,300,294,219);c.clip();}
  function createCanvas(){const el=document.createElement('canvas');el.width=900;el.height=900;const c=el.getContext('2d');c.scale(1.5,1.5);return {el,c};}

  // Raster alpha blur works in iOS WebViews which do not implement Canvas filter.
  function wetLayer(source,radius,ink){
    const w=source.width,h=source.height,data=source.getContext('2d').getImageData(0,0,w,h).data;
    const temp=new Float32Array(w*h),out=document.createElement('canvas');out.width=w;out.height=h;
    const ctx=out.getContext('2d'),pixels=ctx.createImageData(w,h),rgb=ink.match(/\w\w/g).map(x=>parseInt(x,16)),span=radius*2+1;
    for(let y=0;y<h;y++){let sum=0;for(let k=-radius;k<=radius;k++)sum+=data[(y*w+Math.max(0,Math.min(w-1,k)))*4+3];for(let x=0;x<w;x++){temp[y*w+x]=sum/span;sum+=data[(y*w+Math.min(w-1,x+radius+1))*4+3]-data[(y*w+Math.max(0,x-radius))*4+3];}}
    for(let x=0;x<w;x++){let sum=0;for(let k=-radius;k<=radius;k++)sum+=temp[Math.max(0,Math.min(h-1,k))*w+x];for(let y=0;y<h;y++){const i=(y*w+x)*4;pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];pixels.data[i+3]=sum/span;sum+=temp[Math.min(h-1,y+radius+1)*w+x]-temp[Math.max(0,y-radius)*w+x];}}
    ctx.putImageData(pixels,0,0);return out;
  }

  class TeaRenderer {
    constructor(canvas,state){this.canvas=canvas;this.c=canvas.getContext('2d');this.state=state;this.bowls=[];this.foams=[];this.powders=[];this.art=createCanvas();this.artDirty=true;this.ripples=[];this.needRender=true;this.tick=this.tick.bind(this);this.raf=requestAnimationFrame(this.tick);this.atlas=new Image();this.assetsReady=new Promise(resolve=>{this.atlas.onload=()=>{this.atlasReady=true;this.elementTextures=new Map();this.invalidate(true);resolve();};this.atlas.onerror=()=>{this.atlasFailed=true;resolve();};});this.atlas.src='assets/tea-atlas.png';this.pandaAtlas=new Image();const pandaReady=new Promise(resolve=>{this.pandaAtlas.onload=()=>{this.pandaReady=true;this.elementTextures=new Map();this.invalidate(true);resolve();};this.pandaAtlas.onerror=()=>resolve();});this.pandaAtlas.src='assets/panda-bamboo.png';this.assetsReady=Promise.all([this.assetsReady,pandaReady]);}
    invalidate(art=false){this.needRender=true;if(art)this.artDirty=true;}
    bowl(index){
      if(this.bowls[index])return this.bowls[index];
      const {el,c}=createCanvas(),b=BOWLS[index],rng=random(532+index*97);
      c.save();c.shadowColor='rgba(75,65,46,0.20392)';c.shadowBlur=30;c.shadowOffsetY=20;circle(c,304,318,246,'rgba(174,170,150,0.12549)');c.restore();
      const body=radial(c,300,306,258,[[0,b.colors[1]],[.91,b.colors[0]],[.963,b.colors[1]],[1,b.colors[0]]],284,277);
      circle(c,300,307,255,body);
      circle(c,300,298,255,radial(c,300,298,255,[[0,b.colors[0]],[.69,b.colors[0]],[.85,b.colors[1]],[.954,b.colors[3]],[.974,b.colors[2]],[.991,b.colors[1]],[1,b.colors[0]]],282,272,10));
      c.save();circle(c,300,298,248);c.clip();
      // Kiln glaze: deterministic grain is baked once, never regenerated during interaction.
      for(let i=0;i<21500;i++){let x=rng()*510+45,y=rng()*510+43,d=Math.hypot(x-300,y-298);if(d>249)continue;const alpha=index===0?.06+rng()*.13:.03+rng()*.09;c.fillStyle=rng()>.5?`rgba(255,247,213,${alpha})`:`rgba(32,35,24,${alpha})`;c.fillRect(x,y,rng()*1.7+.3,rng()*1.3+.2);}
      if(index===0){
        for(let i=0;i<920;i++){const a=rng()*TAU,r1=174+rng()*65,r2=235+rng()*14,curve=(rng()-.5)*.037;
          c.beginPath();c.moveTo(300+Math.cos(a)*r1,298+Math.sin(a)*r1);c.quadraticCurveTo(300+Math.cos(a+curve)*(r1+r2)/2,298+Math.sin(a+curve)*(r1+r2)/2,300+Math.cos(a+curve*.6)*r2,298+Math.sin(a+curve*.6)*r2);c.strokeStyle=`rgba(194,156,84,${.07+rng()*.29})`;c.lineWidth=.25+rng()*1.05;c.stroke();
        }
        circle(c,300,293,204,radial(c,300,293,204,[[0,'rgba(18,28,24,0.6)'],[.78,'rgba(23,34,29,0.2)'],[1,'rgba(16,32,25,0.0)']]));
      } else if(index===1){
        for(let i=0;i<135;i++){let x=45+rng()*510,y=45+rng()*510;c.beginPath();c.moveTo(x,y);for(let j=0;j<4;j++){x+=(rng()-.5)*45;y+=8+rng()*18;c.lineTo(x,y);}c.strokeStyle=`rgba(50,90,79,${.06+rng()*.08})`;c.lineWidth=.5;c.stroke();}
      } else {
        c.save();c.translate(300,298);
        for(let i=0;i<12;i++){c.rotate(TAU/12);c.beginPath();c.moveTo(0,90);c.bezierCurveTo(-51,129,-37,203,0,238);c.bezierCurveTo(37,203,51,129,0,90);c.strokeStyle='rgba(155,139,106,0.12549)';c.lineWidth=1.3;c.stroke();c.translate(-1,-1);c.strokeStyle='rgba(255,255,238,0.2902)';c.stroke();c.translate(1,1);c.beginPath();c.moveTo(0,104);c.quadraticCurveTo(8,181,0,224);c.strokeStyle='rgba(171,158,124,0.1451)';c.lineWidth=.8;c.stroke();}c.restore();
      }
      // Concave interior, bright lip and off-center reflections give the vessel depth.
      circle(c,300,298,246,radial(c,300,298,246,[[0,'rgba(0,0,0,0.0)'],[.71,'rgba(0,0,0,0.0)'],[.92,index===0?'rgba(6,12,16,0.25098)':'rgba(67,71,53,0.18824)'],[.975,'rgba(6,12,16,0.06275)'],[1,'rgba(0,0,0,0.0)']]));
      c.restore();
      c.beginPath();c.arc(300,298,251,3.3,5.68);c.strokeStyle=index===0?'rgba(219,197,154,0.45882)':'rgba(255,255,235,0.78824)';c.lineWidth=2.3;c.stroke();
      c.beginPath();c.arc(300,298,249,.4,2.58);c.strokeStyle=index===0?'rgba(197,183,136,0.16078)':'rgba(255,254,240,0.4)';c.lineWidth=1.6;c.stroke();
      c.save();c.filter='blur(5px)';c.beginPath();c.arc(300,298,235,3.69,4.95);c.strokeStyle=index===0?'rgba(214,221,212,0.10588)':'rgba(255,255,238,0.31765)';c.lineWidth=7;c.stroke();c.restore();
      this.bowls[index]=el;return el;
    }
    foam(index){
      if(this.foams[index])return this.foams[index];
      const {el,c}=createCanvas(),rng=random(71+index),tea=TEAS[index];
      circle(c,300,294,219,radial(c,300,294,219,[[0,mix(tea.foam,'#ffffff',.12)],[.65,tea.foam],[.94,mix(tea.foam,tea.dark,.06)],[1,mix(tea.foam,tea.dark,.24)]],260,253));
      c.save();surface(c);
      for(let i=0;i<11000;i++){const a=rng()*TAU,d=Math.sqrt(rng())*221,x=300+Math.cos(a)*d,y=294+Math.sin(a)*d,r=rng()*.75+.12;circle(c,x,y,r,rng()>.55?'rgba(255,255,237,0.27059)':'rgba(87,92,51,0.06275)');}
      for(let i=0;i<900;i++){const a=rng()*TAU,d=199+rng()*19,r=.4+rng()*1.4;circle(c,300+Math.cos(a)*d,294+Math.sin(a)*d,r,'rgba(255,255,238,0.33725)');c.strokeStyle='rgba(78,93,56,0.12941)';c.lineWidth=.3;c.stroke();}
      const sheen=c.createRadialGradient(241,212,8,256,232,158);sheen.addColorStop(0,'rgba(255,255,245,.18)');sheen.addColorStop(1,'rgba(255,255,245,0)');c.fillStyle=sheen;c.fillRect(80,74,440,440);c.restore();this.foams[index]=el;return el;
    }
    drawPowder(c,index,mini=false){if(!this.powders[index]){const cached=createCanvas();this.makePowder(cached.c,index);this.powders[index]=cached.el;}c.drawImage(this.powders[index],0,mini?-10:0,600,600);}
    makePowder(c,index,mini=false){
      const rng=random(44),tea=TEAS[index];c.save();if(mini)c.translate(0,-10);
      c.save();c.shadowColor='rgba(51,41,18,0.31373)';c.shadowBlur=12;c.shadowOffsetY=5;circle(c,300,302,62,radial(c,300,302,67,[[0,tea.powder],[.55,tea.powder],[1,mix(tea.powder,'#38331f',.2)]],286,280));c.restore();
      for(let i=0;i<3600;i++){const a=rng()*TAU,d=Math.sqrt(rng())*72,x=300+Math.cos(a)*d,y=302+Math.sin(a)*d*.84,r=rng()*1.4+.2;circle(c,x,y,r,rng()>.6?mix(tea.powder,'#ecdfa0',rng()*.42):mix(tea.powder,'#333924',rng()*.25));}
      for(let i=0;i<65;i++){const a=rng()*TAU,d=73+rng()*22;circle(c,300+Math.cos(a)*d,302+Math.sin(a)*d*.8,rng()*1.2+.2,tea.powder);}c.restore();
    }
    drawSurface(c,stage,now){
      const s=this.state,tea=TEAS[s.tea];
      if(stage===0)return;
      if(stage===1){this.drawPowder(c,s.tea);return;}
      const p=stage===2?0:Math.min(1,s.whisk/1000), water=stage===2?Math.max(.04,s.water):.4;
      c.save();surface(c);
      if(stage===2){
        const r=112+Math.min(1,water/.4)*107;
        circle(c,300,294,r,radial(c,300,294,r,[[0,mix(tea.dark,'#acb67e',.1)],[.72,tea.dark],[1,mix(tea.dark,'#20281f',.3)]],264,250));
        c.save();c.globalAlpha=Math.max(0,1-water/.17);this.drawPowder(c,s.tea);c.restore();
        c.beginPath();c.ellipse(267,268,r*.62,r*.48,-.45,3.6,4.6);c.strokeStyle='rgba(224,223,182,0.14902)';c.lineWidth=4;c.stroke();
      } else {
        circle(c,300,294,219,tea.dark);
        c.globalAlpha=Math.pow(p,.72);c.drawImage(this.foam(s.tea),0,0,600,600);c.globalAlpha=1;
        if(p>0&&p<1){const rng=random(104);for(let i=0;i<160*p;i++){const a=rng()*TAU,d=Math.sqrt(rng())*205;circle(c,300+Math.cos(a)*d,294+Math.sin(a)*d,1+rng()*3,'rgba('+tea.foam.slice(1).match(/../g).map(x=>parseInt(x,16)).join(',')+',0.6)');}}
      }
      if(stage>=4){if(this.artDirty)this.rebuildArt(now);c.drawImage(this.art.el,0,0,600,600);}
      this.ripples=this.ripples.filter(r=>now-r.time<1050);
      for(const r of this.ripples){const t=(now-r.time)/1050;c.beginPath();c.ellipse(r.x,r.y,10+t*83,5+t*44,0,0,TAU);c.strokeStyle=`rgba(246,247,211,${(1-t)*.55})`;c.lineWidth=.6;c.stroke();}
      c.restore();
      if(stage>=3){c.beginPath();c.arc(300,294,219,0,TAU);c.strokeStyle='rgba(21,27,34,0.15686)';c.lineWidth=2;c.stroke();}
    }
    drawStroke(c,object,now){
      const points=object.points;if(!points.length)return;const tea=Object.assign({},TEAS[this.state.tea],{ink:object.color||TEAS[this.state.tea].ink});
      const bleed=object.ended?Math.min(1,(now-object.ended)/450):0;
      const brush=object.brush,base=brush==='fine'?2.2:brush==='wash'?13:8;
      c.save();if(object.x!==undefined){const b=this.objectBounds(object);c.translate(object.x,object.y);c.rotate((object.rotation||0)*Math.PI/180);c.scale(object.scale||1,object.scale||1);c.translate(-b.x,-b.y);}c.lineCap='round';c.lineJoin='round';c.strokeStyle=tea.ink;c.fillStyle=tea.ink;
      for(let pass=0;pass<2;pass++){
        c.shadowColor=tea.ink;c.shadowBlur=pass===0?(brush==='wash'?7:3)+bleed*tea.bleed:0;
        for(let i=0;i<points.length;i++){
          const p=points[i],prev=points[Math.max(0,i-1)],strength=p.strength||.6;
          c.globalAlpha=(brush==='wash'?.12:brush==='fine'?.37:.54)*(pass===0?.22:.7)*(.4+strength*.6);
          c.lineWidth=base*(brush==='fine'?1:.63+strength*.57)+(pass===0?2+bleed*2:0);
          if(i===0||Math.hypot(p.x-prev.x,p.y-prev.y)<.3){circle(c,p.x,p.y,c.lineWidth/2,tea.ink);}else{c.beginPath();c.moveTo(prev.x,prev.y);c.lineTo(p.x,p.y);c.stroke();}
        }
      }c.restore();
    }
    elementPath(c,type){
      const rng=random(33);c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';
      const path=(pts,width=1.8)=>{c.lineWidth=width;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();};
      const leaf=(x,y,a,len=25)=>{c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-7,-len*.5,0,-len);c.quadraticCurveTo(4,-len*.5,0,0);c.fill();c.restore();};
      // Small authored line drawings: a coherent silhouette, with the same wet pigment as strokes.
      const curve=d=>{c.stroke(new Path2D(d));};
      const solid=d=>{c.fill(new Path2D(d));};
      const oval=(x,y,rx,ry,angle=0,fill=false)=>{c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);fill?c.fill():c.stroke();};
      const heart=(x,y,k=1)=>{c.save();c.translate(x,y);c.scale(k,k);curve('M0 12 C-25 -2 -17 -22 0 -9 C17 -22 25 -2 0 12');c.restore();};
      const face=(x,y,k=1)=>{c.save();c.translate(x,y);c.scale(k,k);oval(-10,0,1.5,2,0,true);oval(10,0,1.5,2,0,true);curve('M-4 8 Q0 13 4 8');c.restore();};
      if(type==='熊猫'){
        oval(-29,-43,12,13,-.4,true);oval(24,-45,11,12,.3,true);
        curve('M-40 -34 C-53 -3 -34 18 -4 18 C30 20 46 0 36 -29 C27 -54 -21 -58 -40 -34');
        oval(-19,-15,8,11,.4,true);oval(17,-17,8,11,-.35,true);oval(-1,-3,4,2.7,0,true);curve('M-1 0 L-1 5 M-1 5 Q-8 11 -13 4 M-1 5 Q5 10 10 3');
        curve('M-29 15 C-50 35 -41 66 -11 70 C17 76 39 59 25 30');
        oval(-29,61,15,9,.25,true);oval(18,65,15,9,-.2,true);
        curve('M12 25 C27 17 53 20 52 28 C49 38 24 42 8 37');
        curve('M-26 23 C-34 31 -31 43 -17 41');
        c.save();c.globalAlpha*=.8;path([[41,70],[44,26],[46,-17],[52,-69]],2.4);
        [-43,-13,20,49].forEach(y=>path([[42,y],[50,y-1]],1.3));leaf(49,-35,-.8,25);leaf(50,-38,.9,31);leaf(48,-3,1.1,23);leaf(46,2,-.8,20);leaf(53,-61,.9,21);c.restore();
      }
      if(type==='猫咪'){
        curve('M-61 -7 L-59 -43 Q-43 -38 -37 -31 Q-21 -38 -10 -29 L4 -40 L7 -9 C8 16 -9 27 -30 25 C-52 28 -65 14 -61 -7');
        curve('M2 -8 L8 -34 L24 -24 Q41 -30 47 -19 L65 -27 L63 0 C69 29 41 34 22 26');
        curve('M-55 20 C-69 46 -55 67 -25 65 Q-4 70 6 51 M58 26 C72 54 46 74 19 64 C-2 65 -12 45 2 33 Q14 25 24 37');
        curve('M-41 52 Q-70 37 -67 54 Q-65 70 -42 64 M-5 38 Q5 45 18 41');
        curve('M-48 -7 Q-42 -2 -37 -8 M-24 -8 Q-18 -2 -13 -9 M-34 4 Q-30 10 -26 3 M20 0 Q25 7 30 1 M42 2 Q48 8 53 2 M33 13 Q37 18 41 12');
        path([[-57,1],[-72,-2]],1);path([[-56,7],[-73,9]],1);path([[57,12],[73,10]],1);heart(3,-62,.55);
      }
      if(type==='小兔'){
        curve('M-29 -17 C-53 -75 -25 -86 -15 -29 C-7 -81 20 -84 10 -23 C48 -10 44 23 19 29 C34 50 21 68 -10 65 C-44 67 -47 45 -29 25 C-49 12 -48 -7 -29 -17');
        face(-5,3);curve('M-26 41 Q-12 50 -24 57 M17 42 Q3 48 17 56');oval(31,49,10,9);
      }
      if(type==='小狗'){
        curve('M-30 -29 C-10 -49 20 -46 33 -23 C48 4 26 30 -2 29 C-33 29 -48 2 -30 -29');
        curve('M-31 -29 C-67 -43 -64 13 -43 9 Q-37 7 -34 -9 M30 -28 C62 -40 64 11 45 12 Q38 10 34 -4');
        face(0,-1);oval(0,7,5,3,0,true);curve('M-23 28 C-36 58 -15 66 8 63 C33 66 37 44 23 29 M-12 44 L-12 61 M13 45 L14 61 M32 48 Q58 36 48 23');
      }
      if(type==='海豹'){
        curve('M-66 47 C-29 32 -48 -39 -8 -43 C24 -48 32 -21 35 0 C39 26 59 30 70 28 Q65 42 48 44 Q67 51 62 59 C47 66 34 49 25 49 C-4 63 -47 66 -66 47');face(-4,-18);curve('M-13 20 Q-41 39 -17 41 M-22 -8 L-39 -13 M-22 -3 L-40 -2 M13 -8 L26 -13');
      }
      if(type==='小鸟'){
        curve('M-47 30 C-58 -12 -31 -44 -3 -35 C19 -32 27 -7 29 4 L58 -3 Q52 36 24 43 C-1 57 -33 49 -47 30');oval(-18,-13,2,2,0,true);path([[-37,-7],[-55,0],[-37,5]]);curve('M-7 7 C14 -8 24 19 2 28 Q-11 22 -7 7');path([[-18,47],[-20,60],[-30,62]]);path([[6,48],[10,60],[20,59]]);
      }
      if(['开心','困困','发呆','加油','比心','委屈'].includes(type)){
        curve('M-46 -21 C-32 -55 28 -54 46 -22 C69 16 37 51 1 50 C-38 53 -66 15 -46 -21');
        if(type==='困困'){curve('M-29 -4 Q-20 3 -12 -4 M12 -4 Q21 3 29 -4');oval(0,19,5,3);path([[35,-54],[51,-54],[35,-40],[51,-40]],1.5);}
        if(type==='开心'||type==='加油'){curve('M-30 -1 Q-23 -14 -15 -2 M14 -2 Q23 -14 31 -2 M-18 13 Q0 23 18 13 Q9 41 -7 30 Z');}
        if(type==='发呆'){oval(-19,-3,2,3,0,true);oval(19,-3,2,3,0,true);oval(0,19,4,6);}
        if(type==='委屈'){curve('M-31 -14 L-14 -8 M14 -8 L31 -14 M-8 23 Q0 15 8 23');oval(-21,0,2,3,0,true);oval(21,0,2,3,0,true);curve('M29 8 Q39 25 29 24 Q20 25 29 8');}
        if(type==='比心'){face(0,-4);heart(-38,36,.7);heart(39,30,.7);}
        if(type==='加油'){curve('M-46 16 Q-70 15 -65 -4 L-59 -6 M46 16 Q70 15 64 -4 L59 -6');}
      }
      if(type==='玫瑰'){
        curve('M-3 -35 C-20 -54 -42 -23 -20 -10 C-44 -4 -17 28 1 14 C18 27 44 -7 25 -14 C43 -44 7 -52 -3 -35 M-3 -35 Q-26 -26 -5 -13 Q19 -5 20 -25 Q2 -40 -9 -22 Q0 -10 7 -25 M-18 -8 Q0 12 25 -14 M0 17 Q-11 37 -1 70 M-4 46 Q-37 44 -36 25 Q-17 22 -4 46 M-3 56 Q24 50 28 30 Q4 31 -3 56');
      }
      if(type==='雏菊'){
        for(let i=0;i<10;i++){c.save();c.translate(0,-17);c.rotate(i*TAU/10);oval(0,-21,6,14);c.restore();}oval(0,-17,10,10);curve('M0 20 Q-8 47 0 69');leaf(-2,48,-.9,27);leaf(-2,60,1.2,24);
      }
      if(type==='爱心'){heart(0,0,3);}
      if(type==='星星'){path([[0,-51],[14,-14],[53,-10],[24,15],[31,52],[0,32],[-32,50],[-25,14],[-54,-10],[-15,-14],[0,-51]],2.2);}
      if(type==='闪光'){curve('M0 -62 Q9 -4 43 0 Q8 8 0 59 Q-9 8 -43 0 Q-9 -8 0 -62');c.save();c.translate(49,-39);c.scale(.3,.3);curve('M0 -40 Q5 -5 30 0 Q5 5 0 40 Q-5 5 -30 0 Q-5 -5 0 -40');c.restore();}
      if(type==='脚印'){oval(0,18,25,20,.1,true);[[-29,-8],[-12,-28],[10,-30],[30,-9]].forEach(([x,y])=>oval(x,y,8,12,x/60,true));}
      if(type==='花瓣'){for(let i=0;i<5;i++){c.save();c.rotate(i*TAU/5);curve('M0 -4 C-35 -24 -13 -58 0 -42 C15 -56 34 -22 0 -4');c.restore();}oval(0,0,4,4);}
      if(type==='月'){c.save();c.lineWidth=1.2;c.beginPath();c.arc(0,0,43,-1.08,1.08,true);c.bezierCurveTo(-27,26,-27,-26,Math.cos(-1.08)*43,Math.sin(-1.08)*43);c.closePath();c.save();c.globalAlpha*=.32;c.fill();c.restore();c.stroke();c.restore();}
      if(type==='山'){
        for(const [dx,dy,size,alpha] of [[28,-15,.75,.16],[-25,5,.8,.23],[0,17,1,.42]]){c.save();c.translate(dx,dy);c.scale(size,size);c.globalAlpha*=alpha;c.beginPath();c.moveTo(-70,30);c.bezierCurveTo(-49,11,-30,-41,-18,-32);c.bezierCurveTo(-5,-66,2,-62,15,-32);c.bezierCurveTo(34,-11,41,-5,68,30);c.quadraticCurveTo(0,45,-70,30);c.fill();c.globalAlpha=Math.min(1,c.globalAlpha*1.9);c.beginPath();c.moveTo(-67,29);c.bezierCurveTo(-45,9,-32,-40,-18,-32);c.bezierCurveTo(-5,-66,2,-62,15,-32);c.bezierCurveTo(34,-11,43,-4,67,30);c.lineWidth=1.3;c.stroke();c.restore();}
      }
      if(type==='鸟'){path([[-49,-7],[-31,-20],[-17,-14],[0,7],[14,-13],[30,-18],[49,-5]],3);path([[-14,29],[0,23],[11,34],[24,25],[36,28]],1.4);}
      if(type==='云'){c.beginPath();c.moveTo(-57,20);c.bezierCurveTo(-92,-4,-52,-29,-32,-12);c.bezierCurveTo(-39,-55,20,-61,21,-27);c.bezierCurveTo(61,-44,66,-4,40,0);c.bezierCurveTo(85,0,83,28,40,27);c.bezierCurveTo(3,25,-22,39,-54,29);c.stroke();path([[-31,6],[3,2],[24,10]],1);}
      if(type==='竹'){path([[-22,64],[-19,18],[-17,-29],[-12,-69]],3);path([[18,67],[20,26],[15,-16],[24,-50]],2);[-30,0,28].forEach(y=>{path([[-23,y],[-12,y-1]],3);path([[-18,y],[-51,y-24]],1);leaf(-32,y-11,-.6,23);leaf(-44,y-21,-1,27);leaf(-40,y-16,-2.1,24);leaf(-19,y,.85,25);leaf(-11,y-7,1.2,28);leaf(-7,y-7,2.1,24);});leaf(18,-13,-.6,28);leaf(19,8,1.1,29);leaf(32,-3,1.6,23);}
      if(type==='梅'){path([[-49,65],[-25,26],[-21,-5],[17,-32],[40,-70]],4);path([[-24,23],[7,12],[33,21],[61,9]],2);path([[-18,-5],[-37,-30],[-34,-53]],2);path([[16,-32],[50,-34]],1);[[40,-60],[16,-33],[-32,-39],[-20,10],[31,21],[52,7],[48,-32]].forEach(([x,y])=>{for(let i=0;i<5;i++){let a=TAU*i/5;circle(c,x+Math.cos(a)*6,y+Math.sin(a)*6,4);c.lineWidth=1;c.stroke();}circle(c,x,y,1.6,c.fillStyle);});}
      if(type==='兰'){for(let i=0;i<7;i++){c.beginPath();c.moveTo(-5,55);let x=(i-3)*23;c.quadraticCurveTo(x*.3,-61+rng()*40,x,-43+rng()*41);c.quadraticCurveTo(x*.2,-22,-5,55);c.fill();}path([[-4,50],[13,-3],[31,-27]],1.2);[[31,-27],[13,-3],[-26,-10]].forEach(([x,y])=>{for(let j=0;j<4;j++)leaf(x,y,j*1.8,13);});}
      if(type==='荷'){
        c.beginPath();c.moveTo(-4,66);c.bezierCurveTo(1,24,-9,11,-2,-19);c.stroke();c.beginPath();c.moveTo(4,57);c.quadraticCurveTo(35,29,39,10);c.stroke();
        for(const [a,x] of [[-.8,-15],[-.4,-8],[0,0],[.4,8],[.8,15]]){c.save();c.translate(x,-20);c.rotate(a);c.beginPath();c.moveTo(0,13);c.bezierCurveTo(-18,-3,-17,-24,0,-39);c.bezierCurveTo(17,-24,18,-3,0,13);c.globalAlpha*=.32;c.fill();c.globalAlpha*=2;c.lineWidth=.9;c.stroke();c.restore();}
        c.save();c.translate(37,17);c.scale(1,.43);c.beginPath();c.arc(0,0,34,.2,Math.PI*2-.2);c.lineTo(0,0);c.closePath();c.globalAlpha*=.4;c.fill();c.globalAlpha*=1.8;c.lineWidth=.7;for(let i=0;i<10;i++){const a=i*.6;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*31,Math.sin(a)*31);c.stroke();}c.restore();
      }
      if(type==='松'){
        path([[-16,66],[-8,37],[-14,13],[-7,-20],[1,-57]],5);path([[-11,27],[20,7],[48,6]],2);path([[-12,8],[-33,-5],[-51,-6]],2);path([[-8,-15],[13,-28],[36,-25]],2);path([[-1,-42],[-22,-49]],1.5);
        for(const [x,y] of [[-49,-7],[45,3],[29,-27],[-21,-47],[3,-59]]){for(let i=0;i<16;i++){const a=Math.PI+i/15*Math.PI;path([[x,y],[x+Math.cos(a)*19,y+Math.sin(a)*14]],.85);}}
      }
      if(type==='舟'){
        c.beginPath();c.moveTo(-70,19);c.quadraticCurveTo(-5,37,70,12);c.quadraticCurveTo(23,57,-46,40);c.closePath();c.save();c.globalAlpha*=.4;c.fill();c.restore();c.lineWidth=1.5;c.stroke();
        c.beginPath();c.moveTo(-37,23);c.bezierCurveTo(-34,-23,17,-26,27,25);c.stroke();c.save();c.globalAlpha*=.22;c.fill();c.restore();path([[7,-63],[6,25]],2);path([[10,-56],[43,-7],[11,-2]],1.4);c.save();c.globalAlpha*=.15;c.fill();c.restore();path([[-60,51],[-9,54],[29,51]],.7);
      }
      if(type==='鱼'){
        for(const [x,y,a,k]of[[-17,-12,-.6,1],[28,30,2.4,.65]]){c.save();c.translate(x,y);c.rotate(a);c.scale(k,k);c.beginPath();c.moveTo(-34,0);c.bezierCurveTo(-8,-25,32,-20,39,0);c.bezierCurveTo(27,17,-5,23,-34,0);c.globalAlpha*=.42;c.fill();c.globalAlpha*=1.8;c.lineWidth=.8;c.stroke();c.beginPath();c.moveTo(-32,0);c.quadraticCurveTo(-53,-28,-59,-20);c.quadraticCurveTo(-47,0,-59,20);c.quadraticCurveTo(-46,24,-32,0);c.fill();circle(c,28,-4,1.4,c.fillStyle);c.beginPath();c.moveTo(18,-12);c.quadraticCurveTo(12,0,19,12);c.stroke();c.restore();}
      }
      if(type==='瀑'){
        c.save();c.globalAlpha*=.25;c.beginPath();c.moveTo(-53,59);c.lineTo(-58,-40);c.quadraticCurveTo(-22,-71,-12,-48);c.lineTo(-15,46);c.closePath();c.fill();c.beginPath();c.moveTo(13,-48);c.quadraticCurveTo(32,-64,53,-35);c.lineTo(62,57);c.lineTo(17,40);c.fill();c.restore();path([[-53,56],[-50,-35],[-31,-53],[-13,-47]],2);path([[13,-47],[31,-53],[47,-32],[57,54]],2);
        for(let i=0;i<5;i++){c.save();c.globalAlpha*=.22+i*.045;c.beginPath();c.moveTo(-10+i*5,-45);c.bezierCurveTo(-18+i*6,-10,11-i*3,19,-12+i*6,53);c.lineWidth=.8;c.stroke();c.restore();}c.beginPath();c.ellipse(0,61,40,7,0,0,TAU);c.globalAlpha*=.3;c.stroke();
      }
      if(type==='蜻蜓'){c.lineWidth=1.4;c.beginPath();c.moveTo(0,-34);c.quadraticCurveTo(5,10,0,60);c.stroke();circle(c,0,-37,4,c.fillStyle);for(const side of [-1,1]){c.save();c.scale(side,1);for(const y of [-18,3]){c.beginPath();c.moveTo(1,y);c.bezierCurveTo(30,y-32,79,y-15,63,y+1);c.quadraticCurveTo(30,y+12,1,y+3);c.globalAlpha=.25;c.fill();c.globalAlpha=.7;c.stroke();}c.restore();}}
      if(type==='蝶'){
        for(const direction of [-1,1]){c.save();c.scale(direction,1);c.beginPath();c.moveTo(0,-6);c.bezierCurveTo(42,-69,74,-46,52,-6);c.quadraticCurveTo(47,5,8,8);c.bezierCurveTo(56,3,54,55,23,47);c.quadraticCurveTo(3,33,0,7);c.globalAlpha*=.34;c.fill();c.globalAlpha*=2;c.lineWidth=1;c.stroke();c.beginPath();c.moveTo(3,0);c.quadraticCurveTo(24,-29,48,-35);c.moveTo(4,8);c.lineTo(29,32);c.stroke();c.restore();}path([[0,-16],[1,27]],3);c.beginPath();c.moveTo(0,-15);c.quadraticCurveTo(-6,-34,-15,-31);c.moveTo(1,-15);c.quadraticCurveTo(8,-34,15,-31);c.lineWidth=1;c.stroke();
      }
      if(type==='石'){
        for(const [x,y,k]of[[-22,0,1],[29,29,.65]]){c.save();c.translate(x,y);c.scale(k,k);c.beginPath();c.moveTo(-42,34);c.bezierCurveTo(-42,3,-27,-51,-7,-45);c.bezierCurveTo(7,-37,8,-22,28,-13);c.bezierCurveTo(45,10,42,32,32,40);c.quadraticCurveTo(-5,51,-42,34);c.globalAlpha*=.3;c.fill();c.globalAlpha*=2;c.lineWidth=1.5;c.stroke();path([[-23,23],[-18,-17],[-7,-34],[3,-20]],1);for(let i=0;i<13;i++)circle(c,-27+rng()*49,16+rng()*19,1+rng(),c.fillStyle);c.restore();}
      }
    }
    animalPath(c,type){
      if(['墨熊猫','花狸','垂耳犬','闻草兔','趴趴猫','探头狗'].indexOf(type)<0)return false;
      const ink=c.fillStyle;const shape=(d,alpha=1,line=false)=>{c.save();c.globalAlpha=alpha;const p=new Path2D(d);line?c.stroke(p):c.fill(p);c.restore();};
      const oval=(x,y,rx,ry,alpha=1,angle=0)=>{c.save();c.globalAlpha=alpha;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();c.restore();};
      c.lineWidth=1.4;c.lineCap='round';c.lineJoin='round';
      if(type==='墨熊猫'){
        oval(-12,31,41,45,.24,-.2);oval(-34,-43,14,15,.92,-.2);oval(27,-45,14,15,.95,.2);
        shape('M-44 -23 C-47 -61 34 -62 40 -22 C50 9 29 27 -7 22 C-40 26 -52 4 -44 -23',.26);
        oval(-23,-15,10,16,.84,.4);oval(18,-16,10,15,.89,-.4);c.save();c.globalCompositeOperation='destination-out';oval(-21,-18,4.5,5,.9);oval(17,-19,4.5,5,.9);c.restore();oval(-21,-18,2,2.6,1);oval(17,-19,2,2.6,1);oval(0,1,6,4,.98);
        shape('M0 4 Q-1 13 -9 10 M0 4 Q4 11 10 7',.8,true);
        shape('M-37 16 Q-66 33 -39 57 Q-27 57 -16 39 Q7 40 33 22 Q46 10 38 3 Q31 1 20 13 Q-2 30 -23 19Z',.9);
        oval(-27,66,17,12,.87,-.3);oval(21,62,14,16,.86,.3);shape('M27 37 Q56 30 53 47 Q48 60 35 55Z',.83);
      }else if(type==='花狸'||type==='趴趴猫'){
        if(type==='趴趴猫'){c.translate(0,16);c.scale(1.12,.73);}
        shape('M-34 11 C-76 48 -36 80 3 72 C42 64 38 25 16 8Z',.18);
        shape('M-33 8 L-41 -44 L-13 -27 Q2 -35 16 -28 L44 -47 L35 -1 Q21 29 -5 28 Q-22 24 -33 8Z',.2);
        shape('M-35 -36 L-20 -25 L-34 -16 Z M36 -36 L20 -23 L31 -12Z',.66);
        shape('M-38 41 Q-60 23 -70 42 Q-79 68 -48 76 Q-23 81 -6 64',.62,true);c.save();c.lineWidth=8;shape('M-49 69 Q-70 65 -67 45',.67,true);c.restore();
        oval(-29,38,13,9,.63,-.5);oval(-13,54,13,9,.58,.2);oval(13,42,10,17,.62,.2);
        shape('M-15 -24 L-7 -8 L-2 -27 M5 -28 L8 -10 L14 -28',.75,true);
        oval(-15,-4,4,5,.95,.2);oval(18,-9,4,5,.95,-.2);shape('M0 2 L7 0 L4 6 Z',.92);shape('M4 6 Q0 15 -6 11 M4 6 Q10 11 14 6 M-20 7 L-46 3 M-20 12 L-43 16 M23 0 L50 -7 M24 5 L49 7',.7,true);
      }else if(type==='垂耳犬'||type==='探头狗'){
        if(type!=='探头狗'){oval(0,40,28,33,.19);oval(-20,68,14,8,.6);oval(21,68,14,8,.6);shape('M25 44 Q63 49 56 23',.8,true);}
        oval(0,-12,37,35,.2);shape('M-27 -35 C-63 -67 -72 3 -49 16 Q-31 23 -29 -14Z M27 -35 C60 -60 70 4 48 18 Q31 17 30 -16Z',.78);
        oval(-14,-13,4,5,.95);oval(15,-13,4,5,.95);oval(0,3,7,5,.98);shape('M0 8 Q-11 21 -19 11 M0 8 Q11 21 19 11',.8,true);oval(0,23,5,7,.35);
        if(type!=='探头狗'){shape('M-23 35 Q-10 46 10 34 M22 35 Q8 48 -3 42',.75,true);}
      }else{
        oval(-10,40,38,32,.18);oval(32,51,13,12,.15);shape('M-26 -10 Q-70 -69 -44 -79 Q-26 -78 -12 -25 Q-11 -88 10 -79 Q21 -65 8 -20Z',.28);
        oval(-10,-3,33,29,.18);oval(-33,-51,5,20,.33,-.45);oval(0,-52,4,20,.32,.1);oval(-23,-4,3,4,.94);oval(7,-6,3,4,.94);oval(-8,6,4,3,.85);shape('M-8 9 Q-6 17 0 13 M-8 9 Q-14 18 -19 12',.8,true);oval(-29,61,15,7,.25);oval(5,63,13,7,.3);
      }
      // Fine broken pigment creates soft fur instead of a uniform vector fill.
      c.save();c.globalCompositeOperation='source-atop';const rng=random(813+type.length*19);for(let i=0;i<850;i++){c.globalAlpha=.1+rng()*.16;c.beginPath();const x=rng()*150-75,y=rng()*165-85;c.moveTo(x,y);c.lineTo(x+(rng()-.5)*2,y+1+rng()*3);c.stroke();}c.restore();c.fillStyle=ink;return true;
    }
    scenePath(c,type){
      const paths={
        '清荷':['M0 50 Q5 12 0 -15','M0 -10 Q-40 -18 -37 -44 Q-9 -45 0 -10 Q-9 -51 6 -66 Q29 -47 0 -10 Q28 -45 44 -33 Q40 -9 0 -10','M-3 20 Q-28 4 -31 22'],
        '团叶':['M-4 1 C-75 -65 -76 52 -4 38 C70 63 79 -45 7 -34 Z','M-4 1 L-52 14 M-4 1 L-33 -20 M-4 1 L35 -19 M-4 1 L45 24 M-4 1 Q10 39 4 68'],
        '游鱼':['M-35 0 Q0 -24 34 0 Q0 25 -35 0 M34 0 L58 -20 L51 2 L60 20 Z','M-14 -13 Q-3 0 -14 14 M-4 10 L9 26'],
        '水纹':['M-78 2 Q-30 -6 20 0 Q45 4 78 -1','M-49 15 Q-6 10 38 15','M-25 -15 Q5 -19 55 -13'],
        '折枝':['M-65 72 Q-38 20 40 -39 L72 -64','M-32 27 Q-57 -8 -44 -55 M0 -7 Q40 8 66 -5 M28 -30 L21 -67'],
        '花叶':['M0 0 Q-22 -40 -30 -12 Q-52 10 -17 16 Q-17 48 8 23 Q38 40 29 6 Q57 -14 24 -21 Q15 -48 0 0','M-32 43 Q-72 12 -63 -2 Q-26 9 -32 43'],
        '栖鸟':['M-30 6 Q-36 -30 -9 -24 Q8 -40 22 -17 Q48 5 12 26 Q-12 36 -30 6 Z','M-22 7 Q-3 -12 16 17 M20 -13 L40 -9 L24 -4 M-23 19 L-58 42 L-36 13 M2 28 L0 45 M12 28 L15 43'],
        '落瓣':['M-35 -33 Q-14 -36 -24 -12 Q-41 -13 -35 -33','M20 9 Q41 4 32 28 Q18 27 20 9','M-7 50 Q4 37 12 54'],
        '轻舟':['M-67 19 Q-5 35 64 7 Q36 42 -16 42 Q-41 38 -67 19','M-7 24 L-7 -60 M-7 -57 Q13 -21 40 9 L-5 7','M-48 21 Q-36 -3 -17 20'],
        '芦苇':['M0 73 Q-6 -11 -26 -61 M-4 67 Q14 3 38 -49 M-6 45 L-47 1 M2 32 L48 -4','M-26 -62 L-37 -44 M-26 -62 L-18 -44 M38 -49 L27 -33 M38 -49 L45 -27'],
        '远岸':['M-85 22 Q-61 18 -39 8 Q-20 -4 0 11 Q24 -1 45 11 Q66 16 84 16','M-80 32 Q-6 25 82 29']
      };if(!paths[type])return false;c.lineWidth=1.7;c.lineCap='round';c.lineJoin='round';c.globalAlpha=.72;paths[type].forEach((d,i)=>{const p=new Path2D(d);if(i===0&&['团叶','栖鸟','花叶','游鱼'].indexOf(type)>=0){c.save();c.globalAlpha=.16;c.fill(p);c.restore();}c.stroke(p);});return true;
    }
    objectBounds(o){if(o.kind==='stroke'){const xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y),minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);return{x:(minX+maxX)/2,y:(minY+maxY)/2,w:Math.max(16,maxX-minX+18),h:Math.max(16,maxY-minY+18)};}return{x:o.x,y:o.y,w:o.kind==='text'?(o.direction==='vertical'?68:Math.max(60,Array.from(o.text).length*55)):170,h:o.kind==='text'?(o.direction==='vertical'?Math.max(60,Array.from(o.text).length*55):68):170};}
    atlasTexture(type,ink){const cells={'墨熊猫':0,'花狸':1,'闻草兔':2,'锦鲤':3,'竹':4,'花枝':5,'芳草':6,'水草':7};const pandaCell={'团团熊猫':0,'清竹':1}[type],special=pandaCell!==undefined;if(special?!this.pandaReady:cells[type]===undefined||!this.atlasReady)return null;const source=special?this.pandaAtlas:this.atlas,cols=special?2:4,rows=special?1:2,tile=special?pandaCell:cells[type],canvas=document.createElement('canvas');canvas.width=canvas.height=320;const c=canvas.getContext('2d'),w=source.naturalWidth/cols,h=source.naturalHeight/rows;c.drawImage(source,tile%cols*w,Math.floor(tile/cols)*h,w,h,0,0,320,320);const pixels=c.getImageData(0,0,320,320),rgb=ink.match(/\w\w/g).map(x=>parseInt(x,16));for(let i=0;i<pixels.data.length;i+=4){const lum=(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];pixels.data[i+3]*=special?Math.pow(1-lum,1.15):1-lum*.88;}c.putImageData(pixels,0,0);return canvas;}
    elementTexture(type,color){
      if(!this.elementTextures)this.elementTextures=new Map();const ink=color||TEAS[this.state.tea].ink,key=ink+type;if(this.elementTextures.has(key))return this.elementTextures.get(key);const atlas=this.atlasTexture(type,ink);if(atlas){this.elementTextures.set(key,atlas);return atlas;}
      const raw=document.createElement('canvas');raw.width=raw.height=320;const r=raw.getContext('2d');r.translate(160,160);r.scale(1.6,1.6);r.fillStyle=r.strokeStyle=ink;r.save();if(!this.animalPath(r,type)&&!this.scenePath(r,type))this.elementPath(r,type);r.restore();
      const out=document.createElement('canvas');out.width=out.height=320;const c=out.getContext('2d');
      // A diffuse wet edge, a soft body and a mottled pigment layer share one shape.
      for(const [radius,alpha]of[[5,.22],[2,.3],[1,.84]]){c.save();c.globalAlpha=alpha;c.drawImage(wetLayer(raw,radius,ink),0,0);c.restore();}
      const rng=random(412+ELEMENTS.indexOf(type)*113);c.globalCompositeOperation='destination-out';
      for(let i=0;i<150;i++){const x=rng()*320,y=rng()*320,radius=3+rng()*15,g=c.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,`rgba(0,0,0,${.12+rng()*.25})`);g.addColorStop(1,'rgba(0,0,0,0)');circle(c,x,y,radius,g);}
      for(let i=0;i<5000;i++)circle(c,rng()*320,rng()*320,.25+rng()*.8,'rgba(0,0,0,0.22)');
      c.globalCompositeOperation='source-over';this.elementTextures.set(key,out);return out;
    }
    elementThumbnail(canvas,type){canvas.width=canvas.height=160;const c=canvas.getContext('2d');c.drawImage(this.elementTexture(type),0,0,160,160);}
    drawObject(c,o,now){c.save();c.translate(o.x,o.y);c.rotate(o.rotation*Math.PI/180);c.scale(o.scale,o.scale);c.strokeStyle=o.color||TEAS[this.state.tea].ink;c.fillStyle=o.color||TEAS[this.state.tea].ink;c.globalAlpha=.78;if(o.kind==='text'){c.shadowBlur=1.8;c.shadowColor=o.color||TEAS[this.state.tea].ink;c.font='55px TeaScript, "Kaiti SC", serif';c.textAlign='center';c.textBaseline='middle';if(o.direction==='vertical'){[...o.text].forEach((char,i)=>c.fillText(char,0,(i-([...o.text].length-1)/2)*55));}else c.fillText(o.text,0,0);}else{const wet=o.createdAt?Math.max(0,Math.min(1,(now-o.createdAt)/480)):1;const size=197+3*wet;c.globalAlpha=.94;c.drawImage(this.elementTexture(o.element,o.color),-size/2,-size/2,size,size);}c.restore();}
    rebuildArt(now){const c=this.art.c;c.clearRect(0,0,600,600);for(const o of this.state.objects){if(o.kind==='stroke')this.drawStroke(c,o,now);else this.drawObject(c,o,now);}this.artDirty=false;}
    selection(c){const o=this.state.objects.find(o=>o.id===this.state.selected);if(!o)return;const b=this.objectBounds(o),scale=o.scale||1;c.save();c.translate(o.x===undefined?b.x:o.x,o.y===undefined?b.y:o.y);c.rotate((o.rotation||0)*Math.PI/180);c.scale(scale,scale);c.strokeStyle='rgba(155,74,52,.8)';c.lineWidth=1/scale;c.setLineDash([4,5]);c.strokeRect(-b.w/2,-b.h/2,b.w,b.h);c.setLineDash([]);circle(c,b.w/2,b.h/2,7/scale,'#f4efe8');c.strokeRect(b.w/2-5/scale,b.h/2-5/scale,10/scale,10/scale);c.restore();}
    draw(c,stage,now,selection=true){c.clearRect(0,0,600,600);c.drawImage(this.bowl(this.state.bowl),0,0,600,600);this.drawSurface(c,stage,now);if(selection&&stage===4)this.selection(c);}
    ripple(x=305,y=294){this.ripples.push({x,y,time:performance.now()});this.invalidate();}
    tick(now){const s=this.state;const bleeding=s.objects.some(o=>(o.ended&&now-o.ended<470)||(o.kind==='element'&&o.createdAt&&now-o.createdAt<500));if(bleeding)this.artDirty=true;if(this.needRender||bleeding||this.ripples.length){this.c.setTransform(1.5,0,0,1.5,0,0);this.draw(this.c,s.stage,now);this.needRender=false;}this.raf=requestAnimationFrame(this.tick);}
    thumbnail(canvas,index,type){const c=canvas.getContext('2d');canvas.width=180;canvas.height=180;c.scale(.3,.3);if(type==='bowl')c.drawImage(this.bowl(index),0,0,600,600);else{c.drawImage(this.bowl(2),0,0,600,600);c.save();c.translate(300,300);c.scale(2.2,2.2);c.translate(-300,-300);this.drawPowder(c,index,true);c.restore();}}
    exportBowl(){const {el,c}=createCanvas();this.artDirty=true;this.draw(c,5,performance.now()+1000,false);return el;}
  }
  window.TeaArt={TeaRenderer,BOWLS,TEAS,ELEMENTS,random,circle};
})();
