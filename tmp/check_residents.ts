
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./src/firebase";

const nics = [
  "5102095301020002",
  "5102096201830001",
  "5102094302010000",
  "3217015903960014"
];

async function checkResidents() {
  console.log("Starting check...");
  for (const nic of nics) {
    try {
      const q = query(collection(db, "warga"), where("nik", "==", nic));
      const snap = await getDocs(q);
      console.log(`NIK ${nic}: ${snap.empty ? "NOT FOUND" : "FOUND (" + snap.docs.length + " docs)"}`);
      if (!snap.empty) {
        snap.docs.forEach(doc => console.log(`  Doc ID: ${doc.id}`));
      }
    } catch (err) {
      console.error(`Error checking NIK ${nic}:`, err);
    }
  }
}

checkResidents();
