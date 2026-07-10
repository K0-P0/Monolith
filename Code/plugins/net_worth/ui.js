(function(){'use strict';

(function bp(){
    if(document.getElementById('page-net_worth'))return;
    const d=document.createElement('div');d.id='page-net_worth';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="nw-stats"></div>
    <div class="card">
        <div class="card-hd">
            <span class="card-title">Net Worth Trend</span>
            <button class="btn btn-p btn-sm" onclick="nw_snapshot()">&#x1F4F8; Update Snapshot</button>
        </div>
        <div id="nw-chart" style="margin-top:8px"></div>
        <div id="nw-snap-hint" style="font-size:11px;color:var(--dim);font-family:var(--fm);margin-top:8px;text-align:center;display:none">
            Snapshots are saved monthly. Hit Update Snapshot any time to record today&#8217;s numbers.
        </div>
    </div>
    <div class="dash-pair">
        <div class="card">
            <div class="card-hd"><span class="card-title">Assets</span><span class="badge bg" id="nw-asset-total"></span></div>
            <div id="nw-asset-list"></div>
            <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px">
                <div class="card-hd" style="margin-bottom:10px"><span style="font-size:12px;font-weight:600;color:var(--dim)">Add Manual Asset</span></div>
                <div class="fg-grid">
                    <input type="hidden" id="nw-a-eid">
                    <div class="fg"><label>Name</label><input id="nw-a-name" type="text" placeholder="Checking account, house..."></div>
                    <div class="fg"><label>Category</label><select id="nw-a-cat">
                        <option value="cash">Cash / Bank</option>
                        <option value="investment">Investments</option>
                        <option value="property">Property</option>
                        <option value="vehicle">Vehicle</option>
                        <option value="crypto">Crypto</option>
                        <option value="other">Other</option>
                    </select></div>
                    <div class="fg"><label>Current Value $</label><input id="nw-a-val" type="number" placeholder="0.00" step="0.01" min="0"></div>
                    <div class="fg"><label>Notes</label><input id="nw-a-notes" type="text" placeholder="Optional"></div>
                    <div class="fg full"><div class="fa">
                        <button class="btn btn-g btn-sm" onclick="nw_a_clear()">Clear</button>
                        <button class="btn btn-p btn-sm" onclick="nw_a_save()">Save Asset</button>
                    </div></div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-hd"><span class="card-title">Liabilities</span><span class="badge br-b" id="nw-liab-total"></span></div>
            <div id="nw-liab-list"></div>
            <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px">
                <div class="card-hd" style="margin-bottom:10px"><span style="font-size:12px;font-weight:600;color:var(--dim)">Add Manual Liability</span></div>
                <div class="fg-grid">
                    <input type="hidden" id="nw-l-eid">
                    <div class="fg"><label>Name</label><input id="nw-l-name" type="text" placeholder="Mortgage, car loan..."></div>
                    <div class="fg"><label>Category</label><select id="nw-l-cat">
                        <option value="mortgage">Mortgage</option>
                        <option value="auto">Auto Loan</option>
                        <option value="student">Student Loan</option>
                        <option value="credit">Credit Card</option>
                        <option value="personal">Personal Loan</option>
                        <option value="other">Other</option>
                    </select></div>
                    <div class="fg"><label>Balance Owed $</label><input id="nw-l-val" type="number" placeholder="0.00" step="0.01" min="0"></div>
                    <div class="fg"><label>Notes</label><input id="nw-l-notes" type="text" placeholder="Optional"></div>
                    <div class="fg full"><div class="fa">
                        <button class="btn btn-g btn-sm" onclick="nw_l_clear()">Clear</button>
                        <button class="btn btn-d btn-sm" onclick="nw_l_save()">Save Liability</button>
                    </div></div>
                </div>
            </div>
        </div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

const NW_ACAT={
    cash:'var(--green)',investment:'var(--amber)',retirement:'#8b7cf8',
    property:'#38bdf8',vehicle:'#2dd4bf',crypto:'#fb923c',other:'var(--dim)',
    goal:'var(--green)',roth_ira:'#8b7cf8','401k':'#8b7cf8'
};
const NW_LCAT={
    mortgage:'var(--red)',auto:'var(--amber)',student:'#fb923c',
    credit:'var(--red)',personal:'var(--amber)',other:'var(--dim)'
};
function nw_acolor(cat){return NW_ACAT[cat]||'var(--dim)';}
function nw_lcolor(cat){return NW_LCAT[cat]||'var(--dim)';}

const NW_STYPE={goal:'Goal',roth_ira:'Roth IRA','401k':'401k',hsa:'HSA',emergency:'Emergency',other:'Savings'};

function nw_chart(snaps){
    if(!snaps.length){
        return`<div style="text-align:center;padding:28px 0;color:var(--muted)">
            <div style="font-size:28px;margin-bottom:8px">&#x1F4C8;</div>
            <div style="font-size:12px;font-family:var(--fm)">Hit <b style="color:var(--amber)">Update Snapshot</b> to record your first net worth entry.</div>
        </div>`;
    }
    if(snaps.length===1){
        return`<div style="text-align:center;padding:16px 0;color:var(--dim);font-size:12px;font-family:var(--fm)">
            First snapshot recorded for <b style="color:var(--bright)">${snaps[0].month}</b>. Take another next month to see your trend.
        </div>`;
    }
    const W=600,H=110,PL=8,PR=8,PT=20,PB=22;
    const cw=W-PL-PR,ch=H-PT-PB;
    const vals=snaps.map(s=>s.net_worth);
    const minV=Math.min(...vals),maxV=Math.max(...vals);
    const range=maxV-minV||Math.abs(maxV)||1;
    const pts=snaps.map((s,i)=>{
        const x=PL+(i/(snaps.length-1))*cw;
        const y=PT+(1-(s.net_worth-minV)/range)*ch;
        return{x,y,s};
    });
    const line=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area=`${line} L${pts[pts.length-1].x.toFixed(1)},${(H-PB).toFixed(1)} L${pts[0].x.toFixed(1)},${(H-PB).toFixed(1)} Z`;
    const dots=pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" style="fill:var(--amber);stroke:var(--bg2);stroke-width:2"/>`).join('');
    const lbls=pts.map(p=>`<text x="${p.x.toFixed(1)}" y="${H}" text-anchor="middle" style="font-size:8.5px;fill:var(--muted);font-family:var(--fm)">${p.s.month.slice(5)}</text>`).join('');
    const last=pts[pts.length-1];
    const anchor=last.x>W*0.75?'end':'middle';
    const lbl=`<text x="${last.x.toFixed(1)}" y="${(last.y-9).toFixed(1)}" text-anchor="${anchor}" style="font-size:10px;font-weight:700;fill:var(--amber);font-family:var(--fm)">${fmt(snaps[snaps.length-1].net_worth)}</text>`;
    return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;overflow:visible">
        <defs><linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--amber)" stop-opacity=".18"/>
            <stop offset="100%" stop-color="var(--amber)" stop-opacity="0"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#nwFill)"/>
        <path d="${line}" fill="none" style="stroke:var(--amber);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>
        ${dots}${lbls}${lbl}
    </svg>`;
}

function nw_asset_row(item,isImported){
    const col=nw_acolor(item.category||item.savings_type);
    const catLabel=escapeHtml((item.savings_type?NW_STYPE[item.savings_type]||'Savings':item.category)||'other');
    const editBtn=isImported?'':`<button class="btn btn-g btn-xs" onclick="nw_a_edit('${item.id}')">&#x270F;</button><button class="btn btn-d btn-xs" onclick="nw_a_del('${item.id}')">&#x2715;</button>`;
    const importedBadge=isImported?`<span class="badge" style="font-size:9px;background:rgba(255,255,255,.05);color:var(--muted)">auto</span>`:'';
    return`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">
        <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.name)}</div>
            <div style="display:flex;gap:5px;align-items:center;margin-top:2px">
                <span class="badge" style="background:${col}22;color:${col};font-size:10px">${catLabel}</span>
                ${importedBadge}
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <div class="mono g" style="font-size:13px;font-weight:700">+${fmt(parseFloat(item.current||item.value||0))}</div>
            ${editBtn}
        </div>
    </div>`;
}

function nw_liab_row(item,isImported){
    const col=nw_lcolor(item.category||item.debt_type);
    const catLabel=escapeHtml((item.debt_type||item.category)||'other');
    const editBtn=isImported?'':`<button class="btn btn-g btn-xs" onclick="nw_l_edit('${item.id}')">&#x270F;</button><button class="btn btn-d btn-xs" onclick="nw_l_del('${item.id}')">&#x2715;</button>`;
    const importedBadge=isImported?`<span class="badge" style="font-size:9px;background:rgba(255,255,255,.05);color:var(--muted)">auto</span>`:'';
    return`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">
        <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.name)}</div>
            <div style="display:flex;gap:5px;align-items:center;margin-top:2px">
                <span class="badge" style="background:${col}22;color:${col};font-size:10px">${catLabel}</span>
                ${importedBadge}
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <div class="mono r" style="font-size:13px;font-weight:700">-${fmt(parseFloat(item.balance||item.value||0))}</div>
            ${editBtn}
        </div>
    </div>`;
}

function nw_render(){
    const data=DB.net_worth||{};
    const assets=data.assets||[];
    const liabilities=data.liabilities||[];
    const snapshots=data.snapshots||[];
    const imp=data.imported||{};
    const savingsItems=(imp.savings||[]).filter(s=>parseFloat(s.current||0)>0);
    const debtItems=(imp.debts||[]).filter(d=>parseFloat(d.balance||0)>0);

    const totalManualAssets=assets.reduce((s,a)=>s+parseFloat(a.value||0),0);
    const totalImportedAssets=savingsItems.reduce((s,a)=>s+parseFloat(a.current||0),0);
    const totalAssets=totalManualAssets+totalImportedAssets;

    const totalManualLiab=liabilities.reduce((s,l)=>s+parseFloat(l.value||0),0);
    const totalImportedLiab=debtItems.reduce((s,d)=>s+parseFloat(d.balance||0),0);
    const totalLiab=totalManualLiab+totalImportedLiab;

    const netWorth=totalAssets-totalLiab;
    const isPos=netWorth>=0;

    let momHtml='—',momSub='no history yet',momCls='';
    if(snapshots.length>=2){
        const prev=snapshots[snapshots.length-2].net_worth;
        const curr=snapshots[snapshots.length-1].net_worth;
        const diff=curr-prev;
        momCls=diff>=0?'g':'r';
        momHtml=`${diff>=0?'+':''}${fmt(Math.abs(diff))}`;
        momSub=`${diff>=0?'up':'down'} from ${snapshots[snapshots.length-2].month}`;
    }

    const statsEl=document.getElementById('nw-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Net Worth</div><div class="stat-val ${isPos?'g':'r'}">${isPos?'':'-'}${fmt(Math.abs(netWorth))}</div><div class="stat-sub">${isPos?'positive':'in the red'}</div><div class="stat-bar ${isPos?'g':'r'}"></div></div>
        <div class="stat"><div class="stat-label">Total Assets</div><div class="stat-val g">${fmt(totalAssets)}</div><div class="stat-sub">${assets.length+savingsItems.length} entr${assets.length+savingsItems.length===1?'y':'ies'}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Total Liabilities</div><div class="stat-val r">${fmt(totalLiab)}</div><div class="stat-sub">${liabilities.length+debtItems.length} entr${liabilities.length+debtItems.length===1?'y':'ies'}</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">MoM Change</div><div class="stat-val ${momCls}">${momHtml}</div><div class="stat-sub">${momSub}</div><div class="stat-bar ${momCls||'b'}"></div></div>`;

    const chartEl=document.getElementById('nw-chart');
    if(chartEl)chartEl.innerHTML=nw_chart(snapshots);
    const hint=document.getElementById('nw-snap-hint');
    if(hint)hint.style.display=snapshots.length?'':'none';

    const ab=document.getElementById('nw-asset-total');
    if(ab)ab.textContent=fmt(totalAssets);

    const lb=document.getElementById('nw-liab-total');
    if(lb)lb.textContent=fmt(totalLiab);

    const al=document.getElementById('nw-asset-list');
    if(al){
        let html='';
        if(savingsItems.length){
            html+=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-family:var(--fm);padding:8px 0 2px">From Savings &amp; Retirement</div>`;
            html+=savingsItems.map(s=>nw_asset_row({
                id:s.id,name:s.name,
                category:s.savings_type||'savings',
                savings_type:s.savings_type,
                current:s.current
            },true)).join('');
        }
        if(assets.length){
            html+=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-family:var(--fm);padding:8px 0 2px">Manual Assets</div>`;
            html+=assets.map(a=>nw_asset_row(a,false)).join('');
        }
        if(!savingsItems.length&&!assets.length){
            html=`<div class="empty" style="padding:16px 0"><div class="ep" style="font-size:12px">No assets yet. Add one below or enable the Savings &amp; Retirement mod.</div></div>`;
        }
        al.innerHTML=html;
    }

    const ll=document.getElementById('nw-liab-list');
    if(ll){
        let html='';
        if(debtItems.length){
            html+=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-family:var(--fm);padding:8px 0 2px">From Debt Payoff</div>`;
            html+=debtItems.map(d=>nw_liab_row({
                id:d.id,name:d.name,
                category:d.debt_type||'other',
                debt_type:d.debt_type,
                balance:d.balance
            },true)).join('');
        }
        if(liabilities.length){
            html+=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-family:var(--fm);padding:8px 0 2px">Manual Liabilities</div>`;
            html+=liabilities.map(l=>nw_liab_row(l,false)).join('');
        }
        if(!debtItems.length&&!liabilities.length){
            html=`<div class="empty" style="padding:16px 0"><div class="ep" style="font-size:12px">No liabilities yet. Add one below or enable the Debt Payoff mod.</div></div>`;
        }
        ll.innerHTML=html;
    }
}

window.render_net_worth=async function(){nw_render();};

window.nw_snapshot=async function(){
    const data=DB.net_worth||{};
    const imp=data.imported||{};
    const assets=(data.assets||[]).reduce((s,a)=>s+parseFloat(a.value||0),0);
    const savingsTotal=(imp.savings||[]).filter(s=>parseFloat(s.current||0)>0).reduce((s,a)=>s+parseFloat(a.current||0),0);
    const liab=(data.liabilities||[]).reduce((s,l)=>s+parseFloat(l.value||0),0);
    const debtTotal=(imp.debts||[]).filter(d=>parseFloat(d.balance||0)>0).reduce((s,d)=>s+parseFloat(d.balance||0),0);
    const totalAssets=assets+savingsTotal;
    const totalLiab=liab+debtTotal;
    try{
        await api('POST','/api/mod/net_worth/snapshot',{
            net_worth:totalAssets-totalLiab,assets:totalAssets,liabilities:totalLiab
        });
        toast('Snapshot saved','ok');
        await loadMod('net_worth');nw_render();
    }catch(e){toast(e.message,'er');}
};

window.nw_a_save=async function(){
    const id=document.getElementById('nw-a-eid').value;
    const body={
        name:document.getElementById('nw-a-name').value.trim(),
        category:document.getElementById('nw-a-cat').value,
        value:parseFloat(document.getElementById('nw-a-val').value)||0,
        notes:document.getElementById('nw-a-notes').value.trim()
    };
    if(!body.name){toast('Name required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/net_worth/asset/${id}`,body);
        else await api('POST','/api/mod/net_worth/asset',body);
        toast(id?'Updated':'Asset saved','ok');nw_a_clear();
        await loadMod('net_worth');nw_render();
    }catch(e){toast(e.message,'er');}
};

window.nw_a_edit=function(id){
    const item=(DB.net_worth?.assets||[]).find(a=>a.id===id);if(!item)return;
    document.getElementById('nw-a-eid').value=item.id;
    document.getElementById('nw-a-name').value=item.name;
    document.getElementById('nw-a-cat').value=item.category;
    document.getElementById('nw-a-val').value=item.value;
    document.getElementById('nw-a-notes').value=item.notes||'';
    document.getElementById('nw-a-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.nw_a_del=async function(id){
    if(!confirm('Remove this asset?'))return;
    try{
        await api('DELETE',`/api/mod/net_worth/asset/${id}`);
        toast('Removed','ok');await loadMod('net_worth');nw_render();
    }catch(e){toast(e.message,'er');}
};

window.nw_a_clear=function(){
    ['nw-a-eid','nw-a-name','nw-a-val','nw-a-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
};

window.nw_l_save=async function(){
    const id=document.getElementById('nw-l-eid').value;
    const body={
        name:document.getElementById('nw-l-name').value.trim(),
        category:document.getElementById('nw-l-cat').value,
        value:parseFloat(document.getElementById('nw-l-val').value)||0,
        notes:document.getElementById('nw-l-notes').value.trim()
    };
    if(!body.name){toast('Name required','wn');return;}
    try{
        if(id)await api('PUT',`/api/mod/net_worth/liability/${id}`,body);
        else await api('POST','/api/mod/net_worth/liability',body);
        toast(id?'Updated':'Liability saved','ok');nw_l_clear();
        await loadMod('net_worth');nw_render();
    }catch(e){toast(e.message,'er');}
};

window.nw_l_edit=function(id){
    const item=(DB.net_worth?.liabilities||[]).find(l=>l.id===id);if(!item)return;
    document.getElementById('nw-l-eid').value=item.id;
    document.getElementById('nw-l-name').value=item.name;
    document.getElementById('nw-l-cat').value=item.category;
    document.getElementById('nw-l-val').value=item.value;
    document.getElementById('nw-l-notes').value=item.notes||'';
    document.getElementById('nw-l-name').scrollIntoView({behavior:'smooth',block:'center'});
};

window.nw_l_del=async function(id){
    if(!confirm('Remove this liability?'))return;
    try{
        await api('DELETE',`/api/mod/net_worth/liability/${id}`);
        toast('Removed','ok');await loadMod('net_worth');nw_render();
    }catch(e){toast(e.message,'er');}
};

window.nw_l_clear=function(){
    ['nw-l-eid','nw-l-name','nw-l-val','nw-l-notes'].forEach(id=>{
        const el=document.getElementById(id);if(el)el.value='';
    });
};
})();
