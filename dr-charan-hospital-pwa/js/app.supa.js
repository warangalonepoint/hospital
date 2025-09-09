import * as S from './store.supa.js?v=1';

// Auth via demo local role
const user = await S.currentUser();
if(!user){ location.href='login.html?v=5'; throw new Error('no-user'); }
document.getElementById('who')?.classList.add('chip');
document.getElementById('who') && (document.getElementById('who').textContent = user.role);
document.getElementById('logout')?.addEventListener('click',()=>{ S.logout(); location.href='login.html?v=5'; });

// Theme
const tbtn=document.getElementById('themeToggle');
if(localStorage.theme){ document.documentElement.setAttribute('data-theme', localStorage.theme); tbtn.textContent = localStorage.theme==='light'?'🌞':'🌙'; }
tbtn.onclick=()=>{ const cur=document.documentElement.getAttribute('data-theme'); const next=cur==='light'?'dark':'light'; document.documentElement.setAttribute('data-theme',next); localStorage.theme=next; tbtn.textContent=next==='light'?'🌞':'🌙'; };

// Role-based UI
S.guard(user);

// Tabs
const panels=[...document.querySelectorAll('[data-panel]')];
const show=id=>panels.forEach(p=>p.hidden=p.dataset.panel!==id);
document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
show('pharma');

// Pharma
const saleForm=document.getElementById('saleForm'); saleForm.date.valueAsDate=new Date();
saleForm.addEventListener('submit',async e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(saleForm));
  await S.addSale({date:d.date,item:d.item,invoice:d.invoice,qty:+d.qty,price:+d.price});
  await renderSales(); await renderAnalytics(); await renderInvoices(); saleForm.reset(); saleForm.date.valueAsDate=new Date();
});
async function renderSales(){
  const tb=document.querySelector('#salesTbl tbody'); tb.innerHTML='';
  for (const s of await S.listSales()){
    const tr=document.createElement('tr'); const amt=(s.qty*s.price).toFixed(2);
    tr.innerHTML=`<td>${s.date}</td><td>${s.item}</td><td>${s.qty}</td><td>${s.price}</td><td>${amt}</td><td>${s.invoice||''}</td>`;
    tb.appendChild(tr);
  }
}
await renderSales();

document.getElementById('exportSales').onclick=async ()=>{
  const rows = await S.listSales();
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([await S.salesCsv(rows)],{type:'text/csv'})); a.download='pharma_sales.csv'; a.click();
};

async function renderInvoices(){
  const wrap=document.getElementById('invoiceList'); wrap.innerHTML='';
  const groups=await S.groupInvoices();
  for(const [inv,rows] of Object.entries(groups)){
    const total=rows.reduce((t,r)=>t+r.qty*r.price,0).toFixed(2);
    const card=document.createElement('div'); card.className='card'; card.innerHTML=`<b>${inv}</b> • Items: ${rows.length} • Total: ₹${total}`;
    wrap.appendChild(card);
  }
}
await renderInvoices();

async function renderAnalytics(){
  const t1=(await S.totalsToday()).toFixed(2);
  const t2=(await S.totalsMonth()).toFixed(2);
  const top=await S.topItemName()||'–';
  document.getElementById('totalToday').textContent=t1;
  document.getElementById('totalMonth').textContent=t2;
  document.getElementById('topItem').textContent=top;
}
await renderAnalytics();

// Patients
const patForm=document.getElementById('patForm'); patForm.date.valueAsDate=new Date();
patForm.addEventListener('submit',async e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(patForm));
  await S.addPatient({date:d.date,slot:d.slot,name:d.name,contact:d.contact,dx:d.dx});
  await renderPatients(); patForm.reset(); patForm.date.valueAsDate=new Date();
});
async function renderPatients(){
  const tb=document.querySelector('#patTbl tbody'); tb.innerHTML='';
  for(const p of await S.listPatients()){
    const msg=encodeURIComponent(`Reminder: ${p.date} ${p.slot} – ${p.name}.`);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.date}</td><td>${p.slot}</td><td>${p.name}</td><td>${p.dx}</td>
      <td><a class='chip' href='${await S.waLink(p.contact,msg)}' target='_blank'>WhatsApp</a></td>
      <td><button class='chip ${p.reminder==='✔️'?'ok':''}' data-id='${p.id}'>${p.reminder||'Mark'}</button></td>`;
    tb.appendChild(tr);
  }
}
await renderPatients();

document.addEventListener('click',async e=>{
  const b=e.target.closest('#patTbl button.chip'); if(!b) return;
  if(await S.markReminder(b.dataset.id)){ b.textContent='✔️'; b.classList.add('ok'); }
});

// Staff
const staffForm=document.getElementById('staffForm'); staffForm.date.valueAsDate=new Date();
staffForm.addEventListener('submit',async e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(staffForm));
  await S.addRoster({date:d.date,name:d.name,shift:d.shift,status:d.status});
  await renderRoster(); staffForm.reset(); staffForm.date.valueAsDate=new Date();
});
async function renderRoster(){
  const tb=document.querySelector('#staffTbl tbody'); tb.innerHTML='';
  for(const r of await S.listRoster()){
    const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.date}</td><td>${r.name}</td><td>${r.shift}</td><td>${r.status}</td>`; tb.appendChild(tr);
  }
}
await renderRoster();

// CSV import
const csv=document.getElementById('csv');
csv?.addEventListener('change', async ()=>{
  const f=csv.files[0]; if(!f) return; const txt=await f.text();
  const {ok,count}=await S.importSalesCsv(txt); alert(ok?`Imported ${count} rows`:'Import failed');
  await renderSales(); await renderAnalytics(); await renderInvoices();
});
document.getElementById('downloadTemplate')?.addEventListener('click',()=>{
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([S.downloadSalesTemplate()],{type:'text/csv'})); a.download='pharma_template.csv'; a.click();
});
