(function(){'use strict';
const DP_ID='debt_payoff';

function payoffPlan(items){
    const active=(items||[]).filter(i=>parseFloat(i.balance)>0.01);
    if(!active.length)return{months:0,totalInterest:0,canCompute:true};
    const strategy=active.find(i=>i.strategy!=='manual')?.strategy||'manual';
    let debts=[...active].map(i=>({...i,balance:parseFloat(i.balance)}));
    let months=0,totalInterest=0;
    const totalOrig=active.reduce((s,i)=>s+parseFloat(i.original||i.balance),0);
    while(debts.some(d=>d.balance>0.01)&&months<1200){
        months++;let freed=0;
        debts.forEach(d=>{if(d.balance<=0.01)return;const mi=d.balance*(parseFloat(d.interest_rate)/100/12);totalInterest+=mi;d.balance+=mi;});
        let ordered=[...debts].filter(d=>d.balance>0.01);
        if(strategy==='snowball')ordered.sort((a,b)=>a.balance-b.balance);
        else if(strategy==='avalanche')ordered.sort((a,b)=>b.interest_rate-a.interest_rate);
        for(let d of ordered){
            let pay=parseFloat(d.min_payment||0)+parseFloat(d.extra_payment||0);
            if(d.id===ordered[0].id)pay+=freed;
            const bb=d.balance;d.balance=Math.max(0,d.balance-pay);
            if(d.balance<=0)freed+=parseFloat(d.min_payment||0);
        }
    }
    return{months,totalInterest,totalOrig,strategy,canCompute:months<1200};
}

function dp_borderColor(d,pct){
    if(pct>=75)return'var(--green)';
    const apr=parseFloat(d.interest_rate||0);
    if(apr>=20)return'var(--red)';
    if(apr>=10)return'var(--amber)';
    return'var(--line2)';
}

function dp_aprBadge(apr){
    if(apr<=0)return'';
    const cls=apr>=20?'br-b':apr>=10?'ba':'bg';
    return`<span class="badge ${cls}" style="font-size:10px">${apr}% APR</span>`;
}

(function bp(){
    if(document.getElementById('dp-grid'))return;
    const d=document.createElement('div');d.id='page-debt_payoff';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="dp-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="dp-form-title">&#x1F4B3; Add Debt</span><span class="badge br-b" id="dp-badge"></span></div>
        <input type="hidden" id="dp-eid">
        <div class="fg-grid">
            <div class="fg"><label>Debt Name</label><input id="dp-name" type="text" placeholder="Car Loan, Credit Card..."></div>
            <div class="fg"><label>Current Balance $</label><input id="dp-bal" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Original Balance $</label><input id="dp-orig" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Min Payment $</label><input id="dp-min" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Extra Payment $</label><input id="dp-extra" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Interest Rate % (APR)</label><input id="dp-apr" type="number" placeholder="19.99" step="0.01" min="0"></div>
            <div class="fg"><label>Due Day of Month</label><input id="dp-due" type="number" placeholder="15" min="1" max="31"></div>
            <div class="fg"><label>Payoff Strategy</label><select id="dp-strat"><option value="manual">Manual</option><option value="snowball">Snowball (lowest balance first)</option><option value="avalanche">Avalanche (highest APR first)</option></select></div>
            <div class="fg"><label>Debt Type</label><input id="dp-type" type="text" placeholder="Credit Card, Auto, Student..."></div>
            <div class="fg"><label>Lender</label><input id="dp-lender" type="text" placeholder="Bank name..."></div>
            <div class="fg"><label>Notes</label><input id="dp-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="dp_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="dp_save()">Save Debt</button>
            </div></div>
        </div>
    </div>
    <div id="dp-plan-card"></div>
    <div id="dp-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px"></div>`;
    document.getElementById('content').appendChild(d);
})();

window.dashWidget_debt_payoff=function(){
    const items=DB[DP_ID]||[];
    const active=items.filter(i=>parseFloat(i.balance)>0.01);
    const plan=payoffPlan(active);
    const totalOwed=active.reduce((s,i)=>s+parseFloat(i.balance),0);
    const totalOrig=active.reduce((s,i)=>s+parseFloat(i.original||i.balance),0);
    const progress=totalOrig>0?Math.round(((totalOrig-totalOwed)/totalOrig)*100):0;
    let freeStr='Add debts to project payoff date';
    if(plan.months>0){const fd2=new Date();fd2.setMonth(fd2.getMonth()+plan.months);freeStr=`Debt-free: <b>${fd2.toLocaleString('en-US',{month:'short',year:'numeric'})}</b> (${plan.months}mo)`;}
    return`<div class="card" onclick="navigate('debt_payoff')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x1F4B3; Debt Payoff</span><span class="badge br-b">${active.length} active</span></div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">Total Owed</div><div class="stat-val r">${fmtK(totalOwed)}</div><div class="stat-bar r"></div></div>
            <div class="stat"><div class="stat-label">Progress</div><div class="stat-val g">${progress}%</div><div class="stat-bar g"></div></div>
        </div>
        <div style="font-size:11px;color:var(--dim);font-family:var(--fm);margin-top:10px">${freeStr}</div>
    </div>`;
};

window.render_debt_payoff=async function(){
    const items=DB[DP_ID]||[];
    const active=items.filter(i=>parseFloat(i.balance)>0.01);
    const totalOwed=active.reduce((s,i)=>s+parseFloat(i.balance),0);
    const totalMin=active.reduce((s,i)=>s+parseFloat(i.min_payment||0),0);
    const totalOrig=active.reduce((s,i)=>s+parseFloat(i.original||i.balance),0);
    const paid=Math.max(0,totalOrig-totalOwed);
    const badge=document.getElementById('dp-badge');
    if(badge)badge.textContent=`Total: ${fmt(totalOwed)}`;
    const stats=document.getElementById('dp-stats');
    if(stats)stats.innerHTML=`
        <div class="stat"><div class="stat-label">Total Owed</div><div class="stat-val r">${fmtK(totalOwed)}</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Total Paid Off</div><div class="stat-val g">${fmtK(paid)}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Min Payments/Mo</div><div class="stat-val am">${fmtK(totalMin)}</div><div class="stat-bar o"></div></div>
        <div class="stat"><div class="stat-label">Debts Tracked</div><div class="stat-val">${active.length}</div><div class="stat-bar"></div></div>`;

    const plan=payoffPlan(active);
    const planCard=document.getElementById('dp-plan-card');
    if(planCard&&plan.months>0&&plan.canCompute){
        const freeDate=new Date();freeDate.setMonth(freeDate.getMonth()+plan.months);
        const freeDateStr=freeDate.toLocaleString('en-US',{month:'long',year:'numeric'});
        const yrs=Math.floor(plan.months/12),mos=plan.months%12;
        const durStr=(yrs>0?`${yrs}y `:'')+(mos>0?`${mos}mo`:'');
        const stratLabel={'snowball':'Snowball — lowest balance first','avalanche':'Avalanche — highest APR first','manual':'Manual payments'}[plan.strategy]||plan.strategy;
        planCard.innerHTML=`<div class="card" style="border-left:3px solid var(--amber);margin-bottom:0">
            <div class="card-hd"><span class="card-title">&#x1F4CA; Payoff Projection</span><span class="badge ba">${stratLabel}</span></div>
            <div class="stat-row">
                <div class="stat"><div class="stat-label">Debt-Free Date</div><div class="stat-val am" style="font-size:15px">${freeDateStr}</div><div class="stat-sub">${durStr} from now</div><div class="stat-bar o"></div></div>
                <div class="stat"><div class="stat-label">Total Interest</div><div class="stat-val r">${fmtK(plan.totalInterest)}</div><div class="stat-sub">cost of carrying debt</div><div class="stat-bar r"></div></div>
                <div class="stat"><div class="stat-label">Total + Interest</div><div class="stat-val">${fmtK(totalOwed+plan.totalInterest)}</div><div class="stat-sub">all-in payoff cost</div><div class="stat-bar"></div></div>
            </div>
        </div>`;
    }else if(planCard){planCard.innerHTML='';}
    dp_renderGrid(items);
};

function dp_renderGrid(items){
    const grid=document.getElementById('dp-grid');if(!grid)return;
    if(!items.length){
        grid.innerHTML=`<div style="grid-column:1/-1"><div class="empty"><div class="ei">&#x1F4B3;</div><p class="ep">No debts tracked yet. Add one above.</p></div></div>`;
        return;
    }
    grid.innerHTML=items.map(d=>{
        const bal=parseFloat(d.balance||0),orig=parseFloat(d.original||d.balance||0);
        const pct=orig>0?Math.min(100,Math.round((orig-bal)/orig*100)):0;
        const barC=pct>=75?'var(--green)':pct>=40?'var(--amber)':'var(--red)';
        const borderC=dp_borderColor(d,pct);
        const apr=parseFloat(d.interest_rate||0);
        const nxt=d.due_day?nextBill(d.due_day):null;
        const dLeft=nxt?du(nxt):null;
        const isPaidOff=bal<=0.01;
        return`<div style="background:var(--bg2);border:1px solid var(--line);border-left:3px solid ${isPaidOff?'var(--green)':borderC};border-radius:var(--r2);padding:15px 16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:15px;font-weight:700;color:${isPaidOff?'var(--green)':'var(--bright)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isPaidOff?'&#x2713;&nbsp;':''}${escapeHtml(d.name)}</div>
                    ${d.debt_type||d.lender?`<div style="font-size:11px;color:var(--dim);font-family:var(--fm);margin-top:2px">${[d.debt_type,d.lender].filter(Boolean).map(s=>escapeHtml(s)).join(' &mdash; ')}</div>`:''}
                </div>
                <div style="display:flex;gap:5px;flex-shrink:0">
                    <button class="btn btn-g btn-xs" onclick="dp_edit('${d.id}')">&#x270F;</button>
                    <button class="btn btn-d btn-xs" onclick="dp_del('${d.id}')">&#x2715;</button>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
                <div class="mono" style="font-size:22px;font-weight:700;color:${isPaidOff?'var(--green)':'var(--red)'}">${fmt(bal)}</div>
                <div style="display:flex;align-items:center;gap:6px">${dp_aprBadge(apr)}</div>
            </div>
            <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-bottom:6px">
                <div style="height:100%;background:${barC};width:${pct}%;border-radius:4px;transition:width .6s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--fm);color:var(--dim);margin-bottom:10px">
                <span>${pct}% paid off</span>
                <span>${fmt(Math.max(0,orig-bal))} of ${fmt(orig)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--fm);flex-wrap:wrap;gap:4px">
                <div style="color:var(--dim)">
                    ${d.min_payment>0?`<span>Min ${fmt(d.min_payment)}/mo</span>`:''}
                    ${parseFloat(d.extra_payment||0)>0?`<span style="color:var(--green)"> +${fmt(d.extra_payment)} extra</span>`:''}
                </div>
                ${dLeft!==null?`<div style="color:${dLeft<=0?'var(--red)':dLeft<=5?'var(--amber)':'var(--dim)'}">
                    ${dLeft<=0?'&#x26A0; Due now':dLeft===0?'Due today':dLeft===1?'Due tomorrow':`Due in ${dLeft}d`}
                </div>`:''}
            </div>
            ${d.notes?`<div style="font-size:10px;color:var(--muted);font-family:var(--fm);margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">${escapeHtml(d.notes)}</div>`:''}
        </div>`;
    }).join('');
}

window.dp_save=async function(){
    const id=document.getElementById('dp-eid').value;
    const body={
        name:document.getElementById('dp-name').value.trim(),
        balance:parseFloat(document.getElementById('dp-bal').value)||0,
        original:parseFloat(document.getElementById('dp-orig').value)||parseFloat(document.getElementById('dp-bal').value)||0,
        min_payment:parseFloat(document.getElementById('dp-min').value)||0,
        extra_payment:parseFloat(document.getElementById('dp-extra').value)||0,
        interest_rate:parseFloat(document.getElementById('dp-apr').value)||0,
        due_day:parseInt(document.getElementById('dp-due').value)||1,
        strategy:document.getElementById('dp-strat').value,
        debt_type:document.getElementById('dp-type').value.trim(),
        lender:document.getElementById('dp-lender').value.trim(),
        notes:document.getElementById('dp-notes').value.trim(),
    };
    if(!body.name){toast('Debt name required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/debt_payoff/${id}`,body);
        else await api('POST','/api/mod/debt_payoff/',body);
        toast(id?'Updated':'Debt added','ok');dp_clear();
        await loadMod(DP_ID);await render_debt_payoff();
    }catch(e){toast(e.message,'er');}
};

window.dp_edit=function(id){
    const d=(DB[DP_ID]||[]).find(x=>x.id===id);if(!d)return;
    document.getElementById('dp-eid').value=d.id;
    document.getElementById('dp-name').value=d.name;
    document.getElementById('dp-bal').value=d.balance;
    document.getElementById('dp-orig').value=d.original;
    document.getElementById('dp-min').value=d.min_payment||'';
    document.getElementById('dp-extra').value=d.extra_payment||'';
    document.getElementById('dp-apr').value=d.interest_rate||'';
    document.getElementById('dp-due').value=d.due_day||'';
    document.getElementById('dp-strat').value=d.strategy||'manual';
    document.getElementById('dp-type').value=d.debt_type||'';
    document.getElementById('dp-lender').value=d.lender||'';
    document.getElementById('dp-notes').value=d.notes||'';
    const ft=document.getElementById('dp-form-title');if(ft)ft.innerHTML='&#x1F4B3; Edit Debt';
    document.getElementById('dp-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.dp_del=async function(id){
    if(!confirm('Delete this debt?'))return;
    try{
        await api('DELETE',`/api/mod/debt_payoff/${id}`);
        toast('Deleted','ok');await loadMod(DP_ID);await render_debt_payoff();
    }catch(e){toast(e.message,'er');}
};

window.dp_clear=function(){
    ['dp-eid','dp-name','dp-bal','dp-orig','dp-min','dp-extra','dp-apr','dp-due','dp-type','dp-lender','dp-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
    const s=document.getElementById('dp-strat');if(s)s.value='manual';
    const ft=document.getElementById('dp-form-title');if(ft)ft.innerHTML='&#x1F4B3; Add Debt';
};
})();
