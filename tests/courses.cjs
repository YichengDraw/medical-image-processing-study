'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const FocusNavigation=require('../focus-navigation.js');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const source=app.slice(0,app.indexOf('(async function init(){'));
const medical=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/content.json'),'utf8'));
const medicalState=JSON.stringify({last:['lec1',4],bookmarks:['lec1:4'],theme:'dark'});
const architectureState=JSON.stringify({last:['lec2',3],bookmarks:['lec2:3'],theme:'light'});
const philosophyState=JSON.stringify({last:['lec3',2],bookmarks:['lec3:2'],theme:'dark'});
function environment(query){
 const nodes=new Map(),storage=new Map([['bmeb316-state',medicalState],['ai301-state',architectureState],['hum053-state',philosophyState]]);
 const location={search:query,hash:'',href:'https://example.test/study/'+query,assign(url){this.assigned=url}};
 const document={querySelector(selector){
  if(!nodes.has(selector)){
   const classes=new Set();
   nodes.set(selector,{textContent:'',innerHTML:'',style:{},value:'',classList:{
    add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)},
    toggle(c,force){if(force??!classes.has(c))classes.add(c);else classes.delete(c)}
   },setAttribute(name,value){this[name]=value},querySelectorAll(){return []}});
  }
  return nodes.get(selector);
 }};
 const ctx=vm.createContext({URL,URLSearchParams,location,document,FocusNavigation,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fixture:null});
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
med.run('switchCourse("hum053")');
assert.equal(med.location.assigned,'https://example.test/study/?course=hum053');
assert.equal(med.storage.get('hum053-state'),philosophyState,'Medical cannot overwrite philosophy progress');
const hum=environment('?course=hum053');
hum.ctx.fixture={decks:[{id:'lec3',audio:true,group:'第三讲',label:'孔子的仁与礼',pages:3}],slides:{lec3:[
 {page:1,title:'封面',audioSupported:false,note:null},
 {page:2,title:'仁与礼',audioSupported:true,note:{paragraphs:['解释仁与礼，并举一个直接的例子。'],sourceIds:['hum-r01-s001']}},
 {page:3,title:'课件补充',audioSupported:false,note:null}
]},assessment:{exam:50},assessmentLabels:{exam:'随堂考试'},sources:{'hum-r01-s001':{recording:'hum-r01',start:'12:34',excerpt:'教师原文选段'}},recordings:{'hum-r01':{title:'课堂录音',file:'课堂录音.docx'}},coverage:{recordings:10},examGuide:{summary:'闭卷；孔子、孟子、庄子。题型按录音证据说明。',categories:[{id:'explicit',label:'明确考核'},{id:'class',label:'课堂重点'},{id:'practice',label:'自拟练习'}],entries:[{id:'hum-practice',category:'practice',title:'练习：仁礼关系',body:'自拟练习，不是已知试题。',anchors:[{deck:'lec3',page:2}],sourceIds:[]}],note:'最新范围以本次通知为准。'}};
hum.run('S.data=fixture;S.deck=fixture.decks[0];courseInit();S.page=2;notes();renderExamHub()');
assert.equal(hum.run('course.data'),'hum053/data/content.json');
assert.equal(hum.run('stateKey'),'hum053-state');
assert.equal(hum.run('S.theme'),'dark');
assert.deepEqual(Array.from(hum.run('route()')),['lec3',2]);
assert.equal(hum.run('S.star.has("lec3:2")'),true);
assert.equal(hum.run('S.star.has("lec1:4")'),false);
assert.equal(hum.nodes.get('#course-select').value,'hum053');
assert.equal(hum.nodes.get('#brand-code').textContent,'SUSTech · HUM053');
assert.match(hum.nodes.get('#assessment-grid').innerHTML,/50%/);
assert.match(hum.nodes.get('#assessment-grid').innerHTML,/随堂考试/);
assert.doesNotMatch(hum.nodes.get('#assessment-grid').innerHTML,/Final Exam|40%/);
assert.equal(hum.nodes.get('#exam-subtitle').textContent,hum.ctx.fixture.examGuide.summary);
assert.match(hum.nodes.get('#guide-container').innerHTML,/教师原文选段/);
assert.match(hum.nodes.get('#exam-list').innerHTML,/自拟练习，不是已知试题/);
assert.equal(hum.run('nextFocus()'),null,'Self-authored practice does not become an explicit exam navigation target');
hum.run('S.page=3;notes();save()');
assert.equal(hum.nodes.get('#companion-panel').classList.contains('hidden'),true);
assert.equal(hum.storage.get('bmeb316-state'),medicalState);
assert.equal(hum.storage.get('ai301-state'),architectureState);
assert.deepEqual(JSON.parse(hum.storage.get('hum053-state')).last,['lec3',3]);
hum.location.hash='#lec3/1';
assert.deepEqual(Array.from(hum.run('route()')),['lec3',1]);
hum.run('switchCourse("ai301")');
assert.equal(hum.location.assigned,'https://example.test/study/?course=ai301');
hum.run('switchCourse("bmeb316")');
assert.equal(hum.location.assigned,'https://example.test/study/');
assert.equal(environment('?course=unknown').run('courseId'),'bmeb316');
assert.equal(environment('?course=__proto__').run('courseId'),'bmeb316');
assert.match(app,/fetch\(course\.data\+/,'Initialization loads the selected course');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.match(html,/<option value="hum053">中国哲学导论<\/option>/);
const themeScript=html.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const [query,expected] of [['?course=hum053','dark'],['?course=ai301',null],['', 'dark'],['?course=unknown','dark']]){
 let actual=null;
 vm.runInNewContext(themeScript,{URLSearchParams,location:{search:query},localStorage:{getItem:k=>new Map([['bmeb316-state',medicalState],['ai301-state',architectureState],['hum053-state',philosophyState]]).get(k)},document:{documentElement:{setAttribute(k,v){if(k==='data-theme')actual=v}}}});
 assert.equal(actual,expected,'Initial theme matches the selected course before app loading');
}
console.log('PASS: three-course routing, isolated progress/bookmarks/themes, mixed recording coverage, legacy course compatibility, philosophy exam labels and practice boundaries.');
