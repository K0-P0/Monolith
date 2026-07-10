(function(){'use strict';

(function bp(){
    if(document.getElementById('page-bills'))return;
    const d=document.createElement('div');d.id='page-bills';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="bill-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="bill-form-title">Add Bill</span><span class="badge ba" id="bill-badge"></span></div>
        <div class="fg-grid">
            <input type="hidden" id="bill-eid">
            <div class="fg"><label>Bill Name</label><input id="bill-name" type="text" placeholder="Rent, Electric..."></div>
            <div class="fg"><label>Amount $</label><input id="bill-amt" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Due Day of Month</label><input id="bill-due" type="number" placeholder="1&#x2013;31" min="1" max="31"></div>
            <div class="fg"><label>Category</label><select id="bill-cat">
                <option>Housing</option><option>Utilities</option><option>Insurance</option>
                <option>Transport</option><option>Internet / Phone</option><option>Health</option>
                <option>Food</option><option>Other</option>
            </select></div>
            <div class="fg"><label>Autopay?</label><select id="bill-ap">
                <option value="false">No &#x2014; Manual</option>
                <option value="true">Yes &#x2014; Autopay</option>
            </select></div>
            <div class="fg"><label>Notes</label><input id="bill-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="bill_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="bill_save()">Save Bill</button>
            </div></div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Recurring Bills</span></div>
        <div id="bill-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-top:4px"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

window.render_bills=async function(){ bill_render(); };

window.bill_save=async function(){
    const id=document.getElementById('bill-eid').value;
    const body={
        name:document.getElementById('bill-name').value.trim(),
        amount:parseFloat(document.getElementById('bill-amt').value),
        due_day:parseInt(document.getElementById('bill-due').value),
        category:document.getElementById('bill-cat').value,
        autopay:document.getElementById('bill-ap').value==='true',
        notes:document.getElementById('bill-notes').value.trim()
    };
    if(!body.name||!body.amount||!body.due_day){toast('Name, amount and due day required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/bills/${id}`,body);
        else await api('POST','/api/mod/bills/',body);
        toast(id?'Updated':'Saved','ok');
        bill_clear();await loadMod('bills');bill_render();
    }catch(e){toast(e.message,'er');}
};

window.bill_edit=function(id){
    const r=(DB.bills||[]).find(x=>x.id===id);if(!r)return;
    document.getElementById('bill-eid').value=r.id;
    document.getElementById('bill-name').value=r.name;
    document.getElementById('bill-amt').value=r.amount;
    document.getElementById('bill-due').value=r.due_day;
    document.getElementById('bill-cat').value=r.category;
    document.getElementById('bill-ap').value=r.autopay?'true':'false';
    document.getElementById('bill-notes').value=r.notes||'';
    const t=document.getElementById('bill-form-title');if(t)t.textContent='Edit Bill';
    document.getElementById('bill-name').focus();
    document.getElementById('bill-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.bill_del=async function(id){
    if(!confirm('Delete this bill?'))return;
    try{
        await api('DELETE',`/api/mod/bills/${id}`);
        toast('Deleted','ok');await loadMod('bills');bill_render();
    }catch(e){toast(e.message,'er');}
};

window.bill_clear=function(){
    ['bill-eid','bill-name','bill-amt','bill-due','bill-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
    const t=document.getElementById('bill-form-title');if(t)t.textContent='Add Bill';
};

function bill_render(){
    const items=DB.bills||[];
    const total=items.reduce((s,b)=>s+parseFloat(b.amount),0);
    const dueWeek=items.filter(b=>{const d=du(nextBill(b.due_day));return d>=0&&d<=7;});
    const autopayCount=items.filter(b=>b.autopay).length;
    const manualCount=items.length-autopayCount;

    const badge=document.getElementById('bill-badge');
    if(badge)badge.textContent=`Monthly: ${fmt(total)}`;

    const statsEl=document.getElementById('bill-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Monthly Total</div><div class="stat-val r">${fmt(total)}</div><div class="stat-sub">${items.length} bill${items.length===1?'':'s'} tracked</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Due This Week</div><div class="stat-val ${dueWeek.length?'am':''}">${dueWeek.length}</div><div class="stat-sub">${dueWeek.length?fmt(dueWeek.reduce((s,b)=>s+parseFloat(b.amount),0))+' owed':'all clear &#x2713;'}</div><div class="stat-bar ${dueWeek.length?'o':'g'}"></div></div>
        <div class="stat"><div class="stat-label">Autopay</div><div class="stat-val g">${autopayCount}</div><div class="stat-sub">handled automatically</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Manual</div><div class="stat-val ${manualCount?'am':''}">${manualCount}</div><div class="stat-sub">need action monthly</div><div class="stat-bar ${manualCount?'o':''}"></div></div>`;

    const grid=document.getElementById('bill-grid');if(!grid)return;
    if(!items.length){
        grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">&#x1F4CB;</div><p class="ep">No bills configured yet.</p></div>`;
        return;
    }
    const sorted=[...items].sort((a,b)=>du(nextBill(a.due_day))-du(nextBill(b.due_day)));
    grid.innerHTML=sorted.map(b=>{
        const nxt=nextBill(b.due_day),d=du(nxt);
        const urgColor=d<0?'var(--red)':d<=3?'var(--red)':d<=7?'var(--amber)':'var(--line2)';
        const urgLabel=d<0?'OVERDUE':d===0?'Due TODAY':d===1?'Due tomorrow':`Due in ${d} days`;
        const urgCls=d<=3?'r':d<=7?'am':'dm';
        return`
        <div style="background:var(--bg2);border:1px solid var(--line);border-left:3px solid ${urgColor};border-radius:var(--r2);padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:15px;font-weight:700;color:var(--bright);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(b.name)}</div>
                    <span class="badge" style="background:${cc(b.category)}22;color:${cc(b.category)}">${escapeHtml(b.category)}</span>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:10px">
                    <div class="mono r" style="font-size:18px;font-weight:700">${fmt(b.amount)}</div>
                    <div style="font-size:10px;color:var(--dim);font-family:var(--fm)">per month</div>
                </div>
            </div>
            <div style="padding-top:10px;border-top:1px solid var(--line)">
                <div style="display:flex;justify-content:space-between;align-items:flex-end">
                    <div>
                        <div style="font-size:10px;color:var(--dim);font-family:var(--fm);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Due ${ord(b.due_day)} each month</div>
                        <div class="${urgCls}" style="font-size:12px;font-weight:600">${urgLabel} &middot; ${fd(nxt)}</div>
                        ${b.notes?`<div style="font-size:11px;color:var(--dim);margin-top:3px">${escapeHtml(b.notes)}</div>`:''}
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;margin-left:8px">
                        ${b.autopay?'<span class="badge bg">Autopay</span>':'<span class="badge ba">Manual</span>'}
                        <button class="btn btn-g btn-xs" onclick="bill_edit('${b.id}')">&#x270F;</button>
                        <button class="btn btn-d btn-xs" onclick="bill_del('${b.id}')">&#x2715;</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}
})();
