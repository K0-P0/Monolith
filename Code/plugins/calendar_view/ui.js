(function(){'use strict';
let _calY,_calM,_calSel=null;
(()=>{const n=new Date();_calY=n.getFullYear();_calM=n.getMonth();})();

const CAL_MN=['January','February','March','April','May','June','July','August','September','October','November','December'];

(function bp(){
    if(document.getElementById('page-calendar_view'))return;
    const d=document.createElement('div');d.id='page-calendar_view';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="cal-stats"></div>
    <div id="cal-layout" style="display:grid;grid-template-columns:1fr 286px;gap:16px;align-items:start">
        <div class="card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
                <button class="btn btn-g btn-sm" onclick="cal_prev()">&#x2190;</button>
                <div id="cal-ml" style="font-size:18px;font-weight:700;color:var(--bright);flex:1;text-align:center;font-family:var(--fd)">-</div>
                <button class="btn btn-g btn-sm" onclick="cal_goto_today()">Today</button>
                <button class="btn btn-g btn-sm" onclick="cal_next()">&#x2192;</button>
            </div>
            <div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span><span class="dm">Income</span></div>
                <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:8px;height:8px;border-radius:50%;background:var(--amber);display:inline-block"></span><span class="dm">Bill</span></div>
                <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span><span class="dm">Subscription</span></div>
            </div>
            <div id="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">
                ${['S','M','T','W','T','F','S'].map(h=>`<div style="text-align:center;font-family:var(--fm);font-size:10px;text-transform:uppercase;color:var(--muted);padding:6px 0">${h}</div>`).join('')}
            </div>
        </div>
        <div class="card" id="cal-day-panel">
            <div id="cal-day-content">
                <div style="text-align:center;padding:32px 0;color:var(--muted)">
                    <div style="font-size:32px;margin-bottom:10px">&#x1F4C5;</div>
                    <div style="font-size:12px;font-family:var(--fm);line-height:1.6">Select any day<br>to see what&#8217;s scheduled</div>
                </div>
            </div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Charge Timeline</span><span class="badge ba" id="cal-tl-badge"></span></div>
        <div id="cal-tl"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
    if(!document.getElementById('cal-css')){
        const s=document.createElement('style');s.id='cal-css';
        s.textContent=`
.cal-cell{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:6px 5px;min-height:70px;cursor:pointer;transition:border-color .15s,background .15s;display:flex;flex-direction:column}
.cal-cell:hover{border-color:var(--amber);background:var(--bg3)}
.cal-cell.td{border-color:var(--amber)!important;background:rgba(240,160,0,.06)}
.cal-cell.sel{border-color:var(--amber)!important;background:rgba(240,160,0,.13)!important;box-shadow:0 0 0 2px rgba(240,160,0,.28)}
.cal-cell.om{opacity:.16;cursor:default;pointer-events:none;background:var(--bg1)}
.cal-cell.wknd:not(.td){background:rgba(255,255,255,.02)}
.cal-dn{font-family:var(--fm);font-size:11px;color:var(--dim);margin-bottom:3px;line-height:1}
.cal-cell.td .cal-dn{color:var(--amber);font-weight:700}
.cal-pill{font-size:8px;padding:2px 5px;border-radius:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--fm);margin-bottom:2px;max-width:100%;display:block}
.cal-pill.sub{background:rgba(224,82,82,.2);color:var(--red)}
.cal-pill.bill{background:rgba(240,160,0,.15);color:var(--amber)}
.cal-pill.income{background:rgba(56,200,114,.15);color:var(--green)}
@media(max-width:860px){#cal-layout{grid-template-columns:1fr!important}#cal-day-panel{display:none!important}}`;
        document.head.appendChild(s);
    }
})();

window.render_calendar_view=async function(){cal_draw();};
window.cal_prev=function(){_calM--;if(_calM<0){_calM=11;_calY--;}cal_draw();};
window.cal_next=function(){_calM++;if(_calM>11){_calM=0;_calY++;}cal_draw();};
window.cal_goto_today=function(){const n=new Date();_calY=n.getFullYear();_calM=n.getMonth();cal_draw();};

function cal_build_events(calData,dim){
    const evs={};
    const add=(d,e)=>{if(!evs[d])evs[d]=[];evs[d].push(e);};
    (calData.subscriptions||[]).filter(s=>s.active&&s.next_due).forEach(s=>{
        const dt=new Date(s.next_due+'T00:00:00');
        if(dt.getFullYear()===_calY&&dt.getMonth()===_calM)add(dt.getDate(),{name:s.name,type:'sub',amount:s.amount});
    });
    (calData.bills||[]).forEach(b=>{
        if(b.due_day>=1&&b.due_day<=dim)add(b.due_day,{name:b.name,type:'bill',amount:b.amount});
    });
    (calData.sources||[]).forEach(inc=>{
        if(!inc.last_paid)return;
        const gap={weekly:7,biweekly:14,semimonthly:15,monthly:30,annual:365}[inc.frequency]||14;
        let dt=new Date(inc.last_paid+'T00:00:00');
        const start=new Date(_calY,_calM,1);
        while(dt<start)dt.setDate(dt.getDate()+gap);
        while(dt.getMonth()===_calM&&dt.getFullYear()===_calY){
            add(dt.getDate(),{name:inc.name,type:'income',amount:parseFloat(inc.net||0)});
            dt.setDate(dt.getDate()+gap);
        }
    });
    return evs;
}

function cal_draw(){
    const calData=DB.calendar_view||{};
    document.getElementById('cal-ml').textContent=`${CAL_MN[_calM]} ${_calY}`;
    const grid=document.getElementById('cal-grid');if(!grid)return;
    while(grid.children.length>7)grid.removeChild(grid.lastChild);

    const now=new Date(),isNow=now.getFullYear()===_calY&&now.getMonth()===_calM;
    const fdow=new Date(_calY,_calM,1).getDay(),dim=new Date(_calY,_calM+1,0).getDate();
    const evs=cal_build_events(calData,dim);

    const allEvs=Object.values(evs).flat();
    const charges=allEvs.filter(e=>e.type!=='income');
    const incomes=allEvs.filter(e=>e.type==='income');
    const outflow=charges.reduce((s,e)=>s+parseFloat(e.amount),0);
    const inflow=incomes.reduce((s,e)=>s+parseFloat(e.amount),0);
    let nextCharge=null;
    if(isNow){
        const td=now.getDate();
        for(const [d,dayEvs] of Object.entries(evs).sort(([a],[b])=>+a-+b)){
            if(+d<td)continue;
            const ch=dayEvs.filter(e=>e.type!=='income');
            if(ch.length){nextCharge={...ch[0],day:+d,daysAway:+d-td};break;}
        }
    }
    const nLabel=nextCharge?(nextCharge.daysAway===0?'Today':`${nextCharge.daysAway}d`):'—';
    const nName=nextCharge?escapeHtml(nextCharge.name):'all clear';
    const statsEl=document.getElementById('cal-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Charges</div><div class="stat-val">${charges.length}</div><div class="stat-sub">${CAL_MN[_calM].slice(0,3)}</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Total Outflow</div><div class="stat-val r">${fmt(outflow)}</div><div class="stat-sub">bills + subs</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Paydays</div><div class="stat-val g">${incomes.length}</div><div class="stat-sub">${inflow?fmt(inflow)+' in':'no income set'}</div><div class="stat-bar g"></div></div>
        <div class="stat"><div class="stat-label">Next Charge</div><div class="stat-val ${nextCharge?'am':''}">${nLabel}</div><div class="stat-sub">${nName}</div><div class="stat-bar ${nextCharge?'o':'g'}"></div></div>`;

    for(let i=0;i<fdow;i++){const c=document.createElement('div');c.className='cal-cell om';grid.appendChild(c);}
    for(let day=1;day<=dim;day++){
        const c=document.createElement('div');
        const isTd=isNow&&now.getDate()===day;
        const dotw=(fdow+day-1)%7,isWknd=dotw===0||dotw===6;
        let cls='cal-cell'+(isTd?' td':'')+(isWknd&&!isTd?' wknd':'');
        if(_calSel===day)cls+=' sel';
        c.className=cls;c.setAttribute('data-day',day);
        const dayEvs=evs[day]||[];
        c.onclick=(()=>{const d=day,e=dayEvs;return()=>cal_day_select(d,e,true);})();
        let h=`<div class="cal-dn">${day}</div>`;
        dayEvs.slice(0,2).forEach(ev=>{h+=`<div class="cal-pill ${ev.type}" title="${escapeHtml(ev.name)}: ${fmt(ev.amount)}">${escapeHtml(ev.name)}</div>`;});
        if(dayEvs.length>2)h+=`<div style="font-size:8px;color:var(--muted);font-family:var(--fm);margin-top:1px">+${dayEvs.length-2} more</div>`;
        c.innerHTML=h;grid.appendChild(c);
    }

    const tl=[];
    (calData.subscriptions||[]).filter(s=>s.active&&s.next_due).forEach(s=>{
        const dt=new Date(s.next_due+'T00:00:00');
        if(dt.getFullYear()===_calY&&dt.getMonth()===_calM)tl.push({day:dt.getDate(),name:s.name,type:'sub',amount:s.amount});
    });
    (calData.bills||[]).forEach(b=>{
        if(b.due_day>=1&&b.due_day<=dim)tl.push({day:b.due_day,name:b.name,type:'bill',amount:b.amount});
    });
    (calData.sources||[]).forEach(inc=>{
        if(!inc.last_paid)return;
        const gap={weekly:7,biweekly:14,semimonthly:15,monthly:30,annual:365}[inc.frequency]||14;
        let dt=new Date(inc.last_paid+'T00:00:00');
        while(dt<new Date(_calY,_calM,1))dt.setDate(dt.getDate()+gap);
        while(dt.getMonth()===_calM&&dt.getFullYear()===_calY){
            tl.push({day:dt.getDate(),name:inc.name,type:'income',amount:parseFloat(inc.net||0)});
            dt.setDate(dt.getDate()+gap);
        }
    });
    tl.sort((a,b)=>a.day===b.day?(a.type==='income'?-1:1):a.day-b.day);

    const td_=isNow?now.getDate():-1;
    const upcoming=tl.filter(t=>t.day>=td_);
    const badge=document.getElementById('cal-tl-badge');
    if(badge)badge.textContent=`${upcoming.length} upcoming`;

    const tlEl=document.getElementById('cal-tl');if(!tlEl)return;
    if(!tl.length){tlEl.innerHTML=`<div class="empty"><div class="ei">&#x1F4C5;</div><p class="ep">No charges this month.</p></div>`;return;}

    function tlItem(t){
        const isPast=t.day<td_,isToday=t.day===td_;
        const dotC=t.type==='income'?'var(--green)':t.type==='sub'?'var(--red)':'var(--amber)';
        const amtCls=t.type==='income'?'g':t.type==='sub'?'r':'am';
        const sign=t.type==='income'?'+':'-';
        return`<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line);opacity:${isPast?.42:1}">
            <div style="width:36px;text-align:center;flex-shrink:0">
                <div style="font-family:var(--fm);font-size:19px;font-weight:700;color:${isToday?'var(--amber)':'var(--bright)'};line-height:1.1">${t.day}</div>
                <div style="font-family:var(--fm);font-size:9px;color:var(--muted);text-transform:uppercase">${CAL_MN[_calM].slice(0,3)}</div>
            </div>
            <div style="width:8px;height:8px;border-radius:50%;background:${dotC};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.name)}</div>
                <span class="badge ${t.type==='sub'?'br-b':t.type==='income'?'bg':'ba'}">${t.type}</span>
            </div>
            <div class="mono ${amtCls}" style="font-size:14px;font-weight:700;flex-shrink:0">${sign}${fmt(t.amount)}</div>
        </div>`;
    }

    const grpLabel=(lbl,col)=>`<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${col};font-family:var(--fm);font-weight:700;padding:12px 0 2px">${lbl}</div>`;
    let html='';
    const todayEvs=tl.filter(t=>t.day===td_);
    const futureEvs=tl.filter(t=>t.day>td_);
    const pastEvs=tl.filter(t=>t.day<td_);
    if(todayEvs.length)html+=grpLabel('Today','var(--amber)')+todayEvs.map(tlItem).join('');
    if(futureEvs.length)html+=grpLabel('Upcoming','var(--dim)')+futureEvs.map(tlItem).join('');
    if(pastEvs.length)html+=grpLabel('Past','var(--muted)')+pastEvs.map(tlItem).join('');
    tlEl.innerHTML=html;

    if(_calSel!==null)cal_day_select(_calSel,evs[_calSel]||[]);
}

function cal_day_select(day,dayEvs,fromClick){
    _calSel=day;
    document.querySelectorAll('#cal-grid .cal-cell').forEach(c=>{
        c.classList.toggle('sel',+c.getAttribute('data-day')===day);
    });
    const charges=dayEvs.filter(e=>e.type!=='income');
    const incomes=dayEvs.filter(e=>e.type==='income');
    const totalOut=charges.reduce((s,e)=>s+parseFloat(e.amount),0);
    const totalIn=incomes.reduce((s,e)=>s+parseFloat(e.amount),0);
    const evHtml=dayEvs.map(ev=>{
        const col=ev.type==='income'?'var(--green)':ev.type==='sub'?'var(--red)':'var(--amber)';
        const sign=ev.type==='income'?'+':'-';
        return`<div style="background:var(--bg3);border-radius:var(--r);padding:10px 12px;border-left:3px solid ${col};margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <div style="font-size:13px;font-weight:600;color:var(--bright);overflow:hidden;text-overflow:ellipsis;flex:1">${escapeHtml(ev.name)}</div>
                <div class="mono" style="color:${col};font-weight:700;font-size:14px;flex-shrink:0">${sign}${fmt(ev.amount)}</div>
            </div>
            <div style="font-size:10px;color:var(--dim);margin-top:3px;font-family:var(--fm);text-transform:uppercase;letter-spacing:.8px">${ev.type}</div>
        </div>`;
    }).join('');
    const totals=dayEvs.length>1?`<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:4px">
        ${totalIn>0?`<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span class="dm">Income</span><span class="mono g">+${fmt(totalIn)}</span></div>`:''}
        ${totalOut>0?`<div style="display:flex;justify-content:space-between;font-size:12px"><span class="dm">Charges</span><span class="mono r">-${fmt(totalOut)}</span></div>`:''}
    </div>`:'';
    const emptyMsg=!dayEvs.length?`<div style="text-align:center;padding:20px 0;color:var(--muted)"><div style="font-size:24px;margin-bottom:6px">&#x2728;</div><div style="font-size:12px;font-family:var(--fm)">Nothing scheduled</div></div>`:'';
    if(fromClick&&window.matchMedia('(max-width:860px)').matches){
        openModal(`${CAL_MN[_calM]} ${day}`,`${emptyMsg}${evHtml}${totals}
            <div class="fa" style="margin-top:14px"><button class="btn btn-g btn-sm" onclick="closeModal()">Close</button></div>`);
        return;
    }
    const content=document.getElementById('cal-day-content');if(!content)return;
    content.innerHTML=`
        <div class="card-hd" style="margin-bottom:12px">
            <span class="card-title">${CAL_MN[_calM]} ${day}</span>
            ${dayEvs.length?`<span class="badge ba">${dayEvs.length}</span>`:''}
        </div>
        ${emptyMsg}
        ${evHtml}${totals}`;
}
window.cal_day_select=cal_day_select;
})();
