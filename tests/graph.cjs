const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../dist/app.js','utf8').split("$('graph-head').onclick=")[0];
const elements={};
const document={getElementById:id=>elements[id]??=( {innerHTML:'',textContent:'',setAttribute(){}}),querySelectorAll:()=>[],body:{classList:{contains:()=>false}}};
const context=vm.createContext({document,console});
vm.runInContext(source+`;globalThis.api={lessons,seed,Repo,check(r,prev){repo=r;history=prev?[{repo:prev}]:[];renderGraph();renderChanges();return {svg:$('graph').innerHTML,changes:$('changes').innerHTML};}};`,context);
const {lessons,seed,Repo,check}=context.api;
const copy=x=>JSON.parse(JSON.stringify(x));
let total=0;
function verify(r,prev,label){
 const {svg}=check(r,prev);
 assert(!/NaN|undefined/.test(svg),label+': invalid SVG');
 const ids=[...svg.matchAll(/data-commit="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,Object.keys(r.commits),label+': graph nodes');
 assert.equal((svg.match(/marker-end="url\(#arrow\)"/g)||[]).length,Object.values(r.commits).reduce((n,c)=>n+c.parents.length,0),label+': parent edges');
 const newIds=[...svg.matchAll(/class="node new-commit"[^>]*data-commit="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(newIds,prev?Object.keys(r.commits).filter(id=>!prev.commits[id]):[],label+': NEW labels');
 for(const [field,suffix,prefix] of [['branches','local',''],['tracking','tracking','origin/']])for(const [name,id]of Object.entries(r[field])){
  const group=svg.match(new RegExp('data-commit="'+id+'"[\\s\\S]*?</g>'))?.[0];
  const text=prefix+name+' ['+suffix+']';
  const status=!prev?'':!(name in prev[field])?'created':prev[field][name]!==id?'moved':'';
  assert(group?.includes(text+(field==='branches'&&name===r.head?' ← HEAD':'')+(status?' • '+status:'')),label+': '+text+' @ '+id+' '+status);
 }
 assert.equal((svg.match(/← HEAD/g)||[]).length,r.head?1:0,label+': HEAD attachment');
 assert(svg.includes('at '+r.tip()+'"'),label+': HEAD commit');
 for(const c of Object.values(r.commits))for(const parent of c.parents)assert(r.commits[parent],label+': missing parent');
}
lessons.forEach((l,i)=>{
 let r=seed(l.seed);const stack=[];verify(r,null,l.short+' initial');
 for(const [j,step]of l.steps.entries()){
  const before=copy(r),label=`${i+1}.${j+1} ${step.cmd}`;stack.push(before);
  try{r.run(step.cmd);}catch(e){assert(step.expectedRejection==='fast-forward'&&e.message.includes('fast-forward'),label+': '+e.message);r=Object.assign(new Repo(),before);}
  if(/^(edit |git (add|restore|status|diff|log|branch|switch|checkout|reset|reflog|push|fetch|stash)\b|lab (test|pr|review)$)/.test(step.cmd))assert.deepEqual(r.commits,before.commits,label+': must not create or alter history');
  verify(r,before,label);total++;
 }
 while(stack.length){r=Object.assign(new Repo(),stack.pop());verify(r,stack.at(-1),l.short+' Back');}
 verify(seed(l.seed),null,l.short+' Reset');
});
console.log(`PASS: graph nodes, parent-edge counts, HEAD, local/tracking labels and NEW markers after all ${total} guided steps, plus Back and Reset in all chapters.`);
