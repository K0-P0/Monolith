(function(){'use strict';

(function bp(){
    if(document.getElementById('page-ot_vault'))return;
    const div=document.createElement('div');div.id='page-ot_vault';div.className='page';
    div.innerHTML=`
    <div class="stat-row" id="otv-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="otv-form-title">&#x26A1; Log OT Shift</span></div>
        <div class="fg-grid">
            <input type="hidden" id="otv-eid">
            <div class="fg"><label>Date</label><div class="dw"><input id="otv-date" type="date"><button class="cal-btn" onclick="dp('otv-date')">&#x1F4C5;</button></div></div>
            <div class="fg"><label>OT Hours</label><input id="otv-hrs" type="number" step="0.5" placeholder="4.0" oninput="otvault_preview()"></div>
            <div class="fg"><label>Base Pay $ / hr</label><input id="otv-rate" type="number" step="0.01" placeholder="25.00" oninput="otvault_preview()"></div>
            <div class="fg"><label>Multiplier</label><input id="otv-mult" type="number" value="1.5" step="0.1" placeholder="1.5" oninput="otvault_preview()">
                <div style="display:flex;gap:5px;margin-top:6px">
                    <button class="btn btn-g btn-xs" onclick="document.getElementById('otv-mult').value=1.5;otvault_preview()">1.5x</button>
                    <button class="btn btn-g btn-xs" onclick="document.getElementById('otv-mult').value=2;otvault_preview()">2x</button>
                    <button class="btn btn-g btn-xs" onclick="document.getElementById('otv-mult').value=2.5;otvault_preview()">2.5x</button>
                </div>
            </div>
            <div class="fg"><label>Est. Tax %</label><input id="otv-tax" type="number" value="17" step="0.5" placeholder="17" oninput="otvault_preview()"></div>
            <div class="fg"><label>Notes</label><input id="otv-notes" type="text" placeholder="Holiday, double-time weekend..."></div>
            <div class="fg full"><div id="otv-prev"></div></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="otvault_clear()">Clear</button>
                <button class="btn btn-p btn-sm" id="otv-save-btn" onclick="otvault_save()">Save OT Shift</button>
            </div></div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd">
            <span class="card-title">OT History</span>
            <div class="flex-c gap8">
                <select id="otv-mf" onchange="otv_renderList()" style="width:auto;font-size:12px;height:34px"></select>
            </div>
        </div>
        <div id="otv-list"></div>
    </div>`;
    document.getElementById('content').appendChild(div);
    document.getElementById('otv-date').value=ts();
    const lr=localStorage.getItem('otv_rate'),lt=localStorage.getItem('otv_tax'),lm=localStorage.getItem('otv_mult');
    if(lr)document.getElementById('otv-rate').value=lr;
    if(lt)document.getElementById('otv-tax').value=lt;
    if(lm)document.getElementById('otv-mult').value=lm;
})();

window.dashWidget_ot_vault=function(){
    const items=DB['ot_vault']||[];
    const thisMo=items.filter(i=>i.date&&i.date.startsWith(cmk()));
    const moNet=thisMo.reduce((s,i)=>s+parseFloat(i.net||0),0);
    const yr=new Date().getFullYear().toString();
    const ytdNet=items.filter(i=>i.date&&i.date.startsWith(yr)).reduce((s,i)=>s+parseFloat(i.net||0),0);
    return`<div class="card" onclick="navigate('ot_vault')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x26A1; OT Pay</span><span class="badge ba">${thisMo.length} shift${thisMo.length===1?'':'s'} this mo</span></div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">This Month Net</div><div class="stat-val g">${fmtK(moNet)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">YTD OT</div><div class="stat-val am">${fmtK(ytdNet)}</div><div class="stat-bar o"></div></div>
        </div>
    </div>`;
};

window.ot_vault_get_monthly_total=function(){
    const items=DB['ot_vault']||[];
    const monthKey=cmk();
    return items.filter(i=>i.date&&i.date.startsWith(monthKey)).reduce((sum,i)=>sum+parseFloat(i.net||0),0);
};

window.render_ot_vault=async function(){
    const items=(DB['ot_vault']||[]).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const mk=cmk(),yr=new Date().getFullYear().toString();
    const thisMo=items.filter(i=>i.date?.startsWith(mk));
    const ytd=items.filter(i=>i.date?.startsWith(yr));
    const moNet=thisMo.reduce((s,i)=>s+parseFloat(i.net||0),0);
    const ytdNet=ytd.reduce((s,i)=>s+parseFloat(i.net||0),0);
    const avgNet=items.length?items.reduce((s,i)=>s+parseFloat(i.net||0),0)/items.length:0;

    const statsEl=document.getElementById('otv-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">This Month Net</div><div class="stat-val g">${fmt(moNet)}</div><div class="stat-sub">${thisMo.length} shift${thisMo.length===1?'':'s'}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">YTD OT</div><div class="stat-val">${fmt(ytdNet)}</div><div class="stat-sub">${ytd.length} shift${ytd.length===1?'':'s'} this year</div><div class="stat-bar o"></div></div>
        <div class="stat"><div class="stat-label">Total Shifts</div><div class="stat-val">${items.length}</div><div class="stat-sub">all time</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">Avg Per Shift</div><div class="stat-val am">${items.length?fmt(avgNet):'—'}</div><div class="stat-sub">net take-home</div><div class="stat-bar o"></div></div>`;

    otv_buildFilter(items);
    otv_renderList(items);
};

function otv_buildFilter(items){
    const sel=document.getElementById('otv-mf');if(!sel)return;
    const mk=cmk();
    const months=[...new Set([...items.map(i=>i.date?.slice(0,7)).filter(Boolean),mk])].sort().reverse();
    const prev=sel.value||mk;
    sel.innerHTML=`<option value="all">All Time</option>`+months.map(m=>{
        const[y,mo]=m.split('-');
        const l=new Date(y,parseInt(mo)-1,1).toLocaleString('en-US',{month:'long',year:'numeric'});
        return`<option value="${m}"${m===prev?' selected':''}>${l}</option>`;
    }).join('');
}

function otv_renderList(items){
    if(!items)items=(DB['ot_vault']||[]).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const sel=document.getElementById('otv-mf');
    const filter=sel?.value||'all';
    const shown=filter==='all'?items:items.filter(i=>i.date?.startsWith(filter));
    const list=document.getElementById('otv-list');if(!list)return;
    if(!shown.length){
        list.innerHTML=`<div class="empty"><div class="ei">&#x26A1;</div><p class="ep">${filter==='all'?'No OT shifts logged yet.':'No shifts this period.'}</p></div>`;
        return;
    }
    if(filter==='all'){
        const groups={};
        shown.forEach(i=>{const mo=i.date?.slice(0,7)||'';if(!groups[mo])groups[mo]=[];groups[mo].push(i);});
        list.innerHTML=Object.entries(groups).sort(([a],[b])=>b.localeCompare(a)).map(([mo,grp])=>{
            const[y,m]=mo.split('-');
            const label=new Date(y,parseInt(m)-1,1).toLocaleString('en-US',{month:'long',year:'numeric'});
            const moNet=grp.reduce((s,i)=>s+parseFloat(i.net||0),0);
            return`<div style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--line)">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-family:var(--fm);font-weight:700">${label}</div>
                    <div class="mono g" style="font-size:12px;font-weight:700">${fmt(moNet)} net</div>
                </div>
                ${grp.map(otv_card).join('')}
            </div>`;
        }).join('');
    }else{
        const moNet=shown.reduce((s,i)=>s+parseFloat(i.net||0),0);
        const moGross=shown.reduce((s,i)=>s+parseFloat(i.gross||0),0);
        list.innerHTML=`<div style="display:flex;gap:20px;padding:8px 0 12px;border-bottom:1px solid var(--line);margin-bottom:8px">
            <div><span class="dm" style="font-size:11px">Gross </span><span class="mono am" style="font-size:13px;font-weight:700">${fmt(moGross)}</span></div>
            <div><span class="dm" style="font-size:11px">Net </span><span class="mono g" style="font-size:13px;font-weight:700">${fmt(moNet)}</span></div>
            <div><span class="dm" style="font-size:11px">Shifts </span><span class="mono" style="font-size:13px;font-weight:700">${shown.length}</span></div>
        </div>`+shown.map(otv_card).join('');
    }
}
window.otv_renderList=otv_renderList;

function otv_card(i){
    const otRate=(parseFloat(i.rate||0)*parseFloat(i.multiplier||1.5));
    const taxPct=parseFloat(i.tax_rate||0);
    return`<div style="background:var(--bg2);border:1px solid var(--line);border-radius:var(--r2);padding:13px 15px;margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="text-align:center;flex-shrink:0;min-width:38px">
                <div style="font-family:var(--fm);font-size:18px;font-weight:700;color:var(--bright);line-height:1.1">${new Date(i.date+'T00:00:00').getDate()}</div>
                <div style="font-family:var(--fm);font-size:9px;color:var(--muted);text-transform:uppercase">${new Date(i.date+'T00:00:00').toLocaleString('en-US',{month:'short'})}</div>
            </div>
            <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:var(--bright)">${i.hours}h &times; ${i.multiplier}x &nbsp;<span style="color:var(--muted);font-size:11px;font-weight:400">@ ${fmt(otRate)}/hr OT</span></div>
                        ${i.notes?`<div style="font-size:11px;color:var(--dim);margin-top:2px;font-family:var(--fm)">${escapeHtml(i.notes)}</div>`:''}
                    </div>
                    <div class="mono g" style="font-size:16px;font-weight:700;flex-shrink:0;margin-left:10px">${fmt(i.net)}</div>
                </div>
                <div style="display:flex;gap:12px;font-size:11px;font-family:var(--fm);color:var(--dim)">
                    <span>Gross <span class="mono am">${fmt(i.gross)}</span></span>
                    <span>Tax&nbsp;(${taxPct}%) <span class="mono r">-${fmt(i.tax_amt)}</span></span>
                </div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0;margin-left:4px">
                <button class="btn btn-g btn-xs" onclick="otvault_edit('${i.id}')">&#x270F;</button>
                <button class="btn btn-d btn-xs" onclick="otvault_del('${i.id}')">&#x2715;</button>
            </div>
        </div>
    </div>`;
}

window.otvault_preview=function(){
    const h=parseFloat(document.getElementById('otv-hrs').value)||0;
    const r=parseFloat(document.getElementById('otv-rate').value)||0;
    const m=parseFloat(document.getElementById('otv-mult').value)||1.5;
    const t=parseFloat(document.getElementById('otv-tax').value)||17;
    const otRate=r*m,gross=h*otRate,taxAmt=gross*(t/100),net=gross-taxAmt;
    const prev=document.getElementById('otv-prev');if(!prev)return;
    if(!gross){prev.innerHTML='';return;}
    prev.innerHTML=`<div class="alert al-s" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <span>${h}h &times; ${fmt(otRate)}/hr OT</span>
        <span style="color:var(--dim)">&rarr;</span>
        <span>Gross <strong class="mono am">${fmt(gross)}</strong></span>
        <span style="color:var(--dim)">&minus;</span>
        <span>Tax <strong class="mono r">${fmt(taxAmt)}</strong></span>
        <span style="color:var(--dim)">=</span>
        <span>Net <strong class="mono g" style="font-size:15px">${fmt(net)}</strong></span>
    </div>`;
};

window.otvault_save=async function(){
    const id=document.getElementById('otv-eid').value;
    const rate=document.getElementById('otv-rate').value;
    const mult=document.getElementById('otv-mult').value;
    const tax=document.getElementById('otv-tax').value;
    const body={
        date:document.getElementById('otv-date').value,
        hours:document.getElementById('otv-hrs').value,
        rate,multiplier:mult,tax_rate:tax,
        notes:document.getElementById('otv-notes').value.trim()
    };
    if(!body.hours){toast('Hours required','wn');return;}
    if(rate)localStorage.setItem('otv_rate',rate);
    if(mult)localStorage.setItem('otv_mult',mult);
    if(tax)localStorage.setItem('otv_tax',tax);
    try{
        if(id)await api('PUT',`/api/mod/ot_vault/${id}`,body);
        else await api('POST','/api/mod/ot_vault/',body);
        toast(id?'Updated':'OT Saved','ok');
        otvault_clear();
        await loadMod('ot_vault');
        await renderDashboard();
        await render_ot_vault();
    }catch(e){toast(e.message,'er');}
};

window.otvault_edit=function(id){
    const item=(DB['ot_vault']||[]).find(i=>i.id===id);if(!item)return;
    document.getElementById('otv-eid').value=item.id;
    document.getElementById('otv-date').value=item.date;
    document.getElementById('otv-hrs').value=item.hours;
    document.getElementById('otv-rate').value=item.rate;
    document.getElementById('otv-mult').value=item.multiplier;
    document.getElementById('otv-tax').value=item.tax_rate;
    document.getElementById('otv-notes').value=item.notes||'';
    const t=document.getElementById('otv-form-title');if(t)t.textContent='Edit OT Shift';
    const b=document.getElementById('otv-save-btn');if(b)b.textContent='Update Shift';
    otvault_preview();
    document.getElementById('otv-hrs').scrollIntoView({behavior:'smooth',block:'center'});
};

window.otvault_del=async function(id){
    if(!confirm('Delete this shift?'))return;
    try{
        await api('DELETE',`/api/mod/ot_vault/${id}`);
        toast('Deleted','ok');
        await loadMod('ot_vault');
        await renderDashboard();
        await render_ot_vault();
    }catch(e){toast(e.message,'er');}
};

window.otvault_clear=function(){
    document.getElementById('otv-eid').value='';
    document.getElementById('otv-hrs').value='';
    const p=document.getElementById('otv-prev');if(p)p.innerHTML='';
    document.getElementById('otv-notes').value='';
    document.getElementById('otv-date').value=ts();
    const t=document.getElementById('otv-form-title');if(t)t.textContent='⚡ Log OT Shift';
    const b=document.getElementById('otv-save-btn');if(b)b.textContent='Save OT Shift';
};
})();
