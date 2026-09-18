(function(){
  const letters=['A','B','C','D'];
  const difficultyMap=['easy','easy','easy','medium','medium','medium','medium','hard','hard','hard','hard','very-hard','very-hard','very-hard','very-hard'];
  const difficultyNames={easy:'سهل',medium:'متوسط',hard:'صعب','very-hard':'صعب جدًا'};
  const defaultPrizes=[100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000];
  const deep=o=>JSON.parse(JSON.stringify(o));
  const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
  function safeId(t){return String(t.id)}

  class MillionaireGame{
    constructor(){this.state=null;this.bank=[];this.settings=null}
    configure(settings,bank){this.settings=deep(settings||{});this.bank=Array.isArray(bank)?bank:[]}
    newGame(teams,settings,bank){
      this.configure(settings,bank); const now=Date.now();
      this.state={version:4,status:'playing',startedAt:now,elapsedBefore:0,turnIndex:0,round:1,answeredCount:0,totalQuestionTimeMs:0,activeQuestion:null,teams:teams.map((t,i)=>({id:t.id||`team-${i+1}`,name:t.name||`الفريق ${i+1}`,icon:t.icon||['🦅','🦁','🐺','🐉','🦊','🦈'][i%6],color:t.color||['#3b82f6','#ef4444','#8b5cf6','#22c55e','#f97316','#06b6d4'][i%6],stage:0,score:0,lastGuaranteed:0,correct:0,wrong:0,streak:0,bestStreak:0,answeredMs:0,lifelines:{fifty:false,poll:false,friend:false,swap:false},seen:[],finished:false,finishReason:null}))};
      this.loadQuestion(); this.persist(); return this.snapshot();
    }
    resume(save,settings,bank){if(!save||!save.teams?.length)return false;this.configure(settings,bank);this.state=deep(save);if(!this.state.activeQuestion)this.loadQuestion();return this.snapshot()}
    snapshot(){return deep(this.state)}
    get currentTeam(){return this.state?.teams?.[this.state.turnIndex]||null}
    get prizeLadder(){return (this.settings?.prizes?.length?this.settings.prizes:defaultPrizes)}
    get currentPrize(){return this.prizeLadder[Math.min(this.currentTeam?.stage||0,this.prizeLadder.length-1)]||0}
    get safeMilestones(){const n=this.prizeLadder.length;return [Math.max(0,Math.min(n-1,Math.floor(n*.33))),Math.max(0,Math.min(n-1,Math.floor(n*.66)))]}
    difficultyForStage(stage){
      if(this.settings?.difficulty==='mixed')return ['easy','medium','hard','very-hard'][Math.floor(Math.random()*4)];
      if(this.settings?.difficulty==='challenge')return difficultyMap[Math.min(14,Math.max(0,stage+2))];
      return difficultyMap[Math.min(14,Math.max(0,stage))];
    }
    pickQuestion(team,excludeId){
      const seen=new Set(team.seen||[]); let target=this.difficultyForStage(team.stage);
      let pool=this.bank.filter(q=>!seen.has(q.id)&&q.difficulty===target&&q.id!==excludeId);
      if(pool.length<1)pool=this.bank.filter(q=>!seen.has(q.id)&&q.id!==excludeId);
      if(pool.length<1){team.seen=[];pool=this.bank.filter(q=>q.id!==excludeId)}
      if(pool.length<1)pool=this.bank.slice();
      return pool[Math.floor(Math.random()*pool.length)];
    }
    prepare(raw){
      const pairs=raw.options.map((text,i)=>({text,originalIndex:i}));
      const mixed=shuffle(pairs); const answerIndex=mixed.findIndex(x=>x.originalIndex===raw.answer);
      return {id:raw.id,question:raw.question,category:raw.category,difficulty:raw.difficulty,explanation:raw.explanation||`الإجابة الصحيحة هي: ${raw.options[raw.answer]}.`,options:mixed.map(x=>x.text),correctIndex:answerIndex,originalAnswer:raw.options[raw.answer],disabled:[],selected:null,locked:false,startedAt:Date.now(),usedSwap:false};
    }
    loadQuestion(excludeId){
      if(!this.state||this.state.status!=='playing')return null;
      const t=this.currentTeam;if(!t||t.finished)return this.advanceTurn();
      const raw=this.pickQuestion(t,excludeId);if(!raw){this.finishAll();return null}
      t.seen=t.seen||[];if(!t.seen.includes(raw.id))t.seen.push(raw.id);
      this.state.activeQuestion=this.prepare(raw);this.persist();return this.state.activeQuestion;
    }
    selectAnswer(index){
      const q=this.state?.activeQuestion;if(!q||q.locked||q.disabled.includes(index))return false;q.selected=index;this.persist();return true
    }
    submitAnswer(){
      const q=this.state?.activeQuestion,t=this.currentTeam;if(!q||q.locked||q.selected===null||!t)return null;
      q.locked=true;const elapsed=Math.max(0,Date.now()-q.startedAt);const correct=q.selected===q.correctIndex;
      this.state.answeredCount++;this.state.totalQuestionTimeMs+=elapsed;t.answeredMs+=elapsed;
      if(correct){t.correct++;t.streak++;t.bestStreak=Math.max(t.bestStreak,t.streak);t.score=this.currentPrize;const safe=this.safeMilestones; if(safe.includes(t.stage))t.lastGuaranteed=this.currentPrize;t.stage++;if(t.stage>=this.prizeLadder.length){t.finished=true;t.finishReason='million';}}
      else{t.wrong++;t.streak=0;t.score=t.lastGuaranteed;t.finished=true;t.finishReason='wrong';}
      this.persist();
      return {correct,selected:q.selected,correctIndex:q.correctIndex,correctText:q.originalAnswer,explanation:q.explanation,elapsed,teamId:t.id,prize:t.score,advanced:correct};
    }
    timeout(){
      const q=this.state?.activeQuestion,t=this.currentTeam;if(!q||q.locked||!t)return null;q.locked=true;const elapsed=Math.max(0,Date.now()-q.startedAt);this.state.answeredCount++;this.state.totalQuestionTimeMs+=elapsed;t.answeredMs+=elapsed;t.wrong++;t.streak=0;t.score=t.lastGuaranteed;t.finished=true;t.finishReason='timeout';this.persist();return {correct:false,timeout:true,selected:null,correctIndex:q.correctIndex,correctText:q.originalAnswer,explanation:q.explanation,elapsed,teamId:t.id,prize:t.score};
    }
    useLifeline(name){
      const q=this.state?.activeQuestion,t=this.currentTeam;if(!q||q.locked||!t||!this.settings?.lifelines||t.lifelines[name])return {ok:false,reason:'unavailable'};
      if(name==='fifty'){
        const wrongs=shuffle([0,1,2,3].filter(i=>i!==q.correctIndex)).slice(0,2);q.disabled=[...new Set(wrongs)];
      } else if(name==='poll'){
        const base=[12,14,16,18];const raw=[0,0,0,0];let remaining=100;const correct=Math.floor(50+Math.random()*36);raw[q.correctIndex]=correct;remaining-=correct;const others=shuffle([0,1,2,3].filter(i=>i!==q.correctIndex));others.forEach((i,k)=>{const val=k===2?remaining:Math.floor(remaining*(.35+Math.random()*.2));raw[i]=Math.max(1,val);remaining-=raw[i]});raw[others[2]]+=remaining;return this.markLife(name,{ok:true,percentages:raw})
      } else if(name==='friend'){
        const confident=Math.random()<.72;const hint=confident?`أظن أن الإجابة هي «${q.options[q.correctIndex]}»، لكن تأكد بنفسك.`:`لست متأكدًا تمامًا، أميل إلى «${q.options[shuffle([0,1,2,3].filter(i=>i!==q.correctIndex))[0]]}».` ;return this.markLife(name,{ok:true,friend:hint,confidence:confident?'مرتفع':'متوسط'})
      } else if(name==='swap'){
        this.markLife(name,{ok:true});t.seen=(t.seen||[]).filter(id=>id!==q.id);return {ok:true,swapped:true,newQuestion:this.loadQuestion(q.id)}
      }
      this.markLife(name,{ok:true});this.persist();return {ok:true}
    }
    markLife(name,res){this.currentTeam.lifelines[name]=true;this.persist();return res}
    advanceTurn(){
      if(!this.state)return null;let tries=0;const n=this.state.teams.length;
      do{this.state.turnIndex=(this.state.turnIndex+1)%n;tries++}while(this.state.teams[this.state.turnIndex].finished&&tries<=n);
      if(this.state.teams.every(t=>t.finished))return this.finishAll();
      this.state.round++;this.state.activeQuestion=null;this.loadQuestion();this.persist();return this.snapshot();
    }
    finishAll(){if(!this.state)return null;this.state.status='finished';this.state.activeQuestion=null;this.persist();return this.snapshot()}
    quitCurrentTeam(){const t=this.currentTeam;if(!t)return; t.finished=true;t.finishReason='quit';t.score=t.lastGuaranteed;this.persist();return this.advanceTurn()}
    persist(){try{StorageManager.saveGame(this.state)}catch(e){console.warn(e)}}
    clear(){StorageManager.clearSave();this.state=null}
    get isFinished(){return this.state?.status==='finished'}
    validateBank(bank){
      const errors=[],ids=new Set();if(!Array.isArray(bank)||bank.length<1)return {valid:false,errors:['قاعدة الأسئلة فارغة']};
      bank.forEach((q,i)=>{if(ids.has(q.id))errors.push(`معرف مكرر عند العنصر ${i+1}`);ids.add(q.id);if(!q.question||!String(q.question).trim())errors.push(`السؤال ${q.id} بلا نص`);if(!Array.isArray(q.options)||q.options.length!==4)errors.push(`السؤال ${q.id} يجب أن يحتوي 4 خيارات`);else if(new Set(q.options.map(String)).size!==4)errors.push(`السؤال ${q.id} يحتوي خيارات مكررة`);if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)errors.push(`إجابة غير صحيحة للسؤال ${q.id}`);if(!['easy','medium','hard','very-hard'].includes(q.difficulty))errors.push(`صعوبة غير معروفة للسؤال ${q.id}`)});
      return {valid:errors.length===0,errors}
    }
    static difficultyName(v){return difficultyNames[v]||'متوسط'}
    static formatPrize(n){return Number(n||0).toLocaleString('ar-IQ')}
  }
  window.MillionaireGame=MillionaireGame;window.GameUtils={shuffle,letters,difficultyNames};
})();