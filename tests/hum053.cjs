'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Nav=require('../focus-navigation.js');
const root=path.join(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'hum053/data',name),'utf8'));
const data=read('content.json');
const review=read('review-manifest.json');
const sourceFiles=read('source-files.json');
const expectedPages=[43,44,36,30,34,49,37,50,58,57];
const email=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const noteTexts=new Set();
let pages=0,notes=0,cases=0;

assert.deepEqual(data.decks.map(d=>d.id),expectedPages.map((_,i)=>'lec'+(i+1)),'Use actual lecture order rather than uploaded filename prefixes');
assert.deepEqual(data.assessment,{exam:50});
assert.equal(data.assessmentLabels.exam,'随堂考试');
assert.equal(Object.keys(data.recordings).length,10);
assert.equal(data.examGuide.entries.length,48);
assert.equal(new Set(data.examGuide.entries.map(e=>e.id)).size,48);
assert.deepEqual(new Set(data.examGuide.categories.map(c=>c.id)),new Set(['explicit','scope','class','comparison','practice','strategy']));

for(const [index,deck] of data.decks.entries()){
  const proof=review.decks.find(d=>d.id===deck.id);
  const original=sourceFiles.slides.find(d=>d.deck===deck.id);
  assert.equal(deck.pages,expectedPages[index]);
  assert.equal(data.slides[deck.id].length,deck.pages);
  const pdf=fs.readFileSync(path.join(root,deck.path));
  const digest=crypto.createHash('sha256').update(pdf).digest('hex');
  assert.equal(digest,proof.pdfSha256,'Rendered PDF matches reviewed version');
  assert.equal(digest,original.pdfSha256,'PDF provenance agrees with review');
  assert.deepEqual(proof.visuallyReviewedPages,Array.from({length:deck.pages},(_,i)=>i+1));
  const explained=[];
  for(const [i,page] of data.slides[deck.id].entries()){
    pages++;
    assert.equal(page.page,i+1);
    assert.equal(page.visualReviewed,true);
    assert.equal(page.audioSupported,Boolean(page.note),'Audio support is decided for each individual page');
    assert.ok(page.title&&!/^\d+$/.test(page.title)&&!page.title.includes('待核对'));
    assert.ok(!email.test((page.sourceText||'')+(page.searchText||'')),'Search text omits personal contact details');
    if(!page.note)continue;
    notes++;explained.push(page.page);
    assert.equal(page.note.page,page.page);
    assert.ok(page.note.sourceIds.length,'Each explanation needs locatable classroom evidence');
    for(const sid of page.note.sourceIds){
      const source=data.sources[sid];
      assert.ok(source&&data.recordings[source.recording]);
      assert.ok(source.start&&source.excerpt.trim());
    }
    assert.ok(page.note.paragraphs.every(p=>typeof p==='string'&&p.trim()));
    const text=page.note.paragraphs.join('\n');
    assert.ok(!noteTexts.has(text),'An explanation cannot be a repeated generic range template');
    assert.ok(!email.test(text));
    noteTexts.add(text);
  }
  assert.deepEqual(explained,proof.explainedPages);
}
assert.equal(pages,438);assert.equal(notes,369);
assert.deepEqual(data.coverage,{visualPages:438,explainedPages:369,slidesOnlyPages:69,recordings:10,examEntries:48});
for(let p=13;p<=44;p++)assert.equal(data.slides.lec2[p-1].note,null,'The second introduction recording does not cover the rest of that deck');
for(let p=9;p<=12;p++)assert.ok(data.slides.lec2[p-1].note.sourceIds.every(s=>data.sources[s].recording==='rec20'),'Repeated introduction slides identify their earlier, content-matched recording');
for(let p=34;p<=45;p++)assert.equal(data.slides.lec9[p-1].note,null,'Unmatched Zhuangzi pages remain PPT-only');
assert.ok(data.slides.lec7[13].title.includes('孟子'),'Mencius starts at Lecture 7 P14');
assert.ok(data.slides.lec8[33].title.includes('庄子'),'Zhuangzi starts at Lecture 8 P34, regardless of the cover');

const order=new Map(data.decks.map((d,i)=>[d.id,i]));
const ordinal=p=>order.get(p.deck)*1000+p.page;
const key=p=>p.deck+':'+p.page;
for(const includeClass of [false,true]){
  const allowed=new Set(includeClass?['explicit','class']:['explicit']);
  // Construct the contract independently of Nav.build: one earliest anchor per topic/deck.
  const expected=new Map();
  for(const entry of data.examGuide.entries){
    for(const anchor of entry.anchors){
      assert.ok(order.has(anchor.deck));
      assert.ok(Number.isInteger(anchor.page)&&anchor.page>=1&&anchor.page<=data.decks[order.get(anchor.deck)].pages);
    }
    for(const sid of entry.sourceIds||[])assert.ok(data.sources[sid]);
    if(!allowed.has(entry.category))continue;
    for(const deck of data.decks){
      const anchors=entry.anchors.filter(a=>a.deck===deck.id);
      if(!anchors.length)continue;
      const first={deck:deck.id,page:Math.min(...anchors.map(a=>a.page))};
      if(!expected.has(key(first)))expected.set(key(first),{...first,ids:new Set()});
      expected.get(key(first)).ids.add(entry.id);
    }
  }
  const expectedPoints=[...expected.values()].sort((a,b)=>ordinal(a)-ordinal(b));
  const points=Nav.build(data.decks,data.examGuide.entries,includeClass);
  assert.deepEqual(points.map(key),expectedPoints.map(key),'Only earliest anchors of allowed topics become destinations');
  assert.equal(new Set(points.map(key)).size,points.length,'Topics sharing a page produce one destination');
  for(const point of points){
    assert.deepEqual(new Set(point.entryIds),expected.get(key(point)).ids,'Repeated anchors cannot re-enter navigation later in a deck');
    assert.ok(point.categories.every(c=>allowed.has(c)),'Practice, comparison, scope and strategy never become exam focus targets');
  }
  for(const deck of data.decks){
    for(let page=1;page<=deck.pages;page++){
      const current={deck:deck.id,page};
      const target=expectedPoints.find(p=>ordinal(p)>ordinal(current));
      const next=Nav.next(data.decks,data.examGuide.entries,deck.id,page,includeClass);
      assert.equal(next?key(next):null,target?key(target):null,'Next focus must be the nearest strictly later representative');
      if(next)assert.ok(ordinal(next)>ordinal(current),'The current page can never be selected again');
      cases++;
    }
  }
  const last=expectedPoints.at(-1);
  assert.equal(Nav.next(data.decks,data.examGuide.entries,last.deck,last.page,includeClass),null,'The last target does not wrap to earlier topics');
  assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec10',57,includeClass),null,'The last course page never wraps');
  console.log(`${includeClass?'Including classroom priorities':'Confirmed exam only'}: ${points.length} unique HUM053 destinations`);
}
console.log(`PASS: HUM053 ${pages} reviewed pages, ${notes} unique explanations, ${pages-notes} PPT-only pages, 10 recordings, 48 entries and ${cases} navigation cases.`);
