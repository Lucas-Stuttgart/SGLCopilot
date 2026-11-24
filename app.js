'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>'<i aria-hidden="true" class="icon-'+name+'"></i>';
const options=values=>values.map(v=>'<option>'+esc(v)+'</option>').join('');
const days=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
const storeKey='leitwerk-sgl-v1';
let events=seed(), week=base, list=matchMedia('(max-width:600px)').matches;
function valid(e){return e&&typeof e.id==='string'&&typeof e.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&Number.isInteger(e.start)&&Number.isInteger(e.duration)&&e.start>=480&&e.duration>=15&&e.start+e.duration<=1080&&courses.includes(e.course)&&rooms.includes(e.room)&&people.includes(e.person)&&['Vorlesung','Prüfung'].includes(e.type)}
try{const saved=JSON.parse(localStorage.getItem(storeKey));if(Array.isArray(saved)&&saved.every(valid))events=saved}catch{}
let journal=[];
const deskKey='leitwerk-sgl-desk-v2';
try{const saved=JSON.parse(localStorage.getItem(deskKey));if(saved&&Array.isArray(saved.events)&&saved.events.every(valid)&&Array.isArray(saved.journal)){events=saved.events;journal=saved.journal}}catch{}
function save(){try{localStorage.setItem(deskKey,JSON.stringify({events,journal}))}catch{alert('Die Änderung gilt für diese Sitzung. Der Browser konnte sie nicht dauerhaft speichern.')}}
const current=()=>events.filter(e=>e.date>=week&&e.date<=offset(week,4)).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
const visible=()=>current().filter(e=>!$('course').value||e.course===$('course').value);
const relevant=()=>conflicts(current()).filter(p=>[p.a,p.b].some(e=>!$('course').value||e.course===$('course').value));
const short=d=>dateLabel(d,{weekday:'short',day:'2-digit',month:'2-digit'});
const interval=e=>clock(e.start)+'–'+clock(e.start+e.duration);
function row(e){return '<button class="listitem" data-id="'+esc(e.id)+'"><span><strong>'+esc(e.title)+'</strong><small>'+interval(e)+' · '+esc(e.room)+' · '+esc(e.course)+'</small></span>'+icon('chevron-right')+'</button>'}
function grid(items,pairs){
  const dates=days.map((_,i)=>offset(week,i));
  const blocks=dates.map(date=>{
    // Overlap groups share the available width. Adjacent appointments reuse a lane.
    const groups=[];let end=-1;
    for(const e of items.filter(e=>e.date===date)){if(e.start>=end){groups.push([]);end=0}groups.at(-1).push(e);end=Math.max(end,e.start+e.duration)}
    const blocks=groups.map(group=>{
      const ends=[];const positioned=group.map(e=>{let lane=ends.findIndex(end=>end<=e.start);if(lane<0)lane=ends.length;ends[lane]=e.start+e.duration;return {e,lane}});
      return positioned.map(({e,lane})=>{
        const blocked=pairs.some(p=>p.a.id===e.id||p.b.id===e.id);
        return '<button class="event '+(blocked?'conflict':e.type==='Prüfung'?'exam':'')+'" data-id="'+esc(e.id)+'" style="top:'+(e.start-480)+'px;height:'+(e.duration-3)+'px;left:calc('+100*lane/ends.length+'% + 2px);width:calc('+100/ends.length+'% - 4px)" title="'+esc(e.title+' · '+interval(e)+' · '+e.type)+'"><small>'+clock(e.start)+'</small><strong>'+esc(e.title)+'</strong><em>'+esc(e.room)+'</em></button>';
      }).join('');
    }).join('');return '<div class="day">'+blocks+'</div>';
  }).join('');
  return '<div class="scroll" tabindex="0" aria-label="Wochenkalender"><div class="sheet"><div class="timehead">'+icon('clock-3')+'</div>'+dates.map((d,i)=>'<div class="daylabel '+(d==='2026-11-24'?'focus':'')+'"><small>'+days[i].slice(0,2).toUpperCase()+'</small><b>'+d.slice(-2)+'</b></div>').join('')+'<div class="times">'+Array.from({length:10},(_,i)=>'<span style="top:'+i*60+'px">'+clock(480+i*60)+'</span>').join('')+'</div>'+blocks+'</div></div>';
}
function render(){
  document.dispatchEvent(new Event('plan-render'));
  $('answer').innerHTML='';
  const items=visible(),pairs=relevant(),thursday=new Date(offset(week,3)+'T12:00:00Z');
  const kw=Math.ceil(((thursday-Date.UTC(thursday.getUTCFullYear(),0,1,12))/86400000+1)/7);
  $('kw').textContent='KW '+kw;
  $('range').textContent=dateLabel(week,{day:'numeric',...(week.slice(0,7)!==offset(week,4).slice(0,7)?{month:'short'}:{})})+' – '+dateLabel(offset(week,4),{day:'numeric',month:'long',year:'numeric'});
  $('metrics').innerHTML=[['Vorlesungen',items.filter(e=>e.type==='Vorlesung').length,'book-open'],['Prüfungen',items.filter(e=>e.type==='Prüfung').length,'clipboard-list'],['Lehrpersonen',new Set(items.map(e=>e.person)).size,'users'],['Offene Konflikte',pairs.length,'layers']].map(([label,n,i],k)=>'<div class="col metric '+(k===3&&n?'warn':'')+'"><div class="metricTop">'+label+icon(i)+'</div><strong>'+String(n).padStart(2,'0')+'</strong></div>').join('');
  $('gridBtn').setAttribute('aria-pressed',!list);$('listBtn').setAttribute('aria-pressed',list);
  $('plan').innerHTML=list?'<div class="listview">'+(items.length?days.map((day,i)=>{const dayItems=items.filter(e=>e.date===offset(week,i));return dayItems.length?'<h3>'+day+' · '+offset(week,i).slice(8)+'.</h3>'+dayItems.map(row).join(''):''}).join(''):'<p class="detailtext">Keine Termine in dieser Auswahl.</p>')+'</div>':grid(items,pairs);
  $('issues').innerHTML=pairs.length?pairs.map((p,i)=>'<button class="issue" data-pair="'+i+'"><span><strong>'+esc(p.keys.map(k=>resources[k]).join(', '))+' doppelt belegt</strong><small>'+short(p.a.date)+' · '+clock(Math.max(p.a.start,p.b.start))+' · '+esc(p.a[p.keys[0]])+'</small></span>'+icon('arrow-up-right')+'</button>').join(''):'<p>Alle eingeplanten Räume, Kurse und Lehrpersonen sind konfliktfrei.</p>';
}
function modal(html){$('details').innerHTML=html;if(!$('dialog').open)$('dialog').showModal()}
function detail(e){
  modal('<h2>'+esc(e.title)+'</h2><p class="detailtext">'+esc([e.type+' · '+e.course,short(e.date)+' · '+interval(e),e.room+' · '+e.person].join('\n'))+'</p><div class="dialogactions"><button class="btn primary" id="edit">Bearbeiten</button><button class="btn secondary" id="moveAI">Mit KI umplanen</button><button class="btn danger" id="remove">Entfernen</button></div>');
  $('edit').onclick=()=>editForm(e);
  $('moveAI').onclick=()=>startMove(e);
  $('remove').onclick=()=>{modal('<h2>Termin entfernen?</h2><p class="detailtext">'+esc(e.title)+' · '+short(e.date)+'</p><button class="btn danger" id="confirmDelete">Termin entfernen</button>');$('confirmDelete').onclick=()=>{commitChange(e,null,'Entfernt');$('dialog').close();render()}};
}
function resolvePair(p){
  const result=suggest(p,current(),week);
  const description=[p.a,p.b].map(e=>e.title+' · '+interval(e)+' · '+e.course).join('\n');
  let proposal='<p>Kein freier Ersatztermin in dieser Woche.</p>';
  if(result){const e=result.candidate;proposal='<div class="proposal"><strong>Vorschlag für '+esc(e.title)+'</strong><br>'+short(e.date)+' · '+interval(e)+' · '+e.room+'</div><p class="detailtext">Geprüft für das gesamte Zeitfenster</p><ul class="checks"><li>Raumplanung · '+esc(e.room)+' frei</li><li>Lehrplanung · '+esc(e.person)+' verfügbar</li><li>Kursplanung · '+esc(e.course)+' frei</li></ul><button id="apply" class="btn primary">Vorschlag übernehmen</button>'}
  modal('<h2>Konflikt prüfen</h2><p class="detailtext">'+esc(description)+'<br><br>Gemeinsam belegt: '+esc(p.keys.map(k=>p.a[k]).join(', '))+'</p>'+proposal);
  if(result)$('apply').onclick=()=>{commitChange(result.old,result.candidate,'Konflikt gelöst');$('dialog').close();render();reply('Übernommen: '+result.candidate.title+' · '+short(result.candidate.date)+' · '+interval(result.candidate)+' · '+result.candidate.room+'.')};
}
function reply(text){$('answer').innerHTML='<div class="response">'+esc(text)+'</div>'}
function ask(q,modelIntent){
  const intent=modelIntent||classify(q), day=days.findIndex(d=>q.toLowerCase().includes(d.toLowerCase())), date=day<0?null:offset(week,day);
  const course=courses.find(c=>q.toUpperCase().includes(c))||$('course').value;
  const items=current().filter(e=>(!date||e.date===date)&&(!course||e.course===course));
  const scope=(day<0?'Diese Woche':days[day])+(course?' · '+course:'')+'\n';
  if(intent==='conflict'){
    const pairs=conflicts(current()).filter(p=>items.some(e=>[p.a.id,p.b.id].includes(e.id)));
    reply(scope+(pairs.length?pairs.map(p=>short(p.a.date)+' · '+p.keys.map(k=>p.a[k]).join(', ')+': '+p.a.title+' und '+p.b.title+' überschneiden sich von '+clock(Math.max(p.a.start,p.b.start))+' bis '+clock(Math.min(p.a.start+p.a.duration,p.b.start+p.b.duration))+'.').join('\n'):'Keine Doppelbelegungen gefunden.'));
    if(pairs.length){const btn=document.createElement('button');btn.className='prompt';btn.textContent='Lösung für ersten Konflikt suchen →';btn.onclick=()=>resolvePair(pairs[0]);$('answer').append(btn)}return;
  }
  if(intent==='rooms'){
    const m=q.match(/\b(\d{1,2})(?::(\d{2})|\s*uhr)/i);const start=m?Number(m[1])*60+Number(m[2]||0):600;
    if(start<480||start+60>1080||Number(m?.[2]||0)>59)return reply('Bitte wähle eine Startzeit zwischen 08:00 und 17:00 Uhr.');
    const dates=date?[date]:days.map((_,i)=>offset(week,i));
    return reply('Freie Räume für 60 Minuten ab '+clock(start)+' Uhr\n'+dates.map(d=>short(d)+' · '+(rooms.filter(room=>!current().some(e=>e.room===room&&overlaps(e,{date:d,start,duration:60}))).join(', ')||'alle belegt')).join('\n'));
  }
  if(intent==='staff'){return reply(scope+(people.map(p=>{const minutes=items.filter(e=>e.person===p).reduce((s,e)=>s+e.duration,0);return minutes?p+' · '+(minutes/60).toLocaleString('de-DE')+' Std.':''}).filter(Boolean).join('\n')||'Keine Lehrpersonen eingeplant.'))}
  if(intent==='exams'||intent==='agenda'){const selected=items.filter(e=>intent!=='exams'||e.type==='Prüfung');return reply(scope+(selected.map(e=>short(e.date)+' '+clock(e.start)+' · '+e.title+' · '+e.room).join('\n')||'Keine passenden Termine.'))}
  reply('Ich kann Fragen zu Konflikten, Räumen, Prüfungen, Lehrpersonen und Terminen beantworten. Zum Beispiel: „Welche Räume sind Dienstag um 11 Uhr frei?“');
}
$('course').innerHTML='<option value="">Alle Kurse</option>'+options(courses);
$('course').onchange=render;
$('prev').onclick=()=>{week=offset(week,-7);render()};$('next').onclick=()=>{week=offset(week,7);render()};
$('gridBtn').onclick=()=>{list=false;render()};$('listBtn').onclick=()=>{list=true;render()};
$('close').onclick=()=>$('dialog').close();
$('plan').onclick=e=>{const b=e.target.closest('[data-id]');if(b)detail(events.find(ev=>ev.id===b.dataset.id))};
$('issues').onclick=e=>{const b=e.target.closest('[data-pair]');if(b)resolvePair(relevant()[Number(b.dataset.pair)])};
$('prompts').innerHTML=['Konflikte prüfen','Freie Räume finden','Prüfungen anzeigen'].map(q=>'<button class="prompt">'+q+icon('arrow-up-right')+'</button>').join('');
$('prompts').onclick=e=>{const b=e.target.closest('button');if(b)ask(b.textContent)};
$('ask').onsubmit=e=>{e.preventDefault();if($('question').value.trim())ask($('question').value.trim())};
$('question').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('ask').requestSubmit()}};
function selectField(name,label,values){return '<label>'+label+'<select name="'+name+'" class="form-select">'+options(values)+'</select></label>'}
$('add').onclick=()=>editForm(null);
function editForm(old){
  modal('<h2>'+(old?'Termin bearbeiten':'Termin anlegen')+'</h2><form id="entry"><div class="fields"><label>Veranstaltung<input class="form-control" name="title" maxlength="70" required placeholder="z. B. IT-Consulting"></label>'+selectField('type','Terminart',['Vorlesung','Prüfung'])+selectField('course','Kurs',courses)+selectField('person','Lehrperson',people)+selectField('room','Raum',rooms)+selectField('day','Wochentag',days)+'<label>Beginn<input type="time" class="form-control" name="start" min="08:00" max="17:45" step="900" value="09:00" required></label>'+selectField('duration','Dauer in Minuten',[15,30,45,60,75,90,105,120,135,150,165,180])+'</div><p id="error" role="alert"></p><button class="btn primary">Termin speichern</button></form>');
  const form=$('entry');form.elements.course.value=$('course').value||courses[0];form.elements.duration.value='90';
  if(old){const values={...old,start:clock(old.start),day:days.find((_,i)=>offset(week,i)===old.date)};for(const [key,value] of Object.entries(values)){const el=form.elements.namedItem(key);if(el)el.value=String(value)}}
  form.onsubmit=ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(form)),[h,m]=d.start.split(':').map(Number);
    const e={id:old?.id||crypto.randomUUID(),title:d.title.trim(),start:h*60+m,duration:+d.duration,date:offset(week,days.indexOf(d.day)),room:d.room,person:d.person,type:d.type,course:d.course};
    if(!e.title||!valid(e)){$('error').textContent='Bitte Titel und Zeitfenster zwischen 08:00 und 18:00 Uhr prüfen.';return}
    commitChange(old,e,old?'Bearbeitet':'Angelegt');if($('course').value)$('course').value=e.course;$('dialog').close();render();
  };
};
render();
