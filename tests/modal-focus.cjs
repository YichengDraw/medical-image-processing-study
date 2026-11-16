'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const FocusNavigation=require('../focus-navigation.js');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const source=app.slice(0,app.indexOf('(async function init(){'));
const nodes=new Map(),documentListeners=new Map();
let document;
function node(selector,tagName='BUTTON'){
 if(nodes.has(selector))return nodes.get(selector);
 const classes=new Set(),listeners=new Map();
 const el={id:selector.replace(/^#/,''),tagName,tabIndex:0,disabled:false,inert:false,isConnected:true,visible:true,parent:null,
  value:'',textContent:'',innerHTML:'',style:{},scrollTop:0,scrollLeft:0,focusables:[],
  classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)},toggle(c,force){if(force??!classes.has(c))classes.add(c);else classes.delete(c)}},
  setAttribute(k,v){this[k]=v},
  addEventListener(type,callback){listeners.set(type,callback)},
  dispatch(type,extra={}){const event={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};listeners.get(type)?.(event);return event},
  closest(selector){assert.equal(selector,'[inert]');for(let p=this;p;p=p.parent)if(p.inert)return p;return null},
  getClientRects(){for(let p=this;p;p=p.parent)if(!p.visible||p.classList.contains('hidden'))return [];return [{}]},
  focus(){if(this.isConnected&&!this.disabled&&!this.closest('[inert]')&&this.getClientRects().length)document.activeElement=this},
  querySelectorAll(){return this.focusables},
 };
 nodes.set(selector,el);return el;
}
const library=node('#library','ASIDE'),shell=node('.main-shell','DIV'),scrim=node('#scrim','DIV');
const searchModal=node('#search-modal','DIV'),examModal=node('#exam-modal','DIV');
const modals=[searchModal,examModal],background=[library,shell,scrim];
for(const modal of modals){modal.classList.add('hidden');modal.tabIndex=-1}
for(const [selector,modal,tag] of [['#search-box',searchModal,'INPUT'],['#search-close',searchModal,'BUTTON'],['#exam-query',examModal,'INPUT'],['#exam-close',examModal,'BUTTON'],['#exam-info-summary',examModal,'SUMMARY']]){
 const el=node(selector,tag);el.parent=modal;modal.focusables.push(el);
}
// A closed source section and a disabled control cannot become wrap targets.
for(const modal of modals){
 const hidden=node('#'+modal.id+'-hidden');hidden.parent=modal;hidden.visible=false;
 const disabled=node('#'+modal.id+'-disabled');disabled.parent=modal;disabled.disabled=true;
 modal.focusables.push(hidden,disabled);
}
node('#exam-top-trigger').parent=shell;node('#search-trigger').parent=library;node('#menu-trigger').parent=shell;
document={activeElement:null,
 querySelector:selector=>node(selector),
 querySelectorAll(selector){if(selector==='.modal-overlay')return modals;if(selector==='#app > :not(.modal-overlay)')return background;return []},
 addEventListener(type,callback){documentListeners.set(type,callback)},
};
const context=vm.createContext({URL,URLSearchParams,document,FocusNavigation,
 location:{search:'',hash:'',href:'https://example.test/'},localStorage:{getItem(){return null},setItem(){}},
 window:{matchMedia(){return {matches:false}},addEventListener(){}},ResizeObserver:class{observe(){}},
 fixture:{decks:[{id:'lec1',pages:2}],sources:{},recordings:{},examGuide:{categories:[],entries:[],note:''}},
});
vm.runInContext(source,context);
vm.runInContext('S.data=fixture;S.deck=fixture.decks[0];bind()',context);
function click(selector){const el=node(selector);el.focus();return el.dispatch('click')}
function key(name,shiftKey=false){const event={key:name,shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};documentListeners.get('keydown')(event);return event}
scrim.inert=true; // Closing must restore previous state rather than blindly clear all inert flags.
for(const [trigger,modal,close,input,last] of [
 ['#exam-top-trigger',examModal,'#exam-close','#exam-query','#exam-info-summary'],
 ['#search-trigger',searchModal,'#search-close','#search-box','#search-close'],
]){
 click(trigger);
 assert.equal(modal.classList.contains('hidden'),false);
 assert.ok(background.every(el=>el.inert),'Opening a dialog makes its background inert');
 assert.equal(document.activeElement,node(input),'Opening moves focus inside the selected dialog');
 node(last).focus();assert.equal(key('Tab').defaultPrevented,true);
 assert.equal(document.activeElement,node(input),'Tab from the last visible control wraps inside the dialog');
 assert.equal(key('Tab',true).defaultPrevented,true);
 assert.equal(document.activeElement,node(last),'Shift+Tab from the first control wraps to the last visible control');
 click(close);
 assert.equal(modal.classList.contains('hidden'),true);
 assert.equal(document.activeElement,node(trigger),'The close button returns focus to the actual opener');
 assert.equal(shell.inert,false);assert.equal(library.inert,false);assert.equal(scrim.inert,true);

 click(trigger);assert.equal(key('Escape').defaultPrevented,true);
 assert.equal(modal.classList.contains('hidden'),true);
 assert.equal(document.activeElement,node(trigger),'Escape returns focus to the actual opener');

 click(trigger);
 modal.dispatch('mousedown',{target:node(input)});
 assert.equal(modal.classList.contains('hidden'),false,'Clicks inside the dialog do not dismiss it');
 const backdrop=modal.dispatch('mousedown');
 assert.equal(backdrop.defaultPrevented,true,'Backdrop dismissal cancels native focus transfer after restoration');
 assert.equal(modal.classList.contains('hidden'),true);
 assert.equal(document.activeElement,node(trigger),'Backdrop dismissal uses the same focus-return path');
 assert.equal(shell.inert,false);assert.equal(library.inert,false);assert.equal(scrim.inert,true);
}
console.log('PASS: both modal event paths, visible-control Tab wrapping, background inert restoration, and opener focus after close/Escape/backdrop.');
