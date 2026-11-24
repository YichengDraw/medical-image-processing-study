'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Nav=require('../focus-navigation.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../ai301/data/content.json'),'utf8'));
const order=new Map(data.decks.map((d,i)=>[d.id,i]));
let pages=0,notes=0,cases=0;
const noteText=new Set();
for(const d of data.decks){
  assert.equal(data.slides[d.id].length,d.pages);
  assert.ok(fs.existsSync(path.join(__dirname,'..',d.path)));
  data.slides[d.id].forEach((p,i)=>{
    pages++;
    assert.equal(p.page,i+1);
    assert.equal(p.visualReviewed,true);
    assert.equal(p.audioSupported,Boolean(p.note),'PPT-only is a per-page decision');
    assert.ok(p.title&&!/^\d+$/.test(p.title));
    if(p.note){
      notes++;
      assert.equal(p.note.page,p.page);
      assert.ok(p.note.sourceIds.length,'Every explanation has classroom provenance');
      p.note.sourceIds.forEach(s=>assert.ok(data.sources[s]&&data.recordings[data.sources[s].recording]));
      const text=p.note.paragraphs.join('\n');assert.ok(!noteText.has(text),'No repeated range template');noteText.add(text);
    }
  });
}
assert.equal(data.decks.length,10);assert.equal(pages,300);assert.equal(notes,197);
assert.equal(Object.keys(data.recordings).length,9);
assert.equal(data.coverage.slidesOnlyPages,pages-notes);
assert.equal(data.coverage.slidesOnlyPages,103);
assert.deepEqual(data.assessment,{},'Do not inherit medical assessment percentages');
assert.equal(data.slides.lec2[1].note,null);assert.ok(data.slides.lec2[2].note);
assert.equal(data.slides.lec4[7].note,null);assert.ok(data.slides.lec4[26].note);
assert.ok(data.slides.lec5[17].note);assert.ok(data.slides.lec5[18].note);
assert.ok(data.slides.lec5[22].note,'Repeated P23 diagram explicitly reuses content-matched classroom sources');
assert.ok(data.slides.lec5[32].note,'November 9 recording completes the end of Lecture 5');
assert.equal(data.slides.lec6[0].note,null,'Cover has no standalone classroom explanation');
for(let p=2;p<=20;p++)assert.ok(data.slides.lec6[p-1].note,'The two recordings now cover Lec6 P2–20');
assert.equal(data.decks.at(-1).id,'lec6p3','The forwarding part follows the pipelined datapath lecture');
assert.equal(data.slides.lec6p2.length,21);
for(let p=1;p<=6;p++)assert.ok(data.slides.lec6p2[p-1].note,'The November 16 recording covers datapath P1–6');
for(let p=7;p<=9;p++)assert.equal(data.slides.lec6p2[p-1].note,null,'P7–9 retain their existing PDF-only coverage');
for(let p=10;p<=21;p++)assert.ok(data.slides.lec6p2[p-1].note.sourceIds.some(s=>s.startsWith('ai301-r09-')),'November 23 adds the matching explanation for P10–21');
assert.equal(data.slides.lec6p2[5].audioSupported,true,'P6 retains its verified explanation');
assert.equal(data.slides.lec6p2[6].audioSupported,false,'The P6→P7 boundary switches off the companion');
assert.equal(data.recordings['ai301-r07'].date,'2026-11-09');
assert.equal(data.recordings['ai301-r09'].date,'2026-11-23');
assert.equal(data.slides.lec6p3.length,27);
for(let p=1;p<=10;p++)assert.ok(data.slides.lec6p3[p-1].note.sourceIds.some(s=>s.startsWith('ai301-r09-')),'Forwarding P1–10 has November 23 classroom evidence');
for(let p=11;p<=27;p++)assert.equal(data.slides.lec6p3[p-1].note,null,'P11–27 retain the uploaded slides for preview');
const crypto=require('node:crypto');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../ai301/assets/pdfs/lec6p3.pdf'))).digest('hex'),JSON.parse(fs.readFileSync(path.join(__dirname,'../ai301/data/review-manifest.json'),'utf8')).decks.find(d=>d.id==='lec6p3').sourcePdfSha256,'New PDF is byte-identical to the reviewed source');
const quiz3=data.examGuide.entries.find(e=>e.id==='quiz3-nov23-scope');
assert.equal(quiz3.category,'explicit');
assert.ok(quiz3.anchors.some(a=>a.deck==='lec6p3'&&a.page===10),'Quiz scope links to the final page actually covered');
assert.ok(quiz3.sourceIds.includes('ai301-r09-s158'),'Quiz scope retains the explicit closing announcement');
assert.equal(data.examGuide.entries.find(e=>e.id==='isa-quiz-translation').category,'explicit');
assert.equal(data.examGuide.entries.filter(e=>e.category==='quiz').length,0,'Preparation is not a completed quiz recap');
for(const includeClass of [false,true]){
  const points=Nav.build(data.decks,data.examGuide.entries,includeClass);
  assert.equal(new Set(points.map(p=>p.deck+':'+p.page)).size,points.length);
  for(const d of data.decks){
    for(let p=1;p<=d.pages;p++){
      const next=Nav.next(data.decks,data.examGuide.entries,d.id,p,includeClass);
      const later=points.filter(t=>order.get(t.deck)>order.get(d.id)||(t.deck===d.id&&t.page>p));
      assert.deepEqual(next,later[0]||null,'Next focus must be the nearest later representative');
      if(next){
        assert.ok(next.categories.every(c=>['explicit','quiz',...(includeClass?['teacher','class']:[])].includes(c)));
        assert.ok(next.page>=1&&next.page<=data.decks[order.get(next.deck)].pages);
      }
      cases++;
    }
  }
  const last=data.decks.at(-1);
  assert.equal(Nav.next(data.decks,data.examGuide.entries,last.id,last.pages,includeClass),null,'Never wrap at end');
}
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec5',33,true).deck,'lec6','Classroom-focus navigation continues into the new deck');
const first=Nav.next(data.decks,data.examGuide.entries,'lec1',1,false);
assert.equal(first.deck,'lec3');assert.equal(first.page,25);
const second=Nav.next(data.decks,data.examGuide.entries,'lec3',25,false);
assert.equal(second.deck,'lec6p2');assert.equal(second.page,11,'Quiz 3 notification adds a later exam-only navigation target');
assert.equal(data.examGuide.entries.find(e=>e.id==='fp-hidden-one-exam').category,'teacher','A clearly emphasized pitfall is separate from an explicit exam commitment');
const floating=Nav.build(data.decks,data.examGuide.entries,true).find(p=>p.entryIds.includes('fp-hidden-one-exam'));
assert.equal(floating.deck,'lec4');assert.equal(floating.page,28);
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec4',28,false).deck,'lec6p2','Exam-only navigation continues to the Quiz 3 coverage');
console.log(`PASS: AI301 ${pages} pages, ${notes} unique notes, ${cases} navigation cases, source and coverage boundaries.`);
