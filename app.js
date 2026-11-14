/* Course study space · original PDF + teacher-context companion */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const courses={
 bmeb316:{code:"BMEB316",name:"医学图像处理",data:"data/content.json",footer:"Medical Image Processing / Yiming Li",search:"搜索 Nyquist、卷积、位深、相位…",examSearch:"零频、补零、不考、Quiz、展示时间…"},
 ai301:{code:"AI301",name:"计算机体系结构",data:"ai301/data/content.json",footer:"AI301 / Computer System Architecture",search:"搜索 MIPS、补码、寄存器、数据通路…",examSearch:"指令、性能、Quiz、实验、考核范围…"},
 hum053:{code:"HUM053",name:"中国哲学导论",data:"hum053/data/content.json",footer:"HUM053 / 中国哲学导论",search:"搜索 孔子、仁礼、孟子、性善、庄子、齐物…",examSearch:"考试形式、孔子、孟子、庄子、复习练习…"}
};
const requestedCourse=new URLSearchParams(location.search).get("course");
const courseId=Object.hasOwn(courses,requestedCourse)?requestedCourse:"bmeb316";
const primaryRecording={hum053:{lec1:"rec20",lec2:"rec19",lec3:"rec18",lec4:"rec17",lec5:"rec16",lec6:"rec15",lec7:"rec14",lec8:"rec13",lec9:"rec12",lec10:"rec11"}};
function sameLectureAudio(d,p){
 const primary=primaryRecording[courseId]?.[d?.id];
 return Boolean(primary&&p?.note?.sourceIds?.some(id=>String(id).startsWith(primary+"-")));
}
function noteSourceScope(d,p){
 if(!p?.note?.sourceIds?.length)return "";
 const primary=primaryRecording[courseId]?.[d?.id],same=sameLectureAudio(d,p);
 const hasOther=p.note.sourceIds.some(id=>!String(id).startsWith(primary+"-"));
 return same?(hasOther?"本讲录音为主；其他讲次仅作补充":"本讲录音"):"跨讲复述：来源是老师在其他讲次对相同内容的讲解，不代表本讲当时录音";
}
function hum053Coverage(){
 let same=0,cross=0,none=0;
 for(const d of S.data.decks)for(const p of S.data.slides[d.id]){
  if(!p.note)none++;else if(sameLectureAudio(d,p))same++;else cross++;
 }
 return {same,cross,none};
}
const course=courses[courseId];
const stateKey=courseId+"-state";
const S={data:null,deck:null,page:1,cache:new Map(),pending:new Map(),task:null,seq:0,fit:"page",panel:true,star:new Set(),matches:[],sel:0,collapsed:false,libraryCollapsed:false,theme:"light",focusIncludeClass:true,examCategory:"all",modalReturnFocus:null};
let saved={};try{saved=JSON.parse(localStorage.getItem(stateKey)||"{}")||{}}catch{}
if(Array.isArray(saved.bookmarks))S.star=new Set(saved.bookmarks);
if(saved.panel!==undefined)S.panel=!!saved.panel;
if(saved.fit==="width")S.fit="width";
if(saved.libraryCollapsed===true)S.libraryCollapsed=true;
if(saved.theme==="dark")S.theme="dark";
if(saved.focusIncludeClass===false)S.focusIncludeClass=false;
const deck=id=>S.data&&S.data.decks.find(x=>x.id===id);
const slide=()=>S.data&&S.deck&&S.data.slides[S.deck.id][S.page-1];
const key=(d,p)=>d+":"+p;
const pageHasAudio=(d,p)=>Boolean(p&&(typeof p.audioSupported==="boolean"?p.audioSupported&&p.note:d?.audio));
function save(){try{localStorage.setItem(stateKey,JSON.stringify({last:[S.deck.id,S.page],bookmarks:[...S.star],panel:S.panel,fit:S.fit,libraryCollapsed:S.libraryCollapsed,theme:S.theme,focusIncludeClass:S.focusIncludeClass}))}catch{}}
function route(){let h=location.hash.slice(1).match(/^([a-z0-9]+)\/(\d+)$/i);if(h&&deck(h[1]))return [h[1],Number(h[2])];return saved.last&&deck(saved.last[0])?saved.last:[S.data.decks[0].id,1]}
function routeWrite(id,p,replace=false){const h="#"+id+"/"+p;if(location.hash===h)return;if(replace)history.replaceState(null,"",h);else history.pushState(null,"",h)}
function courseInit(){
 $("#course-select").value=courseId;
 $("#brand-code").textContent="SUSTech · "+course.code;
 $("#brand-name").textContent=course.name;
 $("#course-footer").textContent=course.footer;
 $("#search-box").placeholder=course.search;
 $("#exam-query").placeholder=course.examSearch;
 $("#search-footer").textContent="可搜索 "+S.data.decks.length+" 份课件的原文及伴读笔记 · Enter 跳转 · Esc 关闭";
 document.querySelector('meta[name="description"]').setAttribute("content",course.code+" "+course.name+"：原始课件与课堂讲解逐页对照，考核重点注明来源。");
 const labels={exam:"Final Exam",projects:"Projects",presentation:"Presentation",quiz:"Quiz",attendance:"Attendance",...(S.data.assessmentLabels||{})};
 const assessment=S.data.assessment||{},values=Object.entries(labels).filter(([id])=>typeof assessment[id]==="number"&&Number.isFinite(assessment[id]));
 const grid=$("#assessment-grid");grid.classList.toggle("hidden",!values.length);
 grid.innerHTML=values.map(([id,label])=>'<div><b>'+esc(assessment[id])+'%</b><span>'+esc(label)+'</span></div>').join('');
}
function switchCourse(id){
 if(!Object.hasOwn(courses,id)||id===courseId)return;
 if(S.deck)save();
 const url=new URL(location.href);
 if(id!=="bmeb316")url.searchParams.set("course",id);else url.searchParams.delete("course");
 url.hash="";location.assign(url.href);
}
function navInit(){
 const nav=$("#deck-list");nav.innerHTML="";
 S.data.decks.forEach(d=>{
  const b=document.createElement("button");b.className="deck-button";b.dataset.deck=d.id;
  b.innerHTML='<span class="deck-color" style="background:'+esc(d.color)+'"></span><span class="deck-lines"><span class="deck-name">'+esc(d.group+" · "+d.label.replace(/ · .*/,""))+'</span><span class="deck-desc">'+esc(d.cn)+'</span></span><span class="deck-number">'+d.pages+'</span>';
  b.addEventListener("click",()=>navigate(d.id,1));nav.appendChild(b);
 });
 $("#deck-counter").textContent=S.data.decks.length+" 份";
}
function navUpdate(){document.querySelectorAll(".deck-button").forEach(e=>e.classList.toggle("active",e.dataset.deck===S.deck.id))}
function pageIndex(){
 const el=$("#page-index");el.innerHTML="";
 S.data.slides[S.deck.id].forEach(p=>{
  const b=document.createElement("button");b.className="page-index-entry";b.dataset.page=p.page;
  b.innerHTML='<span class="idx-num">'+String(p.page).padStart(2,"0")+'</span><span class="idx-title">'+esc(p.title)+'</span>';
  b.title="P"+p.page+" · "+p.title;b.addEventListener("click",()=>navigate(S.deck.id,p.page));el.appendChild(b);
 });
 indexUpdate(true);
}
function indexUpdate(scroll=false){
 const el=$("#page-index");
 [...el.children].forEach(b=>b.classList.toggle("active",Number(b.dataset.page)===S.page));
 if(scroll)el.querySelector(".active")?.scrollIntoView({block:"nearest",behavior:"instant"});
}
function headUpdate(){
 const d=S.deck,p=slide();
 $("#crumb-lecture").textContent=d.group+" · "+d.label;
 $("#slide-section").textContent=d.group.toUpperCase();
 $("#lecture-subname").textContent=d.label;
 $("#slide-title").textContent=p.title||"原始幻灯片";
 $("#slide-summary").textContent=d.cn+"  ·  原始幻灯片 P"+S.page;
 $("#lecture-progress-label").textContent=S.page+" / "+d.pages;
 $("#lecture-progress-bar").style.width=(100*S.page/d.pages).toFixed(2)+"%";
 $("#page-input").value=S.page;$("#page-input").max=d.pages;
 $("#page-total").textContent="/ "+d.pages;$("#prev-slide").disabled=S.page<=1;$("#next-slide").disabled=S.page>=d.pages;
 $("#pdf-link").href=d.path;$("#pdf-link").download=d.id+".pdf";
 const star=S.star.has(key(d.id,S.page));$("#star-btn").textContent=star?"★":"☆";$("#star-btn").classList.toggle("starred",star);
 const hasAudio=pageHasAudio(d,p);
 $("#note-status").textContent=!hasAudio?"本页未提供对应录音":sameLectureAudio(d,p)?"逐页核对 · 本讲录音":"逐页核对 · 跨讲复述";
 $("#toggle-panel").style.display=hasAudio?"":"none";$("#toggle-panel").textContent=S.panel?"隐藏讲解":"显示讲解";
 updateFocusButton();
 document.title=p.title+" · "+d.group+" | "+course.code;
}
function sourceMarkup(ids,external=[]){
 const records=S.data.recordings||{},sources=S.data.sources||{};
 const rows=(ids||[]).map(id=>{
  const x=sources[id];if(!x)return "";
  const r=records[x.recording]||{};
  return '<div class="source-line"><strong>'+esc(r.title||x.recording)+' · '+esc(x.start)+(x.end?'–'+esc(x.end):'')+'</strong><span class="source-filename">'+esc(r.file||'')+'</span><p>'+esc(x.excerpt)+'</p></div>';
 }).join('');
 const links=external.filter(x=>/^https:\/\//.test(x.url)).map(x=>'<p><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label)+' ↗</a></p>').join('');
 if(!rows&&!links)return '';
 return '<details class="inline-sources"><summary>出处与核对线索'+(ids?.length?' · '+ids.length+'段课堂转写':'')+'</summary><div class="source-caption">按内容对应，不代表精确翻页时间；自动转写可能有错词。省略处用…标记。</div>'+rows+links+'</details>';
}
function notes(){
 const grid=$("#study-grid"),panel=$("#companion-panel"),d=S.deck,p=slide();
 if(!pageHasAudio(d,p)||!S.panel){panel.classList.add("hidden");grid.classList.add("no-companion");return}
 panel.classList.remove("hidden");grid.classList.remove("no-companion");
 const n=p.note;
 $("#source-badge").textContent=n?.sourceIds?.length?(sameLectureAudio(d,p)?"课件 + 本讲录音":"课件 + 跨讲复述"):"原始课件逐页解读";
 $("#source-badge").classList.toggle("verified",Boolean(n?.sourceIds?.length));
 let html='<article class="page-explanation"><div class="explanation-page">'+esc(d.group)+' · 第 '+S.page+' 页</div><h2>'+esc(p.title)+'</h2>';
 const scope=noteSourceScope(d,p);if(scope)html+='<div class="explanation-page">来源性质：'+esc(scope)+'</div>';
 if(n){html+=n.paragraphs.map(t=>'<p>'+esc(t)+'</p>').join('');html+=sourceMarkup(n.sourceIds,n.externalSources||[])}
 else html+='<p>本页尚无可核对的逐页注释，请以左侧原始课件为准。</p>';
 html+='</article>';
 $("#guide-container").innerHTML=html;$(".companion-scroll").scrollTop=0;
}

async function loadPDF(d){
 if(S.cache.has(d.id))return S.cache.get(d.id);
 if(S.pending.has(d.id))return S.pending.get(d.id);
 if(!window.pdfjsLib)throw Error("PDF.js 脚本未载入");
 const pending=pdfjsLib.getDocument({url:d.path,cMapPacked:true}).promise;
 S.pending.set(d.id,pending);
 try{const pdf=await pending;S.cache.set(d.id,pdf);return pdf}finally{S.pending.delete(d.id)}
}
async function draw(){
 const generation=++S.seq,canvas=$("#pdf-canvas"),stage=$("#slide-stage"),loading=$("#pdf-loading"),error=$("#pdf-error");
 loading.classList.remove("hidden");error.classList.add("hidden");
 if(S.task){try{S.task.cancel()}catch{}S.task=null}
 try{
  const pdf=await loadPDF(S.deck);if(S.seq!==generation)return;
  const page=await pdf.getPage(S.page);if(S.seq!==generation)return;
  const base=page.getViewport({scale:1});
  const w=Math.max(280,stage.clientWidth-45),h=Math.max(220,stage.clientHeight-42);
  const factor=S.fit==="width"?w/base.width:Math.min(w/base.width,h/base.height);
  const viewport=page.getViewport({scale:factor}),pixelRatio=Math.min(window.devicePixelRatio||1,2);
  const context=canvas.getContext("2d",{alpha:false});
  canvas.width=Math.round(viewport.width*pixelRatio);canvas.height=Math.round(viewport.height*pixelRatio);
  canvas.style.width=Math.round(viewport.width)+"px";canvas.style.height=Math.round(viewport.height)+"px";
  canvas.setAttribute("aria-label",S.deck.group+" 第 "+S.page+" 页幻灯片");
  S.task=page.render({canvasContext:context,viewport,transform:[pixelRatio,0,0,pixelRatio,0,0],background:"#ffffff"});
  await S.task.promise;if(S.seq===generation)loading.classList.add("hidden");
 }catch(ex){
  if(S.seq!==generation||ex?.name==="RenderingCancelledException")return;
  console.error("PDF.js failed",ex);
  loading.classList.add("hidden");error.classList.remove("hidden");
  error.textContent="幻灯片加载失败："+String(ex?.message||ex)+"。可点击「原始 PDF」查看文件。";
 }
}
function updateLibraryToggle(){
 const collapsed=S.libraryCollapsed;
 const mobile=window.matchMedia("(max-width: 750px)").matches;
 const expanded=mobile?$("#library").classList.contains("open"):!collapsed;
 $("#app").classList.toggle("library-collapsed",collapsed);
 $("#menu-trigger").setAttribute("aria-expanded",String(expanded));
 $("#menu-trigger").setAttribute("aria-label",mobile?(expanded?"收起课程目录":"打开课程目录"):(collapsed?"展开左侧目录":"收起左侧目录"));
 $("#menu-trigger").title=mobile?"打开/收起课程目录":(collapsed?"展开左侧目录（]）":"收起左侧目录（]）");
}
function toggleLibrary(){
 if(window.matchMedia("(max-width: 750px)").matches){
  if($("#library").classList.contains("open"))closeLibrary();else openLibrary();
  return;
 }
 S.libraryCollapsed=!S.libraryCollapsed;
 updateLibraryToggle();
 save();
 // Re-fit PDF after available width changes; ResizeObserver covers subsequent resizes.
 requestAnimationFrame(()=>setTimeout(()=>{if(S.deck)draw()},80));
}
function updateTheme(){
 const dark=S.theme==="dark";
 document.documentElement.setAttribute("data-theme",S.theme);
 $("#theme-toggle").textContent=dark?"☀":"☾";
 $("#theme-toggle").setAttribute("aria-label",dark?"切换亮色模式":"切换暗色模式");
 $("#theme-toggle").setAttribute("aria-pressed",String(dark));
 $("#theme-toggle").title=dark?"切换亮色模式":"切换暗色模式（纯黑背景）";
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.setAttribute("content",dark?"#000000":"#f7f8fc");
}
function toggleTheme(){
 S.theme=S.theme==="dark"?"light":"dark";
 updateTheme();
 save();
}
function closeLibrary(){$("#library").classList.remove("open");$("#scrim").classList.add("hidden");updateLibraryToggle()}
function openLibrary(){$("#library").classList.add("open");$("#scrim").classList.remove("hidden");updateLibraryToggle()}
function navigate(id,p,write=true){
 const d=deck(id);if(!d)return;
 const changed=S.deck?.id!==d.id;S.deck=d;S.page=clamp(Math.round(Number(p)||1),1,d.pages);
 if(changed){navUpdate();pageIndex()}
 indexUpdate(true);headUpdate();notes();draw();
 if(write)routeWrite(id,S.page);
 save();if(window.innerWidth<750)closeLibrary();
}
function turn(delta){if(S.deck&&S.page+delta>=1&&S.page+delta<=S.deck.pages)navigate(S.deck.id,S.page+delta)}
function shortDeck(d){return d.startsWith('lab')?'Lab '+d.slice(3):d.replace('lec','L').replace('p','·')}
function nextFocus(){
 return FocusNavigation.next(S.data.decks,S.data.examGuide.entries,S.deck.id,S.page,S.focusIncludeClass);
}
function focusType(p){return p.categories.includes('explicit')?'明确考核':p.categories.includes('quiz')?'Quiz复盘':'课堂重点（非必考）'}
function updateFocusButton(){
 const n=nextFocus(),b=$("#next-focus");b.disabled=!n;
 b.textContent=n?'下个考点 · '+(n.deck===S.deck.id?'':shortDeck(n.deck)+' ')+'P'+n.page+' →':'无后续考点';
 b.title=n?focusType(n)+'：'+n.titles.join('；')+' · 严格从当前页向后，不回绕':'当前导航范围内没有更后面的考点。可打开考核中心查看全部，或包含课堂重点。';
}
function jumpExam(){const n=nextFocus();if(n)navigate(n.deck,n.page);else updateFocusButton()}
function renderExamHub(){
 const guide=S.data.examGuide,cats=guide.categories,all=guide.entries;
 const term=$("#exam-query").value.trim().toLowerCase();
 const filtered=all.filter(e=>(S.examCategory==='all'||e.category===S.examCategory)&&(!term||(e.title+' '+e.body+' '+(e.status||'')).toLowerCase().includes(term)));
 const cov=courseId==="hum053"?hum053Coverage():null;$("#exam-subtitle").textContent=(guide.summary||all.length+'条 · 明确考核与课堂重点分开标注')+(cov?' · 10份录音：本讲录音支撑 '+cov.same+' 页，跨讲复述 '+cov.cross+' 页，无讲授来源 '+cov.none+' 页（仅显示课件）':' · '+S.data.coverage.recordings+'份录音转写');
 $("#exam-filters").innerHTML=[{id:'all',label:'全部'},...cats].map(c=>'<button data-category="'+esc(c.id)+'" class="exam-filter '+(S.examCategory===c.id?'selected':'')+'" aria-pressed="'+(S.examCategory===c.id)+'">'+esc(c.label)+' <span>'+all.filter(e=>c.id==='all'||e.category===c.id).length+'</span></button>').join('');
 $("#exam-filters").querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{S.examCategory=b.dataset.category;renderExamHub()}));
 $("#focus-include-class").checked=S.focusIncludeClass;
 const n=nextFocus();
 $("#focus-position").textContent='当前位置：'+shortDeck(S.deck.id)+' P'+S.page+'。'+(n?'下一个：'+shortDeck(n.deck)+' P'+n.page+' · '+focusType(n)+'。':'当前范围内无更后面的考点，不会绕回开头。')+' 同一主题在同一份课件只导航一个代表页。';
 const label=id=>cats.find(x=>x.id===id)?.label||id;
 $("#exam-list").innerHTML=filtered.length?filtered.map(e=>'<article class="exam-item"><div class="exam-item-heading"><span class="exam-category category-'+esc(e.category)+'">'+esc(label(e.category))+'</span><h3>'+esc(e.title)+'</h3></div>'+(e.status?'<span class="exam-status">'+esc(e.status)+'</span>':'')+'<p>'+esc(e.body)+'</p><div class="exam-anchors">'+e.anchors.map(a=>'<button class="exam-anchor" data-deck="'+esc(a.deck)+'" data-page="'+a.page+'">'+shortDeck(a.deck)+' · P'+a.page+' ↗</button>').join('')+'</div>'+sourceMarkup(e.sourceIds)+'</article>').join(''):'<p class="exam-empty">当前分类没有匹配项。试试“全部”或其他关键词。</p>';
 $("#exam-list").querySelectorAll('.exam-anchor').forEach(b=>b.addEventListener('click',()=>{closeModal('#exam-modal');navigate(b.dataset.deck,Number(b.dataset.page))}));
 $("#exam-source-policy").textContent=guide.note;
}
function openExamHub(){renderExamHub();openModal('#exam-modal');$("#exam-query").focus()}
function copyNote(){
 const p=slide(),n=p?.note;if(!n)return;
 const sourceLines=(n.sourceIds||[]).map(id=>{const s=S.data.sources[id],r=S.data.recordings[s.recording];return r.title+' '+s.start});
 const text=[S.deck.group+' '+S.deck.label+' · P'+S.page,p.title,...n.paragraphs,sourceLines.length?'课堂出处：'+sourceLines.join('；'):'来源：本页原始课件'].join('\n\n');
 navigator.clipboard.writeText(text).then(()=>{$('#copy-note').textContent='已复制 ✓';setTimeout(()=>$('#copy-note').textContent='复制讲解',1400)}).catch(()=>alert('浏览器未获得剪贴板权限，请手动复制。'));
}
function openModal(selector){S.modalReturnFocus=document.activeElement;closeLibrary();$(selector).classList.remove('hidden')}
function closeModal(selector){const el=$(selector);if(el.classList.contains('hidden'))return;el.classList.add('hidden');if(S.modalReturnFocus?.isConnected)S.modalReturnFocus.focus({preventScroll:true})}
function search(q){
 const str=q.trim().toLowerCase(),found=[];if(!str)return found;
 for(const d of S.data.decks){
  for(const p of S.data.slides[d.id]){
   if(str==="@star"){if(!S.star.has(key(d.id,p.page)))continue}
   else if(!(p.title+" "+(p.note?.paragraphs.join(" ")||"")+" "+p.searchText).toLowerCase().includes(str))continue;
   const score=(p.title.toLowerCase().includes(str)?6:0)+((p.note?.paragraphs.join(" ")||"").toLowerCase().includes(str)?3:0)+(p.examIds?.length?1:0);
   found.push({deck:d,page:p,score});
  }
 }
 return found.sort((a,b)=>b.score-a.score).slice(0,45);
}
function refreshSearch(){
 const q=$("#search-box").value,area=$("#search-results");
 S.matches=search(q);S.sel=0;
 if(!q.trim()){area.innerHTML='<div class="search-empty">搜索范围包括全部课件正文和伴读笔记。<br>输入 <b>@star</b> 可查看已收藏的页面。</div>';return}
 if(!S.matches.length){area.innerHTML='<div class="search-empty">找不到 '+esc(q)+'，请换一个关键词或使用英文术语。</div>';return}
 area.innerHTML=S.matches.map((r,i)=>
  '<button class="search-result '+(i===0?"active":"")+'" data-i="'+i+'"><span class="result-page">P '+r.page.page+'</span><span><span class="result-title">'+esc(r.page.title)+'</span><span class="result-desc">'+esc(r.deck.group+" · "+r.deck.cn)+(r.page.note?.sourceIds?.length?" · 含课堂讲授线索":"")+'</span></span></button>'
 ).join("");
 area.querySelectorAll(".search-result").forEach(b=>b.addEventListener("click",()=>goResult(Number(b.dataset.i))));
}
function goResult(i){
 const r=S.matches[i];if(!r)return;
 closeModal("#search-modal");navigate(r.deck.id,r.page.page);$("#search-box").blur();
}
function focusResult(){
 $("#search-results").querySelectorAll(".search-result").forEach((r,i)=>r.classList.toggle("active",i===S.sel));
 $("#search-results").querySelector(".active")?.scrollIntoView({block:"nearest"});
}
function togglePanel(){
 if(!pageHasAudio(S.deck,slide()))return;
 S.panel=!S.panel;notes();headUpdate();save();setTimeout(draw,90);
}
function keydown(e){
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 const input=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||"");
 const searchOpen=!$("#search-modal").classList.contains("hidden");
 const examOpen=!$("#exam-modal").classList.contains("hidden");
 if(e.key==="Escape"){closeModal("#search-modal");closeModal("#exam-modal");closeLibrary();return}
 if(searchOpen){
  if(e.key==="Enter"){e.preventDefault();goResult(S.sel)}
  if(e.key==="ArrowDown"){e.preventDefault();S.sel=clamp(S.sel+1,0,S.matches.length-1);focusResult()}
  if(e.key==="ArrowUp"){e.preventDefault();S.sel=clamp(S.sel-1,0,S.matches.length-1);focusResult()}
  return;
 }
 if(examOpen||input)return;
 if(e.key==="/"){e.preventDefault();openModal("#search-modal");$("#search-box").focus()}
 else if(e.key==="ArrowRight"||e.key.toLowerCase()==="j"){e.preventDefault();turn(1)}
 else if(e.key==="ArrowLeft"||e.key.toLowerCase()==="k"){e.preventDefault();turn(-1)}
 else if(e.key==="["){e.preventDefault();togglePanel()}
 else if(e.key==="]"){e.preventDefault();toggleLibrary()}
 else if(e.key.toLowerCase()==="f"){e.preventDefault();$("#fit-mode").click()}
}
function bind(){
 $("#course-select").addEventListener("change",e=>switchCourse(e.target.value));
 $("#prev-slide").addEventListener("click",()=>turn(-1));$("#next-slide").addEventListener("click",()=>turn(1));
 $("#first-slide").addEventListener("click",()=>navigate(S.deck.id,1));$("#next-focus").addEventListener("click",jumpExam);
 $("#page-input").addEventListener("change",e=>navigate(S.deck.id,e.target.value));
 $("#page-input").addEventListener("keydown",e=>{if(e.key==="Enter"){e.currentTarget.blur();navigate(S.deck.id,e.currentTarget.value)}});
 $("#fit-mode").addEventListener("click",()=>{
  S.fit=S.fit==="page"?"width":"page";
  $("#fit-mode").textContent=S.fit==="page"?"适应页面":"适应宽度";save();draw();
 });
 $("#toggle-panel").addEventListener("click",togglePanel);
 $("#star-btn").addEventListener("click",()=>{
  const k=key(S.deck.id,S.page);if(S.star.has(k))S.star.delete(k);else S.star.add(k);headUpdate();save();
 });
 $("#copy-note").addEventListener("click",copyNote);
 $("#index-collapse").addEventListener("click",()=>{S.collapsed=!S.collapsed;$("#page-index").classList.toggle("collapsed",S.collapsed);$("#index-collapse").textContent=S.collapsed?"+":"−"});
 $("#search-trigger").addEventListener("click",()=>{openModal("#search-modal");$("#search-box").focus()});
 $("#search-box").addEventListener("input",refreshSearch);
 $("#search-close").addEventListener("click",()=>closeModal("#search-modal"));
 $("#exam-guide").addEventListener("click",openExamHub);
 $("#exam-top-trigger").addEventListener("click",openExamHub);
 $("#exam-query").addEventListener("input",renderExamHub);
 $("#focus-include-class").addEventListener("change",e=>{S.focusIncludeClass=e.target.checked;save();updateFocusButton();renderExamHub()});
 $("#exam-close").addEventListener("click",()=>closeModal("#exam-modal"));
 $("#exam-dismiss").addEventListener("click",()=>closeModal("#exam-modal"));
 $("#menu-trigger").addEventListener("click",toggleLibrary);
 $("#library-collapse").addEventListener("click",toggleLibrary);
 $("#theme-toggle").addEventListener("click",toggleTheme);
 $("#library-close").addEventListener("click",closeLibrary);
 $("#scrim").addEventListener("click",closeLibrary);
 document.querySelectorAll(".modal-overlay").forEach(m=>m.addEventListener("mousedown",e=>{if(e.target===m)m.classList.add("hidden")}));
 document.addEventListener("keydown",keydown);
 window.addEventListener("resize",updateLibraryToggle);
 window.addEventListener("popstate",()=>{const [id,p]=route();navigate(id,p,false)});
 window.addEventListener("hashchange",()=>{const [id,p]=route();if(S.deck?.id!==id||S.page!==p)navigate(id,p,false)});
 let frame=false;new ResizeObserver(()=>{if(frame)return;frame=true;requestAnimationFrame(()=>{frame=false;if(S.deck)draw()})}).observe($("#slide-stage"));
}
(async function init(){
 try{
  const response=await fetch(course.data+"?v=hum053-20261114");if(!response.ok)throw Error("课程索引请求失败："+response.status);
  S.data=await response.json();if(S.data.schemaVersion!==2)throw Error("课程数据版本未更新，请刷新页面");$("#fit-mode").textContent=S.fit==="page"?"适应页面":"适应宽度";
  if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="assets/vendor/pdf.worker.min.js";
  courseInit();navInit();bind();updateLibraryToggle();updateTheme();const [id,p]=route();navigate(id,p,false);routeWrite(id,S.page,true);
 }catch(error){
  console.error(error);$("#slide-title").textContent="网站初始化失败";
  $("#pdf-loading").classList.add("hidden");$("#pdf-error").classList.remove("hidden");$("#pdf-error").textContent=String(error);
 }
})();
