(function(){'use strict';

(function bp(){
    if(document.getElementById('page-budget'))return;
    const d=document.createElement('div');d.id='page-budget';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="bud-stats"></div>
    <div class="dash-pair">
        <div class="card">
            <div class="card-hd"><span class="card-title">Set Budget Limit</span></div>
            <div class="fg-grid">
                <div class="fg"><label>Category</label><select id="bud-cat">
                    <option>Food &amp; Dining</option><option>Transport / Gas</option>
                    <option>Shopping</option><option>Entertainment</option>
                    <option>Health / Medical</option><option>Personal Care</option>
                    <option>Home</option><option>Tech / Electronics</option>
                    <option>Tools / Hardware</option><option>Pet Care</option>
                    <option>Housing</option><option>Utilities</option>
                    <option>Insurance</option><option>Other</option>
                </select></div>
                <div class="fg"><label>Monthly Limit $</label><input id="bud-lim" type="number" placeholder="0.00" step="0.01" min="0"></div>
                <div class="fg full"><div class="fa"><button class="btn btn-p btn-sm" onclick="bud_save()">Set Limit</button></div></div>
            </div>
            <div id="bud-tip" style="margin-top:14px;font-size:12px;color:var(--dim);font-family:var(--fm);display:none"></div>
        </div>
        <div class="card">
            <div class="card-hd"><span class="card-title">Budget vs Actual &mdash; This Month</span></div>
            <div id="bud-list"></div>
        </div>
    </div>`;
    const pg=document.getElementById('page-budget');
    if(pg&&!document.getElementById('bud-list'))pg.innerHTML=d.innerHTML;
    else if(!pg)document.getElementById('content').appendChild(d);
})();

window.dashWidget_budget=function(){
    const mk=cmk();
    const budgets=DB.budget||[];
    const exps=(DB.expenses||[]).filter(e=>e.date?.startsWith(mk));
    if(!budgets.length)return'';
    let worst={pct:-1,category:'',spent:0,limit:0};
    budgets.forEach(b=>{
        const spent=exps.filter(e=>e.category===b.category).reduce((s,e)=>s+parseFloat(e.amount),0);
        const pct=Math.round((spent/b.limit)*100);
        if(pct>worst.pct)worst={...b,spent,pct};
    });
    const barC=worst.pct>=100?'var(--red)':worst.pct>=80?'var(--amber)':'var(--green)';
    return`<div class="card" onclick="navigate('budget')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x1F3AF; Budget Watch</span></div>
        <div style="font-size:12px;margin-bottom:4px"><b>${escapeHtml(worst.category)}</b>: ${worst.pct}% used</div>
        <div class="bar-w" style="height:8px"><div class="bar-f" style="width:${Math.min(100,worst.pct)}%;background:${barC}"></div></div>
        <div style="font-size:10px;color:var(--dim);margin-top:6px">${fmt(worst.spent)} of ${fmt(worst.limit)}</div>
    </div>`;
};

window.render_budget=async function(){
    await loadMod('expenses');
    bud_render();
};

window.bud_save=async function(){
    const cat=document.getElementById('bud-cat').value;
    const lim=parseFloat(document.getElementById('bud-lim').value);
    if(!lim){toast('Enter a limit','wn');return;}
    try{
        await api('POST','/api/mod/budget/',{category:cat,limit:lim});
        toast('Limit set','ok');
        document.getElementById('bud-lim').value='';
        await loadMod('budget');bud_render();
    }catch(e){toast(e.message,'er');}
};

window.bud_del=async function(id){
    if(!confirm('Remove this budget limit?'))return;
    try{
        await api('DELETE',`/api/mod/budget/${id}`);
        toast('Removed','ok');
        await loadMod('budget');bud_render();
    }catch(e){toast(e.message,'er');}
};

function bud_render(){
    const mk=cmk();
    const exps=(DB.expenses||[]).filter(e=>e.date?.startsWith(mk));
    const items=DB.budget||[];

    const enriched=items.map(b=>{
        const spent=exps.filter(e=>e.category===b.category).reduce((s,e)=>s+parseFloat(e.amount),0);
        const pct=b.limit>0?(spent/b.limit)*100:0;
        return{...b,spent,pct};
    }).sort((a,b)=>b.pct-a.pct);

    const totalBudget=items.reduce((s,b)=>s+parseFloat(b.limit),0);
    const totalSpent=enriched.reduce((s,b)=>s+b.spent,0);
    const remaining=totalBudget-totalSpent;
    const overCount=enriched.filter(b=>b.pct>=100).length;

    const tipEl=document.getElementById('bud-tip');
    if(tipEl&&items.length){
        const budgeted=new Set(items.map(b=>b.category));
        const unbudgeted=[...new Set(exps.map(e=>e.category))].filter(c=>!budgeted.has(c));
        if(unbudgeted.length){
            tipEl.style.display='';
            tipEl.textContent=`Unbudgeted spending detected in: ${unbudgeted.join(', ')}`;
        }else{
            tipEl.style.display='none';
        }
    }

    const statsEl=document.getElementById('bud-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Total Budgeted</div><div class="stat-val">${fmt(totalBudget)}</div><div class="stat-sub">${items.length} categor${items.length===1?'y':'ies'}</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">Spent So Far</div><div class="stat-val r">${fmt(totalSpent)}</div><div class="stat-sub">this month</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Remaining</div><div class="stat-val ${remaining>=0?'g':'r'}">${fmt(Math.abs(remaining))}</div><div class="stat-sub">${remaining>=0?'still available':'over total budget'}</div><div class="stat-bar ${remaining>=0?'g':'r'}"></div></div>
        <div class="stat"><div class="stat-label">Over Budget</div><div class="stat-val ${overCount?'r':''}">${overCount}</div><div class="stat-sub">categor${overCount===1?'y':'ies'} blown</div><div class="stat-bar ${overCount?'r':'g'}"></div></div>`;

    const list=document.getElementById('bud-list');if(!list)return;
    if(!items.length){list.innerHTML=`<div class="empty"><div class="ei">&#x1F3AF;</div><p class="ep">No budget limits set yet. Add a category limit above and Monolith will track it against your expenses automatically.</p></div>`;return;}

    const spentSegs=enriched.filter(b=>b.spent>0).map(b=>({v:b.spent,c:cc(b.category),label:b.category}));
    const donut=(spentSegs.length&&window.svgDonut)?`<div style="display:flex;justify-content:center;margin-bottom:14px">${svgDonut(spentSegs,{size:132,stroke:16,label:fmtK(totalSpent),sub:'of '+fmtK(totalBudget)})}</div>`:'';

    list.innerHTML=donut+enriched.map(b=>{
        const pctClamped=Math.min(100,Math.round(b.pct));
        const over=b.spent>b.limit;
        const barC=over?'var(--red)':b.pct>=80?'var(--amber)':'var(--green)';
        return`
        <div style="padding:14px 0;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:8px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:9px;height:9px;border-radius:50%;background:${barC};flex-shrink:0"></div>
                    <span style="font-weight:700;font-size:13px;color:var(--bright)">${escapeHtml(b.category)}</span>
                    ${over?'<span class="badge br-b">Over</span>':b.pct>=80?'<span class="badge ba">Near Limit</span>':''}
                </div>
                <div class="flex-c gap8">
                    <span class="mono" style="font-size:13px;color:${barC};font-weight:600">${fmt(b.spent)}</span>
                    <span class="dm" style="font-size:12px">/ ${fmt(b.limit)}</span>
                    <span style="font-family:var(--fm);font-size:10px;background:${barC}22;color:${barC};padding:2px 7px;border-radius:20px">${Math.round(b.pct)}%</span>
                    <button class="btn btn-d btn-xs" onclick="bud_del('${b.id}')">&#x2715;</button>
                </div>
            </div>
            <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden">
                <div style="height:100%;background:${barC};width:${pctClamped}%;border-radius:4px;transition:width .5s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            ${over?`<div style="font-size:11px;color:var(--red);margin-top:5px;font-family:var(--fm)">${fmt(b.spent-b.limit)} over limit this month</div>`:`<div style="font-size:11px;color:var(--dim);margin-top:4px;font-family:var(--fm)">${fmt(b.limit-b.spent)} remaining</div>`}
        </div>`;
    }).join('');
}
})();
