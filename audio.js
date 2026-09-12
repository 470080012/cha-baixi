/* Locally composed pentatonic ambience; no media request or third-party recording. */
(function(){
  'use strict';
  var context,master,musicGain,effectGain,timer,flow,lastWhisk=0,started=false,sequence=0,waterBuffers={};
  var prefs={music:true,effects:true};
  try{var saved=JSON.parse(localStorage.getItem('tea-audio-v1')||'null');if(saved){prefs.music=saved.music!==false;prefs.effects=saved.effects!==false;}}catch(e){}
  function persist(){try{localStorage.setItem('tea-audio-v1',JSON.stringify(prefs));}catch(e){}}
  function init(){if(context)return true;var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;try{context=new Audio();master=context.createGain();master.gain.value=.65;master.connect(context.destination);musicGain=context.createGain();musicGain.gain.value=prefs.music?.22:0;musicGain.connect(master);effectGain=context.createGain();effectGain.gain.value=prefs.effects?.72:0;effectGain.connect(master);return true;}catch(e){return false;}}
  function tone(freq,at,duration,volume,bus){var o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(bus);o.start(at);o.stop(at+duration+.03);o.onended=function(){o.disconnect();g.disconnect();};}
  function phrase(){if(!context||context.state!=='running'||!prefs.music||document.hidden)return;var melody=[[0,4,7,9],[7,4,2,0],[9,7,4,2],[4,7,12,9]][sequence++%4],t=context.currentTime+.03;melody.forEach(function(n,i){var f=196*Math.pow(2,n/12);tone(f,t+i*1.4,2.8,.28,musicGain);tone(f*2,t+i*1.4,1.1,.045,musicGain);});tone(98,t,5,.14,musicGain);}
  function schedule(){clearInterval(timer);if(started&&prefs.music&&!document.hidden){phrase();timer=setInterval(phrase,6200);}}
  function resume(){if(!init())return false;if(context.state==='suspended')context.resume().then(schedule).catch(function(){});else schedule();return true;}
  function start(){started=true;return resume();}
  function click(){if(!prefs.effects||document.hidden||!init())return;if(context.state==='suspended')context.resume().catch(function(){});tone(700,context.currentTime,.07,.11,effectGain);tone(1040,context.currentTime+.012,.06,.035,effectGain);}
  function wakeEffects(){if(!prefs.effects||document.hidden||!init())return false;if(context.state!=='running')context.resume().catch(function(){});return true;}
  function stopFlow(){if(!flow)return;try{flow.source.stop();}catch(e){}flow.source.disconnect();flow.gain.disconnect();flow=null;}
  // Damped bubble resonances and small impacts: moving liquid instead of continuous hiss.
  function waterBuffer(kind){
    if(waterBuffers[kind])return waterBuffers[kind];
    var duration=kind==='pour'?2.7:.25,rate=context.sampleRate,buffer=context.createBuffer(1,Math.floor(rate*duration),rate),data=buffer.getChannelData(0),count=kind==='pour'?120:13;
    var seed=kind==='pour'?381:721;function rand(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
    for(var n=0;n<count;n++){
      var begin=Math.floor(rand()*(duration-.065)*rate),length=Math.floor((.025+rand()*.07)*rate),f=260+rand()*1350,amp=(.022+rand()*.12)*(kind==='pour'?1:1.7),phase=0;
      for(var j=0;j<length&&begin+j<data.length;j++){var t=j/rate,env=(1-Math.exp(-t*1500))*Math.exp(-t*(48+f/40));phase+=2*Math.PI*f*(1+.65*t/.08)/rate;data[begin+j]+=Math.sin(phase)*env*amp;}
    }
    var brown=0;
    for(var i=0;i<data.length;i++){brown=(brown+(rand()*2-1)*.015)/1.06;var t=i/rate,envelope=kind==='pour'?(.6+.4*Math.sin(t*4.7)*Math.sin(t*8.1)):Math.sin(Math.PI*i/data.length);data[i]=(data[i]+brown*.3)*envelope;}
    // Soft loop boundary / attack and release avoids clicks on touches.
    var fade=Math.floor(rate*.014);for(var k=0;k<fade;k++){data[k]*=k/fade;data[data.length-1-k]*=k/fade;}
    waterBuffers[kind]=buffer;return buffer;
  }
  function pour(){if(!wakeEffects())return;stopFlow();var source=context.createBufferSource(),gain=context.createGain();source.buffer=waterBuffer('pour');source.loop=true;gain.gain.value=1.6;source.connect(gain);gain.connect(effectGain);source.start();flow={source:source,gain:gain};}
  function whisk(){if(!wakeEffects()||context.currentTime-lastWhisk<.09)return;lastWhisk=context.currentTime;var source=context.createBufferSource(),gain=context.createGain();source.buffer=waterBuffer('whisk');source.playbackRate.value=.8+Math.random()*.4;gain.gain.value=1.6;source.connect(gain);gain.connect(effectGain);source.start();source.onended=function(){source.disconnect();gain.disconnect();};}
  function toggle(kind){prefs[kind]=!prefs[kind];persist();if(init()){musicGain.gain.value=prefs.music?.22:0;effectGain.gain.value=prefs.effects?.72:0;}if(!prefs.effects)stopFlow();if(kind==='music'){if(prefs.music){started=true;resume();}else clearInterval(timer);}return prefs[kind];}
  document.addEventListener('visibilitychange',function(){if(document.hidden){clearInterval(timer);stopFlow();if(context)context.suspend().catch(function(){});}else if(started)resume();});
  window.TeaSound={start:start,click:click,pour:pour,stop:stopFlow,whisk:whisk,toggle:toggle,prefs:prefs,supported:!!(window.AudioContext||window.webkitAudioContext)};
})();
