export const KEY='onestop_hospital_demo_v3';
export const USERS=[{role:'doctor',pin:'4321',name:'Dr. Rao'},{role:'supervisor',pin:'1111',name:'Supervisor'},{role:'patient',pin:'2222',name:'Patient'}];
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {bookings:[],slots:{},sales:[],patients:[],roster:[],activities:[],user:null}; }catch{ return {bookings:[],slots:{},sales:[],patients:[],roster:[],activities:[],user:null}; } }
function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
export function login(role,pin){ const ok=USERS.find(u=>u.role===role && u.pin===pin); if(!ok) return false; const db=load(); db.user={role,name:ok.name}; save(db); return true; }
export function currentUser(){ return load().user; } export function logout(){ const db=load(); db.user=null; save(db); }
export function guard(user){ if(!user) return; if(user.role!=='doctor'){ const el=document.querySelector('[data-tab="upload"]'); if(el) el.style.display='none'; } }
export function initSlotsForDate(date){ const db=load(); const def=['09:00 AM','09:15 AM','09:30 AM','09:45 AM','10:00 AM','10:15 AM','10:30 AM','10:45 AM','11:00 AM','11:15 AM','11:30 AM','11:45 AM','12:00 PM','12:15 PM','12:30 PM','05:00 PM','05:15 PM','05:30 PM','05:45 PM','06:00 PM','06:15 PM','06:30 PM','06:45 PM']; if(!db.slots[date]) db.slots[date]=def; save(db); }
export function getAvailableSlots(date){ const db=load(); if(!db.slots[date]) return []; const booked=new Set(db.bookings.filter(b=>b.date===date).map(b=>b.slot)); return db.slots[date].filter(s=>!booked.has(s)); }
export function nextTokenForDate(date){ const db=load(); const tokens=db.bookings.filter(b=>b.date===date).map(b=>b.token); return (Math.max(0,...tokens)||0)+1; }
export function saveBooking({name,contact,reason,date,slot,token}){ const db=load(); const id=crypto.randomUUID(); const rec={id,ts:Date.now(),name,contact,reason,date,slot,token,reminder:''}; db.bookings.push(rec); save(db); return rec; }
export function getBookingsByDate(date){ return load().bookings.filter(b=>b.date===date).sort((a,b)=> a.slot.localeCompare(b.slot)); }
export function recordsForContact(contact){ return load().bookings.filter(b=>b.contact===contact).map(b=>({date:b.date,slot:b.slot,dx:b.reason})); }
export function markReminder(id){ const db=load(); const b=db.bookings.find(x=>x.id===id); if(!b) return false; b.reminder='✔️'; save(db); return true; }
export function exportBookingsCsv(date){ const rows=getBookingsByDate(date); const head=['Timestamp','Date','Slot','Token','Patient Name','Reason','Contact','Reminder']; const body=rows.map(r=>[ new Date(r.ts).toLocaleString(), r.date, r.slot, r.token, r.name, r.reason, r.contact, r.reminder ]); return [head,...body].map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n'); }
export function telLink(num){ return `tel:+91${num}`; }
export function addSale({date,item,invoice,qty,price}){ const db=load(); db.sales.push({id:crypto.randomUUID(),date,item,invoice,qty:+qty,price:+price}); save(db); }
export function listSales(){ return load().sales.sort((a,b)=> a.date.localeCompare(b.date)); }
export function salesCsv(){ const rows=listSales(); const head=['date','item','qty','price','amount','invoice']; const body=rows.map(r=>[r.date,r.item,r.qty,r.price,(r.qty*r.price).toFixed(2),r.invoice]); return [head,...body].map(r=>r.join(',')).join('\n'); }
export function groupInvoices(){ const g={}; for(const r of listSales()){ g[r.invoice]??=[]; g[r.invoice].push(r);} return g; }
export function totalsToday(){ const d=new Date().toISOString().slice(0,10); return listSales().filter(r=>r.date===d).reduce((t,r)=>t+r.qty*r.price,0); }
export function totalsMonth(){ const m=new Date().toISOString().slice(0,7); return listSales().filter(r=>r.date.startsWith(m)).reduce((t,r)=>t+r.qty*r.price,0); }
export function topItemName(){ const m={}; for(const r of listSales()){ m[r.item]=(m[r.item]||0)+r.qty*r.price; } let best=null,amt=0; for(const [k,v] of Object.entries(m)){ if(v>amt){amt=v; best=k;} } return best; }
export function addPatient({date,slot,name,contact,dx}){ const db=load(); const p={id:crypto.randomUUID(),date,slot,name,contact,dx,reminder:''}; db.patients.push(p); save(db); }
export function listPatients(){ return load().patients.sort((a,b)=> (a.date+a.slot).localeCompare(b.date+b.slot)); }
export function waLink(contact,msg){ return `https://wa.me/91${contact}?text=${msg}`; }
export function addRoster({date,name,shift,status}){ const db=load(); db.roster.push({id:crypto.randomUUID(),date,name,shift,status}); save(db); }
export function listRoster(){ return load().roster.sort((a,b)=> a.date.localeCompare(b.date)); }
export function importSalesCsv(txt){ try{ const lines=txt.trim().split(/\r?\n/); const [h,*rows]=lines; const cols=h.split(',').map(s=>s.trim()); const map=(arr)=>{const o={}; cols.forEach((k,i)=>o[k]=arr[i]); return o;}; let count=0; for(const line of rows){ const c=line.split(',').map(s=>s.trim()); const r=map(c); addSale({date:r.date,item:r.item,invoice:r.invoice||'CSV',qty:+r.qty,price:+r.price}); count++; } return {ok:true,count}; }catch(e){ return {ok:false,error:e?.message}; } }
export function downloadSalesTemplate(){ return 'date,item,qty,price,invoice\n2025-09-01,Paracetamol 650,10,2.50,INV-1001\n2025-09-02,Azithromycin 500,5,12.00,INV-1002'; }