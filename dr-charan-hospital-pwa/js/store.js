// ===== Onestop Hospital Demo Store (v12) =====
// Adds multi-item invoices while keeping old APIs working.

export const KEY = 'onestop_hospital_demo_v5';

function emptyDB(){
  return {
    user: null,
    // legacy
    sales: [],
    // new billing
    invoices: [] // [{id, number, ts, date, patientName, patientPhone, doctorName, items:[{id,name,batch,expiry,qty,rate,discountAbs,discountPct,gstPct,amount}], discAbs, discPct, roundOff, total, paid, balance, status}]
  };
}
function dbLoad(){
  try { return JSON.parse(localStorage.getItem(KEY)) || emptyDB(); }
  catch { return emptyDB(); }
}
function dbSave(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

// ===== Auth helpers (unchanged API) =====
export function currentUser(){ return dbLoad().user; }
export function logout(){ const db=dbLoad(); db.user=null; dbSave(db); }

// ===== Invoice helpers =====
function nextInvoiceNumber(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const seq = Math.floor(Math.random()*90000)+10000; // demo-safe
  return `DCH-${y}${m}-${seq}`;
}
export function newDraftInvoice(meta={}){
  const db = dbLoad();
  const inv = {
    id: crypto.randomUUID(),
    number: nextInvoiceNumber(),
    ts: Date.now(),
    date: new Date().toISOString().slice(0,10),
    patientName: meta.patientName||'',
    patientPhone: meta.patientPhone||'',
    doctorName: meta.doctorName||'',
    items: [],
    discAbs: 0,
    discPct: 0,
    roundOff: 0,
    total: 0,
    paid: 0,
    balance: 0,
    status: 'draft' // 'final'
  };
  db.invoices.push(inv);
  dbSave(db);
  return inv;
}
export function getInvoice(id){
  return dbLoad().invoices.find(i=>i.id===id) || null;
}
export function listInvoices({from, to}={}){
  const rows = dbLoad().invoices.slice();
  if(from || to){
    return rows.filter(r=>{
      const d = r.date;
      if(from && d < from) return false;
      if(to && d > to) return false;
      return true;
    }).sort((a,b)=> (a.date+b.number).localeCompare(b.date+b.number));
  }
  return rows.sort((a,b)=> b.ts - a.ts);
}
export function addLine(invoiceId, line){
  const db=dbLoad();
  const inv=db.invoices.find(x=>x.id===invoiceId);
  if(!inv) throw new Error('Invoice not found');
  const ln = {
    id: crypto.randomUUID(),
    name: (line.name||'').trim(),
    batch: (line.batch||'').trim(),
    expiry: (line.expiry||'').trim(),
    qty: +line.qty||0,
    rate: +line.rate||0,
    discountAbs: +line.discountAbs||0,
    discountPct: +line.discountPct||0,
    gstPct: +line.gstPct||0
  };
  ln.amount = calcLineAmount(ln);
  inv.items.push(ln);
  computeTotals(inv);
  dbSave(db);
  return ln;
}
export function updateLine(invoiceId, lineId, patch){
  const db=dbLoad();
  const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error('Invoice not found');
  const ln=inv.items.find(i=>i.id===lineId); if(!ln) throw new Error('Line not found');
  Object.assign(ln, patch);
  ln.amount = calcLineAmount(ln);
  computeTotals(inv);
  dbSave(db);
}
export function removeLine(invoiceId, lineId){
  const db=dbLoad();
  const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error('Invoice not found');
  inv.items = inv.items.filter(i=>i.id!==lineId);
  computeTotals(inv);
  dbSave(db);
}
export function setInvoiceDiscounts(invoiceId, {discAbs=0, discPct=0}={}){
  const db=dbLoad();
  const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error('Invoice not found');
  inv.discAbs = +discAbs||0;
  inv.discPct = +discPct||0;
  computeTotals(inv);
  dbSave(db);
}
export function finalizeInvoice(invoiceId, {paid=0}={}){
  const db=dbLoad();
  const inv=db.invoices.find(x=>x.id===invoiceId); if(!inv) throw new Error('Invoice not found');
  computeTotals(inv);
  inv.paid = +paid||0;
  inv.balance = Math.max(0, +(inv.total - inv.paid).toFixed(2));
  inv.status = 'final';
  dbSave(db);
  return inv;
}

// ===== Calculations =====
function calcLineAmount(ln){
  const base = ln.qty * ln.rate;
  const discPctAmt = base * (ln.discountPct/100);
  const afterDisc = base - discPctAmt - (ln.discountAbs||0);
  const tax = afterDisc * (ln.gstPct/100);
  return +(Math.max(0, afterDisc + tax).toFixed(2));
}
function computeTotals(inv){
  const sumLines = inv.items.reduce((t,i)=> t + calcLineAmount(i), 0);
  const afterPct = sumLines * (1 - (inv.discPct||0)/100);
  const afterAbs = afterPct - (inv.discAbs||0);
  // round to 2 decimals; keep a small roundOff if needed
  const rounded = Math.round(afterAbs*100)/100;
  inv.roundOff = +(rounded - afterAbs).toFixed(2);
  inv.total = +rounded.toFixed(2);
  inv.balance = Math.max(0, +(inv.total - (inv.paid||0)).toFixed(2));
  return inv;
}

// ===== CSV (optional compatibility) =====
export function exportInvoicesCsv(){
  const head = ['number','date','patient','phone','doctor','lines','total','paid','balance','status'];
  const rows = listInvoices().map(i=>[i.number,i.date,i.patientName,i.patientPhone,i.doctorName,i.items.length,i.total,i.paid,i.balance,i.status]);
  return [head, ...rows].map(r=>r.join(',')).join('\n');
}
export function exportInvoiceLinesCsv(){
  const head = ['invoice','date','item','batch','expiry','qty','rate','discPct','discAbs','gstPct','amount'];
  const out = [];
  for(const inv of listInvoices()){
    for(const ln of inv.items){
      out.push([inv.number, inv.date, ln.name, ln.batch, ln.expiry, ln.qty, ln.rate, ln.discountPct, ln.discountAbs, ln.gstPct, calcLineAmount(ln)]);
    }
  }
  return [head, ...out].map(r=>r.join(',')).join('\n');
}

// ===== Legacy compat: analytics from invoices (fallback to old sales) =====
export function listSales(){
  // derive from invoice lines for compatibility
  const rows=[];
  for(const inv of dbLoad().invoices){
    for(const ln of inv.items){
      rows.push({date: inv.date, item: ln.name, qty: ln.qty, price: ln.rate, invoice: inv.number});
    }
  }
  // include legacy sales if any
  return rows.concat(dbLoad().sales||[]).sort((a,b)=> a.date.localeCompare(b.date));
}
export function salesCsv(){
  const rows=listSales();
  const head=['date','item','qty','price','amount','invoice'];
  const body=rows.map(r=>[r.date,r.item,r.qty,r.price,(r.qty*r.price).toFixed(2),r.invoice||'']);
  return [head,...body].map(r=>r.join(',')).join('\n');
}
export function totalsToday(){
  const d=new Date().toISOString().slice(0,10);
  const invs=listInvoices({from:d,to:d});
  const sum = invs.filter(i=>i.status==='final' || i.items.length) // count drafts too for demo
    .reduce((t,i)=> t + (i.total||0), 0);
  // fallback to legacy sales if no invoices
  if(sum>0) return sum;
  const sales = (dbLoad().sales||[]).filter(r=>r.date===d).reduce((t,r)=>t+r.qty*r.price,0);
  return sales;
}
export function totalsMonth(){
  const m=new Date().toISOString().slice(0,7);
  const invs=listInvoices().filter(i=>i.date?.startsWith(m));
  const sum = invs.reduce((t,i)=> t + (i.total||0), 0);
  if(sum>0) return sum;
  const sales = (dbLoad().sales||[]).filter(r=>r.date?.startsWith(m)).reduce((t,r)=>t+r.qty*r.price,0);
  return sales;
}
export function topItemName(){
  const map={};
  for(const inv of listInvoices()){
    for(const ln of inv.items){
      map[ln.name] = (map[ln.name]||0) + calcLineAmount(ln);
    }
  }
  let best=null,amt=0;
  for(const [k,v] of Object.entries(map)){ if(v>amt){ amt=v; best=k; } }
  if(best) return best;
  // fallback
  const m2={}; for(const r of dbLoad().sales||[]){ m2[r.item]=(m2[r.item]||0)+r.qty*r.price; }
  for(const [k,v] of Object.entries(m2)){ if(v>amt){ amt=v; best=k; } }
  return best;
}
