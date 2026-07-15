(function(){'use strict';

(function bp(){
  if(document.getElementById('page-paycheck_pro'))return;
  const d=document.createElement('div');d.id='page-paycheck_pro';d.className='page';
  d.innerHTML=`
    <!-- Tab switcher -->
    <div style="display:flex;background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r);padding:3px;margin-bottom:0">
      <button class="pp-tab active" id="pp-tab-sources" onclick="pp_switchTab('sources')" style="flex:1;padding:9px;border:none;background:var(--amber);color:#000;cursor:pointer;font-family:var(--fd);font-size:13px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:var(--touch)">
        💵 Income Sources
      </button>
      <button class="pp-tab" id="pp-tab-history" onclick="pp_switchTab('history')" style="flex:1;padding:9px;border:none;background:transparent;color:var(--ghost);cursor:pointer;font-family:var(--fd);font-size:13px;font-weight:700;border-radius:calc(var(--r) - 1px);transition:all .15s;min-height:var(--touch)">
        🗓 Paycheck History
      </button>
    </div>

    <!-- ── SOURCES PANEL ── -->
    <div id="pp-panel-sources">
      <div class="stat-row" id="pp-src-stats"></div>
      <div class="card">
        <div class="card-hd"><span class="card-title">💵 Income Tax Engine</span><span class="badge bg" id="pp-badge"></span></div>
        <input type="hidden" id="pp-eid">
        <div class="fg full" style="margin-bottom:12px">
          <label>Income Type</label>
          <div style="display:flex;background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r);padding:3px">
            <label style="flex:1;cursor:pointer"><input type="radio" name="pp-type" value="hourly" checked onchange="pp_toggle()" style="position:absolute;opacity:0;width:0;height:0"><span class="pp-topt">Hourly</span></label>
            <label style="flex:1;cursor:pointer"><input type="radio" name="pp-type" value="salary" onchange="pp_toggle()" style="position:absolute;opacity:0;width:0;height:0"><span class="pp-topt">Salary</span></label>
            <label style="flex:1;cursor:pointer"><input type="radio" name="pp-type" value="other" onchange="pp_toggle()" style="position:absolute;opacity:0;width:0;height:0"><span class="pp-topt">Other</span></label>
          </div>
        </div>
        <div class="fg-grid">
          <div class="fg"><label>Source Name</label><input id="pp-name" type="text" placeholder="Main Job..."></div>
          <div class="fg" id="fg-rate"><label>Hourly Rate $</label><input id="pp-rate" type="number" placeholder="18.50" step="0.01" min="0" oninput="pp_preview()"></div>
          <div class="fg" id="fg-hrs"><label>Hours Per Period</label><input id="pp-hrs" type="number" placeholder="80" step="0.5" min="0" oninput="pp_preview()"></div>
          <div class="fg" id="fg-sal" style="display:none"><label>Annual Salary $</label><input id="pp-sal" type="number" placeholder="45000" step="100" min="0" oninput="pp_preview()"></div>
          <div class="fg" id="fg-ndir" style="display:none"><label>Net $ per Period</label><input id="pp-ndir" type="number" placeholder="0.00" step="0.01" min="0" oninput="pp_preview()"></div>
          <div class="fg"><label>Pay Frequency</label>
            <select id="pp-freq" onchange="pp_preview()">
              <option value="weekly">Weekly</option>
              <option value="biweekly" selected>Bi-Weekly</option>
              <option value="semimonthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div class="fg" id="fg-401k"><label>401k Deduction</label>
            <div style="display:flex;gap:6px">
              <select id="pp-401t" style="width:76px;flex-shrink:0" onchange="pp_preview()"><option value="percent">%</option><option value="flat">$</option></select>
              <input id="pp-401v" type="number" placeholder="5" step="0.1" min="0" oninput="pp_preview()">
            </div>
          </div>
          <div class="fg" id="fg-tax"><label>Est. Tax Rate %</label><input id="pp-tax" type="number" placeholder="18" step="0.5" min="0" max="60" oninput="pp_preview()"></div>
          <div class="fg"><label>Last Paid</label>
            <div class="dw"><input id="pp-lp" type="date"><button class="cal-btn" onclick="dp('pp-lp')">📅</button></div>
          </div>
          <div class="fg"><label>Notes</label><input id="pp-notes" type="text" placeholder="Optional"></div>
          <div class="fg full"><div id="pp-prev"></div></div>
          <div class="fg full"><div class="fa">
            <button class="btn btn-g btn-sm" onclick="pp_clear()">Clear</button>
            <button class="btn btn-p btn-sm" onclick="pp_save()">Save Income Source</button>
          </div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><span class="card-title">Income Sources</span><span class="badge bg" id="pp-src-count"></span></div>
        <div id="pp-src-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;margin-top:4px"></div>
      </div>
    </div>

    <!-- ── HISTORY PANEL ── -->
    <div id="pp-panel-history" style="display:none">

      <!-- Stat summary -->
      <div class="stat-row" id="pp-hist-stats"></div>

      <!-- Payroll import + projections -->
      <div class="card">
        <div class="card-hd"><span class="card-title">📥 Payroll Import &amp; Projections</span><span class="badge bg" id="pp-est-badge"></span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--bright)">Show Estimated Income</div>
            <div style="font-size:12px;color:var(--dim)">Projects upcoming paydays into the log &amp; dashboard — estimates learn from your last 3 verified paychecks; uploads verify them</div>
          </div>
          <label class="pp-switch"><input type="checkbox" id="pp-est-toggle" onchange="pp_toggleEst()"><span class="pp-slider"></span></label>
        </div>
        <div id="pp-drop">📂 Drop your payroll .json here, or click to browse</div>
        <input type="file" id="pp-file" accept=".json,application/json" style="display:none" onchange="pp_fileChosen(this.files)">
      </div>

      <!-- Log actual paycheck form -->
      <div class="card">
        <div class="card-hd"><span class="card-title">🗓 Log Actual Paycheck</span></div>
        <div class="alert al-i" style="margin-bottom:14px">
          Use this when your paycheck differs from the estimate — sick days, short weeks, bonuses, or deductions.
          Your income source stays unchanged; this just records what you actually received.
        </div>
        <div class="fg-grid">
          <div class="fg"><label>Income Source</label>
            <select id="hist-src">
              <option value="">-- Select source --</option>
            </select>
          </div>
          <div class="fg"><label>Pay Date</label>
            <div class="dw"><input id="hist-date" type="date"><button class="cal-btn" onclick="dp('hist-date')">📅</button></div>
          </div>
          <div class="fg"><label>Expected Take-Home $</label>
            <input id="hist-exp" type="number" placeholder="Auto-filled from source" step="0.01" min="0">
          </div>
          <div class="fg"><label>Actual Take-Home $</label>
            <input id="hist-act" type="number" placeholder="What you actually got" step="0.01" min="0" oninput="pp_histPreview()">
          </div>
          <div class="fg full"><label>Reason</label>
            <input id="hist-notes" type="text" placeholder="Sick day (8hrs missed), short week, bonus, garnishment...">
          </div>
          <div class="fg full"><div id="hist-prev"></div></div>
          <div class="fg full"><div class="fa">
            <button class="btn btn-g btn-sm" onclick="pp_histClear()">Clear</button>
            <button class="btn btn-p btn-sm" onclick="pp_histSave()">Log Paycheck</button>
          </div></div>
        </div>
      </div>

      <!-- History table -->
      <div class="card">
        <div class="card-hd">
          <span class="card-title">Paycheck Log</span>
          <div class="flex-c gap8">
            <select id="hist-mf" onchange="pp_renderHistory()" style="width:auto;font-size:12px;height:34px"></select>
          </div>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Date</th><th>Source</th><th>Expected</th><th>Actual</th><th>Difference</th><th>Reason</th><th></th></tr></thead>
          <tbody id="hist-tb"></tbody>
        </table></div>
      </div>
    </div>
  `;
  document.getElementById('content').appendChild(d);
  document.getElementById('hist-date').value=ts();

  document.head.insertAdjacentHTML('beforeend',`<style>
    .pp-topt{display:flex;align-items:center;justify-content:center;height:34px;font-size:12px;font-weight:700;color:var(--ghost);border-radius:calc(var(--r) - 1px);transition:all .15s;padding:0 6px;user-select:none;cursor:pointer}
    input[type=radio]:checked+.pp-topt{background:var(--amber);color:#000}
    .pp-switch{position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0;cursor:pointer}
    .pp-switch input{position:absolute;opacity:0;width:0;height:0}
    .pp-slider{position:absolute;inset:0;background:var(--bg2);border:1px solid var(--line2);border-radius:13px;transition:all .15s}
    .pp-slider:before{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:var(--ghost);transition:all .15s}
    .pp-switch input:checked+.pp-slider{background:var(--amber);border-color:var(--amber)}
    .pp-switch input:checked+.pp-slider:before{background:#000;transform:translateX(20px)}
    #pp-drop{border:2px dashed var(--line2);border-radius:var(--r);padding:22px 14px;text-align:center;color:var(--ghost);cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;min-height:var(--touch)}
    #pp-drop.drag,#pp-drop:hover{border-color:var(--amber);color:var(--amber)}
    .pp-est-row td{opacity:.62}
  </style>`);

  const dz=document.getElementById('pp-drop');
  dz.addEventListener('click',()=>document.getElementById('pp-file').click());
  ['dragover','dragenter'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
  ['dragleave','dragend'].forEach(ev=>dz.addEventListener(ev,()=>dz.classList.remove('drag')));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');pp_fileChosen(e.dataTransfer.files);});
})();

window.render_paycheck_pro=async function(){
  try{
    const data=await api('GET','/api/mod/paycheck_pro/');
    DB['paycheck_pro']=Array.isArray(data)?data:[];
  }catch(e){DB['paycheck_pro']=[];}
  try{
    const st=await api('GET','/api/mod/paycheck_pro/settings');
    DB['paycheck_pro_settings']=st&&typeof st==='object'?st:{};
  }catch(e){DB['paycheck_pro_settings']={};}
  try{
    const hist=await api('GET','/api/mod/paycheck_pro/history');
    DB['paycheck_pro_history']=Array.isArray(hist)?hist:[];
  }catch(e){DB['paycheck_pro_history']=[];}
  const tg=document.getElementById('pp-est-toggle');
  if(tg)tg.checked=!!DB['paycheck_pro_settings'].enable_paycheck_estimations;
  pp_renderEstBadge();
  pp_renderSources();
  pp_populateSourceSelect();
  pp_buildHistFilter();
  pp_renderHistory();
  pp_renderHistStats();
};

function pp_renderEstBadge(){
  const b=document.getElementById('pp-est-badge');if(!b)return;
  const on=!!DB['paycheck_pro_settings']?.enable_paycheck_estimations;
  const n=(DB['paycheck_pro_history']||[]).filter(h=>(h.status||'verified')==='estimated').length;
  b.textContent=on?`Projections ON · ${n} estimated`:'Projections OFF';
}

async function pp_reloadHistory(){
  try{
    const hist=await api('GET','/api/mod/paycheck_pro/history');
    DB['paycheck_pro_history']=Array.isArray(hist)?hist:[];
  }catch(e){DB['paycheck_pro_history']=[];}
  pp_renderEstBadge();
  pp_buildHistFilter();
  pp_renderHistory();
  pp_renderHistStats();
}

window.pp_toggleEst=async function(){
  const tg=document.getElementById('pp-est-toggle');
  const on=tg.checked;
  try{
    const st=await api('PUT','/api/mod/paycheck_pro/settings',{enable_paycheck_estimations:on});
    DB['paycheck_pro_settings']=st&&typeof st==='object'?st:{enable_paycheck_estimations:on};
    toast(on?'Cashflow projections enabled':'Estimated income hidden','ok');
    await pp_reloadHistory();
  }catch(e){tg.checked=!on;toast(e.message,'er');}
};

window.pp_fileChosen=async function(files){
  const f=files&&files[0];if(!f)return;
  const inp=document.getElementById('pp-file');if(inp)inp.value='';
  if(f.size>1024*1024){toast('File too large (max 1 MB)','wn');return;}
  let parsed;
  try{parsed=JSON.parse(await f.text());}catch(e){toast('That file is not valid JSON','er');return;}
  try{
    const res=await api('POST','/api/mod/paycheck_pro/import',{filename:f.name,paychecks:parsed});
    let msg=`${res.verified} verified, ${res.added} added`;
    if(res.skipped)msg+=`, ${res.skipped} skipped`;
    toast(`Import: ${msg}`,res.verified||res.added?'ok':'wn');
    if(res.skipped&&res.reasons?.length)console.warn('paycheck import skipped:',res.reasons);
    await pp_reloadHistory();
  }catch(e){toast(e.message,'er');}
};

window.pp_switchTab=function(tab){
  document.getElementById('pp-panel-sources').style.display=tab==='sources'?'':'none';
  document.getElementById('pp-panel-history').style.display=tab==='history'?'':'none';
  document.getElementById('pp-tab-sources').style.background=tab==='sources'?'var(--amber)':'transparent';
  document.getElementById('pp-tab-sources').style.color=tab==='sources'?'#000':'var(--ghost)';
  document.getElementById('pp-tab-history').style.background=tab==='history'?'var(--amber)':'transparent';
  document.getElementById('pp-tab-history').style.color=tab==='history'?'#000':'var(--ghost)';
};

const PP_PER={weekly:52,biweekly:26,semimonthly:24,monthly:12,annual:1};

window.pp_toggle=function(){
  const t=document.querySelector('input[name=pp-type]:checked')?.value||'hourly';
  document.getElementById('fg-rate').style.display=t==='hourly'?'':'none';
  document.getElementById('fg-hrs').style.display=t==='hourly'?'':'none';
  document.getElementById('fg-sal').style.display=t==='salary'?'':'none';
  document.getElementById('fg-ndir').style.display=t==='other'?'':'none';
  document.getElementById('fg-401k').style.display=t==='other'?'none':'';
  document.getElementById('fg-tax').style.display=t==='other'?'none':'';
  pp_preview();
};

window.pp_preview=function(){
  const t=document.querySelector('input[name=pp-type]:checked')?.value||'hourly',freq=document.getElementById('pp-freq').value;
  let gross=0;
  if(t==='hourly')gross=(parseFloat(document.getElementById('pp-rate').value)||0)*(parseFloat(document.getElementById('pp-hrs').value)||0);
  else if(t==='salary')gross=(parseFloat(document.getElementById('pp-sal').value)||0)/(PP_PER[freq]||26);
  else{const n=parseFloat(document.getElementById('pp-ndir').value)||0;document.getElementById('pp-prev').innerHTML=n>0?`<div class="alert al-s">Net/Period: <strong class="mono g">${fmt(n)}</strong> &nbsp;·&nbsp; Monthly Est: <strong class="mono">${fmt(toMo(n,freq))}</strong></div>`:'';return;}
  const k401t=document.getElementById('pp-401t').value,k401v=parseFloat(document.getElementById('pp-401v').value)||0,k401a=k401t==='percent'?gross*(k401v/100):Math.min(k401v,gross),taxr=parseFloat(document.getElementById('pp-tax').value)||0,taxa=Math.max(0,(gross-k401a)*(taxr/100)),netPay=Math.max(0,gross-k401a-taxa);
  document.getElementById('pp-prev').innerHTML=gross===0?'':`<div class="alert al-s">
    Gross <strong class="mono">${fmt(gross)}</strong>
    ${k401a>0?`&nbsp;–&nbsp; 401k <strong class="mono r">${fmt(k401a)}</strong>`:''}
    ${taxa>0?`&nbsp;–&nbsp; Tax (${taxr}%) <strong class="mono r">${fmt(taxa)}</strong>`:''}
    &nbsp;=&nbsp; Take-Home <strong class="mono g">${fmt(netPay)}</strong>
    &nbsp;·&nbsp; Monthly <strong class="mono">${fmt(toMo(netPay,freq))}</strong>
  </div>`;
};

window.pp_save=async function(){
  const id=document.getElementById('pp-eid').value,t=document.querySelector('input[name=pp-type]:checked')?.value||'hourly';
  const body={name:document.getElementById('pp-name').value.trim(),income_type:t,
    hourly_rate:parseFloat(document.getElementById('pp-rate').value)||0,
    hours_per_period:parseFloat(document.getElementById('pp-hrs').value)||0,
    annual_salary:parseFloat(document.getElementById('pp-sal').value)||0,
    k401_type:document.getElementById('pp-401t').value,
    k401_value:parseFloat(document.getElementById('pp-401v').value)||0,
    tax_rate:parseFloat(document.getElementById('pp-tax').value)||0,
    net_direct:parseFloat(document.getElementById('pp-ndir').value)||0,
    frequency:document.getElementById('pp-freq').value,
    last_paid:document.getElementById('pp-lp').value,
    notes:document.getElementById('pp-notes').value.trim()};
  if(!body.name){toast('Source name required','wn');return;}
  try{
    if(id)await api('PUT',`/api/mod/paycheck_pro/${id}`,body);
    else  await api('POST','/api/mod/paycheck_pro/',body);
    toast(id?'Updated':'Saved','ok');pp_clear();
    const data=await api('GET','/api/mod/paycheck_pro/');
    DB['paycheck_pro']=Array.isArray(data)?data:[];
    pp_renderSources();pp_populateSourceSelect();
  }catch(e){toast(e.message,'er');}
};

window.pp_edit=function(id){
  const r=(DB['paycheck_pro']||[]).find(x=>x.id===id);if(!r)return;
  document.getElementById('pp-eid').value=r.id;
  const t=r.income_type||'hourly';document.querySelector(`input[name=pp-type][value=${t}]`).checked=true;pp_toggle();
  document.getElementById('pp-name').value=r.name;
  document.getElementById('pp-rate').value=r.hourly_rate||'';
  document.getElementById('pp-hrs').value=r.hours_per_period||'';
  document.getElementById('pp-sal').value=r.annual_salary||'';
  document.getElementById('pp-ndir').value=r.net_direct||'';
  document.getElementById('pp-401t').value=r.k401_type||'percent';
  document.getElementById('pp-401v').value=r.k401_value||'';
  document.getElementById('pp-tax').value=r.tax_rate||'';
  document.getElementById('pp-freq').value=r.frequency;
  document.getElementById('pp-lp').value=r.last_paid||'';
  document.getElementById('pp-notes').value=r.notes||'';
  pp_preview();
  document.getElementById('pp-name').scrollIntoView({behavior:'smooth'});
};

window.pp_del=async function(id){
  if(!confirm('Delete this income source?'))return;
  await api('DELETE',`/api/mod/paycheck_pro/${id}`);
  toast('Deleted','ok');
  const data=await api('GET','/api/mod/paycheck_pro/');
  DB['paycheck_pro']=Array.isArray(data)?data:[];
  pp_renderSources();pp_populateSourceSelect();
};

window.pp_clear=function(){
  ['pp-eid','pp-name','pp-rate','pp-hrs','pp-sal','pp-ndir','pp-401v','pp-tax','pp-lp','pp-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('pp-prev').innerHTML='';
};

function pp_renderSources(){
  const sources=DB['paycheck_pro']||[];
  const moTotal=sources.reduce((s,i)=>s+toMo(parseFloat(i.net||0),i.frequency),0);
  const annGross=sources.reduce((s,i)=>s+parseFloat(i.gross||0)*(PP_PER[i.frequency||'biweekly']||26),0);

  const paydays=sources.map(s=>{const d=nextPay(s.last_paid,s.frequency);return d?{name:s.name,d,days:du(d)}:null;}).filter(Boolean).sort((a,b)=>a.days-b.days);
  const nearest=paydays[0];
  const nLabel=nearest?(nearest.days===0?'Today':nearest.days===1?'Tomorrow':`${nearest.days}d`):'—';
  const nName=nearest?escapeHtml(nearest.name):'no sources';

  const badge=document.getElementById('pp-badge');if(badge)badge.textContent=`Monthly Net: ${fmt(moTotal)}`;
  const cnt=document.getElementById('pp-src-count');if(cnt)cnt.textContent=`${sources.length} source${sources.length===1?'':'s'}`;

  const statsEl=document.getElementById('pp-src-stats');
  if(statsEl)statsEl.innerHTML=`
    <div class="stat"><div class="stat-label">Monthly Net</div><div class="stat-val g">${fmt(moTotal)}</div><div class="stat-sub">take-home / mo</div><div class="stat-bar g"></div></div>
    <div class="stat"><div class="stat-label">Annual Gross</div><div class="stat-val">${fmtK(annGross)}</div><div class="stat-sub">before deductions</div><div class="stat-bar p"></div></div>
    <div class="stat"><div class="stat-label">Income Streams</div><div class="stat-val">${sources.length}</div><div class="stat-sub">active source${sources.length===1?'':'s'}</div><div class="stat-bar b"></div></div>
    <div class="stat"><div class="stat-label">Next Payday</div><div class="stat-val ${nearest?'am':''}">${nLabel}</div><div class="stat-sub">${nName}</div><div class="stat-bar ${nearest?'o':''}"></div></div>`;

  const grid=document.getElementById('pp-src-grid');if(!grid)return;
  if(!sources.length){
    grid.innerHTML=`<div class="empty"><div class="ei">&#x1F4B5;</div><p class="ep">No income sources yet. Add one above.</p></div>`;
    return;
  }
  const fl={weekly:'Weekly',biweekly:'Bi-Weekly',semimonthly:'Semi-Mo.',monthly:'Monthly',annual:'Annual'};
  const perLabel={weekly:'wk',biweekly:'2 wks',semimonthly:'2×/mo',monthly:'mo',annual:'yr'};
  grid.innerHTML=sources.map(i=>{
    const gross=parseFloat(i.gross||0),k401a=parseFloat(i.k401_amount||0),taxa=parseFloat(i.tax_amount||0),net=parseFloat(i.net||0);
    const mo=toMo(net,i.frequency);
    const nxt=nextPay(i.last_paid,i.frequency),d=nxt?du(nxt):null;
    const dLabel=nxt?(d===0?'Today':d===1?'Tomorrow':d<=7?`in ${d} days`:fd(nxt)):'Not set';
    const dCls=d!==null?(d<=3?'r':d<=7?'am':'dm'):'muted';
    const pct401=gross>0?(k401a/gross)*100:0;
    const pctTax=gross>0?(taxa/gross)*100:0;
    const pctNet=Math.max(0,100-pct401-pctTax);
    const barHtml=gross>0?`
      <div style="height:7px;border-radius:3px;overflow:hidden;display:flex;gap:1px;margin-bottom:7px">
        ${k401a>0?`<div style="width:${pct401.toFixed(1)}%;background:#8b7cf8;flex-shrink:0"></div>`:''}
        ${taxa>0?`<div style="width:${pctTax.toFixed(1)}%;background:var(--red);flex-shrink:0"></div>`:''}
        <div style="width:${pctNet.toFixed(1)}%;background:var(--green);flex-shrink:0"></div>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;font-family:var(--fm);flex-wrap:wrap;margin-bottom:10px">
        <span class="dm">Gross <span class="mono">${fmt(gross)}</span></span>
        ${k401a>0?`<span style="color:#8b7cf8">401k <span class="mono">&#x2212;${fmt(k401a)}</span></span>`:''}
        ${taxa>0?`<span class="r">Tax <span class="mono">&#x2212;${fmt(taxa)}</span></span>`:''}
      </div>`:'';
    return`<div style="background:var(--bg2);border:1px solid var(--line);border-radius:var(--r2);padding:15px 16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--bright);margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(i.name)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span class="badge bgr">${escapeHtml(i.income_type||'hourly')}</span>
            <span class="badge">${escapeHtml(fl[i.frequency]||i.frequency)}</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          <div class="mono g" style="font-size:20px;font-weight:700;line-height:1.1">${fmt(net)}</div>
          <div style="font-size:11px;color:var(--dim);font-family:var(--fm)">per ${escapeHtml(perLabel[i.frequency]||i.frequency)}</div>
        </div>
      </div>
      ${barHtml}
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)">
        <div>
          <div style="font-size:12px;color:var(--dim);font-family:var(--fm)">&#x2248;&nbsp;${fmt(mo)}&thinsp;/&thinsp;mo</div>
          <div class="${dCls}" style="font-size:12px;font-weight:600">Next pay: ${dLabel}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-g btn-xs" onclick="pp_edit('${i.id}')">&#x270F;</button>
          <button class="btn btn-d btn-xs" onclick="pp_del('${i.id}')">&#x2715;</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function pp_populateSourceSelect(){
  const sel=document.getElementById('hist-src');if(!sel)return;
  const sources=DB['paycheck_pro']||[];
  sel.innerHTML=`<option value="">-- Select source --</option>`
    +sources.map(s=>`<option value="${s.id}" data-net="${s.net||0}">${escapeHtml(s.name)} (est. ${fmt(s.net||0)}/check)</option>`).join('');
  sel.onchange=function(){
    const opt=sel.options[sel.selectedIndex];
    const net=parseFloat(opt?.dataset?.net||0);
    if(net>0){
      const expEl=document.getElementById('hist-exp');
      if(expEl&&!expEl.value)expEl.value=net.toFixed(2);
    }
    pp_histPreview();
  };
}

window.pp_histPreview=function(){
  const exp=parseFloat(document.getElementById('hist-exp').value)||0;
  const act=parseFloat(document.getElementById('hist-act').value)||0;
  const prev=document.getElementById('hist-prev');if(!prev)return;
  if(!act){prev.innerHTML='';return;}
  const diff=act-exp;
  const cls=diff>=0?'al-s':'al-w';
  prev.innerHTML=`<div class="alert ${cls}">
    Expected <strong class="mono">${fmt(exp)}</strong>
    &nbsp;·&nbsp; Actual <strong class="mono">${fmt(act)}</strong>
    &nbsp;·&nbsp; Difference <strong class="mono ${diff>=0?'g':'r'}">${diff>=0?'+':''}${fmt(diff)}</strong>
    ${diff<0?'&nbsp;(lost pay)':'&nbsp;(extra pay)'}
  </div>`;
};

window.pp_histSave=async function(){
  const srcSel=document.getElementById('hist-src');
  const body={
    source_id:  srcSel.value,
    source_name:srcSel.options[srcSel.selectedIndex]?.text?.split(' (')[0]||'Manual Entry',
    date:       document.getElementById('hist-date').value||ts(),
    expected:   parseFloat(document.getElementById('hist-exp').value)||0,
    actual:     parseFloat(document.getElementById('hist-act').value)||0,
    notes:      document.getElementById('hist-notes').value.trim(),
  };
  if(!body.actual){toast('Enter the actual amount you received','wn');return;}
  try{
    await api('POST','/api/mod/paycheck_pro/history',body);
    toast('Paycheck logged','ok');
    pp_histClear();
    const hist=await api('GET','/api/mod/paycheck_pro/history');
    DB['paycheck_pro_history']=Array.isArray(hist)?hist:[];
    pp_buildHistFilter();pp_renderHistory();pp_renderHistStats();
  }catch(e){toast(e.message,'er');}
};

window.pp_histDel=async function(id){
  if(!confirm('Delete this log entry?'))return;
  try{
    await api('DELETE',`/api/mod/paycheck_pro/history/${id}`);
    toast('Deleted','ok');
    const hist=await api('GET','/api/mod/paycheck_pro/history');
    DB['paycheck_pro_history']=Array.isArray(hist)?hist:[];
    pp_buildHistFilter();pp_renderHistory();pp_renderHistStats();
  }catch(e){toast(e.message,'er');}
};

window.pp_histClear=function(){
  ['hist-act','hist-exp','hist-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const src=document.getElementById('hist-src');if(src)src.value='';
  document.getElementById('hist-date').value=ts();
  document.getElementById('hist-prev').innerHTML='';
};

function pp_buildHistFilter(){
  const sel=document.getElementById('hist-mf');if(!sel)return;
  const history=DB['paycheck_pro_history']||[];
  const cur=cmk();
  const months=[...new Set([...history.map(h=>h.date?.slice(0,7)).filter(Boolean),cur])].sort().reverse();
  const prev=sel.value||cur;
  sel.innerHTML=months.map(m=>{const[y,mo]=m.split('-');const l=new Date(y,parseInt(mo)-1,1).toLocaleString('en-US',{month:'long',year:'numeric'});return`<option value="${m}"${m===prev?' selected':''}>${l}</option>`;}).join('');
}

function pp_renderHistory(){
  const month=document.getElementById('hist-mf')?.value||cmk();
  const history=(DB['paycheck_pro_history']||[]).filter(h=>h.date?.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));
  const tb=document.getElementById('hist-tb');if(!tb)return;
  if(!history.length){
    tb.innerHTML=`<tr><td colspan="7"><div class="empty"><div class="ei">🗓</div><p class="ep">No paychecks logged this period.<br>Use the form above to record an actual paycheck.</p></div></td></tr>`;
    return;
  }
  tb.innerHTML=history.map(h=>{
    const est=(h.status||'verified')==='estimated';
    const diff=parseFloat(h.difference||0);
    const diffStr=(diff>=0?'+':'')+fmt(diff);
    const diffCls=diff>=0?'g':'r';
    const reason=h.notes||(h.source_file?'Imported: '+h.source_file:'');
    return`<tr${est?' class="pp-est-row"':''}>
      <td class="mono dm">${fd(h.date)}</td>
      <td class="br">${escapeHtml(h.source_name||'Manual')}${est?' <span class="badge" style="background:var(--amber);color:#000">EST</span>':h.source_file?` <span class="badge bg" title="${escapeHtml(h.source_file)}">📄</span>`:''}</td>
      <td class="mono">${h.expected?fmt(h.expected):'—'}</td>
      <td class="mono ${est?'am':'g'} br">${fmt(h.actual)}</td>
      <td class="mono ${diffCls} br">${est?'—':diffStr}</td>
      <td class="dm" style="font-size:12px">${escapeHtml(reason||'—')}</td>
      <td><button class="btn btn-d btn-xs" onclick="pp_histDel('${h.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}

function pp_renderHistStats(){
  const all=DB['paycheck_pro_history']||[];
  const history=all.filter(h=>(h.status||'verified')==='verified');
  const cur=cmk();
  const thisMo=history.filter(h=>h.date?.startsWith(cur));
  const estMo=all.filter(h=>(h.status||'verified')==='estimated'&&h.date?.startsWith(cur)).reduce((s,h)=>s+parseFloat(h.actual||0),0);
  const moActual=thisMo.reduce((s,h)=>s+parseFloat(h.actual||0),0);
  const moExpected=thisMo.reduce((s,h)=>s+parseFloat(h.expected||0),0);
  const moDiff=moActual-moExpected;
  const allTime=history.reduce((s,h)=>s+parseFloat(h.difference||0),0);
  const el=document.getElementById('pp-hist-stats');if(!el)return;
  el.innerHTML=`
    <div class="stat"><div class="stat-label">Logged This Month</div><div class="stat-val g">${fmt(moActual)}</div><div class="stat-sub">${thisMo.length} paycheck${thisMo.length!==1?'s':''}${estMo>0?` · +${fmt(estMo)} projected`:''}</div><div class="stat-bar g"></div></div>
    <div class="stat"><div class="stat-label">Expected This Month</div><div class="stat-val">${fmt(moExpected)}</div><div class="stat-sub">from estimates</div><div class="stat-bar"></div></div>
    <div class="stat"><div class="stat-label">Difference This Month</div><div class="stat-val ${moDiff>=0?'g':'r'}">${moDiff>=0?'+':''}${fmt(moDiff)}</div><div class="stat-sub">${moDiff<0?'lost pay':moDiff>0?'extra pay':'exact match'}</div><div class="stat-bar ${moDiff>=0?'g':'r'}"></div></div>
    <div class="stat"><div class="stat-label">All-Time Difference</div><div class="stat-val ${allTime>=0?'g':'r'}">${allTime>=0?'+':''}${fmt(allTime)}</div><div class="stat-sub">${history.length} total logged</div><div class="stat-bar ${allTime>=0?'g':'r'}"></div></div>
  `;
}

})();
