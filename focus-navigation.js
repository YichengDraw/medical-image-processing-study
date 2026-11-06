/* Pure chronological navigation: topic representatives, strictly after current page, never wrap. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FocusNavigation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function build(decks,entries,includeClass=true){
    const allowed=new Set(includeClass?['explicit','quiz','class']:['explicit','quiz']);
    const order=new Map(decks.map((d,i)=>[d.id,i]));
    const counts=new Map(decks.map(d=>[d.id,d.pages]));
    const positions=new Map();
    for(const e of entries){
      if(!allowed.has(e.category))continue;
      // One representative per topic in each deck, not every repeated/example slide.
      const representatives=new Map();
      for(const a of e.anchors||[]){
        if(!order.has(a.deck)||!Number.isInteger(a.page)||a.page<1||a.page>counts.get(a.deck))continue;
        const current=representatives.get(a.deck);
        if(!current||a.page<current.page)representatives.set(a.deck,a);
      }
      for(const a of representatives.values()){
        const key=a.deck+':'+a.page;
        if(!positions.has(key))positions.set(key,{deck:a.deck,page:a.page,order:order.get(a.deck),entryIds:[],categories:[],titles:[]});
        const p=positions.get(key);p.entryIds.push(e.id);p.titles.push(e.title);
        if(!p.categories.includes(e.category))p.categories.push(e.category);
      }
    }
    return [...positions.values()].sort((a,b)=>a.order-b.order||a.page-b.page);
  }
  function next(decks,entries,currentDeck,currentPage,includeClass=true){
    const i=decks.findIndex(d=>d.id===currentDeck);
    const p=Number(currentPage);
    if(i<0||!Number.isFinite(p))return null;
    return build(decks,entries,includeClass).find(x=>x.order>i||(x.order===i&&x.page>p))||null;
  }
  return {build,next};
});
