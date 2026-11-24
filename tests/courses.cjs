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
   nodes.set(selector,{textContent:'',innerHTML:'',style:{},value:'',scrollTop:0,scrollLeft:0,classList:{
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
// The shared hub must preserve evidence and filtering across all three courses.
const hubFixture={
 decks:[{id:'lec6',pages:8},{id:'lec6p2',pages:6}],
 sources:{question:{recording:'rec',start:'12:34',end:'12:50',excerpt:'为什么 <rs> 是地址基值？请同学回答。'}},
 recordings:{rec:{title:'课堂说明',file:'class.docx'}},
 examGuide:{
  categories:[{id:'explicit',label:'明确考核'},{id:'teacher',label:'老师强调 / 课堂提问'},{id:'quiz',label:'Quiz 复盘'},{id:'class',label:'一般整理 / 课件练习'},{id:'practice',label:'自拟练习'}],
  entries:[
   {id:'teacher-question',category:'teacher',title:'知识提问',body:'根据数据流分析。',anchors:[{deck:'lec6',page:3},{deck:'lec6',page:5},{deck:'lec6',page:3},{deck:'lec6p2',page:2}],sourceIds:['question'],teacherEvidence:[{kind:'question',sourceId:'question',quote:'为什么 <rs> 是地址基值？'}]},
   {id:'general',category:'class',title:'一般整理项目',body:'普通课堂讲述。',anchors:[{deck:'lec6',page:4}],sourceIds:[]},
   {id:'exam',category:'explicit',title:'明确考试要求',body:'老师明确说明。',anchors:[{deck:'lec6',page:7}],sourceIds:[]},
   {id:'practice',category:'practice',title:'自拟练习项目',body:'只作复习练习。',anchors:[{deck:'lec6',page:2}],sourceIds:[]}
  ],note:'按来源区分类别。'
 }
};
for(const query of ['', '?course=ai301', '?course=hum053']){
 const hub=environment(query);hub.ctx.fixture=hubFixture;
 hub.run('S.data=fixture;S.deck=fixture.decks[0];S.page=1;renderExamHub()');
 const markup=()=>hub.nodes.get('#exam-list').innerHTML;
 assert.match(markup(),/teacher-evidence/);
 assert.match(markup(),/12:34–12:50/,'The visible quote carries its source time');
 assert.match(hub.run('teacherEvidenceMarkup(fixture.examGuide.entries[0])'),/课堂说明 · 12:34–12:50/,'The visible quote identifies its recording, not just a timestamp');
 assert.match(markup(),/为什么 &lt;rs&gt; 是地址基值？/,'Evidence is rendered as text');
 assert.doesNotMatch(markup(),/<rs>/);
 assert.match(markup(),/<details class="inline-sources">/,'Full source excerpts remain collapsed');
 assert.equal(hub.nodes.get('#exam-subtitle').textContent,'','No repeated metadata banner without a course summary');
 assert.doesNotMatch(hub.nodes.get('#exam-filters').innerHTML,/data-category="quiz"/,'An empty unselected quiz category does not occupy the strip');
 assert.ok(hub.ctx.fixture.examGuide.categories.some(c=>c.id==='quiz'),'Hiding an empty filter leaves the category data intact');
 hub.run('S.examCategory="teacher";renderExamHub()');
 assert.match(markup(),/知识提问/);
 assert.doesNotMatch(markup(),/一般整理项目|自拟练习项目|明确考试要求/,'Teacher evidence is a distinct category');
 hub.run('S.examCategory="all"');
 hub.nodes.get('#exam-query').value='地址基值';
 hub.run('$("#exam-content").scrollTop=300');
 hub.nodes.get('#exam-filters').scrollLeft=180;
 hub.run('renderExamHub(true)');
 assert.match(markup(),/知识提问/,'Searching an evidence-only phrase finds its entry');
 assert.doesNotMatch(markup(),/一般整理项目|自拟练习项目|明确考试要求/);
 assert.equal(hub.nodes.get('#exam-content').scrollTop,0,'New filters/search results begin at the top');
 assert.equal(hub.nodes.get('#exam-filters').scrollLeft,180,'Searching does not reset a narrow category strip');
 assert.equal(hub.run('teacherEvidenceMarkup({category:"teacher",teacherEvidence:[{kind:"question",sourceId:"missing",quote:"unverified"}]})'),'','Missing sources do not produce teacher quotations');
 assert.match(hub.run('teacherEvidenceMarkup({category:"explicit",teacherEvidence:fixture.examGuide.entries[0].teacherEvidence})'),/teacher-evidence/,'An explicit exam-preparation entry can retain its classroom question evidence');
 assert.equal(hub.run('teacherEvidenceMarkup({category:"class",teacherEvidence:fixture.examGuide.entries[0].teacherEvidence})'),'','Ordinary entries are not silently promoted');
 assert.equal(hub.run('shortDeck("lec6")'),'L6');
 assert.equal(hub.run('shortDeck("lec6p2")'),'L6·2');
 assert.equal(hub.run('nextFocus().page'),3,'Teacher questions are included with classroom material');
 hub.run('S.focusIncludeClass=false');
 assert.equal(hub.run('nextFocus().page'),7,'Exam-only mode excludes teacher emphasis and general review');
 hub.run('S.focusIncludeClass=true;S.page=3');
 assert.equal(hub.run('nextFocus().page'),4,'Repeated teacher anchors do not re-enter later in the same deck');
 hub.run('S.page=7');
 assert.equal(hub.run('nextFocus().deck'),'lec6p2','A later part remains a separate navigation destination');
 assert.equal(hub.run('focusType(nextFocus())'),'老师强调 / 课堂提问');
 hub.nodes.get('#exam-list').innerHTML='<details open>已经展开的出处</details>';
 hub.nodes.get('#exam-content').scrollTop=250;
 hub.run('setFocusScope(false)');
 assert.equal(hub.nodes.get('#exam-list').innerHTML,'<details open>已经展开的出处</details>','Navigation preferences do not rebuild reading content or close its sources');
 assert.equal(hub.nodes.get('#exam-content').scrollTop,250);
 assert.equal(hub.nodes.get('#focus-include-class').checked,false);
 assert.equal(hub.nodes.get('#next-focus').disabled,true,'The navigation button is still updated when its scope changes');
 hub.run('setFocusScope(true)');
 hub.run('S.deck=fixture.decks[1];S.page=2');
 assert.equal(hub.run('nextFocus()'),null,'At the last representative, navigation never wraps');
}
const boundary=environment('?course=ai301');
boundary.ctx.fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../ai301/data/content.json'),'utf8'));
boundary.run('S.data=fixture;S.deck=deck("lec6p2");S.page=6;notes()');
assert.equal(boundary.nodes.get('#companion-panel').classList.contains('hidden'),false,'Pipelined datapath P6 shows the recorded explanation');
boundary.run('S.page=7;notes()');
assert.equal(boundary.nodes.get('#companion-panel').classList.contains('hidden'),true,'Turning to P7 closes the companion');
assert.equal(boundary.nodes.get('#study-grid').classList.contains('no-companion'),true,'P7 gives the PDF the full reading width');
boundary.run('S.page=6;notes()');
assert.equal(boundary.nodes.get('#companion-panel').classList.contains('hidden'),false,'Returning to P6 restores its explanation');
boundary.run('S.page=10;notes()');
assert.equal(boundary.nodes.get('#companion-panel').classList.contains('hidden'),false,'The November 23 writeback explanation begins at P10');
boundary.run('S.deck=deck("lec6p3");S.page=10;notes()');
assert.equal(boundary.nodes.get('#companion-panel').classList.contains('hidden'),false,'The recorded lesson includes revised forwarding conditions');
boundary.run('S.page=11;notes()');
assert.equal(boundary.nodes.get('#companion-panel').classList.contains('hidden'),true,'The preview page following the recorded lesson has the full-width PDF');
console.log('PASS: three-course routing/state/coverage, distinct teacher evidence, quote search, escaped excerpts, filtering and strictly forward cross-part navigation.');
