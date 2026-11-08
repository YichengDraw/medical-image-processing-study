'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const source=app.slice(0,app.indexOf('(async function init(){'));
const medical=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/content.json'),'utf8'));
const medicalState=JSON.stringify({last:['lec1',4],bookmarks:['lec1:4'],theme:'dark'});
const architectureState=JSON.stringify({last:['lec2',3],bookmarks:['lec2:3'],theme:'light'});
function environment(query){
 const nodes=new Map(),storage=new Map([['bmeb316-state',medicalState],['ai301-state',architectureState]]);
 const location={search:query,hash:'',href:'https://example.test/study/'+query,assign(url){this.assigned=url}};
 const document={querySelector(selector){
  if(!nodes.has(selector)){
   const classes=new Set();
   nodes.set(selector,{textContent:'',innerHTML:'',style:{},value:'',classList:{
    add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)},
    toggle(c,force){if(force??!classes.has(c))classes.add(c);else classes.delete(c)}
   },setAttribute(name,value){this[name]=value}});
  }
  return nodes.get(selector);
 }};
 const ctx=vm.createContext({URL,URLSearchParams,location,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fixture:null});
 vm.runInContext(source,ctx);
 return {ctx,storage,nodes,location,run:code=>vm.runInContext(code,ctx)};
}
const ai=environment('?course=ai301');
assert.equal(ai.run('course.data'),'ai301/data/content.json');
assert.equal(ai.run('stateKey'),'ai301-state');
assert.equal(ai.run('S.theme'),'light');
assert.equal(ai.run('S.star.has("lec2:3")'),true);
assert.equal(ai.run('S.star.has("lec1:4")'),false);
ai.ctx.fixture={decks:[{id:'lec2',audio:true,group:'Lecture 2',label:'Instructions',pages:3}],slides:{lec2:[
 {page:1,title:'Title',audioSupported:false,note:null},
 {page:2,title:'Scope',audioSupported:false,note:null},
 {page:3,title:'Instructions',audioSupported:true,note:{paragraphs:['Verified explanation.'],sourceIds:[]}}
]},assessment:{},sources:{},recordings:{}};
ai.run('S.data=fixture;S.deck=fixture.decks[0];courseInit()');
assert.deepEqual(Array.from(ai.run('route()')),['lec2',3]);
assert.equal(ai.nodes.get('#assessment-grid').classList.contains('hidden'),true);
assert.equal(ai.nodes.get('#assessment-grid').innerHTML,'');
assert.equal(ai.nodes.get('#brand-code').textContent,'SUSTech · AI301');
for(const p of [1,2]){
 ai.run('S.page='+p+';notes()');
 assert.equal(ai.nodes.get('#companion-panel').classList.contains('hidden'),true);
 assert.equal(ai.nodes.get('#study-grid').classList.contains('no-companion'),true);
}
ai.run('S.page=3;notes()');
assert.equal(ai.nodes.get('#companion-panel').classList.contains('hidden'),false);
assert.match(ai.nodes.get('#guide-container').innerHTML,/Verified explanation/);
assert.equal(ai.run('pageHasAudio(S.deck,{audioSupported:true,note:null})'),false);
assert.equal(ai.run('pageHasAudio(S.deck,{audioSupported:false,note:{paragraphs:["stale"]}})'),false);
ai.run('save()');
assert.equal(ai.storage.get('bmeb316-state'),medicalState,'Architecture cannot overwrite medical progress');
assert.deepEqual(JSON.parse(ai.storage.get('ai301-state')).last,['lec2',3]);
ai.run('switchCourse("bmeb316")');
assert.equal(ai.location.assigned,'https://example.test/study/');
const med=environment('');
med.ctx.fixture=medical;
med.run('S.data=fixture;S.deck=fixture.decks[0];courseInit()');
assert.equal(med.run('course.data'),'data/content.json');
assert.equal(med.run('stateKey'),'bmeb316-state');
assert.equal(med.run('S.theme'),'dark');
assert.equal(med.run('S.star.has("lec1:4")'),true);
assert.equal(med.run('pageHasAudio({audio:true},{note:{paragraphs:[]}})'),true,'Legacy medical page coverage stays compatible');
assert.equal(med.run('pageHasAudio({audio:false},{note:null})'),false);
assert.equal(med.nodes.get('#assessment-grid').classList.contains('hidden'),false);
assert.match(med.nodes.get('#assessment-grid').innerHTML,/40%/);
assert.deepEqual(Array.from(med.run('route()')),['lec1',4]);
med.location.hash='#'+medical.decks[1].id+'/18';
assert.deepEqual(Array.from(med.run('route()')),[medical.decks[1].id,18]);
med.location.hash='#%invalid';
assert.deepEqual(Array.from(med.run('route()')),['lec1',4]);
med.run('switchCourse("ai301")');
assert.equal(med.location.assigned,'https://example.test/study/?course=ai301');
assert.equal(med.storage.get('ai301-state'),architectureState,'Medical cannot overwrite architecture progress');
assert.equal(environment('?course=unknown').run('courseId'),'bmeb316');
assert.match(app,/fetch\(course\.data\+/,'Initialization loads the selected course');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.match(html,/\? "ai301-state" : "bmeb316-state"/,'Initial theme uses the selected course');
console.log('PASS: course routing, isolated progress/bookmarks/themes, mixed recording coverage, legacy medical compatibility and source-based assessment.');
