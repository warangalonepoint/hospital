import {
  currentUser, logout, guard,
  addSale, listSales, salesCsv, groupInvoices, totalsToday, totalsMonth, topItemName,
  addPatient, listPatients, markReminder, waLink,
  addRoster, listRoster,
  importSalesCsv, downloadSalesTemplate
} from './store.js?v=5';

// Auth gate
const user=currentUser(); if(!user){ location.href='login.html?v=5'; throw new Error('no-user'); }
document.getElementById('who')?.classList.add('chip');
document.getElementById('who') && (document.getElementById('who').textContent = user.role);
document.getElementById('logout')?.addEventListener('click',()=>{ logout(); location.href='login.html?v=5'; });

// Theme toggle
const tbtn=document.getElementById('themeToggle');
if(localStorage.theme){ document.documentElement.setAttribute('data-theme', localStorage.theme); tbtn.textContent = localStorage.theme==='light'?'🌞':'🌙'; }
tbtn.onclick=()=>{ const cur=document.documentElement.getAttribute('data-theme'); const next=cur==='light'?'dark':'light'; document.documentElement.setAttribute('data-theme',next); localStorage.theme=next; tbtn.textContent=next==='light'?'🌞':'🌙'; };

// Role-based UI
guard(user);

// Tabs
const panels=[...document.querySelectorAll('[data-panel]')];
const show=id=>panels.forEach(p=>p.hidden=p.dataset.panel!==id);
document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
show('pharma');

// Pharma
const saleForm=document.getElementById('saleForm'); saleForm.date.valueAsDate=new Date();
saleForm.addEventListener('submit',e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(saleForm));
  addSale({date:d.date,item:d.item,invoice:d.invoice,qty:+d.qty,price:+d.price});
  renderSales(); renderAnalytics(); renderInvoices(); saleForm.reset(); saleForm.date.valueAsDate=new Date();
});
function renderSales(){
  const tb=document.querySelector('#salesTbl tbody'); tb.innerHTML='';
  for(const s of listSales()){
    const tr=document.createElement('tr'); const amt=(s.qty*s.price).toFixed(2);
    tr.innerHTML=`<td>${s.date}</td><td>${s.item}</td><td>${s.qty}</td><td>${s.price}</td><td>${amt}</td><td>${s.invoice}</td>`;
    tb.appendChild(tr);
  }
}
renderSales();

document.getElementById('exportSales').onclick=()=>{
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([salesCsv()],{type:'text/csv'})); a.download='pharma_sales.csv'; a.click();
};

function renderInvoices(){
  const wrap=document.getElementById('invoiceList'); wrap.innerHTML='';
  const groups=groupInvoices();
  for(const [inv,rows] of Object.entries(groups)){
    const total=rows.reduce((t,r)=>t+r.qty*r.price,0).toFixed(2);
    const card=document.createElement('div'); card.className='card'; card.innerHTML=`<b>${inv}</b> • Items: ${rows.length} • Total: ₹${total}`;
    wrap.appendChild(card);
  }
}
renderInvoices();

function renderAnalytics(){
  const t1=totalsToday().toFixed(2); const t2=totalsMonth().toFixed(2); const top=topItemName()||'–';
  document.getElementById('totalToday').textContent=t1;
  document.getElementById('totalMonth').textContent=t2;
  document.getElementById('topItem').textContent=top;
  drawChart();
}
function drawChart(){
  const cvs=document.getElementById('chart'); const ctx=cvs.getContext('2d');
  const days=lastNDays(7); const vals=days.map(d=>sumForDate(d));
  const max=Math.max(1,...vals); ctx.clearRect(0,0,cvs.width,cvs.height);
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--card-bg'); ctx.fillRect(0,0,cvs.width,cvs.height);
  ctx.fillStyle='#22d3ee'; const pad=20; const bw=(cvs.width-pad*2)/days.length;
  vals.forEach((v,i)=>{ const h=(v/max)*(cvs.height-pad*2); const x=pad+i*bw+6; const y=cvs.height-pad-h; ctx.fillRect(x,y,bw-12,h); });
}
function lastNDays(n){ const out=[]; const dt=new Date(); for(let i=n-1;i>=0;i--){ const d=new Date(dt); d.setDate(d.getDate()-i); out.push(d.toISOString().slice(0,10)); } return out; }
function sumForDate(d){ return listSales().filter(s=>s.date===d).reduce((t,r)=>t+r.qty*r.price,0); }
renderAnalytics();

// Patients
const patForm=document.getElementById('patForm'); patForm.date.valueAsDate=new Date();
patForm.addEventListener('submit',e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(patForm));
  addPatient({date:d.date,slot:d.slot,name:d.name,contact:d.contact,dx:d.dx}); renderPatients(); patForm.reset(); patForm.date.valueAsDate=new Date();
});
function renderPatients(){
  const tb=document.querySelector('#patTbl tbody'); tb.innerHTML='';
  for(const p of listPatients()){
    const msg=encodeURIComponent(`Reminder: ${p.date} ${p.slot} – ${p.name}.`);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.date}</td><td>${p.slot}</td><td>${p.name}</td><td>${p.dx}</td>
      <td><a class='chip' href='${waLink(p.contact,msg)}' target='_blank'>WhatsApp</a></td>
      <td><button class='chip ${p.reminder==='✔️'?'ok':''}' data-id='${p.id}'>${p.reminder||'Mark'}</button></td>`;
    tb.appendChild(tr);
  }
}
renderPatients();
document.addEventListener('click',e=>{
  const b=e.target.closest('#patTbl button.chip'); if(!b) return;
  if(markReminder(b.dataset.id)){ b.textContent='✔️'; b.classList.add('ok'); }
});

// Staff
const staffForm=document.getElementById('staffForm'); staffForm.date.valueAsDate=new Date();
staffForm.addEventListener('submit',e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(staffForm));
  addRoster({date:d.date,name:d.name,shift:d.shift,status:d.status}); renderRoster(); staffForm.reset(); staffForm.date.valueAsDate=new Date();
});
function renderRoster(){
  const tb=document.querySelector('#staffTbl tbody'); tb.innerHTML='';
  for(const r of listRoster()){
    const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.date}</td><td>${r.name}</td><td>${r.shift}</td><td>${r.status}</td>`; tb.appendChild(tr);
  }
}
renderRoster();

// CSV import
const csv=document.getElementById('csv');
csv?.addEventListener('change', async ()=>{
  const f=csv.files[0]; if(!f) return; const txt=await f.text();
  const {ok,count}=importSalesCsv(txt); alert(ok?`Imported ${count} rows`:'Import failed');
  renderSales(); renderAnalytics(); renderInvoices();
});
document.getElementById('downloadTemplate')?.addEventListener('click',()=>{
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([downloadSalesTemplate()],{type:'text/csv'})); a.download='pharma_template.csv'; a.click();
});
document.getElementById('wipe')?.addEventListener('click',()=>{
  if(confirm('Wipe ALL demo data?')){ localStorage.removeItem('onestop_hospital_demo_v5'); location.reload(); }
});
