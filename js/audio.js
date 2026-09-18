(function(){
  class AudioEngine{
    constructor(){this.ctx=null;this.master=null;this.sfxGain=null;this.musicGain=null;this.musicTimer=null;this.step=0;this.enabledSfx=true;this.enabledMusic=true;this.volume=.65;this.mode='menu'}
    ensure(){if(this.ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.master=this.ctx.createGain();this.sfxGain=this.ctx.createGain();this.musicGain=this.ctx.createGain();this.master.gain.value=1;this.sfxGain.gain.value=.75;this.musicGain.gain.value=.35;this.sfxGain.connect(this.master);this.musicGain.connect(this.master);this.master.connect(this.ctx.destination)}
    resume(){this.ensure();if(this.ctx?.state==='suspended')this.ctx.resume();}
    setVolume(v){this.volume=Math.max(0,Math.min(1,Number(v)/100));if(this.master)this.master.gain.value=this.volume}
    setFlags(sfx,music){this.enabledSfx=!!sfx;this.enabledMusic=!!music}
    tone(freq,dur,type='sine',gain=.1,when=0){if(!this.enabledSfx)return;this.resume();if(!this.ctx)return;const t=this.ctx.currentTime+when,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(this.sfxGain);o.start(t);o.stop(t+dur+.03)}
    click(){this.tone(520,.07,'square',.045);}
    select(){this.tone(300,.06,'triangle',.08);this.tone(520,.09,'triangle',.05,.055)}
    confirm(){this.tone(380,.08,'square',.07);this.tone(760,.15,'triangle',.08,.08)}
    correct(){[660,880,1047].forEach((f,i)=>this.tone(f,.18,'sine',.08,i*.06))}
    wrong(){[260,180,120].forEach((f,i)=>this.tone(f,.2,'sawtooth',.06,i*.08))}
    timer(){this.tone(880,.07,'square',.055);}
    lifeline(){[523,659,784].forEach((f,i)=>this.tone(f,.12,'triangle',.06,i*.07))}
    switchTeam(){[392,523].forEach((f,i)=>this.tone(f,.16,'sine',.07,i*.1))}
    win(){[523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.28,'triangle',.08,i*.1))}
    lose(){[440,330,220].forEach((f,i)=>this.tone(f,.35,'sine',.06,i*.12))}
    start(){[392,523,659,784].forEach((f,i)=>this.tone(f,.2,'triangle',.07,i*.08))}
    startQuestion(){this.tone(420,.08,'sine',.04);this.tone(620,.15,'sine',.05,.09)}
    stopMusic(){if(this.musicTimer){clearInterval(this.musicTimer);this.musicTimer=null}}
    music(mode='menu'){this.mode=mode;this.stopMusic();if(!this.enabledMusic)return;this.resume();if(!this.ctx)return;const patterns={menu:[261.63,329.63,392,523.25,392,329.63],think:[220,277.18,329.63,369.99,329.63,277.18],tension:[196,233.08,261.63,311.13,261.63,233.08],win:[523.25,659.25,783.99,1046.5]};const p=patterns[mode]||patterns.menu;let i=0;const tick=()=>{if(!this.enabledMusic||!this.ctx)return;const f=p[i%p.length],t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.028,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.42);o.connect(g);g.connect(this.musicGain);o.start(t);o.stop(t+.44);i++};tick();this.musicTimer=setInterval(tick,440)}
  }
  window.AudioEngine=AudioEngine;
})();