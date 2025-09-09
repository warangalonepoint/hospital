/* js/store.js
   Offline-first data layer with optional Supabase sync.
   - Works immediately with localStorage.
   - If window.SUPABASE.{url, anonKey} + window.supabase exist, syncs to table "invoices".
   - Provides helpers for dashboard/analytics charts.
*/
(function () {
  const LS = {
    invoices: "invoices",
    outbox: "outbox_invoices"
  };

  // ---------- util ----------
  const money = (n) => Number(n || 0);
  const safeJSON = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
  const readLS = (k, fallback = []) => safeJSON(localStorage.getItem(k), fallback);
  const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const isoDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  const startOfDay = (x) => { const d = new Date(x); d.setHours(0,0,0,0); return d; };
  const endOfDay   = (x) => { const d = new Date(x); d.setHours(23,59,59,999); return d; };

  // ---------- supabase (optional) ----------
  let sb = null;
  async function init() {
    try {
      if (window.SUPABASE && window.SUPABASE.url && window.SUPABASE.anonKey && window.supabase) {
        sb = window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.anonKey, {
          auth: { persistSession: false }
        });
        // test call (non-fatal if table empty)
        await sb.from("invoices").select("id").limit(1);
      }
    } catch { sb = null; }
    // try to flush any pending writes
    flushOutbox().catch(() => {});
    return !!sb;
  }

  // ---------- local cache ----------
  function upsertLocal(inv) {
    const arr = readLS(LS.invoices);
    const i = arr.findIndex((x) => x.id === inv.id);
    if (i >= 0) arr[i] = inv; else arr.push(inv);
    writeLS(LS.invoices, arr);
    return inv;
  }

  // ---------- outbox for offline sync ----------
  function queueOutbox(inv) {
    const q = readLS(LS.outbox);
    q.push(inv);
    writeLS(LS.outbox, q);
  }

  async function flushOutbox() {
    if (!sb) return;
    const q = readLS(LS.outbox);
    if (!q.length) return;
    for (const inv of q) { await saveInvoice(inv, { preferRemote: true }); }
    writeLS(LS.outbox, []);
  }

  // ---------- invoice CRUD ----------
  async function saveInvoice(inv, opts = {}) {
    // normalize a bit
    const normalized = {
      id: inv.id || `INV-${Date.now()}`,
      dateISO: inv.dateISO || inv.date || new Date().toISOString(),
      doctor: inv.doctor || null,
      patient: inv.patient || null,
      phone: inv.phone || null,
      items: (inv.items || []).map(it => ({
        name: it.name || it.item || 'Item',
        qty: money(it.qty),
        price: money(it.price),
        amount: money(it.amount || (money(it.qty) * money(it.price))),
        batch: it.batch || null,
        expiry: it.expiry || null
      })),
      discountPct: money(inv.discountPct),
      discountAmt: money(inv.discountAmt),
      paid:        money(inv.paid),
      total:       money(inv.total != null ? inv.total
                         : (inv.items || []).reduce((s, it) => s + money(it.qty)*money(it.price), 0)
                           - (money(inv.discountAmt) + ( (inv.discountPct||0) / 100 ) * (inv.items || []).reduce((s, it) => s + money(it.qty)*money(it.price), 0))),
      balance:     money(inv.balance != null ? inv.balance : 0),
      status: inv.status || 'final', // 'draft' | 'final'
      time: inv.time || new Date(inv.dateISO || Date.now()).toTimeString().slice(0,5) // HH:MM for charts
    };

    // write local immediately
    upsertLocal(normalized);

    // attempt remote
    if (sb || opts.preferRemote) {
      try {
        if (!sb) throw new Error("No Supabase");
        const payload = {
          id: normalized.id,
          date_iso: normalized.dateISO,
          doctor: normalized.doctor,
          patient: normalized.patient,
          phone: normalized.phone,
          items: normalized.items,
          discount_pct: normalized.discountPct,
          discount_amt: normalized.discountAmt,
          paid: normalized.paid,
          total: normalized.total,
          balance: normalized.balance,
          status: normalized.status,
          time: normalized.time
        };
        await sb.from("invoices").upsert(payload, { onConflict: "id" });
      } catch {
        queueOutbox(normalized);
      }
    } else {
      queueOutbox(normalized);
    }
    return normalized;
  }

  async function getInvoices({ from, to, limit } = {}) {
    let arr = readLS(LS.invoices);

    // prefer remote when available
    if (sb) {
      try {
        let q = sb.from("invoices").select("*").order("date_iso", { ascending: false });
        if (from) q = q.gte("date_iso", startOfDay(from).toISOString());
        if (to)   q = q.lte("date_iso", endOfDay(to).toISOString());
        if (limit) q = q.limit(limit);
        const { data, error } = await q;
        if (!error && Array.isArray(data)) {
          // merge to local
          data.forEach(row => {
            upsertLocal({
              id: row.id,
              dateISO: row.date_iso,
              doctor: row.doctor,
              patient: row.patient,
              phone: row.phone,
              items: row.items || [],
              discountPct: row.discount_pct || 0,
              discountAmt: row.discount_amt || 0,
              paid: row.paid || 0,
              total: row.total || 0,
              balance: row.balance || 0,
              status: row.status || 'final',
              time: row.time || (row.date_iso ? new Date(row.date_iso).toTimeString().slice(0,5) : '00:00')
            });
          });
          arr = readLS(LS.invoices);
        }
      } catch { /* stick with local */ }
    }

    // local filters
    if (from) {
      const s = startOfDay(from).getTime();
      arr = arr.filter(x => new Date(x.dateISO || x.date).getTime() >= s);
    }
    if (to) {
      const e = endOfDay(to).getTime();
      arr = arr.filter(x => new Date(x.dateISO || x.date).getTime() <= e);
    }
    arr.sort((a, b) => new Date(b.dateISO || b.date) - new Date(a.dateISO || a.date));
    if (limit) arr = arr.slice(0, limit);
    return arr;
  }

  // ---------- stats for dashboard/analytics ----------
  async function getStats(range = "today") {
    const now = new Date();
    let from, to;
    if (range === "today") {
      from = to = isoDay(now);
    } else if (range === "7d") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      from = d.toISOString().slice(0,10); to = isoDay(now);
    } else if (range === "30d") {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      from = d.toISOString().slice(0,10); to = isoDay(now);
    } else if (range === "ytd") {
      const d = new Date(now.getFullYear(), 0, 1);
      from = d.toISOString().slice(0,10); to = isoDay(now);
    } else if (typeof range === 'object' && range.from && range.to) {
      from = range.from; to = range.to;
    } else {
      from = to = isoDay(now);
    }

    const invs = await getInvoices({ from, to });
    const total = invs.reduce((s,x)=> s + money(x.total), 0);
    const days = Math.max(1, Math.ceil((endOfDay(to) - startOfDay(from)) / 86400000));
    const avgPerDay = total / days;
    const count = invs.length;

    // top item by amount
    const byItemAmount = new Map();
    invs.forEach(inv => (inv.items||[]).forEach(it=>{
      const k = it.name || 'Item';
      byItemAmount.set(k, (byItemAmount.get(k)||0) + money(it.amount || (money(it.qty)*money(it.price))));
    }));
    let topItem = '—', maxAmt = 0;
    byItemAmount.forEach((v,k)=>{ if(v>maxAmt){ maxAmt=v; topItem=k; } });

    // per-day series
    const byDay = new Map();
    for (let d = new Date(startOfDay(from)); d <= endOfDay(to); d = new Date(d.getTime()+86400000)) {
      byDay.set(isoDay(d), 0);
    }
    invs.forEach(inv=>{
      const key = (inv.dateISO || inv.date || '').slice(0,10);
      if (byDay.has(key)) byDay.set(key, byDay.get(key)+money(inv.total));
    });

    return {
      total,
      avgPerDay,
      count,
      topItem,
      series: Array.from(byDay.entries()).map(([date, total]) => ({ date, total }))
    };
  }

  // ---------- today breakdown for charts ----------
  async function getTodayBreakdown() {
    const today = isoDay();
    const monthPrefix = today.slice(0,7);
    const invs = await getInvoices({ from: today, to: today });

    // per-hour totals (₹)
    const todayByHour = new Array(24).fill(0);
    invs.forEach(inv=>{
      const t = inv.time || (inv.dateISO ? new Date(inv.dateISO).toTimeString().slice(0,5) : '00:00');
      const h = parseInt(String(t).slice(0,2), 10) || 0;
      todayByHour[Math.min(Math.max(h,0),23)] += money(inv.total);
    });

    // per-item (amount)
    const itemMap = new Map();
    invs.forEach(inv => (inv.items||[]).forEach(it=>{
      const k = it.name || 'Item';
      const amt = money(it.amount || (money(it.qty)*money(it.price)));
      itemMap.set(k, (itemMap.get(k)||0) + amt);
    }));
    const todayByItem = Array.from(itemMap.entries())
      .sort((a,b)=>b[1]-a[1])
      .map(([label, value]) => ({ label, value }));

    // month totals for dashboard KPI
    const monthInvs = await getInvoices({ from: monthPrefix + "-01", to: today });
    const todayTotal = invs.reduce((s,x)=>s+money(x.total),0);
    const monthTotal = monthInvs.reduce((s,x)=>s+money(x.total),0);
    const topItem = todayByItem[0]?.label || '—';

    return { todayByHour, todayByItem, todayTotal, monthTotal, topItem };
  }

  // ---------- expose ----------
  window.Store = {
    init,
    flushOutbox,
    saveInvoice,
    getInvoices,
    getStats,
    getTodayBreakdown
  };

  // ---------- legacy hooks for existing pages ----------
  // Used by older dashboard builds
  window.fetchPharmacySummary = async function () {
    const { todayTotal, monthTotal, topItem } = await getTodayBreakdown();
    return { todayAmount: todayTotal, monthAmount: monthTotal, topItem };
  };
  window.fetchInvoicesToday = async function () {
    const arr = await getInvoices({ from: isoDay(), to: isoDay() });
    return arr;
  };

  // auto-init quietly
  init().catch(()=>{});
})();
