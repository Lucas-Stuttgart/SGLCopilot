'use strict';
const courses = ['WWI2024C','WWI2024B','WWI2025A'];
const people = ['Mara Keller','Jonas Weber','Lea Sommer','Ben Fischer','Nora Klein'];
const rooms = ['A 201','A 204','B 112','Labor 2'];
const base = '2026-11-23';
function offset(iso,n){
  const date = new Date(iso+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+n);
  return date.toISOString().slice(0,10);
}
function dateLabel(iso,opts){return new Intl.DateTimeFormat('de-DE',{timeZone:'UTC',...opts}).format(new Date(iso+'T12:00:00Z'))}
function clock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function seed(){
  const rows=[
    [0,510,120,'IT-Consulting',0,0,0],[0,675,90,'Datenbanken',2,1,3],[0,810,120,'Projektmanagement',1,2,1],
    [1,540,120,'Bilanzierung',0,3,0,1],[1,600,120,'Finanzierung',1,4,0],[1,840,105,'IT-Architektur',2,1,2],
    [2,510,120,'Software Engineering',1,1,3],[2,705,90,'IT-Consulting',0,0,0],[2,840,90,'Statistik',2,4,2,1],
    [3,540,150,'Integrationsseminar',0,2,1],[3,750,120,'Prozessmanagement',1,0,2],
    [4,510,90,'Wirtschaftsrecht',2,3,2],[4,660,120,'Datenbanken',1,1,3,1],[4,825,90,'Fallstudie',0,2,1]];
  return rows.map(([d,start,duration,title,c,p,r,exam],i)=>({id:'t'+i,date:offset(base,d),start,duration,title,course:courses[c],person:people[p],room:rooms[r],type:exam?'Prüfung':'Vorlesung'}));
}
const resources={room:'Raum',person:'Lehrperson',course:'Kurs'};
function overlaps(a,b){return a.date===b.date && a.start<b.start+b.duration && b.start<a.start+a.duration}
function conflicts(events){
  const pairs=[];
  events.forEach((a,i)=>events.slice(i+1).forEach(b=>{
    if(!overlaps(a,b))return;
    const keys=Object.keys(resources).filter(k=>a[k]===b[k]);
    if(keys.length)pairs.push({a,b,keys});
  }));
  return pairs;
}
// Each resource evaluator independently vetoes a candidate. Exams keep their slot when possible.
function suggest(pair,events,monday){
  const options=[];
  for(const old of [pair.a,pair.b]){
    const others=events.filter(e=>e.id!==old.id);
    for(let d=0;d<5;d++){
      const date=offset(monday,d);
      for(let start=480;start+old.duration<=1080;start+=15){
        const busy=others.filter(e=>overlaps(e,{...old,date,start}));
        if(busy.some(e=>e.course===old.course || e.person===old.person))continue;
        for(const room of rooms){
          if(busy.some(e=>e.room===room))continue;
          const candidate={...old,date,start,room};
          const dayChange=Math.abs(Date.parse(date)-Date.parse(old.date))/86400000;
          const cost=dayChange*1000+Math.abs(start-old.start)+(room!==old.room?3:0)+(old.type==='Prüfung'?5:0);
          options.push({old,candidate,cost});
        }
      }
    }
  }
  return options.sort((a,b)=>a.cost-b.cost)[0];
}
// Supervised nearest-neighbour intent classification using TF-IDF character n-grams.
const examples={
  conflict:['Welche Konflikte gibt es','Was überschneidet sich','Doppelbelegung finden','Welche Termine kollidieren','Wo gibt es Überschneidungen','Konflikte prüfen','Wie löse ich die Raumkollision'],
  rooms:['Welche Räume sind frei','Finde freie Räume','Wo finde ich einen freien Raum','Raumbelegung prüfen','Ist ein Raum verfügbar','Freier Hörsaal am Dienstag um 10 Uhr'],
  exams:['Welche Prüfungen stehen an','Wann sind die Klausuren','Liste alle Prüfungstermine','Welche Klausur ist am Montag','Prüfungen anzeigen'],
  staff:['Wer unterrichtet diese Woche','Welche Lehrpersonen sind eingeplant','Wie ist die Auslastung der Dozenten','Zeige mir das Lehrdeputat','Stunden je Dozent','Dozierende anzeigen'],
  agenda:['Welche Termine stehen an','Zeige den Stundenplan','Was ist am Montag geplant','Welche Vorlesungen finden statt','Was steht auf dem Wochenplan','Terminübersicht für den Kurs']};
function grams(s){
  const counts=new Map();
  for(const word of s.toLowerCase().normalize('NFC').match(/[\p{L}\d]+/gu)||[]){
    const padded='^'+word+'$';
    for(let i=0;i<padded.length-2;i++){const g=padded.slice(i,i+3);counts.set(g,(counts.get(g)||0)+1)}
  }
  return counts;
}
const corpus=Object.entries(examples).flatMap(([intent,rows])=>rows.map(s=>({intent,terms:grams(s)})));
const df=new Map();
for(const doc of corpus)for(const g of doc.terms.keys())df.set(g,1+(df.get(g)||0));
function vector(terms){
  const v=new Map();let norm=0;
  for(const [g,n] of terms){const weight=n*(1+Math.log((1+corpus.length)/(1+(df.get(g)||0))));v.set(g,weight);norm+=weight*weight}
  for(const [g,w] of v)v.set(g,w/(Math.sqrt(norm)||1));
  return v;
}
for(const doc of corpus)doc.v=vector(doc.terms);
function classify(q){
  const query=vector(grams(q));
  const ranked=corpus.map(doc=>({intent:doc.intent,score:[...query].reduce((s,[g,v])=>s+v*(doc.v.get(g)||0),0)})).sort((a,b)=>b.score-a.score);
  return ranked[0].score>=0.23?ranked[0].intent:null;
}
