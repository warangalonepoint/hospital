import { getSupabase } from './supa_client.js';

// --- user / role kept in localStorage for demo parity ---
export async function currentUser(){
  try { return JSON.parse(localStorage.getItem('onestop_hospital_demo_v5'))?.user || null; }
  catch { return null; }
}
export async function logout(){
  const db = JSON.parse(localStorage.getItem('onestop_hospital_demo_v5') || '{}');
  db.user = null; localStorage.setItem('onestop_hospital_demo_v5', JSON.stringify(db));
}
export function guard(user){
  if(user?.role !== 'doctor'){
    const el = document.querySelector('[data-tab="upload"]');
    if (el) el.style.display = 'none';
  }
}

// --- optional DB PIN check ---
export async function checkPin(role, pin){
  const sb = await getSupabase();
  const { data, error } = await sb
    .from('demo_users').select('role,pin')
    .eq('role', role).eq('pin', pin).maybeSingle();
  if (error) throw error;
  return !!data;
}

// --- bookings ---
export async function saveBooking({name,contact,reason,date,slot,token}){
  const sb = await getSupabase();
  const { data, error } = await sb.from('bookings').insert({
    ts: Date.now(), name, contact, reason, date, slot, token, reminder: ''
  }).select().single();
  if (error) throw error;
  return data;
}
export async function getBookingsByDate(date){
  const sb = await getSupabase();
  const { data, error } = await sb.from('bookings').select('*').eq('date', date).order('slot', { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function recordsForContact(contact){
  const sb = await getSupabase();
  const { data, error } = await sb.from('bookings').select('date,slot,reason').eq('contact', contact).order('date', { ascending: true });
  if (error) throw error;
  return (data||[]).map(r => ({ date:r.date, slot:r.slot, dx:r.reason }));
}
export async function nextTokenForDate(date){
  const rows = await getBookingsByDate(date);
  const tokens = rows.map(r => r.token);
  return (Math.max(0, ...(tokens.length ? tokens : [0])) || 0) + 1;
}
export async function markReminder(id){
  const sb = await getSupabase();
  const { error } = await sb.from('bookings').update({ reminder: '✔️' }).eq('id', id);
  return !error;
}
export function exportBookingsCsv(_date, rows){
  const head=['Timestamp','Date','Slot','Token','Patient Name','Reason','Contact','Reminder'];
  const body=(rows||[]).map(r=>[
    new Date(Number(r.ts)).toLocaleString(), r.date, r.slot, r.token, r.name, r.reason, r.contact, r.reminder||''
  ]);
  return [head,...body].map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
}
export const telLink = (num)=>`tel:+91${num}`;

// --- pharmacy sales ---
export async function addSale({date,item,invoice,qty,price}){
  const sb = await getSupabase();
  const { error } = await sb.from('pharmacy_sales').insert({ date, item, invoice, qty:+qty, price:+price });
  if (error) throw error;
}
export async function listSales(){
  const sb = await getSupabase();
  const { data, error } = await sb.from('pharmacy_sales').select('*').order('date',{ascending:true});
  if (error) throw error;
  return data || [];
}
export async function salesCsv(rows){
  const head=['date','item','qty','price','amount','invoice'];
  const body=(rows||[]).map(r=>[r.date,r.item,r.qty,r.price,(r.qty*r.price).toFixed(2),r.invoice||'']);
  return [head,...body].map(r=>r.join(',')).join('\n');
}
export async function groupInvoices(){
  const rows = await listSales(); const g={};
  for(const r of rows){ (g[r.invoice || '—'] ??= []).push(r); }
  return g;
}
export async function totalsToday(){
  const d=new Date().toISOString().slice(0,10);
  const rows=await listSales(); return rows.filter(r=>r.date===d).reduce((t,r)=>t+r.qty*r.price,0);
}
export async function totalsMonth(){
  const m=new Date().toISOString().slice(0,7);
  const rows=await listSales(); return rows.filter(r=>r.date.startsWith(m)).reduce((t,r)=>t+r.qty*r.price,0);
}
export async function topItemName(){
  const rows=await listSales(); const m={}; for(const r of rows){ m[r.item]=(m[r.item]||0)+r.qty*r.price; }
  let best=null,amt=0; for(const [k,v] of Object.entries(m)){ if(v>amt){amt=v; best=k;} } return best;
}

// --- patients list (separate panel) ---
export async function addPatient({date,slot,name,contact,dx}){
  const sb = await getSupabase();
  const { error } = await sb.from('patients').insert({ date, slot, name, contact, dx, reminder:'' });
  if (error) throw error;
}
export async function listPatients(){
  const sb = await getSupabase();
  const { data, error } = await sb.from('patients').select('*').order('date',{ascending:true}).order('slot',{ascending:true});
  if (error) throw error;
  return data || [];
}
export async function waLink(contact,msg){ return `https://wa.me/91${contact}?text=${msg}`; }

// --- staff roster ---
export async function addRoster({date,name,shift,status}){
  const sb = await getSupabase();
  const { error } = await sb.from('roster').insert({ date, name, shift, status });
  if (error) throw error;
}
export async function listRoster(){
  const sb = await getSupabase();
  const { data, error } = await sb.from('roster').select('*').order('date',{ascending:true});
  if (error) throw error;
  return data || [];
}

// --- CSV import (sales) ---
export async function importSalesCsv(txt){
  try{
    const lines=txt.trim().split(/\r?\n/); const [h,*rows]=lines; const cols=h.split(',').map(s=>s.trim());
    const map=(arr)=>{const o={}; cols.forEach((k,i)=>o[k]=arr[i]); return o;};
    let count=0;
    for(const line of rows){
      const c=line.split(',').map(s=>s.trim()); const r=map(c);
      await addSale({date:r.date,item:r.item,invoice:r.invoice||'CSV',qty:+r.qty,price:+r.price}); count++;
    }
    return {ok:true,count};
  }catch(e){ return {ok:false,error:e?.message}; }
}
export function downloadSalesTemplate(){
  return 'date,item,qty,price,invoice\n2025-09-01,Paracetamol 650,10,2.50,INV-1001\n2025-09-02,Azithromycin 500,5,12.00,INV-1002';
}
