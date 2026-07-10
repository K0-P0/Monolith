(function(){'use strict';

(function bp(){
    if(document.getElementById('page-reports'))return;
    const d=document.createElement('div');d.id='page-reports';d.className='page';
    d.innerHTML=`
    <div class="card">
        <div class="card-hd"><span class="card-title">Income</span></div>
        <div class="stat-row" id="rep-income-stats"></div>
        <div id="rep-income-sources" style="margin-top:14px"></div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Expenses</span></div>
        <div class="stat-row" id="rep-exp-stats"></div>
        <div class="two-col" style="margin-top:14px">
            <div>
                <div style="font-size:11px;color:var(--ghost);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">By Category</div>
                <div id="rep-by-cat"></div>
            </div>
            <div>
                <div style="font-size:11px;color:var(--ghost);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">By Module</div>
                <div id="rep-by-mod"></div>
            </div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Financial Health</span></div>
        <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
            <div id="rep-grade-box" style="flex-shrink:0;text-align:center;min-width:90px"></div>
            <div style="flex:1;min-width:200px">
                <div id="rep-score-bar"></div>
                <div id="rep-insights" style="margin-top:14px"></div>
            </div>
        </div>
    </div>
    <div class="card">
        <div class="card-hd"><span class="card-title">Ratios</span></div>
        <div class="stat-row" id="rep-ratios"></div>
    </div>`;
    document.getElementById('content').appendChild(d);
})();

const GRADE_COLOR={A:'#38c872',B:'#5ab4ff',C:'#f0a000',D:'#fb923c',F:'#e05252'};

window.render_reports=async function(){
    const data=DB.reports||{};
    const inc=data.income||{};
    const exp=data.expense||{};
    const hlth=data.health||{};

    const incStats=document.getElementById('rep-income-stats');
    if(incStats){
        const bt=inc.by_type||{};
        incStats.innerHTML=`
            <div class="stat"><div class="stat-label">Total Monthly</div><div class="stat-val g">${fmt(inc.monthly_total||0)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">Annual Est.</div><div class="stat-val g">${fmtK((inc.monthly_total||0)*12)}</div><div class="stat-bar g"></div></div>
            <div class="stat"><div class="stat-label">Primary</div><div class="stat-val">${fmt(bt.primary||0)}</div><div class="stat-bar"></div></div>
            <div class="stat"><div class="stat-label">Supplemental</div><div class="stat-val">${fmt(bt.supplemental||0)}</div><div class="stat-bar"></div></div>`;
    }

    const srcEl=document.getElementById('rep-income-sources');
    if(srcEl){
        const srcs=(inc.sources||[]).filter(s=>s.frequency!=='actual');
        if(!srcs.length){
            srcEl.innerHTML=`<div class="empty"><div class="ei">💵</div><p class="ep">No income sources found.</p></div>`;
        }else{
            srcEl.innerHTML=`
                <div style="font-size:11px;color:var(--ghost);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Income Breakdown</div>
                ${srcs.map(s=>`
                <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
                    <div>
                        <div style="font-weight:700;font-size:13px">${escapeHtml(s.name)}</div>
                        <div style="font-size:11px;color:var(--ghost);margin-top:2px">${s.mod_name} · ${escapeHtml(s.frequency)} · <span class="badge ${s.type==='primary'?'bb':'bgr'}">${s.type}</span></div>
                    </div>
                    <div class="mono g" style="font-size:14px">${fmt(s.monthly)}<span style="font-size:10px;color:var(--ghost)">/mo</span></div>
                </div>`).join('')}`;
        }
    }

    const expStats=document.getElementById('rep-exp-stats');
    if(expStats){
        const net=hlth.net||0;
        expStats.innerHTML=`
            <div class="stat"><div class="stat-label">Total Expenses</div><div class="stat-val r">${fmt(exp.monthly_total||0)}</div><div class="stat-bar r"></div></div>
            <div class="stat"><div class="stat-label">Fixed</div><div class="stat-val">${fmt(exp.fixed_total||0)}</div><div class="stat-bar"></div></div>
            <div class="stat"><div class="stat-label">Variable</div><div class="stat-val">${fmt(exp.variable_total||0)}</div><div class="stat-bar"></div></div>
            <div class="stat"><div class="stat-label">Monthly Net</div><div class="stat-val ${net>=0?'g':'r'}">${fmt(net)}</div><div class="stat-bar ${net>=0?'g':'r'}"></div></div>`;
    }

    const byCatEl=document.getElementById('rep-by-cat');
    if(byCatEl){
        const cats=Object.entries(exp.by_category||{}).sort((a,b)=>b[1]-a[1]);
        const total=cats.reduce((s,[,v])=>s+v,0)||1;
        const donut=cats.length&&window.svgDonut?`<div style="display:flex;justify-content:center;margin-bottom:14px">${svgDonut(cats.map(([c,v])=>({v,c:cc(c),label:c})),{size:132,stroke:16,label:fmtK(total),sub:'this month'})}</div>`:'';
        byCatEl.innerHTML=cats.length?donut+cats.map(([cat,amt])=>`
            <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                    <span>${cat}</span><span class="mono">${fmt(amt)}</span>
                </div>
                <div style="height:4px;background:var(--bg2);border-radius:2px">
                    <div style="height:4px;border-radius:2px;background:${cc(cat)};width:${Math.round(amt/total*100)}%"></div>
                </div>
            </div>`).join(''):`<div class="empty"><p class="ep">No expenses this month.</p></div>`;
    }

    const byModEl=document.getElementById('rep-by-mod');
    if(byModEl){
        const mods=Object.entries(exp.by_mod||{}).sort((a,b)=>b[1]-a[1]);
        byModEl.innerHTML=mods.length?mods.map(([mid,amt])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:12px">
                <span style="text-transform:capitalize">${mid.replace(/_/g,' ')}</span>
                <span class="mono r">${fmt(amt)}</span>
            </div>`).join(''):`<div class="empty"><p class="ep">No expense data.</p></div>`;
    }

    const grade=hlth.grade||'—';
    const score=hlth.score||0;
    const gcol=GRADE_COLOR[grade]||'var(--ghost)';

    const gradeBox=document.getElementById('rep-grade-box');
    if(gradeBox){
        gradeBox.innerHTML=`
            <div style="font-size:72px;font-weight:900;line-height:1;color:${gcol}">${grade}</div>
            <div style="font-size:11px;color:var(--ghost);margin-top:6px">Letter Grade</div>`;
    }

    const scoreBar=document.getElementById('rep-score-bar');
    if(scoreBar){
        scoreBar.innerHTML=`
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
                <span style="color:var(--ghost)">Health Score</span>
                <span class="mono" style="color:${gcol}">${score} / 100</span>
            </div>
            <div style="height:8px;background:var(--bg2);border-radius:4px;overflow:hidden">
                <div style="height:8px;border-radius:4px;background:${gcol};width:${score}%;transition:width .4s ease"></div>
            </div>`;
    }

    const insightsEl=document.getElementById('rep-insights');
    if(insightsEl){
        const ins=hlth.insights||[];
        insightsEl.innerHTML=ins.length?ins.map(i=>`
            <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:13px">
                <span style="color:var(--ghost);flex-shrink:0;margin-top:1px">→</span><span>${i}</span>
            </div>`).join(''):`<div style="font-size:13px;color:var(--ghost)">No insights available.</div>`;
    }

    const ratiosEl=document.getElementById('rep-ratios');
    if(ratiosEl){
        const sr=hlth.savings_rate_pct||0;
        const er=hlth.expense_ratio_pct||0;
        const dti=hlth.debt_to_income||0;
        ratiosEl.innerHTML=`
            <div class="stat">
                <div class="stat-label">Savings Rate</div>
                <div class="stat-val ${sr>=20?'g':sr>=10?'':'r'}">${sr.toFixed(1)}%</div>
                <div class="stat-bar ${sr>=20?'g':sr>=10?'':'r'}"></div>
            </div>
            <div class="stat">
                <div class="stat-label">Expense Ratio</div>
                <div class="stat-val ${er<=70?'g':er<=90?'':'r'}">${er.toFixed(1)}%</div>
                <div class="stat-bar ${er<=70?'g':er<=90?'':'r'}"></div>
            </div>
            <div class="stat">
                <div class="stat-label">Debt-to-Income</div>
                <div class="stat-val ${dti<=30?'g':dti<=50?'':'r'}">${dti.toFixed(1)}%</div>
                <div class="stat-bar ${dti<=30?'g':dti<=50?'':'r'}"></div>
            </div>`;
    }
};
})();
