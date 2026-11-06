'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Nav=require('../focus-navigation.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/content.json'),'utf8'));
let count=0;
for(const scope of [false,true]){
  const points=Nav.build(data.decks,data.examGuide.entries,scope);
  assert.equal(new Set(points.map(x=>x.deck+':'+x.page)).size,points.length,'No duplicate destinations');
  for(const [index,d] of data.decks.entries()){
    for(let p=1;p<=d.pages;p++){
      const got=Nav.next(data.decks,data.examGuide.entries,d.id,p,scope);
      const expected=points.find(t=>t.order>index||t.order===index&&t.page>p)||null;
      assert.deepEqual(got,expected);
      if(got)assert(got.order>index||got.order===index&&got.page>p,'must move strictly forward');
      count++;
    }
  }
  const last=data.decks.at(-1);assert.equal(Nav.next(data.decks,data.examGuide.entries,last.id,last.pages,scope),null);
  console.log(scope?'Including classroom priorities:':'Confirmed exam/quiz only:',points.length,'unique destinations');
}
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec4p2',25,true).page,29);
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec4p2',26,true).page,29);
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec4p2',61,true),null);
assert.equal(Nav.next(data.decks,data.examGuide.entries,'lec4p2',12,false),null);
console.log('PASS:',count,'page/scope cases; duplicate, relative-order and end-of-course boundaries.');
