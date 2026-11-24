'use strict';
let view='schedule',worker=null,modelReady=false,busy=false,epoch=0,pending=null;
function commitChange(before,after,label){
  if(before&&!events.some(e=>JSON.stringify(e)===JSON.stringify(before)))throw Error('Der Termin wurde inzwischen geändert.');
  events=events.filter(e=>e.id!==before?.id);
  if(after)events.push(after);
  journal.push({before,after,label,at:new Date().toISOString()});save();
}
const summary=e=>e?short(e.date)+' · '+interval(e)+' · '+e.room+' · '+e.person+' · '+e.course:'—';
function resourceTable(key,values){
  const rows=current(),hours=n=>(n/60).toLocaleString('de-DE',{maximumFractionDigits:2})+' h';
  return '<div class="tablewrap"><table class="resource-table"><thead><tr><th>'+resources[key]+'</th><th>Termine</th><th>Prüfungen</th><th>Belegte Zeit</th></tr></thead><tbody>'+values.map(value=>{
    const subset=rows.filter(e=>e[key]===value);let minutes=0;
    for(let d=0;d<5;d++){let last=0;for(const e of subset.filter(e=>e.date===offset(week,d))){minutes+=Math.max(0,e.start+e.duration-Math.max(e.start,last));last=Math.max(last,e.start+e.duration)}}
    return '<tr><td>'+esc(value)+'</td><td>'+subset.length+'</td><td>'+subset.filter(e=>e.type==='Prüfung').length+'</td><td><span class="meter"><b style="width:'+minutes/3000*100+'%"></b></span>'+hours(minutes)+'</td></tr>';
  }).join('')+'</tbody></table></div>';
}
function drawExtra(){
  $('workspace').hidden=view!=='schedule';$('extra').hidden=view==='schedule';
  for(const b of document.querySelectorAll('[data-view]')){if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
  if(view==='capacity'){
    $('extra').innerHTML='<div class="extrahead"><h2>Ressourcenbelegung</h2><div class="d-flex gap-1"><button class="iconbtn" id="exPrev" aria-label="Vorherige Woche">‹</button><button class="iconbtn" id="exNext" aria-label="Nächste Woche">›</button></div></div><div class="extraweek">'+short(week)+' bis '+short(offset(week,4))+' · Alle Kurse · Montag bis Freitag, 08–18 Uhr</div><h3>Lehrpersonen</h3>'+resourceTable('person',people)+'<h3>Räume</h3>'+resourceTable('room',rooms);
    $('exPrev').onclick=()=>{week=offset(week,-7);render()};$('exNext').onclick=()=>{week=offset(week,7);render()};
  }
  if(view==='history'){
    const last=journal.at(-1);
    $('extra').innerHTML='<div class="extrahead"><h2>Änderungsverlauf</h2>'+(last?'<button class="btn secondary" id="undo">Letzte Änderung zurücknehmen</button>':'')+'</div>'+(last?journal.slice().reverse().map(h=>'<div class="historyrow"><strong>'+esc(h.label+' · '+(h.after||h.before).title)+'</strong><small>'+esc(new Date(h.at).toLocaleString('de-DE'))+'</small><small>Vorher · '+esc(summary(h.before))+'</small><small>Nachher · '+esc(summary(h.after))+'</small></div>').join(''):'<p class="detailtext">Hier erscheinen gespeicherte Änderungen an deinem Plan.</p>');
    if(last)$('undo').onclick=()=>{const id=(last.after||last.before).id;events=events.filter(e=>e.id!==id);if(last.before)events.push(last.before);journal.pop();save();render()};
  }
}
document.querySelector('.globalnav').onclick=e=>{const btn=e.target.closest('[data-view]');if(btn){view=btn.dataset.view;drawExtra()}};
function exportCalendar(){
  const escapeIcs=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  // Floating local times preserve the plan's displayed wall-clock times.
  const stamp=(e,t)=>e.date.replaceAll('-','')+'T'+clock(t).replace(':','')+'00';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Leitwerk//Studiengangsplanung//DE','CALSCALE:GREGORIAN'];
  for(const e of visible())lines.push('BEGIN:VEVENT','UID:'+e.id+'@leitwerk.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp(e,e.start),'DTEND:'+stamp(e,e.start+e.duration),'SUMMARY:'+escapeIcs(e.title),'LOCATION:'+escapeIcs(e.room),'DESCRIPTION:'+escapeIcs([e.type,e.person,e.course].join(' · ')),'END:VEVENT');
  lines.push('END:VCALENDAR');
  const fold=line=>{let out='',bytes=0;for(const c of line){const count=new TextEncoder().encode(c).length;if(bytes+count>75){out+='\r\n ';bytes=1}out+=c;bytes+=count}return out};
  const url=URL.createObjectURL(new Blob([lines.map(fold).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Leitwerk-'+week+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('export').onclick=exportCalendar;
function refreshTargets(){const selected=$('target').value;$('target').innerHTML=visible().map(e=>'<option value="'+esc(e.id)+'">'+esc(short(e.date)+' · '+e.title+' · '+e.course)+'</option>').join('');if(visible().some(e=>e.id===selected))$('target').value=selected}
document.addEventListener('plan-render',()=>{epoch++;refreshTargets();drawExtra()});
function refreshMode(){
  epoch++;const ai=$('assistMode').value==='llm';
  $('modelTools').hidden=!ai;$('prompts').hidden=ai;$('targetBox').hidden=$('aiTask').value!=='move';
  $('question').placeholder=ai?($('aiTask').value==='move'?'Zum Beispiel: Donnerstag nachmittags im Raum A 204.':'Was muss ich vor der Freigabe der Woche klären?'):'Welche Räume sind Dienstag um 10 Uhr frei?';
  $('answer').replaceChildren();
}
$('assistMode').onchange=refreshMode;$('aiTask').onchange=refreshMode;$('target').onchange=()=>{epoch++;$('answer').replaceChildren()};
function startMove(e){$('dialog').close();$('assistMode').value='llm';$('aiTask').value='move';refreshTargets();$('target').value=e.id;refreshMode();$('question').focus()}
function modelStatus(msg){$('modelState').textContent=msg}
function stopModel(reason){
  worker?.terminate();worker=null;modelReady=false;busy=false;pending=null;
  $('loadModel').disabled=false;$('loadModel').textContent='Modell erneut laden';$('loadProgress').hidden=true;modelStatus(reason);epoch++;
}
$('loadModel').onclick=()=>{
  if(worker){stopModel('Modell beendet.');return}
  try{
    worker=new Worker(new URL('model.worker.js',document.baseURI),{type:'module'});
    $('loadModel').textContent='Laden abbrechen';modelStatus('Modell wird vorbereitet …');$('loadProgress').hidden=false;$('loadProgress').removeAttribute('value');
    worker.onerror=e=>stopModel('Modul konnte nicht gestartet werden. Bitte die Seite über HTTPS oder localhost öffnen. '+(e.message||''));
    worker.onmessage=({data})=>{
      if(data.type==='progress'){const percent=Math.round(data.value);$('loadProgress').value=percent;modelStatus(percent<100?'Modell wird geladen · '+percent+' %':'Modell wird im Arbeitsspeicher initialisiert …');return}
      if(data.type==='ready'){modelReady=true;$('loadProgress').hidden=true;$('loadModel').textContent='Modell beenden';modelStatus('Qwen 2.5 bereit · lokale Inferenz');return}
      if(data.type==='failure'){stopModel('Modellfehler: '+data.message+' · Verbindung und verfügbaren Arbeitsspeicher prüfen.');return}
      if(data.type==='result'){busy=false;const request=pending;pending=null;modelStatus('Qwen 2.5 bereit · lokale Inferenz');if(request&&request.epoch===epoch)showResult(request,data.text)}
    };
    worker.postMessage({type:'load'});
  }catch(e){stopModel(e.message)}
};
function checkedCommit(old,candidate){
  const live=events.find(e=>e.id===old.id);
  if(JSON.stringify(live)!==JSON.stringify(old)||conflicts([...events.filter(e=>e.id!==old.id),candidate]).some(p=>p.a.id===old.id||p.b.id===old.id)){reply('Der Vorschlag ist veraltet. Bitte erneut prüfen.');return}
  commitChange(old,candidate,'KI-Vorschlag übernommen');render();reply('Übernommen · '+candidate.title+'\n'+summary(candidate));
}
function showResult(req,text){
  if(req.task==='brief'){
    const terms={EXAMS:/prüf|klausur|exam/i,ROOMS:/raum|räume|room/i,STAFF:/lehrperson|dozent|teacher|staff/i,CONFLICT:/konflikt|überschneidung|conflict/i,AGENDA:/agenda|stundenplan|termine/i,BRIEF:/brief|übersicht|zusammenfassung/i};
    const tool=Object.keys(terms).find(key=>terms[key].test(text.trim().slice(0,80)));
    if(tool==='BRIEF'){
      const items=visible(),pairs=relevant();
      reply('Wochenübersicht · '+short(week)+' bis '+short(offset(week,4))+'\n'+items.length+' Termine, davon '+items.filter(e=>e.type==='Prüfung').length+' Prüfungen. '+pairs.length+' offene Konfliktpaare.'+(pairs.length?'\n'+pairs.map(p=>p.a.title+' / '+p.b.title+' · '+short(p.a.date)+' · '+p.keys.map(k=>p.a[k]).join(', ')).join('\n'):''));
    }else if(tool&&tool!=='UNKNOWN')ask(req.q,tool.toLowerCase());
    else{reply('Ich kann den Auftrag keiner Planabfrage sicher zuordnen. Frage nach Prüfungen, freien Räumen, Lehrpersonen, Terminen, Konflikten oder einer Wochenübersicht.');return}
    const source=document.createElement('details');source.className='sources';
    source.innerHTML='<summary>Verwendete Plandaten ('+visible().length+')</summary>'+visible().map(row).join('');
    source.onclick=e=>{const btn=e.target.closest('[data-id]');if(btn)detail(events.find(item=>item.id===btn.dataset.id))};
    $('answer').append(source);return;
  }
  try{
    const p=parsePreference(text,req.q);const old=req.old;
    const candidates=matchSlots(old,current(),week,p);
    const interpretation=(p.day?days[p.day-1]:'Mo–Fr')+' · '+(p.start||clock(p.from*60)+'–'+clock(p.until*60))+' · '+(p.room||'alle Räume');
    if(!candidates.length){reply('Interpretiert: '+interpretation+'\nKein alternatives Zeitfenster für die gesamte Dauer verfügbar.');return}
    const candidate=candidates[0];
    reply('Interpretiert: '+interpretation+'\n\n'+old.title+'\nBisher: '+summary(old)+'\nVorschlag: '+summary(candidate)+'\n\nRaum, Kurs und Lehrperson sind laut Wochenplan verfügbar.');
    const button=document.createElement('button');button.className='btn primary detailbtn';button.textContent='Änderung freigeben';button.onclick=()=>checkedCommit(old,candidate);$('answer').append(button);
  }catch{reply('Der Umplanungswunsch war für das Modell nicht eindeutig. Bitte Wochentag, Uhrzeit oder Raum angeben.')}
}
$('ask').onsubmit=e=>{
  e.preventDefault();const q=$('question').value.trim();if(!q)return;
  if($('assistMode').value==='lookup'){ask(q);return}
  if(!modelReady){reply('Bitte das Sprachmodell über „Sprachmodell laden“ aktivieren und anschließend die Anfrage senden.');return}
  if(busy){reply('Die vorherige Anfrage wird bearbeitet.');return}
  const task=$('aiTask').value,old=visible().find(e=>e.id===$('target').value);
  if(task==='move'&&!old){reply('Bitte einen Termin aus der aktuellen Woche auswählen.');return}
  let messages;
  if(task==='move')messages=preferenceMessages(q);
  else messages=questionMessages(q);
  busy=true;pending={task,old,epoch,q};reply('Das Modell bearbeitet die Anfrage …');modelStatus('Lokale Inferenz läuft.');worker.postMessage({type:'generate',messages,tokens:task==='move'?85:12});
};
refreshTargets();refreshMode();drawExtra();
