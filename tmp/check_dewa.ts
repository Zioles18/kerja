
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./src/firebase";

async function checkData() {
  console.log("Checking DEWA AYU PUTU PUSPA...");
  const q = query(collection(db, "warga"), where("nama", "==", "DEWA AYU PUTU PUSPA"));
  const snap = await getDocs(q);
  console.log(`Warga Docs: ${snap.size}`);
  snap.docs.forEach(doc => console.log("ID:", doc.id, doc.data()));

  const q2 = query(collection(db, "mutasi_warga"), where("nama", "==", "DEWA AYU PUTU PUSPA"));
  const snap2 = await getDocs(q2);
  console.log(`Mutasi Docs: ${snap2.size}`);
  snap2.docs.forEach(doc => console.log("Mutasi ID:", doc.id, doc.data()));
  
  console.log("\nChecking GUSTI AYU AGUNG MAHAYANI...");
  const q3 = query(collection(db, "warga"), where("nama", "==", "GUSTI AYU AGUNG MAHAYANI"));
  const snap3 = await getDocs(q3);
  console.log(`Warga Docs: ${snap3.size}`);
  snap3.docs.forEach(doc => console.log("ID:", doc.id, doc.data()));

}
checkData();
