/* Dr. Charan PWA – Local store helpers (demo) */

// ---- PINs & session ----
const PIN_KEY = 'pins';
const SESSION_KEY = 'session';
const INV_KEY = 'invoices';
const STAFF_KEY = 'staff';
const PATIENT_KEY = 'patients';
const BOOKINGS_KEY = 'bookings';

export function getPins(){
  const d = { doctor:'4321', supervisor:'1111', patient:'2222' };
  try{
    const s = JSON.parse(localStorage.getItem(PIN_KEY) || '{}');
    return {...d, ...s};
  }catch{ return d; }
}
export function setPin(role, pin){
  const p = getPins(); p[role]=String(pin||'').trim(); localStorage.setItem(PIN_KEY, JSON.stringify(p));
  return p;
}
export function verifyPin(pin){
  const p = getPins(); const map = Object.entries(p).find(([,v])=>String(v)===String(pin));
  return map ? map[0] : null; // role or null
}

export function setSession(role){ localStorage.setItem(SESSION_KEY, JSON.stringify({role, ts:Date.now()})); }
export function getSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch{ return null; } }
export function logout(){ localStorage.removeItem(SESSION_KEY); }

export function requireRole(role){
  const s=getSession();
  if(!s || s.role!==role){ return null; }
  return s;
}
export function role(){ const s=getSession(); return s?.role || null; }

// ---- Sample data (invoices) ----
function seed(){
  if(!localStorage.getItem(INV_KEY)){
    const today = new Date();
    const invs=[];
    for(let i=0;i<14;i++){
      const d=new Date(today); d.setDate(today.getDate()-i);
      const date=d.toISOString().slice(0,10);
      const lines=[
        {item:'Paracetamol 650', qty:Math.ceil(Math.random()*3), price:20},
        {item:'Amoxicillin 500', qty:Math.ceil(Math.random()*2), price:55},
      ];
      const total = lines.reduce((s,l)=>s+l.qty*l.price,0);
      invs.push({id:`INV-${i+1}`, date, lines, total, paid:total});
    }
    localStorage.setItem(INV_KEY, JSON.stringify(invs.reverse()));
  }
  if(!localStorage.getItem(STAFF_KEY)){
    localStorage.setItem(STAFF_KEY, JSON.stringify([{name:'Supervisor', phone:'9000000001', role:'supervisor'}]));
  }
  if(!localStorage.getItem(PATIENT_KEY)){
    localStorage.setItem(PATIENT_KEY, JSON.stringify([{name:'Ravi Kumar', phone:'9000000002', notes:'—'}]));
  }
  if(!localStorage.getItem(BOOKINGS_KEY)){
    const today=new Date().toISOString().slice(0,10);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify([
      {date:today, time:'10:30', patient:'Ravi Kumar', reason:'Fever'},
      {date:today, time:'11:15', patient:'Sindhu Rao', reason:'BP Check'}
    ]));
  }
}
seed();

export function listInvoices(){ try{ return JSON.parse(localStorage.getItem(INV_KEY)||'[]'); }catch{ return []; } }
export function addInvoice(inv){ const arr=listInvoices(); arr.push(inv); localStorage.setItem(INV_KEY, JSON.stringify(arr)); }

export async function totalsToday(){
  const invs=listInvoices(); const today=new Date().toISOString().slice(0,10);
  return invs.filter(i=>i.date===today).reduce((s,i)=>s+(+i.total||0),0);
}
export async function totalsMonth(){
  const invs=listInvoices(); const d=new Date(), ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  return invs.filter(i=>i.date.startsWith(ym)).reduce((s,i)=>s+(+i.total||0),0);
}
export async function topItemName(){
  const invs=listInvoices(); const map={};
  invs.forEach(inv=>inv.lines.forEach(l=>{ map[l.item]=(map[l.item]||0)+l.qty; }));
  const top = Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
  return top ? top[0] : null;
}

/* ----- Staff & Patients (Settings) ----- */
export function listStaff(){ try{return JSON.parse(localStorage.getItem(STAFF_KEY)||'[]')}catch{return[]}}
export function addStaff(s){ const arr=listStaff(); arr.push(s); localStorage.setItem(STAFF_KEY, JSON.stringify(arr)); }

export function listPatients(){ try{return JSON.parse(localStorage.getItem(PATIENT_KEY)||'[]')}catch{return[]}}
export function addPatient(p){ const arr=listPatients(); arr.push(p); localStorage.setItem(PATIENT_KEY, JSON.stringify(arr)); }

/* ----- Bookings ----- */
export function listBookings(){ try{return JSON.parse(localStorage.getItem(BOOKINGS_KEY)||'[]')}catch{return[]}}
export function addBooking(b){ const arr=listBookings(); arr.push(b); localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr)); }
