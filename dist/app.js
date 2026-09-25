'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const FILE='app/service.py', ROUTER='app/api/booking.py';
const HELP=`This is a teaching model, not real Git or a shell. Short commit labels are simulated IDs. History is kept in memory; reloading starts over.
Git: status · diff [--staged|HEAD] · log [--oneline --graph --decorate --all] · branch [name] · switch [-c name] [ref] · switch --detach ref · checkout [-b name] [ref] · checkout -- <file> · add <file|.> · commit -m "message" [--amend] · merge <ref> [--no-ff|--ff-only|--abort] · rebase <ref|--continue|--abort> · reset [--soft|--mixed|--hard] <ref> · revert <ref> · restore [--staged] <file> · stash [list|apply|pop] · cherry-pick <ref|--continue|--abort> · reflog · fetch origin · push [-u] origin [branch] · pull origin <branch>.
Refs: branch names, origin/develop, commit IDs (A, B…), HEAD, HEAD~N, HEAD@{N}.
Lab utilities (not Git commands): edit <file> "content" · lab teammate · lab test · lab pr · lab review · lab merge-pr. Type help to see this list again.
Limits: a small text repository; merging compares files, not individual lines. The lab does not simulate renames, binary files, hooks, authentication, networking, garbage collection, or every Git option. lab test only checks conflict markers; CI/review are simulated. Force push is rejected. Stash saves tracked files only. restore reads from the index by default. Graph edges show parent relationships, not elapsed time.`;

class Repo {
 constructor(){this.commits={};this.branches={};this.remote={};this.tracking={};this.head='develop';this.detached=null;this.work={};this.index={};this.seq=0;this.lanes={develop:0,main:0};this.reflog=[];this.stashes=[];this.pending=null;this.pr=null;this.make('chore(config): initialize booking tax settings',[],{[FILE]:'tax_rate = 0.10'});this.branches.main='A';this.index[ROUTER]='def get_booking():\n    return {"status": "ok"}';this.make('feat(booking): add booking status endpoint');this.remote={main:'A',develop:'B'};this.tracking=clone(this.remote);}
 tip(){return this.head?this.branches[this.head]:this.detached;}
 tree(ref=this.tip()){return clone(this.commits[ref]?.tree||{});}
 record(reason){this.reflog.unshift({id:this.tip(),reason});}
 move(id,reason){if(this.head)this.branches[this.head]=id;else this.detached=id;this.record(reason);}
 make(message,parents,tree){const n=this.seq++;const id=n<26?String.fromCharCode(65+n):'C'+(n+1);parents=parents??(this.tip()?[this.tip()]:[]);tree=tree??clone(this.index);let lane=this.head?(this.lanes[this.head]??0):Math.max(...Object.values(this.lanes))+1;this.commits[id]={id,message,parents,tree:clone(tree),lane,n};this.move(id,'commit: '+message);this.index=clone(tree);this.work=clone(tree);return id;}
 resolve(ref='HEAD'){let m=ref.match(/^(.*)~(\d*)$/);if(m){let id=this.resolve(m[1]);for(let i=0;i<Number(m[2]||1);i++){id=this.commits[id].parents[0];if(!id)throw Error('The ref goes beyond the available history.');}return id;}m=ref.match(/^HEAD@\{(\d+)\}$/);if(m){if(!this.reflog[+m[1]])throw Error('This reflog entry does not exist.');return this.reflog[+m[1]].id;}const id=ref==='HEAD'?this.tip():this.branches[ref]||this.tracking[ref.replace(/^origin\//,'')]&&(ref.startsWith('origin/')?this.tracking[ref.slice(7)]:null)||this.commits[ref]?.id;if(!id)throw Error('Unknown ref: '+ref);return id;}
 ancestors(id){const set=new Set();const walk=x=>{if(!x||set.has(x))return;set.add(x);this.commits[x].parents.forEach(walk);};walk(id);return set;}
 base(a,b){const aa=this.ancestors(a);return [...this.ancestors(b)].filter(x=>aa.has(x)).sort((x,y)=>this.commits[y].n-this.commits[x].n)[0];}
 dirty(){return !eq(this.work,this.index)||!eq(this.index,this.tree());}
 clean(){if(this.pending)throw Error('Complete the pending operation or use --abort first.');if(this.dirty())throw Error('This lab requires a clean working tree for this operation. Commit or stash first.');}
 switchTo(name,create=false,start){this.clean();if(create){if(this.branches[name]||!name||name.startsWith('-')||/[\s~^:?*\[\\]/.test(name))throw Error('The branch name is invalid or already exists.');this.branches[name]=start?this.resolve(start):this.tip();this.lanes[name]=Math.max(...Object.values(this.lanes))+1;}if(!this.branches[name])throw Error('Unknown branch: '+name);this.head=name;this.detached=null;this.work=this.tree();this.index=this.tree();this.record('switch: '+name);return 'HEAD → '+name+' → '+this.tip()+'. Checkout only; no commit is created.';}
 combine(base,ours,theirs){const tree=clone(ours), conflicts=[];for(const f of new Set([...Object.keys(base),...Object.keys(ours),...Object.keys(theirs)])){if(ours[f]===theirs[f]||theirs[f]===base[f])continue;if(ours[f]===base[f]){if(theirs[f]===undefined)delete tree[f];else tree[f]=theirs[f];}else conflicts.push({file:f,base:base[f]??'',ours:ours[f]??'',theirs:theirs[f]??''});}return {tree,conflicts};}
 conflictState(p,result){this.pending={...p,conflicts:result.conflicts};this.index=clone(result.tree);this.work=clone(result.tree);result.conflicts.forEach(c=>this.work[c.file]='<<<<<<< HEAD\n'+c.ours+'\n=======\n'+c.theirs+'\n>>>>>>> '+p.target);return 'CONFLICT: '+result.conflicts.map(c=>c.file).join(', ')+'. Read BASE / OURS / THEIRS below, edit the file, then run git add.';}
 applied(){if(this.pending?.conflicts.some(c=>this.index[c.file]!==this.work[c.file]||/<<<<<<<|=======|>>>>>>>/.test(this.work[c.file]||'')))throw Error('Resolve all conflict markers and run git add on the resolved file.');}
 abort(){if(!this.pending)throw Error('There is no pending operation to abort.');const old=this.pending.original;this.pending=null;this.move(old,'abort');this.work=this.tree();this.index=this.tree();return 'Operation aborted; returned to '+old;}
 replay(queue,original,target){while(queue.length){const id=queue.shift(),c=this.commits[id],base=(c.parents.length?this.tree(c.parents[0]):{}),result=this.combine(base,this.tree(),c.tree);if(result.conflicts.length)return this.conflictState({type:'rebase',original,target,queue,current:id},result);this.make(c.message,undefined,result.tree);}this.pending=null;return 'Rebase complete. The new commits have new parents and IDs; the original commits can still be found in the reflog.';}
 run(line){const tokens=line.match(/"(?:\\.|[^"\\])*"|'[^']*'|\S+/g)||[];const t=tokens.map(s=>s[0]==='"'?JSON.parse(s):s[0]==="'"?s.slice(1,-1):s);if(!t.length)return '';if(t[0]==='help')return HELP;if(t[0]==='edit'){if(t.length!==3)throw Error('Usage: edit app/service.py "new content"');this.work[t[1]]=t[2];return 'Edited '+t[1]+' in the working directory. Not staged or committed yet.';}if(t[0]==='lab')return this.lab(t[1]);if(t[0]!=='git')throw Error('The lab accepts supported Git commands, edit, or lab. Type help.');const cmd=t[1],a=t.slice(2);const nonopts=a.filter(x=>!x.startsWith('-'));
 switch(cmd){
 case 'status':return `On ${this.head?'branch '+this.head:'detached HEAD at '+this.tip()}\n${this.pending?'Pending '+this.pending.type+'\n':''}Staged: ${this.changed(this.tree(),this.index).join(', ')||'(empty)'}\nWorking directory: ${this.changed(this.index,this.work).join(', ')||'(clean)'}`;
 case 'diff':{if(a.length>1||a.some(x=>!['--staged','HEAD'].includes(x)))throw Error('Supported: git diff, git diff --staged, git diff HEAD.');const staged=a.includes('--staged'),old=staged||a.includes('HEAD')?this.tree():this.index,neu=staged?this.index:this.work;return this.changed(old,neu).filter(f=>f in old||f in this.index).map(f=>f+'\n- '+(old[f]??'(absent)')+'\n+ '+(neu[f]??'(absent)')).join('\n')||'No differences.';}
 case 'log':{const ids=a.includes('--all')?new Set([...Object.values(this.branches),...Object.values(this.tracking)].flatMap(id=>[...this.ancestors(id)])):this.ancestors(this.tip());return [...ids].sort((x,y)=>this.commits[y].n-this.commits[x].n).map(id=>`* ${id} ${this.commits[id].message} [parent: ${this.commits[id].parents.join(', ')||'root'}]`).join('\n');}
 case 'branch':if(!a.length)return Object.entries(this.branches).map(([n,id])=>(n===this.head?'* ':'  ')+n+' → '+id).join('\n');if(a.length!==1||a[0].startsWith('-'))throw Error('Supported syntax: git branch [name].');if(this.branches[a[0]])throw Error('The branch already exists.');if(!/^[\w/-]+$/.test(a[0]))throw Error('Invalid branch name.');this.branches[a[0]]=this.tip();this.lanes[a[0]]=Math.max(...Object.values(this.lanes))+1;return 'Created pointer '+a[0]+'; HEAD stays on '+this.head;
 case 'switch':case 'checkout':if(cmd==='checkout'&&a[0]==='--'){if(a.length!==2)throw Error('Usage: git checkout -- <file>');return this.run('git restore '+JSON.stringify(a[1]));}if(a[0]==='--detach'||(cmd==='checkout'&&!this.branches[a[0]]&&a[0]!=='-b')){this.clean();const id=this.resolve(a[0]==='--detach'?a[1]:a[0]);this.head=null;this.detached=id;this.index=this.tree();this.work=this.tree();this.record('checkout detached');return 'Detached HEAD → '+id+'. The next commit will not move any branch.';}return this.switchTo(a[a[0]==='-c'||a[0]==='-b'?1:0],a[0]==='-c'||a[0]==='-b',a[2]);
 case 'add':{if(!a.length)throw Error('Specify a file name or a dot.');const files=a.includes('.')?new Set([...Object.keys(this.work),...Object.keys(this.index)]):a;for(const f of files){if(!(f in this.work)&&!(f in this.index))throw Error('Unknown file: '+f);if(/<<<<<<<|=======|>>>>>>>/.test(this.work[f]||''))throw Error('The file still contains conflict markers.');if(f in this.work)this.index[f]=this.work[f];else delete this.index[f];}return 'The file snapshot is now staged. Further file edits will not update staging automatically.';}
 case 'commit':{if(this.pending&&this.pending.type!=='merge')throw Error('Use git '+this.pending.type+' --continue.');this.applied();let mi=a.indexOf('-m'),message=mi>=0?a[mi+1]:this.pending?'chore(merge): merge '+this.pending.target+' into '+(this.head||'detached HEAD'):a.includes('--amend')?this.commits[this.tip()].message:null;if(!message)throw Error('The lab does not open an editor. Use git commit -m "message".');if(eq(this.index,this.tree())&&!a.includes('--amend')&&!this.pending)throw Error('No staged changes to commit.');const work=clone(this.work),index=clone(this.index);let parents=a.includes('--amend')?this.commits[this.tip()].parents:this.pending?[this.tip(),this.pending.other]:undefined;const id=this.make(message,parents);this.work=work;this.index=index;this.pending=null;return `Created commit ${id}. ${a.includes('--amend')?'Amend replaces the previous commit with a new one.':'The snapshot comes from staging.'} HEAD → ${this.head||id}${this.head?' → '+id:''}.`;}
 case 'merge':{if(a.includes('--abort'))return this.abort();this.clean();const target=nonopts[0],other=this.resolve(target),current=this.tip();if(this.ancestors(current).has(other))return 'Already up to date.';if(this.ancestors(other).has(current)&&!a.includes('--no-ff')){this.move(other,'merge: fast-forward');this.work=this.tree();this.index=this.tree();return 'Fast-forward: only the current branch pointer moves. No merge commit is created.';}if(a.includes('--ff-only'))throw Error('The branches have diverged; a fast-forward is not possible.');const result=this.combine(this.tree(this.base(current,other)),this.tree(),this.tree(other));if(result.conflicts.length)return this.conflictState({type:'merge',original:current,target,other},result);const id=this.make('chore(merge): merge '+target+' into '+(this.head||'detached HEAD'),[current,other],result.tree);return 'Merge commit '+id+' has 2 parents: '+current+' and '+other+'.';}
 case 'rebase':{if(a[0]==='--abort')return this.abort();if(a[0]==='--continue'){if(this.pending?.type!=='rebase')throw Error('No rebase is in progress.');this.applied();const p=clone(this.pending);this.make(this.commits[p.current].message);this.pending=null;return this.replay(p.queue,p.original,p.target);}this.clean();const target=a[0],onto=this.resolve(target),original=this.tip();if(this.ancestors(original).has(onto))return 'The branch is already based on '+target+'.';const common=this.ancestors(onto),queue=[];let c=original;while(c&&!common.has(c)){if(this.commits[c].parents.length>1)throw Error('This lab only rebases linear commit sequences.');queue.unshift(c);c=this.commits[c].parents[0];}this.move(onto,'rebase: onto '+target);this.index=this.tree();this.work=this.tree();return this.replay(queue,original,target);}
 case 'reset':{if(this.pending)throw Error('Use --abort or complete the current operation first.');const mode=a.find(x=>x.startsWith('--'))||'--mixed';if(!['--soft','--mixed','--hard'].includes(mode))throw Error('Unsupported reset mode.');const id=this.resolve(nonopts[0]||'HEAD');this.move(id,'reset: moving to '+id);if(mode!=='--soft')this.index=this.tree();if(mode==='--hard'){const previousTree=this.commits[this.reflog[1]?.id]?.tree||{};const untracked=Object.fromEntries(Object.entries(this.work).filter(([f])=>!(f in this.index)&&!(f in previousTree)));this.work={...untracked,...this.tree()};}return `Pointer ${this.head||'HEAD'} → ${id}. ${mode==='--soft'?'Staging and the working directory are preserved.':mode==='--mixed'?'The index returns to the target snapshot; the working directory is preserved.':'The index and tracked files return to the target snapshot; local edits may be lost.'}`;}
 case 'restore':{const staged=a.includes('--staged'),f=nonopts[0];if(!f)throw Error('Specify a file name.');if(this.pending)throw Error('Use the conflict editor to edit the conflicted file.');const src=staged?this.tree():this.index,dst=staged?this.index:this.work;if(!(f in src)&&!(f in dst))throw Error('Unknown file: '+f);if(f in src)dst[f]=src[f];else delete dst[f];return staged?'Unstaged the file; working directory contents are preserved.':'Restored the file from the index (staging), which may differ from HEAD.';}
 case 'revert':case 'cherry-pick':{if(a[0]==='--abort')return this.abort();if(a[0]==='--continue'){if(this.pending?.type!==cmd)throw Error('No '+cmd+' is in progress.');this.applied();const p=this.pending;this.pending=null;const id=this.make(p.message);return 'Completed '+cmd+' → '+id;}this.clean();const source=this.resolve(a[0]);const c=this.commits[source];if(c.parents.length>1)throw Error('This lab does not support '+cmd+' merge commit (-m mainline).');const reverse=cmd==='revert';const result=this.combine(reverse?c.tree:(c.parents.length?this.tree(c.parents[0]):{}),this.tree(),reverse?(c.parents.length?this.tree(c.parents[0]):{}):c.tree);const message=reverse?'revert: undo '+source+' - '+c.message:c.message;if(result.conflicts.length)return this.conflictState({type:cmd,original:this.tip(),target:source,message},result);if(eq(result.tree,this.tree()))throw Error('Empty patch: the change is already on this branch.');return 'Created new commit '+this.make(message,undefined,result.tree)+'. Original commit '+source+' is unchanged.';}
 case 'stash':{if(this.pending)throw Error('Resolve the conflict before stashing.');if(a[0]==='list')return this.stashes.map((s,i)=>'stash@{'+i+'}: '+s.branch+' at '+s.base).join('\n')||'No stashes yet.';if(['pop','apply'].includes(a[0])){const s=this.stashes[0];if(!s)throw Error('No stash is available.');if(this.dirty())throw Error('This lab requires a clean working tree before applying a stash.');const result=this.combine(this.tree(s.base),this.work,s.work);if(result.conflicts.length)throw Error('The stash conflicts with the current base. In this lab, return to the original branch to apply it. The stash is preserved.');this.work=result.tree;if(a[0]==='pop')this.stashes.shift();return 'Restored changes to the working directory. '+(a[0]==='pop'?'Removed the stash after a successful apply.':'Kept the stash so it can be applied again.');}if(a.length&&a[0]!=='push')throw Error('Supported stash operations: list/apply/pop/push.');if(!this.dirty())return 'No local changes to save.';const tracked=Object.keys(this.index),work=Object.fromEntries(Object.entries(this.work).filter(([f])=>tracked.includes(f)));this.stashes.unshift({base:this.tip(),branch:this.head,work,index:clone(this.index)});const untracked=Object.fromEntries(Object.entries(this.work).filter(([f])=>!tracked.includes(f)));this.index=this.tree();this.work={...this.tree(),...untracked};return 'Saved tracked changes in a stash. Untracked files require -u, which this lab does not support.';}
 case 'reflog':return this.reflog.map((r,i)=>`${r.id} HEAD@{${i}}: ${r.reason}`).join('\n');
 case 'fetch':if(a[0]&&a[0]!=='origin')throw Error('The only remote in this lab is origin.');this.tracking=clone(this.remote);return 'Updated origin/* from GitHub. Local branches, HEAD, the index, and the working directory are unchanged.';
 case 'push':{if(a.some(x=>['--force','-f','--force-with-lease'].includes(x)))throw Error('This lab does not support force push. Agree with your team before rebasing shared history.');const args=nonopts;if(args[0]&&args[0]!=='origin')throw Error('The only remote in this lab is origin.');const branch=args[1]||this.head;if(!this.branches[branch])throw Error('Specify a local branch.');const id=this.branches[branch],remote=this.remote[branch];if(remote&&!this.ancestors(id).has(remote))throw Error('Push rejected: non-fast-forward. Fetch and integrate the remote changes first.');this.remote[branch]=id;this.tracking[branch]=id;return 'Pushed '+branch+' → GitHub at '+id+'. A push does not create or merge a Pull Request automatically.';}
 case 'pull':if(a[0]!=='origin'||!a[1])throw Error('Use git pull origin develop. In this lab, pull = fetch + merge.');this.run('git fetch origin');return this.run('git merge origin/'+a[1]);
 default:throw Error('This command or option is not simulated. Type help for supported commands.');}}
 changed(a,b){return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(f=>a[f]!==b[f]);}
 lab(action){if(action==='teammate'){const saved={head:this.head,detached:this.detached,index:clone(this.index),work:clone(this.work),reflog:clone(this.reflog)};const old=this.remote.develop;this.head=null;this.detached=old;this.index=this.tree(old);this.index['app/customer.py']='def get_customer(): return "customer"';const id=this.make('feat(customer): add customer lookup endpoint');this.remote.develop=id;Object.assign(this,saved);return 'A teammate just pushed '+id+' to GitHub/develop. The local origin/develop stays unchanged until you fetch.';}if(action==='test')return Object.values(this.work).some(x=>/<<<<<<<|=======|>>>>>>>/.test(x))?'CHECK FAILED: conflict markers remain.':'LAB CHECK PASSED: no conflict markers remain. This is not pytest; run the test suite in a real repository.';if(action==='pr'){if(!this.head||!this.head.startsWith('feature/'))throw Error('Switch to a feature branch first.');if(this.remote[this.head]!==this.tip())throw Error('Push the feature branch before opening a PR.');this.pr={branch:this.head,status:'Open',head:this.tip()};return 'GitHub: opened Pull Request '+this.head+' → develop. A PR is a collaboration platform feature, not a Git command.';}if(action==='review'){if(!this.pr)throw Error('No Pull Request yet.');this.pr.status='Approved · CI passed (demo)';return 'Simulation: teammate approval and passing CI. Real projects need actual code review and tests.';}if(action==='merge-pr'){if(!this.pr?.status.startsWith('Approved'))throw Error('Run lab review first.');if(this.remote[this.pr.branch]!==this.pr.head)throw Error('The PR has new commits; another review is required.');const left=this.remote.develop,right=this.remote[this.pr.branch];const result=this.combine(this.tree(this.base(left,right)),this.tree(left),this.tree(right));if(result.conflicts.length)throw Error('The PR has conflicts. Synchronize develop and resolve them locally first.');const saved={head:this.head,detached:this.detached,index:clone(this.index),work:clone(this.work),reflog:clone(this.reflog)};this.head=null;this.detached=left;const id=this.make('chore(merge): merge '+this.pr.branch+' into develop',[left,right],result.tree);this.remote.develop=id;Object.assign(this,saved);this.pr.status='Merged';return 'GitHub created merge commit '+id+'. Local develop and origin/develop are unchanged: fetch/pull to synchronize.';}throw Error('Lab utilities: teammate, test, pr, review, merge-pr.');}
}
const step=(cmd,note)=>({cmd,note});
const edit=(f,v,n)=>step('edit '+f+' '+JSON.stringify(v),n||'Edit the file in the simulated editor; this is not a Git command.');
const s=step;
const lessons=[
  {
    "title": "Where does a change go?",
    "short": "Session 1 recap",
    "seed": "base",
    "sub": "Working directory → Staging → Local repository → Remote. Four places, four different responsibilities.",
    "key": "<strong>Git ≠ GitHub.</strong> Git manages snapshots on your machine. GitHub hosts remotes and provides Pull Requests, reviews, and CI. Committing does not mean you have pushed.<br><br><strong>Commit messages:</strong> <code>type(scope): describe the change</code>. Use <code>feat</code> for a capability, <code>fix</code> for a correction, <code>refactor</code> for restructuring, and <code>chore</code> for maintenance. Describe the actual change, not just “update code”. This is a team convention, not a Git requirement.",
    "steps": [
      {
        "cmd": "git checkout -b feature/booking-api",
        "note": "Use the familiar checkout -b to create a branch from develop AND switch to it. HEAD points to the new branch; no commit is created. In the next chapter, we will separate these two actions with branch and switch."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.08\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add app/service.py",
        "note": "Staging holds the snapshot you choose for the next commit."
      },
      {
        "cmd": "git commit -m \"fix(booking): correct booking tax rate to 8%\"",
        "note": "Save the snapshot locally. The feature branch advances; develop stays put."
      },
      {
        "cmd": "git push -u origin feature/booking-api",
        "note": "The remote receives the commit. Teammates can now fetch the change."
      },
      {
        "cmd": "lab pr",
        "note": "Open a Pull Request on GitHub to propose merging the feature into develop."
      }
    ]
  },
  {
    "title": "Branches are pointers. HEAD is your position.",
    "short": "Branch, switch & HEAD",
    "seed": "base",
    "sub": "Use switch to change where you work and restore to change file contents. Connect each action to the checkout commands you already know.",
    "key": "<strong>branch creates a pointer; switch changes where you work; restore changes file contents.</strong> Creating a branch does not create a commit. Switching branches updates HEAD and checks out the target snapshot.\n<h3>From familiar checkout to focused commands</h3>\n<p><strong>Our demo defaults: use <code>switch</code> for branches and <code>restore</code> for files.</strong> Their names make your intention explicit. Learn what each operation changes, then use it confidently. <code>checkout</code> remains valid; the comparison below connects these focused commands to your existing workflow.</p>\n<div class=\"comparison-scroll\"><table class=\"command-comparison\"><thead><tr><th scope=\"col\">Intent</th><th scope=\"col\">Use in this demo</th><th scope=\"col\">Familiar equivalent</th><th scope=\"col\">What moves?</th></tr></thead><tbody>\n<tr><td>Create a branch only</td><td><code>git branch feature/demo</code></td><td>Same command</td><td>A new branch pointer appears; HEAD stays put.</td></tr>\n<tr><td>Switch to an existing branch</td><td><code>git switch feature/demo</code></td><td><code>git checkout feature/demo</code></td><td>HEAD changes branches; no new commit.</td></tr>\n<tr><td>Create and switch</td><td><code>git switch -c feature/demo</code></td><td><code>git checkout -b feature/demo</code></td><td>A branch is created and HEAD switches to it.</td></tr>\n<tr><td>Inspect a commit directly</td><td><code>git switch --detach C</code></td><td><code>git checkout C</code></td><td>HEAD points directly to C, not to a branch.</td></tr>\n<tr><td>Discard an unstaged file edit</td><td><code>git restore app/service.py</code></td><td><code>git checkout -- app/service.py</code></td><td>The file is restored from the index; HEAD stays put.</td></tr>\n</tbody></table></div>\n<p><strong>Explicit names do not replace understanding.</strong> <code>switch -c</code> creates a branch and switches to it; <code>switch</code> alone selects an existing branch. <code>restore</code> discards unstaged file edits by restoring from the index. In the older checkout file syntax, <code>--</code> separates paths from branch names. The label C is a simulated commit ID; use a real commit hash in your repository.</p>\n<p><strong>Ask before each step:</strong> Will this create a branch, move HEAD, create a commit, or only change a file?</p>",
    "steps": [
      {
        "cmd": "git branch feature/booking-api",
        "note": "In the recap, checkout -b created a branch AND switched to it. Here, git branch only creates a branch pointing to B. HEAD stays on develop. Next, we will switch to it explicitly."
      },
      {
        "cmd": "git switch feature/booking-api",
        "note": "Use switch for an existing branch. HEAD now points to feature/booking-api; no commit is created. Familiar equivalent: git checkout feature/booking-api."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.08\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Select the changes for the next commit."
      },
      {
        "cmd": "git commit -m \"feat(booking): apply 8% tax rate to bookings\"",
        "note": "The feature branch advances to C; develop stays at B. HEAD follows the current branch."
      },
      {
        "cmd": "git switch develop",
        "note": "Switch HEAD back to develop at B. The working directory returns to snapshot B. Familiar equivalent: git checkout develop."
      },
      {
        "cmd": "git switch --detach C",
        "note": "The explicit --detach option checks out C directly. HEAD points to a commit instead of a branch. Familiar equivalent: git checkout C."
      },
      {
        "cmd": "git switch feature/booking-api",
        "note": "Reattach HEAD to the feature branch at C. Future commits will advance this branch."
      },
      {
        "cmd": "git switch -c feature/validation",
        "note": "Create a new branch at C AND switch to it. Familiar equivalent: git checkout -b feature/validation. Compare with git branch in the first step: that command did not move HEAD."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.99\"",
        "note": "Introduce an unstaged file edit. Predict whether restoring this file will move HEAD."
      },
      {
        "cmd": "git restore app/service.py",
        "note": "Use restore for file contents: restore this file from the index and discard its unstaged edit. HEAD and branch pointers stay put. Familiar equivalent: git checkout -- app/service.py."
      },
      {
        "cmd": "git switch feature/booking-api",
        "note": "Return to the booking branch. Build the habit: switch for branches, restore for files. checkout still works, but the focused names communicate your intent."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "Multiple branch names can point to C. Branch creation and switching created no extra commits; restoring a file did not move HEAD."
      }
    ]
  },
  {
    "title": "Merge: move forward or join two histories?",
    "short": "Merging branches",
    "seed": "feature",
    "sub": "A fast-forward only moves a pointer. When branches diverge, a merge must combine both histories.",
    "key": "<strong>Count the parents.</strong> A fast-forward creates no commit. A merge commit has two parents; merging does not delete the source branch.",
    "steps": [
      {
        "cmd": "git merge feature/booking-api",
        "note": "develop has no commits of its own: fast-forward from B to D."
      },
      {
        "cmd": "git switch feature/booking-api",
        "note": "Continue the feature from D."
      },
      {
        "cmd": "edit app/api/booking.py \"def get_booking():\\n    return {\\\"status\\\": \\\"confirmed\\\"}\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Stage the booking change."
      },
      {
        "cmd": "git commit -m \"feat(booking): return confirmed booking status\"",
        "note": "The feature branch now has its own new commit."
      },
      {
        "cmd": "git switch develop",
        "note": "Return to develop at D."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.12\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Stage the service change."
      },
      {
        "cmd": "git commit -m \"feat(billing): update standard tax rate to 12%\"",
        "note": "develop now has its own new commit: the branches have diverged."
      },
      {
        "cmd": "git merge feature/booking-api",
        "note": "Changes to different files combine automatically into a merge commit with two parents."
      }
    ]
  },
  {
    "title": "A conflict is a decision about code.",
    "short": "Merge conflicts",
    "seed": "conflict",
    "sub": "Two developers changed the same file. Git needs you to understand the intent on both sides.",
    "key": "<strong>BASE / OURS / THEIRS.</strong> During a merge, OURS is the checked-out branch and THEIRS is the branch being merged in. The right result may combine both. This lab detects conflicts per file; real Git works at a finer, line-based level.",
    "steps": [
      {
        "cmd": "git merge feature/booking-api",
        "note": "The merge pauses. Inspect the three versions in the conflict panel below."
      },
      {
        "cmd": "git status",
        "note": "Identify the file that needs attention. HEAD has not moved."
      },
      {
        "cmd": "edit app/api/booking.py \"def get_booking_info():\\n    return {\\\"status\\\": \\\"confirmed\\\", \\\"customer\\\": True}\"",
        "note": "Keep the clearer function name from develop and the booking data from the feature."
      },
      {
        "cmd": "lab test",
        "note": "Check conflict markers in the lab. In a real repository, run behavioral tests."
      },
      {
        "cmd": "git add app/api/booking.py",
        "note": "Stage the resolved snapshot to mark the file as resolved."
      },
      {
        "cmd": "git commit -m \"fix(booking): preserve customer data in renamed handler\"",
        "note": "Complete the merge with a commit that has two parents."
      },
      {
        "cmd": "git diff",
        "note": "Check for unstaged changes before pushing."
      }
    ]
  },
  {
    "title": "Rebase: same idea, new commits.",
    "short": "Merge vs rebase",
    "seed": "diverged",
    "sub": "Replay the feature changes on top of the latest develop. Watch the commit IDs and parents.",
    "key": "<strong>Merge preserves history. Rebase rewrites it.</strong> Rebasing local/private features can be useful. Avoid rewriting history teammates already use. During a rebase conflict, OURS is the history being rebuilt on the upstream; THEIRS is the commit being replayed.",
    "steps": [
      {
        "cmd": "git switch feature/booking-api",
        "note": "The feature is at D, while develop has advanced to E."
      },
      {
        "cmd": "git fetch origin",
        "note": "Update origin/develop without moving the feature branch."
      },
      {
        "cmd": "git rebase origin/develop",
        "note": "Replay C and D as new commits on E. The old C and D become dashed when no refs reach them."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "The feature history is now linear on top of develop."
      },
      {
        "cmd": "git switch develop",
        "note": "Return to develop to integrate the rebased feature."
      },
      {
        "cmd": "git merge feature/booking-api",
        "note": "develop can now fast-forward."
      }
    ]
  },
  {
    "title": "Undo in the right place, at the right time.",
    "short": "Undoing changes",
    "seed": "base",
    "sub": "Discard a file edit, unstage a change, or amend the last commit? Each needs a different operation.",
    "key": "<strong>restore reads from the index by default.</strong> If staging matches HEAD, the result matches HEAD. --staged only unstages changes and keeps your file edits. Amend creates a new commit, so use it for unshared commits.",
    "steps": [
      {
        "cmd": "edit app/service.py \"tax_rate = 0.99\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git restore app/service.py",
        "note": "Discard the unstaged edit by restoring from the index."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.08\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add app/service.py",
        "note": "The new snapshot is now staged.",
        "question": {
          "prompt": "What does git diff compare? If it shows nothing after git add, does that mean there is nothing to commit?",
          "answer": "git diff: working directory vs. index (staging) — unstaged changes.\ngit diff --staged: index vs. HEAD — what the next commit will record.\ngit diff HEAD: working directory vs. HEAD — the net tracked-file changes, staged and unstaged.\nAn empty git diff can mean your changes are already staged. Untracked files do not appear in the default diff; use git status to find them.\nIn this demo, after the second edit: HEAD = 0.10, index = 0.08, working directory = 0.05. Predict each diff before running it."
        }
      },
      {
        "cmd": "git diff",
        "note": "The output is empty: the working directory matches staging. The staged change still exists and is ready to commit.",
        "question": {
          "prompt": "What does git diff compare? If it shows nothing after git add, does that mean there is nothing to commit?",
          "answer": "git diff: working directory vs. index (staging) — unstaged changes.\ngit diff --staged: index vs. HEAD — what the next commit will record.\ngit diff HEAD: working directory vs. HEAD — the net tracked-file changes, staged and unstaged.\nAn empty git diff can mean your changes are already staged. Untracked files do not appear in the default diff; use git status to find them.\nIn this demo, after the second edit: HEAD = 0.10, index = 0.08, working directory = 0.05. Predict each diff before running it."
        }
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.05\"",
        "note": "Edit again without staging. Now HEAD holds 0.10, staging holds 0.08, and the working directory holds 0.05.",
        "question": {
          "prompt": "What does git diff compare? If it shows nothing after git add, does that mean there is nothing to commit?",
          "answer": "git diff: working directory vs. index (staging) — unstaged changes.\ngit diff --staged: index vs. HEAD — what the next commit will record.\ngit diff HEAD: working directory vs. HEAD — the net tracked-file changes, staged and unstaged.\nAn empty git diff can mean your changes are already staged. Untracked files do not appear in the default diff; use git status to find them.\nIn this demo, after the second edit: HEAD = 0.10, index = 0.08, working directory = 0.05. Predict each diff before running it."
        }
      },
      {
        "cmd": "git diff",
        "note": "Unstaged changes: compare the index (0.08) with the working directory (0.05).",
        "question": {
          "prompt": "What does git diff compare? If it shows nothing after git add, does that mean there is nothing to commit?",
          "answer": "git diff: working directory vs. index (staging) — unstaged changes.\ngit diff --staged: index vs. HEAD — what the next commit will record.\ngit diff HEAD: working directory vs. HEAD — the net tracked-file changes, staged and unstaged.\nAn empty git diff can mean your changes are already staged. Untracked files do not appear in the default diff; use git status to find them.\nIn this demo, after the second edit: HEAD = 0.10, index = 0.08, working directory = 0.05. Predict each diff before running it."
        }
      },
      {
        "cmd": "git diff --staged",
        "note": "Staged changes: compare HEAD (0.10) with the index (0.08). This is what a commit would record now.",
        "question": {
          "prompt": "What does git diff compare? If it shows nothing after git add, does that mean there is nothing to commit?",
          "answer": "git diff: working directory vs. index (staging) — unstaged changes.\ngit diff --staged: index vs. HEAD — what the next commit will record.\ngit diff HEAD: working directory vs. HEAD — the net tracked-file changes, staged and unstaged.\nAn empty git diff can mean your changes are already staged. Untracked files do not appear in the default diff; use git status to find them.\nIn this demo, after the second edit: HEAD = 0.10, index = 0.08, working directory = 0.05. Predict each diff before running it."
        }
      },
      {
        "cmd": "git diff HEAD",
        "note": "Net tracked-file changes: compare HEAD (0.10) with the working directory (0.05).",
        "question": {
          "prompt": "What does git diff compare? If it shows nothing after git add, does that mean there is nothing to commit?",
          "answer": "git diff: working directory vs. index (staging) — unstaged changes.\ngit diff --staged: index vs. HEAD — what the next commit will record.\ngit diff HEAD: working directory vs. HEAD — the net tracked-file changes, staged and unstaged.\nAn empty git diff can mean your changes are already staged. Untracked files do not appear in the default diff; use git status to find them.\nIn this demo, after the second edit: HEAD = 0.10, index = 0.08, working directory = 0.05. Predict each diff before running it."
        }
      },
      {
        "cmd": "git restore --staged app/service.py",
        "note": "Staging returns to HEAD; the edited file is preserved."
      },
      {
        "cmd": "git add .",
        "note": "Stage the intended change again."
      },
      {
        "cmd": "git commit -m \"fix(booking): adjust tax rate\"",
        "note": "Create a new local commit."
      },
      {
        "cmd": "git commit --amend -m \"fix(booking): correct booking tax rate to 5%\"",
        "note": "Replace the last commit with a new commit ID and an improved message."
      }
    ]
  },
  {
    "title": "Reset moves a pointer. Revert records an undo.",
    "short": "Reset vs revert",
    "seed": "feature",
    "sub": "Watch history, staging, and the working directory together as you change reset modes.",
    "key": "<strong>Shared history → prefer revert.</strong> --soft keeps staging; --mixed resets the index but keeps files; --hard resets both the index and tracked files. Revert creates an inverse commit and can cause conflicts.",
    "steps": [
      {
        "cmd": "git switch feature/booking-api",
        "note": "Select the local branch with commits C and D."
      },
      {
        "cmd": "git reset --soft HEAD~1",
        "note": "The branch moves from D back to C. The changes from D remain staged."
      },
      {
        "cmd": "git reset --mixed HEAD",
        "note": "Keep the pointer at C and make the changes unstaged."
      },
      {
        "cmd": "git reset --hard HEAD",
        "note": "Discard the tracked edits. D can still be found in the reflog."
      },
      {
        "cmd": "git revert HEAD",
        "note": "Create a new commit that reverses C. C remains in the history."
      }
    ]
  },
  {
    "title": "Put unfinished work aside for an urgent fix.",
    "short": "Stash",
    "seed": "base",
    "sub": "A temporary pause for uncommitted changes, not a place to store long-term work.",
    "key": "<strong>apply keeps the stash; pop removes it after a successful apply.</strong> Stash excludes untracked files by default. Applying on another base can conflict; this lab requires a clean working tree.",
    "steps": [
      {
        "cmd": "git switch -c feature/booking-api",
        "note": "Start a feature branch."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.07\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git stash",
        "note": "Stash tracked changes and leave the working directory clean."
      },
      {
        "cmd": "git switch -c bugfix/urgent",
        "note": "Switch to an urgent bugfix branch."
      },
      {
        "cmd": "edit app/api/booking.py \"def get_booking():\\n    return {\\\"status\\\": \\\"fixed\\\"}\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Stage the fix."
      },
      {
        "cmd": "git commit -m \"fix(booking): correct booking status response\"",
        "note": "Save the urgent fix in a separate bugfix commit."
      },
      {
        "cmd": "git switch feature/booking-api",
        "note": "Return to the feature branch."
      },
      {
        "cmd": "git stash list",
        "note": "Your unfinished work is still in the stash."
      },
      {
        "cmd": "git stash apply",
        "note": "Restore your unfinished work and keep the stash."
      },
      {
        "cmd": "git restore app/service.py",
        "note": "Discard the applied changes so you can demonstrate pop on a clean working tree."
      },
      {
        "cmd": "git stash pop",
        "note": "Restore the changes again and remove the stash after success."
      }
    ]
  },
  {
    "title": "Take just the fix you need.",
    "short": "Cherry-pick",
    "seed": "cherry",
    "sub": "Apply one commit patch to the current branch without merging the entire source branch.",
    "key": "<strong>Cherry-pick copies a change; it does not move the commit.</strong> The new commit has a different parent and ID. A patch that depends on earlier commits may fail to apply or cause behavioral bugs.",
    "steps": [
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "C is an isolated fix on bugfix/validation; develop has an independent change."
      },
      {
        "cmd": "git cherry-pick C",
        "note": "Apply only the patch from C to develop, creating a new commit."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "The bugfix branch and the original commit C remain unchanged."
      }
    ]
  },
  {
    "title": "Losing track of a commit is not losing the commit.",
    "short": "Recovery with reflog",
    "seed": "feature",
    "sub": "The reflog records local HEAD movements to help you find your way back.",
    "key": "<strong>Recover with a new branch.</strong> The reflog is local, is not a permanent backup, and is not pushed to GitHub. It cannot recover every change that was never committed.",
    "steps": [
      {
        "cmd": "git switch feature/booking-api",
        "note": "HEAD is currently at D."
      },
      {
        "cmd": "git reset --hard HEAD~2",
        "note": "Move the branch back to B. No branch now points to C or D."
      },
      {
        "cmd": "git reflog",
        "note": "Find D in the history of HEAD movements. Use the dashed graph nodes for reference."
      },
      {
        "cmd": "git switch -c recovery/booking-fix D",
        "note": "Create a new branch at D to keep the commit chain reachable."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "The commits are once again reachable through a named branch."
      }
    ]
  },
  {
    "title": "From a local feature to a Pull Request.",
    "short": "Team workflow · GitHub",
    "seed": "base",
    "sub": "One collaboration cycle: small commits → sync → check → push → PR → review & CI → merge.",
    "key": "<strong>origin/develop is not a live remote.</strong> It is a local tracking ref updated by fetch/push. Merging a PR on GitHub does not update develop on your machine. Lab PR/review actions simulate the GitHub UI.",
    "steps": [
      {
        "cmd": "git switch -c feature/booking-api",
        "note": "Create a feature branch from develop."
      },
      {
        "cmd": "edit app/service.py \"tax_rate = 0.08\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Stage one focused change."
      },
      {
        "cmd": "git commit -m \"fix(booking): correct booking tax rate to 8%\"",
        "note": "Make an atomic commit that is easy to review."
      },
      {
        "cmd": "lab teammate",
        "note": "A teammate pushes a different change to GitHub. Notice that the remote differs from origin/develop."
      },
      {
        "cmd": "git fetch origin",
        "note": "origin/develop catches up with GitHub; local develop stays at B."
      },
      {
        "cmd": "git rebase origin/develop",
        "note": "The feature is unshared: replay its changes on the latest develop."
      },
      {
        "cmd": "lab test",
        "note": "Simulate a pre-PR check. Run real tests in your actual project."
      },
      {
        "cmd": "git status",
        "note": "Check the state of staging and the working directory."
      },
      {
        "cmd": "git diff",
        "note": "Inspect unstaged changes."
      },
      {
        "cmd": "git log --oneline --graph --decorate",
        "note": "Review the feature history before pushing."
      },
      {
        "cmd": "git push -u origin feature/booking-api",
        "note": "Push the feature branch to GitHub."
      },
      {
        "cmd": "lab pr",
        "note": "Open a PR from the feature branch to develop."
      },
      {
        "cmd": "lab review",
        "note": "Simulate an approved code review and passing CI."
      },
      {
        "cmd": "lab merge-pr",
        "note": "GitHub creates a merge commit. Local state has not changed."
      },
      {
        "cmd": "git switch develop",
        "note": "Return to local develop, which is still at B."
      },
      {
        "cmd": "git pull origin develop",
        "note": "First fetch GitHub history, then integrate develop into the CURRENT branch. We switched to local develop in the previous step, so local develop now catches up. This lab uses fetch + merge.",
        "question": {
          "prompt": "Does git pull only download changes? If you run git pull origin develop while on a feature branch, which local branch changes?",
          "answer": "pull first fetches remote history, then integrates the selected history into the CURRENT branch. It does not switch to local develop.\nfetch alone updates remote-tracking information without integrating it into your current branch.\nReal Git: --no-rebase chooses merge; --rebase replays local commits; --ff-only refuses a divergent history. Flags and configuration determine the integration behavior.\nWithout explicit arguments, pull normally uses the current branch upstream. Integration can stop for conflicts or be rejected.\nThis simulator implements pull as fetch + merge only. The alternatives above describe real Git, not additional supported lab options."
        }
      }
    ]
  },
  {
    "title": "Two developers. One router file.",
    "short": "Practical backend demo",
    "seed": "base",
    "sub": "Follow a feature through branching, conflict, integration, checks, a mistake, and recovery.",
    "key": "<strong>Understand intent before changing history.</strong> The booking and customer features both edit the router. Preserve both sets of data, then validate the behavior in your real FastAPI repository.",
    "steps": [
      {
        "cmd": "git switch -c feature/booking-api",
        "note": "Developer A starts the booking feature."
      },
      {
        "cmd": "edit app/api/booking.py \"def get_booking():\\n    return {\\\"booking\\\": True}\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Stage the router change from developer A."
      },
      {
        "cmd": "git commit -m \"feat(booking): include booking flag in API response\"",
        "note": "Save the change on the booking feature branch."
      },
      {
        "cmd": "git switch develop",
        "note": "Return to the common starting point."
      },
      {
        "cmd": "git switch -c feature/customer-api",
        "note": "Developer B starts from develop."
      },
      {
        "cmd": "edit app/api/booking.py \"def get_booking_info():\\n    return {\\\"customer\\\": True}\"",
        "note": "Edit the file in the simulated editor. This is not a Git command."
      },
      {
        "cmd": "git add .",
        "note": "Stage the router change from developer B."
      },
      {
        "cmd": "git commit -m \"feat(customer): include customer context in booking response\"",
        "note": "Both branches now have independent changes in the same file."
      },
      {
        "cmd": "git switch develop",
        "note": "Prepare to integrate the customer feature."
      },
      {
        "cmd": "git merge feature/customer-api",
        "note": "Fast-forward the customer feature into develop."
      },
      {
        "cmd": "git switch feature/booking-api",
        "note": "Developer A synchronizes develop into the booking feature."
      },
      {
        "cmd": "git merge develop",
        "note": "A conflict occurs: OURS = booking; THEIRS = develop/customer."
      },
      {
        "cmd": "edit app/api/booking.py \"def get_booking_info():\\n    return {\\\"booking\\\": True, \\\"customer\\\": True}\"",
        "note": "Combine both intentions and remove the conflict markers."
      },
      {
        "cmd": "lab test",
        "note": "Check for conflict markers. Run the real API/tests outside the lab when using a real repository."
      },
      {
        "cmd": "git add .",
        "note": "Stage the combined result."
      },
      {
        "cmd": "git commit -m \"fix(booking): retain booking and customer data after merge\"",
        "note": "The merge commit records the result with two parents."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "Read the history before the next operation."
      },
      {
        "cmd": "git reset --hard HEAD~1",
        "note": "Simulate accidentally removing the merge commit from the branch tip."
      },
      {
        "cmd": "git reflog",
        "note": "The removed commit is still in the reflog."
      },
      {
        "cmd": "git switch -c recovery/booking-fix HEAD@{1}",
        "note": "Create a recovery branch at the position before the reset."
      }
    ]
  },
  {
    "title": "Mistakes that make history harder to follow.",
    "short": "Common mistakes",
    "seed": "diverged",
    "sub": "Try an unsuitable command and understand why Git rejects it before choosing the next step.",
    "key": "<strong>Understand the error before fixing it.</strong> Avoid blindly choosing ours/theirs, rebasing shared history, careless reset --hard or force push, mixed-purpose commits, long-lived features, and using stash as a backup.",
    "steps": [
      {
        "cmd": "git merge --ff-only feature/booking-api",
        "expectedRejection": "fast-forward",
        "note": "This command intentionally fails: the branches have diverged, so moving a pointer is not enough."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "Read the graph to understand the state before choosing a solution."
      },
      {
        "cmd": "git merge feature/booking-api",
        "note": "Merge combines both histories and preserves the commits from both sides."
      },
      {
        "cmd": "git push origin develop",
        "note": "The push is a fast-forward because remote develop is an ancestor of the merge result."
      }
    ]
  },
  {
    "title": "Follow the pointers. Understand the operation.",
    "short": "Key takeaways",
    "seed": "diverged",
    "sub": "Before running a command, predict: Where is HEAD? Which branch moves? Will there be a new commit?",
    "key": "<strong>Three questions before each command:</strong> ① Which branch am I on? ② Do I want to change files, pointers, or history? ③ Has this history been shared? Inspect the graph before rewriting history.",
    "steps": [
      {
        "cmd": "git status",
        "note": "Identify the current branch and file state."
      },
      {
        "cmd": "git log --oneline --graph --decorate --all",
        "note": "Find the divergence point: both branches have new commits."
      },
      {
        "cmd": "git merge feature/booking-api",
        "note": "Merge preserves history and adds a commit with two parents."
      },
      {
        "cmd": "git reflog",
        "note": "The reflog shows how HEAD has moved on this machine."
      }
    ]
  },
  {
    "title": "Git playground",
    "short": "Playground · Try it yourself",
    "seed": "base",
    "sub": "Create branches, make commits, and test ideas. Every operation affects only the simulated repository in your browser.",
    "key": "<strong>Start here:</strong> git switch -c feature/my-idea → edit app/service.py \"tax_rate = 0.05\" → git add . → git commit -m \"feat(booking): apply 5% promotional tax rate\". Enter commands in the console; click a commit to inspect its snapshot.",
    "steps": []
  }
];

function seed(kind){const r=new Repo();const run=c=>r.run(c);const commit=(f,v,m)=>{r.work[f]=v;r.index=clone(r.work);r.make(m);};if(['feature','diverged'].includes(kind)){run('git switch -c feature/booking-api');commit(FILE,'tax_rate = 0.08','feat(booking): apply 8% tax rate to bookings');commit(FILE,'tax_rate = 0.05','fix(booking): correct discounted tax rate to 5%');run('git switch develop');if(kind==='diverged'){commit(ROUTER,'def get_booking():\n    return {"status": "ready"}','feat(booking): return ready status from booking endpoint');r.remote.develop=r.tip();r.tracking.develop=r.tip();}}if(kind==='conflict'){run('git switch -c feature/booking-api');commit(ROUTER,'def get_booking():\n    return {"status": "confirmed", "customer": True}','feat(booking): include customer context in confirmed bookings');run('git switch develop');commit(ROUTER,'def get_booking_info():\n    return {"status": "ok"}','refactor(booking): rename handler to get_booking_info');}if(kind==='cherry'){run('git switch -c bugfix/validation');commit(FILE,'tax_rate = max(0, 0.10)','fix(billing): prevent negative booking tax rates');run('git switch develop');commit(ROUTER,'def get_booking():\n    return {"status": "ready"}','feat(booking): return ready status from booking endpoint');}return r;}
let repo,lessonIndex=0,cursor=0,history=[],transcript=[],selected=null,lastNote='',fitGraph=false,lastAction=null;
const $=id=>document.getElementById(id);
function reachable(){return new Set([...Object.values(repo.branches),...Object.values(repo.tracking),...Object.values(repo.remote),repo.tip()].flatMap(id=>[...repo.ancestors(id)]));}
function commitLabel(message,x,y){
 const words=message.split(/\s+/),lines=[];let line='';
 for(const word of words){if(line&&(line+' '+word).length>26){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
 if(line)lines.push(line);
 return lines.slice(0,3).map((text,i)=>`<tspan x="${x}" y="${y+i*14}">${esc(text+(i===2&&lines.length>3?'…':''))}</tspan>`).join('');
}
function refChange(previous,current,name){
 if(!previous)return '';
 if(!(name in previous))return name in current?'created':'';
 if(!(name in current))return 'deleted';
 return previous[name]!==current[name]?'moved':'';
}
function renderGraph(){
 const live=reachable(),commits=Object.values(repo.commits),previous=history.at(-1)?.repo;
 const fresh=new Set(previous?commits.filter(c=>!previous.commits[c.id]).map(c=>c.id):[]);
 const labels=id=>[
  ...Object.entries(repo.branches).filter(([,tip])=>tip===id).map(([name])=>({name,label:name+' [local]',current:name===repo.head,change:refChange(previous?.branches,repo.branches,name)})),
  ...Object.entries(repo.tracking).filter(([,tip])=>tip===id).map(([name])=>({name:'origin/'+name,label:'origin/'+name+' [tracking]',current:false,change:refChange(previous?.tracking,repo.tracking,name)}))
 ];
 const maxRefs=Math.max(1,...commits.map(c=>labels(c.id).length));
 const top=70+maxRefs*20,laneGap=155,width=Math.max(620,commits.length*245+120);
 const height=top+(Math.max(...commits.map(c=>c.lane))+1)*laneGap;
 const pos=id=>({x:110+repo.commits[id].n*245,y:top+repo.commits[id].lane*laneGap});
 const zoom=document.body.classList.contains('presentation')?1.25:1;
 let html=`<svg role="group" aria-label="Commit graph. HEAD ${esc(repo.head||'detached')} at ${esc(repo.tip())}" style="display:block;${fitGraph?'width:100%;height:auto;':''}" width="${width*zoom}" height="${height*zoom}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#647893"/></marker></defs>`;
 for(const c of commits){const q=pos(c.id);for(const parent of c.parents){const from=pos(parent);html+=`<path d="M ${q.x-18} ${q.y} C ${q.x-75} ${q.y}, ${from.x+75} ${from.y}, ${from.x+21} ${from.y}" fill="none" stroke="${fresh.has(c.id)?'#ffd75b':live.has(c.id)?'#627895':'#394459'}" stroke-width="2.5" ${live.has(c.id)?'':'stroke-dasharray="5 5"'} marker-end="url(#arrow)"/>`;}}
 for(const c of commits){
  const point=pos(c.id),isHead=c.id===repo.tip(),isNew=fresh.has(c.id),color=isHead?'#7de2b2':live.has(c.id)?'#b5a0ff':'#8290a5';
  html+=`<g class="node ${isNew?'new-commit':''}" role="button" tabindex="0" data-commit="${c.id}" aria-label="${isNew?'New commit':'Commit'} ${c.id}: ${esc(c.message)}"><title>${esc(c.message)}\n${esc(labels(c.id).map(r=>r.label).join(', '))}</title>`;
  if(isHead||isNew)html+=`<circle cx="${point.x}" cy="${point.y}" r="26" fill="none" stroke="${isNew?'#ffd75b':color}" stroke-width="${isNew?3:2}" opacity="${isNew?1:.5}"/>`;
  html+=`<circle class="commit-center" cx="${point.x}" cy="${point.y}" r="17" fill="#1c293b" stroke="${color}" stroke-width="2.5" ${live.has(c.id)?'':'stroke-dasharray="3 3"'}/><text x="${point.x}" y="${point.y+5}" text-anchor="middle" fill="${color}" font-size="14">${c.id}</text>`;
  if(isNew)html+=`<text x="${point.x+34}" y="${point.y+5}" fill="#ffd75b" font-size="12" font-weight="700">NEW</text>`;
  html+=`<text text-anchor="middle" fill="${isNew?'#fff2bc':'#b4c2d6'}" font-size="12">${commitLabel(c.message,point.x,point.y+43)}</text>`;
  labels(c.id).forEach((ref,i)=>{html+=`<text x="${point.x}" text-anchor="middle" y="${point.y-38-i*20}" fill="${ref.change?'#ffc58d':ref.current?'#7de2b2':'#bac9de'}" font-size="12" font-weight="${ref.change?700:400}"><title>${esc(ref.label)}</title>${esc(ref.label)}${ref.current?' ← HEAD':''}${ref.change?' • '+ref.change:''}</text>`;});
  html+='</g>';
 }
 $('graph').innerHTML=html+'</svg>';
 $('graph-fit').textContent=fitGraph?'Actual size':'Fit graph';
 $('graph-fit').setAttribute('aria-pressed',String(fitGraph));
 document.querySelectorAll('[data-commit]').forEach(node=>{const choose=()=>{selected=node.dataset.commit;renderInspector();};node.onclick=choose;node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};});
}
function focusHead(actualSize=false){
 if(actualSize){fitGraph=false;renderGraph();selected=null;renderInspector();}
 const graph=$('graph'),node=graph.querySelector('[data-commit="'+repo.tip()+'"] .commit-center');
 if(!node)return;
 const viewport=graph.getBoundingClientRect(),target=node.getBoundingClientRect();
 graph.scrollLeft+=target.left+target.width/2-viewport.left-graph.clientWidth/2;
 graph.scrollTop+=target.top+target.height/2-viewport.top-graph.clientHeight/2;
}
function renderChanges(){
 const prev=history.at(-1)?.repo;
 if(!prev){$('changes').textContent='Each commit is a snapshot. Arrows point to its parents.';return;}
 const changes=[];
 for(const [field,label] of [['branches','Local'],['tracking','Tracking'],['remote','Remote']]){
  for(const name of new Set([...Object.keys(prev[field]),...Object.keys(repo[field])])){
   const change=refChange(prev[field],repo[field],name),id=repo[field][name];
   if(change)changes.push(`${label} ${field==='tracking'?'origin/':''}${name}: ${change==='created'?'created at '+id:change==='deleted'?'deleted (was at '+prev[field][name]+')':'moved '+prev[field][name]+' → '+id}`);
  }
 }
 const before=prev.head?prev.branches[prev.head]:prev.detached;
 if(prev.head!==repo.head||before!==repo.tip())changes.unshift(`HEAD: ${prev.head||'detached'} @ ${before} → ${repo.head||'detached'} @ ${repo.tip()}`);
 $('changes').innerHTML=changes.length?changes.map(t=>'<div class="ref-change">'+esc(t)+'</div>').join(''):'No branch references or HEAD position changed. Check the file state or output below.';
}
function renderLastAction(){
 const el=$('last-action');el.hidden=!lastAction;
 if(!lastAction){el.replaceChildren();return;}
 const status=lastAction.success?'JUST EXECUTED':lastAction.expected?'EXPECTED REJECTION':'COMMAND FAILED';
 const lines=lastAction.output.split('\n'),brief=lines.slice(0,4).join('\n');
 el.innerHTML=`<div class="action-label ${lastAction.success?'':'action-warning'}">${status}${lastAction.guidedIndex===null?' · CONSOLE':' · STEP '+(lastAction.guidedIndex+1)}</div><code>${esc(lastAction.command)}</code><pre>${esc(brief)}</pre>${lines.length>4?'<a href="#output">Read full output in console ↓</a>':''}`;
}

function renderInspector(){const c=repo.commits[selected||repo.tip()];$('inspector').textContent=`${c.id} · ${c.message}\nParent: ${c.parents.join(' + ')||'none (root)'}  ·  Snapshot (${Object.keys(c.tree).length} files)\n`+Object.entries(c.tree).map(([f,v])=>f+': '+v.replaceAll('\n',' ↵ ')).join('\n');}
function renderState(){
 const files=(base,tree,empty,staged=false)=>{const diff=repo.changed(base,tree);return diff.length?diff.map(f=>`<div class="file">${!(f in tree)?'D':!(f in base)?(staged?'A':'?'):'M'} · ${esc(f)}<code>${esc(tree[f]??'(deleted)')}</code></div>`).join(''):`<span class="empty">${empty}</span>`;};
 const untracked=Object.keys(repo.work).filter(f=>!(f in repo.index)).length;
 $('work').innerHTML='<div class="state-description">Compared with the index · '+Object.keys(repo.work).length+' files present</div>'+files(repo.index,repo.work,'No unstaged changes.')+(untracked?'<div class="remote-caption">? = untracked file</div>':'')+(repo.stashes.length?`<div class="remote-caption">▣ ${repo.stashes.length} saved stash(es)</div>`:'');
 $('stage').innerHTML='<div class="state-description">Compared with HEAD · next commit snapshot</div>'+files(repo.tree(),repo.index,'No staged changes.',true);
 $('work-count').textContent=repo.changed(repo.index,repo.work).length;$('stage-count').textContent=repo.changed(repo.tree(),repo.index).length;
 const groups=[['Local branch · on this machine',repo.branches,''],['Local tracking ref · last known remote',repo.tracking,'origin/'],['Remote branch · on GitHub',repo.remote,'']];
 $('remote').innerHTML=groups.map(([label,refs,prefix])=>`<div class="ref-group"><h3>${label}</h3>${Object.entries(refs).map(([name,id])=>`<div class="remote-line"><span>${esc(prefix+name)}</span><b>${id}</b></div>`).join('')||'<span class="empty">None yet</span>'}</div>`).join('')+(repo.tracking.develop!==repo.remote.develop?'<div class="remote-caption remote-alert">Remote develop has changed. Fetch to update origin/develop.</div>':'')+(repo.pr?`<div class="remote-caption">PR: ${esc(repo.pr.branch)} → develop<br><b>${esc(repo.pr.status)}</b></div>`:'<div class="remote-caption">No Pull Request yet.</div>');
}

function renderConflict(){const el=$('conflict'),p=repo.pending;el.hidden=!p;if(!p)return;el.innerHTML=`<h2>⚑ ${esc(p.type)} paused: combine the intent of both sides</h2><p>BASE = common ancestor / snapshot before the patch · OURS = current side · THEIRS = incoming change.</p>`+p.conflicts.map((c,i)=>`<h3>${esc(c.file)}</h3><div class="versions"><div><b>BASE</b><pre>${esc(c.base)}</pre></div><div><b>OURS</b><pre>${esc(c.ours)}</pre></div><div><b>THEIRS</b><pre>${esc(c.theirs)}</pre></div></div><label for="resolve-${i}">Desired result (edit below, then save)</label><textarea id="resolve-${i}" spellcheck="false">${esc(repo.work[c.file])}</textarea><button data-save="${i}" class="quiet">Save to working directory</button>`).join('')+`<p class="remote-caption">After saving: git add &lt;file&gt; → ${p.type==='merge'?'git commit -m "fix(booking): resolve conflicting router changes"':'git '+p.type+' --continue'}. Or use git ${p.type} --abort.</p>`;el.querySelectorAll('[data-save]').forEach(btn=>btn.onclick=()=>{const i=+btn.dataset.save;execute('edit '+p.conflicts[i].file+' '+JSON.stringify($('resolve-'+i).value),'Saved the conflict resolution; check and stage it before completing the operation.');});}
function renderQuickQuestion(){
 const question=lessons[lessonIndex].steps[cursor-1]?.question;
 const panel=$('quick-question');
 panel.hidden=!question;
 if(!question){panel.replaceChildren();delete panel.dataset.question;return;}
 const key=JSON.stringify(question);
 if(panel.dataset.question===key)return;
 panel.dataset.question=key;
 panel.innerHTML=`<span class="question-label">QUICK QUESTION · ASK THE TEAM</span><p>${esc(question.prompt)}</p><details><summary>Reveal answer / presenter note</summary><p class="question-answer">${esc(question.answer)}</p></details>`;
}
function renderCommandHint(){
 $('command-hint').textContent=cursor>=lessons[lessonIndex].steps.length&&lessons[lessonIndex].steps.length?'Demo complete. You can continue with your own commands.':'Run next step executes the next demo command immediately. You can also enter a custom command and press Run or Enter.';
}

function render(){const stepsScrollTop=$('steps').scrollTop;const l=lessons[lessonIndex];$('catalog').innerHTML=lessons.map((x,i)=>`<button data-lesson="${i}" class="${i===lessonIndex?'active':''}" ${i===lessonIndex?'aria-current="page"':''}><span>${i===14?'⌘':String(i+1).padStart(2,'0')}</span>${esc(x.short)}</button>`).join('');document.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>load(+b.dataset.lesson));$('eyebrow').textContent=lessonIndex===14?'SANDBOX / EXPLORE YOUR IDEAS':`CHAPTER ${String(lessonIndex+1).padStart(2,'0')} / 14`;$('title').textContent=l.title;$('subtitle').textContent=l.sub;$('concept').innerHTML=l.key;$('head-chain').innerHTML=`<b>HEAD</b> → ${repo.head?esc(repo.head)+' → ':''}<b>${esc(repo.tip())}</b>${repo.head?'':' <span class="tag">DETACHED</span>'}${repo.pending?' <span class="tag">· '+repo.pending.type.toUpperCase()+' IN PROGRESS</span>':''}`;renderChanges();$('step-count').textContent=l.steps.length?`${cursor} / ${l.steps.length} STEPS`:'ENTER COMMANDS';$('steps').innerHTML=l.steps.length?l.steps.map((st,i)=>`<div class="step ${i<cursor?'done ':''}${i===cursor?'current ':''}${lastAction?.guidedIndex===i?'just-executed':''}"><span class="num">${i<cursor?'✓':String(i+1).padStart(2,'0')}</span><span class="cmd">${lastAction?.guidedIndex===i?'<strong class="step-label executed-label">'+(lastAction.success?'JUST EXECUTED':lastAction.expected?'EXPECTED REJECTION':'FAILED ATTEMPT')+'</strong>':''}${i===cursor?'<strong class="step-label upcoming-label">UP NEXT</strong>':''}${esc(st.cmd)}${/^(edit|lab) /.test(st.cmd)?'<small>Lab action / not a Git command</small>':''}</span></div>`).join(''):`<div class="step">Try the console below. Examples:</div>${['git switch -c feature/my-idea','edit app/service.py "tax_rate = 0.05"','git add .','git commit -m "feat(booking): apply 5% promotional tax rate"','git switch develop','git merge feature/my-idea'].map(c=>`<button class="step" data-example="${esc(c)}">${esc(c)}</button>`).join('')}`;document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{$('command').value=b.dataset.example;$('command').focus();});$('up-next').innerHTML=l.steps[cursor]?'<span>UP NEXT · STEP '+(cursor+1)+'</span><code>'+esc(l.steps[cursor].cmd)+'</code>':l.steps.length?'<span>DEMO COMPLETE</span>':'<span>PLAYGROUND · RUN YOUR OWN COMMANDS</span>';$('chapter-controls').hidden=!(l.steps.length>0&&cursor>=l.steps.length&&lessonIndex<lessons.length-1);const nextLesson=lessons[lessonIndex+1];$('next-chapter-hint').textContent=nextLesson?'Up next: '+nextLesson.short+' — '+nextLesson.sub:'';$('next-chapter').textContent=lessonIndex===lessons.length-2?'Open playground →':'Next chapter →';$('next').disabled=cursor>=l.steps.length;$('back').disabled=!history.length;$('explanation').textContent=lastNote||'The repository is ready. Predict what will change, then click Run next step.';$('output').textContent=transcript.join('\n\n')||'$ git status\nOn branch develop · working tree clean\nRun the demo or type help to get started.';$('help').textContent=HELP;renderCommandHint();renderLastAction();renderQuickQuestion();renderGraph();renderInspector();renderState();renderConflict();if(!fitGraph)focusHead();$('output').scrollTop=$('output').scrollHeight;const steps=$('steps');steps.scrollTop=stepsScrollTop;const current=steps.querySelector('.current')||steps.querySelector('.just-executed');if(current){const panelRect=steps.getBoundingClientRect();const stepRect=current.getBoundingClientRect();const visibleTop=panelRect.top+steps.clientTop;const visibleBottom=visibleTop+steps.clientHeight;if(stepRect.top<visibleTop){steps.scrollTop+=stepRect.top-visibleTop;}else if(stepRect.bottom>visibleBottom){steps.scrollTop+=Math.min(stepRect.bottom-visibleBottom,stepRect.top-visibleTop);}}}
function load(index,preserveScroll=false){const pageX=window.scrollX,pageY=window.scrollY;lessonIndex=index;repo=seed(lessons[index].seed);cursor=0;history=[];transcript=[];selected=null;lastNote='';lastAction=null;$('command').value='';$('steps').scrollTop=0;if(location.hash!=='#'+index)historyReplace(index);render();window.scrollTo({left:preserveScroll?pageX:0,top:preserveScroll?pageY:0,behavior:'instant'});}
function historyReplace(index){window.history.replaceState(null,'','#'+index);}
function execute(command,note,advance=false){
 history.push({repo:clone(repo),cursor,transcript:[...transcript],lastNote,selected,lastAction:clone(lastAction),commandInput:$('command').value});
 const guidedIndex=advance?cursor:null;let out,success=true;
 try{out=repo.run(command);lastNote=note||out;}
 catch(e){success=false;repo=Object.assign(new Repo(),history.at(-1).repo);out='⚠ '+e.message;lastNote=out;}
 // The common-mistakes lesson intentionally demonstrates a rejected fast-forward.
 const expectedRejection=advance&&lessons[lessonIndex].steps[cursor]?.expectedRejection==='fast-forward'&&out.includes('fast-forward');
 if(expectedRejection)lastNote=out+' '+note;
 if(advance&&(success||expectedRejection)){cursor++;}
 selected=null;lastAction={command,output:out,success,expected:!!expectedRejection,guidedIndex};transcript.push('$ '+command+'\n'+out);
 if(success||expectedRejection)$('command').value='';
 render();
}
$('graph-head').onclick=()=>focusHead(true);$('graph-fit').onclick=()=>{fitGraph=!fitGraph;$('graph-fit').textContent=fitGraph?'Actual size':'Fit graph';renderGraph();if(!fitGraph)focusHead();};$('graph-expand').onclick=()=>{document.querySelector('.visual').classList.toggle('expanded');renderGraph();if(!fitGraph)focusHead();};$('next').onclick=()=>{const st=lessons[lessonIndex].steps[cursor];if(st)execute(st.cmd,st.note,true);};$('back').onclick=()=>{const prev=history.pop();if(!prev)return;repo=Object.assign(new Repo(),prev.repo);cursor=prev.cursor;transcript=prev.transcript;lastNote=prev.lastNote;selected=prev.selected;lastAction=prev.lastAction??null;$('command').value=prev.commandInput||'';render();};$('reset').onclick=()=>load(lessonIndex,true);$('next-chapter').onclick=()=>{if(lessonIndex<lessons.length-1)load(lessonIndex+1);};$('command-form').onsubmit=e=>{e.preventDefault();const command=$('command').value.trim();if(command)execute(command);};$('present').onclick=()=>{document.body.classList.toggle('presentation');$('present').textContent=document.body.classList.contains('presentation')?'⛶ Exit presentation':'⛶ Present';$('present').setAttribute('aria-pressed',String(document.body.classList.contains('presentation')));renderGraph();if(!fitGraph)focusHead();};window.addEventListener('hashchange',()=>{const n=Number(location.hash.slice(1));if(Number.isInteger(n)&&n>=0&&n<lessons.length)load(n);});document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();$('next').click();}if(e.key==='ArrowLeft'){e.preventDefault();$('back').click();}if(e.key==='Escape')document.querySelector('.visual').classList.remove('expanded');if(e.key==='Escape'&&document.body.classList.contains('presentation'))$('present').click();});load(Math.min(14,Math.max(0,Number(location.hash.slice(1))||0)));
