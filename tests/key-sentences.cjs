'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const source=app.slice(0,app.indexOf('(async function init(){'));
const decode=text=>text.replace(/&(amp|lt|gt|quot|#39);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[name]));
let total=0,slidesOnly=0;
for(const [course,file] of [['bmeb316','data/content.json'],['ai301','ai301/data/content.json'],['hum053','hum053/data/content.json']]){
 const data=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const nodes=new Map();
 const document={querySelector(selector){
  if(!nodes.has(selector)){
   const classes=new Set();
   nodes.set(selector,{innerHTML:'',textContent:'',scrollTop:0,classList:{
    add(name){classes.add(name)},remove(name){classes.delete(name)},contains(name){return classes.has(name)},
    toggle(name,value){if(value??!classes.has(name))classes.add(name);else classes.delete(name)}
   }});
  }
  return nodes.get(selector);
 }};
 const ctx=vm.createContext({URLSearchParams,document,location:{search:'?course='+course},localStorage:{getItem(){return null}},fixture:data});
 vm.runInContext(source,ctx);
 vm.runInContext('S.data=fixture',ctx);
 let count=0;
 for(const deck of data.decks){
  ctx.currentDeck=deck;
  vm.runInContext('S.deck=currentDeck',ctx);
  for(const page of data.slides[deck.id]){
   const label=course+'/'+deck.id+'/'+page.page;
   ctx.currentPage=page.page;
   vm.runInContext('S.page=currentPage;notes()',ctx);
   if(!page.note){
    assert.ok(nodes.get('#companion-panel').classList.contains('hidden'),label+': slides-only page hides the explanation');
    slidesOnly++;
    continue;
   }
   assert.equal(nodes.get('#companion-panel').classList.contains('hidden'),false,label);
   const chosen=page.note.keySentence;
   assert.ok(chosen&&typeof chosen.text==='string',label+': one editorial selection is required');
   const html=nodes.get('#guide-container').innerHTML;
   const marks=[...html.matchAll(/<mark\b[^>]*>([\s\S]*?)<\/mark>/g)];
   assert.equal(marks.length,1,label+': exactly one visible key sentence');
   assert.equal(decode(marks[0][1]),chosen.text,label+': highlight is the selected original sentence');
   const paragraphs=vm.runInContext('noteParagraphsMarkup(slide().note)',ctx);
   const restored=[...paragraphs.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match=>decode(match[1].replace(/<\/?mark\b[^>]*>/g,'')));
   assert.deepEqual(restored,page.note.paragraphs,label+': adding a highlight preserves every original paragraph');
   count++;
  }
 }
 assert.equal(count,data.coverage.explainedPages,course+': every explained page is covered');
 total+=count;
 console.log('PASS:',course,count,'pages with exactly one original key sentence.');
 // Notes remain safe when a selected sentence contains HTML-like text or symbols.
 ctx.sample={paragraphs:['前句。若 a < b & c > d，则输出 "<img src=x onerror=alert(1)>"。后句。'],keySentence:{paragraph:0,text:'若 a < b & c > d，则输出 "<img src=x onerror=alert(1)>"。'}};
 const escaped=vm.runInContext('noteParagraphsMarkup(sample)',ctx);
 assert.ok(!escaped.includes('<img'),course+': highlight must not introduce executable markup');
 assert.equal(decode(escaped.replace(/<\/?(?:p|mark)\b[^>]*>/g,'')),ctx.sample.paragraphs[0]);
}
console.log('PASS:',total,'highlighted explanations;',slidesOnly,'slides-only pages; paragraph preservation and HTML escaping.');
