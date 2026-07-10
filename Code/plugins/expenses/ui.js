(function(){'use strict';

(function bp(){
    if(document.getElementById('page-expenses'))return;
    const d=document.createElement('div');d.id='page-expenses';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="exp-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Log Expense</span></div>
        <div class="fg-grid">
            <div class="fg"><label>Description</label><input id="exp-desc" type="text" placeholder="What did you buy?"></div>
            <div class="fg"><label>Amount $</label><input id="exp-amt" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Category</label><select id="exp-cat">
                <option>Food &amp; Dining</option><option>Transport / Gas</option><option>Shopping</option>
                <option>Entertainment</option><option>Health / Medical</option><option>Personal Care</option>
                <option>Home</option><option>Tech / Electronics</option><option>Tools / Hardware</option>
                <option>Pet Care</option><option>Other</option>
            </select></div>
            <div class="fg"><label>Date</label><div class="dw"><input id="exp-date" type="date"><button class="cal-btn" onclick="dp('exp-date')">&#x1F4C5;</button></div></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="exp_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="exp_save()">Log Expense</button>
            </div></div>
        </div>
    </div>
    <div class="dash-pair">
        <div class="card">
            <div class="card-hd"><span class="card-title">This Month by Category</span></div>
            <div id="exp-breakdown"></div>
        </div>
        <div class="card">
            <div class="card-hd">
                <span class="card-title">Expense Log</span>
                <select id="exp-mf" onchange="exp_render()" style="width:auto;font-size:12px;height:34px"></select>
            </div>
            <div class="tbl-wrap"><table>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
                <tbody id="exp-tb"></tbody>
            </table></div>
        </div>
    </div>`;
    document.getElementById('content').appendChild(d);
    document.getElementById('exp-date').value=ts();
})();

window.render_expenses=async function(){ exp_buildFilter(); exp_render(); };

window.exp_save=async function(){
    const body={
        desc:document.getElementById('exp-desc').value.trim(),
        amount:parseFloat(document.getElementById('exp-amt').value),
        category:document.getElementById('exp-cat').value,
        date:document.getElementById('exp-date').value||ts()
    };
    if(!body.desc||!body.amount){toast('Description and amount required','wn');return;}
    try{
        await api('POST','/api/mod/expenses/',body);
        toast('Logged','ok');exp_clear();
        await loadMod('expenses');exp_buildFilter();exp_render();
    }catch(e){toast(e.message,'er');}
};

window.exp_del=async function(id){
    if(!confirm('Delete this expense?'))return;
    try{
        await api('DELETE',`/api/mod/expenses/${id}`);
        toast('Deleted','ok');
        await loadMod('expenses');exp_render();
    }catch(e){toast(e.message,'er');}
};

window.exp_clear=function(){
    document.getElementById('exp-desc').value='';
    document.getElementById('exp-amt').value='';
    document.getElementById('exp-date').value=ts();
};

function exp_buildFilter(){
    const sel=document.getElementById('exp-mf');if(!sel)return;
    const cur=cmk();
    const months=[...new Set([...(DB.expenses||[]).map(e=>e.date?.slice(0,7)).filter(Boolean),cur])].sort().reverse();
    const prev=sel.value||cur;
    sel.innerHTML=months.map(m=>{
        const[y,mo]=m.split('-');
        const l=new Date(y,parseInt(mo)-1,1).toLocaleString('en-US',{month:'long',year:'numeric'});
        return`<option value="${m}"${m===prev?' selected':''}>${l}</option>`;
    }).join('');
}

function exp_render(){
    const month=document.getElementById('exp-mf')?.value||cmk();
    const all=DB.expenses||[];
    const expenses=all.filter(e=>e.date?.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));
    const cur=all.filter(e=>e.date?.startsWith(cmk()));
    const curTotal=cur.reduce((s,e)=>s+parseFloat(e.amount),0);
    const days=new Date().getDate();
    const dayAvg=days>0?curTotal/days:0;
    const cats=cur.reduce((m,e)=>{m[e.category]=(m[e.category]||0)+parseFloat(e.amount);return m;},{});
    const topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
    const biggest=cur.length?Math.max(...cur.map(e=>parseFloat(e.amount))):0;

    const statsEl=document.getElementById('exp-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">This Month</div><div class="stat-val r">${fmt(curTotal)}</div><div class="stat-sub">${cur.length} entr${cur.length===1?'y':'ies'}</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Daily Average</div><div class="stat-val">${fmt(dayAvg)}</div><div class="stat-sub">over ${days} day${days===1?'':'s'}</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">Top Category</div><div class="stat-val" style="font-size:14px">${topCat?escapeHtml(topCat[0]):'—'}</div><div class="stat-sub">${topCat?fmt(topCat[1]):'no data yet'}</div><div class="stat-bar o"></div></div>
        <div class="stat"><div class="stat-label">Biggest Single</div><div class="stat-val">${fmt(biggest)}</div><div class="stat-sub">this month</div><div class="stat-bar p"></div></div>`;

    const breakdownEl=document.getElementById('exp-breakdown');
    if(breakdownEl){
        const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
        const ttl=sorted.reduce((s,[,v])=>s+v,0)||1;
        breakdownEl.innerHTML=sorted.length?sorted.map(([cat,amt])=>`
            <div style="margin-bottom:13px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                    <div style="display:flex;align-items:center;gap:7px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${cc(cat)};flex-shrink:0"></div>
                        <span style="font-size:13px">${escapeHtml(cat)}</span>
                    </div>
                    <div class="flex-c gap8">
                        <span class="mono" style="font-size:12px">${fmt(amt)}</span>
                        <span style="font-size:10px;font-family:var(--fm);color:var(--dim);min-width:30px;text-align:right">${Math.round(amt/ttl*100)}%</span>
                    </div>
                </div>
                <div style="height:5px;background:var(--line);border-radius:3px;overflow:hidden">
                    <div style="height:100%;background:${cc(cat)};width:${Math.round(amt/ttl*100)}%;border-radius:3px;transition:width .4s ease"></div>
                </div>
            </div>`).join(''):`<div class="empty"><div class="ei">&#x1F4CA;</div><p class="ep">No expenses this month.</p></div>`;
    }

    const tb=document.getElementById('exp-tb');if(!tb)return;
    if(!expenses.length){
        tb.innerHTML=`<tr><td colspan="5"><div class="empty"><div class="ei">&#x1F9FE;</div><p class="ep">No expenses for this period.</p></div></td></tr>`;
        return;
    }
    tb.innerHTML=expenses.map(e=>`<tr>
        <td class="mono dm">${fd(e.date)}</td>
        <td>${escapeHtml(e.desc)}</td>
        <td><span class="badge" style="background:${cc(e.category)}22;color:${cc(e.category)}">${escapeHtml(e.category)}</span></td>
        <td class="mono r">${fmt(e.amount)}</td>
        <td><button class="btn btn-d btn-xs" onclick="exp_del('${e.id}')">&#x2715;</button></td>
    </tr>`).join('');
}
})();
