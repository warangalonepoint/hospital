<!-- js/fb.js -->
<script type="module">
// Firebase SDKs (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// TODO: paste your Firebase Web App config from Firebase Console → Project Settings → General
const firebaseConfig = {
  apiKey:        "PASTE_ME",
  authDomain:    "PASTE_ME.firebaseapp.com",
  projectId:     "PASTE_ME",
  storageBucket: "PASTE_ME.appspot.com",
  messagingSenderId: "PASTE_ME",
  appId:         "PASTE_ME"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ===== Helpers you’ll call from pages =====
window.DB = {
  // ---------- PHARMACY ----------
  async saveInvoice(inv) {
    // inv: { invoice_no, invoice_date:'YYYY-MM-DD', patient_name, patient_phone, doctor_name,
    //        discount_pct, discount_rs, total_rs, paid_rs, balance_rs,
    //        items:[{item_name, qty, price_rs, amount_rs}] }
    const col = collection(db, "invoices");
    const ref = await addDoc(col, { ...inv, created_at: new Date().toISOString() });
    return ref.id;
  },
  async listInvoicesBetween(fromISO, toISO) {
    // invoice_date saved as "YYYY-MM-DD" string for easy range queries
    const col = collection(db, "invoices");
    const qy = query(col,
      where("invoice_date", ">=", fromISO),
      where("invoice_date", "<=", toISO),
      orderBy("invoice_date", "asc")
    );
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ---------- STAFF / ATTENDANCE ----------
  async listStaff() {
    const snap = await getDocs(collection(db, "staff"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async upsertAttendance(att) {
    // att: { staff_id, day:'YYYY-MM-DD', name, role, status, note }
    const id = `${att.staff_id}_${att.day}`;
    await setDoc(doc(db, "staff_attendance", id), { ...att, created_at: new Date().toISOString() }, { merge: true });
    return id;
  },
  async listAttendanceByDay(dayISO) {
    const qy = query(collection(db, "staff_attendance"), where("day", "==", dayISO));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ---------- PATIENTS / NOTES (read-only for doctor page) ----------
  async listPatientsWithLatestNote() {
    // Simple approach: get patients, then latest note per patient (fetch all and map)
    const pSnap = await getDocs(collection(db, "patients"));
    const pts = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const nSnap = await getDocs(query(collection(db, "patient_notes"), orderBy("created_at", "desc")));
    const latest = {};
    nSnap.docs.forEach(d => {
      const row = d.data();
      if (!latest[row.patient_id]) latest[row.patient_id] = row;
    });

    return pts.map(pt => {
      const ln = latest[pt.id] || {};
      return {
        id: pt.id,
        name: pt.name || "—",
        phone: pt.phone || "",
        last_visit: ln.visit_date || null,
        next_visit: ln.next_visit || null,
        notes: ln.notes || ""
      };
    });
  },
};
</script>
