(function(){'use strict';

(function bp(){
    if(document.getElementById('page-subscriptions'))return;
    const d=document.createElement('div');d.id='page-subscriptions';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="sub-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="sub-form-title">Add Subscription</span></div>
        <div class="fg-grid">
            <input type="hidden" id="sub-eid">
            <div class="fg"><label>Service Name</label><input id="sub-name" type="text" placeholder="Netflix, Spotify..."></div>
            <div class="fg"><label>Amount $</label><input id="sub-amt" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Billing Cycle</label><select id="sub-cycle"><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="annual">Annual</option></select></div>
            <div class="fg"><label>Category</label><select id="sub-cat"><option>Entertainment</option><option>Software</option><option>Gaming</option><option>Music</option><option>Health</option><option>Cloud / Storage</option><option>News</option><option>Utilities</option><option>Other</option></select></div>
            <div class="fg"><label>Next Due Date</label><div class="dw"><input id="sub-due" type="date"><button class="cal-btn" onclick="dp('sub-due')">&#x1F4C5;</button></div></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="sub_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="sub_save()">Save Subscription</button>
            </div></div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Active</span><span class="badge bg" id="sub-active-badge"></span></div>
        <div id="sub-active-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-top:4px"></div>
    </div>
    <div class="card" id="sub-inactive-card" style="display:none">
        <div class="card-hd"><span class="card-title">Paused / Inactive</span><span class="badge bgr" id="sub-inactive-badge"></span></div>
        <div id="sub-inactive-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-top:4px"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

window.render_subscriptions=async function(){ sub_render(); };

window.sub_save=async function(){
    const id=document.getElementById('sub-eid').value;
    const body={name:document.getElementById('sub-name').value.trim(),amount:parseFloat(document.getElementById('sub-amt').value),cycle:document.getElementById('sub-cycle').value,category:document.getElementById('sub-cat').value,next_due:document.getElementById('sub-due').value,active:true};
    if(!body.name||!body.amount){toast('Name and amount required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/subscriptions/${id}`,body);
        else await api('POST','/api/mod/subscriptions/',body);
        toast(id?'Updated':'Saved','ok');sub_clear();
        await loadMod('subscriptions');sub_render();
    }catch(e){toast(e.message,'er');}
};

window.sub_edit=function(id){
    const s=(DB.subscriptions||[]).find(x=>x.id===id);if(!s)return;
    document.getElementById('sub-eid').value=s.id;
    document.getElementById('sub-name').value=s.name;
    document.getElementById('sub-amt').value=s.amount;
    document.getElementById('sub-cycle').value=s.cycle;
    document.getElementById('sub-cat').value=s.category;
    document.getElementById('sub-due').value=s.next_due||'';
    const t=document.getElementById('sub-form-title');if(t)t.textContent='Edit Subscription';
    document.getElementById('sub-name').focus();
    document.getElementById('sub-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.sub_del=async function(id){
    if(!confirm('Delete this subscription?'))return;
    try{
        await api('DELETE',`/api/mod/subscriptions/${id}`);
        toast('Deleted','ok');await loadMod('subscriptions');sub_render();
    }catch(e){toast(e.message,'er');}
};

window.sub_toggle=async function(id){
    const s=(DB.subscriptions||[]).find(x=>x.id===id);if(!s)return;
    try{
        await api('PUT',`/api/mod/subscriptions/${id}`,{...s,active:!s.active});
        await loadMod('subscriptions');sub_render();
    }catch(e){toast(e.message,'er');}
};

window.sub_clear=function(){
    ['sub-eid','sub-name','sub-amt','sub-due'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const t=document.getElementById('sub-form-title');if(t)t.textContent='Add Subscription';
};

function sub_card(s){
    const mo=toMoSub(s.amount,s.cycle);
    const d=du(s.next_due);
    const dLabel=d===Infinity||!s.next_due?'No date set':d<0?'Overdue':d===0?'Due TODAY':d===1?'Due tomorrow':`Due in ${d}d`;
    const dCls=!s.next_due?'dm':d<0?'r':d<=3?'r':d<=7?'am':'dm';
    const cycleLabel={weekly:'/ wk',monthly:'/ mo',annual:'/ yr'}[s.cycle]||'';
    return`
    <div style="background:var(--bg2);border:1px solid var(--line);border-radius:var(--r2);padding:14px 16px;${!s.active?'opacity:.45':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div style="flex:1;min-width:0">
                <div style="font-size:15px;font-weight:700;color:var(--bright);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.name)}</div>
                <span class="badge" style="background:${cc(s.category)}22;color:${cc(s.category)}">${escapeHtml(s.category)}</span>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:10px">
                <div class="mono" style="font-size:18px;font-weight:700;color:var(--bright)">${fmt(s.amount)}<span style="font-size:11px;font-weight:400;color:var(--dim)"> ${cycleLabel}</span></div>
                ${s.cycle!=='monthly'?`<div style="font-size:11px;font-family:var(--fm);color:var(--ghost)">${fmt(mo)}&thinsp;/&thinsp;mo equiv.</div>`:''}
            </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)">
            <div>
                <div class="${dCls}" style="font-size:12px;font-weight:600">${dLabel}</div>
                ${s.next_due?`<div style="font-size:11px;color:var(--dim)">${fd(s.next_due)}</div>`:''}
            </div>
            <div style="display:flex;gap:6px;align-items:center">
                <label class="toggle" title="${s.active?'Pause subscription':'Resume subscription'}">
                    <input type="checkbox" ${s.active?'checked':''} onchange="sub_toggle('${s.id}')">
                    <div class="tgl-tr"></div><div class="tgl-th"></div>
                </label>
                <button class="btn btn-g btn-xs" onclick="sub_edit('${s.id}')">&#x270F;</button>
                <button class="btn btn-d btn-xs" onclick="sub_del('${s.id}')">&#x2715;</button>
            </div>
        </div>
    </div>`;
}

function sub_render(){
    const items=DB.subscriptions||[];
    const active=items.filter(s=>s.active);
    const inactive=items.filter(s=>!s.active);
    const moTotal=active.reduce((s,x)=>s+toMoSub(x.amount,x.cycle),0);
    const annTotal=moTotal*12;

    const statsEl=document.getElementById('sub-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Monthly Cost</div><div class="stat-val r">${fmt(moTotal)}</div><div class="stat-sub">active subs only</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Annual Cost</div><div class="stat-val">${fmtK(annTotal)}</div><div class="stat-sub">per year</div><div class="stat-bar p"></div></div>
        <div class="stat"><div class="stat-label">Active</div><div class="stat-val g">${active.length}</div><div class="stat-sub">subscription${active.length===1?'':'s'}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Paused</div><div class="stat-val dm">${inactive.length}</div><div class="stat-sub">not billing</div><div class="stat-bar"></div></div>`;

    const ab=document.getElementById('sub-active-badge');
    if(ab)ab.textContent=`${fmt(moTotal)}/mo`;
    const ib=document.getElementById('sub-inactive-badge');
    if(ib)ib.textContent=`${inactive.length} paused`;

    const ag=document.getElementById('sub-active-grid');
    if(ag){
        if(!active.length){
            ag.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">&#x1F504;</div><p class="ep">No active subscriptions yet.</p></div>`;
        }else{
            const sorted=[...active].sort((a,b)=>{
                const da=du(a.next_due),db=du(b.next_due);
                if(da===Infinity&&db===Infinity)return 0;
                return da-db;
            });
            ag.innerHTML=sorted.map(s=>sub_card(s)).join('');
        }
    }

    const ic=document.getElementById('sub-inactive-card');
    if(ic)ic.style.display=inactive.length?'':'none';
    const ig=document.getElementById('sub-inactive-grid');
    if(ig)ig.innerHTML=inactive.map(s=>sub_card(s)).join('');
}
})();
