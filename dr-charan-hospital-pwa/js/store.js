// ===== Onestop Hospital Demo Store (v13) =====
// Adds secure PIN auth + staff + patients + notes.
// Keeps invoices/billing from v12 (analytics continue to work).

export const KEY = 'onestop_hospital_demo_v5';

/* ---------- DB ---------- */
function emptyDB(){
  return {
    user: null,
    users: [],        // staff + doctor: {id,name,role,phone,salt,pinHash,status:'active'|'disabled'}
    patients: [],     // {id,name,phone,age,sex,notes:[{ts,text,next}], createdAt}
    invoices: [],     // v12 structure
    sales: []         // legacy
  };
}
function dbLoad(){ try{ return JSON.parse(localStorage.getItem(KEY)) || seed(); }catch{ return seed(); } }
function dbSave(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

/* ---------- Seed demo users with hashed PINs ---------- */
function hex(buf){ return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function sha256(str){ const b=new TextEncoder().encode(str); const h=await crypto.subtle.digest('SHA-256', b); return hex(h); }
function rid(){ return (crypto.randomUUID && crypto.randomUUID()) || ('id_'+Math.random().toString(36).slice(2)); }

function seed(){
  const db = emptyDB();
  db.users = [
    { id: rid(), name: "Dr. Rao",       role: "doctor",     phone: "9999999999", salt: "s1", pinHash: "todo", status: "active" },
    { id: rid(), name: "Supervisor",    role: "supervisor", phone: "8888888888", salt: "s2", pinHash: "todo", status: "active" },
    { id: rid(), name: "Demo Patient",  role: "patient",    phone: "7777777777", salt: "s3", pinHash: "todo", status: "active" }
  ];
  // temporary plain; finalize after async hash in initPins()
  localStorage.setItem(KEY, JSON.stringify(db));
  // kick off async pin setup
  initPins();
  return db;
}
async function initPins(){
  const db = dbLoad();
  for(const u of db.users){
    const defaultPin = (u.role==='doctor'?'4321': u.role==='supervisor'?'1111':'2222');
    u.pinHash = await sha256(defaultPin + '|' + u.salt);
  }
  dbSave(db);
}

/* ---------- Auth & Users ---------- */
export function currentUser(){ return dbLoad().user; }
export async function authenticatePin(pin){
  const db = dbLoad();
  for(const u of db.users){
    if(u.status==='disabled') continue;
    const h = await sha256(pin + '|' + u.salt);
    if(h === u.pinHash){
      db.user = { id:u.id, name:u.name, role:u.role, phone:u.phone };
      dbSave(db);
      return db.user;
    }
  }
  return null;
}
export function logout(){ const db=dbLoad(); db.user=null; dbSave(db); }

export async function setOwnPin(userId, newPin){
  if(!/^\d{4,6}$/.test(newPin)) throw new Error("PIN must be 4–6 digits");
  if(['0000','1234','1111','2222'].includes(newPin)) throw new Error("Choose a stronger PIN");
  const db=dbLoad();
  const u=db.users.find(x=>x.id===userId); if(!u) throw new Error("User not found");
  u.pinHash = await sha256(newPin + '|' + u.salt);
  dbSave(db);
  return true;
}
export async function resetStaffPin(targetId, newPin){
  return setOwnPin(targetId, newPin); // doctor can reset staff pins
}
export function listStaff(){ return dbLoad().users.filter(u=>u.role!=='patient'); }
export function upsertStaff(rec){ // {id?,name,role,phone,status}
  const db=dbLoad();
  if(rec.id){
    const i=db.users.findIndex(u=>u.id===rec.id); if(i<0) throw new Error("Staff not found");
    db.users[i]={...db.users[i], ...rec};
  }else{
    db.users.push({ id:rid(), name:rec.name, role:rec.role, phone:rec.phone, status:rec.status||'active', salt:'s'+Math.random().toString(36).slice(2,6), pinHash:'' });
  }
  dbSave(db);
}
export function disableStaff(id){ const db=dbLoad(); const u=db.users.find(x=>x.id===id); if(u){ u.status='disabled'; dbSave(db);} }

/* ---------- Patients & Notes ---------- */
export function listPatients(q=''){
  const rows=dbLoad().patients;
  if(!q) return rows.slice().sort((a,b)=> (a.name||'').localeCompare(b.name||''));
  const s=q.toLowerCase();
  return rows.filter(p=>(p.name||'').toLowerCase().includes(s) || (p.phone||'').includes(s));
}
export function addPatient(p){ // {name,phone,age,sex}
  const db=dbLoad();
  const rec={ id:rid(), name:p.name||'', phone:p.phone||'', age:p.age||'', sex:p.sex||'', notes:[], createdAt: new Date().toISOString() };
  db.patients.push(rec); dbSave(db); return rec;
}
export function updatePatient(p){ // doctor-only in UI
  const db=dbLoad(); const i=db.patients.findIndex(x=>x.id===p.id); if(i<0) throw new Error("Patient not found");
  db.patients[i]={...db.patients[i], ...p}; dbSave(db);
}
export function addPatientNote(patientId, {text,next}){
  const db=dbLoad(); const p=db.patients.find(x=>x.id===patientId); if(!p) throw new Error("Patient not found");
  p.notes = p.notes||[];
  p.notes.unshift({ ts: Date.now(), text: (text||'').trim(), next: next||'' });
  dbSave(db);
}

/* ---------- Invoices / Billing (from v12) ---------- */
function nextInvoiceNumber(){
  const now=new Date(), y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), seq=Math.floor(Math.random()*90000)+10000;
  return `DCH-${y}${m}-${seq}`;
}
export function newDraftInvoice(meta={}){
  const db=dbLoad();
  const inv={ id:rid(), number:nextInvoiceNumber(), ts:Date.now(), date:new Date().toISOString().slice(0,10),
    patientName:meta.patientName||'', patientPhone:meta.patientPhone||'', doctorName:meta.doctorName||'',
    items:[], discAbs:0, discPct:0, roundOff:0, total:0, paid:0, balance:0, status:'draft' };
  db.invoices.push(inv); dbSave(db); return inv;
}
export function getInvoice(id){ return dbLoad().invoices.find(i=>i.id===id)||null; }
export function listInvoices({from,to}={}){
  const rows=dbLoad().invoices.slice();
  if(from||to){
    return rows.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)).sort((a,b)=> (a.date+b.number).localeCompare(b.date+b.number));
  }
  return rows.sort((a,b)=> b.ts-a.ts);
}
function calcLineAmount(ln){
  const base=ln.qty*ln.rate;
  const discPctAmt=base*(ln.discountPct/100);
  const after=base - discPctAmt - (ln.discountAbs||0);
  const tax=after*(ln.gstPct/100);
  return +(Math.max(0, after+tax).toFixed(2));
}
function computeTotals(inv){
  const sum=inv.items.reduce((t,i)=>t+calcLineAmount(i),0);
  const afterPct=sum*(1-(inv.discPct||0)/100);
  const afterAbs=afterPct-(inv.discAbs||0);
  const rounded=Math.round(afterAbs*100)/100;
  inv.roundOff=+(rounded-afterAbs).toFixed(2);
  inv.total=+rounded.toFixed(2);
  inv.balance=Math.max(0, +(inv.total-(inv.paid||0)).toFixed(2));
  return inv;
}
export function addLine(invoiceId,line){
  const db=dbLoad(); const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error("Invoice not found");
  const ln={ id:rid(), name:(line.name||'').trim(), batch:(line.batch||'').trim(), expiry:(line.expiry||'').trim(),
    qty:+line.qty||0, rate:+line.rate||0, discountAbs:+line.discountAbs||0, discountPct:+line.discountPct||0, gstPct:+line.gstPct||0 };
  ln.amount=calcLineAmount(ln); inv.items.push(ln); computeTotals(inv); dbSave(db); return ln;
}
export function updateLine(invoiceId,lineId,patch){
  const db=dbLoad(); const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error("Invoice not found");
  const ln=inv.items.find(i=>i.id===lineId); if(!ln) throw new Error("Line not found");
  Object.assign(ln, patch); ln.amount=calcLineAmount(ln); computeTotals(inv); dbSave(db);
}
export function removeLine(invoiceId,lineId){
  const db=dbLoad(); const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error("Invoice not found");
  inv.items=inv.items.filter(i=>i.id!==lineId); computeTotals(inv); dbSave(db);
}
export function setInvoiceDiscounts(invoiceId,{discAbs=0,discPct=0}={}){
  const db=dbLoad(); const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error("Invoice not found");
  inv.discAbs=+discAbs||0; inv.discPct=+discPct||0; computeTotals(inv); dbSave(db);
}
export function finalizeInvoice(invoiceId,{paid=0}={}){
  const db=dbLoad(); const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error("Invoice not found");
  computeTotals(inv); inv.paid=+paid||0; inv.balance=Math.max(0, +(inv.total-inv.paid).toFixed(2)); inv.status='final'; dbSave(db); return inv;
}

/* ---------- Analytics (dashboard uses these) ---------- */
export function listSales(){
  const rows=[]; for(const inv of dbLoad().invoices){ for(const ln of inv.items){ rows.push({date:inv.date,item:ln.name,qty:ln.qty,price:ln.rate,invoice:inv.number}); } }
  return rows.concat(dbLoad().sales||[]).sort((a,b)=> a.date.localeCompare(b.date));
}
export function totalsToday(){
  const d=new Date().toISOString().slice(0,10);
  const invs=listInvoices({from:d,to:d});
  const sum=invs.reduce((t,i)=>t+(i.total||0),0);
  if(sum>0) return sum;
  return (dbLoad().sales||[]).filter(r=>r.date===d).reduce((t,r)=>t+r.qty*r.price,0);
}
export function totalsMonth(){
  const m=new Date().toISOString().slice(0,7);
  const invs=listInvoices().filter(i=>i.date?.startsWith(m));
  const sum=invs.reduce((t,i)=>t+(i.total||0),0);
  if(sum>0) return sum;
  return (dbLoad().sales||[]).filter(r=>r.date?.startsWith(m)).reduce((t,r)=>t+r.qty*r.price,0);
}
export function topItemName(){
  const m={}; for(const inv of dbLoad().invoices){ for(const ln of inv.items){ m[ln.name]=(m[ln.name]||0)+calcLineAmount(ln);} }
  let best=null,amt=0; for(const [k,v] of Object.entries(m)){ if(v>amt){ amt=v; best=k; } }
  if(best) return best;
  const m2={}; for(const r of dbLoad().sales||[]){ m2[r.item]=(m2[r.item]||0)+r.qty*r.price; }
  for(const [k,v] of Object.entries(m2)){ if(v>amt){ amt=v; best=k; } }
  return best;
}
