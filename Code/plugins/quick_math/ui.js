(function(){'use strict';

let _qmHist=[],_qmLast=null;

window.renderQmWidget=function(){
  const el=document.getElementById('qm-widget');if(!el)return;
  el.innerHTML=`
    <div id="qm-disp" style="background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r);padding:10px 13px;font-family:var(--fm);font-size:22px;font-weight:600;color:var(--bright);text-align:right;min-height:52px;line-height:1.2;margin-bottom:8px;word-break:break-all">0</div>
    <div style="display:flex;gap:6px">
      <input id="qm-inp" class="mono" type="text" placeholder="12.50 + 8.99 + 4.25" autocomplete="off" spellcheck="false" style="flex:1;font-size:14px;letter-spacing:1px">
      <button class="btn btn-p btn-sm" onclick="qm_eval()">=</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-g btn-xs" onclick="qm_clear()">Clear</button>
      <button class="btn btn-ok btn-xs" id="qm-use" onclick="qm_use()" style="display:none">&#x2192; Use as Expense</button>
    </div>
    <div id="qm-hist" style="margin-top:10px;max-height:88px;overflow-y:auto;display:flex;flex-direction:column;gap:3px"></div>`;
  document.getElementById('qm-inp').addEventListener('keydown',e=>{if(e.key==='Enter')qm_eval();});
  qm_renderHist();
};

function safeEval(e){
  const c=e.trim().replace(/[^0-9\s\+\-\*\/\.\(\)]/g,'');if(!c)return null;
  const toks=c.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g);if(!toks)return null;
  const prec={'+':1,'-':1,'*':2,'/':2};const out=[],ops=[];let prev=null;
  for(const t of toks){
    if(/^[\d.]/.test(t)){const n=parseFloat(t);if(!isFinite(n))return null;out.push(n);prev='num';}
    else if(t==='('){ops.push(t);prev='(';}
    else if(t===')'){while(ops.length&&ops[ops.length-1]!=='(')out.push(ops.pop());if(!ops.length)return null;ops.pop();prev='num';}
    else{
      let op=t;
      if((op==='-'||op==='+')&&(prev===null||prev==='op'||prev==='('))op=op==='-'?'u-':'u+';
      if(op==='u+'){prev='op';continue;}
      if(op==='u-'){out.push(0);ops.push('-');prev='op';continue;}
      while(ops.length&&ops[ops.length-1]!=='('&&prec[ops[ops.length-1]]>=prec[op])out.push(ops.pop());
      ops.push(op);prev='op';
    }
  }
  while(ops.length){const o=ops.pop();if(o==='(')return null;out.push(o);}
  const st=[];
  for(const t of out){
    if(typeof t==='number'){st.push(t);continue;}
    const b=st.pop(),a=st.pop();if(a===undefined||b===undefined)return null;
    if(t==='/'&&b===0)return null;
    st.push(t==='+'?a+b:t==='-'?a-b:t==='*'?a*b:a/b);
  }
  if(st.length!==1)return null;
  const r=st[0];return typeof r==='number'&&isFinite(r)?r:null;
}

window.qm_eval=function(){
  const inp=document.getElementById('qm-inp');if(!inp)return;
  const expr=inp.value.trim();if(!expr)return;
  const res=safeEval(expr);
  const disp=document.getElementById('qm-disp'),ub=document.getElementById('qm-use');
  if(!disp)return;
  if(res===null){disp.innerHTML='<span style="color:var(--red);font-size:14px">Invalid expression</span>';_qmLast=null;if(ub)ub.style.display='none';return;}
  _qmLast=res;
  disp.innerHTML=`<span style="color:var(--dim);font-size:13px">${escapeHtml(expr)} =</span><br><span style="color:var(--green);font-size:18px">${fmt(res)}</span>`;
  if(ub)ub.style.display='inline-flex';
  _qmHist.unshift({expr,res});if(_qmHist.length>6)_qmHist.pop();
  qm_renderHist();
};
window.qm_clear=function(){const inp=document.getElementById('qm-inp'),disp=document.getElementById('qm-disp'),ub=document.getElementById('qm-use');if(inp)inp.value='';if(disp)disp.textContent='0';if(ub)ub.style.display='none';_qmLast=null;};
window.qm_use=function(){if(_qmLast!==null)openQuickExpense(_qmLast);};
window.qm_useHist=function(i){const inp=document.getElementById('qm-inp');if(inp)inp.value=_qmHist[i].expr;qm_eval();};
function qm_renderHist(){const el=document.getElementById('qm-hist');if(!el)return;el.innerHTML=_qmHist.map((h,i)=>`<div onclick="qm_useHist(${i})" style="display:flex;justify-content:space-between;padding:5px 6px;border-radius:var(--r);font-family:var(--fm);font-size:11px;cursor:pointer;color:var(--ghost);min-height:30px;align-items:center" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''"><span style="color:var(--dim)">${escapeHtml(h.expr)}</span><span style="color:var(--amber)">${fmt(h.res)}</span></div>`).join('');}
})();
