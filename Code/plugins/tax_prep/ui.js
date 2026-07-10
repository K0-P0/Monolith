(function(){'use strict';
const TX_ID='tax_prep';
const TX_CATS={home_office:'Home Office',mileage:'Mileage',supplies:'Supplies',software:'Software & Tools',health:'Health',charity:'Charity',education:'Education',travel:'Travel',other:'Other'};
const TX_CHECK=[
    ['w2','W-2s collected'],
    ['f1099','1099s collected'],
    ['deductions_reviewed','Deductions reviewed & documented'],
    ['quarterlies_paid','All quarterly payments made'],
    ['filed_federal','Federal return filed'],
    ['filed_state','State return filed'],
    ['outcome_recorded','Refund / payment recorded'],
];

function tx_db(){
    const d=DB[TX_ID];
    return(d&&!Array.isArray(d))?d:{deductions:[],payments:[],checklist:{}};
}

function tx_quarters(){
    const y=new Date().getFullYear();
    return[
        {q:`${y}-Q1`,label:`Q1 ${y}`,due:`${y}-04-15`},
        {q:`${y}-Q2`,label:`Q2 ${y}`,due:`${y}-06-15`},
        {q:`${y}-Q3`,label:`Q3 ${y}`,due:`${y}-09-15`},
        {q:`${y}-Q4`,label:`Q4 ${y}`,due:`${y+1}-01-15`},
    ];
}

(function bp(){
    if(document.getElementById('page-tax_prep'))return;
    const d=document.createElement('div');d.id='page-tax_prep';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="tx-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="tx-form-title">&#x1F4D1; Log Deduction</span><span class="badge ba" id="tx-badge"></span></div>
        <input type="hidden" id="tx-eid">
        <div class="fg-grid">
            <div class="fg"><label>Date</label><div class="dw"><input id="tx-date" type="date"><button class="cal-btn" onclick="dp('tx-date')">&#x1F4C5;</button></div></div>
            <div class="fg"><label>Category</label><select id="tx-cat">${Object.entries(TX_CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
            <div class="fg"><label>What Was It</label><input id="tx-label" type="text" placeholder="New monitor, 120 miles to client..."></div>
            <div class="fg"><label>Amount $</label><input id="tx-amt" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Notes</label><input id="tx-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="tx_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="tx_save()">Save Deduction</button>
            </div></div>
        </div>
    </div>
    <div id="tx-catsum" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:2px"></div>
    <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
        <div class="card">
            <div class="card-hd"><span class="card-title">&#x1F3DB; Quarterly Estimated Payments</span></div>
            <div id="tx-quarters"></div>
        </div>
        <div class="card">
            <div class="card-hd"><span class="card-title">&#x2705; Filing Checklist</span><span class="badge bg" id="tx-check-badge"></span></div>
            <div id="tx-checklist"></div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Deduction Log</span></div>
        <div id="tx-list"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
    document.getElementById('tx-date').value=ts();
})();

window.dashWidget_tax_prep=function(){
    const d=tx_db();
    const yr=new Date().getFullYear().toString();
    const ded=d.deductions.filter(x=>(x.date||'').startsWith(yr)).reduce((s,x)=>s+parseFloat(x.amount||0),0);
    const paidQ=new Set(d.payments.map(p=>p.quarter));
    const nxt=tx_quarters().find(q=>!paidQ.has(q.q)&&du(q.due)>=0);
    return`<div class="card" onclick="navigate('tax_prep')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x1F4D1; Tax Prep</span><span class="badge ${nxt&&du(nxt.due)<=30?'ba':'bgr'}">${nxt?`${nxt.label} due ${du(nxt.due)}d`:'quarterlies done'}</span></div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">YTD Deductions</div><div class="stat-val g">${fmtK(ded)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">Est. Paid</div><div class="stat-val am">${fmtK(d.payments.reduce((s,p)=>s+parseFloat(p.amount||0),0))}</div><div class="stat-bar o"></div></div>
        </div>
    </div>`;
};

window.render_tax_prep=async function(){ tx_render(); };

function tx_render(){
    const d=tx_db();
    const yr=new Date().getFullYear().toString();
    const dedYtd=d.deductions.filter(x=>(x.date||'').startsWith(yr));
    const dedTot=dedYtd.reduce((s,x)=>s+parseFloat(x.amount||0),0);
    const payTot=d.payments.reduce((s,p)=>s+parseFloat(p.amount||0),0);
    const paidQ=new Set(d.payments.map(p=>p.quarter));
    const nxt=tx_quarters().find(q=>!paidQ.has(q.q)&&du(q.due)>=0);
    const done=TX_CHECK.filter(([k])=>d.checklist[k]).length;

    const badge=document.getElementById('tx-badge');
    if(badge)badge.textContent=`${dedYtd.length} this year`;
    const statsEl=document.getElementById('tx-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">YTD Deductions</div><div class="stat-val g">${fmtK(dedTot)}</div><div class="stat-sub">${dedYtd.length} item${dedYtd.length===1?'':'s'}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Est. Tax Paid</div><div class="stat-val am">${fmtK(payTot)}</div><div class="stat-sub">${d.payments.length} payment${d.payments.length===1?'':'s'}</div><div class="stat-bar o"></div></div>
        <div class="stat"><div class="stat-label">Next Quarterly</div><div class="stat-val ${nxt&&du(nxt.due)<=30?'am':''}">${nxt?du(nxt.due)+'d':'—'}</div><div class="stat-sub">${nxt?`${nxt.label} · ${fd(nxt.due)}`:'all logged'}</div><div class="stat-bar ${nxt&&du(nxt.due)<=30?'o':'g'}"></div></div>
        <div class="stat"><div class="stat-label">Filing Checklist</div><div class="stat-val ${done===TX_CHECK.length?'g':''}">${done} / ${TX_CHECK.length}</div><div class="stat-sub">${done===TX_CHECK.length?'ready to file':'steps done'}</div><div class="stat-bar ${done===TX_CHECK.length?'g':'b'}"></div></div>`;

    const catsum=document.getElementById('tx-catsum');
    if(catsum){
        const byCat={};
        dedYtd.forEach(x=>{byCat[x.category]=(byCat[x.category]||0)+parseFloat(x.amount||0);});
        catsum.innerHTML=Object.entries(byCat).sort(([,a],[,b])=>b-a).map(([c,amt])=>`
            <div style="display:flex;align-items:center;gap:5px;background:var(--bg2);border:1px solid var(--line);border-left:2px solid var(--green);border-radius:var(--r);padding:5px 10px;font-family:var(--fm);font-size:11px">
                <span style="color:var(--bright);font-weight:700">${escapeHtml(TX_CATS[c]||c)}</span>
                <span style="color:var(--dim)">${fmtK(amt)}</span>
            </div>`).join('');
    }

    tx_renderQuarters(d,paidQ);
    tx_renderChecklist(d,done);
    tx_renderList(d);
}

function tx_renderQuarters(d,paidQ){
    const el=document.getElementById('tx-quarters');if(!el)return;
    el.innerHTML=tx_quarters().map(q=>{
        const pays=d.payments.filter(p=>p.quarter===q.q);
        const amt=pays.reduce((s,p)=>s+parseFloat(p.amount||0),0);
        const paid=pays.length>0;
        const days=du(q.due);
        const overdue=!paid&&days<0;
        const soon=!paid&&days>=0&&days<=30;
        const dotC=paid?'var(--green)':overdue?'var(--red)':soon?'var(--amber)':'var(--line2)';
        return`<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
            <div style="width:8px;height:8px;border-radius:50%;background:${dotC};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--bright)">${q.label}</div>
                <div style="font-size:10px;color:${overdue?'var(--red)':soon?'var(--amber)':'var(--dim)'};font-family:var(--fm)">${paid?`paid ${fd(pays[pays.length-1].date_paid)}`:overdue?`&#x26A0; was due ${fd(q.due)}`:`due ${fd(q.due)}${days>=0?` · ${days}d`:''}`}</div>
            </div>
            ${paid?`<div class="mono g" style="font-size:13px;font-weight:700">${fmt(amt)}</div>
            <button class="btn btn-d btn-xs" onclick="tx_delpay('${pays[pays.length-1].id}')">&#x2715;</button>`
            :`<button class="btn btn-ok btn-xs" onclick="tx_openpay('${q.q}','${q.label}')">+ Log Payment</button>`}
        </div>`;
    }).join('');
}

function tx_renderChecklist(d,done){
    const cb=document.getElementById('tx-check-badge');
    if(cb)cb.textContent=`${done}/${TX_CHECK.length}`;
    const el=document.getElementById('tx-checklist');if(!el)return;
    el.innerHTML=TX_CHECK.map(([k,label])=>{
        const on=!!d.checklist[k];
        return`<div onclick="tx_toggle('${k}',${!on})" style="display:flex;align-items:center;gap:10px;padding:10px 6px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:var(--r)" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
            <div style="width:18px;height:18px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid ${on?'var(--green)':'var(--line2)'};background:${on?'var(--green-bg)':'transparent'};color:var(--green);font-size:12px;font-weight:700">${on?'&#x2713;':''}</div>
            <div style="font-size:13px;color:${on?'var(--dim)':'var(--text)'};${on?'text-decoration:line-through;':''}flex:1">${label}</div>
        </div>`;
    }).join('');
}

function tx_renderList(d){
    const list=document.getElementById('tx-list');if(!list)return;
    const items=[...d.deductions].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if(!items.length){
        list.innerHTML=`<div class="empty"><div class="ei">&#x1F4D1;</div><p class="ep">No deductions logged yet. Every receipt you log now is money at filing time.</p></div>`;
        return;
    }
    list.innerHTML=items.map(x=>{
        const dt=new Date(x.date+'T00:00:00');
        return`<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
            <div style="width:38px;text-align:center;flex-shrink:0">
                <div style="font-family:var(--fm);font-size:19px;font-weight:700;color:var(--bright);line-height:1.1">${dt.getDate()}</div>
                <div style="font-family:var(--fm);font-size:9px;color:var(--muted);text-transform:uppercase">${dt.toLocaleDateString('en-US',{month:'short'})}</div>
            </div>
            <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(x.label||TX_CATS[x.category]||'Deduction')}</div>
                <div style="font-size:10px;color:var(--dim);font-family:var(--fm)">${escapeHtml(TX_CATS[x.category]||x.category)}${x.notes?` &middot; ${escapeHtml(x.notes)}`:''}</div>
            </div>
            <div class="mono g" style="font-size:14px;font-weight:700;flex-shrink:0">${fmt(x.amount)}</div>
            <div style="display:flex;gap:5px;flex-shrink:0">
                <button class="btn btn-g btn-xs" onclick="tx_edit('${x.id}')">&#x270F;</button>
                <button class="btn btn-d btn-xs" onclick="tx_del('${x.id}')">&#x2715;</button>
            </div>
        </div>`;
    }).join('');
}

window.tx_save=async function(){
    const id=document.getElementById('tx-eid').value;
    const body={
        date:document.getElementById('tx-date').value,
        category:document.getElementById('tx-cat').value,
        label:document.getElementById('tx-label').value.trim(),
        amount:parseFloat(document.getElementById('tx-amt').value)||0,
        notes:document.getElementById('tx-notes').value.trim(),
    };
    if(body.amount<=0){toast('Amount required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/tax_prep/deduction/${id}`,body);
        else await api('POST','/api/mod/tax_prep/deduction',body);
        toast(id?'Updated':'Deduction logged','ok');tx_clear();
        await loadModObj(TX_ID);tx_render();
    }catch(e){toast(e.message,'er');}
};

window.tx_edit=function(id){
    const x=tx_db().deductions.find(i=>i.id===id);if(!x)return;
    document.getElementById('tx-eid').value=x.id;
    document.getElementById('tx-date').value=x.date;
    document.getElementById('tx-cat').value=x.category||'other';
    document.getElementById('tx-label').value=x.label||'';
    document.getElementById('tx-amt').value=x.amount;
    document.getElementById('tx-notes').value=x.notes||'';
    const ft=document.getElementById('tx-form-title');if(ft)ft.innerHTML='&#x1F4D1; Edit Deduction';
    document.getElementById('tx-label').scrollIntoView({behavior:'smooth',block:'center'});
};

window.tx_del=async function(id){
    if(!confirm('Delete this deduction?'))return;
    try{
        await api('DELETE',`/api/mod/tax_prep/deduction/${id}`);
        toast('Deleted','ok');await loadModObj(TX_ID);tx_render();
    }catch(e){toast(e.message,'er');}
};

window.tx_clear=function(){
    ['tx-eid','tx-label','tx-amt','tx-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
    document.getElementById('tx-date').value=ts();
    const s=document.getElementById('tx-cat');if(s)s.value='other';
    const ft=document.getElementById('tx-form-title');if(ft)ft.innerHTML='&#x1F4D1; Log Deduction';
};

window.tx_openpay=function(q,label){
    openModal(`Estimated Payment — ${label}`,`
        <div class="fg" style="margin-bottom:10px"><label>Amount Paid $</label>
            <input id="tx-pay-v" type="number" placeholder="0.00" step="0.01" min="0" style="height:52px;font-size:18px;font-family:var(--fm)">
        </div>
        <div class="fg" style="margin-bottom:14px"><label>Date Paid</label>
            <input id="tx-pay-d" type="date" value="${ts()}">
        </div>
        <div class="fa">
            <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
            <button class="btn btn-ok" onclick="tx_submitpay('${q}')">Log Payment &#x2713;</button>
        </div>`);
};

window.tx_submitpay=async function(q){
    const amt=parseFloat(document.getElementById('tx-pay-v')?.value)||0;
    if(amt<=0){toast('Enter an amount','wn');return;}
    try{
        await api('POST','/api/mod/tax_prep/payment',{quarter:q,amount:amt,date_paid:document.getElementById('tx-pay-d')?.value||''});
        toast('Payment logged','ok');closeModal();
        await loadModObj(TX_ID);tx_render();
    }catch(e){toast(e.message,'er');}
};

window.tx_delpay=async function(id){
    if(!confirm('Remove this payment?'))return;
    try{
        await api('DELETE',`/api/mod/tax_prep/payment/${id}`);
        toast('Removed','ok');await loadModObj(TX_ID);tx_render();
    }catch(e){toast(e.message,'er');}
};

window.tx_toggle=async function(key,done){
    try{
        await api('POST','/api/mod/tax_prep/checklist',{key,done});
        const d=tx_db();d.checklist[key]=done;
        tx_render();
    }catch(e){toast(e.message,'er');}
};
})();
