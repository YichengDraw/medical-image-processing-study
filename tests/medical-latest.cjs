'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Nav=require('../focus-navigation.js');
const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/content.json'),'utf8'));
assert.equal(data.revision,'2026-11-23-plain-language');
assert.equal(data.schemaVersion,2);
assert.equal(data.decks.length,10);
assert.deepEqual(data.coverage,{visualPages:852,explainedPages:631,slidesOnlyPages:221,recordings:8,examEntries:117});
assert.equal(data.slides.lec5.length,111);
assert.equal(data.slides.lec6.length,83);
assert.equal(data.slides.lec8.length,142);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
assert.equal(hash('assets/pdfs/lec5.pdf'),'187ee0f63bbb70700c33ffaa58e6b396c137920f25bdcf22ab9936fa2bf10bf8');
assert.equal(hash('assets/pdfs/lec6.pdf'),'b748ef44df0907af8215c3c1a50776d0ed4a129922c7fcd20ac772435398a7a6');
assert.equal(hash('assets/pdfs/lec8.pdf'),'47c9909f0dd488bbf2dd9762e05bc5d5abccd65e4096cbaafe84d767365c30c3');
let explained=0;
for(const d of ['lec5','lec6','lec8'])for(const p of data.slides[d]){
 const supported=d==='lec5'?(p.page<=76||p.page===111):d==='lec6'||p.page<=76;
 assert.equal(p.audioSupported,supported,d+'/'+p.page);
 assert.equal(Boolean(p.note),supported,d+'/'+p.page);
 assert.equal(p.visualReviewed,true);
 if(supported){
  explained++;
  assert.ok(p.note.sourceIds.length>0);
  assert.ok(p.note.paragraphs.every(t=>t.length>15));
  for(const sid of p.note.sourceIds)assert.ok(data.sources[sid]);
  if(d==='lec8'||d==='lec6'&&p.page>=43){
   assert.ok(p.note.sourceIds.some(id=>id.startsWith('recColorMorph@')),'New explanation must use the November 20 recording');
   assert.ok(!p.coverageLabel?.includes('未讲'),'Superseded coverage label removed');
  }
 }else{
  assert.ok(p.coverageLabel);
  assert.ok(p.coverageSourceIds.every(x=>data.sources[x]));
  assert.equal(p.coverageReason,d==='lec5'?'explicitly_excluded':'not_yet_taught');
 }
}
assert.equal(explained,236);
const entries=data.examGuide.entries;
assert.equal(entries.find(e=>e.id==='rest-ct-excluded').category,'scope');
assert.equal(entries.find(e=>e.id==='color-later-not-yet').category,'scope');
assert.equal(entries.find(e=>e.id==='color-exam-hsi').category,'explicit');
assert.ok(entries.find(e=>e.id==='color-exam-hsi').sourceIds.includes('recRestColor@01:34:25'));
assert.ok(data.sources['recRestColor@01:34:25'].excerpt.includes('考试的时候经常考'));
assert.ok(data.sources['recRestColor@01:20:38'].excerpt.includes('不会考试'));
assert.equal(entries.find(e=>e.id==='morph-draw-exam').category,'explicit');
assert.ok(data.sources['recColorMorph@59:05'].excerpt.includes('让你们来画'));
assert.equal(entries.find(e=>e.id==='morph-reconstruction-mask').category,'teacher');
assert.equal(entries.find(e=>e.id==='morph-not-yet-reconstruction-apps').category,'scope');
assert.ok(data.sources['recColorMorph@01:47:23'].excerpt.includes('下课'));
for(const includeClass of [true,false]){
 const pts=Nav.build(data.decks,entries,includeClass);
 assert.ok(pts.every(p=>!(p.deck==='lec5'&&p.page>=77&&p.page<=110)),'CT excluded from exam navigation');
 assert.ok(pts.every(p=>!(p.deck==='lec8'&&p.page>=77)),'Untaught content not invented as priorities');
 assert.equal(Nav.next(data.decks,entries,'lec6',83,includeClass).deck,'lec8');
 assert.equal(Nav.next(data.decks,entries,'lec8',142,includeClass),null);
}
const snapshot=JSON.stringify(data);
assert.ok(!snapshot.includes('recRestColor@02:29:36'),'Unrelated conversation must not be published');
assert.ok(!snapshot.includes('recRestColor@02:02:40'),'Uncertain chatter must not be published');
const seconds=t=>t.split(':').map(Number).reduce((n,x)=>n*60+x,0);
for(const s of Object.values(data.sources).filter(x=>x.recording==='recColorMorph')){
 assert.ok(seconds(s.start)<48*60+11||seconds(s.start)>=58*60+12,'Break chatter must not be published');
 assert.ok(seconds(s.end)<=108*60+9,'Source cannot extend past the recording');
}
const signature=new Set();
for(const d of data.decks)for(const p of data.slides[d.id])if(p.note){
 const s=JSON.stringify(p.note.paragraphs);assert.ok(!signature.has(s),'Repeated range summary');signature.add(s);
}
assert.equal(signature.size,631);
console.log('PASS: 852 pages; 631 unique sourced notes; original PDFs; November 20 coverage and exam evidence; CT vs untaught scope; transcript privacy.');
