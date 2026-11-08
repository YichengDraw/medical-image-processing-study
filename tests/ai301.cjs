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
assert.equal(pages,232);assert.equal(notes,135);
assert.equal(data.coverage.slidesOnlyPages,pages-notes);
assert.deepEqual(data.assessment,{},'Do not inherit medical assessment percentages');
assert.equal(data.slides.lec2[1].note,null);assert.ok(data.slides.lec2[2].note);
assert.equal(data.slides.lec4[7].note,null);assert.ok(data.slides.lec4[26].note);
assert.ok(data.slides.lec5[17].note);assert.equal(data.slides.lec5[18].note,null);
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
        assert.ok(next.categories.every(c=>['explicit','quiz',...(includeClass?['class']:[])].includes(c)));
        assert.ok(next.page>=1&&next.page<=data.decks[order.get(next.deck)].pages);
      }
      cases++;
    }
  }
  assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec5',33,includeClass),null,'Never wrap at end');
}
const first=Nav.next(data.decks,data.examGuide.entries,'lec1',1,false);
assert.equal(first.deck,'lec3');assert.equal(first.page,25);
const second=Nav.next(data.decks,data.examGuide.entries,'lec3',25,false);
assert.equal(second.deck,'lec4');assert.equal(second.page,28);
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec4',28,false),null,'Do not repeat examples of the same assessment topic');
console.log(`PASS: AI301 ${pages} pages, ${notes} unique notes, ${cases} navigation cases, source and coverage boundaries.`);
