'use strict';
(() => {
  const el=id=>document.getElementById(id), screen=el('screen'), ctx=screen.getContext('2d');
  const buttons=[['ArrowLeft','←'],['ArrowUp','↑'],['ArrowDown','↓'],['ArrowRight','→'],['ShiftLeft','ダッシュ'],['KeyB','ロープ']];
  const codes=new Set([...buttons.map(b=>b[0]),'ShiftRight','Space','KeyW','KeyA','KeyS','KeyD']);
  const active=new Map();
  let phase='intro',startGame,scene,update,last=0,sound=false,audio;
  function text(id,value){if(el(id).textContent!==value)el(id).textContent=value;}
  function press(source,code,button){
    if(phase!=='play'||active.has(source))return;
    if(![...active.values()].some(v=>v.code===code))scene.key(code,true);
    active.set(source,{code,button});button?.classList.add('active');
  }
  function release(source){
    const entry=active.get(source);if(!entry)return;
    active.delete(source);
    if(![...active.values()].some(v=>v.code===entry.code)){
      scene.key(entry.code,false);entry.button?.classList.remove('active');
    }
  }
  function releaseAll(){for(const source of [...active.keys()])release(source);for(const b of el('keys').children)b.classList.remove('active');}
  function overlay(next,title,detail,action){
    releaseAll();phase=next;text('result',title);text('detail',detail);text('again',action);
    el('overlay').hidden=false;el('again').focus({preventScroll:true});
  }
  function resume(){phase='play';last=0;el('overlay').hidden=true;screen.focus({preventScroll:true});}
  function pause(){if(phase==='play')overlay('pause','一時停止',el('message').textContent,'つづける');}
  el('back').onclick=()=>{phase='intro';el('play').hidden=true;el('intro').hidden=false;el('start').focus();};
  el('start').onclick=()=>{document.querySelector('video').pause();startGame();};
  el('again').onclick=()=>phase==='pause'?resume():startGame();
  el('pause').onclick=pause;
  el('sound').onclick=()=>{
    sound=!sound;el('sound').setAttribute('aria-pressed',String(sound));text('sound',sound?'音 ON':'音 OFF');
    if(sound){audio??=new AudioContext();audio.resume();}
  };
  for(const [code,label] of buttons){
    const b=document.createElement('button');b.textContent=label;
    b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(e.pointerId,code,b);};
    b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>release(e.pointerId);
    b.onclick=e=>{if(!e.detail&&phase==='play'){scene.key(code,true);scene.key(code,false);}};
    el('keys').appendChild(b);
  }
  addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.code==='Escape'&&(phase==='play'||phase==='pause')){if(!e.repeat){phase==='play'?pause():resume();}return;}
    if(phase!=='play'||!codes.has(e.code)||(e.code==='Space'&&e.target.closest('button,summary,a')))return;
    e.preventDefault();if(!e.repeat)press(e.code,e.code);
  });
  addEventListener('keyup',e=>release(e.code));
  screen.onpointerdown=e=>{
    if(phase!=='play')return;
    const box=screen.getBoundingClientRect();
    scene.pointer((e.clientX-box.left)*480/box.width,(e.clientY-box.top)*300/box.height,true);
    screen.focus({preventScroll:true});
  };
  addEventListener('blur',pause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  function frame(now){
    if(phase==='play'){
      const elapsed=last?(now-last)/1000:0,dt=Math.min(.08,elapsed);
      const steps=Math.max(1,Math.ceil(dt*60));last=now;
      for(let i=0;i<steps&&phase==='play';i++)update(dt/steps,elapsed/steps);
      scene.draw(ctx);
    }
    requestAnimationFrame(frame);
  }
  window.PearlUI={
    ready(callback){startGame=callback;el('start').disabled=false;text('start','ブラウザで遊ぶ');},
    play(game,tick){scene=game;update=tick;el('intro').hidden=true;el('play').hidden=false;resume();scene.draw(ctx);},
    message(value){text('message',value);},
    hud(planning,time,score,cargo,air,dash){
      text('phase',planning?'作戦時間':'残り時間');text('time',Math.ceil(time)+' 秒');
      text('score',score+' 点');text('cargo',cargo+' 点分');text('air',Math.ceil(air)+' 秒分');
      text('air-label',dash?'空気（ダッシュ中）':'空気');
    },
    finish(score,cargo){overlay('result','船に届けた真珠　'+score+' 点',cargo?'時間切れで運搬中の '+cargo+' 点分は海へ。':'すべての運搬を終えました。','もう一度潜る');},
    tone(hz,duration){
      if(!sound||!audio)return;
      const note=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
      note.frequency.value=hz;gain.gain.setValueAtTime(.05,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
      note.connect(gain);gain.connect(audio.destination);note.start(t);note.stop(t+duration);
    }
  };
  requestAnimationFrame(frame);
})();
