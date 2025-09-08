import { currentUser, logout, guard, addSale, listSales, salesCsv, groupInvoices, totalsToday, totalsMonth, topItemName, addPatient, listPatients, markPatientReminder, waLink, addRoster, listRoster, importSalesCsv, downloadSalesTemplate } from './store.js';

const user = currentUser();
if (!user) location.href = '/login.html';

document.getElementById('who').textContent = `${user.role}`;
document.getElementById('logout').onclick = ()=>{ logout(); location.href='/login.html'; };

guard(user);

const panels = [...document.querySelectorAll('[data-panel]')];
const show = (id)=> panels.forEach(p=> p.hidden = p.dataset.panel!==id);

document.querySelectorAll('#tabs [data-tab]').forEach(b=>{
  b.addEventListener('click', ()=> show(b.dataset.tab));
});
show('pharma');

const saleForm = document.getElementById('saleForm');
saleForm.date.valueAsDate = new Date();
saleForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(saleForm));
  addSale({date:data.date,item:data.item,invoice:data.invoice,qty:+data.qty,price:+data.price});
  renderSales(); renderAnalytics(); renderInvoices();
  saleForm.reset(); saleForm.date.valueAsDate = new Date();
});

function renderSales(){
  const tbody = document.querySelector('#salesTbl tbody');
  tbody.innerHTML = '';
  for (const s of listSales()){
    const tr = document.createElement('tr');
    const amt = (s.qty*s.price).toFixed(2);
    tr.innerHTML = `<td>${s.date}</td><td>${s.item}</td><td>${s.qty}</td><td>${s.price}</td><td>${amt}</td><td>${s.invoice}</td>`;
    tbody.appendChild(tr);
  }
}
renderSales();

document.getElementById('exportSales').onclick = ()=>{
  const csv = salesCsv();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'pharma_sales.csv'; a.click();
};

function renderInvoices(){
  const wrap = document.getElementById('invoiceList');
  wrap.innerHTML='';
  const groups = groupInvoices();
  for (const [inv, rows] of Object.entries(groups)){
    const total = rows.reduce((t,r)=> t + r.qty*r.price, 0).toFixed(2);
    const card = document.createElement('div');
    card.className='card';
    card.innerHTML = `<b>${inv}</b> • Items: ${rows.length} • Total: ₹${total}`;
    wrap.appendChild(card);
  }
}
renderInvoices();

function renderAnalytics(){
  document.getElementById('totalToday').textContent = totalsToday().toFixed(2);
  document.getElementById('totalMonth').textContent = totalsMonth().toFixed(2);
  document.getElementById('topItem').textContent = topItemName() || '–';
  drawChart();
}

function drawChart(){
  const cvs = document.getElementById('chart');
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0,0,cvs.width,cvs.height);
  const days = lastNDays(7);
  const vals = days.map(d=> sumForDate(d));
  const max = Math.max(1, ...vals);
  const W = cvs.width, H = cvs.height, pad=20;
  const bw = (W - pad*2)/days.length;
  ctx.fillStyle = '#22304a'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#22c55e';
  vals.forEach((v,i)=>{
    const h = (v/max)*(H-pad*2);
    const x = pad + i*bw + 6;
    const y = H - pad - h;
    ctx.fillRect(x, y, bw-12, h);
  });
  ctx.fillStyle = '#94a3b8'; ctx.font='12px system-ui';
  days.forEach((d,i)=>{ ctx.fillText(d.slice(5), pad + i*bw + 4, H-4); });
}

function lastNDays(n){
  const out=[]; const dt=new Date();
  for(let i=n-1;i>=0;i--){ const d=new Date(dt); d.setDate(d.getDate()-i); out.push(d.toISOString().slice(0,10)); }
  return out;
}
function sumForDate(d){ return listSales().filter(s=>s.date===d).reduce((t,r)=>t+r.qty*r.price,0); }
renderAnalytics();

const patForm = document.getElementById('patForm');
patForm.date.valueAsDate = new Date();
patForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(patForm));
  addPatient({date:data.date,slot:data.slot,name:data.name,contact:data.contact,dx:data.dx});
  renderPatients(); patForm.reset(); patForm.date.valueAsDate = new Date();
});
function renderPatients(){
  const tbody = document.querySelector('#patTbl tbody');
  tbody.innerHTML='';
  for(const p of listPatients()){
    const tr = document.createElement('tr');
    const msg = encodeURIComponent(`Reminder: ${p.date} ${p.slot} – ${p.name}.`);
    tr.innerHTML = `<td>${p.date}</td><td>${p.slot}</td><td>${p.name}</td><td>${p.dx}</td>
      <td><a class="chip" href="${waLink(p.contact, msg)}" target="_blank">WhatsApp</a></td>
      <td><button class="chip ${p.reminder==='✔️'?'ok':''}" data-id="${p.id}">${p.reminder||'Mark'}</button></td>`;
    tbody.appendChild(tr);
  }
}
renderPatients();

document.addEventListener('click', (e)=>{
  const b = e.target.closest('#patTbl button.chip');
  if(!b) return; const id = b.dataset.id; if(markPatientReminder(id)){ b.textContent='✔️'; b.classList.add('ok'); }
});

const staffForm = document.getElementById('staffForm');
staffForm.date.valueAsDate = new Date();
staffForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(staffForm));
  addRoster({date:data.date,name:data.name,shift:data.shift,status:data.status});
  renderRoster(); staffForm.reset(); staffForm.date.valueAsDate = new Date();
});
function renderRoster(){
  const tbody = document.querySelector('#staffTbl tbody');
  tbody.innerHTML='';
  for(const r of listRoster()){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.date}</td><td>${r.name}</td><td>${r.shift}</td><td>${r.status}</td>`;
    tbody.appendChild(tr);
  }
}
renderRoster();

const csv = document.getElementById('csv');
if (csv){ csv.addEventListener('change', async ()=>{ const f = csv.files[0]; if(!f) return; const txt = await f.text(); const {ok,count} = importSalesCsv(txt); alert(ok?`Imported ${count} rows`:'Import failed'); renderSales(); renderAnalytics(); renderInvoices(); }); }

document.getElementById('downloadTemplate').onclick = ()=>{
  const blob = new Blob([downloadSalesTemplate()],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pharma_template.csv'; a.click();
};

document.getElementById('wipe').onclick = ()=>{ if(confirm('Wipe ALL demo data?')){ localStorage.clear(); location.reload(); } };
