'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Nav=require('../focus-navigation.js');
const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/content.json'),'utf8'));
assert.equal(data.revision,'2026-11-15-restoration-color');
assert.equal(data.schemaVersion,2);
assert.equal(data.decks.length,9);
assert.deepEqual(data.coverage,{visualPages:710,explainedPages:514,slidesOnlyPages:196,recordings:7,examEntries:87});
assert.equal(data.slides.lec5.length,111);
assert.equal(data.slides.lec6.length,83);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
assert.equal(hash('assets/pdfs/lec5.pdf'),'187ee0f63bbb70700c33ffaa58e6b396c137920f25bdcf22ab9936fa2bf10bf8');
assert.equal(hash('assets/pdfs/lec6.pdf'),'b748ef44df0907af8215c3c1a50776d0ed4a129922c7fcd20ac772435398a7a6');
let explained=0;
for(const d of ['lec5','lec6'])for(const p of data.slides[d]){
 const supported=d==='lec5'?(p.page<=76||p.page===111):p.page<=42;
 assert.equal(p.audioSupported,supported,d+'/'+p.page);
 assert.equal(Boolean(p.note),supported,d+'/'+p.page);
 assert.equal(p.visualReviewed,true);
 if(supported){
  explained++;
  assert.ok(p.note.sourceIds.length>0);
  assert.ok(p.note.paragraphs.every(t=>t.length>15));
  for(const sid of p.note.sourceIds)assert.ok(data.sources[sid]);
 }else{
  assert.ok(p.coverageLabel);
  assert.ok(p.coverageSourceIds.every(x=>data.sources[x]));
  assert.equal(p.coverageReason,d==='lec5'?'explicitly_excluded':'not_yet_taught');
 }
}
assert.equal(explained,119);
const entries=data.examGuide.entries;
assert.equal(entries.find(e=>e.id==='rest-ct-excluded').category,'scope');
assert.equal(entries.find(e=>e.id==='color-later-not-yet').category,'scope');
assert.equal(entries.find(e=>e.id==='color-exam-hsi').category,'explicit');
assert.ok(entries.find(e=>e.id==='color-exam-hsi').sourceIds.includes('recRestColor@01:34:25'));
assert.ok(data.sources['recRestColor@01:34:25'].excerpt.includes('考试的时候经常考'));
assert.ok(data.sources['recRestColor@01:20:38'].excerpt.includes('不会考试'));
for(const includeClass of [true,false]){
 const pts=Nav.build(data.decks,entries,includeClass);
 assert.ok(pts.every(p=>!(p.deck==='lec5'&&p.page>=77&&p.page<=110)),'CT excluded from exam navigation');
 assert.ok(pts.every(p=>!(p.deck==='lec6'&&p.page>=43)),'Untaught content not invented as priorities');
 assert.equal(Nav.next(data.decks,entries,'lec6',83,includeClass),null);
}
const snapshot=JSON.stringify(data);
assert.ok(!snapshot.includes('recRestColor@02:29:36'),'Unrelated conversation must not be published');
assert.ok(!snapshot.includes('recRestColor@02:02:40'),'Uncertain chatter must not be published');
const signature=new Set();
for(const d of data.decks)for(const p of data.slides[d.id])if(p.note){
 const s=JSON.stringify(p.note.paragraphs);assert.ok(!signature.has(s),'Repeated range summary');signature.add(s);
}
assert.equal(signature.size,514);
console.log('PASS: latest 194 pages; 119 unique sourced notes; untouched PDFs; CT vs untaught scope; 87-entry hub; transcript privacy.');
