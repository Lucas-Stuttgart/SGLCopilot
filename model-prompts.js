'use strict';
function preferenceMessages(question){
  return [
    {role:'system',content:'Extract scheduling preferences from German text. Output only a JSON object. day must be a German weekday name (Montag, Dienstag, Mittwoch, Donnerstag, Freitag), or null if unspecified. from and until are hours bounding the whole appointment, default 8 and 18. For nachmittags use 12 to 18, vormittags 8 to 12. For an exact start use start as HH:MM, else null. room is A 201, A 204, B 112, Labor 2, or null. Do not invent values.'},
    {role:'user',content:'Am Mittwoch nachmittags bitte.'},{role:'assistant',content:'{"day":"Mittwoch","from":12,"until":18,"start":null,"room":null}'},
    {role:'user',content:'Bitte am Freitag um 10:30 im Labor 2.'},{role:'assistant',content:'{"day":"Freitag","from":8,"until":18,"start":"10:30","room":"Labor 2"}'},
    {role:'user',content:question}
  ];
}
function parsePreference(text,question){
  const match=text.match(/\{[^{}]*\}/);if(!match)throw Error('Das Modell hat kein eindeutiges Zeitfenster geliefert. Bitte Tag und Uhrzeit präzisieren.');
  const p=JSON.parse(match[0]);
  const names=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
  // Only accept a specific room or clock time when the request actually mentions it.
  const roomMention=rooms.find(r=>question.toLowerCase().includes(r.toLowerCase()));
  p.room=roomMention||null;
  if(!/\b(nicht|außer|ausser|ohne)\b/i.test(question)){
    const explicit=names.filter(name=>question.toLowerCase().includes(name.toLowerCase()));
    if(explicit.length===1)p.day=explicit[0];
    if(/nachmittag/i.test(question)){p.from=12;p.until=18}
    if(/vormittag/i.test(question)){p.from=8;p.until=12}
  }
  const hasTime=/\b\d{1,2}(?::\d{2}|\s*Uhr)\b/i.test(question);
  if(!hasTime)p.start=null;
  const fixed=question.match(/\bum\s+(\d{1,2})(?::(\d{2}))?(?:\s*uhr)?\b/i);
  if(fixed){p.start=String(fixed[1]).padStart(2,'0')+':'+(fixed[2]||'00');p.from=8;p.until=18}
  for(const key of ['from','until']){
    if(typeof p[key]==='string'&&/^\d{1,2}(?::00)?$/.test(p[key]))p[key]=Number(p[key].split(':')[0]);
  }
  p.day=p.day===null?0:(names.includes(p.day)?names.indexOf(p.day)+1:-1);
  if(!Number.isInteger(p.day)||p.day<0||p.day>5||!Number.isInteger(p.from)||!Number.isInteger(p.until)||p.from<8||p.until>18||p.from>=p.until||
    (p.start!==null&&!/^(?:0[89]|1[0-7]):[0-5][0-9]$/.test(p.start))||(p.room!==null&&!rooms.includes(p.room)))throw Error('Zeitfenster oder Raum konnten nicht eindeutig interpretiert werden.');
  return p;
}
function matchSlots(old,others,monday,p){
  const candidates=[],exact=p.start===null?null:Number(p.start.slice(0,2))*60+Number(p.start.slice(3));
  for(let index=0;index<5;index++){
    if(p.day&&p.day!==index+1)continue;
    const date=offset(monday,index);
    for(let start=p.from*60;start+old.duration<=p.until*60;start+=15){
      if(exact!==null&&start!==exact)continue;
      const busy=others.filter(e=>e.id!==old.id&&overlaps(e,{date,start,duration:old.duration}));
      if(busy.some(e=>e.course===old.course||e.person===old.person))continue;
      for(const room of (p.room?[p.room]:rooms)){
        if(busy.some(e=>e.room===room)||(old.date===date&&old.start===start&&old.room===room))continue;
        candidates.push({...old,date,start,room});
      }
    }
  }
  const cost=e=>Math.abs(Date.parse(e.date)-Date.parse(old.date))/86400000*1000+Math.abs(e.start-old.start)+(e.room===old.room?0:2);
  return candidates.sort((a,b)=>cost(a)-cost(b));
}

function questionMessages(question){
  return [
    {role:'system',content:'Route a German university timetable question to one tool. Return exactly one English tool name and nothing else. EXAMS for Klausuren or Prüfungen. ROOMS for free rooms. STAFF for teachers or teaching loads. CONFLICT for risks or clashes. AGENDA for scheduled classes. BRIEF for weekly summaries. UNKNOWN for other topics.'},
    {role:'user',content:'Wo kann der Kurs um 11 Uhr hin?'},{role:'assistant',content:'ROOMS'},
    {role:'user',content:'Welche Klausuren schreiben wir?'},{role:'assistant',content:'EXAMS'},
    {role:'user',content:'Was muss ich vor der Freigabe klären?'},{role:'assistant',content:'CONFLICT'},
    {role:'user',content:question}
  ];
}
