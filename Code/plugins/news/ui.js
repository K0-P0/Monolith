(function(){'use strict';
const WINDOW_DAYS_LABEL='60 days';

(function bp(){
    if(document.getElementById('page-news'))return;
    const d=document.createElement('div');d.id='page-news';d.className='page';
    d.innerHTML=`
    <div class="stat-row" id="news-stats"></div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Upcoming Payments</span><span class="badge ba" id="news-badge"></span></div>
        <div id="news-feed"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

window.render_news=async function(){ news_render(); };

function news_item(e){
    const dt=new Date(e.date+'T00:00:00');
    const mon=dt.toLocaleDateString('en-US',{month:'short'}).toUpperCase();
    const sign=e.type==='income'?'+':(e.type==='reminder'||e.type==='deadline')?'':'-';
    return`<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
        <div style="width:38px;text-align:center;flex-shrink:0">
            <div style="font-family:var(--fm);font-size:19px;font-weight:700;color:var(--bright);line-height:1.1">${dt.getDate()}</div>
            <div style="font-family:var(--fm);font-size:9px;color:var(--muted);text-transform:uppercase">${mon}</div>
        </div>
        <div style="font-size:16px;flex-shrink:0">${e.icon||'&#x1F4CC;'}</div>
        <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(e.label)}</div>
            <div style="font-size:10px;color:var(--dim);font-family:var(--fm);text-transform:uppercase">${escapeHtml(e.mod_name)}</div>
        </div>
        ${e.amount?`<div class="mono" style="font-size:14px;font-weight:700;flex-shrink:0;color:${e.color||'var(--bright)'}">${sign}${fmt(e.amount)}</div>`:''}
    </div>`;
}

function news_render(){
    const d=DB.news||{events:[],total_upcoming:0,count:0};
    const events=d.events||[];
    const today0=events.filter(e=>du(e.date)===0);
    const week=events.filter(e=>du(e.date)>0&&du(e.date)<=7);
    const later=events.filter(e=>du(e.date)>7);

    const statsEl=document.getElementById('news-stats');
    if(statsEl)statsEl.innerHTML=`
        <div class="stat"><div class="stat-label">Upcoming Total</div><div class="stat-val r">${fmt(d.total_upcoming)}</div><div class="stat-sub">next ${WINDOW_DAYS_LABEL}</div><div class="stat-bar r"></div></div>
        <div class="stat"><div class="stat-label">Today</div><div class="stat-val ${today0.length?'am':''}">${today0.length}</div><div class="stat-sub">${today0.length?'due today':'all clear'}</div><div class="stat-bar ${today0.length?'o':'g'}"></div></div>
        <div class="stat"><div class="stat-label">This Week</div><div class="stat-val ${week.length?'am':''}">${week.length}</div><div class="stat-sub">next 7 days</div><div class="stat-bar ${week.length?'o':''}"></div></div>
        <div class="stat"><div class="stat-label">Total Events</div><div class="stat-val">${d.count}</div><div class="stat-sub">tracked</div><div class="stat-bar"></div></div>`;

    const badge=document.getElementById('news-badge');
    if(badge)badge.textContent=`${d.count} upcoming`;

    const feed=document.getElementById('news-feed');if(!feed)return;
    if(!events.length){
        feed.innerHTML=`<div class="empty"><div class="ei">&#x2728;</div><p class="ep">Nothing coming up in the next ${WINDOW_DAYS_LABEL}.</p></div>`;
        return;
    }
    const grp=(lbl,col,items)=>items.length?`<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${col};font-family:var(--fm);font-weight:700;padding:12px 0 2px">${lbl}</div>${items.map(news_item).join('')}`:'';
    feed.innerHTML=grp('Today','var(--amber)',today0)+grp('This Week','var(--dim)',week)+grp('Later','var(--muted)',later);
}
})();
