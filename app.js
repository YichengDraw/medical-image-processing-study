/* BMEB316 Medical Image Processing · original PDF + teacher-context companion */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const S={data:null,deck:null,page:1,cache:new Map(),pending:new Map(),task:null,seq:0,fit:"page",panel:true,star:new Set(),matches:[],sel:0,collapsed:false};
let saved={};try{saved=JSON.parse(localStorage.getItem("bmeb316-state")||"{}")}catch{}
if(Array.isArray(saved.bookmarks))S.star=new Set(saved.bookmarks);
if(saved.panel!==undefined)S.panel=!!saved.panel;
if(saved.fit==="width")S.fit="width";
const deck=id=>S.data&&S.data.decks.find(x=>x.id===id);
const slide=()=>S.data&&S.deck&&S.data.slides[S.deck.id][S.page-1];
const key=(d,p)=>d+":"+p;
function save(){try{localStorage.setItem("bmeb316-state",JSON.stringify({last:[S.deck.id,S.page],bookmarks:[...S.star],panel:S.panel,fit:S.fit}))}catch{}}
function route(){let h=decodeURIComponent(location.hash.slice(1)).match(/^([a-z0-9]+)\/(\d+)$/i);if(h&&deck(h[1]))return [h[1],Number(h[2])];return saved.last&&deck(saved.last[0])?saved.last:["lec1",1]}
function routeWrite(id,p,replace=false){const h="#"+id+"/"+p;if(location.hash===h)return;if(replace)history.replaceState(null,"",h);else history.pushState(null,"",h)}
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
 $("#note-status").textContent=!d.audio?"此部分未提供对应录音":p.evidence?"已匹配课堂信息":"依据课件辅助理解";
 $("#toggle-panel").style.display=d.audio?"":"none";$("#toggle-panel").textContent=S.panel?"隐藏讲解":"显示讲解";
 document.title=p.title+" · "+d.group+" | BMEB316";
}
function notes(){
 const grid=$("#study-grid"),panel=$("#companion-panel"),d=S.deck,p=slide();
 if(!d.audio||!S.panel){panel.classList.add("hidden");grid.classList.add("no-companion");return}
 panel.classList.remove("hidden");grid.classList.remove("no-companion");
 const g=p.guide,e=p.evidence;
 $("#companion-kicker").textContent="PAGE "+String(S.page).padStart(2,"0")+" / "+d.group.toUpperCase();
 $("#companion-heading").textContent=p.title;
 $("#source-badge").textContent=e?(e.explicit?"老师明确强调":"有课堂讲授依据"):"课件辅助解读";
 $("#source-badge").classList.toggle("verified",!!e);
 let html="";
 if(g){
  html+='<div class="guide-block"><h3 class="guide-heading"><i>◈</i> 本页要领</h3><p class="guide-main">'+esc(g.concept)+'</p></div>';
  if(g.example)html+='<div class="example-box"><b>↗ 一个直接例子</b><p>'+esc(g.example)+'</p></div>';
  if(g.trap)html+='<div class="pitfall-box"><strong>⚑ 易混 / 注意：</strong>'+esc(g.trap)+'</div>';
 }else html='<p class="concept-only">本页没有能可靠对应的详细注释。请以左侧原始课件为准，不会虚构课堂重点。</p>';
 if(p.excerpt?.length)html+='<details class="page-excerpt"><summary>查看本页 PPT 文字线索</summary><ul>'+p.excerpt.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ul></details>';
 $("#guide-container").innerHTML=html;
 const out=$("#evidence-container");
 if(e)out.innerHTML='<div class="evidence-heading"><h3>讲授重点与出处</h3><span class="evidence-state '+(e.explicit?"exam":"")+'">'+(e.explicit?"考核相关 · 明确":"课堂可核对")+'</span></div><div class="evidence-box"><p>'+esc(e.text)+'</p><div class="evidence-meta"><span class="clock-icon">◷</span><span>'+esc(e.source)+' · '+esc(e.time)+'</span></div><details class="evidence-source-more"><summary>查看转写依据片段（自动转写可能有误）</summary><p>'+esc(e.excerpt)+'</p></details></div>';
 else out.innerHTML='<div class="evidence-heading"><h3>老师讲授信息</h3></div><p class="concept-only">暂未找到与本页可靠对应的录音片段。上面内容属于课件解读，不能据此认定是老师强调的考点。</p>';
 $("#teacher-context").innerHTML='<p class="context-info">标注规则：“明确强调”只用于录音中有直接考核表述的内容；其他讲解是学习提示，而非考试承诺。</p>';
 $(".companion-scroll").scrollTop=0;
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
function closeLibrary(){$("#library").classList.remove("open");$("#scrim").classList.add("hidden")}
function openLibrary(){$("#library").classList.add("open");$("#scrim").classList.remove("hidden")}
function navigate(id,p,write=true){
 const d=deck(id);if(!d)return;
 const changed=S.deck?.id!==d.id;S.deck=d;S.page=clamp(Math.round(Number(p)||1),1,d.pages);
 if(changed){navUpdate();pageIndex()}
 indexUpdate(true);headUpdate();notes();draw();
 if(write)routeWrite(id,S.page);
 save();if(window.innerWidth<750)closeLibrary();
}
function turn(delta){if(S.deck&&S.page+delta>=1&&S.page+delta<=S.deck.pages)navigate(S.deck.id,S.page+delta)}
function jumpExam(){
 let found=false;
 for(const d of S.data.decks){
  for(const p of S.data.slides[d.id]){
   if(found&&p.isExam){navigate(d.id,p.page);return}
   if(d.id===S.deck.id&&p.page===S.page)found=true;
  }
 }
 for(const d of S.data.decks){const p=S.data.slides[d.id].find(x=>x.isExam);if(p){navigate(d.id,p.page);return}}
}
function copyNote(){
 const p=slide(),g=p?.guide,e=p?.evidence;
 if(!g)return;
 const text=[S.deck.group+" "+S.deck.label+" · P"+S.page,p.title,"本页要领："+g.concept,
  g.example?"例子："+g.example:"",g.trap?"注意："+g.trap:"",
  e?"老师课堂讲授："+e.text+"（"+e.source+" "+e.time+"）":""].filter(Boolean).join("\n\n");
 navigator.clipboard.writeText(text).then(()=>{
  $("#copy-note").textContent="已复制 ✓";setTimeout(()=>$("#copy-note").textContent="复制笔记",1400);
 }).catch(()=>alert("浏览器未获得剪贴板权限，建议手动复制讲解内容。"));
}
function openModal(selector){closeLibrary();$(selector).classList.remove("hidden")}
function closeModal(selector){$(selector).classList.add("hidden")}
function search(q){
 const str=q.trim().toLowerCase(),found=[];if(!str)return found;
 for(const d of S.data.decks){
  for(const p of S.data.slides[d.id]){
   if(str==="@star"){if(!S.star.has(key(d.id,p.page)))continue}
   else if(!(p.title+" "+(p.guide?.concept||"")+" "+p.searchText).toLowerCase().includes(str))continue;
   const score=(p.title.toLowerCase().includes(str)?6:0)+((p.guide?.concept||"").toLowerCase().includes(str)?3:0)+(p.isExam?1:0);
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
  '<button class="search-result '+(i===0?"active":"")+'" data-i="'+i+'"><span class="result-page">P '+r.page.page+'</span><span><span class="result-title">'+esc(r.page.title)+'</span><span class="result-desc">'+esc(r.deck.group+" · "+r.deck.cn)+(r.page.evidence?" · 有老师讲授依据":"")+'</span></span></button>'
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
 if(!S.deck?.audio)return;
 S.panel=!S.panel;notes();headUpdate();save();setTimeout(draw,90);
}
function keydown(e){
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
 else if(e.key.toLowerCase()==="f"){e.preventDefault();$("#fit-mode").click()}
}
function bind(){
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
 $("#exam-guide").addEventListener("click",()=>openModal("#exam-modal"));
 $("#exam-close").addEventListener("click",()=>closeModal("#exam-modal"));
 $("#exam-dismiss").addEventListener("click",()=>closeModal("#exam-modal"));
 $("#exam-goto").addEventListener("click",()=>{closeModal("#exam-modal");jumpExam()});
 $("#menu-trigger").addEventListener("click",openLibrary);
 $("#library-close").addEventListener("click",closeLibrary);
 $("#scrim").addEventListener("click",closeLibrary);
 document.querySelectorAll(".modal-overlay").forEach(m=>m.addEventListener("mousedown",e=>{if(e.target===m)m.classList.add("hidden")}));
 document.addEventListener("keydown",keydown);
 window.addEventListener("popstate",()=>{const [id,p]=route();navigate(id,p,false)});
 window.addEventListener("hashchange",()=>{const [id,p]=route();if(S.deck?.id!==id||S.page!==p)navigate(id,p,false)});
 let frame=false;new ResizeObserver(()=>{if(frame)return;frame=true;requestAnimationFrame(()=>{frame=false;if(S.deck)draw()})}).observe($("#slide-stage"));
}
(async function init(){
 try{
  const response=await fetch("data/content.json");if(!response.ok)throw Error("课程索引请求失败："+response.status);
  S.data=await response.json();$("#fit-mode").textContent=S.fit==="page"?"适应页面":"适应宽度";
  if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="assets/vendor/pdf.worker.min.js";
  navInit();bind();const [id,p]=route();navigate(id,p,false);routeWrite(id,p,true);
 }catch(error){
  console.error(error);$("#slide-title").textContent="网站初始化失败";
  $("#pdf-loading").classList.add("hidden");$("#pdf-error").classList.remove("hidden");$("#pdf-error").textContent=String(error);
 }
})();
