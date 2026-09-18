const CACHE_NAME='millionaire-ar-v3';
const ASSETS=[
'./','./index.html','./style.css','./script.js','./README.md',
'./js/questions.js','./js/game.js','./js/storage.js','./js/audio.js','./js/ui.js',
'./js/question-parts/q01.js','./js/question-parts/q02.js','./js/question-parts/q03.js',
'./js/question-parts/q04.js','./js/question-parts/q05.js','./js/question-parts/q06.js','./js/question-parts/q07.js'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return res}).catch(()=>caches.match('./index.html'))))});