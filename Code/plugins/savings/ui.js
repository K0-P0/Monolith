(function(){'use strict';
let _savTab='goal';

(function bp(){
    if(document.getElementById('page-savings'))return;
    const d=document.createElement('div');d.id='page-savings';d.className='page';
    d.innerHTML=`
    <div style="display:flex;background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r);padding:3px">
        <button class="sav-stab" id="st-goal"     onclick="sav_tab('goal')"     style="flex:1;padding:8px 4px;border:none;background:var(--amber);color:#000;cursor:pointer;font-family:var(--fd);font-size:12px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:36px">&#x1F4B0; Goals</button>
        <button class="sav-stab" id="st-roth_ira" onclick="sav_tab('roth_ira')" style="flex:1;padding:8px 4px;border:none;background:transparent;color:var(--ghost);cursor:pointer;font-family:var(--fd);font-size:12px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:36px">&#x1F4C8; Roth IRA</button>
        <button class="sav-stab" id="st-401k"     onclick="sav_tab('401k')"     style="flex:1;padding:8px 4px;border:none;background:transparent;color:var(--ghost);cursor:pointer;font-family:var(--fd);font-size:12px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:36px">&#x1F3DB; 401k</button>
    </div>
    <div class="stat-row" id="sav-stats"></div>
    <div id="sav-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="sav-form-title">Add Goal</span></div>
        <input type="hidden" id="sav-eid">
        <div class="fg-grid">
            <div class="fg"><label>Name</label><input id="sav-name" type="text" placeholder="Emergency Fund, Car, etc."></div>
            <div class="fg"><label>Target $</label><input id="sav-tgt" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Current Balance $</label><input id="sav-cur" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Monthly Contrib $</label><input id="sav-mc" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg" id="sav-fg-em" style="display:none"><label>Employer Match %</label><input id="sav-em" type="number" placeholder="4" step="0.5" min="0" max="100"></div>
            <div class="fg" id="sav-fg-al" style="display:none"><label>Annual Limit $</label><input id="sav-al" type="number" placeholder="7000" step="100" min="0"></div>
            <div class="fg" id="sav-fg-ytd" style="display:none"><label>YTD Contributions $</label><input id="sav-ytd" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Target Date</label><div class="dw"><input id="sav-td" type="date"><button class="cal-btn" onclick="dp('sav-td')">&#x1F4C5;</button></div></div>
            <div class="fg"><label>Notes</label><input id="sav-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="sav_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="sav_save()">Save Goal</button>
            </div></div>
        </div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

window.dashWidget_savings=function(){
    const items=DB.savings||[];
    const totalSaved=items.reduce((s,x)=>s+parseFloat(x.current||0),0);
    const totalTarget=items.reduce((s,x)=>s+parseFloat(x.target||0),0);
    const pct=totalTarget>0?Math.round((totalSaved/totalTarget)*100):0;
    const barC=pct>=75?'var(--green)':pct>=40?'#8b7cf8':'var(--amber)';
    return`<div class="card" onclick="navigate('savings')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x1F3E6; Savings</span><span class="badge bg">${items.length} goal${items.length===1?'':'s'}</span></div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">Total Saved</div><div class="stat-val g">${fmtK(totalSaved)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">Progress</div><div class="stat-val b">${pct}%</div><div class="stat-bar b"></div></div>
        </div>
        ${totalTarget>0?`<div class="bar-w" style="height:6px;margin-top:8px"><div class="bar-f" style="width:${pct}%;background:${barC}"></div></div>`:''}
    </div>`;
};

window.render_savings=async function(){ sav_render(); };

window.sav_tab=function(t){
    _savTab=t;
    document.querySelectorAll('.sav-stab').forEach(b=>{
        const on=b.id===`st-${t}`;
        b.style.background=on?'var(--amber)':'transparent';
        b.style.color=on?'#000':'var(--ghost)';
    });
    document.getElementById('sav-fg-em').style.display=t==='401k'?'':'none';
    const isRet=t==='roth_ira'||t==='401k';
    document.getElementById('sav-fg-al').style.display=isRet?'':'none';
    document.getElementById('sav-fg-ytd').style.display=isRet?'':'none';
    const al=document.getElementById('sav-al');
    if(al&&!al.value){if(t==='roth_ira')al.value='7000';if(t==='401k')al.value='23500';}
    sav_clear();sav_render();
};

window.sav_save=async function(){
    const id=document.getElementById('sav-eid').value;
    const body={
        name:document.getElementById('sav-name').value.trim(),
        savings_type:_savTab,
        target:parseFloat(document.getElementById('sav-tgt').value)||0,
        current:parseFloat(document.getElementById('sav-cur').value)||0,
        monthly_contrib:parseFloat(document.getElementById('sav-mc').value)||0,
        employer_match_pct:parseFloat(document.getElementById('sav-em').value)||0,
        annual_limit:parseFloat(document.getElementById('sav-al').value)||0,
        ytd_contrib:parseFloat(document.getElementById('sav-ytd').value)||0,
        target_date:document.getElementById('sav-td').value,
        notes:document.getElementById('sav-notes').value.trim(),
    };
    if(!body.name||!body.target){toast('Name and target required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/savings/${id}`,body);
        else await api('POST','/api/mod/savings/',body);
        toast(id?'Updated':'Saved','ok');sav_clear();
        await loadMod('savings');sav_render();
    }catch(e){toast(e.message,'er');}
};

window.sav_edit=function(id){
    const gx=(DB.savings||[]).find(x=>x.id===id);if(!gx)return;
    _savTab=gx.savings_type||'goal';sav_tab(_savTab);
    document.getElementById('sav-eid').value=gx.id;
    document.getElementById('sav-name').value=gx.name;
    document.getElementById('sav-tgt').value=gx.target;
    document.getElementById('sav-cur').value=gx.current;
    document.getElementById('sav-mc').value=gx.monthly_contrib||'';
    document.getElementById('sav-em').value=gx.employer_match_pct||'';
    document.getElementById('sav-al').value=gx.annual_limit||'';
    document.getElementById('sav-ytd').value=gx.ytd_contrib||'';
    document.getElementById('sav-td').value=gx.target_date||'';
    document.getElementById('sav-notes').value=gx.notes||'';
    const ft=document.getElementById('sav-form-title');if(ft)ft.textContent='Edit Goal';
    document.getElementById('sav-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.sav_del=async function(id){
    if(!confirm('Delete this goal?'))return;
    try{
        await api('DELETE',`/api/mod/savings/${id}`);
        toast('Deleted','ok');await loadMod('savings');sav_render();
    }catch(e){toast(e.message,'er');}
};

window.sav_clear=function(){
    ['sav-eid','sav-name','sav-tgt','sav-cur','sav-mc','sav-em','sav-al','sav-ytd','sav-td','sav-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
    const ft=document.getElementById('sav-form-title');if(ft)ft.textContent='Add Goal';
};

window.sav_openatb=function(id){
    const gx=(DB.savings||[]).find(x=>x.id===id);if(!gx)return;
    window._atbSign=1;
    const showYtd=(gx.savings_type==='roth_ira'||gx.savings_type==='401k')&&gx.annual_limit>0;
    openModal(`Add to Balance — ${gx.name}`,`
        <div style="background:var(--bg2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-family:var(--fm);font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)">Current Balance</div>
            <div style="font-family:var(--fm);font-size:20px;font-weight:600;color:var(--bright)">${fmt(gx.current)}</div></div>
        </div>
        <div style="display:flex;gap:3px;margin-bottom:12px">
            <button class="btn btn-ok" id="sav-atb-a" onclick="sav_atbsign(1,${gx.current})" style="flex:1;font-size:18px;font-weight:700">+ Add</button>
            <button class="btn btn-g"  id="sav-atb-s" onclick="sav_atbsign(-1,${gx.current})" style="flex:1;font-size:18px;font-weight:700">− Subtract</button>
        </div>
        <div class="fg" style="margin-bottom:10px"><label>Amount $</label>
            <input id="sav-atb-v" type="number" placeholder="0.00" step="0.01" min="0"
                   oninput="sav_atbupd(${gx.current})"
                   style="height:52px;font-size:18px;font-family:var(--fm)">
        </div>
        ${showYtd?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <input type="checkbox" id="sav-atb-ytd" style="width:auto;height:auto;margin:0">
            <label for="sav-atb-ytd" style="font-size:12px;color:var(--text);text-transform:none;letter-spacing:0;font-weight:400;cursor:pointer">Count toward YTD contributions</label>
        </div>`:''}
        <div style="background:var(--bg3);border:1px solid var(--line2);border-radius:var(--r);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-family:var(--fm);font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)">New Balance</span>
            <div id="sav-atb-nb" style="font-family:var(--fm);font-size:18px;font-weight:600;color:var(--bright)">${fmt(gx.current)}</div>
        </div>
        <div class="fa">
            <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
            <button class="btn btn-ok" onclick="sav_submitatb('${id}',${gx.current})">Update Balance ✓</button>
        </div>`);
};

window.sav_atbsign=function(s,cur){
    window._atbSign=s;
    document.getElementById('sav-atb-a').className=`btn ${s===1?'btn-ok':'btn-g'}`;
    document.getElementById('sav-atb-s').className=`btn ${s===-1?'btn-d':'btn-g'}`;
    sav_atbupd(cur);
};

window.sav_atbupd=function(cur){
    const amt=parseFloat(document.getElementById('sav-atb-v')?.value)||0;
    const nb=Math.max(0,cur+(window._atbSign||1)*amt);
    const el=document.getElementById('sav-atb-nb');
    if(el){el.textContent=fmt(nb);el.style.color=nb>=cur?'var(--green)':'var(--red)';}
};

window.sav_submitatb=async function(id,cur){
    const amt=parseFloat(document.getElementById('sav-atb-v')?.value)||0;
    if(amt<=0){toast('Enter an amount','wn');return;}
    const before=(DB.savings||[]).find(x=>x.id===id);
    const wasDone=before?parseFloat(before.current||0)>=parseFloat(before.target||0)&&parseFloat(before.target||0)>0:false;
    try{
        await api('POST',`/api/mod/savings/${id}/add`,{amount:(window._atbSign||1)*amt,add_ytd:document.getElementById('sav-atb-ytd')?.checked||false});
        closeModal();
        await loadMod('savings');sav_render();
        const after=(DB.savings||[]).find(x=>x.id===id);
        const nowDone=after?parseFloat(after.current||0)>=parseFloat(after.target||0)&&parseFloat(after.target||0)>0:false;
        if(!wasDone&&nowDone){
            if(window.confettiBurst)confettiBurst();
            toast('\u{1F389} Goal reached!','ok');
        }else{
            toast('Balance updated','ok');
        }
    }catch(e){toast(e.message,'er');}
};

function sav_render(){
    const items=(DB.savings||[]).filter(x=>(x.savings_type||'goal')===_savTab);
    const ts=items.reduce((s,x)=>s+parseFloat(x.current||0),0);
    const tt=items.reduce((s,x)=>s+parseFloat(x.target||0),0);
    const tc=items.reduce((s,x)=>s+parseFloat(x.monthly_contrib||0),0);
    const isRet=_savTab==='roth_ira'||_savTab==='401k';

    let tile4='';
    if(isRet){
        const totalAl=items.reduce((s,x)=>s+parseFloat(x.annual_limit||0),0);
        const totalYtd=items.reduce((s,x)=>s+parseFloat(x.ytd_contrib||0),0);
        const room=Math.max(0,totalAl-totalYtd);
        tile4=`<div class="stat"><div class="stat-label">Annual Headroom</div><div class="stat-val ${room>0?'g':'r'}">${fmt(room)}</div><div class="stat-sub">left to contribute</div><div class="stat-bar ${room>0?'g':'r'}"></div></div>`;
    }else{
        const done=items.filter(x=>parseFloat(x.current||0)>=parseFloat(x.target||0)).length;
        tile4=`<div class="stat"><div class="stat-label">Complete</div><div class="stat-val ${done>0?'g':''}">${done} / ${items.length}</div><div class="stat-sub">goal${done===1?'':'s'} reached</div><div class="stat-bar ${done>0?'g':''}"></div></div>`;
    }

    const statsEl=document.getElementById('sav-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Total Saved</div><div class="stat-val g">${fmtK(ts)}</div><div class="stat-sub">current balance</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Total Target</div><div class="stat-val">${fmtK(tt)}</div><div class="stat-sub">${tt>0?Math.round((ts/tt)*100)+'% there':'set a target'}</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">Monthly Contrib</div><div class="stat-val b">${fmtK(tc)}</div><div class="stat-sub">going in / mo</div><div class="stat-bar b"></div></div>
        ${tile4}`;

    const grid=document.getElementById('sav-grid');if(!grid)return;
    if(!items.length){
        const icons={goal:'&#x1F4B0;',roth_ira:'&#x1F4C8;','401k':'&#x1F3DB;'};
        grid.innerHTML=`<div class="card" style="grid-column:1/-1"><div class="empty"><div class="ei">${icons[_savTab]||'&#x1F4B0;'}</div><p class="ep">No ${escapeHtml(_savTab.replace('_',' '))} goals yet. Add one below.</p></div></div>`;
        return;
    }

    grid.innerHTML=items.map(gx=>{
        const cur=parseFloat(gx.current||0),tgt=parseFloat(gx.target||0);
        const pct=tgt>0?Math.min(100,Math.round((cur/tgt)*100)):0;
        const rem=Math.max(0,tgt-cur);
        const mc=parseFloat(gx.monthly_contrib||0);
        const done=cur>=tgt;
        const barC=done?'var(--green)':pct>=60?'#8b7cf8':'var(--amber)';
        const borderC=done?'var(--green)':pct>=60?'#8b7cf8':pct>=30?'var(--amber)':'var(--line2)';
        const moLeft=mc>0&&!done?Math.ceil(rem/mc):null;
        let etaStr='';
        if(done)etaStr='Goal reached!';
        else if(moLeft!==null){const ed=new Date();ed.setMonth(ed.getMonth()+moLeft);etaStr=`ETA: ${ed.toLocaleString('en-US',{month:'short',year:'numeric'})}`;}
        const retIRA=gx.savings_type==='roth_ira'||gx.savings_type==='401k';
        const ytd=parseFloat(gx.ytd_contrib||0),al=parseFloat(gx.annual_limit||0);
        const ytdPct=al>0?Math.min(100,Math.round((ytd/al)*100)):0;
        const em=parseFloat(gx.employer_match_pct||0);
        return`<div style="background:var(--bg2);border:1px solid var(--line);border-left:3px solid ${borderC};border-radius:var(--r2);padding:15px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:15px;font-weight:700;color:${done?'var(--green)':'var(--bright)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${done?'&#x2713;&nbsp;':''}${escapeHtml(gx.name)}</div>
                    ${gx.notes?`<div style="font-size:11px;color:var(--dim);margin-top:2px;font-family:var(--fm)">${escapeHtml(gx.notes)}</div>`:''}
                </div>
                <div style="display:flex;gap:5px;flex-shrink:0;margin-left:10px">
                    <button class="btn btn-ok btn-xs" onclick="sav_openatb('${gx.id}')" title="Update balance">&#x2B;</button>
                    <button class="btn btn-g btn-xs" onclick="sav_edit('${gx.id}')">&#x270F;</button>
                    <button class="btn btn-d btn-xs" onclick="sav_del('${gx.id}')">&#x2715;</button>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
                <div class="mono" style="font-size:22px;font-weight:700;color:${done?'var(--green)':'var(--bright)'}">${fmt(cur)}</div>
                <div style="font-size:12px;color:var(--dim);font-family:var(--fm)">of ${fmt(tgt)}</div>
            </div>
            <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-bottom:8px">
                <div style="height:100%;background:${barC};width:${pct}%;border-radius:4px;transition:width .6s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--fm)">
                <div style="color:${done?'var(--green)':'var(--dim)'}">
                    ${done?'<b>&#x2713; Done!</b>':`${fmt(rem)} left${mc>0?` &middot; ${fmt(mc)}/mo`:''}`}
                </div>
                <div style="color:${done?'var(--green)':'var(--muted)'}">
                    ${done?'':`${pct}% &middot; `}${etaStr}
                </div>
            </div>
            ${retIRA&&al>0?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
                <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--fm);color:var(--dim);margin-bottom:4px">
                    <span>YTD: ${fmt(ytd)} contributed</span>
                    <span>${fmt(Math.max(0,al-ytd))} left in limit</span>
                </div>
                <div style="height:4px;background:var(--line);border-radius:2px;overflow:hidden">
                    <div style="height:100%;background:#8b7cf8;width:${ytdPct}%;border-radius:2px;transition:width .5s ease"></div>
                </div>
                ${em>0?`<div style="font-size:10px;color:var(--dim);font-family:var(--fm);margin-top:4px">&#x2713; ${em}% employer match</div>`:''}
            </div>`:''}
            ${gx.target_date&&!done?`<div style="font-size:10px;color:var(--muted);font-family:var(--fm);margin-top:6px">Target date: ${fd(gx.target_date)}</div>`:''}
        </div>`;
    }).join('');
}
})();
