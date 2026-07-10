(function(){'use strict';

function garSpend(v){return(v.logs||[]).reduce((s,l)=>s+parseFloat(l.cost||0),0);}
function garDueState(dateStr){
    if(!dateStr)return{cls:'bgr',text:'No date'};
    const d=du(dateStr);
    if(d<0)return{cls:'br-b',text:'Overdue'};
    if(d<=30)return{cls:'ba',text:'Due soon'};
    return{cls:'bg',text:'Current'};
}

(function bp(){
    if(document.getElementById('gar-list'))return;
    const d=document.createElement('div');d.id='page-garage';d.className='page';
    d.innerHTML=`
    <div class="card">
        <div class="card-hd"><span class="card-title">🚗 Add Vehicle</span><span class="badge bg" id="gar-badge"></span></div>
        <div class="fg-grid">
            <div class="fg"><label>Year</label><input id="gar-year" type="number" placeholder="2020" min="1900" max="2030"></div>
            <div class="fg"><label>Make</label><input id="gar-make" type="text" placeholder="Ford, Chevy..."></div>
            <div class="fg"><label>Model</label><input id="gar-model" type="text" placeholder="F-150, Silverado..."></div>
            <div class="fg"><label>Trim</label><input id="gar-trim" type="text" placeholder="Optional"></div>
            <div class="fg"><label>Nickname</label><input id="gar-nick" type="text" placeholder="Work Truck, Daily..."></div>
            <div class="fg"><label>Current Mileage</label><input id="gar-miles" type="number" placeholder="0" min="0"></div>
            <div class="fg"><label>Insurance Renewal</label><div class="dw"><input id="gar-ins" type="date"><button class="cal-btn" onclick="dp('gar-ins')">📅</button></div></div>
            <div class="fg"><label>Registration Due</label><div class="dw"><input id="gar-reg" type="date"><button class="cal-btn" onclick="dp('gar-reg')">📅</button></div></div>
            <div class="fg"><label>Purchase Date</label><div class="dw"><input id="gar-pdate" type="date"><button class="cal-btn" onclick="dp('gar-pdate')">📅</button></div></div>
            <div class="fg"><label>Notes</label><input id="gar-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="gar_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="gar_saveVehicle()">Add Vehicle</button>
            </div></div>
        </div>
    </div>
    <div class="stat-row" id="gar-stats"></div>
    <div id="gar-list"></div>`;
    const pg=document.getElementById('page-garage');
    if(pg&&!document.getElementById('gar-list'))pg.innerHTML=d.innerHTML;
    else if(!pg)document.getElementById('content').appendChild(d);
})();

window.dashWidget_garage=function(){
    const vehicles=(DB['garage']||{}).vehicles||[];
    const totalSpend=vehicles.reduce((s,v)=>s+garSpend(v),0);
    const dueSoon=vehicles.filter(v=>(v.registration_due&&du(v.registration_due)<=30&&du(v.registration_due)>=0)||(v.insurance&&du(v.insurance)<=30&&du(v.insurance)>=0)).length;
    return`<div class="card" onclick="navigate('garage')" style="cursor:pointer">
        <div class="card-hd">
            <span class="card-title">🚗 Garage</span>
            <span class="badge ${dueSoon?'ba':'bgr'}">${dueSoon?dueSoon+' due soon':vehicles.length+' vehicles'}</span>
        </div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">Fleet</div><div class="stat-val">${vehicles.length}</div><div class="stat-bar b"></div></div>
            <div class="stat"><div class="stat-label">Service Spend</div><div class="stat-val g">${fmtK(totalSpend)}</div><div class="stat-bar g"></div></div>
        </div>
    </div>`;
};

window.render_garage=async function(){
    const data=DB['garage']||{};
    const vehicles=data.vehicles||[];
    const badge=document.getElementById('gar-badge');
    if(badge)badge.textContent=`${vehicles.length} vehicle${vehicles.length!==1?'s':''}`;
    const stats=document.getElementById('gar-stats');
    if(stats){
        const totalSpend=vehicles.reduce((s,v)=>s+garSpend(v),0);
        const alerts=vehicles.filter(v=>{
            const ri=v.registration_due&&du(v.registration_due)<=30&&du(v.registration_due)>=0;
            const ii=v.insurance&&du(v.insurance)<=30&&du(v.insurance)>=0;
            return ri||ii;
        }).length;
        stats.innerHTML=`
            <div class="stat"><div class="stat-label">Vehicles</div><div class="stat-val">${vehicles.length}</div><div class="stat-bar b"></div></div>
            <div class="stat"><div class="stat-label">Total Service</div><div class="stat-val g">${fmtK(totalSpend)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">Due Soon</div><div class="stat-val ${alerts>0?'am':''}">${alerts}</div><div class="stat-bar ${alerts>0?'o':''}"></div></div>`;
    }
    const list=document.getElementById('gar-list');if(!list)return;
    if(!vehicles.length){list.innerHTML=`<div class="card"><div class="empty"><div class="ei">🚗</div><p class="ep">No vehicles yet. Add one above.</p></div></div>`;return;}
    list.innerHTML=vehicles.map(v=>{
        const spend=garSpend(v);
        const regState=garDueState(v.registration_due);
        const insState=garDueState(v.insurance);
        const logs=(v.logs||[]).slice(0,3);
        return`<div class="card" style="margin-bottom:14px">
            <div class="card-hd">
                <div>
                    <div style="font-weight:700;font-size:15px;color:var(--bright)">${escapeHtml(v.year||'')} ${escapeHtml(v.make||'')} ${escapeHtml(v.model||'')} ${escapeHtml(v.trim||'')}</div>
                    ${v.nickname?`<div style="font-size:11px;color:var(--amber);font-family:var(--fm);margin-top:2px">${escapeHtml(v.nickname)}</div>`:''}
                </div>
                <div class="ra">
                    <button class="btn btn-g btn-sm" onclick="gar_openService('${v.id}')">+ Service</button>
                    <button class="btn btn-d btn-xs" onclick="gar_delVehicle('${v.id}')">🗑</button>
                </div>
            </div>
            <div class="stat-row" style="margin-top:10px">
                <div class="stat"><div class="stat-label">Mileage</div><div class="stat-val">${v.current_mileage?parseInt(v.current_mileage).toLocaleString():'—'}</div></div>
                <div class="stat"><div class="stat-label">Service Spend</div><div class="stat-val g">${fmt(spend)}</div></div>
                <div class="stat"><div class="stat-label">Registration</div><div class="stat-val" style="font-size:13px"><span class="badge ${regState.cls}">${regState.text}</span></div><div class="stat-sub">${v.registration_due?fd(v.registration_due):'—'}</div></div>
                <div class="stat"><div class="stat-label">Insurance</div><div class="stat-val" style="font-size:13px"><span class="badge ${insState.cls}">${insState.text}</span></div><div class="stat-sub">${v.insurance?fd(v.insurance):'—'}</div></div>
            </div>
            ${logs.length?`<div style="margin-top:12px"><div style="font-family:var(--fm);font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:6px">Recent Service</div>
            ${logs.map(l=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px">
                <span class="mono dm" style="flex-shrink:0">${fd(l.date)}</span>
                <span style="flex:1">${escapeHtml(l.service)}</span>
                ${l.mileage?`<span class="mono dm">${parseInt(l.mileage).toLocaleString()}mi</span>`:''}
                <span class="mono ${l.cost>0?'r':''}">${l.cost>0?fmt(l.cost):'—'}</span>
                <button class="btn btn-d btn-xs" onclick="gar_delService('${v.id}','${l.id}')">✕</button>
            </div>`).join('')}
            ${(v.logs||[]).length>3?`<div style="font-size:11px;color:var(--dim);margin-top:4px">+${(v.logs||[]).length-3} more</div>`:''}
            </div>`:''}
        </div>`;
    }).join('');
};

window.gar_openService=function(vid){
    openModal('Log Service',`
        <div class="fg-grid">
            <div class="fg full"><label>Service / Work Done</label><input id="gsv-svc" type="text" placeholder="Oil change, tire rotation..."></div>
            <div class="fg"><label>Date</label><div class="dw"><input id="gsv-date" type="date" value="${ts()}"><button class="cal-btn" onclick="dp('gsv-date')">📅</button></div></div>
            <div class="fg"><label>Mileage</label><input id="gsv-miles" type="number" placeholder="0" min="0"></div>
            <div class="fg"><label>Cost $</label><input id="gsv-cost" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg full"><label>Vendor</label><input id="gsv-vendor" type="text" placeholder="Shop name..."></div>
            <div class="fg full"><label>Notes</label><input id="gsv-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
                <button class="btn btn-p btn-sm" onclick="gar_saveService('${vid}')">Log Service</button>
            </div></div>
        </div>`);
    setTimeout(()=>document.getElementById('gsv-svc')?.focus(),100);
};

window.gar_saveVehicle=async function(){
    const body={
        year:document.getElementById('gar-year').value,
        make:document.getElementById('gar-make').value.trim(),
        model:document.getElementById('gar-model').value.trim(),
        trim:document.getElementById('gar-trim').value.trim(),
        nickname:document.getElementById('gar-nick').value.trim(),
        current_mileage:document.getElementById('gar-miles').value||0,
        insurance:document.getElementById('gar-ins').value,
        registration_due:document.getElementById('gar-reg').value,
        purchase_date:document.getElementById('gar-pdate').value,
        notes:document.getElementById('gar-notes').value.trim(),
    };
    if(!body.make||!body.model){toast('Make and model required','wn');return;}
    try{
        await api('POST','/api/mod/garage/vehicle',body);
        toast('Vehicle added','ok');gar_clear();
        await loadMod('garage');await render_garage();
    }catch(e){toast(e.message,'er');}
};

window.gar_saveService=async function(vid){
    const body={
        service:document.getElementById('gsv-svc')?.value?.trim(),
        date:document.getElementById('gsv-date')?.value||ts(),
        mileage:document.getElementById('gsv-miles')?.value||0,
        cost:parseFloat(document.getElementById('gsv-cost')?.value)||0,
        vendor:document.getElementById('gsv-vendor')?.value?.trim()||'',
        notes:document.getElementById('gsv-notes')?.value?.trim()||'',
    };
    if(!body.service){toast('Service description required','wn');return;}
    try{
        await api('POST',`/api/mod/garage/vehicle/${vid}/service`,body);
        toast('Service logged','ok');closeModal();
        await loadMod('garage');await render_garage();
    }catch(e){toast(e.message,'er');}
};

window.gar_delVehicle=async function(vid){
    if(!confirm('Delete this vehicle and all its service history?'))return;
    try{
        await api('DELETE',`/api/mod/garage/vehicle/${vid}`);
        toast('Deleted','ok');await loadMod('garage');await render_garage();
    }catch(e){toast(e.message,'er');}
};

window.gar_delService=async function(vid,sid){
    if(!confirm('Delete this service log entry?'))return;
    try{
        await api('DELETE',`/api/mod/garage/vehicle/${vid}/service/${sid}`);
        toast('Deleted','ok');await loadMod('garage');await render_garage();
    }catch(e){toast(e.message,'er');}
};

window.gar_clear=function(){
    ['gar-year','gar-make','gar-model','gar-trim','gar-nick','gar-miles','gar-ins','gar-reg','gar-pdate','gar-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
};
})();
