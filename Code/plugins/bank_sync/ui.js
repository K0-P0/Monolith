(function(){'use strict';

(function bp(){
    if(document.getElementById('page-bank_sync'))return;
    const d=document.createElement('div');d.id='page-bank_sync';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="bs-stats"></div>
    <div id="bs-connect-card" class="card" style="display:none">
        <div class="card-hd"><span class="card-title">Connect a Bank</span></div>
        <p style="font-size:12px;color:var(--dim);line-height:1.6;margin-bottom:12px">
            Bank Sync uses <a href="https://bridge.simplefin.org/simplefin/create" target="_blank" rel="noopener" style="color:var(--amber)">SimpleFIN Bridge</a>
            to pull read-only balances and transactions from your bank. Create a setup token there, then paste it below.
        </p>
        <div class="fg-grid">
            <div class="fg full"><label>Setup Token</label><input id="bs-token" type="text" placeholder="Paste your SimpleFIN setup token"></div>
            <div class="fg full"><div class="fa">
                <button class="btn btn-p btn-sm" onclick="bs_connect()">Connect</button>
            </div></div>
        </div>
    </div>
    <div id="bs-connected-card" class="card" style="display:none">
        <div class="card-hd"><span class="card-title">Connected Accounts</span><span class="badge ba" id="bs-synced-badge"></span></div>
        <div class="fa" style="margin-bottom:12px">
            <button class="btn btn-p btn-sm" id="bs-sync-btn" onclick="bs_sync()">&#x1F504; Sync Now</button>
            <button class="btn btn-d btn-sm" onclick="bs_disconnect()">Disconnect</button>
        </div>
        <div id="bs-accounts"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

window.render_bank_sync=async function(){ bs_render(); };

window.bs_connect=async function(){
    const token=document.getElementById('bs-token').value.trim();
    if(!token){toast('Paste a setup token first','wn');return;}
    try{
        await api('POST','/api/mod/bank_sync/connect',{setup_token:token});
        toast('Connected — syncing now...','ok');
        document.getElementById('bs-token').value='';
        await loadMod('bank_sync');
        await bs_sync();
    }catch(e){toast(e.message,'er');}
};

window.bs_sync=async function(){
    const btn=document.getElementById('bs-sync-btn');
    if(btn){btn.disabled=true;btn.textContent='Syncing...';}
    try{
        const r=await api('POST','/api/mod/bank_sync/sync');
        toast(`Synced ${r.accounts} account${r.accounts===1?'':'s'}, ${r.new_transactions} new transaction${r.new_transactions===1?'':'s'}`,'ok');
        await loadMod('bank_sync');bs_render();
    }catch(e){toast(e.message,'er');}
    finally{if(btn){btn.disabled=false;btn.innerHTML='&#x1F504; Sync Now';}}
};

window.bs_disconnect=function(){
    openModal('Disconnect Bank Sync', `
        <div class="alert al-d" style="margin-bottom:14px">
            &#x26A0; This removes the stored connection and all synced accounts/transactions from Monolith.
            Your bank is not affected, but you will need a new setup token to reconnect.
        </div>
        <div class="fa">
            <button class="btn btn-g btn-sm" onclick="closeModal()">Cancel</button>
            <button class="btn btn-d" onclick="bs_confirmDisconnect()">Disconnect &#x2715;</button>
        </div>`);
};

window.bs_confirmDisconnect=async function(){
    try{
        await api('DELETE','/api/mod/bank_sync/disconnect');
        closeModal();toast('Disconnected','ok');
        await loadMod('bank_sync');bs_render();
    }catch(e){toast(e.message,'er');}
};

window.bs_setCategory=async function(tid,val){
    try{ await api('PUT',`/api/mod/bank_sync/transactions/${tid}`,{category:val}); }
    catch(e){toast(e.message,'er');}
};

window.bs_toggleHidden=async function(tid,hidden){
    try{
        await api('PUT',`/api/mod/bank_sync/transactions/${tid}`,{hidden});
        await loadMod('bank_sync');bs_render();
    }catch(e){toast(e.message,'er');}
};

const BS_CATS=['Housing','Utilities','Food','Transport','Entertainment','Health','Shopping','Income','Transfer','Other'];

function bs_account(acc){
    const rows=acc.transactions.map(t=>{
        const amt=parseFloat(t.amount)||0;
        return `
        <tr style="${t.hidden?'opacity:.4':''}">
            <td style="white-space:nowrap">${fd(t.date)}</td>
            <td>${escapeHtml(t.desc)}${t.pending?' <span class="badge ba" style="font-size:9px">pending</span>':''}</td>
            <td class="mono ${amt>=0?'g':''}" style="text-align:right;white-space:nowrap">${fmt(t.amount)}</td>
            <td><select onchange="bs_setCategory('${t.id}',this.value)" style="font-size:11px;padding:3px 6px">
                ${BS_CATS.map(c=>`<option ${t.category===c?'selected':''}>${c}</option>`).join('')}
            </select></td>
            <td><button class="btn btn-g btn-xs" onclick="bs_toggleHidden('${t.id}',${!t.hidden})">${t.hidden?'Show':'Hide'}</button></td>
        </tr>`;
    }).join('');
    return `
    <div style="background:var(--bg2);border:1px solid var(--line);border-radius:var(--r2);padding:14px 16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div>
                <div style="font-size:15px;font-weight:700;color:var(--bright)">${escapeHtml(acc.name)}</div>
                <div style="font-size:11px;color:var(--dim)">${escapeHtml(acc.org)}</div>
            </div>
            <div class="mono" style="font-size:18px;font-weight:700;color:var(--bright)">${fmt(acc.balance)} <span style="font-size:11px;color:var(--dim)">${escapeHtml(acc.currency)}</span></div>
        </div>
        ${acc.transactions.length?`
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead><tr style="color:var(--dim);text-align:left"><th>Date</th><th>Description</th><th style="text-align:right">Amount</th><th>Category</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`:`<div style="font-size:12px;color:var(--dim)">No transactions synced yet.</div>`}
    </div>`;
}

function bs_render(){
    const d=DB.bank_sync||{connected:false,accounts:[]};
    const connectCard=document.getElementById('bs-connect-card');
    const connectedCard=document.getElementById('bs-connected-card');
    if(connectCard)connectCard.style.display=d.connected?'none':'';
    if(connectedCard)connectedCard.style.display=d.connected?'':'none';

    const accounts=d.accounts||[];
    const totalBalance=accounts.reduce((s,a)=>s+(parseFloat(a.balance)||0),0);
    const lastSyncedDate=d.last_synced?d.last_synced.slice(0,10):null;

    const statsEl=document.getElementById('bs-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Total Balance</div><div class="stat-val">${fmt(totalBalance)}</div><div class="stat-sub">${accounts.length} account${accounts.length===1?'':'s'}</div><div class="stat-bar"></div></div>
        <div class="stat"><div class="stat-label">Status</div><div class="stat-val ${d.connected?'g':''}" style="font-size:16px">${d.connected?'Connected':'Not connected'}</div><div class="stat-sub">${d.connected?'via SimpleFIN':'link an account below'}</div><div class="stat-bar ${d.connected?'g':''}"></div></div>
        <div class="stat"><div class="stat-label">Last Synced</div><div class="stat-val" style="font-size:15px">${lastSyncedDate?fd(lastSyncedDate):'Never'}</div><div class="stat-sub">${d.connected?'tap Sync Now to refresh':''}</div><div class="stat-bar"></div></div>`;

    const badge=document.getElementById('bs-synced-badge');
    if(badge)badge.textContent=lastSyncedDate?`Last synced ${fd(lastSyncedDate)}`:'Never synced';

    const accEl=document.getElementById('bs-accounts');
    if(accEl){
        if(!accounts.length){
            accEl.innerHTML=`<div class="empty"><div class="ei">&#x1F3E6;</div><p class="ep">Connected — hit Sync Now to pull your accounts.</p></div>`;
        }else{
            accEl.innerHTML=accounts.map(bs_account).join('');
        }
    }
}
})();
