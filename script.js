(async function(){
  'use strict';
  const $ = window.UI.$;
  const esc = window.UI.esc;
  const game = new window.MillionaireGame();
  let settings = window.StorageManager.getSettings();
  let bank = [];
  let audio = new window.AudioEngine();
  let timerId = null;
  let lastQuestionId = null;
  let resultSnapshot = null;
  const icons = ['🦅','🦁','🐺','🐉','🦊','🦈'];
  const colors = ['#3b82f6','#ef4444','#8b5cf6','#22c55e','#f97316','#06b6d4'];
  const presets = {
    million: [100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000],
    compact: [100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000]
  };

  function saveSettings(){
    window.StorageManager.saveSettings(settings);
    audio.setVolume(settings.volume);
    audio.setFlags(settings.sfx, settings.music);
    document.body.classList.toggle('light-mode', !settings.dark);
  }
  function refreshQuestionBank(){
    const imported = window.StorageManager.getImportedQuestions();
    bank = imported && Array.isArray(imported) ? imported : (window.QUESTION_BANK || []);
    const v = game.validateBank(bank);
    if(!v.valid){
      console.error('Question bank validation failed', v.errors);
      UI.toast('تعذر اعتماد قاعدة الأسئلة الحالية.');
      bank = window.QUESTION_BANK || [];
    }
    $('summaryQuestions').textContent = bank.length.toLocaleString('ar-IQ');
    $('questionCountSettings').textContent = bank.length.toLocaleString('ar-IQ') + ' سؤال';
    $('questionSourceLabel').textContent = imported ? 'قاعدة مستوردة' : 'القاعدة المضمنة';
  }
  function navigate(id){
    if(id !== 'screen-game') stopTimer();
    UI.showScreen(id);
    if(id==='screen-settings') renderSettings();
    if(id==='screen-stats') renderStats();
    if(id==='screen-home') updateHomeButtons();
  }
  function updateHomeButtons(){
    $('continueBtn').disabled = !window.StorageManager.getSave();
  }
  function defaultTeams(n){
    return Array.from({length:n},(_,i)=>({id:'team-'+(i+1),name:['الصقور','الأسود','الذئاب','التنانين','الثعالب','القروش'][i]||('الفريق '+(i+1)),icon:icons[i],color:colors[i]}));
  }
  function getSetup(){
    const saved=window.StorageManager.getSetup();
    if(saved && Array.isArray(saved.teams) && saved.teams.length) return saved;
    return {teams:defaultTeams(settings.teamCount)};
  }
  function renderTeams(){
    const setup=getSetup();
    const count=Math.max(2,Math.min(6,Number(settings.teamCount)||2));
    while(setup.teams.length<count) setup.teams.push(defaultTeams(count)[setup.teams.length]);
    setup.teams=setup.teams.slice(0,count);
    window.StorageManager.saveSetup(setup);
    $('teamCount').textContent=count;
    $('setupStatus').textContent=count+' فرق';
    $('summaryTeams').textContent=count;
    $('setTeamCount').value=String(count);
    $('teamEditors').innerHTML=setup.teams.map((t,i)=>\`
      <div class="team-editor" data-team="\${i}">
        <div class="team-editor-head"><div class="avatar-preview" style="background:\${esc(t.color)}18;border-color:\${esc(t.color)}55">\${esc(t.icon)}</div><strong>الفريق \${i+1}</strong></div>
        <div class="team-grid">
          <label class="field"><span>اسم الفريق</span><input data-key="name" type="text" maxlength="24" value="\${esc(t.name)}"></label>
          <label class="field"><span>الأيقونة</span><select data-key="icon">\${icons.map(x=>\`<option \${x===t.icon?'selected':''}>\${x}</option>\`).join('')}</select></label>
          <label class="field"><span>اللون</span><input data-key="color" type="color" value="\${esc(t.color)}"></label>
        </div>
      </div>\`).join('');
    $('teamEditors').querySelectorAll('.team-editor').forEach((row,i)=>{
      row.querySelectorAll('[data-key]').forEach(input=>input.addEventListener('input',()=>{
        const s=getSetup(); const key=input.dataset.key; s.teams[i][key]=input.value; window.StorageManager.saveSetup(s); renderTeamSummaryPreview(s);
      }));
    });
    renderTeamSummaryPreview(setup);
  }
  function renderTeamSummaryPreview(setup){
    $('summaryTeams').textContent=setup.teams.length;
    $('summaryQuestions').textContent=bank.length.toLocaleString('ar-IQ');
    $('summaryTimer').textContent=settings.timer?settings.timer+' ثانية':'بدون مؤقت';
  }
  function renderSettings(){
    $('setTeamCount').value=String(settings.teamCount);
    $('setTimer').value=String(settings.timer);
    $('setDifficulty').value=settings.difficulty;
    $('setMotion').value=settings.motion;
    $('setDark').checked=settings.dark;
    $('setLifelines').checked=settings.lifelines;
    $('setSfx').checked=settings.sfx;
    $('setMusic').checked=settings.music;
    $('setVolume').value=String(settings.volume);
    $('volumeLabel').textContent=settings.volume+'%';
    $('prizePreset').value=settings.prizePreset;
    $('customPrizes').value=settings.prizes.join('\n');
    renderTeamSummaryPreview(getSetup());
  }
  function applyPrizePreset(){
    const p=$('prizePreset').value;
    settings.prizePreset=p;
    if(p==='million'||p==='compact') settings.prizes=[...presets[p]];
    else {
      const nums=$('customPrizes').value.split(/[\n,،]+/).map(x=>Number(String(x).trim())).filter(x=>Number.isFinite(x)&&x>=0);
      if(nums.length>=5) settings.prizes=nums;
      else {UI.toast('السلم المخصص يحتاج 5 قيم على الأقل.'); $('prizePreset').value='million'; settings.prizePreset='million'; settings.prizes=[...presets.million];}
    }
    saveSettings();
    UI.toast('تم حفظ سلم الجوائز.');
  }
  function renderScoreboard(){
    const state=game.snapshot(); if(!state)return;
    const rows=[...state.teams].sort((a,b)=>b.score-a.score);
    $('scoreList').innerHTML=rows.map(t=>\`<div class="score-item \${t.id===game.currentTeam?.id?'active':''}">\${UI.teamAvatar(t)}<div><div class="score-name">\${esc(t.name)}</div><div class="score-sub">المرحلة \${Math.min(t.stage,game.prizeLadder.length)}/\${game.prizeLadder.length} • \${t.correct} صحيحة</div></div><div class="score-points">\${UI.formatPrize(t.score)}</div></div>\`).join('');
    const cur=game.currentTeam?.stage||0;
    $('prizeLadder').innerHTML=game.prizeLadder.map((p,i)=>\`<div class="prize-item \${i===cur?'current ':''}\${game.safeMilestones.includes(i)?'safe':''}"><span>\${i+1}</span><span>\${UI.formatPrize(p)}</span></div>\`).reverse().join('');
  }
  function showQuestion(){
    const q=game.state?.activeQuestion; if(!q)return;
    lastQuestionId=q.id;
    $('turnText').textContent='دور '+game.currentTeam.name;
    $('turnBadge').style.borderColor=game.currentTeam.color+'66';
    $('turnBadge').style.background=game.currentTeam.color+'14';
    $('qCategory').textContent=q.category;
    $('qDifficulty').textContent=window.MillionaireGame.difficultyName(q.difficulty);
    $('questionText').textContent=q.question;
    $('questionCounter').textContent='السؤال '+(game.currentTeam.stage+1)+' / '+game.prizeLadder.length;
    $('remainingText').textContent='متبقي '+Math.max(0,bank.length-game.state.answeredCount);
    $('progressBar').style.width=(Math.min(100,(game.currentTeam.stage/game.prizeLadder.length)*100))+'%';
    $('answersGrid').innerHTML=q.options.map((a,i)=>\`<button class="answer-btn" data-answer="\${i}" \${q.disabled.includes(i)?'disabled':''}><span class="answer-letter">\${window.GameUtils.letters[i]}</span><span>\${esc(a)}</span></button>\`).join('');
    $('answersGrid').querySelectorAll('.answer-btn').forEach(btn=>btn.addEventListener('click',()=>{
      if(game.selectAnswer(Number(btn.dataset.answer))){
        $('answersGrid').querySelectorAll('.answer-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');$('confirmBtn').disabled=false;$('selectedHint').textContent='اضغط «تأكيد الإجابة»';audio.select();
      }
    }));
    $('confirmBtn').disabled=q.selected===null;
    $('selectedHint').textContent=q.selected===null?'اختر إجابة أولًا':'اضغط «تأكيد الإجابة»';
    renderLifelines();
    $('explanationBox').classList.add('hidden');$('explanationBox').textContent='';
    startTimer();renderScoreboard();audio.startQuestion();
  }
  function startTimer(){
    stopTimer(); const limit=Number(settings.timer)||0; const q=game.state?.activeQuestion; if(!q||!limit){$('timerBox').classList.remove('urgent');$('timerValue').textContent=limit?'0':'∞';return;}
    let remaining=typeof q.savedRemaining==='number'?q.savedRemaining:Math.max(0,limit-Math.floor((Date.now()-q.startedAt)/1000));
    delete q.savedRemaining;q.startedAt=Date.now();game.persist();
    const tick=()=>{remaining=Math.max(0,remaining);$('timerValue').textContent=String(remaining);$('timerBox').classList.toggle('urgent',remaining<=8);if(remaining<=5&&remaining>0)audio.timer();if(remaining===0){stopTimer();handleTimeout();return;}remaining--;};
    tick();timerId=setInterval(tick,1000);
  }
  function stopTimer(){if(timerId){clearInterval(timerId);timerId=null}}
  function handleTimeout(){const result=game.timeout();if(!result)return;revealResult(result);setTimeout(afterResolved,1700)}
  function revealResult(result){
    stopTimer();$('confirmBtn').disabled=true;
    $('answersGrid').querySelectorAll('.answer-btn').forEach((btn,i)=>{btn.disabled=true;if(i===result.correctIndex)btn.classList.add('correct');if(result.selected===i&&i!==result.correctIndex)btn.classList.add('wrong')});
    $('explanationBox').textContent=(result.timeout?'انتهى الوقت. ':'')+result.explanation;$('explanationBox').classList.remove('hidden');
    if(result.correct){audio.correct();UI.toast('إجابة صحيحة! +'+UI.formatPrize(result.prize));}else{audio.wrong();UI.toast('الإجابة الصحيحة: '+result.correctText);}
  }
  function afterResolved(){
    resultSnapshot=game.snapshot();
    if(game.currentTeam?.finishReason==='million'){game.finishAll();resultSnapshot=game.snapshot();showResults();return;}
    if(game.state.teams.every(t=>t.finished)){game.finishAll();resultSnapshot=game.snapshot();showResults();return;}
    const prev=game.currentTeam?.id; game.advanceTurn(); if(prev!==game.currentTeam?.id)audio.switchTeam(); showQuestion();
  }
  function renderLifelines(){
    document.querySelectorAll('.life-btn').forEach(btn=>{const used=game.currentTeam?.lifelines?.[btn.dataset.life];btn.classList.toggle('used',!!used);btn.disabled=!!used||!settings.lifelines||!!game.state?.activeQuestion?.locked});
  }
  function useLife(name){
    const res=game.useLifeline(name); if(!res?.ok){UI.toast('وسيلة المساعدة غير متاحة.');return;} audio.lifeline();renderLifelines();
    if(res.swapped){showQuestion();UI.toast('تم تبديل السؤال.');return;}
    if(res.percentages){
      const labels=res.percentages.map((p,i)=>\`\${window.GameUtils.letters[i]}: \${p}%\`).join('<br>'); UI.modalHtml({title:'سؤال الجمهور',html:'توقعات الجمهور:<br>'+labels});
    } else if(res.friend){UI.modalHtml({title:'الاتصال بصديق',html:esc(res.friend)+'<br><small>الثقة: '+esc(res.confidence)+'</small>'});}
    else if(name==='fifty'){showQuestion();UI.toast('تم حذف إجابتين خاطئتين.');}
  }
  function submit(){const r=game.submitAnswer();if(!r)return; revealResult(r); setTimeout(afterResolved,1800)}
  function createGame(){
    if(!bank.length){UI.toast('قاعدة الأسئلة ما زالت تُحمّل، حاول مرة أخرى بعد لحظة.');return;}
    const setup=getSetup(); const teams=setup.teams.map((t,i)=>({id:t.id||'team-'+(i+1),name:t.name.trim()||('الفريق '+(i+1)),icon:t.icon,color:t.color}));
    settings.teamCount=teams.length;saveSettings();game.newGame(teams,settings,bank);window.StorageManager.saveSetup({teams});navigate('screen-game');audio.start();audio.music('think');showQuestion();
  }
  function continueGame(){
    const save=window.StorageManager.getSave();if(!save){UI.toast('لا توجد لعبة محفوظة.');return;}
    if(!game.resume(save,settings,bank)){UI.toast('تعذر استكمال الحفظ.');return}
    navigate('screen-game');audio.resume();audio.music('think');showQuestion();
  }
  function showResults(){
    stopTimer();audio.stopMusic();audio.music('win');audio.win();const state=resultSnapshot||game.snapshot();
    const rows=[...state.teams].sort((a,b)=>b.score-a.score);const best=rows[0];
    $('resultSubtitle').textContent=best?('الفريق الأعلى نتيجة: '+best.name+' — '+UI.formatPrize(best.score)):'انتهت الجولة.';
    $('resultsTable').innerHTML='<table><thead><tr><th>الفريق</th><th>النقاط</th><th>صحيحة</th><th>خاطئة</th><th>أعلى مرحلة</th><th>مضمون</th><th>أفضل سلسلة</th></tr></thead><tbody>'+rows.map(t=>\`<tr><td>\${esc(t.icon+' '+t.name)}</td><td>\${UI.formatPrize(t.score)}</td><td>\${t.correct}</td><td>\${t.wrong}</td><td>\${t.stage}/\${game.prizeLadder.length}</td><td>\${UI.formatPrize(t.lastGuaranteed)}</td><td>\${t.bestStreak}</td></tr>\`).join('')+'</tbody></table>';
    recordFinishedGame(state);window.StorageManager.clearSave();navigate('screen-results');
  }
  function recordFinishedGame(state){
    const stats=window.StorageManager.getStats();stats.games++;stats.questions+=state.answeredCount;const teams=state.teams;stats.correct+=teams.reduce((a,t)=>a+t.correct,0);stats.wrong+=teams.reduce((a,t)=>a+t.wrong,0);stats.highestScore=Math.max(stats.highestScore,...teams.map(t=>t.score),0);const best=[...teams].sort((a,b)=>b.score-a.score)[0];if(best&&best.score>stats.bestScore){stats.bestScore=best.score;stats.bestTeam=best.name}stats.longestStreak=Math.max(stats.longestStreak,...teams.map(t=>t.bestStreak),0);stats.totalAnswerMs+=state.totalQuestionTimeMs;stats.answeredForAvg+=state.answeredCount;stats.lifelines+=teams.reduce((a,t)=>a+Object.values(t.lifelines).filter(Boolean).length,0);window.StorageManager.saveStats(stats);
    const h=window.StorageManager.getHistory();h.unshift({date:new Date().toISOString(),bestTeam:best?.name||'—',score:best?.score||0,questions:state.answeredCount,teams:teams.length});window.StorageManager.saveHistory(h.slice(0,20));
  }
  function renderStats(){
    const s=window.StorageManager.getStats();const avg=s.answeredForAvg?Math.round(s.totalAnswerMs/s.answeredForAvg/1000):0;
    const cards=[['الجولات',s.games],['الأسئلة',s.questions],['إجابات صحيحة',s.correct],['إجابات خاطئة',s.wrong],['أعلى نتيجة',UI.formatPrize(s.highestScore)],['أفضل فريق',esc(s.bestTeam)],['أطول سلسلة',s.longestStreak],['متوسط الإجابة',avg+' ث']];
    $('statsGrid').innerHTML=cards.map(([l,v])=>\`<div class="stat-card"><span class="label">\${l}</span><span class="value">\${v}</span></div>\`).join('');
    const h=window.StorageManager.getHistory();$('historyList').innerHTML=h.length?h.map(x=>\`<div class="recent-row"><strong>\${esc(x.bestTeam)}</strong><span>\${UI.formatPrize(x.score)}</span><span>\${x.questions} سؤال</span><span>\${new Date(x.date).toLocaleDateString('ar-IQ')}</span></div>\`).join(''):'<p class="muted">لا توجد جولات مسجلة بعد.</p>';
  }
  function bind(){
    document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
    $('newGameBtn').onclick=()=>{settings.teamCount=Math.max(2,Math.min(6,settings.teamCount||2));renderTeams();navigate('screen-setup');audio.click()};
    $('continueBtn').onclick=continueGame;$('homeBtn').onclick=()=>navigate('screen-home');
    $('fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
    $('audioBtn').onclick=()=>{const next=!(settings.sfx||settings.music);settings.sfx=next;settings.music=next;saveSettings();UI.toast(next?'تم تشغيل الصوت':'تم كتم الصوت');};
    $('teamMinus').onclick=()=>{settings.teamCount=Math.max(2,settings.teamCount-1);saveSettings();renderTeams()};$('teamPlus').onclick=()=>{settings.teamCount=Math.min(6,settings.teamCount+1);saveSettings();renderTeams()};
    $('setupBack').onclick=()=>navigate('screen-home');$('startGameBtn').onclick=createGame;
    $('setTeamCount').onchange=e=>{settings.teamCount=Number(e.target.value);saveSettings();renderTeams()};
    $('setTimer').onchange=e=>{settings.timer=Number(e.target.value);saveSettings();renderTeams()};$('setDifficulty').onchange=e=>{settings.difficulty=e.target.value;saveSettings()};$('setMotion').onchange=e=>{settings.motion=e.target.value;saveSettings()};
    $('setDark').onchange=e=>{settings.dark=e.target.checked;saveSettings()};$('setLifelines').onchange=e=>{settings.lifelines=e.target.checked;saveSettings();renderLifelines()};$('setSfx').onchange=e=>{settings.sfx=e.target.checked;saveSettings()};$('setMusic').onchange=e=>{settings.music=e.target.checked;saveSettings()};
    $('setVolume').oninput=e=>{settings.volume=Number(e.target.value);$('volumeLabel').textContent=settings.volume+'%';saveSettings()};$('testSoundBtn').onclick=()=>{audio.start();audio.correct()};
    $('prizePreset').onchange=()=>{if($('prizePreset').value!=='custom')applyPrizePreset()};$('customPrizes').onchange=()=>{if($('prizePreset').value==='custom')applyPrizePreset()};
    $('importBtn').onclick=()=>$('questionFile').click();$('questionFile').onchange=handleImport;$('resetQuestionsBtn').onclick=()=>{window.StorageManager.clearImportedQuestions();refreshQuestionBank();renderSettings();UI.toast('تم استرجاع القاعدة الأصلية.');};
    $('resetAllBtn').onclick=()=>UI.confirm({title:'إعادة ضبط كل البيانات',text:'سيتم حذف الحفظ والإحصائيات وسجل النتائج والأسئلة المستوردة من هذا المتصفح.',confirmText:'حذف كل البيانات',onConfirm:()=>{window.StorageManager.resetAll();settings=window.StorageManager.getSettings();refreshQuestionBank();renderTeams();renderStats();updateHomeButtons();UI.toast('تمت إعادة ضبط البيانات.')}});
    $('confirmBtn').onclick=submit;document.querySelectorAll('.life-btn').forEach(b=>b.onclick=()=>useLife(b.dataset.life));$('quitGameBtn').onclick=()=>UI.confirm({title:'إنهاء الجولة',text:'سيُسجّل دور الفريق الحالي كمنسحب ويُحتفظ بآخر مبلغ مضمون له.',confirmText:'إنهاء',onConfirm:()=>{game.quitCurrentTeam();audio.lose();afterResolved();}});
    $('newRoundBtn').onclick=()=>{renderTeams();navigate('screen-setup')};$('replayBtn').onclick=()=>createGame();$('clearHistoryBtn').onclick=()=>UI.confirm({title:'مسح السجل',text:'سيتم حذف سجل الجولات فقط، دون حذف الإعدادات.',confirmText:'مسح',onConfirm:()=>{window.StorageManager.clearHistory();renderStats();UI.toast('تم مسح السجل.')}});
    window.addEventListener('beforeunload',()=>{if(game.state?.status==='playing'&&game.state.activeQuestion){const limit=Number(settings.timer)||0;if(limit){const left=Math.max(0,limit-Math.floor((Date.now()-game.state.activeQuestion.startedAt)/1000));game.state.activeQuestion.savedRemaining=left}game.persist()}});
  }
  function handleImport(e){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const arr=JSON.parse(reader.result);if(!Array.isArray(arr))throw new Error('not-array');const cleaned=arr.map((q,i)=>({...q,id:q.id??('import-'+(i+1)),answer:Number(q.answer),prize:Number(q.prize||0),explanation:q.explanation||''}));const v=game.validateBank(cleaned);if(!v.valid){UI.modalHtml({title:'الملف غير صالح',html:esc(v.errors.slice(0,8).join('<br>'))});return;}window.StorageManager.saveImportedQuestions(cleaned);refreshQuestionBank();renderSettings();UI.toast('تم استيراد '+cleaned.length+' سؤال.');}catch(err){UI.modalHtml({title:'تعذر قراءة الملف',html:'تأكد أن الملف JSON صحيح ومهيأ كمصفوفة أسئلة.'})}};reader.readAsText(f,'utf-8');e.target.value='';}
  bind();
  navigate('screen-home');
  (async()=>{
    try{
      await window.QUESTIONS_READY;
      refreshQuestionBank();saveSettings();renderTeams();renderSettings();renderStats();updateHomeButtons();
      if(window.location.protocol!=='file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=20260918-2').catch(()=>{});
    }catch(err){
      console.error('Question bank initialization failed',err);
      updateHomeButtons();
      UI.toast('تعذر تحميل قاعدة الأسئلة. جرّب تحديث الصفحة.');
    }
  })();
})();