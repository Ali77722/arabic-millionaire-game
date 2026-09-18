(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  let toastTimer=null;
  window.UI={
    $,
    esc,
    showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo({top:0,behavior:'smooth'});},
    formatPrize(n){return Number(n||0).toLocaleString('en-US')},
    toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)},
    confirm({title='تأكيد',text='',confirmText='تأكيد',danger=true,onConfirm}){const m=$('modal');$('modalIcon').textContent=danger?'!':'?';$('modalTitle').textContent=title;$('modalText').textContent=text;$('modalConfirm').textContent=confirmText;$('modalConfirm').className=danger?'danger-btn':'primary-btn';m.classList.remove('hidden');const close=()=>m.classList.add('hidden');$('modalCancel').onclick=close;$('modalConfirm').onclick=()=>{close();onConfirm?.()};},
    modalHtml({title,html,confirmText='إغلاق'}){const m=$('modal');$('modalIcon').textContent='★';$('modalTitle').textContent=title;$('modalText').innerHTML=html;$('modalCancel').classList.add('hidden');$('modalConfirm').className='primary-btn';$('modalConfirm').textContent=confirmText;m.classList.remove('hidden');const close=()=>{m.classList.add('hidden');$('modalCancel').classList.remove('hidden')};$('modalConfirm').onclick=close;$('modalCancel').onclick=close},
    teamAvatar(t){return `<span class="score-icon" style="background:${esc(t.color)}22;border:1px solid ${esc(t.color)}55">${esc(t.icon)}</span>`},
    setVar(name,value){document.documentElement.style.setProperty(name,value)}
  };
})();