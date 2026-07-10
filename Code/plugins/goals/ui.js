(function(){'use strict';
const GL_ID='goals';
const GL_TYPES={save:{label:'Save Up',icon:'&#x1F4B0;',badge:'bg'},payoff:{label:'Pay Down',icon:'&#x1F4B3;',badge:'br-b'},income:{label:'Income',icon:'&#x1F4C8;',badge:'bb'},custom:{label:'Custom',icon:'&#x1F3C1;',badge:'bgr'}};

function gl_math(gx){
    const start=parseFloat(gx.start||0),cur=parseFloat(gx.current||0),tgt=parseFloat(gx.target||0);
    const span=tgt-start;
    let pct=span!==0?Math.round(((cur-start)/span)*100):0;
    pct=Math.max(0,Math.min(100,pct));
    const done=span>=0?cur>=tgt:cur<=tgt;
    const rem=Math.abs(tgt-cur);
    const pace=parseFloat(gx.monthly_pace||0);
    let moLeft=null,needed=null,onTrack=null,eta=null;
    if(gx.target_date&&!done){
        const days=du(gx.target_date);
        moLeft=days>0?days/30.44:0;
        needed=moLeft>0?rem/moLeft:null;
        if(pace>0)onTrack=needed!==null?pace>=needed:false;
    }
    if(pace>0&&!done){
        const mo=Math.ceil(rem/pace);
        const d=new Date();d.setMonth(d.getMonth()+mo);
        eta={months:mo,label:d.toLocaleString('en-US',{month:'short',year:'numeric'})};
    }
    return{pct,done,rem,pace,needed,onTrack,eta};
}

(function bp(){
    if(document.getElementById('page-goals'))return;
    const d=document.createElement('div');d.id='page-goals';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="gl-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="gl-form-title">&#x1F3C1; Add Goal</span><span class="badge bgr" id="gl-badge"></span></div>
        <input type="hidden" id="gl-eid">
        <div class="fg-grid">
            <div class="fg"><label>Goal Name</label><input id="gl-name" type="text" placeholder="House down payment, be debt-free..."></div>
            <div class="fg"><label>Type</label><select id="gl-type">
                <option value="save">Save Up</option>
                <option value="payoff">Pay Down</option>
                <option value="income">Income Milestone</option>
                <option value="custom">Custom</option>
            </select></div>
            <div class="fg"><label>Starting Point $</label><input id="gl-start" type="number" placeholder="0.00" step="0.01"></div>
            <div class="fg"><label>Current $</label><input id="gl-cur" type="number" placeholder="0.00" step="0.01"></div>
            <div class="fg"><label>Target $</label><input id="gl-tgt" type="number" placeholder="0.00" step="0.01"></div>
            <div class="fg"><label>Planned $ / Month</label><input id="gl-pace" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Target Date</label><div class="dw"><input id="gl-td" type="date"><button class="cal-btn" onclick="dp('gl-td')">&#x1F4C5;</button></div></div>
            <div class="fg"><label>Notes</label><input id="gl-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="gl_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="gl_save()">Save Goal</button>
            </div></div>
        </div>
    </div>
    <div id="gl-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px"></div>`;
    document.getElementById('content').appendChild(d);
})();

window.dashWidget_goals=function(){
    const items=DB[GL_ID]||[];
    if(!items.length)return'';
    const ms=items.map(gx=>({gx,m:gl_math(gx)}));
    const active=ms.filter(x=>!x.m.done);
    const doneN=ms.length-active.length;
    const tracked=active.filter(x=>x.m.onTrack!==null);
    const onTrackN=tracked.filter(x=>x.m.onTrack).length;
    return`<div class="card" onclick="navigate('goals')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x1F3C1; Goals</span><span class="badge ${doneN===ms.length?'bg':'bgr'}">${doneN} / ${ms.length} achieved</span></div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">Active</div><div class="stat-val">${active.length}</div><div class="stat-bar b"></div></div>
            <div class="stat"><div class="stat-label">On Track</div><div class="stat-val ${tracked.length&&onTrackN===tracked.length?'g':onTrackN?'am':''}">${tracked.length?`${onTrackN}/${tracked.length}`:'—'}</div><div class="stat-bar ${tracked.length&&onTrackN===tracked.length?'g':'o'}"></div></div>
        </div>
    </div>`;
};

window.render_goals=async function(){ gl_render(); };

function gl_render(){
    const items=DB[GL_ID]||[];
    const ms=items.map(gx=>({gx,m:gl_math(gx)}));
    const active=ms.filter(x=>!x.m.done);
    const doneN=ms.length-active.length;
    const tracked=active.filter(x=>x.m.onTrack!==null);
    const onTrackN=tracked.filter(x=>x.m.onTrack).length;
    const paceSum=active.reduce((s,x)=>s+x.m.pace,0);
    const dated=active.filter(x=>x.gx.target_date&&du(x.gx.target_date)>=0).sort((a,b)=>du(a.gx.target_date)-du(b.gx.target_date));
    const nxt=dated[0]||null;

    const badge=document.getElementById('gl-badge');
    if(badge)badge.textContent=`${active.length} active`;
    const statsEl=document.getElementById('gl-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Active Goals</div><div class="stat-val">${active.length}</div><div class="stat-sub">${doneN} achieved</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">On Track</div><div class="stat-val ${tracked.length&&onTrackN===tracked.length?'g':onTrackN?'am':tracked.length?'r':''}">${tracked.length?`${onTrackN} / ${tracked.length}`:'—'}</div><div class="stat-sub">${tracked.length?'with date + pace':'set dates & pace'}</div><div class="stat-bar ${tracked.length&&onTrackN===tracked.length?'g':'o'}"></div></div>
        <div class="stat"><div class="stat-label">Committed / Mo</div><div class="stat-val b">${fmtK(paceSum)}</div><div class="stat-sub">planned pace</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">Next Deadline</div><div class="stat-val ${nxt?'am':''}">${nxt?du(nxt.gx.target_date)+'d':'—'}</div><div class="stat-sub">${nxt?escapeHtml(nxt.gx.name):'no dated goals'}</div><div class="stat-bar ${nxt?'o':''}"></div></div>`;

    const grid=document.getElementById('gl-grid');if(!grid)return;
    if(!items.length){
        grid.innerHTML=`<div class="card" style="grid-column:1/-1"><div class="empty"><div class="ei">&#x1F3C1;</div><p class="ep">No goals yet. Add your first big-picture goal above.</p></div></div>`;
        return;
    }
    const order={false:0,true:1};
    ms.sort((a,b)=>order[a.m.done]-order[b.m.done]||(a.gx.target_date||'9999').localeCompare(b.gx.target_date||'9999'));
    grid.innerHTML=ms.map(({gx,m})=>{
        const t=GL_TYPES[gx.goal_type]||GL_TYPES.custom;
        const barC=m.done?'var(--green)':m.pct>=60?'#8b7cf8':'var(--amber)';
        const borderC=m.done?'var(--green)':m.onTrack===false?'var(--red)':m.pct>=30?'var(--amber)':'var(--line2)';
        let statusBadge='';
        if(m.done)statusBadge=`<span class="badge bg">&#x2713; Achieved</span>`;
        else if(m.onTrack===true)statusBadge=`<span class="badge bg">On Track</span>`;
        else if(m.onTrack===false)statusBadge=`<span class="badge br-b">Behind</span>`;
        let paceLine='';
        if(!m.done){
            const bits=[];
            if(m.needed!==null)bits.push(`needs <b class="mono">${fmt(m.needed)}</b>/mo`);
            if(m.pace>0)bits.push(`planned ${fmt(m.pace)}/mo`);
            if(m.eta)bits.push(`ETA ${m.eta.label}`);
            paceLine=bits.length?`<div style="font-size:11px;color:var(--dim);font-family:var(--fm);margin-top:6px">${bits.join(' &middot; ')}</div>`:'';
        }
        return`<div style="background:var(--bg2);border:1px solid var(--line);border-left:3px solid ${borderC};border-radius:var(--r2);padding:15px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:15px;font-weight:700;color:${m.done?'var(--green)':'var(--bright)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.icon}&nbsp;${escapeHtml(gx.name)}</div>
                    <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
                        <span class="badge ${t.badge}">${t.label}</span>${statusBadge}
                    </div>
                </div>
                <div style="display:flex;gap:5px;flex-shrink:0;margin-left:10px">
                    <button class="btn btn-ok btn-xs" onclick="gl_openupd('${gx.id}')" title="Update progress">&#x2B;</button>
                    <button class="btn btn-g btn-xs" onclick="gl_edit('${gx.id}')">&#x270F;</button>
                    <button class="btn btn-d btn-xs" onclick="gl_del('${gx.id}')">&#x2715;</button>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
                <div class="mono" style="font-size:22px;font-weight:700;color:${m.done?'var(--green)':'var(--bright)'}">${fmt(gx.current)}</div>
                <div style="font-size:12px;color:var(--dim);font-family:var(--fm)">target ${fmt(gx.target)}</div>
            </div>
            <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-bottom:8px">
                <div style="height:100%;background:${barC};width:${m.pct}%;border-radius:4px;transition:width .6s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--fm);color:${m.done?'var(--green)':'var(--dim)'}">
                <span>${m.done?'<b>&#x2713; Goal achieved!</b>':`${fmt(m.rem)} to go`}</span>
                <span>${m.pct}%${gx.target_date&&!m.done?` &middot; by ${fd(gx.target_date)}`:''}</span>
            </div>
            ${paceLine}
            ${gx.notes?`<div style="font-size:10px;color:var(--muted);font-family:var(--fm);margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">${escapeHtml(gx.notes)}</div>`:''}
        </div>`;
    }).join('');
}

window.gl_save=async function(){
    const id=document.getElementById('gl-eid').value;
    const body={
        name:document.getElementById('gl-name').value.trim(),
        goal_type:document.getElementById('gl-type').value,
        start:parseFloat(document.getElementById('gl-start').value)||0,
        current:parseFloat(document.getElementById('gl-cur').value)||0,
        target:parseFloat(document.getElementById('gl-tgt').value)||0,
        monthly_pace:parseFloat(document.getElementById('gl-pace').value)||0,
        target_date:document.getElementById('gl-td').value,
        notes:document.getElementById('gl-notes').value.trim(),
    };
    if(!body.name){toast('Goal name required','wn');return;}
    if(!document.getElementById('gl-start').value)body.start=body.goal_type==='payoff'?body.current:0;
    try{
        if(id)await api('PUT',`/api/mod/goals/${id}`,body);
        else await api('POST','/api/mod/goals/',body);
        toast(id?'Updated':'Goal saved','ok');gl_clear();
        await loadMod(GL_ID);gl_render();
    }catch(e){toast(e.message,'er');}
};

window.gl_edit=function(id){
    const gx=(DB[GL_ID]||[]).find(x=>x.id===id);if(!gx)return;
    document.getElementById('gl-eid').value=gx.id;
    document.getElementById('gl-name').value=gx.name;
    document.getElementById('gl-type').value=gx.goal_type||'save';
    document.getElementById('gl-start').value=gx.start??'';
    document.getElementById('gl-cur').value=gx.current??'';
    document.getElementById('gl-tgt').value=gx.target??'';
    document.getElementById('gl-pace').value=gx.monthly_pace||'';
    document.getElementById('gl-td').value=gx.target_date||'';
    document.getElementById('gl-notes').value=gx.notes||'';
    const ft=document.getElementById('gl-form-title');if(ft)ft.innerHTML='&#x1F3C1; Edit Goal';
    document.getElementById('gl-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.gl_del=async function(id){
    if(!confirm('Delete this goal?'))return;
    try{
        await api('DELETE',`/api/mod/goals/${id}`);
        toast('Deleted','ok');await loadMod(GL_ID);gl_render();
    }catch(e){toast(e.message,'er');}
};

window.gl_clear=function(){
    ['gl-eid','gl-name','gl-start','gl-cur','gl-tgt','gl-pace','gl-td','gl-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
    const s=document.getElementById('gl-type');if(s)s.value='save';
    const ft=document.getElementById('gl-form-title');if(ft)ft.innerHTML='&#x1F3C1; Add Goal';
};

window.gl_openupd=function(id){
    const gx=(DB[GL_ID]||[]).find(x=>x.id===id);if(!gx)return;
    openModal(`Update Progress — ${gx.name}`,`
        <div style="background:var(--bg2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-family:var(--fm);font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)">Current</div>
            <div style="font-family:var(--fm);font-size:20px;font-weight:600;color:var(--bright)">${fmt(gx.current)}</div></div>
            <div style="text-align:right"><div style="font-family:var(--fm);font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)">Target</div>
            <div style="font-family:var(--fm);font-size:14px;font-weight:600;color:var(--dim)">${fmt(gx.target)}</div></div>
        </div>
        <div class="fg" style="margin-bottom:14px"><label>New Current Value $</label>
            <input id="gl-upd-v" type="number" step="0.01" value="${parseFloat(gx.current||0)}"
                   style="height:52px;font-size:18px;font-family:var(--fm)">
        </div>
        <div class="fa">
            <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
            <button class="btn btn-ok" onclick="gl_submitupd('${gx.id}')">Update &#x2713;</button>
        </div>`);
};

window.gl_submitupd=async function(id){
    const v=parseFloat(document.getElementById('gl-upd-v')?.value);
    if(!isFinite(v)){toast('Enter a value','wn');return;}
    const before=(DB[GL_ID]||[]).find(x=>x.id===id);
    const wasDone=before?gl_math(before).done:false;
    try{
        await api('POST',`/api/mod/goals/${id}/progress`,{value:v});
        closeModal();
        await loadMod(GL_ID);gl_render();
        const after=(DB[GL_ID]||[]).find(x=>x.id===id);
        if(after&&!wasDone&&gl_math(after).done){
            if(window.confettiBurst)confettiBurst();
            toast('\u{1F3C1} Goal achieved!','ok');
        }else{
            toast('Progress updated','ok');
        }
    }catch(e){toast(e.message,'er');}
};
})();
