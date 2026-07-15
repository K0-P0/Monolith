(function(){'use strict';
const FF_ID='freelance_flow';
const STATUSES=['Lead','In Progress','Invoiced','Partial','Paid','Archived'];

const FF_COLOR={
    'Lead':'var(--line2)',
    'In Progress':'var(--amber)',
    'Invoiced':'#8b7cf8',
    'Partial':'#fb923c',
    'Paid':'var(--green)',
    'Archived':'var(--line)',
};
const FF_BADGE={'Lead':'bgr','In Progress':'bb','Invoiced':'ba','Partial':'ba','Paid':'bg','Archived':'bgr'};

const ffNum=v=>isFinite(parseFloat(v))?parseFloat(v):0;
const ffNet=j=>Math.max(0,ffNum(j.amount_received)-ffNum(j.expenses)-ffNum(j.tax_set_aside));
const ffOut=j=>Math.max(0,ffNum(j.quote_amount)-ffNum(j.amount_received));
function ffOverdue(j){
    if(j.status==='Paid'||j.status==='Archived'||!j.due_date)return false;
    return ffOut(j)>0&&du(j.due_date)<0;
}

(function bp(){
    if(document.getElementById('ff-list'))return;
    const d=document.createElement('div');d.id='page-freelance_flow';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="ff-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title" id="ff-form-title">&#x1F4BC; Add Job</span><span class="badge bgr" id="ff-badge"></span></div>
        <input type="hidden" id="ff-eid">
        <div class="fg-grid">
            <div class="fg"><label>Job Title</label><input id="ff-title" type="text" placeholder="Website redesign..."></div>
            <div class="fg"><label>Client</label><input id="ff-client" type="text" placeholder="Client name..."></div>
            <div class="fg"><label>Status</label><select id="ff-status">${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select></div>
            <div class="fg"><label>Quote Amount $</label><input id="ff-quote" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Amount Received $</label><input id="ff-recv" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Expenses $</label><input id="ff-exp" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Tax Set Aside $</label><input id="ff-tax" type="number" placeholder="0.00" step="0.01" min="0"></div>
            <div class="fg"><label>Invoice Date</label><div class="dw"><input id="ff-idate" type="date"><button class="cal-btn" onclick="dp('ff-idate')">&#x1F4C5;</button></div></div>
            <div class="fg"><label>Due Date</label><div class="dw"><input id="ff-ddate" type="date"><button class="cal-btn" onclick="dp('ff-ddate')">&#x1F4C5;</button></div></div>
            <div class="fg"><label>Paid Date</label><div class="dw"><input id="ff-pdate" type="date"><button class="cal-btn" onclick="dp('ff-pdate')">&#x1F4C5;</button></div></div>
            <div class="fg full"><label>Notes</label><input id="ff-notes" type="text" placeholder="Optional"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-g btn-sm" onclick="ff_clear()">Clear</button>
                <button class="btn btn-p btn-sm" onclick="ff_save()">Save Job</button>
            </div></div>
        </div>
    </div>
    <div id="ff-pipeline" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:2px"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
        <span style="font-size:12px;font-weight:700;font-family:var(--fd);color:var(--muted)">JOB BOARD</span>
        <div style="display:flex;gap:6px">
            <input id="ff-search" type="text" placeholder="Search..." oninput="ff_render()" style="height:34px;font-size:12px;width:130px">
            <select id="ff-filter" onchange="ff_render()" style="height:34px;font-size:12px;width:auto">
                <option value="">All Statuses</option>
                ${STATUSES.map(s=>`<option>${s}</option>`).join('')}
            </select>
        </div>
    </div>
    <div id="ff-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px"></div>`;
    document.getElementById('content').appendChild(d);
})();

window.dashWidget_freelance_flow=function(){
    const items=DB[FF_ID]||[];
    const overdue=items.filter(ffOverdue).length;
    const monthNet=items.filter(j=>(j.paid_date||'').startsWith(cmk())).reduce((s,j)=>s+ffNet(j),0);
    const wait=items.filter(j=>j.status!=='Paid'&&j.status!=='Archived').reduce((s,j)=>s+ffOut(j),0);
    return`<div class="card" onclick="navigate('freelance_flow')" style="cursor:pointer">
        <div class="card-hd"><span class="card-title">&#x1F4BC; Freelance Flow</span><span class="badge ${overdue>0?'br-b':'bgr'}">${overdue>0?overdue+' overdue':items.length+' jobs'}</span></div>
        <div class="stat-row" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="stat"><div class="stat-label">Month Net</div><div class="stat-val g">${fmtK(monthNet)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">Outstanding</div><div class="stat-val am">${fmtK(wait)}</div><div class="stat-bar o"></div></div>
        </div>
    </div>`;
};

window.render_freelance_flow=async function(){
    const items=DB[FF_ID]||[];
    const active=items.filter(j=>j.status!=='Archived');
    const totalNet=active.reduce((s,j)=>s+ffNet(j),0);
    const totalOut=active.reduce((s,j)=>s+ffOut(j),0);
    const overdue=active.filter(ffOverdue).length;
    const badge=document.getElementById('ff-badge');
    if(badge)badge.textContent=`${active.length} active`;
    const stats=document.getElementById('ff-stats');
    if(stats)stats.innerHTML=`
        <div class="stat"><div class="stat-label">Active Jobs</div><div class="stat-val">${active.length}</div><div class="stat-bar b"></div></div>
        <div class="stat"><div class="stat-label">Net Earned</div><div class="stat-val g">${fmtK(totalNet)}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Outstanding</div><div class="stat-val am">${fmtK(totalOut)}</div><div class="stat-bar o"></div></div>
        <div class="stat"><div class="stat-label">Overdue</div><div class="stat-val ${overdue>0?'r':''}">${overdue}</div><div class="stat-bar ${overdue>0?'r':''}"></div></div>`;

    const pipeline=document.getElementById('ff-pipeline');
    if(pipeline){
        const stages=['Lead','In Progress','Invoiced','Partial','Paid'];
        pipeline.innerHTML=stages.map(st=>{
            const grp=items.filter(j=>j.status===st);
            if(!grp.length)return'';
            const amt=grp.reduce((s,j)=>s+(st==='Paid'?ffNet(j):ffNum(j.quote_amount)),0);
            return`<div style="display:flex;align-items:center;gap:5px;background:var(--bg2);border:1px solid var(--line);border-left:2px solid ${FF_COLOR[st]};border-radius:var(--r);padding:5px 10px;font-family:var(--fm);font-size:11px">
                <span style="color:${FF_COLOR[st]==='var(--line)'||FF_COLOR[st]==='var(--line2)'?'var(--muted)':FF_COLOR[st]};font-weight:700">${st}</span>
                <span style="color:var(--dim)">${grp.length} &middot; ${fmtK(amt)}</span>
            </div>`;
        }).join('');
    }
    ff_render();
};

function ff_render(){
    const items=DB[FF_ID]||[];
    const q=(document.getElementById('ff-search')?.value||'').toLowerCase();
    const sf=document.getElementById('ff-filter')?.value||'';
    const list=document.getElementById('ff-list');if(!list)return;
    const rows=items.filter(j=>{
        const matchQ=!q||(j.title+' '+j.client).toLowerCase().includes(q);
        const matchS=!sf||j.status===sf;
        return matchQ&&matchS;
    }).sort((a,b)=>{
        if(ffOverdue(a)&&!ffOverdue(b))return-1;
        if(!ffOverdue(a)&&ffOverdue(b))return 1;
        return(b.created||'').localeCompare(a.created||'');
    });
    if(!rows.length){list.innerHTML=`<div style="grid-column:1/-1"><div class="empty"><div class="ei">&#x1F4BC;</div><p class="ep">No jobs found. Add one above.</p></div></div>`;return;}
    list.innerHTML=rows.map(j=>{
        const overdue=ffOverdue(j);
        const borderC=overdue?'var(--red)':(FF_COLOR[j.status]||'var(--line)');
        const quote=ffNum(j.quote_amount),recv=ffNum(j.amount_received);
        const collPct=quote>0?Math.min(100,Math.round((recv/quote)*100)):0;
        const collBarC=collPct>=100?'var(--green)':collPct>=50?'var(--amber)':'#8b7cf8';
        const dueD=j.due_date?du(j.due_date):null;
        const dueCls=dueD!==null&&dueD<0?'r':dueD!==null&&dueD<=7?'am':'';
        return`<div style="background:var(--bg2);border:1px solid var(--line);border-left:3px solid ${borderC};border-radius:var(--r2);padding:15px 16px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:15px;font-weight:700;color:var(--bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(j.title||'—')}</div>
                    <div style="font-size:11px;color:var(--dim);font-family:var(--fm);margin-top:2px">${escapeHtml(j.client||'No client')}</div>
                </div>
                <div style="display:flex;gap:5px;flex-shrink:0;align-items:center">
                    <span class="badge ${FF_BADGE[j.status]||'bgr'}" style="${overdue?'background:rgba(255,60,60,.15);color:var(--red);':''}">${overdue?'Overdue':j.status}</span>
                    <button class="btn btn-g btn-xs" onclick="ff_edit('${j.id}')">&#x270F;</button>
                    <button class="btn btn-d btn-xs" onclick="ff_del('${j.id}')">&#x2715;</button>
                </div>
            </div>
            ${quote>0?`<div>
                <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--fm);color:var(--dim);margin-bottom:4px">
                    <span>${fmt(recv)} received</span>
                    <span>of ${fmt(quote)} quoted &middot; ${collPct}%</span>
                </div>
                <div style="height:6px;background:var(--line);border-radius:3px;overflow:hidden">
                    <div style="height:100%;background:${collBarC};width:${collPct}%;border-radius:3px;transition:width .5s cubic-bezier(.34,1.56,.64,1)"></div>
                </div>
            </div>`:''}
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                <div style="font-family:var(--fm)">
                    <span style="font-size:13px;font-weight:700;color:var(--green)">${fmt(ffNet(j))}</span>
                    <span style="font-size:11px;color:var(--dim)"> net</span>
                    ${ffOut(j)>0?`<span style="font-size:11px;color:var(--dim);margin-left:10px">${fmt(ffOut(j))}</span><span style="font-size:11px;color:var(--dim)"> outstanding</span>`:''}
                </div>
                ${j.due_date?`<div style="font-size:11px;font-family:var(--fm);color:${dueCls?`var(--${dueCls==='r'?'red':'amber'})`:'var(--dim)'}">${overdue?'&#x26A0; ':''}Due ${fd(j.due_date)}</div>`:''}
            </div>
            ${j.notes?`<div style="font-size:11px;color:var(--muted);font-family:var(--fm);border-top:1px solid var(--line);padding-top:8px">${escapeHtml(j.notes)}</div>`:''}
        </div>`;
    }).join('');
}

window.ff_save=async function(){
    const id=document.getElementById('ff-eid').value;
    const body={
        title:document.getElementById('ff-title').value.trim(),
        client:document.getElementById('ff-client').value.trim(),
        status:document.getElementById('ff-status').value,
        quote_amount:parseFloat(document.getElementById('ff-quote').value)||0,
        amount_received:parseFloat(document.getElementById('ff-recv').value)||0,
        expenses:parseFloat(document.getElementById('ff-exp').value)||0,
        tax_set_aside:parseFloat(document.getElementById('ff-tax').value)||0,
        invoice_date:document.getElementById('ff-idate').value,
        due_date:document.getElementById('ff-ddate').value,
        paid_date:document.getElementById('ff-pdate').value,
        notes:document.getElementById('ff-notes').value.trim(),
    };
    if(!body.title){toast('Job title required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/freelance_flow/${id}`,body);
        else await api('POST','/api/mod/freelance_flow/',body);
        toast(id?'Updated':'Job saved','ok');ff_clear();
        await loadMod(FF_ID);await render_freelance_flow();
    }catch(e){toast(e.message,'er');}
};

window.ff_edit=function(id){
    const j=(DB[FF_ID]||[]).find(x=>x.id===id);if(!j)return;
    document.getElementById('ff-eid').value=j.id;
    document.getElementById('ff-title').value=j.title||'';
    document.getElementById('ff-client').value=j.client||'';
    document.getElementById('ff-status').value=j.status||'Lead';
    document.getElementById('ff-quote').value=j.quote_amount||'';
    document.getElementById('ff-recv').value=j.amount_received||'';
    document.getElementById('ff-exp').value=j.expenses||'';
    document.getElementById('ff-tax').value=j.tax_set_aside||'';
    document.getElementById('ff-idate').value=j.invoice_date||'';
    document.getElementById('ff-ddate').value=j.due_date||'';
    document.getElementById('ff-pdate').value=j.paid_date||'';
    document.getElementById('ff-notes').value=j.notes||'';
    const ft=document.getElementById('ff-form-title');if(ft)ft.innerHTML='&#x1F4BC; Edit Job';
    document.getElementById('ff-title').scrollIntoView({behavior:'smooth',block:'center'});
};

window.ff_del=async function(id){
    if(!confirm('Delete this job?'))return;
    try{
        await api('DELETE',`/api/mod/freelance_flow/${id}`);
        toast('Deleted','ok');await loadMod(FF_ID);await render_freelance_flow();
    }catch(e){toast(e.message,'er');}
};

window.ff_clear=function(){
    ['ff-eid','ff-title','ff-client','ff-quote','ff-recv','ff-exp','ff-tax','ff-idate','ff-ddate','ff-pdate','ff-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
    const s=document.getElementById('ff-status');if(s)s.value='Lead';
    const ft=document.getElementById('ff-form-title');if(ft)ft.innerHTML='&#x1F4BC; Add Job';
};
})();
