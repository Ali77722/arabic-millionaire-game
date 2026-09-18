(function(){
  const KEYS={settings:'mw_settings_v4',setup:'mw_setup_v4',save:'mw_save_v4',stats:'mw_stats_v4',history:'mw_history_v4',imported:'mw_imported_questions_v4'};
  const baseStats={games:0,questions:0,correct:0,wrong:0,highestScore:0,bestTeam:'—',bestScore:0,longestStreak:0,totalAnswerMs:0,answeredForAvg:0,lifelines:0};
  const defaultSettings={teamCount:2,timer:30,difficulty:'progressive',motion:'normal',dark:true,lifelines:true,sfx:true,music:true,volume:65,prizePreset:'million',prizes:[100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000]};
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):structuredClone(f)}catch{return structuredClone(f)}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  window.StorageManager={
    KEYS,
    getSettings(){return Object.assign({},defaultSettings,read(KEYS.settings,defaultSettings))},
    saveSettings(v){return write(KEYS.settings,Object.assign({},defaultSettings,v))},
    getSetup(){return read(KEYS.setup,{teams:[]})}, saveSetup(v){return write(KEYS.setup,v)},
    getSave(){return read(KEYS.save,null)}, saveGame(v){return write(KEYS.save,v)}, clearSave(){localStorage.removeItem(KEYS.save)},
    getStats(){return Object.assign({},baseStats,read(KEYS.stats,baseStats))}, saveStats(v){return write(KEYS.stats,Object.assign({},baseStats,v))},
    getHistory(){return read(KEYS.history,[])}, saveHistory(v){return write(KEYS.history,v)}, clearHistory(){localStorage.removeItem(KEYS.history)},
    getImportedQuestions(){return read(KEYS.imported,null)}, saveImportedQuestions(v){return write(KEYS.imported,v)}, clearImportedQuestions(){localStorage.removeItem(KEYS.imported)},
    getDefaultSettings(){return structuredClone(defaultSettings)}, getDefaultStats(){return structuredClone(baseStats)},
    resetAll(){Object.values(KEYS).forEach(k=>localStorage.removeItem(k))}
  };
})();