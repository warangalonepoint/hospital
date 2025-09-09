import { supa, hashPin } from "./supa_client.js";

/* ---------- AUTH (pin based) ---------- */
export async function loginWithPin(pin) {
  const pinHash = await hashPin(pin);
  const { data, error } = await supa
    .from("profiles")
    .select("id, role, full_name")
    .eq("pin_hash", pinHash)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const session = { role: data.role, userId: data.id, name: data.full_name, ts: Date.now() };
  localStorage.setItem("session", JSON.stringify(session));
  localStorage.setItem("role", data.role);
  localStorage.setItem("isLoggedIn", "1");
  sessionStorage.setItem("role", data.role);
  return session;
}
export function getSession() {
  try { return JSON.parse(localStorage.getItem("session")||"null"); } catch { return null; }
}
export function logout() {
  localStorage.removeItem("session"); localStorage.removeItem("isLoggedIn"); localStorage.removeItem("role");
}

/* ---------- DASHBOARD STATS ---------- */
export async function fetchTodayAndMTD() {
  const today = new Date().toISOString().slice(0,10);
  const startMonth = new Date(); startMonth.setDate(1);
  const m0 = startMonth.toISOString().slice(0,10);

  const [{ data: invToday }, { data: invMTD }] = await Promise.all([
    supa.from("invoices").select("total_rs").eq("invoice_date", today),
    supa.from("invoices").select("total_rs").gte("invoice_date", m0).lte("invoice_date", today)
  ]);

  const sum = arr => (arr||[]).reduce((a,b)=>a + Number(b.total_rs||0), 0);
  return { today: sum(invToday), mtd: sum(invMTD) };
}

export async function topItemToday() {
  const today = new Date().toISOString().slice(0,10);
  const { data, error } = await supa
    .from("invoice_items")
    .select("item_name, amount_rs, invoice_id, invoices!inner(invoice_date)")
    .eq("invoices.invoice_date", today);
  if (error || !data || !data.length) return null;
  const agg = {};
  data.forEach(i => { agg[i.item_name] = (agg[i.item_name]||0) + Number(i.amount_rs||0); });
  return Object.entries(agg).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
}

/* ---------- BOOKINGS ---------- */
export async function createBooking({ patient_id, name, phone, slot_time, source='manual' }) {
  let pid = patient_id;
  if (!pid && name) {
    const { data: p } = await supa.from("patients").insert({ name, phone }).select("id").single();
    pid = p?.id;
  }
  const { data, error } = await supa.from("bookings").insert({ patient_id: pid, slot_time, source }).select("*").single();
  if (error) throw error;
  return data;
}
export async function listBookingsByDate(dayIso) {
  const { data } = await supa.from("bookings")
    .select("id, token_no, slot_time, status, patient_id, patients:patient_id (name, phone)")
    .eq("booking_date", dayIso)
    .order("token_no", { ascending: true });
  return data || [];
}

/* ---------- PATIENT NOTES (doctor) ---------- */
export async function addPatientNote({ patient_id, notes, medication, next_visit }) {
  const s = getSession();
  const { data, error } = await supa.from("patient_notes").insert({
    patient_id, notes, medication, next_visit, created_by: s?.userId || null
  }).select("*").single();
  if (error) throw error;
  return data;
}

/* ---------- STAFF & ATTENDANCE ---------- */
export async function listStaff() {
  const { data } = await supa.from("staff").select("*").eq("active", true).order("name");
  return data || [];
}
export async function markAttendance({ staff_id, status }) {
  const today = new Date().toISOString().slice(0,10);
  // upsert by (staff_id, day)
  const { error } = await supa.from("attendance")
    .upsert({ staff_id, day: today, status }, { onConflict: "staff_id,day" });
  if (error) throw error;
  return true;
}

/* ---------- PHARMACY: Invoices & Records ---------- */
export async function createInvoice(inv, items) {
  // inv: { invoice_no?, invoice_date?, patient_name?, patient_phone?, doctor_name?, discount_pct?, discount_rs?, paid_rs? }
  const { data, error } = await supa.rpc("create_invoice_with_items", { inv, items });
  if (error) throw error;
  return data; // returns invoice UUID
}
export async function listInvoicesRange(fromIso, toIso) {
  const { data } = await supa
    .from("invoices")
    .select("*, invoice_items(* )")
    .gte("invoice_date", fromIso).lte("invoice_date", toIso)
    .order("invoice_date", { ascending: false });
  return data || [];
}
export async function pharmacyStatsRange(fromIso, toIso) {
  const { data, error } = await supa.rpc("sales_summary", { r_from: fromIso, r_to: toIso });
  if (error) throw error;
  return data || [];
}
