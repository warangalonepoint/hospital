// js/store.js (v21) — ultra-simple PIN login
export const KEY = 'charan:hospital:v21';

const DEMO_USERS = [
  { id: 'u1', name: 'Dr. Charan', role: 'doctor',     pin: '4321' },
  { id: 'u2', name: 'Supervisor', role: 'supervisor', pin: '1111' },
  { id: 'u3', name: 'Patient',    role: 'patient',    pin: '2222' },
];

function load() {
  const raw = localStorage.getItem(KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  const db = { users: DEMO_USERS, user: null, invoices: [], lastInvoiceNo: 1000 };
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}
function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

// Auth
export function authenticatePin(pin){
  const db = load();
  const u = db.users.find(x => x.pin === String(pin).trim());
  if(!u) return null;
  db.user = { id: u.id, name: u.name, role: u.role };
  save(db);
  return db.user;
}
export function currentUser(){ return (load().user)||null; }
export function logout(){ const db=load(); db.user=null; save(db); }

// Tiny guards for pages
export function requireRole(role){
  const u=currentUser();
  if(!u){ location.href='login.html'; return null; }
  if(role && u.role!==role){
    // bounce them to the right home
    if(u.role==='doctor') location.href='dashboard.html';
    else if(u.role==='supervisor') location.href='admin.html';
    else location.href='portal.html';
    return null;
  }
  return u;
}

// ----- minimal billing helpers the dashboard tile expects -----
export function listInvoices(opts={}){
  const db=load(); let rows=db.invoices.slice();
  const {from,to}=opts;
  if(from) rows=rows.filter(r => (r.date||'')>=from);
  if(to)   rows=rows.filter(r => (r.date||'')<=to);
  return rows;
}
export function listSales(){ // flatten lines
  const rows=[]; for(const inv of listInvoices()){
    for(const it of (inv.items||[])){
      const qty=+it.qty||0, price=+it.price||0;
      rows.push({date:inv.date,item:it.item,qty,price,amount:+(qty*price).toFixed(2),invoice:inv.number});
    }
  } return rows;
}
export async function totalsToday(){
  const t=new Date().toISOString().slice(0,10);
  return listInvoices({from:t,to:t}).reduce((s,i)=>s+(+i.total||0),0);
}
export async function totalsMonth(){
  const m=new Date().toISOString().slice(0,7);
  return listInvoices().filter(i=>(i.date||'').startsWith(m))
    .reduce((s,i)=>s+(+i.total||0),0);
}
export async function topItemName(){
  const agg={}; for(const r of listSales()){ agg[r.item]=(agg[r.item]||0)+(+r.amount||0); }
  let top='–',best=-1; for(const[k,v] of Object.entries(agg)){ if(v>best){best=v; top=k;} }
  return top;
}
